// Camera permission for eye tracking. Eye tracking is optional unless the admin settings say otherwise.
// Only the permission is requested here (tracks are stopped immediately); the camera starts again at calibration.
import { el, screen, mount } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.camera, g = api.cfg.gaze, s = api.session;
  if (!g.enabled || !s.gaze) { s.gazeState = "disabled"; log("gaze_state", { state: "disabled" }); api.next(); return; }

  if (s.gazeState && !s.flags.gazetest) { api.next(); return; }   // permission already settled earlier in this session
  const msg = el("p", { class: "note" });
  const done = (state, extra = {}) => { s.gazeState = state; log("gaze_state", { state, ...extra }); api.next(); };

  const allow = el("button", { class: "primary", onclick: async () => {
    allow.disabled = true; msg.textContent = c.asking;
    if (s.gaze.kind === "mouse") { done("permitted", { source: "mouse" }); return; }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: true });
      st.getTracks().forEach(t => t.stop());
      done("permitted");
    } catch (e) {
      log("gaze_state", { state: "denied", name: e.name, message: e.message });
      msg.textContent = g.optional ? c.deniedOptional : c.deniedRequired;
      allow.disabled = false;
    }
  } }, c.allow);
  const skip = el("button", { class: "primary", hidden: !g.optional, onclick: () => done("declined") }, c.skip);
  mount(root, screen(c.title, el("p", {}, c.body), msg, allow, " ", skip));
}
