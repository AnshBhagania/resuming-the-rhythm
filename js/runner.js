// Typing with scheduled email interruptions, each followed by a mode-specific music resumption.
// Used for practice (one interruption per mode, practice=true) and for the 3 study blocks (4 each, one mode).
import { runTypingScreen } from "./screens/typingScreen.js";
import { runInterruption } from "./interruption.js";
import { runResumption } from "./resume.js";
import { log, setContext } from "./log.js";

const MIN_AFTER_ERROR_MS = 1500;   // never interrupt within 1.5 s of an error keystroke

export async function runInterruptedTyping(root, api, { label, seed, nWords, delaysS, modes, emails, practice = false, tailS, scheduleRule }) {
  const cfg = api.cfg, audio = api.session.audio;
  const total = delaysS.length;
  log("block_schedule", { label, practice, seed, delays_s: delaysS, modes, rule: scheduleRule, tail_s: tailS });

  let k = 0, timer = null, task = null, ended = false;
  const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(fire, ms); };

  function fire() {
    if (ended) return;
    const since = performance.now() - task.getState().lastErrorT;
    if (since < MIN_AFTER_ERROR_MS) { schedule(MIN_AFTER_ERROR_MS - since + 5); return; }
    interrupt();
  }

  async function interrupt() {
    const idx = k++;
    const n = practice ? idx + 1 : (api.step.block - 1) * total + k;
    const mode = modes[idx];
    const ctxBefore = { condition: api.step.condition };
    setContext({ intr: practice ? 0 : n, condition: mode });
    await runInterruption({ task, email: emails[idx], n, k, practice, cfg, hooks: { pauseMusic: () => audio.pause("interruption") } });
    await runResumption({ mode, task, audio, cfg, content: api.content, n, practice });
    setContext({ intr: 0, condition: ctxBefore.condition });
    if (k < total) schedule(delaysS[k] * 1000);
    else { clearTimeout(timer); timer = setTimeout(() => task.stop("block_end"), tailS * 1000); }
  }

  task = await runTypingScreen(root, api, {
    label, seed, seconds: 3600, nWords,
    debugExtra: () => `intr ${k}/${total}`,
    onStart: () => schedule(delaysS[0] * 1000),
    onEnd: () => { ended = true; clearTimeout(timer); }
  });
}
