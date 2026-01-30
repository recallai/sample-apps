import z from "zod";
import type { TranscriptParagraph } from "../schemas/TranscriptParagraphSchema";
import { TranscriptPartSchema, type TranscriptPartType } from "../schemas/TranscriptPartSchema";

/**
 * Parse the transcript_parts into a separate sentences for each participant.
 */
export function convert_to_readable_transcript(args: { transcript_parts: TranscriptPartType[], recording_id: string }) {
    const { transcript_parts, recording_id } = z.object({ transcript_parts: TranscriptPartSchema.array(), recording_id: z.string() }).parse(args);

    // Extract the words and sort
    const words = transcript_parts.flatMap((part) =>
        part.words.map((word) => ({
            participant_id: part.participant.id,
            speaker: part.participant.name,
            text: word.text,
            start: {
                relative: word.start_timestamp?.relative ?? null,
                absolute: word.start_timestamp?.absolute ?? null,
            },
            end: {
                relative: word.end_timestamp?.relative ?? null,
                absolute: word.end_timestamp?.absolute ?? null,
            },
        })),
    ).sort((a, b) => {
        if (a.start.relative === null) return 1;
        if (b.start.relative === null) return -1;
        return a.start.relative - b.start.relative;
    });

    // Concat same speaker dialog into paragraphs
    const result: TranscriptParagraph[] = [];
    let current_paragraph: TranscriptParagraph | null = null;
    let current_participant_id: number | null = null;
    for (const word of words) {
        const is_same_speaker = word.participant_id === current_participant_id;
        if (current_paragraph && is_same_speaker) {
            current_paragraph.paragraph += " " + word.text;
            current_paragraph.end_timestamp = word.end;
            current_paragraph.duration_seconds =
                current_paragraph.start_timestamp.relative !== null &&
                word.end.relative !== null
                    ? word.end.relative - current_paragraph.start_timestamp.relative
                    : null;
        } else {
            current_paragraph = {
                recording_id,
                speaker: word.speaker,
                paragraph: word.text,
                start_timestamp: word.start,
                end_timestamp: word.end,
                duration_seconds:
                    word.start.relative !== null && word.end.relative !== null
                        ? word.end.relative - word.start.relative
                        : null,
            };
            current_participant_id = word.participant_id;
            result.push(current_paragraph);
        }
    }

    return result;
}