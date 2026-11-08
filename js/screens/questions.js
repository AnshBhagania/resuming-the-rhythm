import { el, screen, mount, continueBtn, likert } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.questionnaire;
  const answers = {};
  const btn = continueBtn(() => {
    for (const [id, value] of Object.entries(answers)) log("answer", { id: "q_" + id, value, scale_max: c.scale.max });
    api.next();
  }, "Continue", true);
  const update = () => { btn.disabled = !c.items.every(it => answers[it.id] !== undefined); };
  const rows = c.items.map(it => el("div", { class: "field" },
    el("div", { class: "label" }, it.label),
    likert(`q_${api.step.block}_${it.id}`, c.scale, (v) => { answers[it.id] = v; update(); })));
  mount(root, screen(c.title, ...rows, btn));
}
