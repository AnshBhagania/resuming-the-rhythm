export const APP_VERSION = "0.0.1";

export const CONFIG = {
  baselineSeconds: 120,
  practiceSeconds: 60,
  blocks: 3,
  interruptionsPerBlock: 4,
  postLastInterruptionSeconds: 60, // typing continues this long after the last interruption so recovery can be measured
  blockPassageWords: 800,
  interruptionDelaySeconds: [45, 75],
  emailTimeoutSeconds: 60,
  replyMinWords: 3,
  musicFadeInMs: 200,
  resumeNoteMs: 1500,
  playTimeoutMs: 15000,
  minPlaylistMinutes: 30,
  practiceFirstDelaySeconds: 15,
  practiceGapSeconds: 15,
  practiceTailSeconds: 10,
  supabaseUrl: "https://etdtijvlguuxqvehpdvn.supabase.co",
  tokenFn: "spotify-token",
  physicalPlaceholderKey: "F9",
  flushIntervalMs: 2000,
  flushMaxEvents: 200,
  minScreen: { w: 1280, h: 720 },
  orders: {
    O1: ["AUTO", "DIGI", "PHYS"], O2: ["AUTO", "PHYS", "DIGI"],
    O3: ["DIGI", "AUTO", "PHYS"], O4: ["DIGI", "PHYS", "AUTO"],
    O5: ["PHYS", "AUTO", "DIGI"], O6: ["PHYS", "DIGI", "AUTO"]
  },
  dryrun: { baselineSeconds: 20, practiceSeconds: 10, practiceFirstDelaySeconds: 4, practiceGapSeconds: 4, practiceTailSeconds: 3, minPlaylistMinutes: 0, postLastInterruptionSeconds: 10, interruptionDelaySeconds: [8, 12] }
};
