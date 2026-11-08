import { el, screen, mount } from "../ui.js";
import { log, downloadLog } from "../log.js";
import { flushAll, dbEnabled } from "../db.js";

export async function render(root, api) {
  const c = api.content.done;
  log("session_end", {});
  api.session.audio.release?.();                       // free the leased Spotify account for the next session
  const status = el("p", { class: "note" }, dbEnabled() ? "Uploading your results..." : "Upload is off for this run (?nodb=1). Download the backup below.");
  const retry = el("button", { class: "primary", hidden: true, onclick: () => run() }, "Retry upload");
  mount(root, screen(c.title, el("p", {}, c.body), status, retry,
    el("button", { class: "primary", onclick: downloadLog }, "Download backup (JSON)")));
  async function run() {
    if (!dbEnabled()) return;
    retry.hidden = true;
    status.textContent = "Uploading your results...";
    const r = await flushAll();
    status.textContent = r.ok ? `Results uploaded (${r.sent} events). You can close this tab.` : `Upload not finished (${r.sent}/${r.total}). Please download the backup and send it to the researcher.`;
    retry.hidden = r.ok;
  }
  run();
}
