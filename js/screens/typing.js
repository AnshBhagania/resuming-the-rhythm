import { el, screen, mount, continueBtn } from "../ui.js";
// Stages 2 to 4 add typing, interruptions and music. Placeholder for the skeleton.
export function render(root, api) {
  const c = api.content.typing;
  const { block, condition } = api.step;
  const [lo, hi] = api.cfg.interruptionDelaySeconds;
  mount(root, screen(`${c.title} (block ${block})`,
    el("p", {}, c.body),
    el("p", { class: "note" }, `Condition ${condition}. ${api.cfg.interruptionsPerBlock} interruptions, one every ${lo} to ${hi} s.`),
    continueBtn(api.next)));
}
