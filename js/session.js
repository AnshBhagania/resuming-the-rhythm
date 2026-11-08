// Session setup + the explicit state machine. Every transition logs `state_enter`.
import { CONFIG, APP_VERSION } from "./config.js";
import { CONTENT } from "./content.js";
import { log, setContext } from "./log.js";
import { randomSeed } from "./rng.js";
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
    screen: { w: screen.width, h: screen.height },
    window: { w: innerWidth, h: innerHeight },
    device_pixel_ratio: devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    aoi: null // filled in once the typing box exists (stage 2)
  };
}

export function buildSteps(conditions) {
  const steps = [];
  const add = (screen, phase, extra = {}) => steps.push({ screen, phase, block: 0, condition: null, ...extra });
  add("welcome", "welcome");
  add("consent", "consent");
  add("camera", "consent");
  add("precheck", "precheck");
  add("demographics", "precheck");
  add("instructions", "practice");
  add("practice", "practice");
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
  const steps = buildSteps(session.conditions);
  let index = -1;
  const api = { session, cfg: session.cfg, content: CONTENT, step: null, next: () => go(index + 1), go };

  function go(n) {
    if (n < 0 || n >= steps.length) return;
    index = n;
    const step = steps[n];
    api.step = step;
    setContext({ phase: step.phase, block: step.block, condition: step.condition, intr: 0 });
    log("state_enter", { screen: step.screen, index: n });
    onState?.(step, n, steps.length);
    screens[step.screen](root, api);
    window.scrollTo(0, 0);
  }

  return { start: () => go(0), go, next: api.next, steps, getIndex: () => index };
}
