import fs from "fs";
import path from "path";
import { TranscriptDataEventSchema } from "./schemas/TranscriptDataEventSchema";
import { convert_to_readable_transcript } from "./convert_to_readable_transcript";
import { TranscriptPartSchema } from "./schemas/TranscriptPartSchema";

/**
 * Event handler for handling transcript.data event.
 */
export async function bot_real_time_transcription(args: { msg: Record<string, any> }) {
    const { msg: json_msg } = args;
    const msg = TranscriptDataEventSchema.parse(json_msg);

    // Write the transcript data to a file.
    const output_path_events = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/transcript.json`,
    );
    const output_path_readable = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/readable.txt`,
    );
    if (!fs.existsSync(output_path_events)) {
        fs.mkdirSync(path.dirname(output_path_events), { recursive: true });
        fs.writeFileSync(output_path_events, "[]", { flag: "w+" });
    }
    if (!fs.existsSync(output_path_readable)) {
        fs.mkdirSync(path.dirname(output_path_readable), { recursive: true });
        fs.writeFileSync(output_path_readable, "", { flag: "w+" });
    }

    // Create the updated transcript data array.
    const transcript_parts_raw = fs.readFileSync(output_path_events, "utf-8") || "[]";
    const transcript_parts = TranscriptPartSchema.array().parse(
        [...JSON.parse(transcript_parts_raw), msg.data.data]
    );
    fs.writeFileSync(output_path_events, JSON.stringify(transcript_parts, null, 2), { flag: "w+" });

    // Create the readable transcript from the transcript parts data and write it to a file.
    const transcript_readable = convert_to_readable_transcript({ transcript_parts });
    fs.writeFileSync(
        output_path_readable,
        transcript_readable.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n"),
        { flag: "w+" },
    );

    console.log(`Transcript data written to file: ${output_path_events}`);
    console.log(`Readable transcript written to file: ${output_path_readable}`);
}
