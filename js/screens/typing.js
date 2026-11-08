// Study block: 4 interruptions, all in this block's resumption mode, then a recovery tail.
import { runInterruptedTyping } from "../runner.js";
import { EMAILS } from "../../data/emails.js";
import { makeRng } from "../rng.js";

export function render(root, api) {
  const { block, condition } = api.step;
  const cfg = api.cfg, per = cfg.interruptionsPerBlock;
  const seed = api.session.seeds["block" + block];
  const rng = makeRng(seed + 1000);
  const [lo, hi] = cfg.interruptionDelaySeconds;
  const delaysS = Array.from({ length: per }, () => Number(rng.range(lo, hi).toFixed(3)));
  const emails = EMAILS.study.slice((block - 1) * per, block * per);
  runInterruptedTyping(root, api, {
    label: "block" + block, seed, nWords: cfg.blockPassageWords, delaysS, modes: Array(per).fill(condition), emails,
    tailS: cfg.postLastInterruptionSeconds, scheduleRule: "simple: delay after typing (re)starts"
  });
}
