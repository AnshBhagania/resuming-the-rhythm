import { infoScreen, el } from "../ui.js";
// Stage 2 adds the typing task here.
export function render(root, api) {
  infoScreen(root, api, "baseline", el("p", { class: "note" }, `Duration: ${api.cfg.baselineSeconds} s${api.session.flags.dryrun ? " (dry run)" : ""}.`));
}
