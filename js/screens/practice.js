import { el, screen, mount, continueBtn } from "../ui.js";
import { runInterruptedTyping } from "../runner.js";
import { EMAILS } from "../../data/emails.js";

// Practice: typing with one practice interruption per mode (in this participant's mode order), flagged practice=true.
export function render(root, api) {
  const c = api.content.practice, cfg = api.cfg;
  const start = () => runInterruptedTyping(root, api, {
    label: "practice", seed: api.session.seeds.practice, nWords: 400,
    delaysS: [cfg.practiceFirstDelaySeconds, cfg.practiceGapSeconds, cfg.practiceGapSeconds],
    modes: api.session.conditions, emails: EMAILS.practice, practice: true,
    tailS: cfg.practiceTailSeconds, scheduleRule: "practice: fixed gaps"
  });
  mount(root, screen(c.title, el("p", {}, c.body),
    el("p", { class: "note" }, c.note.replace("{modes}", api.session.conditions.join(", "))),
    continueBtn(start, api.content.ui.start)));
}
