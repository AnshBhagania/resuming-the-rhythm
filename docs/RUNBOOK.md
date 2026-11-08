# Running sessions

## Before the first participant
1. Admin page: https://anshbhagania.github.io/resuming-the-rhythm/admin/ (sign in with an allow-listed email).
2. **Spotify accounts** tab: at least one Premium account linked and "free". One account = one session at a time; link a second
   (e.g. Mina's) to run two sessions in parallel. The Spotify app must list her Spotify email under User Management (dev mode).
3. **Participant links** tab: paste the study key, generate links. P01..P06 cover all six mode orders once; P07 repeats O1.
4. Do one full dry run yourself with `&dryrun=1` (about 3 minutes) on the same kind of laptop participants will use.

## Per session
- Send the participant their link (`?pid=P07&k=...`). Chrome on a laptop or desktop, headphones, window at least 1280 x 720.
- Watch the **Sessions** tab: status goes active -> finished. "stopped" means no events for over a minute.
- Issues to look at afterwards (Sessions badges, **Issues** tab): `audio_error`, `interruption_timeout`, hidden tab, upload errors.
- Backup: the last screen offers "Download backup (JSON)". Ask for it if the upload line says it did not finish.

## URL flags (analysis excludes flagged sessions)
| Flag | Effect |
|---|---|
| `debug=1` | debug bar (skip/back/download log), live speed, text-box outline |
| `dryrun=1` | short timings: baseline 20 s, interruptions every 8 to 12 s, whole session about 3 min |
| `order=O3` | force a mode order (logged) |
| `seed=42` | replay the same passages and schedules |
| `audio=synthetic` | silent test audio instead of Spotify (add `&sound=1` to hear it) |
| `nodb=1` | do not upload anything |
| `gaze=0` | skip eye tracking (no camera step) |
| `gaze=mouse` | the mouse pointer stands in for gaze, for testing without a camera |
| `gazetest=1` | only camera permission + calibration + validation, shows the error per point (admin page links to it) |

## Local testing
Serve the repo with any static server on **127.0.0.1** (not localhost; browsers cache modules aggressively there), e.g.
`python3 -m http.server 8765`, then open `http://127.0.0.1:8765/?pid=T01&debug=1&dryrun=1&audio=synthetic&nodb=1`.

## Eye tracking
- One calibration (9 clicked points) and one validation (5 looked-at points) before practice, about 40 s. Nothing is recalibrated during the
  experiment; after calibration the model stops learning from the mouse. Camera video never leaves the browser, only screen coordinates are logged.
- Admin page **Settings** tab: turn it on/off, make it optional, grid size, clicks per point, validation time, accepted error (px), max attempts,
  sampling rate. Saved values apply to sessions that start afterwards, and each session logs the values it ran with.
  **Test calibration** buttons open the calibration test on the pilot laptop and show the error per point.
- Logged: `gaze_state`, `calib_point`, `calib_validation`, `gaze_ready`, `gaze` (batches of `[t, x, y, aoi]`, aoi T text / P prompt / O other or no face),
  `gaze_lost`, `gaze_back`, `window_resize`, and `gaze_click_check` (gaze vs the DIGI button at each click, a free accuracy check).
- Expect roughly 100 to 250 px error with a webcam, if the participant keeps still. Pilot it: if the validation error is often above the limit,
  raise the limit or enlarge the areas of interest in analysis.

## Physical button
Admin **Settings** tab, "Physical resume button": device type (`key`, `gamepad`, `media`), the key or button, and the name participants see
("Press the [name] to resume music"). Use the **physical button test** (also `?pid=CAL&inputtest=1`) to see what a device sends and to check 20 of 20 presses.
Anything that types a key works with type `key`. The default F9 is only a placeholder (on Macs F-keys are media keys unless Fn is held).

## Testing checklist
See `docs/TESTING.md` for everything that still needs a person, a real device or real Chrome.

## Data
- Tables: `sessions`, `events` (see `supabase/migrations/`). Export from the admin page (JSON or CSV per session) or from the Supabase
  dashboard / SQL editor. Test rows have pid `TEST`, `T01`, `T02` or flags debug / dryrun.
- Per event: `session_id, pid, seq, t (performance.now ms), phase, block, condition, intr, type, data`.
- Logged for noise modelling: user agent, screen and window, language, memory, connection hints, keyboard layout (`device_info`),
  audio stack latency (`device_info`), backend round-trip (`latency_probe`), Spotify account label (`spotify_account`).

## Known limits
- Playback needs a real Chrome with Widevine (the Claude app's built-in browser has none).
- Spotify hides Spotify-owned playlists from its API. Participants may need to copy such a playlist into their own account.
- Sessions on one Spotify account cannot overlap.
