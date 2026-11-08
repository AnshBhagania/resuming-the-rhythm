// Study settings the researchers can change from the admin page without a code change.
// Loaded once at boot (2.5 s timeout), validated and clamped, and logged with the session so every session records what it ran with.
import { CONFIG } from "./config.js";

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export function sanitizeGaze(raw = {}) {
  const d = CONFIG.gaze;
  return {
    enabled: raw.enabled === undefined ? d.enabled : !!raw.enabled,
    optional: raw.optional === undefined ? d.optional : !!raw.optional,
    gridCols: Math.round(clamp(raw.gridCols, 2, 5, d.gridCols)),
    gridRows: Math.round(clamp(raw.gridRows, 2, 5, d.gridRows)),
    clicksPerPoint: Math.round(clamp(raw.clicksPerPoint, 1, 10, d.clicksPerPoint)),
    validationDwellMs: Math.round(clamp(raw.validationDwellMs, 1000, 6000, d.validationDwellMs)),
    validationSettleMs: Math.round(clamp(raw.validationSettleMs, 200, 2000, d.validationSettleMs)),
    maxErrorPx: Math.round(clamp(raw.maxErrorPx, 50, 800, d.maxErrorPx)),
    maxAttempts: Math.round(clamp(raw.maxAttempts, 1, 5, d.maxAttempts)),
    sampleCapHz: Math.round(clamp(raw.sampleCapHz, 5, 60, d.sampleCapHz))
  };
}

export async function loadSettings() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/get_study_settings`, {
      method: "POST", signal: ctl.signal, headers: { apikey: CONFIG.supabaseKey, "Content-Type": "application/json" }, body: "{}"
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return { source: "db", updated_at: j?.updated_at ?? null, gaze: sanitizeGaze(j?.settings?.gaze) };
  } catch (e) {
    return { source: "default", error: String(e.message || e), updated_at: null, gaze: sanitizeGaze({}) };
  } finally { clearTimeout(timer); }
}
