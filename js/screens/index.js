import { render as welcome } from "./welcome.js";
import { render as consent } from "./consent.js";
import { render as camera } from "./camera.js";
import { render as precheck } from "./precheck.js";
import { render as music } from "./music.js";
import { render as inputTest } from "./inputTest.js";
import { render as gaze } from "./gaze.js";
import { render as demographics } from "./demographics.js";
import { render as instructions } from "./instructions.js";
import { render as practice } from "./practice.js";
import { render as baseline } from "./baseline.js";
import { render as blockIntro } from "./blockIntro.js";
import { render as typing } from "./typing.js";
import { render as questions } from "./questions.js";
import { render as debrief } from "./debrief.js";
import { render as done } from "./done.js";

export const screens = { welcome, consent, camera, precheck, music, gaze, inputTest, demographics, instructions, practice, baseline, blockIntro, typing, questions, debrief, done };
