import { describe, expect, it } from "vitest";
import {
    INITIAL_BRIDGE_STATUS,
    update_bridge_status,
} from "./bridge_status";

describe("bridge lifecycle state", () => {
    it("preserves checkpoints across lifecycle transitions", () => {
        const connected = update_bridge_status(INITIAL_BRIDGE_STATUS, {
            phase: "connected",
            livekit_connected: true,
            meeting_audio_published: true,
        });
        const speaking = update_bridge_status(connected, {
            phase: "speaking",
            agent_audio_attached: true,
        });
        const reconnecting = update_bridge_status(speaking, {
            phase: "reconnecting",
            livekit_connected: false,
        });

        expect(speaking).toMatchObject({
            phase: "speaking",
            livekit_connected: true,
            meeting_audio_published: true,
            agent_audio_attached: true,
        });
        expect(reconnecting).toMatchObject({
            phase: "reconnecting",
            livekit_connected: false,
            meeting_audio_published: true,
            agent_audio_attached: true,
        });
    });
});
