import { describe, expect, it } from "vitest";
import {
    create_session_identity,
    session_id_from_room_name,
} from "./identity";

describe("stable LiveKit identities", () => {
    it("wires one session to deterministic room, bridge, and agent identities", () => {
        const session_id = "b95d453e-17aa-499f-9502-411e6d0f6972";
        const identity = create_session_identity(session_id);

        expect(identity).toEqual({
            session_id,
            room_name: `recall-livekit-${session_id}`,
            bridge_identity: `recall-bridge-${session_id}`,
            agent_identity: `voice-agent-${session_id}`,
        });
        expect(session_id_from_room_name(identity.room_name)).toBe(session_id);
    });

    it("rejects rooms outside the sample naming contract", () => {
        expect(() => session_id_from_room_name("unrelated-room")).toThrow(
            "Unexpected room name",
        );
    });
});
