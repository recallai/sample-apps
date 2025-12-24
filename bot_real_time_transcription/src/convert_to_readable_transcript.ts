import z from "zod";
import { TranscriptPartSchema, TranscriptPartType } from "./schemas/TranscriptPartSchema";

/**
 * Parse the transcript_parts into a separate sentences for each participant.
 */
export function convert_to_readable_transcript(args: { transcript_parts: TranscriptPartType[] }) {
    const { transcript_parts } = z.object({ transcript_parts: TranscriptPartSchema.array() }).parse(args);

    if (!Array.isArray(transcript_parts)) return [];
    const keepers = [];
    for (const entry of transcript_parts) {
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