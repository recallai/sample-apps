# Zoom Signed-In Bots

This example demonstrates how to set up a ZAK token endpoint for Zoom signed-in bots.

> **📘 For complete documentation on Zoom signed-in bots, see:** [Zoom Signed-in Bots](https://docs.recall.ai/docs/zoom-signed-in-bots)

## Pre-requisites

- [Zoom OAuth App](https://developers.zoom.us/docs/integrations/create/) with scopes: `user:read:zak`, `user:read:token`
- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

**Before running, make sure you don't have any apps running on port 4000**

### 1. Create a Zoom OAuth App

Follow the guide at https://developers.zoom.us/docs/integrations/create/ to create your OAuth app. You'll need the **Client ID**, **Client Secret**, and to set the **OAuth Redirect URL** (you'll update this after starting ngrok).

### 2. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file.

### 3. Start the server

Open this directory in a terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 4. Start ngrok

In a new terminal window, run:

```bash
ngrok http 4000
```

After it's running, copy the ngrok URL (e.g. `somehash.ngrok-free.app`). Update your `.env` file with the ngrok domain (without `https://`) and restart the server.

**Important:** Also update your Zoom OAuth app's **OAuth Redirect URL** in the [Zoom Marketplace](https://marketplace.zoom.us/develop/apps) to: `https://YOUR_NGROK_DOMAIN/zoom/oauth/callback`

### 5. Complete the OAuth flow

Open your browser and navigate to:

```
https://YOUR_NGROK_DOMAIN/zoom/oauth
```

Follow the prompts to authorize your Zoom app. After authorizing, the refresh token will be saved to `output/zoom_oauth_refresh_token.txt`.

### 6. Create a bot

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
    "zoom": {
      "zak_url": "https://YOUR_NGROK_DOMAIN/zoom/zak"
    }
  }'
```

**Note:**

- Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own values.
- Replace `YOUR_NGROK_DOMAIN` with your ngrok domain (e.g. `somehash.ngrok-free.app`).

### 7. View the output

The bot will join the meeting using the ZAK token for authentication. This allows the bot to join meetings that require authenticated users or to start meetings before the host joins.
