// Camera permission and check for eye tracking. Eye tracking is optional unless the admin settings say otherwise.
// The participant allows the camera, sees a mirrored preview (shown on screen only, never recorded or sent anywhere) to confirm it works and
// that their face is visible, and only then continues. The preview is released when the screen is left; calibration starts the camera again.
import { el, screen, mount } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.camera, g = api.cfg.gaze, s = api.session;
  if (!g.enabled || !s.gaze) { s.gazeState = "disabled"; log("gaze_state", { state: "disabled" }); api.next(); return; }
  // Already settled earlier and arriving going forward: do not ask again. Arriving with Back: show the check again.
  if (s.gazeState && api.direction !== "back" && !s.flags.gazetest) { api.next(); return; }

  let stream = null;
  const stopStream = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; };
  api.onLeave(stopStream);

  const msg = el("p", { class: "note" });
  const video = el("video", { class: "cam-preview", autoplay: true, playsinline: true, muted: true });
  video.muted = true;
  const previewBox = el("div", { class: "cam-box", hidden: true }, video, el("p", { class: "note" }, c.previewHint));
  const finish = (state, extra = {}) => { stopStream(); s.gazeState = state; log("gaze_state", { state, ...extra }); api.next(); };

  const allow = el("button", { class: "primary", onclick: async () => {
    allow.disabled = true; msg.textContent = c.asking;
    if (s.gaze.kind === "mouse") { finish("permitted", { source: "mouse" }); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      video.srcObject = stream;
      await video.play().catch(() => {});
      log("gaze_state", { state: "camera_preview_on", label: stream.getVideoTracks()[0]?.label?.slice(0, 60) });
      msg.textContent = c.previewOn;
      previewBox.hidden = false; allow.hidden = true; ok.hidden = false;
    } catch (e) {
      log("gaze_state", { state: "denied", name: e.name, message: e.message });
      msg.textContent = g.optional ? c.deniedOptional : c.deniedRequired;
      allow.disabled = false;
    }
  } }, c.allow);
  const ok = el("button", { class: "primary", hidden: true, onclick: () => finish("permitted", { preview_confirmed: true }) }, c.previewOk);
  const skip = el("button", { class: "primary", hidden: !g.optional, onclick: () => finish("declined") }, c.skip);
  mount(root, screen(c.title,
    s.gaze.kind === "mouse" ? el("p", { class: "sim-banner" }, api.content.gaze.mouseBanner) : null,
    el("p", {}, c.body), msg, previewBox, allow, ok, " ", skip));
}
