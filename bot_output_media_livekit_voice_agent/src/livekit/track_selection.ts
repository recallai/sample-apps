import {
    ParticipantKind,
    Track,
    type RemoteParticipant,
    type RemoteTrackPublication,
} from "livekit-client";

type SelectableParticipant = Pick<RemoteParticipant, "identity" | "kind">;
type SelectablePublication = Pick<RemoteTrackPublication, "kind" | "source">;

export function is_agent_audio_publication(
    participant: SelectableParticipant,
    publication: SelectablePublication,
    agent_identity: string,
): boolean {
    return (
        participant.identity === agent_identity &&
        participant.kind === ParticipantKind.AGENT &&
        publication.kind === Track.Kind.Audio &&
        publication.source === Track.Source.Microphone
    );
}
