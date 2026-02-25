/**
 * Configure which transcription providers to compare.
 * Each provider must have its API key configured in the Recall dashboard.
 *
 * Configs below enable language detection and code-switching where supported.
 * See: https://docs.recall.ai/docs/multilingual-transcription
 *
 * Available providers:
 * - recallai_async: Recall.ai native (code-switching by default)
 * - assembly_ai_async: AssemblyAI (code-switching with universal model)
 * - deepgram_async: Deepgram (code-switching with nova-3 + multi)
 * - gladia_v2_async: Gladia (code-switching supported)
 * - speechmatics_async: Speechmatics (specific language pairs only)
 * - rev_async: Rev (no code-switching support)
 * - google_cloud_stt: Google Cloud STT (no code-switching support)
 *
 * Note: aws_transcribe async is NOT supported by the Recall API
 */
export const PROVIDER_CONFIGS = [
    // Recall.ai - code-switching enabled by default with "auto"
    { recallai_async: { language_code: "auto" } },

    // AssemblyAI - universal model for code-switching
    { assembly_ai_async: { speech_models: ["universal"], language_detection: true } },

    // Deepgram - nova-3 with "multi" for code-switching
    { deepgram_async: { model: "nova-3", language: "multi" } },

    // Speechmatics - only specific language pairs (e.g., "cmn_en" for Mandarin↔English)
    { speechmatics_async: { language: "cmn_en" } },

    // Rev - no code-switching support
    // { rev_async: {} },

    // Google Cloud STT - no code-switching support
    // { google_cloud_stt: {} },
];

export type ProviderConfig = (typeof PROVIDER_CONFIGS)[number];

export function get_provider_name(config: ProviderConfig): string {
    return Object.keys(config)[0];
}
