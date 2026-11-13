// All participant-facing text lives here, in the order participants see it. A blank line (\n\n) inside a body starts a new paragraph.
// Strings with {n}, {s}, {sent}, {total}, {modes} or [button] are filled in by the app.
export const CONTENT = {
  // Shared by several screens
  ui: {
    continue: "Continue",
    back: "Back",
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

  welcome: {
    title: "Welcome",
    body: "Thank you for taking part. In this study you type lists of words while your own music plays in the background. Every now and then an email pops up and the music pauses. You answer the email, and then the music comes back. In each part of the study it comes back in a different way, and we want to learn how that affects getting back into your typing.\n\nThe session takes about 35 minutes. Please sit somewhere quiet and use a laptop or desktop computer with headphones, in Google Chrome."
  },

  consent: {
    title: "Consent",
    body: "Please read this before you decide to take part.\n\nWhat the study is about: how the way background music is brought back after an interruption affects how quickly and accurately people return to typing.\n\nWhat you will do: about 35 minutes of typing with your own music from Spotify playing. Emails will pop up and you answer them with the keyboard. The music comes back in a different way in each of three parts. You also answer a few short questions.\n\nWhat we record: your key presses and their timing, your answers to the emails and questions, the Spotify playlist you choose, and basic information about your browser, computer and screen. If you allow your camera, we also estimate where on the screen you look and save only those screen coordinates. No video, photos or sound from your camera or microphone are recorded or stored. We do not ask for your name. Your data is stored under a participant code on a secure cloud server.\n\nYour rights: taking part is voluntary. You can stop at any time by closing this tab, and you can ask the researcher to delete your data afterwards. The data is only used for this course project, and results are reported for the group, not for individuals.",
    checkbox: "I have read the information above and I agree to take part.",
    version: "v1-2026-11"
  },

  camera: {
    title: "Camera",
    body: "We would like to use your webcam to estimate where on the screen you are looking. The camera image is processed on your own computer. No video or images are recorded, stored or sent anywhere. Only estimated screen coordinates are saved.",
    allow: "Allow camera",
    skip: "Continue without eye tracking",
    asking: "Please allow camera access in your browser...",
    previewOn: "The camera is on. Check that you can see yourself.",
    previewHint: "This is only a check that your camera works. Nothing is recorded or stored. Sit about an arm's length from the screen, face it, and make sure your face is lit and fully visible.",
    previewOk: "I can see myself, continue",
    retry: "Try the camera again",
    errors: {
      NotAllowedError: "The browser blocked the camera. Click the camera icon in the address bar, choose Allow, then try again. On Mac also check System Settings > Privacy & Security > Camera.",
      NotReadableError: "The camera is in use by another tab or app. Close other tabs or apps that use the camera (video calls, other study tabs), then try again.",
      NotFoundError: "No camera was found. Check that it is connected and not switched off.",
      NotSupportedError: "This page cannot use the camera. Please open the link in Chrome and make sure the address starts with https.",
      other: "The camera could not be started."
    },
    deniedOptional: "Camera access was not given. You can try again or continue without eye tracking.",
    deniedRequired: "Camera access is needed for this study. Please allow it in your browser settings and try again."
  },

  precheck: {
    title: "Before we start",
    body: "A few quick checks before we start. Please wear headphones, close other apps and browser tabs (especially anything that uses the camera or plays sound), and turn off notifications on your computer so that only the study interrupts you.",
    headphones: "I am wearing headphones.",
    deviceTitle: "About your setup",
    touchTyping: { label: "Can you type without looking at the keys?", options: [["yes", "Yes"], ["mostly", "Mostly"], ["no", "No"]] },
    typingKeyboard: { label: "Which keyboard will you type on?", options: [["laptop", "The laptop's built-in keyboard"], ["external", "An external keyboard"]] },
    pointer: { label: "What do you use to move the pointer and click?", options: [["trackpad", "Trackpad"], ["mouse", "Mouse"]] },
    keyboardPrompt: "Keyboard check: type the word below.",
    keyboardWord: "rhythm",
    screenOk: "Screen size OK.",
    drmOk: "This browser can play protected audio.",
    drmMissing: "This browser cannot play the study music (protected audio is not available). Please open the link in Google Chrome on a laptop or desktop computer.",
    screenSmall: "Your window is quite small, so the study will shrink to fit. A larger or full-screen window works best."
  },

  music: {
    title: "Choose your music",
    body: "Choose music you like to work to. In Spotify, open a playlist or an album, choose Share, then Copy link, and paste the link below. The music repeats when it ends.",
    linkLabel: "Spotify playlist or album link",
    load: "Load music",
    test: "Play test sound",
    stop: "Stop",
    volume: "Play the test sound and set a comfortable volume with your computer's volume keys. Leave the slider below at the far right (full), and only move it left if you need to go even quieter. The volume will stay fixed during the study.",
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
      { id: "age", label: "Age", type: "number" },
      { id: "gender", label: "Gender", type: "choice", options: ["Woman", "Man", "Non-binary", "Prefer not to say"] },
      { id: "typing_freq", label: "How often do you type on a computer?", type: "choice", options: ["Daily", "Weekly", "Rarely"] },
      { id: "music_while_working", label: "Do you usually listen to music while working?", type: "yesno" },
      { id: "attention_condition", label: "Do you have a condition that affects your attention? You can choose not to say.", type: "choice", options: ["No", "Yes", "Prefer not to say"] }
    ]
  },

  gaze: {
    title: "Eye tracking setup",
    body: "This takes about 40 seconds and is done only once. You will click a series of dots while looking at each one, then look at a few dots without clicking.",
    posture: "Sit about an arm's length from the screen, face the camera in even light, and keep your head as still as you can for the rest of the study.",
    start: "Start",
    loading: "Starting the camera and loading the eye tracking model (about 10 MB, this can take a minute)...",
    calibrateHint: "Look at the dot and click it {n} times",
    validateHint: "Now just look at the dot, without clicking",
    ok: "Eye tracking is ready.",
    low: "The accuracy was lower than we would like. Sit still, face the screen in even light, and try again.",
    noFace: "We could not see your face clearly. Check the lighting and that the camera is not covered, then try again.",
    retry: "Calibrate again",
    cont: "Continue",
    failed: "The camera could not be started. You can continue without eye tracking.",
    notAvailable: "Eye tracking is not available in this run (camera not permitted, or disabled).",
    mouseBanner: "TEST MODE: your mouse pointer simulates eye tracking. No camera is used.",
    verdictGood: "Good: accurate enough to tell the text box from the resume prompt.",
    verdictBorderline: "Borderline: usable for the text box versus the prompt, but not for finer detail. Try better light and a steadier head.",
    verdictPoor: "Too inaccurate for reliable use. Check light, distance and that your whole face is visible, then calibrate again.",
    verdictNone: "No face was seen, so nothing could be measured. Check that the camera is uncovered and your face is lit.",
    howToRead: "How to read this: each blue dot is a spot you were asked to look at, each orange dot is where the tracker thought you looked (the median of its samples), and the line between them is the error. Samples is how many gaze readings were captured at that spot (about 30 a second); \"no data\" means no face was seen there.",
  },

  instructions: {
    title: "Instructions",
    body: "You will type lists of common English words. Type each word and press Space to move on to the next one. If you make a mistake you can correct it with Backspace; Backspace at the start of a word takes you back into the previous word. Type as quickly and accurately as you comfortably can, as you would in normal work.\n\nYour own music plays while you type. Every minute or so an email pops up, the music pauses and your typing is locked. Read the email, press 1, 2 or 3 on your keyboard to choose an answer, type a short reply of at least 3 words, and press Enter. Then you bring the music back. How you do that is explained before each part, and each part starts with one practice email.\n\nFirst there is a short practice round and a typing test without interruptions. After that come three parts with interruptions, about six minutes each, and after each part three short questions. Please stay in this browser tab for the whole session."
  },

  practice: {
    title: "Practice",
    body: "This is a short practice round with your music playing. Just type the words you see. Nothing will interrupt you yet.",
    durationNote: "Duration: {s} s."
  },

  baseline: { title: "Baseline", body: "This is a typing test with your music playing and no interruptions. Type as quickly and accurately as you comfortably can.", durationNote: "Duration: {s} s." },

  blockIntro: {
    title: "Next block",
    body: "Next is a typing part with email interruptions. Keep typing as you did before, and answer each email with the keyboard as described in the instructions.",
    rehearsalNote: "Shortly after you start there is one practice email, so you can try how the music comes back in this part. The practice email does not count. The real part follows right after it."
  },
  modes: {
    AUTO: "In this part, the music comes back by itself after you send your reply. Then keep typing.",
    DIGI: "In this part, after you send your reply, click the on-screen button with the mouse or trackpad to bring the music back. Then keep typing.",
    PHYS: "In this part, after you send your reply, press the [button] to bring the music back. Then keep typing."
  },

  // The email pop-up during typing
  email: {
    stepChoose: "Choose an answer: press 1, 2 or 3 on your keyboard.",
    hintClick: "Clicking does not select. Please press the number key 1, 2 or 3 on your keyboard.",
    hintClickLater: "Your answer is already chosen. Type your reply and press Enter.",
    stepReply: "Type a short reply (at least {n} words). To change your answer, press 1, 2 or 3 again.",
    stepSend: "Press Enter to send.",
    hintTooShort: "Please write at least {n} words before sending.",
    hintTimeout: "Please reply to continue."
  },

  // Prompts that bring the music back
  resume: {
    digiButton: "Resume music",
    physPrompt: "Press the [button] to resume music",
    autoNote: "Music resumed"
  },

  typingDone: { title: "Finished", body: "Time is up. Well done." },

  questionnaire: {
    title: "Questions about this block",
    scale: { min: 1, max: 7, minLabel: "Not at all", maxLabel: "Very much" },
    items: [
      { id: "workload", label: "How mentally demanding was the task?" },
      { id: "control", label: "How much control did you feel over the music?" },
      { id: "ease", label: "How easy was it to get back to typing after the interruptions?" }
    ]
  },

  debrief: {
    title: "Final questions",
    body: "Please rank the three ways of bringing the music back, from 1 (best) to 3 (worst). Use each number once.",
    rankLabels: { AUTO: "Music resumed automatically", DIGI: "On-screen button", PHYS: "Physical button" },
    rankPlaceholder: "Rank...",
    commentLabel: "Any comments? (optional)"
  },

  done: {
    title: "Done",
    body: "Thank you for taking part. Please keep this tab open until your results have been uploaded.",
    uploading: "Uploading your results...",
    uploaded: "Results uploaded ({n} events). You can close this tab.",
    notFinished: "Upload not finished ({sent}/{total}). Please download the backup and send it to the researcher.",
    uploadOff: "Upload is off for this run (?nodb=1). Download the backup below.",
    retryUpload: "Retry upload",
    download: "Download backup (JSON)"
  }
};
