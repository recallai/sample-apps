# Recall.ai Output Media + LiveKit Voice Agent

This sample bridges meeting audio from a Recall.ai Output Media page into a
LiveKit room, then plays the LiveKit Agent's response back through the page and
into the meeting.

The LiveKit modules are intentionally independent of React, Express, Tailwind,
and the signed-URL example so they can be reused in another application.

## Media flow

1. Recall creates a meeting bot whose camera is this webpage.
2. The webpage receives mixed meeting audio with `getUserMedia({ audio: true })`.
3. The bridge publishes that audio as one LiveKit microphone track.
4. A token-embedded dispatch starts the named LiveKit Agent in the same unique
   room.
5. The agent listens only to the Recall bridge participant.
6. The bridge subscribes only to that agent's microphone audio and attaches it
   to one audio element. Recall streams the element's playback into the meeting.

The LiveKit Agent SDK handles turn detection and interruptions, so a meeting
participant can speak over the response to interrupt it.

## Prerequisites

- Node.js 20.19 or newer
- A Recall.ai workspace using API v1.11
- A Recall API key and meeting URL
- A LiveKit Cloud project with Agents and Inference enabled
- A public HTTPS tunnel such as a reserved ngrok domain

If a coding agent will modify this integration, connect the Recall.ai MCP for
the same Recall region. In Cursor, add this to `~/.cursor/mcp.json`, replacing
the URL for US West, Europe, or Asia Pacific when needed:

```json
{
    "mcpServers": {
        "recall-ai": {
            "url": "https://us-east-1.recall.ai/mcp"
        }
    }
}
```

Complete the OAuth flow after restarting or reloading Cursor. The MCP provides
current Recall API fields and behavior; the local examples are not the source
of truth.

## Setup

From the repository root:

```sh
npm install
cd bot_output_media_livekit_voice_agent
cp .env.sample .env
```

Create the Output Media signing secret:

```sh
openssl rand -base64 32
```

Fill in `.env`:

- `RECALL_REGION`: one of `us-east-1`, `us-west-2`, `eu-central-1`, or
  `ap-northeast-1`
- `RECALL_API_KEY`: server-side Recall API key
- `MEETING_URL`: Zoom, Google Meet, Microsoft Teams, or Webex meeting URL
- `PUBLIC_BASE_URL`: public HTTPS URL that routes to Vite on port 5173
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`: LiveKit project
  credentials
- `LIVEKIT_AGENT_NAME`: explicit-dispatch name; use the same value for the
  token server, bot creator, and agent
- `OUTPUT_MEDIA_SIGNING_SECRET`: the generated secret

The default STT, LLM, and TTS descriptors use LiveKit Inference, so separate
provider credentials are not required. Change the descriptor variables to use
other models without changing the bridge.

The LiveKit CLI can authenticate and verify the selected project:

```sh
lk cloud auth
```

## Run

Start the Vite page, Express token API, and LiveKit Agent worker:

```sh
npm run dev
```

Expose port 5173 through a stable HTTPS tunnel. Vite proxies `/api` to Express,
so only one public URL is required. For example:

```sh
ngrok http 5173
```

Set `PUBLIC_BASE_URL` to that HTTPS URL, restart the processes after changing
`.env`, then create the Recall bot:

```sh
npm run bot:create
```

The command prints only the bot ID. Open Recall Bot Explorer to inspect its
lifecycle or launch Remote DevTools.

When the bot joins, the page should show all four checkpoints:

- Recall page loaded
- LiveKit connected
- Meeting audio published
- Agent audio attached

Speak in the meeting. The agent should answer through the bot. Begin another
sentence while it is talking to verify barge-in.

## Use this in your stack

The portable LiveKit path is:

- `src/livekit/identity.ts`: deterministic room, bridge, and agent identities
  shared by token creation and the worker
- `src/livekit/create_bridge_token.ts`: creates a room-scoped participant token
  with microphone-only publishing, subscriptions, and an atomic named-agent
  dispatch
- `src/livekit/browser_bridge.ts`: connects with automatic subscription off,
  publishes Recall meeting audio, selects the named agent's microphone track,
  attaches playback, and reconciles restarts and reconnects
- `src/livekit/track_selection.ts`: the explicit participant and track filter
- `src/agent/models.ts`: all provider and model descriptor construction
- `src/agent/agent.ts`: the provider-swappable voice-safe agent prompt and LLM
- `src/agent/main.ts`: the named worker, deterministic participant identity,
  inference pipeline, turn detector, interruption behavior, and bridge-only
  input binding

`create_bridge_token` accepts verified session claims plus LiveKit server
credentials and returns only browser-safe connection details. The browser
bridge accepts those details, one managed audio element, and a status callback.
Its invariants are one meeting microphone publication and one attached agent
audio track.

The following files are replaceable adapters:

- Replace `src/server/` with any backend that verifies the application session
  and calls `create_bridge_token`.
- Replace `src/client/App.tsx` and Tailwind with any UI that supplies an audio
  element and consumes bridge status events.
- Replace Vite with another browser build system.
- Replace `src/auth/session_token.ts` with your normal application auth.

The `jose` session token is an application-auth example, not a LiveKit
requirement. Do not move LiveKit API credentials or Recall API keys into browser
code.

## Security behavior

- The bot creator places a short-lived signed session in the Output Media URL.
- The page immediately moves it to `sessionStorage` and removes it from the
  visible URL.
- The Express route derives room, participant, and agent values only from
  verified claims.
- The LiveKit token is scoped to one room, microphone publication, and
  subscriptions. It cannot publish data or update participant metadata.
- Logs contain lifecycle names, timings, and error classes, but never URLs,
  query strings, signed sessions, API secrets, or LiveKit tokens.

## Troubleshooting

### No agent talkback

Confirm the worker is registered under the exact `LIVEKIT_AGENT_NAME`. In
Remote DevTools, verify the token endpoint succeeds, the agent participant has
the expected `voice-agent-...` identity and `agent` kind, and its microphone
track is published. The bridge deliberately ignores every other participant
and track.

### Autoplay failure

The Output Media browser normally permits playback after acquiring meeting
audio. An autoplay failure is shown as a terminal page error. Inspect the
browser console and `AudioPlaybackStatusChanged` behavior in Remote DevTools.

### Echo or duplicate audio

There should be one `recall-meeting-audio` publication and one attached agent
track. Do not also publish a LiveKit SDK-created microphone or attach the agent
track elsewhere. The agent is linked only to the Recall bridge participant.

### Reconnect loop

Check LiveKit project connectivity, expired credentials, duplicate bridge
identities, and tunnel stability. Reconnection events include elapsed timing in
the browser console.

### Choppy audio or CPU pressure

The bot creator requests `web_4_core` on Zoom, Meet, Teams, and Webex. Inspect
CPU Metrics in Recall Bot Explorer. Output Media always renders a 1280×720
camera page, even though this sample's conversational path is audio.

### Expired session URL

Create a new bot or increase `OUTPUT_MEDIA_SESSION_TTL_SECONDS` enough to cover
the bot's scheduled wait and meeting duration. Keep the value short relative
to the intended session.

### Why not RTMP?

RTMP is useful for one-way broadcast delivery. This path needs low-latency,
bidirectional audio, participant identity, track selection, agent state, and
barge-in, which are provided by LiveKit's room and Agent model.

## Manual verification matrix

Run each platform independently and record pass/fail plus notes:

- Zoom: bot joins, four checkpoints complete, response is audible, interruption
  stops the response, and reconnect recovers.
- Google Meet: repeat the Zoom checks.
- Microsoft Teams: repeat the Zoom checks.
- Cisco Webex: repeat the Zoom checks.

These credentialed platform checks are not run by the automated test suite.
They require a Recall v1.11 workspace, a LiveKit Cloud project, and live meeting
credentials.

For each run, record the `elapsed_ms` values emitted for:

- `livekit_connected`
- `meeting_audio_published`
- `first_agent_track`
- `agent_audio_attached`
- `first_agent_audio`
- any `livekit_reconnecting` and `livekit_reconnected` pair

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The implementation follows Recall.ai's current
[Output Media guide](https://docs.recall.ai/docs/stream-media) and v1.11
`POST /api/v1/bot/` behavior.
