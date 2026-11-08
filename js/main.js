import { APP_VERSION } from "./config.js";
import { CONTENT } from "./content.js";
import { createSession, createMachine, sessionStartData } from "./session.js";
import { log, setContext, downloadLog } from "./log.js";
import { el, screen, mount } from "./ui.js";

const params = new URLSearchParams(location.search);
const root = document.getElementById("app");
const debugBar = document.getElementById("debug-bar");

function isMobile() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true; // iPadOS desktop UA
  return matchMedia("(pointer: coarse)").matches && !matchMedia("(hover: hover)").matches;
}

function boot() {
  if (isMobile()) {
    mount(root, screen(CONTENT.blocked.title, el("p", {}, CONTENT.blocked.body)));
    return;
  }

  const rawPid = (params.get("pid") || "").trim();
  const pidMissing = !/^[A-Za-z0-9_-]{1,16}$/.test(rawPid);
  const pid = pidMissing ? "P00" : rawPid.toUpperCase();
  const seedParam = params.get("seed");
  const flags = {
    debug: params.get("debug") === "1",
    dryrun: params.get("dryrun") === "1",
    order: params.get("order") ? params.get("order").toUpperCase() : null,
    seed: seedParam && /^\d+$/.test(seedParam) ? Number(seedParam) >>> 0 : null
  };

  const session = createSession({ pid, pidMissing, flags });
  setContext({ session_id: session.id, pid });
  log("session_start", sessionStartData(session));

  // Page health
  document.addEventListener("visibilitychange", () => log("visibility_change", { hidden: document.hidden }));
  window.addEventListener("blur", () => log("blur"));
  window.addEventListener("focus", () => log("focus"));

  const machine = createMachine({ root, session, onState: (step, i, n) => updateDebug(session, step, i, n) });
  if (flags.debug) setupDebug(session, machine);
  machine.start();
}

function setupDebug(session, machine) {
  debugBar.hidden = false;
  document.body.classList.add("has-debug");
  window.__rhythm = { session, machine, downloadLog };
}

function updateDebug(session, step, i, n) {
  if (!session.flags.debug) return;
  const f = session.flags;
  debugBar.replaceChildren(
    el("span", {}, `v${APP_VERSION} | ${session.pid} | ${session.order.code} (${session.conditions.join(">")}) | seed ${session.seed}` +
      `${f.dryrun ? " | DRYRUN" : ""}${session.pidMissing ? " | NO PID" : ""} | `),
    el("strong", {}, `${i + 1}/${n} ${step.screen}`),
    el("span", {}, ` | phase=${step.phase} block=${step.block} cond=${step.condition ?? "-"} `),
    el("button", { onclick: () => window.__rhythm.machine.go(i - 1) }, "‹ back"),
    el("button", { onclick: () => window.__rhythm.machine.go(i + 1) }, "skip ›"),
    el("button", { onclick: downloadLog }, "download log"));
}

boot();
