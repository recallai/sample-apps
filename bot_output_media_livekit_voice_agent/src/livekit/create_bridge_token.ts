import {
    RoomAgentDispatch,
    RoomConfiguration,
    TrackSource,
} from "@livekit/protocol";
import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import type { SessionClaims } from "../auth/session_token";

export interface LiveKitBridgeTokenConfig {
    livekit_url: string;
    livekit_api_key: string;
    livekit_api_secret: string;
    token_ttl_seconds: number;
}

export interface LiveKitConnectionDetails {
    server_url: string;
    participant_token: string;
    agent_identity: string;
}

export async function create_bridge_token(
    claims: SessionClaims,
    config: LiveKitBridgeTokenConfig,
): Promise<LiveKitConnectionDetails> {
    const access_token = new AccessToken(
        config.livekit_api_key,
        config.livekit_api_secret,
        {
            identity: claims.bridge_identity,
            name: "Recall Output Media Bridge",
            ttl: config.token_ttl_seconds,
            attributes: {
                "app.role": "recall-bridge",
                "app.session": claims.session_id,
            },
        },
    );

    const video_grant: VideoGrant = {
        roomJoin: true,
        room: claims.room_name,
        canPublish: true,
        canPublishSources: [TrackSource.MICROPHONE],
        canSubscribe: true,
        canPublishData: false,
        canUpdateOwnMetadata: false,
    };

    access_token.addGrant(video_grant);
    access_token.roomConfig = new RoomConfiguration({
        agents: [
            new RoomAgentDispatch({
                agentName: claims.agent_name,
                metadata: JSON.stringify({
                    session_id: claims.session_id,
                    bridge_identity: claims.bridge_identity,
                    agent_identity: claims.agent_identity,
                }),
            }),
        ],
    });

    return {
        server_url: config.livekit_url,
        participant_token: await access_token.toJwt(),
        agent_identity: claims.agent_identity,
    };
}
