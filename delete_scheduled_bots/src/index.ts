import mri from "mri";
import { delete_scheduled_bots } from "./delete_scheduled_bots";
import { CmdLineArgsSchema } from "./schemas/CmdLineArgsSchema";

async function main() {
    const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

    if (raw.help) {
        console.log(`
Usage: npx tsx src/index.ts [options]

Options:
  --start_date_utc      Delete bots scheduled to join after this date (ISO 8601, e.g., "2025-01-01 00:00:00")
  --end_date_utc        Delete bots scheduled to join before this date (ISO 8601, e.g., "2025-02-01 00:00:00") [optional]
  --metadata            Filter by custom metadata (e.g., '{"customer_id":"123"}')
  --help                Show this help message

Examples:
  npx tsx src/index.ts \
    --start_date_utc "2025-12-15 00:00:00" \
    --end_date_utc "2025-12-31 00:00:00" \
    --metadata '{"customer_id":"123"}'

  npx tsx src/index.ts \
    --start_date_utc "2025-12-15 00:00:00"
        `);
        process.exit(0);
    }

    const args = CmdLineArgsSchema.parse(raw);

    console.log(`Deleting scheduled bots: ${args.start_date_utc}${args.end_date_utc ? ` → ${args.end_date_utc}` : ""}\n`);

    try {
        const { count } = await delete_scheduled_bots(args);
        console.log(`\nDeleted ${count} bots`);
    } catch (error) {
        console.error("Error deleting scheduled bots:");
        console.error(error);
        process.exit(1);
    }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
