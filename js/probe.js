// Remote sessions add noise (networks, keyboards, audio stacks). These probes log it so analysis can account for it.
import { log } from "./log.js";

// Round-trip time to the backend: 3 tiny requests. Useful as a proxy for Spotify resume latency.
export async function probeLatency(cfg) {
  const rtts = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/ingest_events`, {
        method: "POST", headers: { apikey: cfg.supabaseKey, "Content-Type": "application/json" }, body: '{"p_rows":[]}'
      });
      rtts.push(Math.round(performance.now() - t0));
    } catch (e) { rtts.push(null); }
  }
  const ok = rtts.filter(x => x != null).sort((a, b) => a - b);
  log("latency_probe", { rtt_ms: rtts, median_ms: ok.length ? ok[Math.floor(ok.length / 2)] : null });
}

// Physical layout of a few keys (QWERTY vs AZERTY vs QWERTZ). Chromium only.
export async function logKeyboardLayout() {
  try {
    const m = await navigator.keyboard.getLayoutMap();
    const keyboard = { KeyQ: m.get("KeyQ"), KeyW: m.get("KeyW"), KeyY: m.get("KeyY"), KeyZ: m.get("KeyZ"), KeyA: m.get("KeyA") };
    log("device_info", { keyboard, layout_class: layoutClass(keyboard) });
  } catch (e) { log("device_info", { keyboard: null, layout_class: "unknown" }); }
}

// QWERTY / QWERTZ / AZERTY / other, from the physical-position probe above ("unknown" when the browser cannot tell).
export function layoutClass(k) {
  if (!k || !k.KeyQ) return "unknown";
  if (k.KeyQ === "a" && k.KeyA === "q") return "AZERTY";
  if (k.KeyQ === "q" && k.KeyW === "w" && k.KeyY === "z" && k.KeyZ === "y") return "QWERTZ";
  if (k.KeyQ === "q" && k.KeyW === "w" && k.KeyY === "y" && k.KeyZ === "z") return "QWERTY";
  return "other";
}

// Audio stack latency as reported by the browser (does not play anything).
export function logAudioDevice() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    log("device_info", { audio: { base_latency_s: ac.baseLatency ?? null, output_latency_s: ac.outputLatency ?? null, sample_rate: ac.sampleRate } });
    ac.close();
  } catch (e) { log("device_info", { audio: null }); }
}
