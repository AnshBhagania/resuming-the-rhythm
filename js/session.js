// Session setup + the explicit state machine. Every transition logs `state_enter`.
import { CONFIG, APP_VERSION } from "./config.js";
import { CONTENT } from "./content.js";
import { log, setContext } from "./log.js";
import { randomSeed } from "./rng.js";
import { el } from "./ui.js";
import { screens } from "./screens/index.js";

export function resolveOrder(pid, override) {
  if (override && CONFIG.orders[override]) return { code: override, source: "url" };
  const codes = Object.keys(CONFIG.orders);
  const m = /(\d+)/.exec(pid);
  const n = Math.max(1, m ? parseInt(m[1], 10) : 1);
  return { code: codes[(n - 1) % codes.length], source: "pid" };
}

export function effectiveConfig(dryrun) {
  const cfg = { ...CONFIG };
  if (dryrun) Object.assign(cfg, CONFIG.dryrun);
  return cfg;
}

export function createSession({ pid, pidMissing, flags }) {
  const order = resolveOrder(pid, flags.order);
  const seed = flags.seed ?? randomSeed();
  return {
    id: crypto.randomUUID(),
    pid,
    pidMissing,
    flags,
    order,
    conditions: CONFIG.orders[order.code],
    seed,
    // Derived seeds so each phase/block can be replayed independently.
    seeds: { master: seed, practice: seed + 1, baseline: seed + 2, block1: seed + 3, block2: seed + 4, block3: seed + 5 },
    cfg: effectiveConfig(flags.dryrun),
    answers: {}
  };
}

export function sessionStartData(session) {
  return {
    wall_clock_ms: Date.now(),
    wall_clock_iso: new Date().toISOString(),
    perf_origin_ms: performance.timeOrigin,
    app_version: APP_VERSION,
    git_commit: null,
    pid_missing: session.pidMissing,
    order: session.order.code,
    order_source: session.order.source,
    conditions: session.conditions,
    seeds: session.seeds,
    flags: session.flags,
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : null,
    hardware_concurrency: navigator.hardwareConcurrency ?? null,
    device_memory_gb: navigator.deviceMemory ?? null,
    connection: navigator.connection ? { effective_type: navigator.connection.effectiveType, downlink_mbps: navigator.connection.downlink, rtt_ms: navigator.connection.rtt } : null,
    ua_data: navigator.userAgentData ? { platform: navigator.userAgentData.platform, mobile: navigator.userAgentData.mobile, brands: navigator.userAgentData.brands } : null,
    is_chromium: !!navigator.userAgentData || /Chrom(e|ium)\//.test(navigator.userAgent),
    online: navigator.onLine,
    screen: { w: screen.width, h: screen.height },
    window: { w: innerWidth, h: innerHeight },
    device_pixel_ratio: devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    settings: session.settingsInfo ?? null,
    gaze_kind: session.gaze ? session.gaze.kind : null,
    aoi: null // typing box / prompt rects are logged in typing_ready, email_shown and resume_prompt_shown
  };
}

export function buildSteps(conditions, flags = {}) {
  const steps = [];
  const add = (screen, phase, extra = {}) => steps.push({ screen, phase, block: 0, condition: null, ...extra });
  if (flags.inputtest) {           // physical button test only (opened from the admin page)
    add("inputTest", "precheck"); add("done", "debrief");
    return steps;
  }
  if (flags.gazetest) {            // calibration test only (opened from the admin page)
    add("camera", "consent"); add("gaze", "precheck"); add("done", "debrief");
    return steps;
  }
  // back: the participant may step back from here (setup only, never into the experiment). skipOnBack: auto-skipped when going back.
  add("welcome", "welcome");
  add("consent", "consent", { back: true });
  add("camera", "consent", { back: true });   // reachable with Back, so the participant can check the camera again
  add("precheck", "precheck", { back: true });
  add("music", "precheck", { back: true });
  add("demographics", "precheck", { back: true });
  add("gaze", "precheck", { back: true, skipOnBack: true });
  add("instructions", "practice", { back: true });
  add("practice", "practice", { back: true });   // only the intro card; the button disappears once practice starts
  add("baseline", "baseline");
  conditions.forEach((condition, i) => {
    const block = i + 1;
    add("blockIntro", "block", { block, condition });
    add("typing", "block", { block, condition });
    add("questions", "questions", { block, condition });
  });
  add("debrief", "debrief");
  add("done", "debrief");
  return steps;
}

export function createMachine({ root, session, onState }) {
  const steps = buildSteps(session.conditions, session.flags);
  let index = -1;
  const leaveHooks = [];   // cleanup callbacks of the screen being left (e.g. release a camera preview)
  const api = { session, cfg: session.cfg, content: CONTENT, step: null, direction: "forward", next: () => go(index + 1), go, back: () => back(), canBack: () => canBack(),
    onLeave: (fn) => leaveHooks.push(fn) };

  const prevIndex = (from) => { for (let i = from - 1; i >= 0; i--) if (!steps[i].skipOnBack) return i; return -1; };
  const canBack = () => !!steps[index]?.back && prevIndex(index) >= 0;
  function back() {
    if (!canBack()) return;
    const p = prevIndex(index);
    log("nav_back", { from: steps[index].screen, to: steps[p].screen });
    if (session.audio?.isPlaying()) session.audio.pause("nav_back");   // e.g. a test sound still playing
    api.direction = "back";
    try { go(p); } finally { api.direction = "forward"; }
  }

  function go(n) {
    if (n < 0 || n >= steps.length) return;
    leaveHooks.splice(0).forEach((fn) => { try { fn(); } catch (e) { /* cleanup must never block navigation */ } });
    index = n;
    document.body.classList.remove("typing-active");
    const step = steps[n];
    api.step = step;
    setContext({ phase: step.phase, block: step.block, condition: step.condition, intr: 0 });
    log("state_enter", { screen: step.screen, index: n });
    onState?.(step, n, steps.length);
    screens[step.screen](root, api);
    window.scrollTo(0, 0);
    // "Back" button on setup cards (a screen may have advanced itself: only add it if this step is still current)
    const card = root.querySelector(".screen");
    if (index === n && canBack() && card && !card.querySelector(".nav-back")) {
      card.prepend(el("button", { class: "nav-back", type: "button", onclick: back }, "\u2039 " + CONTENT.ui.back));
    }
  }

  return { start: () => go(0), go, next: api.next, back, steps, getIndex: () => index };
}
