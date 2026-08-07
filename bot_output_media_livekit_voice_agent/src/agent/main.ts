// CORE — LiveKit Agent worker entrypoint for this sample.
// Accepts named-agent jobs, joins with the deterministic voice-agent identity,
// binds input to the Recall bridge participant only, and runs the voice pipeline
// (STT / LLM / TTS / turn detection / interruption).

import { fileURLToPath } from "node:url";
import {
    ServerOptions,
    cli,
    defineAgent,
    type JobContext,
    type JobRequest,
    voice,
} from "@livekit/agents";
import { parse_agent_env } from "../config/env";
import {
    create_session_identity,
    session_id_from_room_name,
} from "../livekit/identity";
import { create_agent } from "./agent";
import { create_voice_models } from "./models";

const env = parse_agent_env();

async function accept_job(request: JobRequest): Promise<void> {
    const room_name = request.room?.name;
    if (!room_name) {
        await request.reject();
        return;
    }

    try {
        const session_id = session_id_from_room_name(room_name);
        const identity = create_session_identity(session_id);
        await request.accept(
            "LiveKit Voice Agent",
            identity.agent_identity,
            "",
            {
                "app.role": "voice-agent",
                "app.session": session_id,
            },
        );
    } catch {
        await request.reject();
    }
}

export default defineAgent({
    entry: async (context: JobContext) => {
        const room_name = context.job.room?.name;
        if (!room_name) {
            throw new Error("LiveKit dispatched the agent without a room name");
        }

        const session_id = session_id_from_room_name(room_name);
        const identity = create_session_identity(session_id);
        const models = create_voice_models({
            stt_model: env.LIVEKIT_STT_MODEL,
            stt_language: env.LIVEKIT_STT_LANGUAGE,
            llm_model: env.LIVEKIT_LLM_MODEL,
            tts_model: env.LIVEKIT_TTS_MODEL,
            tts_voice: env.LIVEKIT_TTS_VOICE,
        });

        const session = new voice.AgentSession({
            stt: models.stt,
            tts: models.tts,
            turnHandling: {
                turnDetection: models.turn_detector,
                interruption: {
                    enabled: true,
                },
                preemptiveGeneration: {
                    enabled: true,
                },
            },
        });

        await session.start({
            agent: create_agent(models.llm),
            room: context.room,
            inputOptions: {
                participantIdentity: identity.bridge_identity,
            },
        });

        await context.connect();

        void session.generateReply({
            instructions:
                "Greet the meeting briefly and say that you are ready to help.",
            allowInterruptions: true,
        });
    },
});

cli.runApp(
    new ServerOptions({
        agent: fileURLToPath(import.meta.url),
        agentName: env.LIVEKIT_AGENT_NAME,
        requestFunc: accept_job,
    }),
);
