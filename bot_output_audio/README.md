# Output audio from a bot

This example demonstrates how to create a bot that outputs audio when it starts recording. The bot uses the `automatic_audio_output` configuration to play a base64-encoded MP3 file when the bot begins recording in a meeting.

## Pre-requisites

- [Node.js](https://nodejs.org/en/download)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

### 1. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file:

- `RECALL_API_KEY` - Your Recall.ai API key
- `RECALL_REGION` - Your Recall.ai region (e.g., `us-west-2`)
- `MEETING_URL` - The meeting URL for the bot to join

### 2. Add your audio

Replace the base64-encoded MP3 audio in the `src/base64/` folder:

- `in_call_recording.txt` - Base64-encoded MP3 played when the bot starts recording

To convert an audio file to base64:

```bash
base64 -i your_audio.mp3 > src/base64/in_call_recording.txt
```

**Audio requirements:**

- Must be MP3 format

### 3. Install dependencies

Open this directory in a terminal and run:

```bash
npm install
```

### 4. Start the server

```bash
npm run dev
```

This will start a server on port 4000.

### 5. Create a bot

In a new terminal, trigger bot creation:

```bash
curl http://localhost:4000
```

Or use the provided script:

```bash
chmod +x run.sh
./run.sh
```

### 6. View the output

The bot will join the meeting and play your audio clip when it starts recording.
