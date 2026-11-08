# Resuming the Rhythm

Experiment web app for the KTH course II2202 (HCI track). Research question: does the way background music is resumed after an
interruption (automatic, on-screen button, physical button) change how fast and how accurately people return to full performance
on a typing task? Within-subjects, one baseline plus three blocks (one per mode), 4 email interruptions per block, mode order
counterbalanced over 6 orders. Optional webcam eye tracking at area-of-interest level.

Live site: https://anshbhagania.github.io/resuming-the-rhythm/ · Admin: https://anshbhagania.github.io/resuming-the-rhythm/admin/

## Stack
- Static site on GitHub Pages: plain HTML, CSS and vanilla JavaScript ES modules. **No build step, no npm.**
- Supabase (Postgres, Auth, Edge Functions) for data, admin login, Spotify token handling and admin-editable settings.
- Spotify Web Playback SDK (participants choose their own playlist), WebGazer.js (eye tracking, from jsDelivr).
- Participants need desktop Chrome, headphones and a webcam if eye tracking is on.

## Layout
```
index.html, css/style.css       the participant app (single page)
js/main.js                      boot: URL flags, settings, audio, gaze, database, state machine
js/session.js                   session setup, the ordered list of screens, state machine (logs state_enter)
js/config.js                    all tunable numbers and defaults
js/content.js                   ALL participant-facing text (placeholders until final text is supplied)
js/screens/*.js                 one module per screen (welcome ... done, plus gaze, music, inputTest)
js/typing.js, passage.js        typing task engine, seeded passage generation
js/interruption.js, resume.js   email pop-up and the AUTO / DIGI / PHYS resumption
js/runner.js                    typing with scheduled interruptions (practice and study blocks)
js/audio.js, sound.js           audio backends (Spotify, silent synthetic) and the notification beep
js/input.js                     physical resume input adapters (key, gamepad, media)
js/gaze.js, gazeScore.js        eye tracking (WebGazer, mouse test source) and validation scoring
js/log.js, db.js                event log and batched upload to Supabase
js/settings.js, probe.js        admin-editable settings loader, network/keyboard/audio probes
js/rng.js                       seeded random numbers (schedules and passages are replayable)
data/words.json, emails.js      word pool and the 15 placeholder emails
admin/index.html                admin portal (sessions, issues, Spotify accounts, links, settings)
supabase/migrations/            database schema and functions
supabase/functions/             Edge Functions: spotify-token (leases an account), spotify-admin (link/manage accounts)
docs/                           RUNBOOK.md, TESTING.md, SPOTIFY.md
```

## Participant links and flags
`https://anshbhagania.github.io/resuming-the-rhythm/?pid=P07&k=<STUDY_KEY>` (generate links on the admin page).
The mode order follows the participant number (P01 to O1 ... P06 to O6, P07 to O1 ...).

| Flag | Effect |
|---|---|
| `debug=1` | debug bar (skip, back, download log), live speed, outlines |
| `dryrun=1` | short timings, whole session about 3 minutes |
| `order=O3`, `seed=42` | force an order, replay passages and schedules |
| `audio=synthetic` | silent test audio instead of Spotify (`&sound=1` to hear it) |
| `gaze=0`, `gaze=mouse` | no eye tracking, or the mouse stands in for gaze |
| `gazetest=1`, `inputtest=1` | calibration test, physical button test (linked from admin Settings) |
| `nodb=1` | do not upload anything |

Flagged sessions (debug, dryrun, nodb, gazetest, inputtest) are excluded in analysis.

## Run it locally
Any static server works, on **127.0.0.1** (not `localhost`):
```bash
python3 -m http.server 8765
```
then open `http://127.0.0.1:8765/?pid=T01&debug=1&dryrun=1&audio=synthetic&nodb=1`. Spotify playback needs real Chrome with Widevine
(not available in every embedded browser), so use `audio=synthetic` for development.

## Deploy
Push to `main`; GitHub Pages serves the repo root (`.nojekyll`). Database changes are SQL files in `supabase/migrations/` (applied through the
Supabase dashboard or MCP). Edge Functions are deployed from `supabase/functions/` with "Verify JWT" off for `spotify-token` and on for `spotify-admin`.

## Secrets and keys
- In the repo on purpose: the Supabase URL and **publishable** key (participants can only call the insert-only ingest functions), the Spotify client id (public).
- Never in the repo: Spotify refresh tokens (database table, readable only by Edge Functions), the `STUDY_KEY` secret (Supabase Edge Function secret;
  the code also accepts the misspelled name `STUD_KEY`), the Supabase service key.
- Admin access: Supabase Auth login whose email is in the `admin_emails` table.

## Documentation
- `docs/RUNBOOK.md`: setting up and running sessions, URL flags, data fields.
- `docs/TESTING.md`: everything that still needs a person, a real device or real Chrome.
- `docs/SPOTIFY.md`: the Spotify account pool, constraints and terms-of-service note.

## Data
Every action is an event: `session_id, pid, seq, t (performance.now ms), phase, block, condition, intr, type, data`. Metrics (resumption lag,
recovery time, accuracy) are computed in analysis from the raw log, never stored precomputed. The word pool is derived from the Monkeytype
`english_1k` list (filtered).
