// Block typing: 4 interruptions per block on a seeded schedule, then a recovery tail.
import { runTypingScreen } from "./typingScreen.js";
import { runInterruption } from "../interruption.js";
import { EMAILS } from "../../data/emails.js";
import { makeRng } from "../rng.js";
import { log, setContext } from "../log.js";

const MIN_AFTER_ERROR_MS = 1500;   // never interrupt within 1.5 s of an error keystroke

export async function render(root, api) {
  const { block, condition } = api.step;
  const cfg = api.cfg;
  const per = cfg.interruptionsPerBlock;
  const seed = api.session.seeds["block" + block];
  const rng = makeRng(seed + 1000);
  const [lo, hi] = cfg.interruptionDelaySeconds;
  const delays = Array.from({ length: per }, () => Number(rng.range(lo, hi).toFixed(3)));
  log("block_schedule", { block, condition, seed, delays_s: delays, rule: "simple: delay after typing (re)starts", post_last_s: cfg.postLastInterruptionSeconds });

  let k = 0, timer = null, task = null, ended = false;

  function schedule(delayMs) {
    clearTimeout(timer);
    timer = setTimeout(fire, delayMs);
  }

  function fire() {
    if (ended) return;
    const since = performance.now() - task.getState().lastErrorT;
    if (since < MIN_AFTER_ERROR_MS) { schedule(MIN_AFTER_ERROR_MS - since + 5); return; }
    interrupt();
  }

  async function interrupt() {
    k++;
    const n = (block - 1) * per + k;
    setContext({ intr: n });
    await runInterruption({ task, email: EMAILS.study[n - 1], n, k, cfg });
    // Stage 4 replaces this with the mode-specific resumption (AUTO / DIGI / PHYS) and music.
    log("typing_unlock", { n });
    task.unlock();
    setContext({ intr: 0 });
    if (k < per) schedule(delays[k] * 1000);
    else { clearTimeout(timer); timer = setTimeout(() => task.stop("block_end"), cfg.postLastInterruptionSeconds * 1000); }
  }

  task = await runTypingScreen(root, api, {
    label: "block" + block, seed, seconds: 3600, nWords: cfg.blockPassageWords,
    debugExtra: () => `intr ${k}/${per}`,
    onStart: () => schedule(delays[0] * 1000),
    onEnd: () => { ended = true; clearTimeout(timer); }
  });
}
