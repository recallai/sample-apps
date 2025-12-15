import mri from "mri";
import { retrieve_bot_usage } from "./retrieve_bot_usage";
import { CmdLineArgsSchema } from "./schemas/CmdLineArgsSchema";

async function main() {
    const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

    if (raw.help) {
        console.log(`
Usage: npx tsx src/index.ts [options]

Options:
  --type            Usage type: bot
  --start_date      Include bots with join_at >= this date (ISO 8601, e.g., "2025-01-01 00:00:00")
  --end_date        Include bots with join_at < this date (ISO 8601, e.g., "2025-02-01 00:00:00")
  --metadata        Filter by custom metadata (e.g., '{"customer_id":"123"}')
  -h, --help        Show this help message
        `);
        process.exit(0);
    }

    const args = CmdLineArgsSchema.parse(raw);

    console.log(`Fetching ${args.type} usage: ${args.start_date} → ${args.end_date}\n`);

    try {

        const seconds = await retrieve_bot_usage(args);
        const hours = seconds / 3600;
        console.log(`\nTotal bot usage: ${hours.toFixed(4)} hours (${seconds.toFixed(0)} seconds)`);
    } catch (error) {
        console.error("Error retrieving bot usage:");
        console.error(error);
        process.exit(1);
    }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
