import { el, screen, mount, continueBtn, radioGroup } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.demographics;
  const answers = {};
  const btn = continueBtn(() => {
    for (const [id, value] of Object.entries(answers)) log("answer", { id: "demo_" + id, value });
    Object.assign(api.session.answers, { demographics: { ...answers } });
    api.next();
  }, "Continue", true);
  const update = () => { btn.disabled = !c.items.every(it => answers[it.id] !== undefined && answers[it.id] !== ""); };

  const rows = c.items.map(it => {
    let input;
    if (it.type === "number") {
      input = el("input", { type: "number", min: "10", max: "100", oninput: (e) => { answers[it.id] = e.target.value; update(); } });
    } else {
      const opts = it.type === "yesno" ? [api.content.ui.yes, api.content.ui.no] : it.options;
      input = radioGroup("d_" + it.id, opts.map(o => ({ value: o, label: o })), (v) => { answers[it.id] = v; update(); });
    }
    return el("div", { class: "field" }, el("div", { class: "label" }, it.label), input);
  });
  mount(root, screen(c.title, ...rows, btn));
}
