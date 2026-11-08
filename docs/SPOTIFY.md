# Spotify accounts (pool)

Participants choose their own music (a public playlist link). Playback uses the Web Playback SDK, authenticated as one of
several linked Premium accounts. Participant browsers never see a refresh token; the `spotify-token` Edge Function leases one
free account per session and hands out short-lived access tokens. Run as many parallel sessions as you have linked accounts.

## Linking accounts (admins)

1. Spotify app (developer.spotify.com/dashboard) Redirect URIs must include
   `https://anshbhagania.github.io/resuming-the-rhythm/admin/` (the old `tools/spotify-setup.html` URI is no longer used).
2. Open the admin page, sign in, tab **Spotify accounts**, enter a label, click *Authorize with Spotify*.
   Be signed in to Spotify in that browser as the account being added (Premium). Mina does the same with her account.
3. Accounts can be disabled, freed (release a stuck lease) or removed on the same page.

## Secrets (Supabase > Edge Functions > Secrets)

- `STUDY_KEY`: random string. Participant links carry it: `...?pid=P07&k=<STUDY_KEY>`
- Optional `SPOTIFY_CLIENT_ID` (defaults to the public client id in the function) and `ALLOWED_ORIGINS`.

## Constraints that shape the study

- **One stream per Spotify account.** Each session leases a separate account; if all are busy the app shows
  "All Spotify accounts are in use" and retries every 10 s. Leases expire 120 s after the last heartbeat.
- **Terms of service.** Sharing Premium accounts across participants is not what Spotify's terms intend. Use dedicated
  study accounts and check with KTH ethics if the report needs it.
- **Latency.** Resume latency depends on the participant's network. The log has both `audio_play_called` and `music_play`.
- **Lyrics.** Own-choice music may contain lyrics; decide whether to require instrumental tracks.
- **Exposure.** Tokens carry `user-read-email` and `user-read-private` (required by the SDK). Use dedicated accounts.
