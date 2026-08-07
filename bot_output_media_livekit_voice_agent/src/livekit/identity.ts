const ROOM_PREFIX = "recall-livekit-";

export interface SessionIdentity {
    session_id: string;
    room_name: string;
    bridge_identity: string;
    agent_identity: string;
}

export function create_session_identity(session_id: string): SessionIdentity {
    return {
        session_id,
        room_name: `${ROOM_PREFIX}${session_id}`,
        bridge_identity: `recall-bridge-${session_id}`,
        agent_identity: `voice-agent-${session_id}`,
    };
}

export function session_id_from_room_name(room_name: string): string {
    if (!room_name.startsWith(ROOM_PREFIX)) {
        throw new Error(`Unexpected room name: ${room_name}`);
    }

    const session_id = room_name.slice(ROOM_PREFIX.length);
    if (!session_id) {
        throw new Error("Room name is missing a session ID");
    }

    return session_id;
}
