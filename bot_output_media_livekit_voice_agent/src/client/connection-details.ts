import { z } from "zod";
import type { LiveKitConnectionDetails } from "../livekit/create_bridge_token";

const connectionDetailsSchema = z.object({
    server_url: z.string().url(),
    participant_token: z.string().min(1),
    agent_identity: z.string().min(1),
});

export async function fetchConnectionDetails(
    sessionToken: string,
): Promise<LiveKitConnectionDetails> {
    const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            session_token: sessionToken,
        }),
    });

    if (!response.ok) {
        const message =
            response.status === 401
                ? "The Output Media session has expired or is invalid"
                : "Unable to fetch LiveKit connection details";
        throw new Error(message);
    }

    return connectionDetailsSchema.parse(await response.json());
}
