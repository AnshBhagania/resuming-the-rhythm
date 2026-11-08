// Short two-tone notification for the email pop-up (WebAudio, no asset needed).
let ctx = null;
let muted = false;
export function setSoundMuted(m) { muted = m; }

export function playNotification() {
  if (muted) return;   // test runs: events still fire, nothing is audible
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = t0 + i * 0.14;
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.22);
    });
  } catch (e) { /* audio may be unavailable; the visual pop-up still appears */ }
}
