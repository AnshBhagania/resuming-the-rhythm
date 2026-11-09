# What still needs testing

Kept up to date by Claude after each stage. **Done** = verified by Claude in a test environment (simulated input, hidden test browser, curl).
**To do** = needs a person, a real device, real Chrome or real participants. Live site: https://anshbhagania.github.io/resuming-the-rhythm/
Admin: https://anshbhagania.github.io/resuming-the-rhythm/admin/

Last updated: 2026-11-08 (after Stage 8 and the repo cleanup). A shareable, editable copy: https://claude.ai/artifact/NU3zbh614Yn6MVFW186scH

## 0. Quick start for you (about 15 minutes, in this order)
1. Sign in to the admin page. Check all five tabs open without an error message.
2. Settings tab: change one eye-tracking value, Save, reload, confirm it stuck. Set it back.
3. Run the **Spotify playback test** (section 4). It is the biggest unknown.
4. Run the **calibration test** on a pilot laptop (section 6).
5. Run a **full dry run** on a second laptop (`&dryrun=1`, about 3 minutes) and read the session in the admin page.

## 1. Basic flow (Stages 0 to 3)
| Check | Status | How |
|---|---|---|
| Live URL loads, 21 screens click through | Done (local, scripted) | `?pid=P01&debug=1&dryrun=1` |
| Counterbalancing: P01..P12 map to O1..O6, O1..O6 | Done (admin link table) | Participant links tab |
| Typing with a real keyboard feels right (caret, scroll, red errors, backspace within word only) | **To do** | type for a minute in practice |
| Real typing speeds: passages are long enough (block 800 words, baseline 400) for fast typists (100+ wpm, 2 min baseline) | **To do** | ask a fast typist |
| Email pop-up: keyboard-only reply works (1/2/3, 3 words, Enter, Backspace on empty goes back) | Done (scripted) / **To do** by hand | any block |
| Interruption never lands within 1.5 s of an error keystroke | Done (code path scripted) / **To do** with real typing | log: `interruption_start` vs previous `key` with `correct:false` |
| 60 s email timeout shows reminder and logs `interruption_timeout` | **To do** | wait 60 s on an email (not dry run shortened) |
| Realistic timings: first interruption 45 to 75 s, tail 60 s, whole session length (~25 min?) | **To do** | one run without `dryrun` |
| Mobile / tablet is blocked with "Desktop only" | Done (UA check, not on a real phone) | open link on a phone |
| Small windows: no size gate; typing box, prompt, 250 px gap and email card scale together (1024 x 600 gives scale 0.855, 800 x 500 gives 0.678, gap exactly 250 x scale, nothing clamped, no scrollbars) | Done (scripted, simulated viewports) / **To do** on Mina's real small laptop in full-screen mode | open a block with each mode | |
| Refresh mid-session: currently starts a NEW session with a new session id (data stays split) | **Known gap**, decide policy | press reload mid-block |

## 2. Resumption modes (Stage 4)
| Check | Status | How |
|---|---|---|
| AUTO / DIGI / PHYS prompts, sizes 220 x 56, at least 250 px below the text box, wrong inputs logged, typing unlocks only after `music_play` | Done (synthetic audio) | `&audio=synthetic` |
| Same, with real Spotify audio | **To do** | section 4 |
| Practice is typing only. Each block starts with one flagged rehearsal interruption (`practice:true`, `intr` 0) in its own mode, then 4 real ones (`intr` 1 to 12 over the study) | Done (synthetic audio) | practice, then block 1 |
| Email card shows 3 steps (choose with 1/2/3, type reply, Enter). Clicking an answer does NOT select; it shows "Clicking does not select..." and logs `email_click` (option, stage, x, y). `reply_sent` carries `clicks` and last `cursor` | Done (scripted, 0.8.4) | click an answer, then press the number |
| Status icon (playing/paused) visible in the same corner in all modes | **To do** (visual) | look bottom right |
| Prompt position and size OK on a large monitor (scale stays 1) and after resizing the window mid-session | **To do** | resize |

## 3. Data, admin, accounts (Stage 5, 6)
| Check | Status | How |
|---|---|---|
| Events upload in batches, duplicates ignored, Done screen waits for upload | Done (silent dry run) | admin Sessions tab |
| Upload survives flaky network (offline for 20 s mid-block, then back) | **To do** | devtools offline toggle |
| Backup JSON download works and matches what was uploaded | **To do** | Done screen |
| Admin: sign in, Sessions (status, issues, filters, JSON/CSV export), Issues, Participant links | **To do** (page load verified, signed-in views not) | admin page |
| Admin: Spotify accounts tab (link, disable, free, remove) | Done for linking; rest **To do** | admin page |
| Mina: her email in the allow-list, she creates an account and signs in | **To do** | send Claude her email |
| Mina links a second Spotify account (her email in the Spotify app's User Management) | **To do** | admin, Spotify accounts |
| Two sessions in parallel use two different accounts; a third waits with "all accounts in use" and retries | **To do** | two browsers, three sessions |
| Closing the tab frees the account within about 2 minutes | **To do** | check Spotify accounts tab |
| CSV export opens correctly in your analysis tool (data column is JSON) | **To do** | download one |
| Test data cleanup: sessions with pid TEST, T01, T02 still in the database | **To do** (you declined deletion) | SQL delete or leave (flagged) |

## 4. Spotify (Stage 4, needs real Chrome)
The built-in browser of the Claude app has no Widevine DRM, so Claude cannot test playback. Use normal Chrome.
| Check | Status | How |
|---|---|---|
| Token function: lease, busy pool (409), wrong key (401), release | Done (curl) | |
| User-made public playlist loads and plays | **To do** | music step |
| Spotify-owned playlist (e.g. Peaceful Piano) loads / plays | **To do**, unknown whether playback works when the API hides it | music step |
| Volume slider affects playback, volume stays fixed afterwards | **To do** | |
| Pause is immediate when the email appears; resume continues from the same position with a 200 ms fade-in | **To do** | listen; compare `music_pause.position_ms` and the next `music_play.position_ms` in the log |
| Typing stays locked until audio is actually playing (`music_play`) | Done (synthetic) / **To do** real | |
| Resume latency: `audio_play_called` to `music_play`, over a normal and a slow network | **To do** | log; expect hundreds of ms |
| Playback after the Spotify token expires (1 h) and with long sessions | **To do** | long run |
| Another device starts playing on the same account mid-session (SDK reports moved/not ready) | **To do**, behaviour unknown | `audio_error` events |
| Link without `&k=` shows the missing-key message | Done | |
| Firefox / Safari: not supported on purpose (Chrome only) | Decide | |

## 5. Physical button (Stage 8)
Device is not decided. The app supports three kinds, set in admin Settings: `key` (USB button, foot pedal, any key), `gamepad`, `media` (headphone remote, laptop media keys; experimental).
| Check | Status | How |
|---|---|---|
| Keyboard-type device (placeholder F9) resumes music in PHYS; other keys and clicks are logged as `wrong_input` | Done (scripted) | |
| Device test page counts presses, shows raw input | Done (key type, scripted) | admin Settings, Open physical button test |
| Gamepad-type device detected, 20 of 20 presses | **To do**, needs a device | test page |
| Media buttons (headphone remote, laptop media key) detected while a silent audio loop plays | **To do**, may not work on all OS/browser combinations | test page |
| On macOS the F-keys are media keys unless Fn is held: F9 as placeholder may not reach the page | **To do**, pick another key for pilots | test page |
| Candidate device reliability 20/20 on participants' laptops (remote, own hardware) | **To do**, decision for you | |
| **Decision:** what device can remote participants realistically have? (own headphone remote, laptop media key, posted USB button) | **Open** | |

## 6. Eye tracking (Stage 7)
| Check | Status | How |
|---|---|---|
| Calibration flow with simulated gaze (mouse source); scoring; settings limits; area-of-interest logic | Done | `&gaze=mouse` |
| WebGazer library loads from the CDN and exposes the functions the code uses | Done | |
| Real webcam: calibration + validation on pilot laptops, mean error per point | **To do** | admin Settings, Test calibration |
| Accuracy needed: text box (900 x 260) vs the prompt (220 x 56 and email card); is ~100 to 250 px error enough to tell them apart? | **To do**, the key research question for this stage | validation + `gaze_click_check` |
| Glasses, dark room, laptop on lap, camera angle: how much worse | **To do** | pilot |
| Camera denied or missing: participant continues (if optional) and `gaze_state` logged | **To do** | block camera in Chrome |
| Gaze volume: size of a session's `gaze` events, upload time | **To do** | admin session detail |
| Window resized mid-session after calibration (`window_resize` logged; accuracy drops) | **To do** | |
| CPU load of WebGazer on an older laptop does not hurt typing timing | **To do**, could confound the main measure | pilot on slow laptop, compare key timing |
| Participant leaves the camera view: `gaze_lost` events | **To do** | |

## 7. Ethics, text, analysis readiness
| Item | Status |
|---|---|
| KTH ethics / data handling sign-off (camera, Spotify accounts, remote participants, data storage in Supabase EU region) | **Open**, yours |
| Final text: welcome, consent (incl. camera), camera explanation, instructions, block intros, questionnaires, demographics (incl. the attention-condition question), debrief | **Open**, all placeholders in `js/content.js` |
| Do you need a no-music reference block? | **Open** (context file) |
| Lyrics: require instrumental playlists or ask a lyrics yes/no? | **Open** |
| Analysis script: compute resumption lag, recovery time, accuracy from the event log (definitions in the context file section 8) | **Not started** (offer: Python or R notebook against a CSV export) |
| Exclusion flags available in the data: practice, `interruption_timeout`, hidden tab, idle, `dryrun`/`debug` | Logged; the logic to apply them is part of analysis |

## 8. Pilot readiness checklist
- [ ] 6 pilot participants (one per mode order) complete a real-length session
- [ ] Every session shows as finished with 12 interruptions in the admin page
- [ ] No unexplained `audio_error` or `upload_error`
- [ ] Median validation error acceptable (or eye tracking switched off / limit raised)
- [ ] Physical button decided and 20/20
- [ ] Final text in place, ethics approved
- [ ] Test rows removed or excluded
