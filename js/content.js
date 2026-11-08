// All participant-facing text lives here, in the order participants see it. Everything marked [PLACEHOLDER] is to be replaced
// with final text. Strings with {n}, {s}, {sent}, {total}, {modes} or [button] are filled in by the app.
export const CONTENT = {
  // Shared by several screens
  ui: {
    continue: "Continue",
    start: "Start",
    retry: "Retry",
    loading: "Loading...",
    getReady: "Get ready",
    startingMusic: "Starting the music...",
    couldNotLoad: "Could not load",
    wordListFailed: "The word list failed to load. Check your connection and try again.",
    startTypingHint: "Start typing when you are ready.",
    yes: "Yes",
    no: "No"
  },

  // Shown instead of the study on phones and tablets
  blocked: {
    title: "Desktop only",
    body: "This study runs on a laptop or desktop computer in Chrome. Please open the link again on a computer."
  },

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

  precheck: {
    title: "Before we start",
    body: "[PLACEHOLDER] Please use headphones, close other apps, and use a real keyboard.",
    headphones: "I am wearing headphones.",
    keyboardPrompt: "Keyboard check: type the word below.",
    keyboardWord: "rhythm",
    screenOk: "Screen size OK.",
    drmOk: "This browser can play protected audio.",
    drmMissing: "This browser cannot play the study music (protected audio is not available). Please open the link in Google Chrome on a laptop or desktop computer.",
    screenBad: "Your window is too small. Use a laptop or desktop screen of at least 1280 x 720 and maximise the browser window."
  },

  music: {
    title: "Choose your music",
    body: "[PLACEHOLDER] Paste a link to a Spotify playlist you like to work to. The music repeats when the playlist ends.",
    linkLabel: "Spotify playlist link",
    load: "Load playlist",
    test: "Play test sound",
    stop: "Stop",
    volume: "Set a comfortable volume, then continue. It will stay fixed during the study.",
    connecting: "Connecting to Spotify...",
    unverified: "Spotify does not let us preview this playlist, so use the test sound below to check it plays.",
    missingKey: "This link is missing its access key. Please ask the researcher for a new link. (Researchers: sign in to the admin page in this browser, then reload.)",
    keyPlaceholder: "Study key (shown in debug runs only)",
    allBusy: "All Spotify accounts are in use by other sessions. Retrying automatically in 10 s...",
    badKey: "The access key in this link was not accepted. Please ask the researcher for a new link.",
    badOrigin: "This page address is not allowed to use the music service. Please open the official study link.",
    connectFailed: "Could not connect to Spotify. Please check your connection and try again.",
    playbackProblem: "The music could not be played in this browser. Please use Google Chrome on a laptop or desktop computer and make sure protected content is allowed, then reload this page.",
    syntheticNote: "Synthetic audio (test mode)."
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

  instructions: { title: "Instructions", body: "[PLACEHOLDER] Task instructions." },

  practice: {
    title: "Practice",
    body: "[PLACEHOLDER] Practice round (typing plus one practice interruption per mode).",
    note: "Three short interruptions, one per way of resuming the music ({modes})."
  },

  baseline: { title: "Baseline", body: "[PLACEHOLDER] Baseline typing, no interruptions.", durationNote: "Duration: {s} s." },

  blockIntro: { title: "Next block", body: "[PLACEHOLDER] Block intro." },
  modes: {
    AUTO: "[PLACEHOLDER] In this block the music resumes by itself after you reply.",
    DIGI: "[PLACEHOLDER] In this block, click the on-screen button to resume the music.",
    PHYS: "[PLACEHOLDER] In this block, press the [button] to resume the music."
  },

  // The email pop-up during typing
  email: {
    hintChoose: "Press 1, 2 or 3 to choose an answer.",
    hintReply: "Type a short reply (at least {n} words), then press Enter.",
    hintSend: "Press Enter to send.",
    hintTimeout: "Please reply to continue."
  },

  // Prompts that bring the music back
  resume: {
    digiButton: "Resume music",
    physPrompt: "Press the [button] to resume music",
    autoNote: "Music resumed"
  },

  typingDone: { title: "Finished", body: "[PLACEHOLDER] Time is up. Well done." },

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
    rankPlaceholder: "Rank...",
    commentLabel: "[PLACEHOLDER] Any comments?"
  },

  done: {
    title: "Done",
    body: "[PLACEHOLDER] Thank you for taking part.",
    uploading: "Uploading your results...",
    uploaded: "Results uploaded ({n} events). You can close this tab.",
    notFinished: "Upload not finished ({sent}/{total}). Please download the backup and send it to the researcher.",
    uploadOff: "Upload is off for this run (?nodb=1). Download the backup below.",
    retryUpload: "Retry upload",
    download: "Download backup (JSON)"
  }
};
