// Study block: one rehearsal interruption (practice, flagged), then 4 real interruptions, all in this block's resumption mode, then a recovery tail.
import { runInterruptedTyping } from "../runner.js";
import { EMAILS } from "../../data/emails.js";
import { makeRng } from "../rng.js";

export function render(root, api) {
  const { block, condition } = api.step;
  const cfg = api.cfg, per = cfg.interruptionsPerBlock;
  const seed = api.session.seeds["block" + block];
  const rng = makeRng(seed + 1000);                     // unchanged by the rehearsal: the real schedule is identical with or without it
  const [lo, hi] = cfg.interruptionDelaySeconds;
  const realDelays = Array.from({ length: per }, () => Number(rng.range(lo, hi).toFixed(3)));
  const realEmails = EMAILS.study.slice((block - 1) * per, block * per);
  const rehearse = cfg.rehearsalPerBlock;
  runInterruptedTyping(root, api, {
    label: "block" + block, seed, nWords: cfg.blockPassageWords,
    delaysS: rehearse ? [cfg.rehearsalDelaySeconds, ...realDelays] : realDelays,
    modes: Array(per + (rehearse ? 1 : 0)).fill(condition),
    emails: rehearse ? [EMAILS.practice[block - 1], ...realEmails] : realEmails,
    practiceFlags: [...(rehearse ? [true] : []), ...Array(per).fill(false)],
    tailS: cfg.postLastInterruptionSeconds,
    scheduleRule: "simple: delay after typing (re)starts" + (rehearse ? "; one flagged rehearsal first" : "")
  });
}
