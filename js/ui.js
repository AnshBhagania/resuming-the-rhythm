// Tiny DOM helpers shared by screens.
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) e.append(kid);
  return e;
}

export function screen(title, ...kids) {
  return el("section", { class: "screen" }, el("h1", {}, title), ...kids);
}

export function mount(root, node) { root.replaceChildren(node); }

export function continueBtn(onClick, label = "Continue", disabled = false) {
  return el("button", { class: "primary", onclick: onClick, disabled }, label);
}

// options: [{value, label}]
export function radioGroup(name, options, onChange) {
  const wrap = el("div", { class: "radios" });
  for (const o of options) {
    const input = el("input", { type: "radio", name, value: String(o.value) });
    input.addEventListener("change", () => onChange(o.value));
    wrap.append(el("label", {}, input, el("span", {}, o.label)));
  }
  return wrap;
}

export function likert(name, scale, onChange) {
  const opts = [];
  for (let v = scale.min; v <= scale.max; v++) opts.push({ value: v, label: String(v) });
  return el("div", { class: "likert" },
    el("span", { class: "end" }, scale.minLabel),
    radioGroup(name, opts, onChange),
    el("span", { class: "end" }, scale.maxLabel));
}

export function infoScreen(root, api, key, ...extra) {
  const c = api.content[key];
  mount(root, screen(c.title, el("p", {}, c.body), ...extra, continueBtn(api.next)));
}
