import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";
import { probeLatency, logKeyboardLayout, logAudioDevice } from "../probe.js";
import { computeScale } from "../layout.js";

export function render(root, api) {
  const c = api.content.precheck;
  const state = { headphones: false, keyboard: false };
  // Spotify playback needs DRM (Widevine). Check it now so a browser that cannot play is caught before the music step.
  const needsDrm = api.session.audio.kind === "spotify";
  let drmOk = !needsDrm, drmChecked = !needsDrm;
  probeLatency(api.cfg); logKeyboardLayout(); logAudioDevice();   // non-blocking, logged for analysis

  const btn = continueBtn(() => {
    log("answer", {
      id: "precheck",
      headphones: state.headphones,
      keyboard_ok: state.keyboard,
      window: { w: innerWidth, h: innerHeight },
      ui_scale: Number(computeScale().toFixed(3))
    });
    window.removeEventListener("resize", update);
    api.next();
  }, api.content.ui.continue, true);

  const sizeLine = el("p", { class: "status" });
  const drmLine = el("p", { class: "status" });
  const hp = el("input", { type: "checkbox", onchange: () => { state.headphones = hp.checked; update(); } });
  const kbInput = el("input", { type: "text", class: "kb", autocomplete: "off", spellcheck: "false", oninput: () => { state.keyboard = kbInput.value.trim().toLowerCase() === c.keyboardWord; update(); } });

  function update() {
    // No minimum size: the layout scales to the window. Only a gentle note when it has to shrink a lot.
    const small = computeScale() < 0.8;
    sizeLine.textContent = small ? c.screenSmall : c.screenOk;
    sizeLine.className = "status " + (small ? "warn" : "ok");
    drmLine.textContent = !needsDrm || !drmChecked ? "" : drmOk ? c.drmOk : c.drmMissing;
    drmLine.className = "status " + (drmOk ? "ok" : "bad");
    const drmPass = drmOk || !drmChecked || api.session.flags.debug;   // debug runs may continue without DRM (they cannot play Spotify)
    btn.disabled = !(state.headphones && state.keyboard && drmPass);
  }
  window.addEventListener("resize", update);

  mount(root, screen(c.title,
    el("p", {}, c.body),
    el("label", { class: "check" }, hp, el("span", {}, c.headphones)),
    el("p", {}, c.keyboardPrompt + " ", el("strong", { class: "word" }, c.keyboardWord)),
    kbInput,
    sizeLine,
    drmLine,
    btn));
  update();
  kbInput.focus();
  if (needsDrm) {
    navigator.requestMediaKeySystemAccess?.("com.widevine.alpha", [{ initDataTypes: ["cenc"], audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }] }])
      .then(() => { drmOk = true; log("device_info", { drm: { widevine: true } }); })
      .catch((e) => { drmOk = false; log("device_info", { drm: { widevine: false, message: String(e?.message || e) } }); })
      .finally(() => { drmChecked = true; update(); });
    if (!navigator.requestMediaKeySystemAccess) { drmOk = false; drmChecked = true; update(); }
  }
}
