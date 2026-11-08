// Typing with scheduled email interruptions, each followed by a mode-specific music resumption. Used for the 3 study blocks.
// Each entry of delaysS / modes / emails / practiceFlags is one interruption: practiceFlags[i] = true marks a rehearsal
// (logged with practice:true, intr 0, excluded from analysis); false marks a real one (intr 1..12 across the study).
import { runTypingScreen } from "./screens/typingScreen.js";
import { runInterruption } from "./interruption.js";
import { runResumption } from "./resume.js";
import { log, setContext } from "./log.js";

const MIN_AFTER_ERROR_MS = 1500;   // never interrupt within 1.5 s of an error keystroke

export async function runInterruptedTyping(root, api, { label, seed, nWords, delaysS, modes, emails, practiceFlags, tailS, scheduleRule }) {
  const cfg = api.cfg, audio = api.session.audio;
  const total = delaysS.length;
  const realTotal = practiceFlags.filter((f) => !f).length;
  log("block_schedule", { label, practice_flags: practiceFlags, seed, delays_s: delaysS, modes, rule: scheduleRule, tail_s: tailS });

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
    const isPractice = practiceFlags[idx];
    const before = practiceFlags.slice(0, idx);
    const kk = isPractice ? before.filter((f) => f).length + 1 : before.filter((f) => !f).length + 1;   // 1-based within its kind
    const n = isPractice ? kk : (api.step.block - 1) * realTotal + kk;                                   // real: 1..12 over the study
    const mode = modes[idx];
    const ctxBefore = { condition: api.step.condition };
    setContext({ intr: isPractice ? 0 : n, condition: mode });
    await runInterruption({ task, email: emails[idx], n, k: kk, practice: isPractice, cfg, content: api.content, hooks: { pauseMusic: () => audio.pause("interruption") } });
    await runResumption({ mode, task, audio, cfg, content: api.content, n, practice: isPractice, gaze: api.session.gaze });
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
