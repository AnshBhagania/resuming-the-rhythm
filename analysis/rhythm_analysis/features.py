"""Derive words, interruptions, windows, error rates and WPM from one session's events.

Everything here follows docs/DATA_SPEC.md and the analysis addendum. Nothing is stored in the database; all metrics are recomputed from the
raw events. Pure standard library, so it runs anywhere. Parameters that the team still has to decide are arguments with defaults.
"""
import math
import statistics
from collections import defaultdict

# Defaults that are still DECIDE items (addendum section 5). Freeze them before real data collection.
N_WINDOW = 5            # words in the primary pre and post windows
STRUGGLE_MULT = 2.0     # struggle_word: total_keys >= STRUGGLE_MULT * word length
MAX_TRAJECTORY = 15     # words after unlock in the trajectory table
EXCLUDED_FLAGS = ("debug", "dryrun", "gazetest", "inputtest")
BAD_VERSIONS = ("0.8.0",)


# ----------------------------------------------------------------------------------------------- session

def session_info(events):
    start = next((e for e in events if e["type"] == "session_start"), None)
    d = start["data"] if start else {}
    flags = d.get("flags") or {}
    return {
        "session_id": events[0]["session_id"] if events else None,
        "pid": events[0]["pid"] if events else None,
        "app_version": d.get("app_version"),
        "order": d.get("order"),
        "conditions": d.get("conditions"),
        "flags": flags,
        "finished": any(e["type"] == "session_end" for e in events),
        "setup": flags.get("setup"),
    }


def session_exclusions(events, min_baseline_wpm=None, baseline_wpm=None):
    """Reasons the whole session is excluded (empty list = keep)."""
    info = session_info(events)
    why = []
    f = info["flags"]
    for k in EXCLUDED_FLAGS:
        if f.get(k):
            why.append(k)
    if f.get("audio") == "synthetic":
        why.append("synthetic_audio")
    if f.get("gazeParam") == "mouse":
        why.append("mouse_gaze")
    if info["app_version"] in BAD_VERSIONS:
        why.append("app_version_" + info["app_version"])
    if min_baseline_wpm is not None and (baseline_wpm is None or baseline_wpm < min_baseline_wpm):
        why.append("baseline_wpm_below_cutoff")
    return why


# ----------------------------------------------------------------------------------------------- words

def _is_printable(d):
    return (not d.get("bs")) and d.get("correct") is not None and d.get("key") != " " and d.get("counted") is not False


def _is_backspace(d):
    return bool(d.get("bs")) and not d.get("noop")


def _bursts(seq):
    """Number of runs of consecutive Backspaces in a word's key sequence ('B' backspace, 'C' character)."""
    runs, prev = 0, False
    for s in seq:
        if s == "B" and not prev:
            runs += 1
        prev = (s == "B")
    return runs


def extract_words(events, struggle_mult=STRUGGLE_MULT):
    """One row per word (the LAST word_done per (phase, block, idx)), with the keystroke-level classification of addendum 4.1."""
    keys = defaultdict(list)       # (phase, block, w) -> ['C'/'B', ...] in time order
    last = {}                      # (phase, block, idx) -> word_done event
    for e in events:
        if e["type"] == "key":
            d = e["data"]
            w = d.get("w")
            if w is None:
                continue
            if _is_backspace(d):
                keys[(e["phase"], e["block"], w)].append("B")
            elif _is_printable(d):
                keys[(e["phase"], e["block"], w)].append("C")
        elif e["type"] == "word_done":
            last[(e["phase"], e["block"], e["data"]["idx"])] = e

    rows = []
    for (phase, block, idx), e in last.items():
        d = e["data"]
        target, ln = d["target"], len(d["target"])
        ks = keys.get((phase, block, idx), [])
        total, bursts = len(ks), _bursts(ks)
        wrong, bs, errs = d.get("wrong_keys", 0), d.get("backspaces", 0), d.get("errors", 0)
        reopened = bool(d.get("reopened"))
        t_ms = d["space_t"] - d["first_key_t"] if d.get("first_key_t") is not None else None
        rows.append({
            "session_id": e["session_id"], "pid": e["pid"], "phase": phase, "block": block, "condition": e.get("condition"),
            "idx": idx, "target": target, "typed": d["typed"], "len": ln,
            "first_key_t": d.get("first_key_t"), "space_t": d["space_t"], "time_ms": t_ms,
            "correct_chars": d.get("correct_chars", 0), "errors": errs, "wrong_keys": wrong, "backspaces": bs,
            "straddled": bool(d.get("straddled_interruption")), "reopened": reopened, "reopen_count": d.get("reopen_count", 0),
            "total_keys": total, "extra_keys": wrong + bs, "correction_bursts": bursts,
            "error_word": wrong >= 1 or bs >= 1 or errs >= 1 or reopened,
            "struggle_word": total >= struggle_mult * ln or bursts >= 2 or reopened,
            "first_attempt_error": wrong >= 1,
            "speed_valid": (not d.get("straddled_interruption")) and (not reopened) and t_ms is not None,
        })
    rows.sort(key=lambda r: (r["phase"] != "practice", r["phase"] != "baseline", r["block"], r["idx"]))

    # post_error_word: the word right after an error word. post_struggle_word: the next two words after a struggle word.
    by_pos = {(r["phase"], r["block"], r["idx"]): r for r in rows}
    for r in rows:
        r["post_error_word"] = False
        r["post_struggle_word"] = False
    for r in rows:
        k = (r["phase"], r["block"])
        if r["error_word"] and (k[0], k[1], r["idx"] + 1) in by_pos:
            by_pos[(k[0], k[1], r["idx"] + 1)]["post_error_word"] = True
        if r["struggle_word"]:
            for j in (1, 2):
                if (k[0], k[1], r["idx"] + j) in by_pos:
                    by_pos[(k[0], k[1], r["idx"] + j)]["post_struggle_word"] = True
    return rows


# ----------------------------------------------------------------------------------------------- error rates

def error_rates(words):
    """Soukoreff & MacKenzie (2003) style counts from word rows (4.2).
    INF = uncorrected errors left in submitted words; IF = wrong keystrokes that were later fixed (wrong_keys minus INF);
    F = Backspace presses; C = correct characters. Approximation: a missing character counts as an uncorrected error."""
    C = sum(w["correct_chars"] for w in words)
    INF = sum(w["errors"] for w in words)
    IF = sum(max(0, w["wrong_keys"] - w["errors"]) for w in words)
    F = sum(w["backspaces"] for w in words)
    denom = C + INF + IF
    return {
        "n_words": len(words), "C": C, "INF": INF, "IF": IF, "F": F,
        "TER": (INF + IF) / denom if denom else None,
        "CER": IF / denom if denom else None,
        "NCER": INF / denom if denom else None,
        "KSPC": (C + INF + IF + F) / (C + INF) if (C + INF) else None,
        "wrong_keys_per_100_correct": 100 * sum(w["wrong_keys"] for w in words) / C if C else None,
    }


# ----------------------------------------------------------------------------------------------- WPM

def _locked_ms(events, block):
    """Total time typing was locked in a block: interruption_start to the typing_unlock that follows (rehearsals included)."""
    total, start = 0.0, None
    for e in events:
        if e["phase"] != "block" or e["block"] != block:
            continue
        if e["type"] == "interruption_start":
            start = e["t"]
        elif e["type"] == "typing_unlock" and start is not None:
            total += e["t"] - start
            start = None
    return total


def wpm_table(events, words):
    """Net WPM per typing phase (4.x / DATA_SPEC 'Words per minute'): standard 5 characters per word, correct words only.
    clock = over the whole elapsed time; unlocked = elapsed minus locked time (email and resume step)."""
    out = []
    ends = {(e["phase"], e["block"]): e["data"].get("elapsed_ms") for e in events if e["type"] == "typing_end"}
    for key, el in ends.items():
        ws = [w for w in words if (w["phase"], w["block"]) == key]
        if not ws or not el:
            continue
        good = sum(len(w["target"]) + 1 for w in ws if w["typed"] == w["target"])
        allc = sum(len(w["typed"]) + 1 for w in ws)
        locked = _locked_ms(events, key[1]) if key[0] == "block" else 0.0
        out.append({
            "phase": key[0], "block": key[1], "condition": next((w["condition"] for w in ws), None),
            "words": len(ws), "elapsed_s": el / 1000, "locked_s": locked / 1000,
            "net_wpm_clock": (good / 5) / (el / 60000), "gross_wpm_clock": (allc / 5) / (el / 60000),
            "net_wpm_unlocked": (good / 5) / ((el - locked) / 60000) if el > locked else None,
        })
    return out


# ----------------------------------------------------------------------------------------------- interruptions

def _first_after(events, i0, pred):
    for e in events[i0:]:
        if pred(e):
            return e
    return None


def _word_stats(ws):
    ts = [w["time_ms"] for w in ws]
    if not ts:
        return {"n": 0, "mean_ms": None, "median_ms": None, "mean_log": None}
    return {"n": len(ts), "mean_ms": statistics.fmean(ts), "median_ms": statistics.median(ts),
            "mean_log": statistics.fmean(math.log(t) for t in ts if t > 0)}


def _straddle_outcome(events, start_idx, unlock_t, intr_ev, word_idx, partial):
    """What happened to the half-typed word after resuming (4.3): none / continued / deleted_retyped / other."""
    if not partial:
        return "none"
    L, min_L, seen = len(partial), len(partial), False
    for e in events[start_idx:]:
        if e["t"] <= unlock_t or e["type"] != "key" or e["phase"] != intr_ev["phase"] or e["block"] != intr_ev["block"]:
            continue
        d = e["data"]
        if d.get("w") != word_idx:
            if seen:
                break
            continue
        seen = True
        if _is_backspace(d):
            L = 0 if d.get("bs_word") else max(0, L - 1)
        elif _is_printable(d):
            L += 1
        min_L = min(min_L, L)
    if not seen:
        return "other"
    return "deleted_retyped" if min_L < len(partial) else "continued"


def extract_interruptions(events, words, n_window=N_WINDOW):
    """One row per interruption (rehearsals included, flagged practice) with timings, covariates, window stats and exclusion flags."""
    idx_of = {id(e): i for i, e in enumerate(events)}
    starts = [e for e in events if e["type"] == "interruption_start"]
    wrows = defaultdict(list)
    for w in words:
        wrows[(w["phase"], w["block"])].append(w)
    rows, traj = [], []
    for si, s in enumerate(starts):
        i0 = idx_of[id(s)]
        d = s["data"]
        nxt = starts[si + 1]["t"] if si + 1 < len(starts) and starts[si + 1]["block"] == s["block"] else float("inf")
        shown = _first_after(events, i0, lambda e: e["type"] == "email_shown")
        reply = _first_after(events, i0, lambda e: e["type"] == "reply_sent")
        unlock = _first_after(events, i0, lambda e: e["type"] == "typing_unlock")
        r = {
            "session_id": s["session_id"], "pid": s["pid"], "n": d.get("n"), "k": d.get("k"), "intr": s["intr"] or None,
            "practice": bool(d.get("practice")), "block": s["block"], "mode": s["condition"], "email_id": d.get("email_id"),
            "start_t": s["t"], "typed_partial": d.get("typed_partial", ""), "word_idx": d.get("word_idx"),
        }
        if not (reply and unlock):
            r.update({"complete": False, "excl_reasons": "incomplete"})
            rows.append(r)
            continue
        r["complete"] = True
        resume = _first_after(events, i0, lambda e: e["type"] == "resume_input" and e["t"] > reply["t"] - 1)
        r["reply_time_ms"] = reply["t"] - shown["t"] if shown else None
        r["resume_action_time_ms"] = (resume["t"] - reply["t"]) if resume and resume["t"] <= unlock["t"] else None
        r["unlock_delay_ms"] = unlock["t"] - reply["t"]
        r["play_called_to_playing_ms"] = unlock["data"].get("play_called_to_playing_ms")
        r["play_timed_out"] = bool(unlock["data"].get("play_timed_out"))
        fk = _first_after(events, idx_of[id(unlock)], lambda e: e["type"] == "key" and e["t"] > unlock["t"]
                          and e["phase"] == s["phase"] and e["block"] == s["block"])
        if fk:
            r["resumption_lag_ms"] = fk["t"] - reply["t"]
            r["restart_time_ms"] = fk["t"] - unlock["t"]
            r["first_key_error"] = bool(fk["data"].get("bs")) or fk["data"].get("correct") is False
        else:
            r["resumption_lag_ms"] = r["restart_time_ms"] = r["first_key_error"] = None
        between = [e for e in events[i0:idx_of[id(unlock)]]]
        wi = [e for e in between if e["type"] == "wrong_input"]
        r["wrong_inputs"] = len(wi)
        r["wrong_input_key_misses"] = sum(1 for e in wi if e["data"].get("kind") in ("physical_key", "keyboard"))
        prompt = next((e for e in between if e["type"] == "resume_prompt_shown"), None)
        r["gap_below_box"] = prompt["data"].get("gap_below_box") if prompt else None
        r["clamped"] = bool(prompt and prompt["data"].get("clamped"))
        r["straddled_outcome"] = _straddle_outcome(events, idx_of[id(unlock)], unlock["t"], s, d.get("word_idx"), d.get("typed_partial", ""))

        # windows over words of this block's passage
        ws = wrows.get((s["phase"], s["block"]), [])
        valid = [w for w in ws if w["speed_valid"]]
        pre = sorted([w for w in valid if w["space_t"] < s["t"]], key=lambda w: w["space_t"])[-n_window:]
        post_all = sorted([w for w in valid if w["first_key_t"] > unlock["t"] and w["space_t"] < nxt], key=lambda w: w["first_key_t"])
        post = post_all[:n_window]
        post2 = post_all[n_window:2 * n_window]
        for tag, group in (("pre", pre), ("post", post), ("post6_10", post2)):
            st = _word_stats(group)
            r.update({f"{tag}_n": st["n"], f"{tag}_mean_ms": st["mean_ms"], f"{tag}_median_ms": st["median_ms"], f"{tag}_mean_log": st["mean_log"]})
        r["pre_error_words"] = sum(w["error_word"] for w in pre)
        r["post_error_words"] = sum(w["error_word"] for w in post)
        r["post_struggle_words"] = sum(w["struggle_word"] for w in post)
        clean = [w for w in post if not w["error_word"] and not w["post_error_word"]]      # sensitivity A: word-level drop
        r["post_clean_n"] = len(clean)
        r["post_clean_mean_ms"] = statistics.fmean(w["time_ms"] for w in clean) if clean else None
        r["post_wrong_keys"] = sum(w["wrong_keys"] for w in post)
        r["post_backspaces"] = sum(w["backspaces"] for w in post)
        r["pre_wrong_keys"] = sum(w["wrong_keys"] for w in pre)
        r["pre_backspaces"] = sum(w["backspaces"] for w in pre)

        # long table for the models: pre ranks -n..-1, post ranks 1..MAX_TRAJECTORY
        for j, w in enumerate(pre):
            traj.append(_traj_row(r, w, "pre", j - len(pre)))
        for j, w in enumerate(post_all[:MAX_TRAJECTORY]):
            traj.append(_traj_row(r, w, "post", j + 1))

        # exclusions (4.6), interruption level
        lo = s["t"]
        hi = (post[-1]["space_t"] if post else unlock["t"])
        pre_lo = pre[0]["first_key_t"] if pre else s["t"]
        why = []
        if r["practice"]:
            why.append("rehearsal")
        if r["clamped"]:
            why.append("clamped")
        if any(e["type"] == "interruption_timeout" for e in between):
            why.append("email_timeout")
        if any(e["type"] == "audio_error" for e in events[i0:idx_of[id(unlock)] + 1]) :
            why.append("audio_error")
        if r["play_timed_out"]:
            why.append("play_timed_out")
        if any(e["type"] == "ui_mismatch" and pre_lo <= e["t"] <= hi for e in events):
            why.append("ui_mismatch")
        if any((e["type"] == "blur" or (e["type"] == "visibility_change" and e["data"].get("hidden"))) and
               (pre_lo <= e["t"] <= lo or unlock["t"] <= e["t"] <= hi) for e in events):
            why.append("focus_lost_in_window")
        if any(e["type"] == "idle_start" and unlock["t"] <= e["t"] <= hi for e in events):
            why.append("idle_in_post_window")
        if r["post_n"] < n_window or r["pre_n"] < n_window:
            why.append("short_window")        # informational: kept in the analysis, listed so the reader can decide
        r["excl_reasons"] = ";".join(why)
        r["excluded"] = any(x not in ("short_window",) for x in why)
        rows.append(r)
    return rows, traj


def _traj_row(r, w, phase, rank):
    return {
        "session_id": r["session_id"], "pid": r["pid"], "intr": r["intr"], "n": r["n"], "practice": r["practice"], "block": r["block"], "mode": r["mode"],
        "phase": phase, "rank": rank, "idx": w["idx"], "word_len": w["len"], "time_ms": w["time_ms"],
        "log_time": math.log(w["time_ms"]) if w["time_ms"] and w["time_ms"] > 0 else None,
        "error_word": w["error_word"], "struggle_word": w["struggle_word"], "post_error_word": w["post_error_word"],
        "post_struggle_word": w["post_struggle_word"], "first_attempt_error": w["first_attempt_error"],
        "wrong_keys": w["wrong_keys"], "backspaces": w["backspaces"],
    }
