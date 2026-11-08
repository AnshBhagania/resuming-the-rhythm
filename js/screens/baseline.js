import { el, screen, mount, continueBtn } from "../ui.js";
import { runTypingScreen } from "./typingScreen.js";

export function render(root, api) {
  const c = api.content.baseline;
  mount(root, screen(c.title, el("p", {}, c.body),
    el("p", { class: "note" }, c.durationNote.replace("{s}", api.cfg.baselineSeconds)),
    continueBtn(() => runTypingScreen(root, api, { label: "baseline", seed: api.session.seeds.baseline, seconds: api.cfg.baselineSeconds }), api.content.ui.start)));
}
