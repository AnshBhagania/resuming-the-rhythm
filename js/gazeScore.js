// Validation scoring, kept separate so it can be tested without a camera.
// raw: [{x, y, dists: [px distance of each gaze sample from the target]}]
export const MIN_SAMPLES_PER_POINT = 5;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

export function scoreValidation(raw, maxErrorPx) {
  const points = raw.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), n: p.dists.length, err_px: p.dists.length >= MIN_SAMPLES_PER_POINT ? Math.round(median(p.dists)) : null }));
  const valid = points.filter(p => p.err_px != null);
  const mean = valid.length ? Math.round(valid.reduce((a, p) => a + p.err_px, 0) / valid.length) : null;
  return { points, mean, valid: valid.length, ok: valid.length >= 3 && mean <= maxErrorPx };
}
