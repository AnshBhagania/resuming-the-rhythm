"""Pre-specified calibration checks (addendum 4.1 and 4.4). Run on PILOT data only, never on the experimental blocks.

    python -m rhythm_analysis.calibrate OUTDIR

1. struggle_word share in baseline and practice typing (aim for roughly 3 to 8 percent; adjust the multiplier once, then freeze it).
2. split-half reliability of the post-window mean log word time for N = 3, 5, 8, 10 (odd versus even interruptions within participant,
   correlated across participants, Spearman-Brown corrected). Pick the smallest N with acceptable reliability, then freeze it."""
import argparse
import csv
import os
import statistics
from collections import defaultdict


def rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def truthy(x):
    return str(x).lower() == "true"


def struggle_share(outdir):
    ws = [w for w in rows(os.path.join(outdir, "words.csv")) if w["phase"] in ("baseline", "practice") and not truthy(w["session_excluded"])]
    for ph in ("baseline", "practice"):
        sub = [w for w in ws if w["phase"] == ph]
        if sub:
            n = sum(truthy(w["struggle_word"]) for w in sub)
            e = sum(truthy(w["error_word"]) for w in sub)
            print(f"{ph}: {len(sub)} words, struggle {100 * n / len(sub):.1f}%, error words {100 * e / len(sub):.1f}%")
    print("target for struggle share: about 3 to 8 percent")


def split_half(outdir, ns=(3, 5, 8, 10)):
    ww = [w for w in rows(os.path.join(outdir, "window_words.csv")) if w["phase"] == "post" and not truthy(w["practice"]) and not truthy(w["session_excluded"]) and w["log_time"]]
    for N in ns:
        per = defaultdict(lambda: defaultdict(list))        # pid -> interruption n -> log times
        for w in ww:
            if int(w["rank"]) <= N:
                per[w["pid"]][int(w["n"])].append(float(w["log_time"]))
        odd, even = [], []
        for pid, ints in per.items():
            ks = sorted(ints)
            o = [statistics.fmean(ints[k]) for i, k in enumerate(ks) if i % 2 == 0]
            e = [statistics.fmean(ints[k]) for i, k in enumerate(ks) if i % 2 == 1]
            if o and e:
                odd.append(statistics.fmean(o)); even.append(statistics.fmean(e))
        if len(odd) >= 3:
            r = statistics.correlation(odd, even)
            print(f"N={N}: {len(odd)} participants, split-half r={r:.2f}, Spearman-Brown {2 * r / (1 + r):.2f}")
        else:
            print(f"N={N}: too few participants ({len(odd)}) for a correlation")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("outdir")
    a = ap.parse_args(argv)
    struggle_share(a.outdir)
    split_half(a.outdir)


if __name__ == "__main__":
    main()
