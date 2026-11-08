import { el, screen, mount } from "../ui.js";
import { log, downloadLog } from "../log.js";
import { flushAll, dbEnabled } from "../db.js";

export async function render(root, api) {
  const c = api.content.done;
  log("session_end", {});
  api.session.audio.release?.();                       // free the leased Spotify account for the next session
  const status = el("p", { class: "note" }, dbEnabled() ? c.uploading : c.uploadOff);
  const retry = el("button", { class: "primary", hidden: true, onclick: () => run() }, c.retryUpload);
  mount(root, screen(c.title, el("p", {}, c.body), status, retry,
    el("button", { class: "primary", onclick: downloadLog }, c.download)));
  async function run() {
    if (!dbEnabled()) return;
    retry.hidden = true;
    status.textContent = c.uploading;
    const r = await flushAll();
    status.textContent = r.ok ? c.uploaded.replace("{n}", r.sent) : c.notFinished.replace("{sent}", r.sent).replace("{total}", r.total);
    retry.hidden = r.ok;
  }
  run();
}
