import { APP_VERSION } from "./config.js";
import { CONTENT } from "./content.js";

// Stage 0: static walk through empty screens. The real state machine arrives in stage 1 (js/session.js).
const SCREENS = [
  "welcome", "consent", "camera", "precheck", "instructions", "practice",
  "baseline", "blockIntro", "typing", "questions", "debrief", "done"
];

const params = new URLSearchParams(location.search);
const pid = params.get("pid") || "P00";
const debug = params.get("debug") === "1";

const app = document.getElementById("app");
const debugBar = document.getElementById("debug-bar");
let i = 0;

function render() {
  const name = SCREENS[i];
  const c = CONTENT[name];
  app.innerHTML = "";
  const el = document.createElement("section");
  el.className = "screen";
  el.innerHTML = `<h1></h1><p></p>`;
  el.querySelector("h1").textContent = c.title;
  el.querySelector("p").textContent = c.body;
  if (i < SCREENS.length - 1) {
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Continue";
    btn.onclick = () => { i++; render(); };
    el.appendChild(btn);
  }
  app.appendChild(el);
  if (debug) {
    debugBar.hidden = false;
    debugBar.textContent = `v${APP_VERSION} | pid=${pid} | screen=${name}`;
  }
}

render();
