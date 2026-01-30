# Update scheduled bots

This example demonstrates how to bulk update scheduled bots using the Recall.ai API.

A **scheduled bot** is a bot that hasn't joined a meeting yet — the current time is still less than the bot's `join_at` timestamp.

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

Update all scheduled bots starting from a future date:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --update_data '{"bot_name":"Updated Bot"}'
```

Update scheduled bots within a date range:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --end_date_utc "2025-12-31 00:00:00" \
  --update_data '{"meeting_url":"https://new-meeting.example.com"}'
```

Filter by custom metadata to update only specific customer's bots:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --metadata '{"team_id":"1872"}' \
  --update_data '{"bot_name":"Team Bot"}'
```

Update recording retention to 168 hours (7 days):

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --update_data '{"recording_config":{"retention":{"type":"timed","hours":168}}}'
```

### 4. View the output

The script will output progress and final count:

```
Updating scheduled bots: 2025-12-15 00:00:00 → 2025-12-31 00:00:00

Update data: {"bot_name":"Updated Bot"}

{ pageCount: 5, nextPage: null }
Updated bot: abc123
Updated bot: def456
...

Updated 5 bots
```

## CLI Options

| Option             | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `--start_date_utc` | Yes      | Update bots scheduled to join after this date (must be in the future)       |
| `--end_date_utc`   | No       | Update bots scheduled to join before this date                              |
| `--metadata`       | No       | JSON object to filter by custom bot metadata (e.g., `'{"team_id":"1872"}'`) |
| `--update_data`    | Yes      | JSON object with fields to update on each bot                               |
| `--help`           | No       | Show help message                                                           |
