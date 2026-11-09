# Offline analysis

Reads the raw event log and derives everything (nothing is written back to the database). Pure standard library for the feature
extraction, so it runs without installing anything. The mixed models need `pandas` and `statsmodels` (`pip install -r requirements.txt`,
ideally in a virtual environment).

## Get the data
Admin page > Sessions > open a session > **Download JSON** (one file per session). The app's own "download log" button gives the same format.

## Run
```bash
cd analysis
python3 -m rhythm_analysis.export path/to/rhythm_*.json --out out
python3 -m rhythm_analysis.calibrate out          # pilot only: struggle share, choice of window size N
python3 -m rhythm_analysis.models out             # needs pandas + statsmodels
python3 -m unittest discover -s tests             # unit tests (worked cases from the addendum, one synthetic interruption)
```
Options on `export`: `--window N` (default 5), `--struggle-mult X` (default 2), `--min-baseline-wpm N` (not applied unless given).

## What it writes (CSV)
| File | One row per | Main columns |
|---|---|---|
| `sessions.csv` | session | order, conditions, flags, app_version, `setup`, baseline net WPM, `excluded`, `excl_reasons` |
| `blocks.csv` | typing phase | net WPM (clock and unlocked), elapsed and locked time, INF/IF/F/C, TER/CER/NCER/KSPC, wrong keys per 100 correct chars |
| `words.csv` | word (last `word_done` per index) | total_keys, extra_keys, correction_bursts, error_word, struggle_word, post_error_word, post_struggle_word, first_attempt_error, speed_valid |
| `interruptions.csv` | interruption (rehearsals flagged) | resume_action_time, unlock_delay, resumption_lag, restart_time, first_key_error, straddled_outcome, covariates, pre/post/post6_10 window stats, sensitivity A, `excluded`, `excl_reasons` |
| `window_words.csv` | word in a pre (-5..-1) or post (1..15) window | rank, log_time, word flags (input for the models and the trajectory) |

## Rules implemented (addendum 4.1 to 4.6)
- Last `word_done` per `(phase, block, idx)`. Straddled words (half typed when the email came) and reopened words never enter a speed window.
- Pre window: last N valid words before `interruption_start`. Post window: first N valid words that start after `typing_unlock`, never past the next interruption.
- All words are kept (flags are covariates). Sensitivity A drops error words and the word after; sensitivity B is the median column next to each mean.
- No outlier trimming in post windows.
- Interruption exclusions: rehearsal, clamped prompt, email timeout, audio error, play timeout, `ui_mismatch`, blur or hidden tab inside a window, idle of 10 s or more in the post window. `short_window` is listed but does not exclude.
- Session exclusions: debug, dryrun, gazetest, inputtest, synthetic audio, mouse-simulated gaze, `app_version` 0.8.0, and the baseline cutoff when given.

## Still DECIDE (addendum section 5)
Baseline WPM cutoff, whether to keep reopening of previous words, the struggle multiplier (2), the window size (5), and whether to store reply text and music titles. They are arguments with defaults, not hidden constants.

## Notes and limits
- IF is approximated as wrong keystrokes minus uncorrected errors; a missing character counts as an uncorrected error.
- `first_key_error` treats any Backspace as an error, including a Backspace that does nothing because the previous word is locked.
- The logistic models use GEE (clustered by participant), not a GLMM. The speed and re-entry models use `MixedLM`. They were checked on simulated data with an injected effect (recovered), not on real data. With fewer than about 10 real participants treat the output as a pipeline check.
