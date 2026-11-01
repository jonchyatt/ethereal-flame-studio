# YouTube private draft credentials

The uploader accepts `channelKey: "primary"`, `"waia"`, or `"critfail"` in the render-pack publish request and in publish-job metadata. Missing keys preserve the legacy primary slot. Each slot uses its own credentials; it never borrows a different channel's token or client.

| Channel key | Variable prefix | Default video category | Required authenticated channel |
| --- | --- | --- | --- |
| primary | `YOUTUBE_PUBLISH_` | 10 (Music) | Existing WAIA gate, unchanged |
| waia | `YOUTUBE_PUBLISH_WAIA_` | 22 (People and Blogs) | `UCyq4s4Nei7Q26tu7EIQY7xw` |
| critfail | `YOUTUBE_PUBLISH_CRITFAIL_` | 23 (Comedy) | `UCXY-lg-p5LwXLGneUTUlDQg` |

Append `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` to the prefix. A static `ACCESS_TOKEN` is supported only when no refresh token is configured; it expires. Missing or blank credentials cause an error naming the variables, never a successful manual-draft manifest. YouTube API failures also remain errors even when the generic connector fallback switch is enabled. The authenticated channel is checked before the video is downloaded or uploaded.

Use the slot's `DEFAULT_CATEGORY_ID` to override its category (for example `YOUTUBE_PUBLISH_WAIA_DEFAULT_CATEGORY_ID=26` for Howto and Style). A global primary category does not override the named channels. Named-channel uploads are private even if the global privacy setting requests another visibility, and scheduled publication is rejected before API activity. Existing curation checks still apply.

## OAuth setup

Populate the intended slot's `CLIENT_ID` and `CLIENT_SECRET` in this checkout's ignored `.env.local`. Do not paste values into logs, tickets, or commits. An existing Desktop OAuth client was found in Jarvis's `.env.local` under `GOOGLE_WORKSPACE_CLI_CLIENT_ID` and `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET`; it matches the local Google Workspace CLI `client_secret.json` for project `jarvis-gws-490620`. Its YouTube Data API enablement and YouTube scope consent have not been verified. Reuse the client pair only, not an existing Workspace or primary-channel refresh token.

From the checkout containing the configured `.env.local`, run one channel at a time:

```sh
node scripts/youtube-mint-token.mjs waia
node scripts/youtube-mint-token.mjs critfail
```

Keep the command running and open the printed URL in Jon's existing Chrome profile. Select the intended YouTube channel. The conductor performs this consent step after the code ticket. The script requests only `youtube.upload` and `youtube.readonly`, uses offline consent with state and PKCE, exchanges the callback, atomically writes the refresh token, then prints the token-bound channel title and ID. A failed channel lookup is reported explicitly even if the token was saved. Compare the printed ID with the table before proceeding.

The default loopback callback is `http://127.0.0.1:8765/oauth2callback`. This is a PC-local OAuth callback, not a phone delivery URL. The existing discovered client is a Desktop app. If using a Web application client, its authorized redirect must match exactly. Set the slot's `REDIRECT_URI` or pass `--redirect-uri http://localhost:8765/oauth2callback` when that is the registered redirect. No browser is launched automatically. The listener exits after five minutes without consent; rerun the command to get a fresh URL.

## Check without uploading

```sh
node scripts/youtube-check-auth.mjs
node scripts/youtube-check-auth.mjs waia --probe
node scripts/youtube-check-auth.mjs critfail --probe
```

Without `--probe`, only variable names and presence are printed, with no network call. The probe calls `channels.list(mine=true)`; it never uploads or changes visibility. Its channel output is an identity receipt, not proof of an uploaded draft.

## Local checks

```sh
node --test scripts/youtube-oauth.test.mjs
node node_modules/jest/bin/jest.js --runInBand
node node_modules/next/dist/bin/next build
```

The last command is the application build stage. The package's `npm run build` also executes `drizzle-kit push --force`; running the build stage directly avoids modifying a configured database during this code check.

References: [Google Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [YouTube channels.list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list). The Crit Fail expected ID comes from Jarvis's authenticated Studio receipt `data/crit-fail-relaunch/runtime-logs/REVIEW-jon-six-videos-2026-09-30.md`; every upload rechecks the current token binding.
