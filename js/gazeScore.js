// Validation scoring, kept separate so it can be tested without a camera.
// raw: [{x, y, dists: [px distance of each gaze sample from the target], preds: [{x, y} predicted gaze of each sample]}]
export const MIN_SAMPLES_PER_POINT = 5;
export const GOOD_ERROR_PX = 150;   // below this the text box can be told apart from the resume prompt (about 250 px below it)
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

export function scoreValidation(raw, maxErrorPx) {
  const points = raw.map(p => {
    const enough = p.dists.length >= MIN_SAMPLES_PER_POINT;
    const preds = p.preds || [];
    return {
      x: Math.round(p.x), y: Math.round(p.y), n: p.dists.length,
      err_px: enough ? Math.round(median(p.dists)) : null,
      pred_x: enough && preds.length ? Math.round(median(preds.map(q => q.x))) : null,   // where the tracker thought you looked (median)
      pred_y: enough && preds.length ? Math.round(median(preds.map(q => q.y))) : null
    };
  });
  const valid = points.filter(p => p.err_px != null);
  const mean = valid.length ? Math.round(valid.reduce((a, p) => a + p.err_px, 0) / valid.length) : null;
  const verdict = mean == null ? "none" : mean <= GOOD_ERROR_PX ? "good" : mean <= maxErrorPx ? "borderline" : "poor";
  return { points, mean, valid: valid.length, ok: valid.length >= 3 && mean <= maxErrorPx, verdict };
}
