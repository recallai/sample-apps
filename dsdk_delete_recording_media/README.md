# Delete DSDK upload's recording media

This example demonstrates how to bulk delete DSDK upload recording media using the Recall.ai API.

> ⚠️ **WARNING: This script will permanently delete recording media for all of your DSDK uploads!**
>
> Once deleted, the video/audio files cannot be recovered. Make sure you have downloaded any recordings you need before running this script.

## Pre-requisites

-   [Node.js](https://nodejs.org/en/download)
-   [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Quickstart

### 1. Set up environment variables

Copy the `.env.sample` file and rename it to `.env`:

```bash
cp .env.sample .env
```

Then fill out the variables in the `.env` file:

-   `RECALL_API_KEY` - Your Recall.ai API key
-   `RECALL_REGION` - Your Recall.ai region (e.g., `us-west-2`)

### 2. Install dependencies

Open this directory in a terminal and run:

```bash
npm install
```

### 3. Run the script

Delete media for all DSDK uploads:

```bash
npx ts-node src/index.ts
```

### 4. View the output

The script will output progress and final count:

```
Deleting all dsdk upload recording media...

{ pageCount: 5, nextPage: null }
Deleted dsdk upload's recording media: abc123
Deleted dsdk upload's recording media: def456
...

Deleted 5 dsdk upload recording media
```

## CLI Options

| Option   | Required | Description       |
| -------- | -------- | ----------------- |
| `--help` | No       | Show help message |
