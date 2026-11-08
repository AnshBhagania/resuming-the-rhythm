# Spotify setup (shared study account)

Participants choose their own music. Playback uses the Spotify Web Playback SDK, authenticated as ONE Premium owner account.
Participant browsers never see the refresh token; a Supabase Edge Function hands out short-lived access tokens.

## One-time setup (owner)

1. https://developer.spotify.com/dashboard -> Create app.
   - Redirect URI: `https://anshbhagania.github.io/resuming-the-rhythm/tools/spotify-setup.html`
   - APIs used: Web API, Web Playback SDK.
   - Copy the **Client ID** (public). Do not share the client secret (not needed).
2. Open the redirect URI above, paste the Client ID, authorize as the Premium owner account.
   The page shows a refresh token and confirms `product: premium`.
3. Supabase -> Edge Functions -> create `spotify-token`, paste `supabase/functions/spotify-token/index.ts`,
   turn **Verify JWT off**, deploy.
4. Supabase -> Edge Functions -> Secrets:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_REFRESH_TOKEN`
   - `STUDY_KEY` (random string; goes into participant links as `&k=...`)
5. Participant link: `https://anshbhagania.github.io/resuming-the-rhythm/?pid=P07&k=<STUDY_KEY>`

Rotate by revoking the app at https://www.spotify.com/account/apps and repeating step 2 and the secret update.

## Constraints that shape the study

- **One stream per account.** Spotify allows one active playback session per account. Two participants running at once
  will kick each other out. Run sessions one at a time. The app logs SDK errors and "playback moved to another device".
- **Terms of service.** Sharing one Premium account across participants is not what Spotify's terms intend. Check with
  Spotify/KTH ethics if this matters for the report; keep the account dedicated to the study.
- **Latency is real.** Resume latency depends on each participant's network. The app logs both the call time
  (`audio_play_called`) and the SDK `playing` state change (`music_play`) so analysis can model it.
- **Lyrics.** Own-choice music may contain lyrics, which can interfere with typing. The app logs track id and name.
  Decide whether to require instrumental tracks or record a lyrics yes/no.
- **Exposure.** The token carries `user-read-email` and `user-read-private` (required by the SDK), so anyone who
  captures a token could read the owner profile. Use a dedicated study account, not a personal one.
