"""Mixed models M1 to M3 (addendum 4.5) on the CSVs written by `export`. Needs pandas and statsmodels (see requirements.txt).

    python -m rhythm_analysis.models OUTDIR [--window 5]

Python has no lme4 with random slopes and GLMM, so: M1/M3 use statsmodels MixedLM (random intercept per participant, plus a random
phase slope when it converges, plus a variance component per interruption); the logistic models use GEE with participant clusters
(population-averaged, an approximation to a GLMM). Models that do not converge are reported and simplified, never silently dropped.
Run it only on real data after the DECIDE items are frozen; with fewer than about 10 participants the output is for checking the pipeline."""
import argparse
import os
import sys
import warnings

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf


def load(outdir, window=5):
    ww = pd.read_csv(os.path.join(outdir, "window_words.csv"))
    ir = pd.read_csv(os.path.join(outdir, "interruptions.csv"))
    ww = ww[(~ww["practice"].astype(bool)) & (~ww["session_excluded"].astype(bool))].copy()
    ir = ir[(~ir["practice"].astype(bool)) & (~ir["session_excluded"].astype(bool)) & (~ir["excluded"].fillna(False).astype(bool)) & ir["complete"].astype(bool)].copy()
    ok = set(zip(ir["session_id"], ir["n"]))
    ww = ww[[(a, b) in ok for a, b in zip(ww["session_id"], ww["n"])]]
    ww = ww[(ww["phase"] == "pre") | (ww["rank"] <= window)].dropna(subset=["log_time"])
    ww["intr_id"] = ww["session_id"].astype(str) + "_" + ww["n"].astype(int).astype(str)
    for c in ("error_word", "struggle_word", "post_error_word", "post_struggle_word", "first_attempt_error"):
        ww[c] = ww[c].astype(int)
    return ww, ir


def fit_mixed(formula, data, group="pid", re=None, vc=None):
    """Try the richest random structure first, then simplify. Returns (result, description)."""
    tries = [(re, vc), (None, vc), (re, None), (None, None)]
    last = "no attempt"
    for re_f, vc_f in tries:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                m = smf.mixedlm(formula, data, groups=data[group], re_formula=re_f, vc_formula=vc_f)
                res = m.fit(method="lbfgs", reml=True)
            if res.converged:
                return res, f"random: intercept{' + ' + re_f if re_f else ''}{' + ' + ','.join(vc_f) if vc_f else ''}"
            last = "optimizer did not converge"
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:120]}"
    return None, "FAILED (" + last + ")"


def holm(pvals):
    order = sorted(range(len(pvals)), key=lambda i: pvals[i])
    m, out, running = len(pvals), [None] * len(pvals), 0.0
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvals[i]))
        out[i] = running
    return out


def m1_speed(ww):
    ww = ww.assign(rank_abs=ww["rank"].abs())
    # a covariate with no variation (e.g. no struggle words yet) makes the design singular: leave it out and say so
    covs = ["rank_abs", "word_len", "error_word", "post_error_word", "post_struggle_word", "baseline_net_wpm"]
    dropped = [c for c in covs if ww[c].nunique() < 2]
    keep = [c for c in covs if c not in dropped]
    if dropped:
        print("M1: covariates without variation, left out:", ", ".join(dropped))
    f = "log_time ~ C(phase, Treatment('pre')) * C(mode, Treatment('AUTO')) + " + " + ".join(keep + ["C(block)"])
    res, how = fit_mixed(f, ww, re="~C(phase, Treatment('pre'))", vc={"intr": "0 + C(intr_id)"})
    print("\n=== M1 speed: log(word time) ~ phase x mode + covariates ===", how)
    if res is None:
        return
    print(res.summary())
    fe = list(res.fe_params.index)
    inter = {m: next((n for n in fe if ":" in n and f"[T.{m}]" in n and "phase" in n), None) for m in ("DIGI", "PHYS")}
    ps = []
    for a_, b_ in (("DIGI", "AUTO"), ("PHYS", "AUTO"), ("DIGI", "PHYS")):
        v = np.zeros(len(fe))
        for m, sign in ((a_, 1.0), (b_, -1.0)):       # AUTO is the reference: its phase effect is the baseline, so its interaction term is 0
            if inter.get(m):
                v[fe.index(inter[m])] += sign
        if not v.any():
            continue
        t = res.t_test(v.reshape(1, -1))
        ps.append((f"phase effect {a_} - {b_}", float(np.squeeze(t.effect)), float(np.squeeze(t.pvalue))))
    adj = holm([p[2] for p in ps])
    for (lab, eff, p), pa in zip(ps, adj):
        print(f"{lab}: log-ratio {eff:+.3f} (x{np.exp(eff):.2f}), p={p:.4f}, Holm p={pa:.4f}")


def logistic_gee(formula, data, title):
    print(f"\n=== {title} (GEE, clustered by participant) ===")
    if data[formula.split("~")[0].strip()].nunique() < 2:
        print("no variation in the outcome, model skipped")
        return
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            res = smf.gee(formula, groups="pid", data=data, family=sm.families.Binomial()).fit()
        print(res.summary().tables[1])
    except Exception as e:
        print("failed:", e)


def m2_accuracy(ww):
    f = "first_attempt_error ~ C(phase, Treatment('pre')) * C(mode, Treatment('AUTO')) + word_len + C(block) + baseline_net_wpm"
    logistic_gee(f, ww, "M2 accuracy: first_attempt_error")


def m3_reentry(ir):
    ir = ir.assign(log_restart=np.log(ir["restart_time_ms"]), log_lag=np.log(ir["resumption_lag_ms"]), fke=ir["first_key_error"].astype(float))
    for dep in ("log_restart", "log_lag"):
        d = ir.dropna(subset=[dep, "baseline_net_wpm"])
        res, how = fit_mixed(f"{dep} ~ C(mode, Treatment('AUTO')) + C(block) + baseline_net_wpm", d)
        print(f"\n=== M3 re-entry: {dep} ===", how)
        if res is not None:
            print(res.summary())
    d = ir.dropna(subset=["fke", "baseline_net_wpm"])
    logistic_gee("fke ~ C(mode, Treatment('AUTO')) + C(block) + baseline_net_wpm", d, "M3 first_key_error")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("outdir")
    ap.add_argument("--window", type=int, default=5)
    a = ap.parse_args(argv)
    ww, ir = load(a.outdir, a.window)
    print(f"{ir['pid'].nunique()} participants, {len(ir)} interruptions, {len(ww)} window words after exclusions")
    if ir["pid"].nunique() < 3:
        print("WARNING: fewer than 3 participants. This only checks that the pipeline runs; the estimates mean nothing.", file=sys.stderr)
    m1_speed(ww); m2_accuracy(ww); m3_reentry(ir)


if __name__ == "__main__":
    main()
