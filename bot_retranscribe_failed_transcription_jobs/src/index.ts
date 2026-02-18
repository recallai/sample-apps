import mri from "mri";
import { bot_retranscribe_failed_transcription_jobs } from "./bot_retranscribe_failed_transcription_jobs";
import { CmdLineArgsSchema } from "./schemas/CmdLineArgsSchema";

const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

if (raw.help) {
  console.log(`
Usage: npx ts-node src/index.ts [options]

Options:
  --start_date_utc      Process bots that joined after this date (ISO 8601, e.g., "2025-01-01 00:00:00")
  --end_date_utc        Process bots that joined before this date (ISO 8601, e.g., "2025-02-01 00:00:00") [optional]
  --metadata            Filter by custom metadata (e.g., '{"customer_id":"123"}')
  --transcript_config   JSON object with transcript configuration (e.g., '{"provider":{"recallai_async":{}}}')
  --help                Show this help message

Examples:
  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --transcript_config '{"provider":{"recallai_async":{}}}'

  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --end_date_utc "2025-12-31 00:00:00" \\
    --transcript_config '{"provider":{"assembly_ai_async":{"language_code":"en_us"}}}'

  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --metadata '{"team":"engineering"}' \\
    --transcript_config '{"provider":{"recallai_async":{"language_code":"en"}}}'

Transcript Config Options:
  The --transcript_config accepts a JSON object with the following structure:
  {
    "metadata": { ... },           // Optional: custom metadata for the transcript
    "diarization": { ... },        // Optional: diarization settings
    "provider": {                  // Required: transcription provider config
      "recallai_async": { ... },   // Recall.ai async transcription
      "assembly_ai_async": { ... } // AssemblyAI async transcription
    }
  }

  Provider options for recallai_async:
    - language_code: "auto", "en", "es", "fr", etc.
    - spelling: [{ "find": ["word1"], "replace": "replacement" }]
    - key_terms: ["term1", "term2"]
    - filter_profanity: true/false

  Provider options for assembly_ai_async:
    - language_code: "en_us", "en", "es", "fr", etc.
    - punctuate: true/false
    - format_text: true/false
    - disfluencies: true/false
        `);
  process.exit(0);
}

async function main() {

  const args = CmdLineArgsSchema.parse(raw);

  console.log(`Retranscribing recordings from bots: ${args.start_date_utc}${args.end_date_utc ? ` → ${args.end_date_utc}` : ""}\n`);
  console.log(`Transcript config: ${JSON.stringify(args.transcript_config)}\n`);

  try {
    const { count, skipped } = await bot_retranscribe_failed_transcription_jobs(args);
    console.log(`\nCreated ${count} transcript jobs (skipped ${skipped} bots with no recordings)`);
  } catch (error) {
    console.error("Error retranscribing recordings:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
