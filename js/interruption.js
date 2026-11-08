// Email interruption: grey out typing -> (music pause hook) -> notification sound -> email card.
// Keyboard-only reply: 1/2/3 picks an answer, then a one-line reply (min words), Enter sends.
// Resolves when the reply is sent; typing stays LOCKED. The caller decides how typing resumes (stage 4 modes).
import { el } from "./ui.js";
import { log } from "./log.js";
import { playNotification } from "./sound.js";
import { onFirstFrame } from "./resume.js";

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

    let stage = "choose", option = null, reply = "", timedOut = false, done = false;

    const optEls = email.options.map((o, i) => el("li", { class: "em-opt" }, el("kbd", {}, String(i + 1)), el("span", {}, o)));
    const replyEl = el("div", { class: "em-reply" });
    const hint = el("p", { class: "em-hint" });
    const card = el("div", { class: "email-card" },
      el("div", { class: "em-head" },
        el("div", { class: "em-from" }, `${email.from.name} <${email.from.address}>`),
        el("div", { class: "em-subject" }, email.subject)),
      el("p", { class: "em-body" }, email.body),
      el("p", { class: "em-question" }, email.question),
      el("ul", { class: "em-opts" }, ...optEls),
      replyEl, hint);
    const overlay = el("div", { class: "email-overlay" }, card);
    document.body.append(overlay);      // 4. card slides in (CSS animation)

    function update() {
      optEls.forEach((li, i) => li.classList.toggle("sel", option === i));
      replyEl.hidden = stage === "choose";
      replyEl.replaceChildren(el("span", {}, reply), el("span", { class: "em-caret" }));
      const words = countWords(reply);
      if (timedOut) hint.textContent = content.email.hintTimeout;
      else if (stage === "choose") hint.textContent = content.email.hintChoose;
      else hint.textContent = words < cfg.replyMinWords
        ? content.email.hintReply.replace("{n}", cfg.replyMinWords)
        : content.email.hintSend;
    }
    update();

    const r = card.getBoundingClientRect();
    onFirstFrame(() => log("email_shown", { n, email_id: email.id, aoi_prompt: { x: r.left, y: r.top, w: r.width, h: r.height } }));

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
        if (k_ === "1" || k_ === "2" || k_ === "3") {
          option = Number(k_) - 1;
          stage = "reply";
          log("email_option", { n, option: option + 1, option_text: email.options[option] }, t);
          update();
        }
        return;
      }
      // reply stage
      if (k_ === "Enter") {
        if (countWords(reply) < cfg.replyMinWords) return;
        done = true;
        clearTimeout(timer);
        document.removeEventListener("keydown", onKey, true);
        log("reply_sent", {
          n, k, practice, email_id: email.id, option: option + 1, option_text: email.options[option],
          reply, reply_words: countWords(reply), timed_out: timedOut
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
    document.addEventListener("keydown", onKey, true);
  });
}
