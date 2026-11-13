// Event log. Stage 1: in-memory buffer + localStorage mirror + JSON download.
// Stage 5 adds the Supabase upload queue on top of this buffer (see db.js).
const buffer = [];
let seq = 0;
const ctx = { session_id: null, pid: null, phase: "welcome", block: 0, condition: null, intr: 0 };
let persistTimer = null;
let onEventHook = null;
export function setOnEvent(fn) { onEventHook = fn; }

export function setContext(patch) {
  Object.assign(ctx, patch);
  // Events logged before the session existed (e.g. ui_scale, 400 ms after boot, while the settings were still loading) carry no ids:
  // give them the ids now, otherwise the database rejects the whole first upload batch (session_id is NOT NULL).
  if (ctx.session_id) for (const e of buffer) if (e.session_id == null) { e.session_id = ctx.session_id; e.pid = ctx.pid; }
}
export function getContext() { return { ...ctx }; }

export function log(type, data = {}, t) {
  const ev = {
    session_id: ctx.session_id,
    pid: ctx.pid,
    seq: seq++,
    t: Number((t ?? performance.now()).toFixed(3)),
    phase: ctx.phase,
    block: ctx.block,
    condition: ctx.condition,
    intr: ctx.intr,
    type,
    data
  };
  buffer.push(ev);
  schedulePersist();
  onEventHook?.(buffer.length);
  return ev;
}

export function getEvents() { return buffer; }

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try { localStorage.setItem("rhythm_log_" + ctx.session_id, JSON.stringify(buffer)); } catch (e) { /* storage may be full or blocked */ }
  }, 500);
}

export function downloadLog() {
  const blob = new Blob([JSON.stringify(buffer, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rhythm_${ctx.pid}_${ctx.session_id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
