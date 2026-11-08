// All participant-facing text lives here. Everything is PLACEHOLDER until final text is supplied.
export const CONTENT = {
  welcome: { title: "Welcome", body: "[PLACEHOLDER] Welcome text." },

  consent: {
    title: "Consent",
    body: "[PLACEHOLDER] Consent text (including camera / face recording).",
    checkbox: "[PLACEHOLDER] I have read the information and agree to take part.",
    version: "v0-placeholder"
  },

  camera: {
    title: "Camera",
    body: "[PLACEHOLDER] We would like to use your webcam to estimate where on the screen you are looking. No video or images are recorded or stored, only screen coordinates.",
    allow: "Allow camera",
    skip: "Continue without eye tracking",
    asking: "Please allow camera access in your browser...",
    deniedOptional: "Camera access was not given. You can try again or continue without eye tracking.",
    deniedRequired: "Camera access is needed for this study. Please allow it in your browser settings and try again."
  },
  gaze: {
    title: "Eye tracking setup",
    body: "[PLACEHOLDER] This takes about 40 seconds and is done only once. You will click a series of dots while looking at each one, then look at a few dots without clicking.",
    posture: "Sit about an arm's length from the screen, face the camera in even light, and keep your head as still as you can for the rest of the study.",
    start: "Start",
    loading: "Starting the camera...",
    calibrateHint: "Look at the dot and click it {n} times",
    validateHint: "Now just look at the dot, without clicking",
    ok: "Eye tracking is ready.",
    low: "The accuracy was lower than we would like. Sit still, face the screen in even light, and try again.",
    noFace: "We could not see your face clearly. Check the lighting and that the camera is not covered, then try again.",
    retry: "Calibrate again",
    cont: "Continue",
    failed: "The camera could not be started. You can continue without eye tracking.",
    notAvailable: "Eye tracking is not available in this run (camera not permitted, or disabled)."
  },

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

CONTENT.music = {
  title: "Choose your music",
  body: "[PLACEHOLDER] Paste a link to a Spotify playlist you like to work to. The music repeats when the playlist ends.",
  linkLabel: "Spotify playlist link",
  load: "Load playlist",
  test: "Play test sound",
  stop: "Stop",
  volume: "Set a comfortable volume, then continue. It will stay fixed during the study.",
  unverified: "Spotify does not let us preview this playlist, so use the test sound below to check it plays."
};
CONTENT.resume = {
  digiButton: "Resume music",
  physPrompt: "Press the [button] to resume music",
  autoNote: "Music resumed"
};

CONTENT.typingDone = { title: "Finished", body: "[PLACEHOLDER] Time is up. Well done." };
