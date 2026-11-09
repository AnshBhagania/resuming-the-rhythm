// Shared runner: loads the word pool, builds a seeded passage, runs the typing task, then shows a "finished" card.
import { el, screen, mount, continueBtn } from "../ui.js";
import { loadWords, generatePassage } from "../passage.js";
import { createTypingTask } from "../typing.js";

export async function runTypingScreen(root, api, { label, seed, seconds, onEnd, onStart, debugExtra, nWords = 400 }) {
  const ui = api.content.ui;
  mount(root, screen(ui.loading, el("p", {}, "")));
  let pool;
  try {
    pool = await loadWords();
  } catch (e) {
    mount(root, screen(ui.couldNotLoad, el("p", {}, ui.wordListFailed),
      continueBtn(() => runTypingScreen(root, api, { label, seed, seconds, onEnd, onStart, debugExtra, nWords }), ui.retry)));
    return;
  }
  const passage = generatePassage(pool, seed, { n: nWords });
  const audio = api.session.audio;
  audio.showStatus(true);
  mount(root, screen(ui.getReady, el("p", {}, ui.startingMusic)));
  await audio.play({ reason: "phase_start_" + label });      // typing is locked until music is playing
  document.body.classList.add("typing-active");     // hides the progress bar while typing
  const task = createTypingTask({
    parent: root, passage, seconds, label, debug: api.session.flags.debug, onStart, debugExtra, hintText: ui.startTypingHint, reopenCorrect: api.cfg.reopenCorrectWords !== false,
    onEnd: (reason) => {
      document.body.classList.remove("typing-active");
      onEnd?.(reason);   // hook (e.g. clear timers); the finished card always follows
      audio.pause("phase_end_" + label);
      audio.showStatus(false);
      const c = api.content.typingDone;
      mount(root, screen(c.title, el("p", {}, c.body), continueBtn(api.next)));
    }
  });
  if (api.session.flags.debug) window.__typing = task; // handy in debug
  return task;
}
