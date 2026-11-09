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

## URL flags
See `docs/FLAGS.md` for every parameter, what it does and which ones mark a session as test data.

## Admin Tester
The admin **Tester** tab builds test links: choose the flags (short timings, silent audio, gaze off or simulated, no upload, order, seed), then open the whole study or any single screen directly.
Test sessions are flagged and hidden on the Sessions tab by default.

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
Planned setup: an external Bluetooth keyboard (full size with numpad) next to the participant, with ONE key marked by a sticker. Participants keep typing on their own laptop keyboard.
- **Recommended key: Numpad Enter** (the tall double-height key at the right edge of the numpad). Largest target, easy to find without looking, and the laptop's
  own Enter has a different key position, so only this key counts. Alternative: Numpad 0 (the wide key bottom-left of the numpad).
- Admin **Settings** tab, "Physical resume button": device type `key`, **Key position (code) = `NumpadEnter`** (default), and "Name shown to participants" = `marked key`
  (participants read "Press the marked key to resume music"). Leave the code empty to match by the typed key instead.
- The app ignores every numpad key while typing, so stray presses on the external keyboard never type into the task (logged as `key_ignored`, reason `numpad`).
  Any other key pressed during the prompt is logged as `wrong_input`.
- Sticker: a brightly coloured, matt label covering the key legend; consider covering or taping the rest of the numpad (or tell participants to touch only the marked key).
  Place the keyboard on the participant's dominant-hand side.
- Pair the keyboard to the participant's laptop BEFORE they sit down. On a Mac, a newly paired keyboard may trigger "Keyboard Setup Assistant"; finish it first.
- **Bluetooth risk to test, not assumed:** keyboards go to sleep when idle and the first key press after waking can be delayed or lost. That would add lag only in the PHYS
  condition. Each block starts with a flagged rehearsal that wakes the keyboard, but test it: press the key after 1, 2 and 5 minutes idle and watch the physical button test.
- Use the **physical button test** (admin Settings or Tester tab; also `?pid=CAL&inputtest=1`) to check 20 of 20 presses and to see the exact key position (`code`) the browser receives.

## Testing checklist
See `docs/TESTING.md` for everything that still needs a person, a real device or real Chrome.

## Data
- Tables: `sessions`, `events` (see `supabase/migrations/`). Export from the admin page (JSON or CSV per session) or from the Supabase
  dashboard / SQL editor. Test rows have pid `TEST`, `T01`, `T02` or flags debug / dryrun.
- Per event: `session_id, pid, seq, t (performance.now ms), phase, block, condition, intr, type, data`.
- Logged for noise modelling: user agent, screen and window, language, memory, connection hints, keyboard layout (`device_info`),
  audio stack latency (`device_info`), backend round-trip (`latency_probe`), Spotify account label (`spotify_account`).

## Known limits
- Playback needs Chrome (or another browser) with Widevine DRM. The pre-check blocks browsers without it with a message, and logs `device_info.drm`. Firefox/Zen showed "Playback error" with no sound in the first test; use Chrome for the study.
- Spotify hides Spotify-owned playlists from its API. Participants may need to copy such a playlist into their own account.
- Sessions on one Spotify account cannot overlap.
