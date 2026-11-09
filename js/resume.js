// Resumption after an interruption: AUTO / DIGI / PHYS.
// Typing stays locked until the audio backend reports playback ("music_play") in every mode.
import { el } from "./ui.js";
import { log } from "./log.js";
import { meanOfRecent } from "./gaze.js";
import { createPhysicalSource } from "./input.js";
import { getScale } from "./layout.js";

const MIN_GAP_BELOW_BOX = 250;

// Where an element will REST. getBoundingClientRect() during a slide-in animation includes the animation's start offset, which made the
// logged prompt rectangles wrong (about 28 px low) in app versions up to 0.8.0.
export function settledRect(el) {
  const prev = el.style.animation;
  el.style.animation = "none";
  const r = el.getBoundingClientRect();
  el.style.animation = prev;
  return r;
}

export function onFirstFrame(cb) {
  let done = false;
  const run = () => { if (!done) { done = true; cb(); } };
  requestAnimationFrame(run);
  setTimeout(run, 50);   // rAF is throttled in background tabs; do not lose the event
}

export async function runResumption({ mode, task, audio, cfg, content, n, practice = false, gaze = null }) {
  const base = { mode, n, practice };

  if (mode === "AUTO") {
    const stop = listenWrongInputs({ mode, cfg, base, valid: () => false });
    const r = await audio.play({ reason: "auto_resume" });
    stop();
    const note = el("div", { class: "resume-note" }, content.resume.autoNote);
    document.body.append(note);
    setTimeout(() => note.remove(), cfg.resumeNoteMs);
    return finish(task, n, r);
  }

  // DIGI / PHYS: same size and position prompt, at least 250 px below the text box.
  const boxRect = task.box.getBoundingClientRect();
  const ui = getScale();                                            // everything scales together on smaller windows
  const wantedTop = Math.round(boxRect.bottom + MIN_GAP_BELOW_BOX * ui);
  // In a window too short to show the prompt 250 px below the box, keep it visible instead (a hidden prompt traps the participant).
  // The real gap is logged and the trial flagged `clamped`, so analysis can exclude it.
  const top = Math.max(Math.round(boxRect.bottom) + 8, Math.min(wantedTop, innerHeight - 56 * ui - 16));
  const clamped = top < wantedTop;
  const prompt = mode === "DIGI"
    ? el("button", { class: "resume-prompt resume-btn", type: "button" }, el("span", { class: "play-ico", "aria-hidden": "true" }), el("span", { class: "resume-label" }, content.resume.digiButton))
    : el("div", { class: "resume-prompt resume-card" }, el("span", { class: "play-ico", "aria-hidden": "true" }), el("span", { class: "resume-label" }, content.resume.physPrompt.replace("[button]", cfg.physical.label)));
  prompt.style.top = top + "px";
  document.body.append(prompt);
  if (mode === "DIGI") prompt.blur();

  const physical = createPhysicalSource(cfg.physical);
  const inputResult = new Promise((resolve) => {
    let stopDevice = null;
    const stop = listenWrongInputs({
      mode, cfg, base, prompt,
      valid: (e) => {
        if (mode === "DIGI" && e.type === "click" && prompt.contains(e.target)) return { source: "mouse_click" };
        if (mode === "PHYS") return physical.keyMatches(e) || false;
        return false;
      },
      onValid: (e, info) => {
        stop(); stopDevice?.(); log("resume_input", { ...base, ...info }, e.timeStamp);
        if (gaze && mode === "DIGI") {   // free accuracy check: people look at the button as they click it
          const m = meanOfRecent(gaze.recent(10)), r = prompt.getBoundingClientRect();
          if (m) log("gaze_click_check", { ...base, gaze_x: Math.round(m.x), gaze_y: Math.round(m.y), n: m.n,
            click_x: Math.round(e.clientX), click_y: Math.round(e.clientY), err_px: Math.round(Math.hypot(m.x - (r.left + r.width / 2), m.y - (r.top + r.height / 2))) }, e.timeStamp);
        }
        resolve();
      }
    });
    if (mode === "PHYS" && physical.type !== "key") {      // gamepad / media devices arrive outside the keydown stream
      stopDevice = physical.start((info) => { stop(); stopDevice?.(); log("resume_input", { ...base, ...info }, info.t); resolve(); });
    }
  });

  const rect = settledRect(prompt);   // measured at its resting place; logged on the first painted frame (or 50 ms, whichever is first)
  onFirstFrame(() => log("resume_prompt_shown", { ...base, aoi_prompt: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }, gap_below_box: Math.round(rect.top - boxRect.bottom), clamped, ui_scale: ui, viewport: { w: innerWidth, h: innerHeight } }));

  if (mode === "DIGI") {
    document.addEventListener("mousemove", (e) => log("mouse_move_first", { ...base, x: e.clientX, y: e.clientY }, e.timeStamp), { once: true, capture: true });
  }

  await inputResult;
  prompt.remove();
  const r = await audio.play({ reason: mode.toLowerCase() + "_resume" });
  return finish(task, n, r);
}

function finish(task, n, playResult) {
  log("typing_unlock", { n, play_timed_out: playResult.timedOut, play_called_to_playing_ms: playResult.timedOut ? null : Number((playResult.tPlaying - playResult.tCalled).toFixed(3)) });
  task.unlock();
  return playResult;
}

// Logs every input that is not the valid resume input as wrong_input (and swallows it).
function listenWrongInputs({ mode, cfg, base, prompt, valid, onValid }) {
  const physical = createPhysicalSource(cfg.physical);
  const handler = (e) => {
    if (e.type === "mousedown") return;                 // classify on click only
    if (e.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
    const v = valid(e);
    if (v) { e.preventDefault(); e.stopPropagation(); onValid?.(e, v); return; }
    // Browser shortcuts (Ctrl/Cmd + minus to zoom out, reload, F-keys) are not attempts to resume: let them through and log them apart.
    if (e.type === "keydown" && (e.ctrlKey || e.metaKey || /^F([1-9]|1[0-2])$/.test(e.key))) {
      log("key_shortcut", { ...base, key: e.key, code: e.code, ctrl: e.ctrlKey, meta: e.metaKey }, e.timeStamp);
      return;
    }
    e.preventDefault();
    const kind = e.type === "click"
      ? (prompt && prompt.contains(e.target) ? "click_on_card" : "click_elsewhere")
      : (physical.keyMatches(e) ? "physical_key" : "keyboard");
    if (mode === "DIGI" && e.type === "click" && !prompt?.contains(e.target)) return;  // stray clicks are not errors in DIGI
    log("wrong_input", { ...base, kind, key: e.type === "keydown" ? e.key : null, code: e.type === "keydown" ? e.code : null }, e.timeStamp);
  };
  document.addEventListener("keydown", handler, true);
  document.addEventListener("click", handler, true);
  return () => { document.removeEventListener("keydown", handler, true); document.removeEventListener("click", handler, true); };
}

