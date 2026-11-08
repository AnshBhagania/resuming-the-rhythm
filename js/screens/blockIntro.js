import { el, screen, mount, continueBtn } from "../ui.js";
export function render(root, api) {
  const c = api.content.blockIntro;
  const { block, condition } = api.step;
  mount(root, screen(`${c.title} (${block} of ${api.cfg.blocks})`,
    el("p", {}, c.body),
    el("p", {}, api.content.modes[condition].replace("[button]", api.cfg.physical.label)),
    continueBtn(api.next)));
}
