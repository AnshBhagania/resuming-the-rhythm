import { el, screen, mount, continueBtn } from "../ui.js";
import { runTypingScreen } from "./typingScreen.js";

// Stage 4 adds one practice interruption per mode (flagged practice=true).
export function render(root, api) {
  const c = api.content.practice;
  mount(root, screen(c.title, el("p", {}, c.body),
    el("p", { class: "note" }, `Duration: ${api.cfg.practiceSeconds} s.`),
    continueBtn(() => runTypingScreen(root, api, { label: "practice", seed: api.session.seeds.practice, seconds: api.cfg.practiceSeconds }), "Start")));
}
