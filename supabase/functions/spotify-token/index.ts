// Token broker with a pool of Spotify accounts.
// A session leases ONE free enabled account (leases last 120 s and are renewed by the app calling "token" every ~45 s),
// so several sessions can run at once as long as there are enough linked accounts. Refresh tokens never leave the server.
//
// POST { action: "token" | "release", key, pid, session_id }
//   token   -> { access_token, expires_in, account: { label } }  | 409 { error: "no_free_account" }
//   release -> { ok: true }
// Deployed with verify_jwt = false. Gate: Origin allow-list + STUDY_KEY secret.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "7bb2a29fb58e49989c6e0ffe11162254"; // public
const studyKey = () => Deno.env.get("STUDY_KEY") ?? Deno.env.get("STUD_KEY") ?? "";   // STUD_KEY accepted as a typo fallback   // read per request so a newly added secret takes effect immediately
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://anshbhagania.github.io,http://localhost:8765").split(",");
const LEASE_S = 120;

const cache = new Map<string, { token: string; exp: number }>();

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405, cors);
  if (!ALLOWED.includes(origin)) return json({ error: "origin" }, 403, cors);
  if (!studyKey()) return json({ error: "not_configured" }, 500, cors);

  const body = await req.json().catch(() => ({}));
  if (body.key !== studyKey()) return json({ error: "key" }, 401, cors);
  if (!/^[A-Za-z0-9_-]{1,16}$/.test(body.pid ?? "")) return json({ error: "pid" }, 400, cors);
  if (!/^[0-9a-f-]{36}$/i.test(body.session_id ?? "")) return json({ error: "session_id" }, 400, cors);
  const session = body.session_id as string;

  if (body.action === "release") {
    await rest("rpc/release_spotify_account", { method: "POST", body: JSON.stringify({ p_session: session }) });
    return json({ ok: true }, 200, cors);
  }
  if (body.action !== "token") return json({ error: "action" }, 400, cors);

  const claim = await rest("rpc/claim_spotify_account", { method: "POST", body: JSON.stringify({ p_session: session, p_seconds: LEASE_S }) });
  const accountId = await claim.json();
  if (!claim.ok) return json({ error: "claim_failed" }, 500, cors);
  if (!accountId) return json({ error: "no_free_account" }, 409, cors);

  const accRes = await rest(`spotify_accounts?id=eq.${accountId}&select=label,refresh_token`);
  const acc = (await accRes.json())[0];
  if (!acc) return json({ error: "account_missing" }, 500, cors);

  let c = cache.get(accountId);
  if (!c || c.exp < Date.now() + 120_000) {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: acc.refresh_token, client_id: CLIENT_ID }),
    });
    const j = await res.json();
    if (!res.ok) {
      await rest("rpc/release_spotify_account", { method: "POST", body: JSON.stringify({ p_session: session }) });
      return json({ error: "account_auth_failed", label: acc.label, detail: j.error }, 502, cors);
    }
    c = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    cache.set(accountId, c);
    if (j.refresh_token && j.refresh_token !== acc.refresh_token) {   // Spotify rotated it: keep the newest
      await rest(`spotify_accounts?id=eq.${accountId}`, { method: "PATCH", body: JSON.stringify({ refresh_token: j.refresh_token }) });
    }
  }
  rest(`sessions?session_id=eq.${session}`, { method: "PATCH", body: JSON.stringify({ spotify_label: acc.label }) });
  return json({ access_token: c.token, expires_in: Math.floor((c.exp - Date.now()) / 1000), account: { label: acc.label } }, 200, cors);
});
