import { describe, it, expect } from "vitest";
import { convert_to_hybrid_diarized_transcript_parts } from "./convert_to_hybrid_diarized_transcript_parts";
import type { SpeakerTimelinePartType } from "./schemas/SpeakerTimelinePartSchema";
import type { TranscriptPartType } from "./schemas/TranscriptPartSchema";

// Helper to create a transcript segment
function create_transcript(opts: {
    speakerName: string | null;
    speakerId?: number | null;
    startTime: number;
    endTime: number;
    text?: string;
}): TranscriptPartType {
    return {
        participant: {
            id: opts.speakerId ?? null,
            name: opts.speakerName,
            is_host: null,
            platform: null,
            extra_data: null,
            email: null,
        },
        words: [
            {
                text: opts.text ?? "hello",
                start_timestamp: { relative: opts.startTime, absolute: null },
                end_timestamp: { relative: opts.endTime, absolute: null },
            },
        ],
    };
}

// Helper to create a speaker timeline event
function create_speaker_event(opts: {
    participantId: number | null;
    participantName: string | null;
    startTime: number;
    endTime: number | null;
}): SpeakerTimelinePartType {
    return {
        participant: {
            id: opts.participantId,
            name: opts.participantName,
            is_host: null,
            platform: null,
            extra_data: null,
            email: null,
        },
        start_timestamp: { relative: opts.startTime, absolute: null },
        end_timestamp: opts.endTime !== null
            ? { relative: opts.endTime, absolute: null }
            : null,
    };
}

describe("convert_to_hybrid_diarized_transcript_parts", () => {
    describe("Happy Path - Single Speaker Per Participant", () => {
        it("should map anonymous speaker to real participant when only one speaker exists", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "Speaker A", startTime: 6, endTime: 10 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 15 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result).toHaveLength(2);
            expect(result[0].participant.id).toBe(100);
            expect(result[0].participant.name).toBe("John");
            expect(result[1].participant.id).toBe(100);
            expect(result[1].participant.name).toBe("John");
        });

        it("should map multiple participants correctly when each has a unique anonymous speaker", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "Speaker B", startTime: 16, endTime: 20 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
                create_speaker_event({ participantId: 200, participantName: "Mary", startTime: 15, endTime: 25 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result).toHaveLength(2);
            expect(result[0].participant.name).toBe("John");
            expect(result[1].participant.name).toBe("Mary");
        });
    });

    describe("Multiple Speakers Per Participant - No Mapping", () => {
        it("should NOT map when participant has multiple anonymous speakers in same segment", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "Speaker B", startTime: 6, endTime: 10 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 15 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Should remain unchanged - no mapping applied
            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
            expect(result[1].participant.name).toBe("Speaker B");
            expect(result[1].participant.id).toBeNull();
        });

        it("should NOT map when participant has multiple speakers across different timeline segments", () => {
            // This is the key edge case: single speaker first, then multiple, then single again
            const transcript_parts: TranscriptPartType[] = [
                // Segment 1: Only Speaker A
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                // Segment 2: Both Speaker A and Speaker B
                create_transcript({ speakerName: "Speaker A", startTime: 11, endTime: 13 }),
                create_transcript({ speakerName: "Speaker B", startTime: 14, endTime: 18 }),
                // Segment 3: Only Speaker A again
                create_transcript({ speakerName: "Speaker A", startTime: 21, endTime: 25 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 10, endTime: 20 }),
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 20, endTime: 30 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Because John had both A and B at some point, NONE should be mapped
            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
            expect(result[1].participant.name).toBe("Speaker A");
            expect(result[2].participant.name).toBe("Speaker B");
            expect(result[3].participant.name).toBe("Speaker A");
        });

        it("should NOT map when different speakers use same device in separate timeline segments", () => {
            // Scenario: Two people call in from the same device (John) at different times
            // Speaker A speaks during John's first segment
            // Speaker B speaks during John's second segment (different person, same device)
            // Mary has only Speaker C, so she should be mapped
            const transcript_parts: TranscriptPartType[] = [
                // John segment 1: Speaker A
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                // Mary segment: Speaker C
                create_transcript({ speakerName: "Speaker C", startTime: 11, endTime: 14 }),
                // John segment 2: Speaker B (different person on same device)
                create_transcript({ speakerName: "Speaker B", startTime: 16, endTime: 20 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
                create_speaker_event({ participantId: 200, participantName: "Mary", startTime: 10, endTime: 15 }),
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 15, endTime: 25 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // John had both A and B across segments - stays anonymous
            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
            // Mary had only C - gets mapped
            expect(result[1].participant.name).toBe("Mary");
            expect(result[1].participant.id).toBe(200);
            // John's second segment also stays anonymous
            expect(result[2].participant.name).toBe("Speaker B");
            expect(result[2].participant.id).toBeNull();
        });
    });

    describe("Mixed Participants - Some Mapped, Some Not", () => {
        it("should map participant with single speaker but not participant with multiple speakers", () => {
            const transcript_parts: TranscriptPartType[] = [
                // John's segments - has multiple speakers (A and B)
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "Speaker B", startTime: 6, endTime: 9 }),
                // Mary's segments - has single speaker (C)
                create_transcript({ speakerName: "Speaker C", startTime: 16, endTime: 20 }),
                create_transcript({ speakerName: "Speaker C", startTime: 21, endTime: 25 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
                create_speaker_event({ participantId: 200, participantName: "Mary", startTime: 15, endTime: 30 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // John's segments stay anonymous
            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
            expect(result[1].participant.name).toBe("Speaker B");
            expect(result[1].participant.id).toBeNull();
            // Mary's segments get mapped
            expect(result[2].participant.name).toBe("Mary");
            expect(result[2].participant.id).toBe(200);
            expect(result[3].participant.name).toBe("Mary");
            expect(result[3].participant.id).toBe(200);
        });
    });

    describe("Edge Cases - Empty and Missing Data", () => {
        it("should return empty array when transcript_parts is empty", () => {
            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts: [],
                speaker_timeline_data: [
                    create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
                ],
            });

            expect(result).toHaveLength(0);
        });

        it("should return unchanged transcripts when speaker_timeline_data is empty", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data: [],
            });

            expect(result).toHaveLength(1);
            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
        });

        it("should skip speaker events with null participant id", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: null, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // No mapping should occur
            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
        });

        it("should skip speaker events with null participant name", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: null, startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
        });

        it("should not add to speaker set when transcript has null participant name", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: null, startTime: 1, endTime: 5 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Should remain unchanged
            expect(result[0].participant.name).toBeNull();
            expect(result[0].participant.id).toBeNull();
        });
    });

    describe("Edge Cases - Timing and Boundaries", () => {
        it("should only include transcript segments fully contained within speaker event", () => {
            const transcript_parts: TranscriptPartType[] = [
                // Fully contained - should be included
                create_transcript({ speakerName: "Speaker A", startTime: 2, endTime: 8 }),
                // Starts before speaker event - should NOT be included
                create_transcript({ speakerName: "Speaker B", startTime: -1, endTime: 5 }),
                // Ends at or after speaker event end - should NOT be included
                create_transcript({ speakerName: "Speaker C", startTime: 5, endTime: 10 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Only Speaker A should be mapped to John (only one that was fully contained)
            expect(result[0].participant.name).toBe("John");
            expect(result[0].participant.id).toBe(100);
            // Others remain unchanged
            expect(result[1].participant.name).toBe("Speaker B");
            expect(result[2].participant.name).toBe("Speaker C");
        });

        it("should handle speaker event with null end_timestamp (extends to infinity)", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 100, endTime: 200 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 50, endTime: null }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result[0].participant.name).toBe("John");
            expect(result[0].participant.id).toBe(100);
        });

        it("should handle transcript segment with start exactly at speaker event start", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 0, endTime: 5 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result[0].participant.name).toBe("John");
        });

        it("should NOT include transcript that ends exactly at speaker event end", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 5, endTime: 10 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Condition is speaker_event_end > end, so 10 > 10 is false - not included
            expect(result[0].participant.name).toBe("Speaker A");
        });
    });

    describe("Edge Cases - Transcript Not Matching Any Speaker Event", () => {
        it("should leave transcript unchanged when it doesn't fall within any speaker event", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 50, endTime: 60 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
        });
    });

    describe("Data Preservation", () => {
        it("should preserve other transcript fields when mapping participant", () => {
            const transcript_parts: TranscriptPartType[] = [
                {
                    participant: {
                        id: null,
                        name: "Speaker A",
                        is_host: true,
                        platform: "desktop",
                        extra_data: { custom: "data" },
                        email: "original@example.com",
                    },
                    words: [
                        {
                            text: "Hello world",
                            start_timestamp: { relative: 1, absolute: "2025-01-01T00:00:01Z" },
                            end_timestamp: { relative: 5, absolute: "2025-01-01T00:00:05Z" },
                        },
                    ],
                },
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Participant fields should be updated
            expect(result[0].participant.id).toBe(100);
            expect(result[0].participant.name).toBe("John");
            // Other participant fields should be preserved
            expect(result[0].participant.is_host).toBe(true);
            expect(result[0].participant.platform).toBe("desktop");
            expect(result[0].participant.extra_data).toEqual({ custom: "data" });
            expect(result[0].participant.email).toBe("original@example.com");
            // Words should be preserved
            expect(result[0].words[0].text).toBe("Hello world");
            expect(result[0].words[0].start_timestamp?.absolute).toBe("2025-01-01T00:00:01Z");
        });
    });

    describe("Edge Cases - Same Anonymous Speaker for Multiple Participants", () => {
        it("should overwrite mapping when same anonymous speaker appears for different participants", () => {
            // This is a potential issue: if machine diarization assigns same label to different participants
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "Speaker A", startTime: 16, endTime: 20 }),
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
                create_speaker_event({ participantId: 200, participantName: "Mary", startTime: 15, endTime: 25 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            // Current behavior: last one wins (Mary overwrites John)
            // Both get mapped to Mary
            expect(result[0].participant.name).toBe("Mary");
            expect(result[1].participant.name).toBe("Mary");
        });
    });

    describe("Edge Cases - Empty Words Array", () => {
        it("should handle transcript with empty words array gracefully", () => {
            const transcript_parts: TranscriptPartType[] = [
                {
                    participant: {
                        id: null,
                        name: "Speaker A",
                        is_host: null,
                        platform: null,
                        extra_data: null,
                        email: null,
                    },
                    words: [],
                },
            ];
            const speaker_timeline_data: SpeakerTimelinePartType[] = [
                create_speaker_event({ participantId: 100, participantName: "John", startTime: 0, endTime: 10 }),
            ];

            // Should not throw - the optional chaining on words[0]?.start_timestamp should handle this
            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                speaker_timeline_data,
            });

            expect(result).toHaveLength(1);
            // With empty words, start defaults to NEGATIVE_INFINITY and end to POSITIVE_INFINITY
            // So it won't be contained within the speaker event (start must be >= speaker_event_start)
            // Actually NEGATIVE_INFINITY >= 0 is false, so it won't match
            expect(result[0].participant.name).toBe("Speaker A");
        });
    });
});

