import { runTypingScreen } from "./typingScreen.js";

// Stage 2: plain timed typing per block. Stage 3 replaces the fixed length with 4 interruptions.
export function render(root, api) {
  const { block } = api.step;
  runTypingScreen(root, api, { label: "block" + block, seed: api.session.seeds["block" + block], seconds: api.cfg.blockPlaceholderSeconds });
}
