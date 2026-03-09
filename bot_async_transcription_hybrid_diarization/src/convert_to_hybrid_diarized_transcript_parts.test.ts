import { describe, it, expect } from "vitest";
import { convert_to_hybrid_diarized_transcript_parts } from "./convert_to_hybrid_diarized_transcript_parts";
import type { ParticipantPartType } from "./schemas/ParticipantPartSchema";
import type { TranscriptPartType } from "./schemas/TranscriptPartSchema";

function create_transcript(opts: {
    speakerName: string | null;
    startTime: number;
    endTime: number;
    text?: string;
}): TranscriptPartType {
    return {
        participant: {
            id: null,
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

function create_participant(opts: {
    id: number;
    name: string | null;
    is_host?: boolean | null;
    platform?: string | null;
    extra_data?: unknown;
    email?: string | null;
}): ParticipantPartType {
    return {
        id: opts.id,
        name: opts.name,
        is_host: opts.is_host ?? null,
        platform: opts.platform ?? null,
        extra_data: opts.extra_data ?? null,
        email: opts.email ?? null,
    };
}

describe("convert_to_hybrid_diarized_transcript_parts", () => {
    describe("Happy Path - Single Anonymous Label Per Participant", () => {
        it("should map transcript parts to real participant when only one anonymous label exists", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "100-0", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "100-0", startTime: 6, endTime: 10 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result).toHaveLength(2);
            expect(result[0].participant.id).toBe(100);
            expect(result[0].participant.name).toBe("John");
            expect(result[1].participant.id).toBe(100);
            expect(result[1].participant.name).toBe("John");
        });

        it("should map multiple participants correctly when each has a single anonymous label", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "100-0", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "200-0", startTime: 6, endTime: 10 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
                create_participant({ id: 200, name: "Mary" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result).toHaveLength(2);
            expect(result[0].participant.name).toBe("John");
            expect(result[0].participant.id).toBe(100);
            expect(result[1].participant.name).toBe("Mary");
            expect(result[1].participant.id).toBe(200);
        });
    });

    describe("Multiple Anonymous Labels Per Participant - No Mapping", () => {
        it("should NOT map when participant has multiple anonymous labels", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "100-0", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "100-1", startTime: 6, endTime: 10 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result[0].participant.name).toBe("100-0");
            expect(result[0].participant.id).toBeNull();
            expect(result[1].participant.name).toBe("100-1");
            expect(result[1].participant.id).toBeNull();
        });
    });

    describe("Mixed Participants - Some Mapped, Some Not", () => {
        it("should map participant with single label but not participant with multiple labels", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "100-0", startTime: 1, endTime: 5 }),
                create_transcript({ speakerName: "100-1", startTime: 6, endTime: 9 }),
                create_transcript({ speakerName: "200-0", startTime: 16, endTime: 20 }),
                create_transcript({ speakerName: "200-0", startTime: 21, endTime: 25 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
                create_participant({ id: 200, name: "Mary" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result[0].participant.name).toBe("100-0");
            expect(result[0].participant.id).toBeNull();
            expect(result[1].participant.name).toBe("100-1");
            expect(result[1].participant.id).toBeNull();
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
                participants: [
                    create_participant({ id: 100, name: "John" }),
                ],
            });

            expect(result).toHaveLength(0);
        });

        it("should return unchanged transcripts when participants is empty", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "100-0", startTime: 1, endTime: 5 }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants: [],
            });

            expect(result).toHaveLength(1);
            expect(result[0].participant.name).toBe("100-0");
            expect(result[0].participant.id).toBeNull();
        });

        it("should leave transcript unchanged when name is null", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: null, startTime: 1, endTime: 5 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result[0].participant.name).toBeNull();
            expect(result[0].participant.id).toBeNull();
        });

        it("should leave transcript unchanged when name does not match expected format", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "Speaker A", startTime: 1, endTime: 5 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result[0].participant.name).toBe("Speaker A");
            expect(result[0].participant.id).toBeNull();
        });

        it("should leave transcript unchanged when participant_id has no match in participants list", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "999-0", startTime: 1, endTime: 5 }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result[0].participant.name).toBe("999-0");
            expect(result[0].participant.id).toBeNull();
        });

        it("should handle transcript with empty words array gracefully", () => {
            const transcript_parts: TranscriptPartType[] = [
                {
                    participant: {
                        id: null,
                        name: "100-0",
                        is_host: null,
                        platform: null,
                        extra_data: null,
                        email: null,
                    },
                    words: [],
                },
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "John" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result).toHaveLength(1);
            expect(result[0].participant.name).toBe("John");
            expect(result[0].participant.id).toBe(100);
        });
    });

    describe("Data Preservation", () => {
        it("should replace participant fields with real participant data when mapping", () => {
            const transcript_parts: TranscriptPartType[] = [
                {
                    participant: {
                        id: null,
                        name: "100-0",
                        is_host: null,
                        platform: "mobile_app",
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
            const participants: ParticipantPartType[] = [
                create_participant({
                    id: 100,
                    name: "John",
                    is_host: true,
                    platform: "desktop",
                    extra_data: { zoom: { guest: false } },
                    email: "john@example.com",
                }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            expect(result[0].participant.id).toBe(100);
            expect(result[0].participant.name).toBe("John");
            expect(result[0].participant.is_host).toBe(true);
            expect(result[0].participant.platform).toBe("desktop");
            expect(result[0].participant.extra_data).toEqual({ zoom: { guest: false } });
            expect(result[0].participant.email).toBe("john@example.com");
            // Words should be preserved
            expect(result[0].words[0].text).toBe("Hello world");
            expect(result[0].words[0].start_timestamp?.absolute).toBe("2025-01-01T00:00:01Z");
        });
    });

    describe("Word Order Preservation", () => {
        it("should preserve word order in a multi-speaker conversation", () => {
            const transcript_parts: TranscriptPartType[] = [
                create_transcript({ speakerName: "100-0", startTime: 1, endTime: 6, text: "how is it going today" }),
                create_transcript({ speakerName: "200-0", startTime: 10, endTime: 13, text: "it is good" }),
                create_transcript({ speakerName: "200-1", startTime: 14, endTime: 18, text: "Actually it is great" }),
                create_transcript({ speakerName: "100-0", startTime: 22, endTime: 28, text: "Oh that's great to hear then!" }),
            ];
            const participants: ParticipantPartType[] = [
                create_participant({ id: 100, name: "Max" }),
                create_participant({ id: 200, name: "Anon" }),
            ];

            const result = convert_to_hybrid_diarized_transcript_parts({
                transcript_parts,
                participants,
            });

            // Max (100) has only label "0" → mapped
            expect(result[0].participant.name).toBe("Max");
            expect(result[0].participant.id).toBe(100);
            // Anon (200) has labels "0" and "1" → NOT mapped
            expect(result[1].participant.name).toBe("200-0");
            expect(result[1].participant.id).toBeNull();
            expect(result[2].participant.name).toBe("200-1");
            expect(result[2].participant.id).toBeNull();
            // Max again
            expect(result[3].participant.name).toBe("Max");
            expect(result[3].participant.id).toBe(100);

            expect(result[0].words[0].text).toBe("how is it going today");
            expect(result[1].words[0].text).toBe("it is good");
            expect(result[2].words[0].text).toBe("Actually it is great");
            expect(result[3].words[0].text).toBe("Oh that's great to hear then!");
        });
    });
});
