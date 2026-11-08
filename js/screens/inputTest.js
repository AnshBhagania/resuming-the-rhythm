// Physical button test (opened from the admin page). Shows what a device emits and counts detected presses for the
// configured device (target: 20 presses, all 20 must be detected). Saved as a session flagged inputtest.
import { el, screen, mount, continueBtn } from "../ui.js";
import { log } from "../log.js";
import { createPhysicalSource, monitorRaw } from "../input.js";

const TARGET = 20;

export function render(root, api) {
  const p = api.cfg.physical;
  const src = createPhysicalSource(p);
  const rawList = el("ol", { class: "it-raw" });
  const count = el("div", { class: "it-count" }, `0 / ${TARGET}`);
  const gaps = el("p", { class: "note" });
  const summary = { keydown: {}, gamepad: {}, media: {} };
  let detected = 0, lastT = null, stopRaw = null, stopDevice = null;
  const intervals = [];

  const describe = p.type === "key" ? `a keyboard-type device sending the key "${p.key}"`
    : p.type === "gamepad" ? `a gamepad-type device, button ${p.gamepadButton < 0 ? "(any)" : p.gamepadButton}`
    : `a media button (${p.mediaAction}), e.g. headphone remote or laptop media key`;

  function press(info) {
    detected++;
    if (lastT != null) intervals.push(Math.round(info.t - lastT));
    lastT = info.t;
    count.textContent = `${detected} / ${TARGET}`;
    if (intervals.length) gaps.textContent = `Gap between presses (ms): ${intervals.slice(-8).join(", ")}`;
    log("input_test_press", { n: detected, ...info, t_ms: Number(info.t.toFixed(3)) }, info.t);
  }

  function start() {
    start_btn.disabled = true;
    stopRaw = monitorRaw((r) => {
      const k = r.kind === "keydown" ? r.key + "/" + r.code : r.kind === "gamepad" ? "button " + r.button : r.action;
      summary[r.kind][k] = (summary[r.kind][k] || 0) + 1;
      rawList.prepend(el("li", {}, `${r.kind}: ${k}`));
      while (rawList.children.length > 8) rawList.lastChild.remove();
      // keyboard-type device: count it here from the same stream
      const m = r.kind === "keydown" ? src.keyMatches({ type: "keydown", key: r.key, code: r.code, repeat: false }) : null;
      if (m) press({ source: "key", key: r.key, code: r.code, t: r.t });
      if (p.type === "gamepad" && r.kind === "gamepad" && (p.gamepadButton < 0 || p.gamepadButton === r.button)) press({ source: "gamepad", button: r.button, t: r.t });
      if (p.type === "media" && r.kind === "media" && (p.mediaAction === "any" || p.mediaAction === r.action)) press({ source: "media", action: r.action, t: r.t });
    });
    stopDevice = () => {};
  }

  const start_btn = el("button", { class: "primary", onclick: start }, "Start listening");
  const reset = el("button", { class: "primary", onclick: () => { detected = 0; lastT = null; intervals.length = 0; count.textContent = `0 / ${TARGET}`; gaps.textContent = ""; } }, "Reset count");
  const finish = continueBtn(() => {
    stopRaw?.(); stopDevice?.();
    log("input_test_result", { detected, target: TARGET, passed: detected === TARGET, config: p, intervals_ms: intervals, raw_summary: summary });
    api.next();
  }, "Finish and save");

  mount(root, screen("Physical button test",
    el("p", {}, `Configured: ${describe}. Press your device exactly ${TARGET} times, at your own pace. Every press should be detected.`),
    el("p", { class: "note" }, "Below you can also see everything the browser receives, which helps to find out what an unknown device sends. For headphone/media buttons, keep this tab in front."),
    start_btn, " ", reset, count, gaps,
    el("h3", {}, "Raw input seen by the browser (latest first)"), rawList, finish));
}
