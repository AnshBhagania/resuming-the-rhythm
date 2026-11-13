export const APP_VERSION = "0.8.8";

export const CONFIG = {
  baselineSeconds: 120,
  blocks: 3,
  interruptionsPerBlock: 4,
  reopenCorrectWords: true,         // Backspace on an empty word steps back into the previous word even if it was typed correctly (false = Monkeytype rule: wrong words only)
  postLastInterruptionSeconds: 60, // typing continues this long after the last interruption so recovery can be measured
  blockPassageWords: 800,
  interruptionDelaySeconds: [45, 75],
  emailTimeoutSeconds: 60,
  replyMinWords: 3,
  musicFadeInMs: 200,
  resumeNoteMs: 1500,
  playTimeoutMs: 15000,
  practiceSeconds: 60,              // practice is plain typing; interruptions are rehearsed once per block instead
  rehearsalPerBlock: true,          // one flagged practice interruption at the start of each block, in that block's mode
  rehearsalDelaySeconds: 15,
  supabaseUrl: "https://etdtijvlguuxqvehpdvn.supabase.co",
  tokenFn: "spotify-token",
  supabaseKey: "sb_publishable_TZeG7Ic79emzrJNfU7AzJg_zyRREfxb", // publishable key: safe in the repo (insert-only functions + RLS)
  leaseHeartbeatMs: 45000,
  // Defaults for eye tracking; the admin page can override these (see settings.js, table study_settings).
  // Physical resume input (device undecided): key | gamepad | media. Admin-editable. F9 is a placeholder.
  physical: { type: "key", key: "F9", code: "NumpadEnter", gamepadButton: -1, mediaAction: "any", label: "marked key" },
  gaze: { enabled: true, optional: true, gridCols: 3, gridRows: 3, clicksPerPoint: 5, validationDwellMs: 2500, validationSettleMs: 1000, maxErrorPx: 250, maxAttempts: 3, sampleCapHz: 30 },
  flushIntervalMs: 2000,
  flushMaxEvents: 200,
  orders: {
    O1: ["AUTO", "DIGI", "PHYS"], O2: ["AUTO", "PHYS", "DIGI"],
    O3: ["DIGI", "AUTO", "PHYS"], O4: ["DIGI", "PHYS", "AUTO"],
    O5: ["PHYS", "AUTO", "DIGI"], O6: ["PHYS", "DIGI", "AUTO"]
  },
  dryrun: { baselineSeconds: 20, practiceSeconds: 10, rehearsalDelaySeconds: 4, postLastInterruptionSeconds: 10, interruptionDelaySeconds: [8, 12] }
};
