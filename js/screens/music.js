// Music choice + sound check. Spotify: participant pastes a public playlist link. Synthetic: just a volume check.
import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";

export function render(root, api) {
  const c = api.content.music, cfg = api.cfg, audio = api.session.audio;
  let info = null, testing = false;
  const msg = el("p", { class: "note" });
  const btn = continueBtn(() => {
    if (testing) audio.pause("soundtest_end");
    audio.reset();
    log("answer", { id: "music_setup", kind: audio.kind, name: info.name, uri: info.uri, total_ms: info.total_ms, n_tracks: info.n_tracks, volume: audio.volume });
    audio.showStatus(false);
    api.next();
  }, "Continue", true);

  const vol = el("input", { type: "range", min: "0", max: "1", step: "0.05", value: String(audio.volume), disabled: true,
    oninput: () => audio.setVolume(Number(vol.value)) });
  const testBtn = el("button", { class: "primary", disabled: true, onclick: async () => {
    if (!testing) { testing = true; testBtn.textContent = c.stop; await audio.play({ reason: "soundtest", fadeMs: 200 }); }
    else { testing = false; testBtn.textContent = c.test; await audio.pause("soundtest"); }
  } }, c.test);

  const finishLoad = (i) => {
    info = i;
    const mins = Math.round(i.total_ms / 60000);
    const long = mins >= cfg.minPlaylistMinutes;
    msg.textContent = `${i.name} (${i.n_tracks} tracks, ${mins} min)` + (long ? "" : "  " + c.tooShort);
    vol.disabled = false; testBtn.disabled = false; btn.disabled = !long;
  };

  const rows = [el("p", {}, c.body)];
  if (audio.kind === "spotify") {
    const input = el("input", { type: "text", placeholder: "https://open.spotify.com/playlist/...", spellcheck: "false", autocomplete: "off" });
    const load = el("button", { class: "primary", onclick: async () => {
      msg.textContent = "Connecting to Spotify...";
      try {
        await audio.activate();            // inside the click: unlocks audio playback
        finishLoad(await audio.loadPlaylist(input.value.trim()));
      } catch (e) { msg.textContent = String(e.message || e); log("audio_error", { kind: "setup", message: String(e.message || e) }); }
    } }, c.load);
    rows.push(el("label", {}, c.linkLabel), el("div", { class: "fieldrow" }, input, load));
  } else {
    rows.push(el("p", { class: "note" }, "Synthetic audio (test mode)."));
    audio.loadPlaylist().then(finishLoad);
  }
  rows.push(msg, el("div", { class: "fieldrow" }, testBtn), el("p", {}, c.volume), vol, btn);
  mount(root, screen(c.title, ...rows));
}
