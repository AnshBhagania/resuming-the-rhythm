// Typing task engine: renders the passage, captures keydown on the document, logs raw key and word events.
// Stage 3 drives lock()/unlock()/markInterruption() from the interruption module.
import { el } from "./ui.js";
import { log } from "./log.js";

export const BOX = { w: 900, h: 260 };
const LINE_H = 64;             // 3 visible lines = 192 px, centred in the 260 px box
const MAX_EXTRA = 6;           // max overflow chars per word (further keys are ignored and logged)
const IDLE_MS = 10000;
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph", "Fn", "FnLock",
  "NumLock", "ScrollLock", "OS", "Hyper", "Super", "Dead", "Process", "Unidentified", "Compose"]);

export function createTypingTask({ parent, passage, seconds, label, debug = false, onEnd, onStart, debugExtra, hintText = "" }) {
  const words = passage.words;
  const wordEls = [];
  const typedFinal = new Array(words.length).fill(null);
  const wordRecords = new Array(words.length).fill(null);   // per submitted word: what is needed to reopen it
  const reopenCount = new Array(words.length).fill(0);
  let mismatchLogged = false;

  // ---- DOM ----
  const wordsEl = el("div", { class: "tw-words" });
  words.forEach((w, i) => {
    const span = el("span", { class: "tw-word" },
      ...[...w].map(ch => el("span", { class: "tw-ch" }, ch)),
      el("span", { class: "tw-end" }));
    wordEls.push(span);
    wordsEl.append(span);
    if (i < words.length - 1) wordsEl.append(document.createTextNode(" "));
  });
  const viewport = el("div", { class: "tw-viewport" }, wordsEl);
  const box = el("div", { class: "typing-box" + (debug ? " aoi-debug" : "") }, viewport);
  box.style.width = BOX.w + "px";
  box.style.height = BOX.h + "px";
  const hint = el("p", { class: "tw-hint" }, hintText);
  const dbg = el("p", { class: "tw-debug" });
  dbg.hidden = !debug;
  const wrap = el("div", { class: "typing-view" }, box, hint, dbg);
  parent.replaceChildren(wrap);
  document.activeElement?.blur?.();

  // ---- state ----
  let idx = 0, typed = "";
  let firstKeyT = null, wordWrongKeys = 0, wordBackspaces = 0, wordStraddled = false;
  let started = false, ended = false, locked = false, lockReason = null;
  let startT = null, lastKeyT = null, lastErrorT = -Infinity;
  let endTimer = null, idleTimer = null, idleActive = false, idleStartT = null, dbgTimer = null;
  let printable = 0, printableCorrect = 0, goodChars = 0, wordsDone = 0;

  function paintWord(i, typedStr, final) {
    const target = words[i];
    const w = wordEls[i];
    const chars = w.querySelectorAll(".tw-ch:not(.tw-extra)");     // real letters only: extras must keep their class so they can be removed below
    chars.forEach((c, j) => {
      c.className = "tw-ch";
      if (j < typedStr.length) c.classList.add(typedStr[j] === target[j] ? "ok" : "bad");
      else if (final) c.classList.add("miss");
    });
    w.querySelectorAll(".tw-extra").forEach(n => n.remove());
    const end = w.querySelector(".tw-end");
    for (let j = target.length; j < typedStr.length; j++) end.before(el("span", { class: "tw-ch tw-extra bad" }, typedStr[j]));
    w.querySelectorAll(".tw-caret").forEach(n => n.classList.remove("tw-caret"));
    if (!final && i === idx) {
      if (typedStr.length < target.length) chars[typedStr.length].classList.add("tw-caret");
      else end.classList.add("tw-caret");
    }
    // Self-check: the screen must show exactly the target plus the extra letters typed. A mismatch is a UI bug and is logged (once per run).
    const expectedText = target + typedStr.slice(target.length);
    if (!mismatchLogged && w.textContent !== expectedText) {
      mismatchLogged = true;
      log("ui_mismatch", { idx: i, expected: expectedText, shown: w.textContent, typed: typedStr });
    }
  }

  function scrollToCurrent() {
    const line = Math.round(wordEls[idx].offsetTop / LINE_H);
    wordsEl.style.transform = `translateY(${-Math.max(0, line - 1) * LINE_H}px)`;
  }

  function resetIdle(t) {
    clearTimeout(idleTimer);
    if (idleActive) {
      idleActive = false;
      log("idle_end", { duration_ms: Number((t - idleStartT).toFixed(3)) }, t);
    }
    if (started && !ended && !locked) {
      idleTimer = setTimeout(() => {
        idleActive = true;
        idleStartT = t + IDLE_MS;
        log("idle_start", {}, idleStartT);
      }, IDLE_MS);
    }
  }

  function startTyping(t) {
    started = true;
    startT = t;
    hint.hidden = true;
    log("typing_start", { label, passage_id: passage.id, seconds }, t);
    onStart?.(t);
    endTimer = setTimeout(() => finish("time"), Math.max(0, seconds * 1000 - (performance.now() - t)));
  }

  function finish(reason) {
    if (ended) return;
    const t = performance.now();
    if (idleActive) { idleActive = false; log("idle_end", { duration_ms: Number((t - idleStartT).toFixed(3)), reason: "end" }, t); }
    ended = true;
    clearTimeout(endTimer); clearTimeout(idleTimer); clearInterval(dbgTimer);
    removeListeners();
    log("typing_end", {
      label, reason, elapsed_ms: started ? Number((t - startT).toFixed(3)) : 0,
      word_idx: idx, partial_typed: typed, words_done: wordsDone
    }, t);
    onEnd?.(reason);
  }

  function submitWord(t, e) {
    const target = words[idx];
    let correctChars = 0;
    for (let i = 0; i < Math.min(typed.length, target.length); i++) if (typed[i] === target[i]) correctChars++;
    const errors = Math.max(typed.length, target.length) - correctChars;
    log("word_done", {
      idx, target, typed, first_key_t: firstKeyT, space_t: Number(t.toFixed(3)),
      correct_chars: correctChars, errors, wrong_keys: wordWrongKeys, backspaces: wordBackspaces,
      straddled_interruption: wordStraddled, reopened: reopenCount[idx] > 0, reopen_count: reopenCount[idx]
    }, t);
    if (typed === target) goodChars += target.length + 1;
    typedFinal[idx] = typed;
    wordRecords[idx] = { typed, firstKeyT, wrongKeys: wordWrongKeys, backspaces: wordBackspaces, straddled: wordStraddled };
    paintWord(idx, typed, true);
    wordsDone++;
    idx++; typed = ""; firstKeyT = null; wordWrongKeys = 0; wordBackspaces = 0; wordStraddled = false;
    if (idx >= words.length) { finish("passage_end"); return; }
    paintWord(idx, "", false);
    scrollToCurrent();
  }

  // Step back into the previous (wrong) word so it can be corrected. The word_done of the first attempt stays in the log;
  // a new word_done follows with reopened:true. Analysis uses the LAST word_done per word idx.
  function reopenPrevious(t, e) {
    const from = idx, p = idx - 1, rec = wordRecords[p];
    idx = p; typed = rec.typed; firstKeyT = rec.firstKeyT; wordWrongKeys = rec.wrongKeys; wordBackspaces = rec.backspaces + 1; wordStraddled = rec.straddled;
    wordsDone--; typedFinal[p] = null; wordRecords[p] = null; reopenCount[p]++;
    log("key", keyData(e, { bs: true, reopen: true, w: p, c: typed.length }), t);
    log("word_reopen", { idx: p, typed, reopen_count: reopenCount[p] }, t);
    paintWord(from, "", false);        // the empty word we leave loses its caret
    paintWord(p, typed, false);        // the reopened word becomes active, caret at its end
    scrollToCurrent();
  }

  function keyData(e, extra) {
    return { key: e.key, code: e.code, repeat: e.repeat, shift: e.shiftKey, caps: e.getModifierState?.("CapsLock") ?? false, ...extra };
  }

  function onKeyDown(e) {
    if (ended) return;
    const t = e.timeStamp;
    const k = e.key;
    if (MODIFIER_KEYS.has(k) || e.isComposing) return;
    const wordBs = k === "Backspace" && (e.ctrlKey || e.altKey || e.metaKey);   // Ctrl/Alt/Cmd + Backspace: delete the whole word being typed
    if ((e.ctrlKey || e.metaKey) && !wordBs) { if (k.toLowerCase() === "v") e.preventDefault(); return; } // let browser shortcuts through, block paste
    // The words are letters only, so numpad keys never belong to the task. This also protects the task from stray presses on an
    // external numpad keyboard that serves as the physical resume button.
    if (e.code && e.code.startsWith("Numpad")) {
      e.preventDefault();
      log(locked ? "key_blocked" : "key_ignored", keyData(e, locked ? { reason: lockReason } : { reason: "numpad" }), t);
      return;
    }

    const isSpace = k === " ";
    const isBack = k === "Backspace";
    const isChar = k.length === 1 && !isSpace;
    if (!(isSpace || isBack || isChar)) {
      if (k === "Tab" || k === "Enter") e.preventDefault();
      if (locked) log("key_blocked", keyData(e, { reason: lockReason }), t);
      else if (k === "Tab" || k === "Enter") log("key_ignored", keyData(e, { reason: "blocked_key" }), t);
      return;
    }
    e.preventDefault();
    if (locked) { log("key_blocked", keyData(e, { reason: lockReason }), t); return; }
    if (e.repeat) { log("key", keyData(e, { counted: false, w: idx, c: typed.length }), t); return; }
    if (!started) startTyping(t);
    lastKeyT = t;
    resetIdle(t);

    const target = words[idx];
    if (isBack) {
      if (typed.length === 0) {
        // Like Monkeytype: Backspace on an empty word steps back into the previous word, but only if that word was typed wrong.
        if (idx > 0 && wordRecords[idx - 1] && wordRecords[idx - 1].typed !== words[idx - 1]) { reopenPrevious(t, e); return; }
        log("key", keyData(e, { bs: true, noop: true, w: idx, c: 0 }), t);
        return;
      }
      typed = wordBs ? "" : typed.slice(0, -1);
      wordBackspaces++;
      log("key", keyData(e, { bs: true, bs_word: wordBs, w: idx, c: typed.length }), t);
      paintWord(idx, typed, false); scrollToCurrent();
      return;
    }
    if (isSpace) {
      if (typed.length === 0) { log("key_ignored", keyData(e, { reason: "empty_word" }), t); return; }
      log("key", keyData(e, { expected: " ", correct: typed === target, bs: false, w: idx, c: typed.length }), t);
      submitWord(t, e);
      return;
    }
    // printable character
    if (typed.length >= target.length + MAX_EXTRA) { log("key_ignored", keyData(e, { reason: "overflow", w: idx }), t); return; }
    const c = typed.length;
    const expected = c < target.length ? target[c] : null;
    const correct = expected === k;
    if (c === 0) firstKeyT = Number(t.toFixed(3));
    typed += k;
    printable++;
    if (correct) printableCorrect++; else { wordWrongKeys++; lastErrorT = t; }
    log("key", keyData(e, { expected, correct, bs: false, w: idx, c }), t);
    paintWord(idx, typed, false); scrollToCurrent();
  }

  const blockClipboard = (e) => e.preventDefault();
  function removeListeners() {
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("paste", blockClipboard, true);
    document.removeEventListener("drop", blockClipboard, true);
  }
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("paste", blockClipboard, true);
  document.addEventListener("drop", blockClipboard, true);

  paintWord(0, "", false);
  scrollToCurrent();
  const r = box.getBoundingClientRect();
  const aoi = { x: r.left, y: r.top, w: r.width, h: r.height };
  log("typing_ready", { label, passage_id: passage.id, seed: passage.seed, n_words: words.length, mean_len: passage.meanLen, seconds, aoi_text: aoi, window: { w: innerWidth, h: innerHeight } });

  if (debug) {
    dbgTimer = setInterval(() => {
      if (!started) { dbg.textContent = "debug: waiting for first key"; return; }
      const el_s = (performance.now() - startT) / 1000;
      const wpm = (goodChars / 5) / (el_s / 60);
      const acc = printable ? (printableCorrect / printable * 100) : 100;
      dbg.textContent = `debug: ${el_s.toFixed(0)}/${seconds}s | words ${wordsDone} | net ${wpm.toFixed(0)} wpm | key acc ${acc.toFixed(1)}%${locked ? " | LOCKED " + lockReason : ""}${debugExtra ? " | " + debugExtra() : ""}`;
    }, 250);
  }

  return {
    lock(reason = "locked") {
      if (locked || ended) return;
      const t = performance.now();
      if (idleActive) { idleActive = false; log("idle_end", { duration_ms: Number((t - idleStartT).toFixed(3)), reason: "lock" }, t); }
      clearTimeout(idleTimer);
      locked = true; lockReason = reason;
      box.classList.add("locked");
    },
    unlock() {
      if (!locked || ended) return;
      locked = false; lockReason = null;
      box.classList.remove("locked");
      resetIdle(performance.now());
    },
    markInterruption() { if (typed.length > 0) wordStraddled = true; },
    stop(reason = "stopped") { finish(reason); },
    getState: () => ({ idx, target: words[idx], typed, started, ended, locked, lastKeyT, lastErrorT, startT, wordsDone }),
    box, wrap
  };
}
