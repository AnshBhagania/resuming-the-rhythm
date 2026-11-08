// Resumption after an interruption: AUTO / DIGI / PHYS.
// Typing stays locked until the audio backend reports playback ("music_play") in every mode.
import { el } from "./ui.js";
import { log } from "./log.js";
import { BOX } from "./typing.js";

const MIN_GAP_BELOW_BOX = 250;

export function onFirstFrame(cb) {
  let done = false;
  const run = () => { if (!done) { done = true; cb(); } };
  requestAnimationFrame(run);
  setTimeout(run, 50);   // rAF is throttled in background tabs; do not lose the event
}

export async function runResumption({ mode, task, audio, cfg, content, n, practice = false }) {
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
  const top = Math.round(boxRect.bottom + MIN_GAP_BELOW_BOX);
  const prompt = mode === "DIGI"
    ? el("button", { class: "resume-prompt resume-btn", type: "button" }, content.resume.digiButton)
    : el("div", { class: "resume-prompt resume-card" }, content.resume.physPrompt);
  prompt.style.top = top + "px";
  document.body.append(prompt);
  if (mode === "DIGI") prompt.blur();

  const inputResult = new Promise((resolve) => {
    const stop = listenWrongInputs({
      mode, cfg, base, prompt,
      valid: (e) => {
        if (mode === "DIGI" && e.type === "click" && prompt.contains(e.target)) return { source: "mouse_click" };
        if (mode === "PHYS" && e.type === "keydown" && e.key === cfg.physicalPlaceholderKey && !e.repeat) return { source: "placeholder_key", key: e.key };
        return false;
      },
      onValid: (e, info) => { stop(); log("resume_input", { ...base, ...info }, e.timeStamp); resolve(); }
    });
  });

  const rect = prompt.getBoundingClientRect();   // measured synchronously; logged on the first painted frame (or 50 ms, whichever is first)
  onFirstFrame(() => log("resume_prompt_shown", { ...base, aoi_prompt: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }, gap_below_box: Math.round(rect.top - boxRect.bottom) }));

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
  const handler = (e) => {
    if (e.type === "mousedown") return;                 // classify on click only
    if (e.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
    const v = valid(e);
    if (v) { e.preventDefault(); e.stopPropagation(); onValid?.(e, v); return; }
    e.preventDefault();
    const kind = e.type === "click"
      ? (prompt && prompt.contains(e.target) ? "click_on_card" : "click_elsewhere")
      : (e.key === cfg.physicalPlaceholderKey ? "physical_key" : "keyboard");
    if (mode === "DIGI" && e.type === "click" && !prompt?.contains(e.target)) return;  // stray clicks are not errors in DIGI
    log("wrong_input", { ...base, kind, key: e.type === "keydown" ? e.key : null }, e.timeStamp);
  };
  document.addEventListener("keydown", handler, true);
  document.addEventListener("click", handler, true);
  return () => { document.removeEventListener("keydown", handler, true); document.removeEventListener("click", handler, true); };
}

export { BOX };
