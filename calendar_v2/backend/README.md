# Calendar V2 Demo

This example demonstrates how to output an image from the bot's "camera" when the bot is in the call while recording and not recording.

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

### 3. Create a bot

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
curl http://localhost:4000
```

### 5. View the output

A bot should join the call and you can view the image the bot outputs.
