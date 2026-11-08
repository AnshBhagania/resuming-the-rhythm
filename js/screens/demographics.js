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
      // digits only, no spinner arrows; 10 to 100 accepted
      input = el("input", { type: "text", inputmode: "numeric", pattern: "[0-9]*", maxlength: "3", autocomplete: "off", class: "age", "aria-label": it.label,
        oninput: (e) => {
          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3);
          const v = Number(e.target.value);
          answers[it.id] = v >= 10 && v <= 100 ? String(v) : "";
          update();
        } });
    } else {
      const opts = it.type === "yesno" ? [api.content.ui.yes, api.content.ui.no] : it.options;
      input = radioGroup("d_" + it.id, opts.map(o => ({ value: o, label: o })), (v) => { answers[it.id] = v; update(); });
    }
    return el("div", { class: "field" }, el("div", { class: "label" }, it.label), input);
  });
  mount(root, screen(c.title, ...rows, btn));
}
