import mri from "mri";
import { dsdk_delete_recording_media } from "./dsdk_delete_recording_media";

async function main() {
  const raw = mri(process.argv.slice(2), { alias: { h: "help" } });

  if (raw.help) {
    console.log(`
Usage: npx ts-node src/index.ts [options]

Options:
  --help                Show this help message

Examples:
  npx ts-node src/index.ts
    `);
    process.exit(0);
  }

  console.log("Deleting all dsdk upload recording media...\n");

  try {
    const { count } = await dsdk_delete_recording_media();
    console.log(`\nDeleted ${count} dsdk upload recording media`);
  } catch (error) {
    console.error("Error deleting dsdk upload recording media:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
