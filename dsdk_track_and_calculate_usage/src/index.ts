import mri from "mri";
import { dsdk_track_and_calculate_usage } from "./dsdk_track_and_calculate_usage";
import { CmdLineArgsSchema } from "./schemas/CmdLineArgsSchema";

async function main() {
  const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

  if (raw.help) {
    console.log(`
Usage: npx ts-node src/index.ts [options]

Options:
  --started_at__gte     Include uploads with created_at >= this date (ISO 8601, e.g., "2025-01-01 00:00:00")
  --started_at__lte     Include uploads with created_at <= this date (ISO 8601, e.g., "2025-02-01 00:00:00")
  --metadata            Filter by custom metadata (e.g., '{"customer_id":"123"}')
  --help                Show this help message

Examples:
  npx ts-node src/index.ts \\
    --started_at__gte "2025-12-15 00:00:00" \\
    --started_at__lte "2025-12-31 00:00:00" \\
    --metadata '{"customer_id":"123"}'

  npx ts-node src/index.ts \\
    --started_at__gte "2025-12-15 00:00:00"
        `);
    process.exit(0);
  }

  const args = CmdLineArgsSchema.parse(raw);

  const date_range = [args.started_at__gte, args.started_at__lte].filter(Boolean).join(" → ") || "all time";
  console.log(`Tracking and calculating usage for dsdk uploads: ${date_range}\n`);

  try {
    const { count, usage_seconds } = await dsdk_track_and_calculate_usage(args);
    const hours = usage_seconds / 3600;
    console.log(`\nTotal dsdk uploads: ${count}`);
    console.log(`Total usage: ${hours.toFixed(4)} hours (${usage_seconds.toFixed(0)} seconds)`);
  } catch (error) {
    console.error("Error tracking and calculating usage for dsdk:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
