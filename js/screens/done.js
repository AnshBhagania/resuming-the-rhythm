import { el, screen, mount } from "../ui.js";
import { log, downloadLog } from "../log.js";

export function render(root, api) {
  const c = api.content.done;
  log("session_end", {});
  mount(root, screen(c.title,
    el("p", {}, c.body),
    el("p", { class: "note" }, "Upload to the server is added in stage 5. For now the log stays in this browser."),
    el("button", { class: "primary", onclick: downloadLog }, "Download backup (JSON)")));
}
