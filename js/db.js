// Batched, idempotent upload of the event buffer to Supabase (via insert-only RPC functions).
// Never blocks the UI. Failed batches retry with backoff; duplicates are ignored server-side on (session_id, seq).
import { CONFIG } from "./config.js";
import { getEvents, setOnEvent, log } from "./log.js";

let sent = 0, inflight = false, failures = 0, nextTryAt = 0, sessionRowSent = false, timer = null;
let ctx = null, lastError = null, isolate = 0, dropped = 0;   // isolate > 0: send one event at a time after the server rejected a batch (400)

function rpc(fn, body, keepalive = false) {
  return fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST", keepalive,
    headers: { apikey: CONFIG.supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(async (r) => { if (!r.ok) throw new Error(`${fn} ${r.status} ${(await r.text()).slice(0, 120)}`); });
}

export function startDb(session, startData) {
  ctx = { session, startData };
  setOnEvent((n) => { if (n - sent >= CONFIG.flushMaxEvents) flush(); });
  timer = setInterval(flush, CONFIG.flushIntervalMs);
  window.addEventListener("pagehide", () => { flush(true); session.audio.release?.(true); });
  flush();
}

export async function flush(onHide = false) {
  if (!ctx || inflight || Date.now() < nextTryAt) return;
  const events = getEvents();
  inflight = true;
  try {
    if (!sessionRowSent) {
      const s = ctx.session;
      await rpc("ingest_session", { p_row: { session_id: s.id, pid: s.pid, order_code: s.order.code, app_version: ctx.startData.app_version, flags: s.flags, device: ctx.startData } });
      sessionRowSent = true;
    }
    if (sent < events.length) {
      const size = isolate > 0 ? 1 : (onHide ? 50 : CONFIG.flushMaxEvents);
      const batch = events.slice(sent, sent + size).map((e) => e.session_id ? e : { ...e, session_id: ctx.session.id, pid: ctx.session.pid });
      try {
        await rpc("ingest_events", { p_rows: batch }, onHide);
        if (isolate > 0) isolate--;
      } catch (e) {
        if (!/ingest_events 400/.test(String(e.message))) throw e;
        if (batch.length > 1) { isolate = 30; throw e; }            // find the rejected event by sending one at a time
        dropped++; isolate = 30;                                    // a single event the server refuses: skip it, keep the session
        log("upload_dropped", { seq: batch[0].seq, type: batch[0].type, message: String(e.message).slice(0, 160), dropped });
      }
      sent += batch.length;
    }
    failures = 0; lastError = null;
  } catch (e) {
    failures++; lastError = String(e.message || e);
    nextTryAt = Date.now() + Math.min(30000, 1000 * 2 ** failures);
    if (failures === 1 || failures % 5 === 0) log("upload_error", { message: lastError, failures });
  } finally {
    inflight = false;
  }
  if (!lastError && sent < getEvents().length) setTimeout(flush, 0);
}

// For the Done screen: wait until everything is uploaded (or give up).
export async function flushAll(timeoutMs = 20000) {
  const t0 = Date.now();
  nextTryAt = 0;
  while (Date.now() - t0 < timeoutMs) {
    await flush();
    if (sessionRowSent && sent >= getEvents().length) return { ok: true, sent, total: getEvents().length };
    await new Promise(r => setTimeout(r, 400));
    nextTryAt = 0;
  }
  return { ok: false, sent, total: getEvents().length, error: lastError };
}

export const dbEnabled = () => !!ctx;
