import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";
import { probeLatency, logKeyboardLayout, logAudioDevice } from "../probe.js";

export function render(root, api) {
  const c = api.content.precheck;
  const min = api.cfg.minScreen;
  const state = { headphones: false, keyboard: false };
  probeLatency(api.cfg); logKeyboardLayout(); logAudioDevice();   // non-blocking, logged for analysis

  const sizeOk = () => api.session.flags.debug || (innerWidth >= min.w && innerHeight >= min.h);
  const btn = continueBtn(() => {
    log("answer", {
      id: "precheck",
      headphones: state.headphones,
      keyboard_ok: state.keyboard,
      window: { w: innerWidth, h: innerHeight },
      size_ok: innerWidth >= min.w && innerHeight >= min.h
    });
    window.removeEventListener("resize", update);
    api.next();
  }, "Continue", true);

  const sizeLine = el("p", { class: "status" });
  const hp = el("input", { type: "checkbox", onchange: () => { state.headphones = hp.checked; update(); } });
  const kbInput = el("input", { type: "text", class: "kb", autocomplete: "off", spellcheck: "false", oninput: () => { state.keyboard = kbInput.value.trim().toLowerCase() === c.keyboardWord; update(); } });

  function update() {
    const ok = sizeOk();
    sizeLine.textContent = ok ? c.screenOk : c.screenBad;
    sizeLine.className = "status " + (ok ? "ok" : "bad");
    btn.disabled = !(ok && state.headphones && state.keyboard);
  }
  window.addEventListener("resize", update);

  mount(root, screen(c.title,
    el("p", {}, c.body),
    el("label", { class: "check" }, hp, el("span", {}, c.headphones)),
    el("p", {}, c.keyboardPrompt + " ", el("strong", { class: "word" }, c.keyboardWord)),
    kbInput,
    sizeLine,
    btn));
  update();
  kbInput.focus();
}
