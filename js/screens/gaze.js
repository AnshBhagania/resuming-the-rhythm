// One-time eye-tracking calibration + validation, before practice. No further calibration happens during the experiment.
// Parameters come from the admin-editable settings (cfg.gaze). In ?gazetest=1 mode it shows the numbers and ends the session.
import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";
import { scoreValidation } from "../gazeScore.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function gridPoints(cols, rows) {
  const pts = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push([0.08 + 0.84 * c / (cols - 1), 0.1 + 0.8 * r / (rows - 1)]);
    pts.push(...(r % 2 ? row.reverse() : row));        // snake order
  }
  return pts;
}
const VALIDATION_POINTS = [[0.5, 0.5], [0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]];

// Small map of the validation: blue = where you were asked to look, orange = where the tracker thought you looked.
function drawDiagram(points) {
  const NS = "http://www.w3.org/2000/svg", W = 520, H = Math.round(520 * innerHeight / innerWidth), k = W / innerWidth;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "gz-map"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Targets and where the tracker thought you looked");
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); svg.append(e); return e; };
  mk("rect", { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 8, class: "gz-map-bg" });
  for (const p of points) {
    const tx = p.x * k, ty = p.y * k;
    if (p.pred_x != null) {
      mk("line", { x1: tx, y1: ty, x2: p.pred_x * k, y2: p.pred_y * k, class: "gz-map-line" });
      mk("circle", { cx: p.pred_x * k, cy: p.pred_y * k, r: 6, class: "gz-map-pred" });
    }
    mk("circle", { cx: tx, cy: ty, r: 6, class: "gz-map-target" });
    if (p.pred_x == null) { const t = mk("text", { x: tx + 10, y: ty + 4, class: "gz-map-text" }); t.textContent = "no data"; }
  }
  const wrap = document.createElement("div");
  wrap.className = "gz-map-wrap";
  wrap.append(svg);
  const legend = document.createElement("p");
  legend.className = "note";
  legend.innerHTML = '<span class="dot t"></span> where you were asked to look &nbsp; <span class="dot p"></span> where the tracker thought you looked';
  wrap.append(legend);
  return wrap;
}

export function render(root, api) {
  const s = api.session, g = api.cfg.gaze, c = api.content.gaze, gaze = s.gaze;
  const test = !!s.flags.gazetest;
  if (!gaze || s.gazeState !== "permitted") {
    if (test) mount(root, screen(c.title, el("p", {}, c.notAvailable), continueBtn(api.next, "Finish")));
    else { log("gaze_skipped", { state: s.gazeState }); api.next(); }
    return;
  }
  if (!test && (s.gazeState === "ready" || s.gazeState === "ready_low_accuracy")) { api.next(); return; }   // already calibrated: never calibrate twice
  let attempt = 0;

  function intro() {
    mount(root, screen(c.title, gaze.kind === "mouse" ? el("p", { class: "sim-banner" }, c.mouseBanner) : null, el("p", {}, c.body), el("p", { class: "note" }, c.posture), continueBtn(run, c.start)));
  }

  async function run() {
    attempt++;
    mount(root, screen(c.title, el("p", {}, c.loading)));
    try { await Promise.race([gaze.start(), sleep(60000).then(() => { throw new Error("camera start timeout"); })]); }
    catch (e) {
      log("gaze_state", { state: "failed", message: String(e.message || e), stack: String(e.stack || "").split("\n").slice(0, 3).join(" | ").slice(0, 400) });
      gaze.stop();                       // never leave the camera running after a failed start
      s.gazeState = "failed";
      mount(root, screen(c.title, el("p", {}, c.failed), continueBtn(api.next, test ? "Finish" : c.cont)));
      return;
    }
    if (attempt > 1) gaze.clear();
    const overlay = el("div", { class: "gz-overlay" });
    const hint = el("div", { class: "gz-hint" });
    const dot = el("div", { class: "gz-dot" });
    overlay.append(hint, dot);
    document.body.append(overlay);
    const place = (x, y) => { dot.style.left = x + "px"; dot.style.top = y + "px"; };

    const pts = gridPoints(g.gridCols, g.gridRows);
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0] * innerWidth, y = pts[i][1] * innerHeight;
      place(x, y);
      await new Promise((resolve) => {
        let n = 0;
        hint.textContent = c.calibrateHint.replace("{n}", g.clicksPerPoint);
        dot.style.opacity = "1";
        dot.onclick = () => { n++; dot.style.opacity = String(1 - 0.6 * n / g.clicksPerPoint); dot.style.transform = `translate(-50%,-50%) scale(${1 - 0.5 * n / g.clicksPerPoint})`; if (n >= g.clicksPerPoint) { dot.onclick = null; dot.style.transform = ""; resolve(); } };
      });
      log("calib_point", { attempt, idx: i, x: Math.round(x), y: Math.round(y), clicks: g.clicksPerPoint, window: { w: innerWidth, h: innerHeight } });
    }

    hint.textContent = c.validateHint;
    dot.style.opacity = "1"; dot.onclick = null; dot.classList.add("validate");
    const raw = [];
    for (const [fx, fy] of VALIDATION_POINTS) {
      const x = fx * innerWidth, y = fy * innerHeight;
      place(x, y);
      await sleep(g.validationSettleMs);
      const dists = [], preds = [];
      const off = gaze.onSample((p) => { if (p.x != null) { dists.push(Math.hypot(p.x - x, p.y - y)); preds.push({ x: p.x, y: p.y }); } });
      await sleep(g.validationDwellMs - g.validationSettleMs);
      off();
      raw.push({ x, y, dists, preds });
    }
    overlay.remove();
    const { points, mean, valid, ok, verdict } = scoreValidation(raw, g.maxErrorPx);
    log("calib_validation", { attempt, points, mean_err_px: mean, valid_points: valid, ok, verdict, max_error_px: g.maxErrorPx, window: { w: innerWidth, h: innerHeight } });
    result({ points, mean, ok, valid, verdict });
  }

  function result({ points, mean, ok, valid, verdict }) {
    const last = attempt >= g.maxAttempts;
    const finish = (acc) => {
      gaze.lockLearning();
      s.gazeState = ok ? "ready" : "ready_low_accuracy";
      s.gazeAccuracy = { mean_err_px: mean, ok };
      log("gaze_ready", { attempts: attempt, ok, mean_err_px: mean });
      api.next();
    };
    const kids = [el("p", {}, ok ? c.ok : (valid === 0 ? c.noFace : c.low))];
    if (test) {
      const word = { good: c.verdictGood, borderline: c.verdictBorderline, poor: c.verdictPoor, none: c.verdictNone }[verdict];
      kids.length = 0;
      kids.push(el("p", { class: "gz-verdict " + verdict }, word));
      kids.push(el("p", { class: "note" }, `Mean error ${mean ?? "n/a"} px (accepted up to ${g.maxErrorPx}) \u00b7 ${valid}/5 points valid \u00b7 attempt ${attempt}/${g.maxAttempts} \u00b7 window ${innerWidth}x${innerHeight}`));
      kids.push(drawDiagram(points));
      kids.push(el("table", { class: "gz-table" }, el("tr", {}, el("th", {}, "target (x, y)"), el("th", {}, "samples"), el("th", {}, "error"), el("th", {}, "off by (x, y)")),
        ...points.map((p) => el("tr", {}, el("td", {}, `${p.x}, ${p.y}`), el("td", {}, p.n),
          el("td", {}, p.err_px == null ? "no data" : p.err_px + " px"),
          el("td", {}, p.pred_x == null ? "" : `${p.pred_x - p.x > 0 ? "+" : ""}${p.pred_x - p.x}, ${p.pred_y - p.y > 0 ? "+" : ""}${p.pred_y - p.y}`)))));
      kids.push(el("p", { class: "note" }, c.howToRead));
    }
    mount(root, screen(c.title, ...kids,
      (!ok && !last) || test ? continueBtn(run, c.retry) : null, " ",
      (ok || last || test) ? continueBtn(() => finish(), test ? "Finish" : c.cont) : null));
  }

  intro();
}
