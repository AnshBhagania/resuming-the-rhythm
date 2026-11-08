// Admin-only management of the Spotify account pool. Requires a signed-in admin (JWT verified by the platform,
// and the email must be in public.admin_emails).
//
// POST { action: "link", refresh_token, label } | { action: "set_enabled", id, enabled } | { action: "delete", id } | { action: "release", id }

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "7bb2a29fb58e49989c6e0ffe11162254"; // public
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://anshbhagania.github.io,http://localhost:8765").split(",");

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

  // Who is calling?
  const userRes = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: req.headers.get("authorization") ?? "" } });
  if (!userRes.ok) return json({ error: "not_signed_in" }, 401, cors);
  const email = ((await userRes.json()).email ?? "").toLowerCase();
  const adm = await (await rest(`admin_emails?email=eq.${encodeURIComponent(email)}&select=email`)).json();
  if (!email || !Array.isArray(adm) || adm.length === 0) return json({ error: "not_admin" }, 403, cors);

  const body = await req.json().catch(() => ({}));
  const uuid = /^[0-9a-f-]{36}$/i;

  if (body.action === "link") {
    const label = String(body.label ?? "").trim().slice(0, 40);
    if (!label || typeof body.refresh_token !== "string") return json({ error: "bad_request" }, 400, cors);
    const tok = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: body.refresh_token, client_id: CLIENT_ID }),
    });
    const tj = await tok.json();
    if (!tok.ok) return json({ error: "spotify_rejected", detail: tj.error }, 400, cors);
    const me = await (await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${tj.access_token}` } })).json();
    if (me.product !== "premium") return json({ error: "not_premium", product: me.product ?? null }, 400, cors);
    const r = await rest("spotify_accounts?on_conflict=spotify_user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        label, spotify_user_id: me.id, display_name: me.display_name ?? me.id, product: me.product,
        refresh_token: tj.refresh_token ?? body.refresh_token, enabled: true,
      }),
    });
    if (!r.ok) return json({ error: "db", detail: await r.text() }, 500, cors);
    const row = (await r.json())[0];
    return json({ ok: true, id: row.id, label: row.label, display_name: row.display_name }, 200, cors);
  }

  if (!uuid.test(body.id ?? "")) return json({ error: "bad_id" }, 400, cors);
  const id = body.id;
  if (body.action === "set_enabled") {
    await rest(`spotify_accounts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ enabled: !!body.enabled }) });
    return json({ ok: true }, 200, cors);
  }
  if (body.action === "release") {
    await rest(`spotify_accounts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ lease_session: null, lease_expires: null }) });
    return json({ ok: true }, 200, cors);
  }
  if (body.action === "delete") {
    await rest(`spotify_accounts?id=eq.${id}`, { method: "DELETE" });
    return json({ ok: true }, 200, cors);
  }
  return json({ error: "action" }, 400, cors);
});
