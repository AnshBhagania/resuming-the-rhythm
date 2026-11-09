// Email interruption: grey out typing -> (music pause hook) -> notification sound -> email card.
// Keyboard-only reply: 1/2/3 picks an answer, then a one-line reply (min words), Enter sends.
// Resolves when the reply is sent; typing stays LOCKED. The caller decides how typing resumes (stage 4 modes).
import { el } from "./ui.js";
import { log } from "./log.js";
import { playNotification } from "./sound.js";
import { onFirstFrame, settledRect } from "./resume.js";
import { getScale } from "./layout.js";

const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph", "Dead", "Process", "Unidentified", "Compose"]);
const MAX_REPLY_CHARS = 120;

export const countWords = (s) => s.trim().split(/\s+/).filter(Boolean).length;

export function runInterruption({ task, email, n, k, practice = false, cfg, content, hooks = {} }) {
  return new Promise((resolve) => {
    const st = task.getState();
    log("interruption_start", { n, k, email_id: email.id, practice, word_idx: st.idx, typed_partial: st.typed });
    task.markInterruption();
    task.lock("email");                 // 1. typing greys out
    hooks.pauseMusic?.();               // 2. music pauses (stage 4)
    playNotification();                 // 3. notification sound
    log("notification_sound");

    let stage = "choose", option = null, reply = "", timedOut = false, done = false, tooShort = false, nudge = false, clicks = 0;
    let lastPointer = null;

    // Keyboard only, so every mode starts its resume step with the hands on the keyboard. A click does not select, but it is
    // not silent: the card says to use the number key, and the click is logged (clicks, cursor position).
    const optEls = email.options.map((o, i) => el("li", { class: "em-opt", onclick: (e) => {
        if (done) return;
        clicks++; nudge = true;
        log("email_click", { n, option: i + 1, stage, x: Math.round(e.clientX), y: Math.round(e.clientY) }, e.timeStamp);
        update();
      } },
      el("kbd", {}, String(i + 1)), el("span", {}, o)));
    const steps = el("ol", { class: "em-steps" },
      el("li", { class: "s1" }, content.email.stepChoose),
      el("li", { class: "s2" }, content.email.stepReply.replace("{n}", cfg.replyMinWords)),
      el("li", { class: "s3" }, content.email.stepSend));
    const replyEl = el("div", { class: "em-reply" });
    const hint = el("p", { class: "em-hint" });
    const card = el("div", { class: "email-card" },
      el("div", { class: "em-head" },
        el("div", { class: "em-from" }, `${email.from.name} <${email.from.address}>`),
        el("div", { class: "em-subject" }, email.subject)),
      el("p", { class: "em-body" }, email.body),
      el("p", { class: "em-question" }, email.question),
      steps,
      el("ul", { class: "em-opts" }, ...optEls),
      replyEl, hint);
    const overlay = el("div", { class: "email-overlay" }, card);
    document.body.append(overlay);      // 4. card slides in (CSS animation)

    function update() {
      optEls.forEach((li, i) => li.classList.toggle("sel", option === i));
      replyEl.hidden = stage === "choose";
      replyEl.replaceChildren(el("span", {}, reply), el("span", { class: "em-caret" }));
      const words = countWords(reply), enough = words >= cfg.replyMinWords;
      const state = (cls, on, finished) => { const li = steps.querySelector("." + cls); li.classList.toggle("active", on); li.classList.toggle("done", finished); };
      state("s1", stage === "choose", option !== null);
      state("s2", stage === "reply" && !enough, stage === "reply" && enough);
      state("s3", stage === "reply" && enough, false);
      hint.textContent = timedOut ? content.email.hintTimeout : (tooShort && !enough ? content.email.hintTooShort.replace("{n}", cfg.replyMinWords) : nudge ? (stage === "choose" ? content.email.hintClick : content.email.hintClickLater) : "");
      hint.hidden = !hint.textContent;
    }

    function choose(i, t) {
      option = i; stage = "reply"; nudge = false;
      log("email_option", { n, option: i + 1, option_text: email.options[i] }, t);
      update();
    }
    update();

    const r = settledRect(card);
    onFirstFrame(() => log("email_shown", { n, email_id: email.id, ui_scale: getScale(), aoi_prompt: { x: r.left, y: r.top, w: r.width, h: r.height } }));

    const timer = setTimeout(() => {
      timedOut = true;
      log("interruption_timeout", { n, email_id: email.id, practice });
      card.classList.add("em-reminder");
      update();
    }, cfg.emailTimeoutSeconds * 1000);

    function onKey(e) {
      if (done) return;
      const k_ = e.key, t = e.timeStamp;
      if (MODIFIERS.has(k_) || e.ctrlKey || e.metaKey || e.isComposing) return;
      e.preventDefault();
      if (e.repeat && k_ !== "Backspace") return;
      log("email_key", { key: k_, code: e.code, stage, repeat: e.repeat }, t);

      if (stage === "choose") {
        if (k_ === "1" || k_ === "2" || k_ === "3") choose(Number(k_) - 1, t);
        return;
      }
      // reply stage
      if (k_ === "Enter") {
        if (countWords(reply) < cfg.replyMinWords) { tooShort = true; update(); return; }
        done = true;
        clearTimeout(timer);
        document.removeEventListener("keydown", onKey, true);
        document.removeEventListener("mousemove", onMove, true);
        log("reply_sent", {
          n, k, practice, email_id: email.id, option: option + 1, option_text: email.options[option],
          reply, reply_words: countWords(reply), timed_out: timedOut,
          option_via: "key", clicks, cursor: lastPointer
        }, t);
        overlay.remove();
        resolve({ replyT: t, timedOut });
        return;
      }
      if (k_ === "Backspace") {
        if (reply.length === 0) {            // empty reply: step back to choosing an answer
          stage = "choose"; option = null;
          log("email_option", { n, option: null }, t);
        } else reply = reply.slice(0, -1);
        update();
        return;
      }
      if (k_.length === 1 && reply.length < MAX_REPLY_CHARS) { reply += k_; update(); }
    }
    const onMove = (e) => { lastPointer = { x: Math.round(e.clientX), y: Math.round(e.clientY) }; };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("keydown", onKey, true);
  });
}
