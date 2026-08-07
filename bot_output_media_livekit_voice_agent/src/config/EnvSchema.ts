import { z } from "zod";

const RecallRegionSchema = z.enum([
    "us-east-1",
    "us-west-2",
    "eu-central-1",
    "ap-northeast-1",
]);

const LiveKitUrlSchema = z
    .string()
    .url()
    .refine((value) => value.startsWith("ws://") || value.startsWith("wss://"), {
        message: "LIVEKIT_URL must use ws:// or wss://",
    });

const PositiveSecondsSchema = z.coerce.number().int().positive();

const LiveKitCredentialsSchema = z.object({
    LIVEKIT_URL: LiveKitUrlSchema,
    LIVEKIT_API_KEY: z.string().min(1),
    LIVEKIT_API_SECRET: z.string().min(1),
    LIVEKIT_AGENT_NAME: z.string().min(1).default("recall-livekit-voice-agent"),
});

export const ServerEnvSchema = LiveKitCredentialsSchema.extend({
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    OUTPUT_MEDIA_SIGNING_SECRET: z.string().min(32),
    LIVEKIT_TOKEN_TTL_SECONDS: PositiveSecondsSchema.default(600),
});

export const AgentEnvSchema = LiveKitCredentialsSchema.extend({
    LIVEKIT_STT_MODEL: z.string().min(1).default("deepgram/nova-3"),
    LIVEKIT_STT_LANGUAGE: z.string().min(1).default("multi"),
    LIVEKIT_LLM_MODEL: z.string().min(1).default("google/gemma-4-31b-it"),
    LIVEKIT_TTS_MODEL: z.string().min(1).default("inworld/inworld-tts-2"),
    LIVEKIT_TTS_VOICE: z.string().min(1).default("Ashley"),
});

export const CreateBotEnvSchema = z.object({
    RECALL_REGION: RecallRegionSchema,
    RECALL_API_KEY: z.string().min(1),
    MEETING_URL: z.string().url(),
    BOT_NAME: z.string().min(1).default("LiveKit Voice Agent"),
    PUBLIC_BASE_URL: z
        .string()
        .url()
        .refine((value) => value.startsWith("https://"), {
            message: "PUBLIC_BASE_URL must use https://",
        }),
    LIVEKIT_AGENT_NAME: z.string().min(1).default("recall-livekit-voice-agent"),
    OUTPUT_MEDIA_SIGNING_SECRET: z.string().min(32),
    OUTPUT_MEDIA_SESSION_TTL_SECONDS: PositiveSecondsSchema.default(3600),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export type AgentEnv = z.infer<typeof AgentEnvSchema>;
export type CreateBotEnv = z.infer<typeof CreateBotEnvSchema>;
