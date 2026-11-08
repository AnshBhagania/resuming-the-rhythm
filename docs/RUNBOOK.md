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

## Local testing
Serve the repo with any static server on **127.0.0.1** (not localhost; browsers cache modules aggressively there), e.g.
`python3 -m http.server 8765`, then open `http://127.0.0.1:8765/?pid=T01&debug=1&dryrun=1&audio=synthetic&nodb=1`.

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
