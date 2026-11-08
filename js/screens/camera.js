import { infoScreen } from "../ui.js";
// Stage 7 replaces this with the real camera permission flow. Skips gracefully until then.
export function render(root, api) { infoScreen(root, api, "camera"); }
