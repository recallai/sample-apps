# Download separate PNG video streams per participant as separate MP4 files

This example demonstrates how to receive real-time PNG video streams for each participant in a meeting and save them as separate MP4 video files.

## Pre-requisites

- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

**Before running, make sure you don't have any apps running on port 4000**

### 1. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file.

### 2. Start the server

Open this directory in a terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 3. Start ngrok

In a new terminal window, run:

```bash
ngrok http 4000
```

After it's running, copy the ngrok URL (e.g. `somehash.ngrok.app`). You'll need just the domain without the `https://` prefix.

### 4. Create a bot

You can create a bot using the `run.sh` script or manually with curl.

#### Option A: Using run.sh (recommended)

In a new terminal, run the script:

```bash
chmod +x run.sh
./run.sh
```

This will create a bot and paste the response in the terminal

#### Option B: Using curl

```bash
curl --request POST \
  --url https://RECALL_REGION.recall.ai/api/v1/bot/ \
  --header 'Authorization: RECALL_API_KEY' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "meeting_url": "YOUR_MEETING_URL",
    "recording_config": {
      "realtime_endpoints": [
        {
          "type": "websocket",
          "url": "wss://YOUR_NGROK_DOMAIN",
          "events": [
            "video_separate_raw.data"
          ]
        }
      ],
      "video_separate_raw": {},
      "video_mixed_layout": "gallery_view_v2"
    }
  }'
```

**Note:**

- Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own values.
- Replace `YOUR_NGROK_DOMAIN` with your ngrok domain (e.g. `somehash.ngrok.app`). Use `wss://` instead of `https://` since this is a WebSocket connection.

### 5. View the output

After the call ends, you can find the video files in the newly-generated `output/` folder, organized by recording and participant ID.
