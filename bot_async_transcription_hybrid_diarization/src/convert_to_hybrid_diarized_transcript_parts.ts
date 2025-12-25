import { z } from "zod";
import { SpeakerTimelinePartSchema, type SpeakerTimelinePartType } from "./schemas/SpeakerTimelinePartSchema";
import { TranscriptPartSchema, type TranscriptPartType } from "./schemas/TranscriptPartSchema";


/**
 * Format the transcript data with hybrid diarization.
 * This will use use machine diarization to get anonymous speaker labels for each participant in the transcript,
 * and will diarize them using speaker-timeline diarization if there's only one machine-diarized participant speaking for that participant.
 * 
 * The end result is a transcript which uses speaker-timeline diarization for each participant unless there are multiple people speaking from the same device.
 */
export function convert_to_hybrid_diarized_transcript_parts(
    args: {
        transcript_parts: TranscriptPartType[],
        speaker_timeline_data: SpeakerTimelinePartType[],
    },
): TranscriptPartType[] {
    const { transcript_parts, speaker_timeline_data } = z.object({
        transcript_parts: TranscriptPartSchema.array(),
        speaker_timeline_data: SpeakerTimelinePartSchema.array(),
    }).parse(args);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ParticipantMappingSchema = z.object({ id: z.number().nullable(), name: z.string().nullable() });
    // eslint-disable-next-line @typescript-eslint/naming-convention
    type ParticipantMappingType = z.infer<typeof ParticipantMappingSchema>;

    // Collect all anonymous speakers per participant across all their timeline segments.
    // This ensures we know the total number of unique speakers for each participant before making mapping decisions.
    const participant_to_anon = new Map<string, Set<string>>();
    for (const speaker_change_event of speaker_timeline_data) {
        if (!speaker_change_event.participant.id || !speaker_change_event.participant.name) {
            continue;
        }

        // Get the bounds of the current speaker event
        const speaker_event_start = speaker_change_event.start_timestamp.relative;
        const speaker_event_end = speaker_change_event.end_timestamp?.relative ?? Number.POSITIVE_INFINITY;

        // Get the transcript segments that are within the current speaker event
        const transcript_segments = transcript_parts.filter((transcript) => {
            const start = transcript.words.find(
                (word) => word.start_timestamp?.relative !== undefined && word.start_timestamp.relative < speaker_event_end
            )?.start_timestamp?.relative ?? Number.NEGATIVE_INFINITY;
            const end = transcript.words.reverse().find(
                (word) => word.end_timestamp?.relative !== undefined && word.end_timestamp.relative < speaker_event_end
            )?.end_timestamp?.relative ?? Number.POSITIVE_INFINITY;
            return speaker_event_start <= start && speaker_event_end > end;
        });

        // Add the participant to the mapping if it's not already present
        const participant_key = JSON.stringify(ParticipantMappingSchema.parse({
            id: speaker_change_event.participant.id ?? null,
            name: speaker_change_event.participant.name ?? null,
        }));
        if (!participant_to_anon.has(participant_key)) {
            participant_to_anon.set(participant_key, new Set());
        }

        // Add all anonymous speakers from this segment
        for (const segment of transcript_segments) {
            const participants = participant_to_anon.get(participant_key);
            if (participants && segment.participant.name) {
                participants.add(segment.participant.name);
            }
        }
    }

    // Derive mappings: only create mapping for participants with exactly 1 speaker across ALL their segments.
    // If a participant ever had multiple speakers, none of them should be mapped.
    const anon_to_participant = new Map<string, ParticipantMappingType>();
    for (const [participant_raw, anon] of participant_to_anon.entries()) {
        const result = ParticipantMappingSchema.safeParse(JSON.parse(participant_raw));
        if (!result.success) {
            console.log(`Failed to parse participant: ${participant_raw} - ${result.error.message}`);
            continue;
        }
        const { data: participant } = result;

        if (anon.size === 1) {
            const anon_key = anon.values().next().value!;
            anon_to_participant.set(anon_key, participant);
        } else if (anon.size > 1) {
            console.log(`Participant "${participant.name}" (id: ${participant.id}) has ${anon.size} speakers: ${JSON.stringify(Array.from(anon))} - not mapping`);
        } else {
            console.log(`Expected participant to have at least 1 speaker, but has ${anon.size}`);
        }
    }

    console.log(`Participant mapping: ${JSON.stringify(Object.fromEntries(anon_to_participant))}`);

    // Replace the participant data with the mapped participant data.
    const hybrid_transcript_parts = transcript_parts.map((transcript) => {
        const participant_data = anon_to_participant.get(transcript.participant.name ?? "");
        if (!participant_data) {
            return transcript;
        }
        return {
            ...transcript,
            participant: {
                ...transcript.participant,
                ...participant_data,
            },
        };
    });

    return hybrid_transcript_parts;
}
