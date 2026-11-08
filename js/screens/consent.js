import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.consent;
  const btn = continueBtn(() => {
    log("consent_given", { version: c.version });
    api.next();
  }, "Continue", true);
  const box = el("input", { type: "checkbox", onchange: () => { btn.disabled = !box.checked; } });
  mount(root, screen(c.title,
    el("p", {}, c.body),
    el("label", { class: "check" }, box, el("span", {}, c.checkbox)),
    btn));
}
