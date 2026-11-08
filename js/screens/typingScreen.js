// Shared runner: loads the word pool, builds a seeded passage, runs the typing task, then shows a "finished" card.
import { el, screen, mount, continueBtn } from "../ui.js";
import { loadWords, generatePassage } from "../passage.js";
import { createTypingTask } from "../typing.js";

export async function runTypingScreen(root, api, { label, seed, seconds, onEnd, onStart, debugExtra, nWords = 400 }) {
  mount(root, screen("Loading...", el("p", {}, "")));
  let pool;
  try {
    pool = await loadWords();
  } catch (e) {
    mount(root, screen("Could not load", el("p", {}, "The word list failed to load. Check your connection and try again."),
      continueBtn(() => runTypingScreen(root, api, { label, seed, seconds, onEnd, onStart, debugExtra, nWords }), "Retry")));
    return;
  }
  const passage = generatePassage(pool, seed, { n: nWords });
  const audio = api.session.audio;
  audio.showStatus(true);
  mount(root, screen("Get ready", el("p", {}, "Starting the music...")));
  await audio.play({ reason: "phase_start_" + label });      // typing is locked until music is playing
  const task = createTypingTask({
    parent: root, passage, seconds, label, debug: api.session.flags.debug, onStart, debugExtra,
    onEnd: (reason) => {
      onEnd?.(reason);   // hook (e.g. clear timers); the finished card always follows
      audio.pause("phase_end_" + label);
      audio.showStatus(false);
      const c = api.content.typingDone;
      mount(root, screen(c.title, el("p", {}, c.body), continueBtn(api.next)));
    }
  });
  window.__typing = task; // handy in debug
  return task;
}
