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
    mount(root, screen(c.title, el("p", {}, c.body), el("p", { class: "note" }, c.posture), continueBtn(run, c.start)));
  }

  async function run() {
    attempt++;
    mount(root, screen(c.title, el("p", {}, c.loading)));
    try { await Promise.race([gaze.start(), sleep(25000).then(() => { throw new Error("camera start timeout"); })]); }
    catch (e) {
      log("gaze_state", { state: "failed", message: String(e.message || e) });
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
      const dists = [];
      const off = gaze.onSample((p) => { if (p.x != null) dists.push(Math.hypot(p.x - x, p.y - y)); });
      await sleep(g.validationDwellMs - g.validationSettleMs);
      off();
      raw.push({ x, y, dists });
    }
    overlay.remove();
    const { points, mean, valid, ok } = scoreValidation(raw, g.maxErrorPx);
    log("calib_validation", { attempt, points, mean_err_px: mean, valid_points: valid, ok, max_error_px: g.maxErrorPx, window: { w: innerWidth, h: innerHeight } });
    result({ points, mean, ok, valid });
  }

  function result({ points, mean, ok, valid }) {
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
      kids.push(el("p", { class: "note" }, `Mean error ${mean ?? "n/a"} px (limit ${g.maxErrorPx}) · ${valid}/5 points valid · attempt ${attempt}/${g.maxAttempts} · window ${innerWidth}x${innerHeight}`));
      kids.push(el("table", { class: "gz-table" }, el("tr", {}, el("th", {}, "point"), el("th", {}, "samples"), el("th", {}, "error px")),
        ...points.map((p, i) => el("tr", {}, el("td", {}, `${i + 1} (${p.x}, ${p.y})`), el("td", {}, p.n), el("td", {}, p.err_px ?? "no data")))));
    }
    mount(root, screen(c.title, ...kids,
      (!ok && !last) || test ? continueBtn(run, c.retry) : null, " ",
      (ok || last || test) ? continueBtn(() => finish(), test ? "Finish" : c.cont) : null));
  }

  intro();
}
