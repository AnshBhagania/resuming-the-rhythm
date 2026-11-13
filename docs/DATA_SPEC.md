# Data and analysis specification (app version 0.8.5)

Purpose: a complete description of what the "Resuming the Rhythm" app logs and how the data is (and is not yet) analysed, so the noise and error handling can be discussed with full context. Written from the code and from one complete pilot session (P02). Everything marked **pilot** comes from that single session and is not evidence about the research question.

## 1. Study in one paragraph

Course project (KTH II2202). Question: does the way background music is resumed after an email interruption (AUTO, DIGI, PHYS) change how fast and how accurately a person recovers on a typing task? Within-subjects: every participant types with their own music playing (Spotify), is interrupted by emails, and resumes the music in each of three ways, one per block. Six counterbalanced block orders (O1 to O6).

| Mode | Resumption |
|---|---|
| AUTO | Music restarts by itself when the reply is sent. Typing unlocks about 0.27 s later (after playback is confirmed). |
| DIGI | An on-screen "play" button (220 x 56 px, at least 250 px below the text box) must be clicked with the mouse. |
| PHYS | A marked physical key (default `NumpadEnter` on an external keyboard) must be pressed. The same prompt appears on screen. |

## 2. Procedure and phases

`phase` values in the log, in order: `welcome`, `consent`, `precheck` (device checks, music setup, eye calibration), `practice` (60 s plain typing), `baseline` (120 s plain typing), then three `block` phases, each followed by `questions`, then `debrief`.

Each block (about 370 to 380 s of typing):
1. One **rehearsal** interruption about 15 s after typing starts, in the block's mode. Flagged `practice: true`, `intr = 0`. Excluded from analysis.
2. Four **real** interruptions. Delay before each: random 45 to 75 s, counted from when typing restarts. Never fired within 1.5 s of an error keystroke. Real interruptions are numbered `intr` 1 to 12 over the study (block 1: 1 to 4, block 2: 5 to 8, block 3: 9 to 12).
3. A 60 s tail after the last interruption, so recovery can be measured.

Interruption sequence: typing greys out and locks, music pauses, notification sound, email card appears (sender, body of 40 to 60 words, one question, three answer options). The participant presses `1`, `2` or `3`, types a reply of at least 3 words, presses Enter. Then the mode-specific resume step runs. Clicking an answer does nothing except show a prompt and is logged. Study email n is fixed to interruption n (not to the mode). 3 practice emails and 12 study emails (placeholder content).

Typing task: Monkeytype-style, random common English words (Monkeytype `english_1k`, filtered), letters only, mean word length about 4.9. Passages are seeded, so the same seed gives the same word list. Rules: Space submits a word. A wrong word cannot be left behind silently: Backspace on an empty word steps back into the previous word (config `reopenCorrectWords: true` allows this even for correctly typed words). Ctrl/Alt/Cmd+Backspace deletes the current word. At most 6 extra letters can be typed beyond a word. Paste is blocked. Numpad keys are ignored by the task (they belong to the PHYS key).

Questionnaires after each block (1 to 7): workload, control, ease. Final: rank the three modes, free comment. Demographics: age, gender, typing frequency, music while working, attention condition (yes / no / prefer not to say). Participant text is drafted (v1-2026-11 consent) and pending ethics approval.

## 3. Storage and event envelope

Supabase Postgres. Tables: `sessions` (session_id, pid, order_code, started_at, app_version, flags, device, spotify_label), `events` (below), `study_settings` (admin-editable gaze/physical settings). Upload is by insert-only RPC functions, idempotent on `(session_id, seq)`; clients cannot read. Admins (allow-listed emails) read. View `session_summary` gives per-session counts (events, audio errors, email timeouts, hidden tabs, upload errors, wrong inputs, real interruptions, finished).

Every event has:

| Column | Meaning |
|---|---|
| `session_id`, `pid`, `seq` | Session UUID, participant id (e.g. P02), per-session sequence number (0, 1, 2, ...) |
| `t` | `performance.now()` in ms since page load, one clock for the whole session. Key and click events use the browser event `timeStamp` on the same clock. |
| `phase` | See section 2. |
| `block` | 0 outside blocks, 1 to 3 in blocks. |
| `condition` | Mode of the block (AUTO/DIGI/PHYS). During an interruption it is that interruption's mode. Null outside blocks. |
| `intr` | Real interruption number 1 to 12 while one is active, otherwise 0 (also 0 for rehearsals). |
| `type`, `data` | Event type and a JSON payload. |

`session_start` stores the full context: app version, order and its source, per-block conditions, seeds, URL flags, user agent, platform, screen and window size, pixel ratio, timezone, settings in force, gaze source.

## 4. Event catalogue

### Typing
| type | data | Notes |
|---|---|---|
| `typing_ready` | label, passage_id, seed, n_words, mean_len, seconds, ui_scale, aoi_text {x,y,w,h}, window | Text box rectangle (AOI) in viewport pixels. |
| `typing_start` / `typing_end` | label, passage_id, seconds / label, reason (`time`, `block_end`, `passage_end`), elapsed_ms, word_idx, words_done, partial_typed | |
| `key` | key, code, repeat, shift, caps, plus: `expected`, `correct` (printable), `bs` (Backspace), `w` (word index), `c` (chars typed in word), `counted:false`, `noop`/`noop_reason` (`first_word`, `previous_word_correct_and_locked`), `reopen`, `bs_word` | One per accepted keydown in typing. Every keystroke with its time. |
| `key_blocked` | key data + reason (`email`, resume lock) | Keys pressed while typing was locked. During an email these are the reply keystrokes. |
| `key_ignored` | key data + reason (`numpad`, `empty_word`, `overflow`, `blocked_key`) | |
| `word_done` | idx, target, typed, first_key_t, space_t, correct_chars, errors, wrong_keys, backspaces, straddled_interruption, reopened, reopen_count | One per Space. A reopened word produces a second `word_done`. `errors` = uncorrected character errors left in the submitted word. `wrong_keys` = wrong printable keystrokes made while typing it (even if later corrected). |
| `word_reopen` | idx, typed, reopen_count | Backspace into a previous word. |
| `idle_start` / `idle_end` | duration_ms, reason (`end`, `lock`) | Idle = 10 s without a key. |
| `ui_mismatch` | idx, expected, shown, typed | Self-check that the screen shows what was typed. Should be zero. |

### Interruption (email)
| type | data |
|---|---|
| `interruption_start` | n, k (1 to 4 in block), email_id, practice, word_idx, typed_partial (what was half-typed) |
| `notification_sound` | (none) |
| `email_shown` | n, email_id, ui_scale, aoi_prompt {x,y,w,h} (card rectangle) |
| `email_key` | key, code, stage (`choose`/`reply`), repeat |
| `email_option` | n, option (1 to 3, or null when stepped back), option_text |
| `email_click` | n, option, stage, x, y (a click on an answer; it does not select) |
| `interruption_timeout` | n, email_id, practice (60 s without a reply) |
| `reply_sent` | n, k, practice, email_id, option, option_text, reply (the text), reply_words, timed_out, option_via (`key`), clicks, cursor {x,y} (last mouse position) |

### Resumption
| type | data |
|---|---|
| `resume_prompt_shown` | mode, n, practice, aoi_prompt, gap_below_box, clamped (true if the window was too short to place it 250 px below the box), ui_scale, viewport. DIGI and PHYS only. |
| `resume_input` | mode, n, practice, source (`mouse_click`, `key`, `gamepad`, `media`), key/code for keys. The valid resume action. |
| `wrong_input` | mode, n, practice, kind (`click_on_card`, `click_elsewhere`, `physical_key`, `keyboard`), key, code. Anything that is not the valid input during the prompt (stray clicks in DIGI are not logged). |
| `key_shortcut` | key, code, ctrl, meta. Browser shortcuts pressed at the prompt (let through, e.g. zoom). |
| `mouse_move_first` | x, y. DIGI only: first mouse movement after the prompt appears. |
| `gaze_click_check` | n, gaze_x, gaze_y (mean of the last 10 gaze samples), click_x, click_y, err_px (distance from gaze to the button centre). DIGI only, free accuracy check. |
| `typing_unlock` | n, play_timed_out, play_called_to_playing_ms (delay until Spotify confirms playing). Typing is allowed again from here. |

### Music
`audio_play_called` (reason, position_ms, fade_ms), `music_play` (reason, position_ms, track), `music_pause` (reason, position_ms, track), `track_change` (name, track, position_ms), `audio_error` (kind, message; kinds include play_timeout, DRM, missing_key, setup), `spotify_account` (label of the shared account that was used). `answer` with id `music_setup` records the playlist and volume chosen.

### Eye tracking (WebGazer, webcam, in browser; only coordinates are logged, never video)
| type | data |
|---|---|
| `gaze` | `samples`: array of `[t, x, y, aoi]`, batched about once a second, capped at 30 Hz. x,y are viewport pixels (null when no face). `aoi`: `T` inside the text box, `P` inside the email card or resume prompt, `O` anywhere else or no face. |
| `gaze_lost` / `gaze_back` | since_t / lost_ms (face lost for more than 500 ms) |
| `gaze_state` | state: `camera_preview_on`, `permitted`, `declined`, `denied` (+name), `camera_stopped`, `failed`, ... |
| `calib_point` | attempt, idx, x, y, clicks, window. Calibration: 9 points x 5 clicks. |
| `calib_validation` | attempt, points [{n, x, y, err_px, pred_x, pred_y}], mean_err_px, valid_points, ok, verdict, max_error_px (250) |
| `gaze_ready` | attempts, ok, mean_err_px |
| `gaze_skipped` | state |

Learning from the mouse is switched off after calibration, so the model stays fixed during the experiment. There is no recalibration during blocks.

### Session, device, health
`session_start`, `session_end`, `state_enter` (screen, index), `nav_back` (Back button used), `ui_scale` (scale, window), `window_resize`, `visibility_change` (hidden), `blur`, `focus`, `consent_given`, `latency_probe` (rtt_ms[], median_ms to Supabase), `device_info` (keyboard layout keys KeyQ/W/Y/Z/A plus `layout_class` QWERTY/QWERTZ/AZERTY/other/unknown, audio base/output latency, Widevine present), `upload_error`, `answer` (see below), `input_test_*` (physical button test, not part of normal sessions).

`answer` ids: `demo_touch_typing` (yes/mostly/no), `device_typing_keyboard` (laptop/external), `device_pointer` (trackpad/mouse), `demo_age`, `demo_gender`, `demo_typing_freq`, `demo_music_while_working`, `demo_attention_condition`, `precheck` (headphones, keyboard_ok, window, ui_scale), `music_setup`, `q_workload`, `q_control`, `q_ease` (after each block, with block context), `rank_AUTO`, `rank_DIGI`, `rank_PHYS`, `debrief_comment`.

### Not logged
Video or images, audio content, other tabs or apps, screen contents. The reply text and the music title/playlist name are logged.

## 5. Flags and exclusions

URL flags (`setup` (researcher note, e.g. where the covered keyboard stood), `debug`, `dryrun`, `nodb`, `gaze=0|mouse`, `gazetest`, `inputtest`, `audio=synthetic`, `step`, `order`, `seed`) are stored in `sessions.flags` and `session_start`. Exclude from analysis any session with debug, dryrun, nodb, gazetest, inputtest, synthetic audio or mouse-simulated gaze. Sessions with `app_version` 0.8.0 are early test data with wrong prompt rectangles. Rehearsal interruptions (`practice: true`) are excluded. Trials with `clamped: true` are excluded.

## 6. How the data is analysed today

Derived metrics are computed offline from the raw events and never stored. The analysis code lives in `analysis/` (see `analysis/README.md`): feature extraction (words, interruptions, windows, error rates, WPM), CSV export, pilot calibration helpers and mixed models. Core is pure Python; the models need pandas and statsmodels and have only been checked on simulated data. The conventions below are what that code implements; the ad-hoc SQL at the end was used for the first pilot look.

### Conventions
- Use the LAST `word_done` per `idx` (a reopened word logs twice). Exclude reopened words from per-word speed because their time includes the pause.
- Exclude `straddled_interruption: true` words from per-word speed (the half-typed word that was open during the email contains the whole email time).
- Per-word time = `space_t - first_key_t` (ms), a fluent-typing measure that leaves out pauses between words. Characters per second is also available from `key` events.
- Accuracy has two levels: uncorrected (`errors` per word) and corrected-and-uncorrected (`wrong_keys` per printable keystroke). The second is the real error rate. Backspace counts are in `backspaces`.

### Words per minute (WPM)
WPM is **not logged** and **not stored**. It can be computed offline from `word_done` and `typing_end`, and is not yet part of any analysis script. The only place the app computes it is a debug-only readout on screen (`debug=1`), which is not saved. Definitions to use:

- **Standard WPM**: characters / 5 per minute. Net WPM counts only correctly typed words (`typed == target`, last `word_done` per idx, each word counted as length + 1 for the space). Gross WPM counts every submitted word.
- **Clock WPM**: divided by the whole elapsed typing time (`typing_end.elapsed_ms`). In a block this includes the time the typing was locked for email and resumption (about 40 to 75 s of 370 s), so it mixes typing speed with interruption cost.
- **Unlocked WPM**: divide by elapsed time minus locked time (`interruption_start` to `typing_unlock` for each interruption). This is the closest to pure typing speed, but it still includes pauses and error recovery.
- Interruption cost shows up as the difference between the two, and as lag/restart (below). Per-word time (`space_t - first_key_t`) is a different, pause-free measure of fluency and is what the interruption analysis uses.

### Metrics (definitions)
| Metric | Definition | Depends on typing skill? |
|---|---|---|
| Resume action time | `resume_input.t - reply_sent.t` (DIGI, PHYS; none for AUTO) | No |
| Unlock delay | `typing_unlock.t - reply_sent.t` (includes action time and Spotify confirmation) | No |
| **Resumption lag** | first `key` after `typing_unlock` minus `reply_sent.t` | Barely |
| Restart time | first `key` after `typing_unlock` minus `typing_unlock.t` | Barely |
| Post-resume speed | mean/median per-word time of the first N (5 used so far) non-straddled words that start after unlock | Yes |
| Pre-interruption speed | same over the N non-straddled words before `interruption_start` | Yes |
| Post-resume accuracy | wrong_keys and backspaces over the same N words | Yes |
| Reply time | `reply_sent.t - email_shown.t` (reading and replying; not an outcome, but a check that blocks are comparable) | |
| Subjective | `q_workload`, `q_control`, `q_ease` per block, and the final ranking | |
| Gaze | share of samples T/P/O in windows around interruptions; time to first gaze in T after unlock; gaze on the prompt (P) before the action; `gaze_click_check` error | Needs calibration quality |

Planned primary outcomes (proposal): resumption lag and restart time (robust to typing skill), then post-resume speed and accuracy over a short window, plus the questionnaires.

### Ad-hoc SQL used on the pilot (reference)
Per interruption: take `max(t)` of `interruption_start`, `reply_sent`, `typing_unlock`, `resume_input` grouped by `(block, condition, intr)`, then `min(t)` of `key` events with `t > unlock` for the first key. Per-word speed: `word_done` rows where `straddled_interruption` is false, `space_t - first_key_t`, medians via `percentile_cont(0.5)`. Gaze per phase: `jsonb_array_elements(data->'samples')` on `gaze` events, counting AOI codes and mean x/y.

## 7. Pilot session P02 (one person, the developer, order O2: AUTO, PHYS, DIGI; real Spotify audio, no flags)

Do not infer anything about the research question from n = 1 with 4 interruptions per mode.

- 7,617 events, complete from consent to debrief, no upload errors, no audio problems, 56 ms median round trip, window 1800 x 1042 at scale 1.
- Typing, median per-word time (ms, non-straddled): practice 1085, baseline 1098, AUTO 1040, PHYS 937, DIGI 979. Wrong keys per 100 correct characters: practice 2.8, baseline 4.0, AUTO 6.4, PHYS 4.6, DIGI 6.0. Uncorrected character errors were rare (12, 1, 5).
- Net WPM (computed offline for this document): practice 42.6, baseline 44.6. Blocks, clock WPM / unlocked WPM: AUTO 38.8 / 43.5, PHYS 37.7 / 46.8, DIGI 39.4 / 44.6. Locked time per block was 40, 74 and 44 s (PHYS includes the 35 s rehearsal confusion). So the clock WPM drop in blocks is mostly interruption time, and unlocked typing speed stayed at the baseline level or above.
- Real interruptions (4 per mode), means: resumption lag AUTO 1.10 s, PHYS 1.97 s, DIGI 2.40 s. Resume action PHYS 0.75 s, DIGI 1.23 s. Restart after unlock about 0.82, 0.92, 0.87 s.
- Speed of the 5 words after resuming versus the 5 before (ms per word): AUTO 1480 vs 1380, PHYS 940 vs 1060, DIGI 930 vs 1120. No lasting slowdown after the first key in this session.
- PHYS rehearsal took 35 s because the participant did not know which key to press (clicked, pressed normal Enter twice, left the tab). Excluded as a rehearsal, but real participants will face the same confusion.
- Eye tracking: calibration passed (1 attempt, mean error 196 px, per point 85 to 309 px). During typing almost no samples were inside the text box (4 of 3,287 in the baseline). Mean gaze y drifted down over the session: practice 382, baseline 593, blocks 665 / 668 / 732, while the text box is at y 72 to 332. The DIGI click check showed 226 to 382 px between gaze and the button. The gaze data is therefore not usable for text-box / prompt AOI analysis in its current form. Cause (calibration drift versus looking at the keyboard) is not established.

## 8. Known noise sources and open issues (the reason for this document)

1. **Typing mistakes and loss of rhythm.** After a wrong key, fixing it and losing flow can slow a person for a while, independent of interruption or resumption. Non-touch typists look at the keyboard and make more errors. This is within-person, heavy-tailed noise on speed and accuracy outcomes. It may also be partly caused by the condition (DIGI needs a hand move to the mouse and back), which would be a real effect, not noise.
2. **Few trials.** 4 real interruptions per mode per person, 12 per person, so one derailed trial moves a mean a lot.
3. **Order, practice and fatigue.** Speed changes over about 20 minutes of typing. Counterbalancing over 6 orders handles this only across participants.
4. **Straddling.** An interruption lands inside a word in most cases (the half-typed word). That word, and the way the participant continues it, is a special case.
5. **Interruption timing.** Never within 1.5 s of an error keystroke, but errors shortly before (and the 4 to 10 s of email reading and writing) still differ between trials.
6. **Resume action time is part of the outcome.** PHYS and DIGI add a deliberate action. Whether recovery should include or exclude it is an analysis choice (resumption lag includes it, restart excludes it).
7. **Gaze quality.** Drift, about 200 to 300 px error, and no recalibration during the session. The resume button is 56 px high.
8. **Physical key learnability.** First-time confusion in PHYS.
9. **Unanalysed / not built:** analysis scripts or SQL views, exclusion rules written down in advance, session resume after a page refresh, ethics approval of the participant texts and questionnaire wording, the lyrics versus no-lyrics music question.
10. **Participant's own music.** Chosen by the participant, so loudness, genre, lyrics and familiarity vary and are not controlled. Track and playlist are logged.

## 9. Questions for the analysis discussion

- Which outcomes should be primary given the noise (resumption lag and restart versus post-resume speed and accuracy)? What window length N after resuming?
- How to treat windows that contain an error or backspace: exclude, adjust for it, or report both ways? What exclusion rules should be fixed before looking at real data?
- Model choice for repeated measures with few trials (mixed model with participant random effects, log-transformed times, baseline speed as covariate, order as covariate), versus simpler per-participant medians and nonparametric tests.
- Screening on baseline speed and accuracy (and self-reported touch typing) versus keeping everyone.
- Whether to make the task more forgiving (no fix-and-recover loop), or keep Monkeytype rules.
- How to use gaze at all, given the observed accuracy and drift (for example only as relative, within-block reference, or only as a check that the participant looked at the screen).
