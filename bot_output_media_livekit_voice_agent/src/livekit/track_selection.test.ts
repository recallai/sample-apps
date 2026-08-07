import { ParticipantKind, Track } from "livekit-client";
import { describe, expect, it } from "vitest";
import { is_agent_audio_publication } from "./track_selection";

const agent_identity = "voice-agent-session";

describe("agent audio selection", () => {
    it("selects only microphone audio from the expected agent", () => {
        expect(
            is_agent_audio_publication(
                {
                    identity: agent_identity,
                    kind: ParticipantKind.AGENT,
                },
                {
                    kind: Track.Kind.Audio,
                    source: Track.Source.Microphone,
                },
                agent_identity,
            ),
        ).toBe(true);
    });

    it.each([
        {
            participant: {
                identity: "another-participant",
                kind: ParticipantKind.AGENT,
            },
            publication: {
                kind: Track.Kind.Audio,
                source: Track.Source.Microphone,
            },
        },
        {
            participant: {
                identity: agent_identity,
                kind: ParticipantKind.STANDARD,
            },
            publication: {
                kind: Track.Kind.Audio,
                source: Track.Source.Microphone,
            },
        },
        {
            participant: {
                identity: agent_identity,
                kind: ParticipantKind.AGENT,
            },
            publication: {
                kind: Track.Kind.Video,
                source: Track.Source.Camera,
            },
        },
    ])("rejects unrelated participants and tracks", ({ participant, publication }) => {
        expect(
            is_agent_audio_publication(
                participant,
                publication,
                agent_identity,
            ),
        ).toBe(false);
    });
});
