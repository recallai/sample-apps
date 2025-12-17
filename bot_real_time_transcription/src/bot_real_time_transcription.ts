import fs from "fs";
import path from "path";
import { type z } from "zod";
import { TranscriptDataSchema } from "./schemas/TranscriptDataSchema";

/**
 * Event handler for handling transcript.data event.
 */
export async function bot_real_time_transcription(args: { msg: Record<string, any> }) {
    const { msg: json_msg } = args;
    const msg = TranscriptDataSchema.parse(json_msg);

    // Write the transcript data to a file.
    const output_path_events = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/${msg.data.data.participant.id ?? "undefined"}-transcript.json`,
    );
    const output_path_dialogue = path.join(
        process.cwd(),
        `output/recording-${msg.data.recording.id}/${msg.data.data.participant.id ?? "undefined"}-dialogue.txt`,
    );
    if (!fs.existsSync(output_path_events)) {
        fs.mkdirSync(path.dirname(output_path_events), { recursive: true });
        fs.writeFileSync(output_path_events, "[]", { flag: "w+" });
    }
    if (!fs.existsSync(output_path_dialogue)) {
        fs.mkdirSync(path.dirname(output_path_dialogue), { recursive: true });
        fs.writeFileSync(output_path_dialogue, "", { flag: "w+" });
    }

    // Create the updated transcript data array.
    const imported_transcript_utterances_string = fs.readFileSync(output_path_events, "utf-8") || "[]";
    const imported_transcript_utterances_array = TranscriptDataSchema.shape.data.shape.data.array()
        .parse(JSON.parse(imported_transcript_utterances_string));
    const transcript_events = [...imported_transcript_utterances_array, msg.data.data];
    fs.writeFileSync(output_path_events, JSON.stringify(transcript_events, null, 2), { flag: "w+" });

    // Create the dialogue transcript from the transcript data array.
    const transcript_dialogue = parse_transcript(transcript_events);
    fs.writeFileSync(
        output_path_dialogue,
        transcript_dialogue.map((t) => t ? `${t.speaker}: ${t.paragraph}` : "").join("\n") || "",
        { flag: "w+" },
    );

    console.log(`Transcript data written to file: ${output_path_events}`);
    console.log(`Transcript dialogue written to file: ${output_path_dialogue}`);
}

/**
 * Parse the transcript data into a separate sentences for each participant.
 */
function parse_transcript(transcript: z.infer<typeof TranscriptDataSchema>["data"]["data"][]) {
    if (!Array.isArray(transcript)) return [];
    const keepers = [];
    for (const entry of transcript) {
        const participant = entry?.participant;
        const words = Array.isArray(entry?.words) ? entry.words : [];
        if (!participant?.name || words.length === 0) continue;
        const key = participant.id ?? participant.name;
        const last = keepers[keepers.length - 1];
        const last_key = last && (last.participant.id ?? last.participant.name);
        if (last && key === last_key) {
            last.words.push(...words);
        } else {
            keepers.push(entry);
        }
    }

    // Map merged entries to paragraphs with timestamps + duration
    return keepers
        .map(({ participant, words }) => {
            const paragraph = words.map((w) => w.text).join(" ").trim();
            if (!paragraph) return null;

            // First word with a start timestamp; last word with an end timestamp (words assumed chronological).
            const first = words.find((w) => w?.start_timestamp);
            const last = [...words].reverse().find((w) => w?.end_timestamp);

            const start_relative = first?.start_timestamp?.relative ?? null;
            const start_absolute = first?.start_timestamp?.absolute ?? null;
            const end_relative = last?.end_timestamp?.relative ?? null;
            const end_absolute = last?.end_timestamp?.absolute ?? null;

            // Duration: prefer relative seconds; else compute from ISO absolute timestamps.
            const duration_seconds =
                start_relative !== null && end_relative !== null
                    ? end_relative - start_relative
                    : (start_absolute && end_absolute ? (Date.parse(end_absolute) - Date.parse(start_absolute)) / 1000 : null);

            return {
                speaker: participant.name,
                paragraph,
                start_timestamp: { relative: start_relative, absolute: start_absolute },
                end_timestamp: { relative: end_relative, absolute: end_absolute },
                duration_seconds,
            };
        })
        .filter(Boolean);
}
