import mri from "mri";
import { CmdLineArgsSchema } from "./schemas/CmdLineArgsSchema";
import { track_and_calculate_usage_for_bots } from "./track_and_calculate_usage_for_bots";

async function main() {
    const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

    if (raw.help) {
        console.log(`
Usage: npx tsx src/index.ts [options]

Options:
  --start_date_utc      Include bots with join_at >= this date (ISO 8601, e.g., "2025-01-01 00:00:00")
  --end_date_utc        Include bots with join_at < this date (ISO 8601, e.g., "2025-02-01 00:00:00")
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

    const date_range = [args.start_date_utc, args.end_date_utc].filter(Boolean).join(" → ") || "all time";
    console.log(`Tracking and calculating usage for bots: ${date_range}\n`);

    try {
        const seconds = await track_and_calculate_usage_for_bots(args);
        const hours = seconds / 3600;
        console.log(`\nTotal bot usage: ${hours.toFixed(4)} hours (${seconds.toFixed(0)} seconds)`);
    } catch (error) {
        console.error("Error retrieving bot usage:");
        console.error(error);
        process.exit(1);
    }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
