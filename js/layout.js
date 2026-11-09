// One scale factor for everything that has a fixed design size (typing box, resume prompt, the 250 px gap, the email card).
// Laptop windows differ (and a full-screen browser still loses height to toolbars), so there is no minimum window size:
// the layout shrinks to fit and never grows beyond its design size. The factor is logged with each trial.
import { log } from "./log.js";

// Design stage. Width: typing box 900 + 24 margin each side. Height: the scaled part is box 260 + gap 250 + prompt 56 = 566;
// the unscaled part is the top margin 40 + a 16 px safety space at the bottom (+ 56 for the debug bar).
const DESIGN_W = 948, SCALED_H = 566, FIXED_H = 40 + 16 + 4, DEBUG_BAR = 56, MIN_SCALE = 0.5;
let debug = false, scale = 1, lastLogged = null, timer = null;

export function computeScale() {
  const availableH = innerHeight - FIXED_H - (debug ? DEBUG_BAR : 0);
  return Math.max(MIN_SCALE, Math.min(1, innerWidth / DESIGN_W, availableH / SCALED_H));
}
export const getScale = () => scale;

function apply() {
  scale = Number(computeScale().toFixed(3));
  document.documentElement.style.setProperty("--s", String(scale));
  clearTimeout(timer);
  timer = setTimeout(() => {          // log changes once the window stops moving
    if (scale !== lastLogged) { lastLogged = scale; log("ui_scale", { scale, window: { w: innerWidth, h: innerHeight } }); }
  }, 400);
}

export function initLayout({ debug: d = false } = {}) {
  debug = d;
  apply();
  window.addEventListener("resize", apply);
}
