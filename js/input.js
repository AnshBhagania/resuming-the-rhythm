// Physical resume input, behind one adapter. The real device is still undecided, so three kinds are supported
// and chosen in the admin settings (physical.type):
//   key     - anything that types a key (USB button, foot pedal, a spare keyboard key). Default F9 is a placeholder.
//   gamepad - anything the browser reports as a gamepad (USB buttons and pedals often do)
//   media   - headphone / earphone remote and laptop media keys, via the Media Session API (needs a playing media session,
//             so a silent audio loop is played while waiting; EXPERIMENTAL, test per device and browser)
import { log } from "./log.js";

export const MEDIA_ACTIONS = ["play", "pause", "nexttrack", "previoustrack", "stop"];

function silentWavUrl() {
  const rate = 8000, n = rate;                       // 1 s of silence
  const buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
  new Uint8Array(buf, 44).fill(128);                 // 8-bit silence
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function startGamepadWatcher(onPress) {
  let stopped = false;
  const prev = new Map();
  const poll = () => {
    if (stopped) return;
    for (const gp of (navigator.getGamepads?.() || [])) {
      if (!gp) continue;
      gp.buttons.forEach((b, i) => {
        const id = gp.index + ":" + i;
        if (b.pressed && !prev.get(id)) onPress({ pad: gp.id, index: gp.index, button: i, t: performance.now() });
        prev.set(id, b.pressed);
      });
    }
    setTimeout(poll, 5);
  };
  poll();
  return () => { stopped = true; };
}

function startMediaWatcher(actions, onAction) {
  const audio = new Audio(silentWavUrl());
  audio.loop = true;
  audio.play().catch((e) => log("audio_error", { kind: "media_silent_play_failed", message: String(e.message || e) }));
  const ms = navigator.mediaSession;
  if (ms) {
    try { ms.metadata = new MediaMetadata({ title: "Typing study" }); } catch (e) { /* ignore */ }
    for (const a of actions) { try { ms.setActionHandler(a, () => onAction({ action: a, t: performance.now() })); } catch (e) { /* action unsupported */ } }
  }
  return () => {
    audio.pause();
    if (ms) for (const a of actions) { try { ms.setActionHandler(a, null); } catch (e) { /* ignore */ } }
  };
}

export function createPhysicalSource(p) {
  return {
    type: p.type,
    // Keyboard-style devices are matched on the normal keydown stream (so they can be told apart from wrong keys).
    // With a key `code` set (e.g. "NumpadEnter") the PHYSICAL key position is matched, so the laptop's own Enter or 5 never counts.
    keyMatches(e) {
      if (p.type !== "key" || e.type !== "keydown" || e.repeat) return null;
      const hit = p.code ? e.code === p.code : e.key === p.key;
      return hit ? { source: "key", key: e.key, code: e.code } : null;
    },
    // Non-keyboard devices: calls onIntent({source, ...detail, t}) for each valid press. Returns a stop function.
    start(onIntent) {
      if (p.type === "gamepad") {
        return startGamepadWatcher((d) => { if (p.gamepadButton < 0 || p.gamepadButton === d.button) onIntent({ source: "gamepad", button: d.button, pad: d.pad, t: d.t }); });
      }
      if (p.type === "media") {
        const actions = p.mediaAction === "any" ? MEDIA_ACTIONS : [p.mediaAction];
        return startMediaWatcher(actions, (d) => onIntent({ source: "media", action: d.action, t: d.t }));
      }
      return () => {};
    }
  };
}

// Everything the browser can see from input devices, for the device test page (to find out what a device emits).
export function monitorRaw(onRaw) {
  const onKey = (e) => { if (!e.repeat) onRaw({ kind: "keydown", key: e.key, code: e.code, t: e.timeStamp }); };
  document.addEventListener("keydown", onKey, true);
  const stopPad = startGamepadWatcher((d) => onRaw({ kind: "gamepad", button: d.button, pad: d.pad, t: d.t }));
  const stopMedia = startMediaWatcher(MEDIA_ACTIONS.concat(["seekbackward", "seekforward"]), (d) => onRaw({ kind: "media", action: d.action, t: d.t }));
  return () => { document.removeEventListener("keydown", onKey, true); stopPad(); stopMedia(); };
}
