// All participant-facing text lives here. Everything is PLACEHOLDER until final text is supplied.
export const CONTENT = {
  welcome: { title: "Welcome", body: "[PLACEHOLDER] Welcome text." },

  consent: {
    title: "Consent",
    body: "[PLACEHOLDER] Consent text (including camera / face recording).",
    checkbox: "[PLACEHOLDER] I have read the information and agree to take part.",
    version: "v0-placeholder"
  },

  camera: { title: "Camera", body: "[PLACEHOLDER] Camera permission explanation. (Camera is not used yet.)" },

  precheck: {
    title: "Before we start",
    body: "[PLACEHOLDER] Please use headphones, close other apps, and use a real keyboard.",
    headphones: "I am wearing headphones.",
    keyboardPrompt: "Keyboard check: type the word below.",
    keyboardWord: "rhythm",
    soundNote: "[PLACEHOLDER] Sound test and volume setting are added with the music stage.",
    screenOk: "Screen size OK.",
    screenBad: "Your window is too small. Use a laptop or desktop screen of at least 1280 x 720 and maximise the browser window."
  },

  demographics: {
    title: "About you",
    items: [
      { id: "age", label: "[PLACEHOLDER] Age", type: "number" },
      { id: "gender", label: "[PLACEHOLDER] Gender", type: "choice", options: ["Woman", "Man", "Non-binary", "Prefer not to say"] },
      { id: "typing_freq", label: "[PLACEHOLDER] How often do you type on a computer?", type: "choice", options: ["Daily", "Weekly", "Rarely"] },
      { id: "music_while_working", label: "[PLACEHOLDER] Do you usually listen to music while working?", type: "yesno" },
      { id: "attention_condition", label: "[PLACEHOLDER] Attention-condition question (to be supplied): do you have a condition that affects attention?", type: "yesno" }
    ]
  },

  instructions: { title: "Instructions", body: "[PLACEHOLDER] Task instructions." },
  practice: { title: "Practice", body: "[PLACEHOLDER] Practice round (typing plus one practice interruption per mode)." },
  baseline: { title: "Baseline", body: "[PLACEHOLDER] Baseline typing, no interruptions." },

  blockIntro: { title: "Next block", body: "[PLACEHOLDER] Block intro." },
  modes: {
    AUTO: "[PLACEHOLDER] In this block the music resumes by itself after you reply.",
    DIGI: "[PLACEHOLDER] In this block, click the on-screen button to resume the music.",
    PHYS: "[PLACEHOLDER] In this block, press the physical button to resume the music."
  },

  typing: { title: "Typing", body: "[PLACEHOLDER] Typing with interruptions." },

  questionnaire: {
    title: "Questions about this block",
    scale: { min: 1, max: 7, minLabel: "Not at all", maxLabel: "Very much" },
    items: [
      { id: "workload", label: "[PLACEHOLDER] How mentally demanding was the task?" },
      { id: "control", label: "[PLACEHOLDER] How much control did you feel over the music?" },
      { id: "ease", label: "[PLACEHOLDER] How easy was it to get back to typing after the interruption?" }
    ]
  },

  debrief: {
    title: "Final questions",
    body: "[PLACEHOLDER] Rank the three ways of resuming the music (1 = best).",
    rankLabels: { AUTO: "Music resumed automatically", DIGI: "On-screen button", PHYS: "Physical button" },
    commentLabel: "[PLACEHOLDER] Any comments?"
  },

  done: { title: "Done", body: "[PLACEHOLDER] Thank you for taking part." },

  blocked: {
    title: "Desktop only",
    body: "This study runs on a laptop or desktop computer in Chrome. Please open the link again on a computer."
  },
  noPid: "No participant ID in the link. Using P00. (Expected ?pid=P07)"
};
