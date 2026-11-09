"""Command line: python -m rhythm_analysis.export LOG.json [LOG2.json ...] --out OUTDIR [--min-baseline-wpm N] [--window N] [--struggle-mult X]

Writes sessions.csv, blocks.csv (WPM, error rates), words.csv, interruptions.csv (one row per interruption, rehearsals flagged) and
window_words.csv (long table for the models). Sessions with session-level exclusions are still written, with `excluded` and `excl_reasons`."""
import argparse
import csv
import os

from . import features as F
from .load import load_sessions


def write_csv(path, rows):
    cols = []
    for r in rows:
        for k in r:
            if k not in cols:
                cols.append(k)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)


def analyse(sessions, min_baseline_wpm=None, n_window=F.N_WINDOW, struggle_mult=F.STRUGGLE_MULT):
    out = {"sessions": [], "blocks": [], "words": [], "interruptions": [], "window_words": []}
    for sid, ev in sessions.items():
        words = F.extract_words(ev, struggle_mult)
        wpm = F.wpm_table(ev, words)
        base = next((w["net_wpm_clock"] for w in wpm if w["phase"] == "baseline"), None)
        info = F.session_info(ev)
        why = F.session_exclusions(ev, min_baseline_wpm, base)
        rows, traj = F.extract_interruptions(ev, words, n_window)
        info.update({"flags": ";".join(k for k, v in info["flags"].items() if v and k != "audio") or "", "audio": (F.session_info(ev)["flags"] or {}).get("audio"),
                     "baseline_net_wpm": base, "excluded": bool(why), "excl_reasons": ";".join(why), "n_events": len(ev),
                     "conditions": ">".join(info["conditions"] or [])})
        out["sessions"].append(info)
        for w in wpm:
            out["blocks"].append({"session_id": sid, "pid": info["pid"], **w, **{k: v for k, v in F.error_rates([x for x in words if (x["phase"], x["block"]) == (w["phase"], w["block"])]).items()}})
        for w in words:
            out["words"].append({**w, "session_excluded": bool(why), "baseline_net_wpm": base})
        for r in rows:
            r["baseline_net_wpm"] = base
            r["session_excluded"] = bool(why)
            out["interruptions"].append(r)
        for t in traj:
            t["baseline_net_wpm"] = base
            t["session_excluded"] = bool(why)
            out["window_words"].append(t)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("logs", nargs="+")
    ap.add_argument("--out", default="analysis_out")
    ap.add_argument("--min-baseline-wpm", type=float, default=None, help="DECIDE: baseline net WPM cutoff (not applied unless given)")
    ap.add_argument("--window", type=int, default=F.N_WINDOW, help="DECIDE: words in the pre/post windows (default 5)")
    ap.add_argument("--struggle-mult", type=float, default=F.STRUGGLE_MULT, help="DECIDE: struggle_word multiplier (default 2)")
    a = ap.parse_args(argv)
    res = analyse(load_sessions(a.logs), a.min_baseline_wpm, a.window, a.struggle_mult)
    os.makedirs(a.out, exist_ok=True)
    for name, rows in res.items():
        write_csv(os.path.join(a.out, name + ".csv"), rows)
        print(f"{name}.csv: {len(rows)} rows")


if __name__ == "__main__":
    main()
