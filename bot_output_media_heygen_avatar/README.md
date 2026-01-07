# HeyGen Avatar Output Media Demo

A full-stack demo app showing how to use [Recall.ai's Output Media API](https://docs.recall.ai/docs/stream-media) with a [HeyGen Live Avatar](https://www.heygen.com/interactive-avatar) to create an AI-powered meeting participant that can see, hear, and respond to meeting participants in real-time.

## Features

-   HeyGen avatar joins meetings as a bot participant via Recall's output media
-   Avatar listens to meeting audio and responds in real-time
-   Speaking indicators show when avatar or user is talking

Note: When a user speaks while the avatar is talking, HeyGen automatically detects the interruption and stops the avatar's speech to listen

## Architecture & Request Flow

### Bot Joining a Meeting with Output Media

```
  You (run.sh)           Recall.ai                Bot                  Meeting
       │                     │                     │                      │
       │  POST /api/v1/bot   │                     │                      │
       │  (with output_media)│                     │                      │
       │────────────────────▶│                     │                      │
       │                     │                     │                      │
       │                     │   Created bot       │                      │
       │                     │────────────────────▶│                      │
       │                     │                     │                      │
       │                     │               (opens webpage,              │
       │                     │               joins meeting)               │
       │                     │                     │                      │
       │                     │                     │  Meeting audio       │
       │                     │                     │  streamed via mic    │
       │                     │                     │◀─────────────────────│
       │                     │                     │                      │
       │                     │                     │  Avatar audio+video  │
       │                     │                     │  streamed to meeting │
       │                     │                     │─────────────────────▶│
```

### Avatar Session Initialization

When the bot's browser loads your webpage:

```
  Bot Browser              Your Server            HeyGen API
       │                        │                      │
       │  Page loads            │                      │
       │  (ngrok URL)           │                      │
       │                        │                      │
       │  Browser prompts for   │                      │
       │  microphone access     │                      │
       │  (auto-accepted by     │                      │
       │   Recall bot browser)  │                      │
       │                        │                      │
       │  POST /api/session     │                      │
       │───────────────────────▶│                      │
       │                        │                      │
       │                        │  POST /v1/sessions/token
       │                        │  { avatar_id, voice_id,
       │                        │    context_id }
       │                        │─────────────────────▶│
       │                        │                      │
       │                        │  { session_token }   │
       │                        │◀─────────────────────│
       │                        │                      │
       │  { session_token }     │                      │
       │◀───────────────────────│                      │
       │                        │                      │
       │  Initialize LiveAvatarSession                 │
       │  with session_token    │                      │
       │                        │                      │
       │  session.start()       │                      │
       │──────────────────────────────────────────────▶│
       │                        │                      │
       │  WebRTC connection     │                      │
       │  established           │                      │
       │◀──────────────────────────────────────────────│
       │                        │                      │
       │  voiceChat.start()     │                      │
       │  voiceChat.unmute()    │                      │
       │──────────────────────────────────────────────▶│
       │                        │                      │
       │  Avatar ready to       │                      │
       │  listen and respond    │                      │
       │◀──────────────────────────────────────────────│
```

### Key Points

-   **Output Media**: Recall.ai renders your webpage and uses it as the bot's camera feed
-   **Microphone Access**: The bot's browser auto-accepts microphone permissions, enabling the avatar to hear meeting audio
-   **Real-time Streaming**: HeyGen's WebRTC connection streams avatar video directly to the webpage
-   **Voice Chat**: The avatar processes incoming audio and generates spoken responses

## Prerequisites

-   Node.js 18+
-   [ngrok](https://ngrok.com/) account (for exposing local server to Recall)
-   Recall.ai API key
-   HeyGen API key and configured Interactive Avatar

## Setup

### 1. Set up HeyGen Interactive Avatar

1. Go to [HeyGen Interactive Avatar](https://app.heygen.com/interactive-avatar)
2. Create or select an avatar
3. Note down your:
    - **Avatar ID**
    - **Voice ID**
    - **Context ID** (the persona/knowledge configuration)
    - **API Key** (from HeyGen settings)

### 2. Install dependencies

```bash
cd bot_output_media_heygen_avatar
npm install
```

### 3. Start ngrok

```bash
ngrok http 5173
```

Note the ngrok domain (e.g., `your-domain.ngrok-free.app`).

### 4. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file, including the ngrok domain from step 3 (Don't forget to remove the protocol (e.g. `https://`)).

### 5. Run the app

```bash
npm run dev
```

This starts:

-   **Backend**: http://localhost:4000
-   **Frontend**: http://localhost:5173

### 6. Create a Recall bot

You can create a bot using the `run.sh` script or manually with curl.

#### Option A: Using run.sh (recommended)

In a new terminal, run the script:

```bash
chmod +x run.sh
./run.sh
```

This will create a bot and paste the response in the terminal.

#### Option B: Using curl

```bash
curl --request POST \
  --url https://RECALL_REGION.recall.ai/api/v1/bot/ \
  --header 'Authorization: RECALL_API_KEY' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "meeting_url": "YOUR_MEETING_URL",
    "output_media": {
      "camera": {
        "kind": "webpage",
        "config": {
          "url": "https://YOUR_NGROK_DOMAIN"
        }
      }
    }
  }'
```

## Using the App

1. Start the dev server (`npm run dev`)
2. Start ngrok (`ngrok http 5173`)
3. Update your `.env` with the ngrok domain and meeting URL
4. Run `./run.sh` to create a bot
5. Join the meeting - you'll see the avatar as a participant
6. Speak to the avatar - it will listen and respond

## API Endpoints

| Method | Endpoint       | Description                          |
| ------ | -------------- | ------------------------------------ |
| POST   | `/api/session` | Create a HeyGen avatar session token |

## Project Structure

```
bot_output_media_heygen_avatar/
├── src/
│   ├── api/                              # Backend server
│   │   ├── config/env.ts                 # Env variables
│   │   ├── heygen_live_avatar_create_session.ts  # HeyGen session creation
│   │   └── index.ts                      # HTTP server
│   ├── client/                           # React frontend
│   │   ├── App.tsx                       # Main app (avatar display)
│   │   ├── contexts/LiveAvatarContext.tsx # HeyGen session management
│   │   └── hooks/                        # React hooks
│   └── schemas/                          # Zod validation schemas
├── run.sh                                # Script to create Recall bot
└── package.json
```

### Key Files

| File                                           | Purpose                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `src/api/index.ts`                             | Backend server that creates HeyGen session tokens                    |
| `src/api/heygen_live_avatar_create_session.ts` | Calls HeyGen API to create avatar session                            |
| `src/client/App.tsx`                           | Main React component - displays avatar video and speaking indicators |
| `src/client/contexts/LiveAvatarContext.tsx`    | Manages HeyGen SDK lifecycle, session state, and speaking events     |
| `run.sh`                                       | Creates a Recall bot with output_media pointing to your ngrok URL    |

## Debugging
