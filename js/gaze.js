// Eye tracking behind one interface (GazeSource). Two sources:
//   webgazer - WebGazer.js (webcam, runs entirely in the browser; only coordinates are ever logged, never video)
//   mouse    - the mouse pointer stands in for gaze (?gaze=mouse), for testing the flow and the logging without a camera
// Recording logs batched `gaze` events ([t, x, y, aoi] per sample, aoi: T text box, P prompt/email card, O elsewhere or no face).
import { log } from "./log.js";
import { el } from "./ui.js";

const WEBGAZER_URL = "https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.js";
// WebGazer's default is "./mediapipe/face_mesh", a folder next to the page that does not exist on this site. Without this the face model
// silently fails to load and begin() rejects with "t is not a function" (seen in the first real test). ~10 MB, version matched to WebGazer 3.5.3.
const FACE_MESH_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";

const inside = (el, x, y) => { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
export function aoiOf(x, y) {
  if (x == null) return "O";
  for (const el of document.querySelectorAll(".email-card, .resume-prompt")) if (inside(el, x, y)) return "P";
  const box = document.querySelector(".typing-box");
  return box && inside(box, x, y) ? "T" : "O";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.webgazer) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("could not load WebGazer"));
    document.head.append(s);
  });
}

export function createGaze({ kind, cfg }) {
  const g = cfg.gaze;
  const ring = [];
  const listeners = new Set();
  let recording = false, batch = [], lastEmit = 0, lostSince = null, lostLogged = false;
  let started = false, cleanup = null;
  const minInterval = 1000 / g.sampleCapHz;
  const flushTimer = setInterval(flush, 1000);

  function flush() { if (batch.length) { log("gaze", { samples: batch }); batch = []; } }

  function handle(x, y, t) {
    ring.push({ t, x, y }); if (ring.length > 90) ring.shift();
    listeners.forEach(fn => fn({ t, x, y }));
    if (!recording || t - lastEmit < minInterval) return;
    lastEmit = t;
    batch.push([Number(t.toFixed(1)), x == null ? null : Math.round(x), y == null ? null : Math.round(y), aoiOf(x, y)]);
    if (x == null) {
      lostSince ??= t;
      if (!lostLogged && t - lostSince > 500) { lostLogged = true; log("gaze_lost", { since_t: Number(lostSince.toFixed(1)) }, t); }
    } else {
      if (lostLogged) log("gaze_back", { lost_ms: Math.round(t - lostSince) }, t);
      lostSince = null; lostLogged = false;
    }
  }

  async function startWebgazer() {
    await loadScript(WEBGAZER_URL);
    const wg = window.webgazer;
    wg.params.faceMeshSolutionPath = FACE_MESH_URL;
    wg.saveDataAcrossSessions?.(false);
    wg.setRegression("ridge");
    wg.applyKalmanFilter(true);
    wg.showVideoPreview(false); wg.showPredictionPoints(false); wg.showFaceOverlay(false); wg.showFaceFeedbackBox(false);
    wg.setGazeListener((data) => handle(data ? data.x : null, data ? data.y : null, performance.now()));
    try {
      await wg.begin();
    } catch (e) {
      // begin() can reject even though the tracker came up; trust the library's own readiness check, otherwise fail
      if (!(wg.isReady && wg.isReady())) { stopCamera(); throw e; }
      log("gaze_state", { state: "begin_rejected_but_ready", message: String(e.message || e) });
    }
    wg.showVideoPreview(false); wg.showPredictionPoints(false); wg.showFaceOverlay(false); wg.showFaceFeedbackBox(false);
    cleanup = stopCamera;
    showIndicator();
  }

  // webgazer.end() only removes page elements: it does NOT release the camera. stopVideo() does, and we also stop every track the page holds.
  function stopCamera() {
    const wg = window.webgazer;
    for (const call of ["pause", "stopVideo", "end"]) { try { wg?.[call]?.(); } catch (e) { /* internal state may be partial */ } }
    document.querySelectorAll("video").forEach((v) => { try { v.srcObject?.getTracks?.().forEach((t) => t.stop()); v.srcObject = null; } catch (e) { /* ignore */ } });
    ["webgazerVideoContainer", "webgazerGazeDot"].forEach((id) => document.getElementById(id)?.remove());
    hideIndicator();
    log("gaze_state", { state: "camera_stopped" });
  }
  let indicator = null;
  function showIndicator() { indicator ??= document.body.appendChild(el("div", { class: "gaze-status", "aria-live": "polite" }, "\u25CF Eye tracking on")); }
  function hideIndicator() { indicator?.remove(); indicator = null; }

  function startMouse() {
    let last = null;
    const mv = (e) => { last = { x: e.clientX, y: e.clientY }; };
    document.addEventListener("mousemove", mv, true);
    const iv = setInterval(() => handle(last ? last.x : null, last ? last.y : null, performance.now()), 33);
    cleanup = () => { document.removeEventListener("mousemove", mv, true); clearInterval(iv); };
  }

  return {
    kind,
    async start() {
      if (started) return;
      if (kind === "mouse") startMouse(); else await startWebgazer();
      started = true;
    },
    onSample(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    recent(n = 10) { return ring.slice(-n); },
    setRecording(on) { if (!on) flush(); recording = on; },
    // Forget what was learned (before a recalibration).
    clear() { if (kind === "webgazer") window.webgazer?.clearData?.(); },
    // After calibration: stop learning from the mouse so the model stays fixed during the experiment.
    lockLearning() { if (kind === "webgazer") window.webgazer?.removeMouseEventListeners?.(); },
    stop() { flush(); clearInterval(flushTimer); cleanup?.(); started = false; }
  };
}

// Mean of the last few valid samples (used to compare gaze with where the participant just clicked).
export function meanOfRecent(samples) {
  const v = samples.filter(s => s.x != null);
  if (!v.length) return null;
  return { x: v.reduce((a, s) => a + s.x, 0) / v.length, y: v.reduce((a, s) => a + s.y, 0) / v.length, n: v.length };
}
