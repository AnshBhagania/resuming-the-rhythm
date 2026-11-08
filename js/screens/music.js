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
    offProblem();
    api.next();
  }, api.content.ui.continue, true);

  const vol = el("input", { type: "range", min: "0", max: "1", step: "0.05", value: String(audio.volume), disabled: true,
    oninput: () => audio.setVolume(Number(vol.value)) });
  const testBtn = el("button", { class: "primary", disabled: true, onclick: async () => {
    if (!testing) { testing = true; testBtn.textContent = c.stop; await audio.play({ reason: "soundtest", fadeMs: 200 }); }
    else { testing = false; testBtn.textContent = c.test; await audio.pause("soundtest"); }
  } }, c.test);

  const finishLoad = (i) => {
    info = i;
    msg.textContent = i.unverified ? `${i.name}. ${c.unverified}` : i.name;
    vol.disabled = false; testBtn.disabled = false; btn.disabled = false;
  };

  const offProblem = audio.onProblem((info) => { msg.textContent = c.playbackProblem; });   // repeated "Playback error" etc.
  const rows = [el("p", {}, c.body)];
  if (audio.kind === "spotify") {
    const input = el("input", { type: "text", placeholder: "https://open.spotify.com/playlist/...", spellcheck: "false", autocomplete: "off" });
    // Debug runs can paste the key here when the link had none; real participants never see this field.
    const keyInput = api.session.flags.debug && !api.session.studyKey && !audio.hasAdminLogin() ? el("input", { type: "text", placeholder: c.keyPlaceholder, spellcheck: "false", autocomplete: "off" }) : null;
    const load = el("button", { class: "primary", onclick: async () => {
      if (!api.session.studyKey && keyInput?.value.trim()) { api.session.studyKey = keyInput.value.trim(); audio.setStudyKey(api.session.studyKey);
        try { sessionStorage.setItem("studyKey", api.session.studyKey); } catch (e) { /* storage blocked */ } }
      if (!api.session.studyKey && !audio.hasAdminLogin()) {
        msg.textContent = c.missingKey;
        log("audio_error", { kind: "missing_key" });
        return;
      }
      msg.textContent = c.connecting;
      try {
        await audio.activate();            // inside the click: unlocks audio playback
        finishLoad(await audio.loadPlaylist(input.value.trim()));
      } catch (e) {
        log("audio_error", { kind: e.code || "setup", message: String(e.message || e) });
        if (e.code === "no_free_account") {
          msg.textContent = c.allBusy;
          setTimeout(() => load.click(), 10000);
        } else msg.textContent = String(e.message || e);
      }
    } }, c.load);
    rows.push(el("label", {}, c.linkLabel), el("div", { class: "fieldrow" }, input, load));
    if (keyInput) rows.push(el("div", { class: "fieldrow" }, keyInput));
  } else {
    rows.push(el("p", { class: "note" }, c.syntheticNote));
    audio.loadPlaylist().then(finishLoad);
  }
  rows.push(msg, el("div", { class: "fieldrow" }, testBtn), el("p", {}, c.volume), vol, btn);
  mount(root, screen(c.title, ...rows));
}
