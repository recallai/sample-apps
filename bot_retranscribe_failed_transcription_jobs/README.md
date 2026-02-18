# Retranscribe Failed Transcription Jobs

This example demonstrates how to bulk retranscribe recordings from bots using the Recall.ai API.

This script lists bots by date range and metadata filters (only bots with status `done` or `analysis_failed`), retrieves their recording IDs, and creates new async transcript jobs for each recording. This is useful for retrying failed transcription jobs or re-transcribing with different settings.

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

Retranscribe all recordings from bots that joined after a specific date using Recall.ai async transcription:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --transcript_config '{"provider":{"recallai_async":{}}}'
```

Retranscribe recordings within a date range using AssemblyAI:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --end_date_utc "2025-12-31 00:00:00" \
  --transcript_config '{"provider":{"assembly_ai_async":{"language_code":"en_us"}}}'
```

Filter by custom metadata to retranscribe only specific customer's recordings:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --metadata '{"team_id":"1872"}' \
  --transcript_config '{"provider":{"recallai_async":{"language_code":"en"}}}'
```

Retranscribe with custom vocabulary/key terms:

```bash
npx ts-node src/index.ts \
  --start_date_utc "2025-12-15 00:00:00" \
  --transcript_config '{"provider":{"recallai_async":{"key_terms":["Recall","API","transcription"]}}}'
```

### 4. View the output

The script will output progress and final count:

```
Retranscribing recordings from bots: 2025-12-15 00:00:00 → 2025-12-31 00:00:00

Transcript config: {"provider":{"recallai_async":{}}}

{ pageCount: 5, nextPage: null }
Created transcript job for recording: rec_abc123 (bot: bot_xyz789)
Created transcript job for recording: rec_def456 (bot: bot_uvw012)
Bot bot_nop345 has no recordings, skipping
...

Created 4 transcript jobs (skipped 1 bots with no recordings)
```

## CLI Options

| Option               | Required | Description                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `--start_date_utc`   | Yes      | Process bots that joined after this date                                    |
| `--end_date_utc`     | No       | Process bots that joined before this date                                   |
| `--metadata`         | No       | JSON object to filter by custom bot metadata (e.g., `'{"team_id":"1872"}'`) |
| `--transcript_config`| Yes      | JSON object with transcript configuration                                   |
| `--help`             | No       | Show help message                                                           |

**Note:** The script only processes bots with status `done` or `analysis_failed` (i.e., bots that have completed and have recordings available).

## Transcript Configuration

The `--transcript_config` option accepts a JSON object with the following structure:

```json
{
  "metadata": { },           // Optional: custom metadata for the transcript
  "diarization": { },        // Optional: diarization settings
  "provider": {              // Required: transcription provider config
    "recallai_async": { },   // OR
    "assembly_ai_async": { }
  }
}
```

### Recall.ai Async Provider Options

| Option            | Type     | Default | Description                                      |
| ----------------- | -------- | ------- | ------------------------------------------------ |
| `language_code`   | string   | "auto"  | Language code (e.g., "en", "es", "fr", "auto")   |
| `spelling`        | array    | []      | Find/replace text in transcript                  |
| `key_terms`       | array    | []      | Boost recognition of specific terms              |
| `filter_profanity`| boolean  | false   | Filter profane words                             |

### AssemblyAI Async Provider Options

| Option            | Type     | Default | Description                                      |
| ----------------- | -------- | ------- | ------------------------------------------------ |
| `language_code`   | string   | "en_us" | Language code                                    |
| `punctuate`       | boolean  | true    | Enable automatic punctuation                     |
| `format_text`     | boolean  | true    | Enable text formatting                           |
| `disfluencies`    | boolean  | false   | Include filler words (umm, uh)                   |

## API Reference

- [Create Async Transcript](https://docs.recall.ai/reference/recording_create_transcript_create)
- [List Bots](https://docs.recall.ai/reference/bot_list)
