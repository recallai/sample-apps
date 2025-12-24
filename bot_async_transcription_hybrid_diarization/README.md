# Async Transcription with Hybrid Diarization

This example demonstrates how to get accurate speaker attribution in your transcripts using **hybrid diarization**.

## What is Hybrid Diarization?

Standard transcription diarization has a tradeoff:

- **Machine diarization** (from providers like Deepgram) distinguishes different voices, but only gives you anonymous labels like "Speaker 0" and "Speaker 1".
- **Speaker timeline diarization** (from Recall.ai) uses participant speaker change events from the meeting platform to determine who is speaking but is unable to distinguish participants if they're speaking from the same participant tile (e.g. calling from the same device/room).

**Hybrid diarization combines both approaches.** It uses machine diarization to detect distinct voices, then maps them to real participant names when there's a clear 1-to-1 match. When multiple people share a device, it falls back to anonymous speaker labels.

## How It Works

The server listens for webhook events from Recall.ai:

1. When `recording.done` is received, it triggers async transcript creation via Recall's API
2. When `transcript.done` is received, it downloads both the transcript and speaker timeline data, then merges them using the hybrid diarization algorithm

## Prerequisites

- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/en/download)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

> **Note:** Make sure you don't have any apps running on port 4000 before starting.

### 1. Start ngrok

In a terminal window, run:

```bash
ngrok http 4000
```

After it's running, copy the ngrok URL (e.g. `somehash.ngrok-free.app`).

### 2. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Fill out the variables in the `.env` file with your `RECALL_REGION` and `RECALL_API_KEY`.

### 3. Add your webhook URL to the Recall dashboard

Go to the Recall.ai webhooks dashboard for your region and add your ngrok URL:

- [us-east-1 webhooks dashboard](https://us-east-1.recall.ai/dashboard/webhooks)
- [us-west-2 webhooks dashboard](https://us-west-2.recall.ai/dashboard/webhooks)
- [eu-central-1 webhooks dashboard](https://eu-central-1.recall.ai/dashboard/webhooks)
- [ap-northeast-1 webhooks dashboard](https://ap-northeast-1.recall.ai/dashboard/webhooks)

Subscribe to the following events:

- `recording.done`
- `transcript.done`

### 4. Start the server

Open this directory in a new terminal and run:

```bash
npm install
npm run dev
```

This will start a server on port 4000.

### 5. Create a bot

You can create a bot using the `run.sh` script or manually with curl.

**Option A: Using run.sh (recommended)**

```bash
chmod +x run.sh
./run.sh
```

**Option B: Using curl**

```bash
curl --request POST \
  --url https://RECALL_REGION.recall.ai/api/v1/bot/ \
  --header 'Authorization: RECALL_API_KEY' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{
    "meeting_url": "YOUR_MEETING_URL"
  }'
```

Replace `RECALL_REGION`, `RECALL_API_KEY`, and `YOUR_MEETING_URL` with your own values.

### 6. View the output

After the call ends and the transcript is processed, you'll find the output files in the `output/` folder, organized by recording ID:

- `transcript.json` — The transcript data with hybrid diarization applied
- `readable.txt` — A human-readable version of the transcript
