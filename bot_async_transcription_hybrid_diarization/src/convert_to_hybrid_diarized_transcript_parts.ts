import { z } from "zod";
import { TranscriptPartSchema, TranscriptPartType } from "./schemas/TranscriptPartSchema";
import { SpeakerTimelinePartSchema, SpeakerTimelinePartType } from "./schemas/SpeakerTimelinePartSchema";


/**
 * Format the transcript data with hybrid diarization.
 * This will use use machine diarization to get anonymous speaker labels for each participant in the transcript,
 * and will diarize them using speaker-timeline diarization if there's only one machine-diarized participant speaking for that participant.
 * 
 * The end result is a transcript which uses speaker-timeline diarization for each participant unless there are multiple people speaking from the same device.
 */
export function convert_to_hybrid_diarized_transcript_parts(
    args: {
        transcript_data: TranscriptPartType[],
        speaker_timeline_data: SpeakerTimelinePartType[]
    }
): TranscriptPartType[] {
    const { transcript_data, speaker_timeline_data } = z.object({
        transcript_data: TranscriptPartSchema.array(),
        speaker_timeline_data: SpeakerTimelinePartSchema.array(),
    }).parse(args);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ParticipantMappingSchema = z.object({ id: z.number(), name: z.string() });
    const participant_map = new Map<string, string>();

    // Create a mapping of participant names to their IDs.
    for (let i = 0; i < speaker_timeline_data.length; i++) {
        // Get the bounds of the current speaker event
        const speaker_event = speaker_timeline_data[i];
        const speaker_event_start = speaker_event.start_timestamp.relative;
        const speaker_event_end = speaker_event.end_timestamp?.relative ?? Number.POSITIVE_INFINITY;

        // Get the transcript segments that are within the current speaker event
        const transcript_segments = transcript_data.filter((transcript) => {
            const start = transcript.words[0].start_timestamp.relative;
            const end = transcript.words[transcript.words.length - 1]?.end_timestamp?.relative ?? Number.POSITIVE_INFINITY;
            return speaker_event_start <= start && speaker_event_end > end;
        });

        // If there are no transcript segments, skip the current speaker event
        if (transcript_segments.length === 0) continue;

        // For each transcript segment, see if the speaker is the same for each
        const speaker_names = new Set(transcript_segments.map((transcript) => transcript.participant?.name ?? ""));
        if (speaker_names.size === 1) {
            console.log(`Found ${speaker_names.size} speaker names for event ${i}: ${JSON.stringify(Array.from(speaker_names.values()))}`);
            const anon_name = speaker_names.values().next().value;
            const participant_id = speaker_event.participant.id ?? undefined;
            const participant_name = speaker_event.participant.name ?? undefined;
            if (anon_name && participant_id && participant_name) {
                const participant = ParticipantMappingSchema.parse({ name: participant_name, id: participant_id });
                participant_map.set(anon_name, JSON.stringify(participant));
            } else {
                console.error(`No speaker name or id found for event ${JSON.stringify({ anon_name, participant_id, participant_name, participant: speaker_event.participant })}`);
            }
        }
    }

    const participant_mapping = Object.fromEntries(
        Array.from(participant_map.entries())
            .map(
                ([anon_name, participant]) => [
                    anon_name,
                    ParticipantMappingSchema.parse(JSON.parse(participant)),
                ],
            ),
    );

    console.log(`Participant mapping: ${JSON.stringify(participant_mapping)}`);

    const hybrid_transcript_parts = transcript_data.map((transcript) => {
        const participant_data = participant_mapping[transcript.participant?.name ?? ""];
        if (!participant_data) return transcript;
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
