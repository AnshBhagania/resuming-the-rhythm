# URL parameters (flags)

Everything after `?` in the participant link. All thirteen are read in `js/main.js`; nothing else is read from the URL.
Combine them with `&`, e.g. `?pid=P07&k=KEY` for a real participant or `?pid=T01&debug=1&dryrun=1&audio=synthetic&nodb=1` for a development run.

## For real participants
| Parameter | Value | What it does |
|---|---|---|
| `pid` | `P01`..., letters, digits, `_`, `-`, up to 16 characters | The participant id. Upper-cased. Decides the mode order from its number (P01 to O1, ..., P06 to O6, P07 to O1, ...). Missing or invalid becomes `P00` and the session is logged as `pid_missing`. |
| `k` | the study key | Access key for the Spotify token function. Without it the music step shows "This link is missing its access key". Not logged. Researchers signed in to the admin page in the same browser do not need it (their login is used instead). Remembered for the browser tab, so a later link without it in the same tab still works. In `debug=1` runs the music step also shows a field to paste the key. |

## Forcing behaviour (for pilots and replays)
| Parameter | Value | What it does | Recorded as |
|---|---|---|---|
| `order` | `O1` to `O6` | Forces the mode order instead of deriving it from `pid`. An invalid value is ignored. Sessions are **not** treated as test sessions. | `session_start.order_source = "url"` |
| `seed` | whole number | Fixes the random seed, so passages and interruption schedules are identical on every run. Without it a random seed is drawn and logged. | `session_start.seeds` |

## Development and testing
| Parameter | Value | What it does | Treated as test data |
|---|---|---|---|
| `debug` | `1` | Dark debug bar (step, order, seed, back, skip, download log), live speed and accuracy under the text box, outline of the text box, and `window.__rhythm` / `window.__typing` for scripts. Never shown to real participants unless you add it to their link. | yes |
| `step` | number (1 to 21), a screen name (`baseline`), or `screen:block` (`typing:2`) | Starts directly on that screen instead of the welcome screen. **Only honoured together with `debug=1`.** Earlier screens are skipped, so what they set up (music choice, calibration) is missing: combine with `audio=synthetic` and `gaze=0`. The admin Tester tab builds these links. | yes (needs debug) |
| `dryrun` | `1` | Short timings: baseline 20 s, practice 10 s, rehearsal after 4 s and then an interruption every 8 to 12 s in blocks, 10 s tail, whole session about 3 minutes. | yes |
| `audio` | `synthetic` | Plays a silent test tone through the same code path instead of Spotify. Any other value means Spotify. | yes |
| `sound` | `1` | Only with `audio=synthetic`: makes the test tone and the email beep audible. Default is silent. | yes (via `audio`) |
| `gaze` | `0` | Turns eye tracking off for this run (no camera step). | no |
| `gaze` | `mouse` | The mouse pointer stands in for gaze, so the calibration and logging can be tested without a camera. | yes |
| `nodb` | `1` | Nothing is uploaded to the database. The Done screen still offers the JSON backup. | yes (nothing is stored) |

## Test pages (opened from the admin Settings tab)
| Parameter | Value | What it does | Treated as test data |
|---|---|---|---|
| `gazetest` | `1` | Runs only camera permission, calibration and validation, with the current saved settings, shows the error per point, then the Done screen. Eye tracking is forced on and not skippable. | yes |
| `inputtest` | `1` | Runs only the physical button test (20 presses, raw input monitor), then the Done screen. Eye tracking is forced off. | yes |

## How "test data" is recognised
`session_start` and the `sessions.flags` column record `debug`, `dryrun`, `gazetest`, `inputtest`, `gaze` mode and the audio backend. The admin Sessions tab hides
test sessions by default (untick "hide debug / dry-run / nodb" to see them) and marks them with a "test" badge. In analysis, exclude any session where one of these is set.
`order` and `seed` are **not** exclusion flags: use them deliberately for pilots, and exclude pilots by participant id instead.

## Not URL parameters
Eye tracking and the physical button are configured in the admin **Settings** tab, not in the link. Timings, counts and thresholds are in `js/config.js`. Participant text is in `js/content.js`.

## Handy links
- Real participant: `?pid=P07&k=KEY`
- Full dry run with the real flow: `?pid=T01&debug=1&dryrun=1&k=KEY`
- Offline development: `?pid=T01&debug=1&dryrun=1&audio=synthetic&gaze=mouse&nodb=1`
- Replay one participant's passages and schedule: add `&seed=<number from their session_start>`
