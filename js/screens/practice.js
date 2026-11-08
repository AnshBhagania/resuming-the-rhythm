import { infoScreen, el } from "../ui.js";
// Stages 2 to 4 add the practice typing and one practice interruption per mode.
export function render(root, api) {
  infoScreen(root, api, "practice", el("p", { class: "note" }, `Duration: ${api.cfg.practiceSeconds} s${api.session.flags.dryrun ? " (dry run)" : ""}.`));
}
