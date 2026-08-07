// CORE — Which remote track the bridge may subscribe to.
// Only the named agent participant's microphone audio is accepted; everything
// else in the room is ignored so meeting talkback stays clean.

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
