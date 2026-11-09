import { APP_VERSION } from "./config.js";
import { CONTENT } from "./content.js";
import { createSession, createMachine, sessionStartData } from "./session.js";
import { log, setContext, downloadLog } from "./log.js";
import { el, screen, mount } from "./ui.js";
import { createAudio } from "./audio.js";
import { startDb } from "./db.js";
import { setSoundMuted } from "./sound.js";
import { loadSettings } from "./settings.js";
import { createGaze } from "./gaze.js";

const params = new URLSearchParams(location.search);
const root = document.getElementById("app");
const debugBar = document.getElementById("debug-bar");

function isMobile() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true; // iPadOS desktop UA
  return matchMedia("(pointer: coarse)").matches && !matchMedia("(hover: hover)").matches;
}

async function boot() {
  if (isMobile()) {
    mount(root, screen(CONTENT.blocked.title, el("p", {}, CONTENT.blocked.body)));
    return;
  }

  const rawPid = (params.get("pid") || "").trim();
  const pidMissing = !/^[A-Za-z0-9_-]{1,16}$/.test(rawPid);
  const pid = pidMissing ? "P00" : rawPid.toUpperCase();
  const seedParam = params.get("seed");
  const flags = {
    debug: params.get("debug") === "1",
    dryrun: params.get("dryrun") === "1",
    order: params.get("order") ? params.get("order").toUpperCase() : null,
    seed: seedParam && /^\d+$/.test(seedParam) ? Number(seedParam) >>> 0 : null,
    gazetest: params.get("gazetest") === "1",
    inputtest: params.get("inputtest") === "1",
    gazeParam: params.get("gaze"),  // "0" off, "mouse" test source
    step: params.get("debug") === "1" ? params.get("step") : null   // jump straight to a screen (debug runs only)
  };

  const session = createSession({ pid, pidMissing, flags });
  const remote = await loadSettings();                     // admin-editable settings (falls back to defaults after 2.5 s)
  session.cfg.gaze = { ...remote.gaze };
  session.cfg.physical = { ...remote.physical };
  if (flags.gazeParam === "0") session.cfg.gaze.enabled = false;
  if (flags.inputtest) session.cfg.gaze.enabled = false;
  if (flags.gazetest) { session.cfg.gaze.enabled = true; session.cfg.gaze.optional = false; }
  session.settingsInfo = { source: remote.source, updated_at: remote.updated_at, error: remote.error ?? null, gaze: session.cfg.gaze, physical: session.cfg.physical };
  session.gaze = session.cfg.gaze.enabled ? createGaze({ kind: flags.gazeParam === "mouse" ? "mouse" : "webgazer", cfg: session.cfg }) : null;
  // The study key comes from the link (&k=...). It is remembered for this tab, so reopening a link without it in the same tab still works.
  let storedKey = ""; try { storedKey = sessionStorage.getItem("studyKey") || ""; } catch (e) { /* storage blocked */ }
  session.studyKey = params.get("k") || storedKey;
  if (params.get("k")) { try { sessionStorage.setItem("studyKey", params.get("k")); } catch (e) { /* storage blocked */ } }
  const synthetic = params.get("audio") === "synthetic";
  const silent = synthetic && params.get("sound") !== "1";   // synthetic test audio is silent unless &sound=1
  setSoundMuted(silent);
  session.audio = createAudio({ silent, kind: synthetic ? "synthetic" : "spotify", cfg: session.cfg, pid, studyKey: session.studyKey, sessionId: session.id });
  flags.audio = session.audio.kind;
  setContext({ session_id: session.id, pid });
  const startData = sessionStartData(session);
  log("session_start", startData);
  if (params.get("nodb") !== "1") startDb(session, startData);

  // Page health
  document.addEventListener("visibilitychange", () => log("visibility_change", { hidden: document.hidden }));
  window.addEventListener("blur", () => log("blur"));
  window.addEventListener("focus", () => log("focus"));

  window.addEventListener("pagehide", () => session.gaze?.stop());
  window.addEventListener("resize", () => log("window_resize", { w: innerWidth, h: innerHeight }));
  const machine = createMachine({ root, session, onState: (step, i, n) => {
    updateDebug(session, step, i, n);
    // The camera is released as soon as the last typing screen is over (after block 3's typing), and always at the end.
    if ((step.screen === "questions" && step.block === session.cfg.blocks) || step.screen === "debrief" || step.screen === "done") session.gaze?.stop();
    const bar = document.querySelector("#progress div");
    if (bar) bar.style.width = Math.round(((i + 1) / n) * 100) + "%";
    // Gaze is recorded only while the typing task is on screen.
    session.gaze?.setRecording(["practice", "baseline", "typing"].includes(step.screen) && (session.gazeState === "ready" || session.gazeState === "ready_low_accuracy"));
  } });
  if (flags.debug) setupDebug(session, machine);
  let startAt = 0;                                     // debug runs: step=7, step=baseline, step=typing:2 (typing of block 2) jump straight to a screen
  if (flags.step) {
    const [name, blk] = String(flags.step).split(":");
    const byNumber = /^\d+$/.test(name) ? Number(name) - 1 : -1;
    const idx = byNumber >= 0 ? byNumber : machine.steps.findIndex((st) => st.screen === name && (!blk || st.block === Number(blk)));
    if (idx >= 0 && idx < machine.steps.length) startAt = idx;
  }
  if (machine.steps[startAt]?.screen === "gaze" && session.gaze) session.gazeState = "permitted";   // jumped past the camera screen: calibration should still run
  machine.go(startAt);
}

function setupDebug(session, machine) {
  debugBar.hidden = false;
  document.body.classList.add("has-debug");
  window.__rhythm = { session, machine, downloadLog };
}

function updateDebug(session, step, i, n) {
  if (!session.flags.debug) return;
  const f = session.flags;
  debugBar.replaceChildren(
    el("span", {}, `v${APP_VERSION} | ${session.pid} | ${session.order.code} (${session.conditions.join(">")}) | seed ${session.seed}` +
      `${f.dryrun ? " | DRYRUN" : ""}${session.pidMissing ? " | NO PID" : ""} | `),
    el("strong", {}, `${i + 1}/${n} ${step.screen}`),
    el("span", {}, ` | phase=${step.phase} block=${step.block} cond=${step.condition ?? "-"} `),
    el("button", { onclick: () => window.__rhythm.machine.go(i - 1) }, "‹ back"),
    el("button", { onclick: () => window.__rhythm.machine.go(i + 1) }, "skip ›"),
    el("button", { onclick: downloadLog }, "download log"));
}

boot();
