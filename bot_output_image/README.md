# Output an image for a bot

This example demonstrates how to create a bot that outputs a custom image. The bot will display different images depending on whether it's recording or not:

- **In call, not recording**: Shows a custom image when the bot is in the call but not yet recording
- **In call, recording**: Shows a different custom image when the bot is actively recording

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

### 2. Add your images

Replace the base64-encoded JPEG images in the `src/base64/` folder:

- `in_call_not_recording.txt` - Base64-encoded JPEG shown when the bot is not recording
- `in_call_recording.txt` - Base64-encoded JPEG shown when the bot is recording

To convert an image to base64:

```bash
base64 -i your_image.jpg > src/base64/in_call_not_recording.txt
base64 -i your_image.jpg > src/base64/in_call_recording.txt
```

**Image requirements:**

- Must be JPEG format
- Max size: 1,835,008 bytes (after base64 encoding)

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

The bot will join the meeting and display your custom images. You'll see different images depending on whether the bot is recording or not.
