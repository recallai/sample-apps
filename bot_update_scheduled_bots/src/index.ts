import mri from "mri";
import { bot_update_scheduled_bots } from "./bot_update_scheduled_bots";
import { CmdLineArgsSchema } from "./schemas/CmdLineArgsSchema";

async function main() {
  const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

  if (raw.help) {
    console.log(`
Usage: npx ts-node src/index.ts [options]

Options:
  --start_date_utc      Update bots scheduled to join after this date (ISO 8601, e.g., "2025-01-01 00:00:00")
  --end_date_utc        Update bots scheduled to join before this date (ISO 8601, e.g., "2025-02-01 00:00:00") [optional]
  --metadata            Filter by custom metadata (e.g., '{"customer_id":"123"}')
  --update_data         JSON object with fields to update (e.g., '{"bot_name":"New Name"}')
  --help                Show this help message

Examples:
  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --update_data '{"bot_name":"Updated Bot"}'

  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --end_date_utc "2025-12-31 00:00:00" \\
    --update_data '{"meeting_url":"https://new-meeting.example.com"}'

  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --metadata '{"team":"engineering"}' \\
    --update_data '{"bot_name":"Eng Bot"}'

  npx ts-node src/index.ts \\
    --start_date_utc "2025-12-15 00:00:00" \\
    --update_data '{"recording_config":{"retention":{"type":"timed","hours":168}}}'
        `);
    process.exit(0);
  }

  const args = CmdLineArgsSchema.parse(raw);

  console.log(`Updating scheduled bots: ${args.start_date_utc}${args.end_date_utc ? ` → ${args.end_date_utc}` : ""}\n`);
  console.log(`Update data: ${JSON.stringify(args.update_data)}\n`);

  try {
    const { count } = await bot_update_scheduled_bots(args);
    console.log(`\nUpdated ${count} bots`);
  } catch (error) {
    console.error("Error updating scheduled bots:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
