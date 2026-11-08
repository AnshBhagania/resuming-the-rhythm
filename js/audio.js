// Audio behind one interface. Two backends:
//   spotify   - Web Playback SDK, authenticated via the token broker (Supabase Edge Function)
//   synthetic - WebAudio drone, for dry runs and tests without Spotify (?audio=synthetic)
// The wrapper does the logging (audio_play_called, music_play, music_pause, track_change, audio_error),
// so both backends produce identical event streams.
import { log } from "./log.js";
import { el } from "./ui.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Researchers signed in to the admin page in this browser do not need the study key: their login token (same origin, shared localStorage)
// is sent instead and checked by the token function. Participants never have one.
export function adminToken() {
  try {
    const raw = localStorage.getItem("sb-etdtijvlguuxqvehpdvn-auth-token");
    const t = raw ? JSON.parse(raw) : null;
    return t?.access_token && t.expires_at * 1000 > Date.now() + 30_000 ? t.access_token : null;
  } catch (e) { return null; }
}

export function createAudio({ kind, cfg, pid, studyKey, sessionId, silent = false }) {
  const impl = kind === "synthetic" ? syntheticImpl({ silent }) : spotifyImpl({ cfg, pid, studyKey, sessionId });
  const status = el("div", { id: "music-status", class: "music-status" }, "♪ paused");
  document.body.append(status);
  let playing = false;
  const setPlaying = (p) => { playing = p; status.textContent = p ? "♪ playing" : "♪ paused"; status.classList.toggle("on", p); };
  impl.onTrackChange = (info) => log("track_change", info);
  impl.onError = (info) => log("audio_error", info);
  impl.onAccount = (label) => log("spotify_account", { label });

  return {
    kind,
    get volume() { return impl.volume; },
    isPlaying: () => playing,
    showStatus(v) { status.classList.toggle("visible", v); },
    activate: () => impl.activate(),
    loadPlaylist: (url) => impl.loadPlaylist(url),
    setVolume: (v) => impl.setVolume(v),
    reset: () => impl.reset(),
    release: (keepalive) => impl.release?.(keepalive),
    setStudyKey: (k) => impl.setStudyKey?.(k),
    hasAdminLogin: () => !!adminToken(),

    // Resolves when the backend reports actual playback (or after the timeout, flagged).
    async play({ reason = "", fadeMs = cfg.musicFadeInMs } = {}) {
      const tCalled = performance.now();
      log("audio_play_called", { reason, position_ms: impl.position(), fade_ms: fadeMs });
      const r = await Promise.race([impl.rawPlay(fadeMs), sleep(cfg.playTimeoutMs).then(() => ({ timeout: true }))]);
      if (r.timeout) {
        log("audio_error", { kind: "play_timeout", reason });
        return { timedOut: true, tCalled };
      }
      setPlaying(true);
      log("music_play", { reason, position_ms: impl.position(), track: impl.trackId() }, r.t);
      return { timedOut: false, tCalled, tPlaying: r.t };
    },

    async pause(reason = "") {
      const t = performance.now();
      const position_ms = impl.position();
      setPlaying(false);
      log("music_pause", { reason, position_ms, track: impl.trackId() }, t);
      await impl.rawPause();
    }
  };
}

// ---------------------------------------------------------------- synthetic
function syntheticImpl({ silent = false } = {}) {
  let ctx = null, master = null, oscs = [];
  let volume = 0.5, startedAt = null, accumulated = 0;
  const impl = {
    volume,
    async activate() {},
    async loadPlaylist() { return { name: "Synthetic test tone", total_ms: 60 * 60 * 1000, n_tracks: 1, uri: "synthetic" }; },
    reset() { accumulated = 0; startedAt = null; },
    setVolume(v) { volume = v; impl.volume = v; if (master) master.gain.value = silent ? 0 : v * 0.3; },
    position: () => Math.round(accumulated + (startedAt ? performance.now() - startedAt : 0)),
    trackId: () => "synthetic",
    async rawPlay(fadeMs) {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (!master) {
        master = ctx.createGain();
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
        master.connect(lp).connect(ctx.destination);
        [220, 277.2, 329.6].forEach(f => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; o.connect(master); o.start(); oscs.push(o); });
      }
      await ctx.resume();
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(silent ? 0 : volume * 0.3, now + fadeMs / 1000);
      startedAt = performance.now();
      return { t: performance.now() };
    },
    async rawPause() {
      if (startedAt) { accumulated += performance.now() - startedAt; startedAt = null; }
      if (master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0, ctx.currentTime); }
    }
  };
  return impl;
}

// ---------------------------------------------------------------- spotify
function spotifyImpl({ cfg, pid, studyKey, sessionId }) {
  let player = null, deviceId = null, started = false, playlistUri = null;
  let token = null, tokenExp = 0;
  let volume = 0.5;
  let last = { paused: true, position: 0, at: 0, trackId: null };
  const waiters = [];
  let sdkPromise = null, connectPromise = null;

  let heartbeat = null, accountLabel = null;
  async function callBroker(action, keepalive = false) {
    const admin = adminToken();
    return fetch(`${cfg.supabaseUrl}/functions/v1/${cfg.tokenFn}`, {
      method: "POST", keepalive, headers: { "Content-Type": "application/json", ...(admin ? { Authorization: "Bearer " + admin } : {}) },
      body: JSON.stringify({ action, key: studyKey, pid, session_id: sessionId })
    });
  }
  // Leases one account for this session; calling it again renews the lease. 409 = every account is busy.
  async function getToken(force = false) {
    if (!force && token && tokenExp > Date.now() + 60_000) return token;
    const res = await callBroker("token");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const err = new Error(j.error || ("token broker " + res.status));
      err.code = j.error;
      throw err;
    }
    const j = await res.json();
    token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000;
    if (j.account?.label && j.account.label !== accountLabel) { accountLabel = j.account.label; impl.onAccount?.(accountLabel); }
    if (!heartbeat) heartbeat = setInterval(() => getToken(true).catch(e => impl.onError?.({ kind: "lease_renew_failed", message: String(e.message) })), cfg.leaseHeartbeatMs);
    return token;
  }
  async function api(path, opts = {}) {
    const res = await fetch("https://api.spotify.com/v1" + path, {
      ...opts, headers: { Authorization: "Bearer " + await getToken(), "Content-Type": "application/json", ...(opts.headers || {}) }
    });
    return res;
  }
  function loadSdk() {
    sdkPromise ??= new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = resolve;
      const s = document.createElement("script");
      s.src = "https://sdk.scdn.co/spotify-player.js";
      s.onerror = () => reject(new Error("sdk load failed"));
      document.head.append(s);
    });
    return sdkPromise;
  }

  const impl = {
    volume,
    // Must be called from a click handler (browser autoplay policy).
    activate() {
      connectPromise ??= (async () => {
        await loadSdk();
        player = new window.Spotify.Player({ name: "Typing Study", volume, getOAuthToken: (cb) => getToken().then(cb).catch(e => impl.onError?.({ kind: "token", message: String(e) })) });
        for (const ev of ["initialization_error", "authentication_error", "account_error", "playback_error"])
          player.addListener(ev, (e) => impl.onError?.({ kind: ev, message: e.message }));
        player.addListener("autoplay_failed", () => impl.onError?.({ kind: "autoplay_failed" }));
        player.addListener("player_state_changed", (s) => {
          if (!s) { impl.onError?.({ kind: "state_null_moved_to_other_device" }); return; }
          const t = performance.now();
          const trackId = s.track_window?.current_track?.id ?? null;
          if (trackId && trackId !== last.trackId) impl.onTrackChange?.({ track: trackId, name: s.track_window.current_track.name, position_ms: s.position });
          last = { paused: s.paused, position: s.position, at: t, trackId };
          if (!s.paused) while (waiters.length) waiters.shift()(t);
        });
        const ready = new Promise((resolve, reject) => {
          player.addListener("ready", ({ device_id }) => { deviceId = device_id; resolve(); });
          player.addListener("not_ready", () => impl.onError?.({ kind: "device_not_ready" }));
          setTimeout(() => reject(new Error("player ready timeout")), 15000);
        });
        player.activateElement?.();
        await player.connect();
        await ready;
      })();
      return connectPromise;
    },
    // Spotify (since 2024-11 / 2026) hides playlist CONTENTS for playlists the account does not own and hides
    // Spotify-owned playlists entirely from the Web API. Playback does not depend on those reads, so: read the
    // name if we can, otherwise accept the link and let playback prove it. The context repeats, so length is irrelevant.
    async loadPlaylist(url) {
      const m = /playlist[/:]([A-Za-z0-9]{22})/.exec(url);
      if (!m) throw new Error("Not a Spotify playlist link");
      const id = m[1];
      let name = null, unverified = false;
      const meta = await api(`/playlists/${id}?fields=name`);
      if (meta.ok) name = (await meta.json()).name;
      else if (meta.status === 404 || meta.status === 403) unverified = true;   // Spotify-owned or private: cannot be read
      else throw new Error("Could not read playlist (" + meta.status + ")");
      playlistUri = "spotify:playlist:" + id;
      started = false;
      return { name: name || "Spotify playlist", total_ms: null, n_tracks: null, uri: playlistUri, unverified };
    },
    reset() { started = false; },
    setStudyKey(k) { studyKey = k; },
    release(keepalive = false) { clearInterval(heartbeat); heartbeat = null; return callBroker("release", keepalive).catch(() => {}); },
    setVolume(v) { volume = v; impl.volume = v; player?.setVolume(v); },
    position() { return Math.round(last.paused ? last.position : last.position + (performance.now() - last.at)); },
    trackId: () => last.trackId,
    async rawPlay(fadeMs) {
      await impl.activate();
      const waitPlaying = new Promise(r => waiters.push(r));
      await player.setVolume(0);
      if (!started) {
        const res = await api(`/me/player/play?device_id=${deviceId}`, { method: "PUT", body: JSON.stringify({ context_uri: playlistUri, position_ms: 0 }) });
        if (!res.ok) { impl.onError?.({ kind: "play_http", status: res.status }); }
        else { started = true; api(`/me/player/repeat?state=context&device_id=${deviceId}`, { method: "PUT" }); }
      } else await player.resume();
      const t = await waitPlaying;
      const steps = 8;
      for (let i = 1; i <= steps; i++) { player.setVolume(volume * i / steps); await sleep(fadeMs / steps); }
      return { t };
    },
    async rawPause() { await player?.pause(); }
  };
  return impl;
}
