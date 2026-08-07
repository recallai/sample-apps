export type BridgePhase =
    | "loading"
    | "connecting"
    | "connected"
    | "listening"
    | "thinking"
    | "speaking"
    | "reconnecting"
    | "disconnected"
    | "failed";

export interface BridgeStatus {
    phase: BridgePhase;
    page_initialized: boolean;
    livekit_connected: boolean;
    meeting_audio_published: boolean;
    agent_audio_attached: boolean;
    error: string | null;
}

export const INITIAL_BRIDGE_STATUS: BridgeStatus = {
    phase: "loading",
    page_initialized: true,
    livekit_connected: false,
    meeting_audio_published: false,
    agent_audio_attached: false,
    error: null,
};

export function update_bridge_status(
    current_status: BridgeStatus,
    patch: Partial<BridgeStatus>,
): BridgeStatus {
    return {
        ...current_status,
        ...patch,
    };
}
