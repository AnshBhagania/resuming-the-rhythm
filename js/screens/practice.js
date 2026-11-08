import { el, screen, mount, continueBtn } from "../ui.js";
import { runTypingScreen } from "./typingScreen.js";

// Practice: plain typing with music to get used to the task. No interruptions (each block rehearses its own mode instead).
export function render(root, api) {
  const c = api.content.practice;
  mount(root, screen(c.title, el("p", {}, c.body),
    el("p", { class: "note" }, c.durationNote.replace("{s}", api.cfg.practiceSeconds)),
    continueBtn(() => runTypingScreen(root, api, { label: "practice", seed: api.session.seeds.practice, seconds: api.cfg.practiceSeconds }), api.content.ui.start)));
}
