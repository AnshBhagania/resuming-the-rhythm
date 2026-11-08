export const APP_VERSION = "0.0.1";

export const CONFIG = {
  baselineSeconds: 120,
  practiceSeconds: 60,
  blocks: 3,
  interruptionsPerBlock: 4,
  blockPlaceholderSeconds: 30, // stage 2 only: block typing length until interruptions (stage 3) define it
  interruptionDelaySeconds: [45, 75],
  emailTimeoutSeconds: 60,
  replyMinWords: 3,
  musicFadeInMs: 200,
  physicalPlaceholderKey: "F9",
  flushIntervalMs: 2000,
  flushMaxEvents: 200,
  minScreen: { w: 1280, h: 720 },
  orders: {
    O1: ["AUTO", "DIGI", "PHYS"], O2: ["AUTO", "PHYS", "DIGI"],
    O3: ["DIGI", "AUTO", "PHYS"], O4: ["DIGI", "PHYS", "AUTO"],
    O5: ["PHYS", "AUTO", "DIGI"], O6: ["PHYS", "DIGI", "AUTO"]
  },
  dryrun: { baselineSeconds: 20, practiceSeconds: 10, blockPlaceholderSeconds: 10, interruptionDelaySeconds: [8, 12] }
};
