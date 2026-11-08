// Seeded passage generation: same seed -> same passage. Mean word length is steered into a target band.
import { makeRng } from "./rng.js";

let poolPromise = null;
export function loadWords() {
  poolPromise ??= fetch("data/words.json").then(r => {
    if (!r.ok) throw new Error("words.json " + r.status);
    return r.json();
  }).then(d => d.words);
  return poolPromise;
}

export function generatePassage(pool, seed, { n = 400, meanLo = 4.7, meanHi = 4.9 } = {}) {
  const rng = makeRng(seed);
  const words = [];
  for (let i = 0; i < n; i++) {
    let w;
    do { w = rng.pick(pool); } while (i > 0 && w === words[i - 1]);
    words.push(w);
  }
  const mean = () => words.reduce((s, w) => s + w.length, 0) / n;
  // Steer the mean: swap random words for shorter/longer ones until inside the band.
  for (let iter = 0; iter < 5000; iter++) {
    const m = mean();
    if (m >= meanLo && m <= meanHi) break;
    const i = rng.int(0, n - 1);
    const wantLonger = m < meanLo;
    const cur = words[i].length;
    const w = rng.pick(pool);
    const rightDirection = wantLonger ? w.length > cur : w.length < cur;
    if (rightDirection && w !== words[i - 1] && w !== words[i + 1]) words[i] = w;
  }
  return { words, seed, meanLen: Number(mean().toFixed(3)), id: `p${seed}` };
}
