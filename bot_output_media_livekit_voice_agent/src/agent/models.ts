import { inference } from "@livekit/agents";

export interface ModelDescriptors {
    stt_model: string;
    stt_language: string;
    llm_model: string;
    tts_model: string;
    tts_voice: string;
}

export function create_voice_models(descriptors: ModelDescriptors) {
    return {
        stt: inference.STT.fromModelString(
            `${descriptors.stt_model}:${descriptors.stt_language}`,
        ),
        llm: inference.LLM.fromModelString(descriptors.llm_model),
        tts: inference.TTS.fromModelString(
            `${descriptors.tts_model}:${descriptors.tts_voice}`,
        ),
        turn_detector: new inference.TurnDetector(),
    };
}
