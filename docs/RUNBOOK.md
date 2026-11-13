# Running sessions

## Before the first participant
1. Admin page: https://anshbhagania.github.io/resuming-the-rhythm/admin/ (sign in with an allow-listed email).
2. **Spotify accounts** tab: at least one Premium account linked and "free". One account = one session at a time; link a second
   (e.g. Mina's) to run two sessions in parallel. The Spotify app must list her Spotify email under User Management (dev mode).
3. **Participant links** tab: paste the study key, generate links. P01..P06 cover all six mode orders once; P07 repeats O1.
4. Do one full dry run yourself with `&dryrun=1` (about 3 minutes) on the same kind of laptop participants will use.

## Per session
- Send the participant their link (`?pid=P07&k=...`). Chrome on a laptop or desktop, headphones. Any window size works (see Screen size below).
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
- The camera screen shows a mirrored preview (on screen only, never recorded or sent) so the participant can confirm the camera works and their face is visible; it is released when they continue. Calibration then starts the camera again.
- One calibration (9 clicked points) and one validation (5 looked-at points) before practice, about 40 s. Nothing is recalibrated during the
  experiment; after calibration the model stops learning from the mouse. Camera video never leaves the browser, only screen coordinates are logged.
- Admin page **Settings** tab: turn it on/off, make it optional, grid size, clicks per point, validation time, accepted error (px), max attempts,
  sampling rate. Saved values apply to sessions that start afterwards, and each session logs the values it ran with.
  **Test calibration** buttons open the calibration test on the pilot laptop and show the error per point.
- Logged: `gaze_state`, `calib_point`, `calib_validation`, `gaze_ready`, `gaze` (batches of `[t, x, y, aoi]`, aoi T text / P prompt / O other or no face),
  `gaze_lost`, `gaze_back`, `window_resize`, and `gaze_click_check` (gaze vs the DIGI button at each click, a free accuracy check).
- **Reading the calibration test:** the result page shows a verdict, a map and a table. Blue dots are the spots you were asked to look at, orange dots are where the tracker
  thought you looked (median of its samples), the line is the error, and "off by" shows the direction. "Samples" is the number of gaze readings at that spot (about 30 a second);
  "no data" means no face was seen. Verdicts: **good** up to 150 px (the text box can be told apart from the resume prompt, which sits about 250 px below it), **borderline**
  up to your accepted limit (default 250 px), **poor** above. First real run (Windows Chrome): 5 points, 45 samples each, mean error 123 px, passed.
- The camera and calibration screens in the admin Tester always use the real webcam. The mouse-simulated mode (`gaze=mouse`) is clearly marked "TEST MODE" and never uses the camera.
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

## Typing behaviour (modelled on Monkeytype)
- Space submits the word (even if wrong or short; missing letters are underlined). Space on an empty word is ignored.
- Extra letters are shown in red after the word, up to 6; they disappear as you backspace. Further keys are ignored (logged as `key_ignored`, reason `overflow`).
- Backspace deletes inside the current word. On an empty word it steps back into the previous word, whether that word was wrong or correct (`reopenCorrectWords` in `js/config.js`; set it to `false` for the Monkeytype rule, wrong words only). If it does nothing, the log says why (`noop_reason`).
  Ctrl, Alt or Cmd + Backspace deletes the whole word being typed. Numpad keys, Tab, Enter and paste are ignored.
- Reopened word: the first `word_done` stays in the log, then a `word_reopen` event, then a new `word_done` with `reopened: true`. **Analysis should use the LAST `word_done` per word idx and exclude reopened words from per-word speed (their time includes the pause).**
- Every repaint is self-checked: if the screen ever shows something other than the target plus the typed extras, a `ui_mismatch` event is logged (shown on the admin Issues tab).

## Screen size
There is no minimum window size. Laptops differ and a full-screen browser still loses height to toolbars, so the study scales itself: one factor `ui_scale` (never above 1,
never below 0.5) shrinks the typing box, the resume prompt, the 250 px gap and the email card together, so their proportions never change. At 1280 x 720 and above the scale is 1.
The pre-check only shows a gentle note when the window is small (scale under 0.8) and never blocks. Phones and tablets are still sent away.
`ui_scale` is logged (`ui_scale` event on changes, and in `typing_ready`, `email_shown`, `resume_prompt_shown`). Positions and sizes of the areas of interest are logged in real pixels,
so gaze analysis uses the logged rectangles directly. Typing speed in characters per second is unaffected, but note the scale in each session when comparing across participants.

## Resume prompt behaviour
- The prompt sits 250 design-px below the text box, scaled with everything else (see Screen size). In the rare case it still cannot fit, it is kept on screen,
  `clamped: true` is logged with the real gap and the viewport size, and analysis should exclude that trial.
- Browser shortcuts (Ctrl/Cmd combos such as zoom, F-keys) work while a prompt waits; they are logged as `key_shortcut`, not as wrong inputs.

## Data caveats by app version
- **Sessions logged as version 0.8.0 (everything before the 0.8.1 release) are pre-release test data. Sessions before 0.8.3 used a fixed layout and a 1280 x 720 minimum.** They ran older typing and eye-tracking code, and the logged prompt rectangles are wrong:
  resume prompts are logged about 110 px too far right and 28 px too low, and the email card 28 px too low (an animation offset). From 0.8.1 the logged rectangles are the resting positions.
- Check `session_start.app_version` before analysing a session.

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

## Test sessions versus real sessions
`sessions.is_test` (migration 0004): every session that existed on 2026-11-13 is marked `true` (team pilots and tests). Sessions created after that default to `false` and are the ones to analyse. The admin Sessions tab hides the test ones by default and also treats debug, dry-run, synthetic and mouse-gaze sessions as test. Use fresh participant ids (not P01 or P02, which have test sessions). To exclude test data in SQL: `where not is_test`. Opening a link again always creates a new session row (the session id is random); the pid is only a label.

## Upload failure fixed in 0.8.9 (sessions P10, P11 of 2026-11-13)
Cause: the `ui_scale` event is logged 400 ms after boot, but the session id was only set after the settings request finished. On a slower connection that request took longer, so the event was logged with `session_id` and `pid` null. The database requires both, so it rejected the first upload batch and every retry (same batch), and nothing from that session ever arrived. Fixes: events logged before the session exists get their ids as soon as the context is set; the uploader fills missing ids; and if the server rejects a batch (HTTP 400) the uploader sends events one at a time, drops only the refused event (logged as `upload_dropped`) and carries on. Sessions affected are recoverable from the participant's browser: `localStorage["rhythm_log_<session_id>"]`.
