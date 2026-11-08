// Token broker: keeps the study owner's Spotify refresh token server-side and hands the web app a
// short-lived access token. Deploy with "Verify JWT" OFF; access is gated by STUDY_KEY and Origin.
//
// Secrets (Supabase > Edge Functions > Secrets), never commit them:
//   SPOTIFY_CLIENT_ID, SPOTIFY_REFRESH_TOKEN, STUDY_KEY
// Optional: ALLOWED_ORIGINS (comma separated, default below)

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
const STUDY_KEY = Deno.env.get("STUDY_KEY") ?? "";
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://anshbhagania.github.io,http://localhost:8765").split(",");

let refreshToken = Deno.env.get("SPOTIFY_REFRESH_TOKEN") ?? "";
let cache: { token: string; exp: number } | null = null;

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405, cors);
  if (!ALLOWED.includes(origin)) return json({ error: "origin" }, 403, cors);
  if (!CLIENT_ID || !STUDY_KEY || !refreshToken) return json({ error: "not_configured" }, 500, cors);

  const body = await req.json().catch(() => ({}));
  if (!STUDY_KEY || body.key !== STUDY_KEY) return json({ error: "key" }, 401, cors);
  if (!/^[A-Za-z0-9_-]{1,16}$/.test(body.pid ?? "")) return json({ error: "pid" }, 400, cors);

  if (cache && cache.exp > Date.now() + 120_000) {
    return json({ access_token: cache.token, expires_in: Math.floor((cache.exp - Date.now()) / 1000) }, 200, cors);
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: CLIENT_ID }),
  });
  const j = await res.json();
  if (!res.ok) return json({ error: "spotify", detail: j.error }, 502, cors);
  if (j.refresh_token) refreshToken = j.refresh_token; // Spotify may rotate it; the old one normally stays valid too
  cache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return json({ access_token: j.access_token, expires_in: j.expires_in }, 200, cors);
});
