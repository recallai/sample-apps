import { z } from "zod";
import { ParticipantPartSchema, type ParticipantPartType } from "./schemas/ParticipantPartSchema";
import { TranscriptPartSchema, type TranscriptPartType } from "./schemas/TranscriptPartSchema";


/**
 * Format the transcript data with hybrid diarization.
 *
 * Transcript part names follow the format `{participant_id}-{anonymous_label}`.
 * This builds a map of participant_id → Set<anonymous_label> and only replaces
 * participant info when a given participant_id has exactly one anonymous label,
 * meaning we can confidently attribute those segments to a single speaker.
 */
export function convert_to_hybrid_diarized_transcript_parts(
    args: {
        transcript_parts: TranscriptPartType[],
        participants: ParticipantPartType[],
    },
): TranscriptPartType[] {
    const { transcript_parts, participants } = z.object({
        transcript_parts: TranscriptPartSchema.array(),
        participants: ParticipantPartSchema.array(),
    }).parse(args);

    const participants_by_id = new Map(
        participants.map((p) => [p.id, p]),
    );

    // Build a map of participant_id → Set<anonymous_label> from transcript part names.
    // Name format: "{participant_id}-{anonymous_label}" (e.g. "200-0")
    const participant_id_to_anon_labels = new Map<number, Set<string>>();
    for (const part of transcript_parts) {
        if (!part.participant.name) continue;

        const match = part.participant.name.match(/^(\d+)-(.+)$/);
        if (!match) continue;

        const participant_id = parseInt(match[1], 10);
        const anon_label = match[2];

        if (!participant_id_to_anon_labels.has(participant_id)) {
            participant_id_to_anon_labels.set(participant_id, new Set());
        }
        participant_id_to_anon_labels.get(participant_id)!.add(anon_label);
    }

    // Log the mapping for debugging
    for (const [participant_id, anon_labels] of participant_id_to_anon_labels) {
        const participant = participants_by_id.get(participant_id);
        const label_list = JSON.stringify(Array.from(anon_labels));
        if (anon_labels.size === 1) {
            console.log(`Participant "${participant?.name}" (id: ${participant_id}) has 1 anonymous label: ${label_list} - will map`);
        } else {
            console.log(`Participant "${participant?.name}" (id: ${participant_id}) has ${anon_labels.size} anonymous labels: ${label_list} - skipping`);
        }
    }

    // Only map participants that have exactly one anonymous label.
    const mappable_participant_ids = new Set(
        [...participant_id_to_anon_labels.entries()]
            .filter(([, labels]) => labels.size === 1)
            .map(([id]) => id),
    );

    const hybrid_transcript_parts = transcript_parts.map((transcript) => {
        if (!transcript.participant.name) return transcript;

        const match = transcript.participant.name.match(/^(\d+)-(.+)$/);
        if (!match) return transcript;

        const participant_id = parseInt(match[1], 10);
        if (!mappable_participant_ids.has(participant_id)) return transcript;

        const participant = participants_by_id.get(participant_id);
        if (!participant) return transcript;

        return {
            ...transcript,
            participant: {
                ...transcript.participant,
                id: participant.id,
                name: participant.name,
                is_host: participant.is_host,
                platform: participant.platform,
                extra_data: participant.extra_data,
                email: participant.email,
            },
        };
    });

    return hybrid_transcript_parts;
}
