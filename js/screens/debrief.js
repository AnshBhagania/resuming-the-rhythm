import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.debrief;
  const ranks = {};
  const modes = Object.keys(c.rankLabels);
  const comment = el("textarea", { rows: "4", class: "wide" });
  const btn = continueBtn(() => {
    for (const m of modes) log("answer", { id: "rank_" + m, value: Number(ranks[m]) });
    log("answer", { id: "debrief_comment", value: comment.value });
    api.next();
  }, "Continue", true);
  const update = () => {
    const vals = modes.map(m => ranks[m]);
    btn.disabled = vals.some(v => !v) || new Set(vals).size !== modes.length;
  };
  const rows = modes.map(m => {
    const sel = el("select", { onchange: (e) => { ranks[m] = e.target.value; update(); } },
      el("option", { value: "" }, c.rankPlaceholder),
      ...[1, 2, 3].map(n => el("option", { value: String(n) }, String(n))));
    return el("div", { class: "field row" }, el("span", { class: "label" }, c.rankLabels[m]), sel);
  });
  mount(root, screen(c.title, el("p", {}, c.body), ...rows,
    el("div", { class: "field" }, el("div", { class: "label" }, c.commentLabel), comment), btn));
}
