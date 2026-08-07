import { useEffect, useRef, useState } from "react";
import {
    INITIAL_BRIDGE_STATUS,
    type BridgeStatus,
} from "../livekit/bridge_status";
import { BrowserBridge } from "../livekit/browser_bridge";
import { fetchConnectionDetails } from "./connection-details";
import { recoverSessionToken } from "./session-token";

interface CheckpointProps {
    complete: boolean;
    label: string;
}

function Checkpoint({ complete, label }: CheckpointProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span
                className={`h-2.5 w-2.5 rounded-full ${
                    complete
                        ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
                        : "bg-slate-600"
                }`}
            />
            <span className={complete ? "text-slate-100" : "text-slate-400"}>
                {label}
            </span>
        </div>
    );
}

function phaseLabel(status: BridgeStatus): string {
    if (status.error) return "Connection failed";

    const labels: Record<BridgeStatus["phase"], string> = {
        loading: "Loading bridge",
        connecting: "Connecting to LiveKit",
        connected: "Waiting for the agent",
        listening: "Listening",
        thinking: "Thinking",
        speaking: "Speaking",
        reconnecting: "Reconnecting",
        disconnected: "Disconnected",
        failed: "Connection failed",
    };

    return labels[status.phase];
}

function safeInitializationMessage(error: unknown): string {
    const safeMessages = new Set([
        "This Output Media page requires a signed session URL",
        "The Output Media session has expired or is invalid",
        "Unable to fetch LiveKit connection details",
        "Unable to initialize the LiveKit bridge",
    ]);

    if (error instanceof Error && safeMessages.has(error.message)) {
        return error.message;
    }

    return "Unable to initialize the bridge";
}

export default function App() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [status, setStatus] = useState<BridgeStatus>(INITIAL_BRIDGE_STATUS);

    useEffect(() => {
        let bridge: BrowserBridge | null = null;
        let cancelled = false;

        performance.mark("recall-page-initialized");
        console.info(
            JSON.stringify({
                event: "page_initialized",
                elapsed_ms: Math.round(performance.now()),
            }),
        );

        async function startBridge(): Promise<void> {
            try {
                const sessionToken = recoverSessionToken();
                const connectionDetails = await fetchConnectionDetails(sessionToken);
                if (cancelled || !audioRef.current) return;

                bridge = new BrowserBridge({
                    connection_details: connectionDetails,
                    audio_element: audioRef.current,
                    on_status: setStatus,
                });
                await bridge.connect();
            } catch (error) {
                if (cancelled) return;
                console.error(
                    JSON.stringify({
                        event: "page_initialization_failed",
                        error_type:
                            error instanceof Error
                                ? error.constructor.name
                                : "UnknownError",
                    }),
                );
                setStatus((currentStatus) => ({
                    ...currentStatus,
                    phase: "failed",
                    error: safeInitializationMessage(error),
                }));
            }
        }

        void startBridge();

        return () => {
            cancelled = true;
            if (bridge) void bridge.close();
        };
    }, []);

    return (
        <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-950 text-slate-100">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_45%)]" />

            <section className="relative w-[680px] rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                <div className="mb-8 flex items-start justify-between gap-6">
                    <div>
                        <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-blue-400 uppercase">
                            Recall.ai + LiveKit
                        </p>
                        <h1 className="text-3xl font-semibold">Voice Agent Bridge</h1>
                    </div>
                    <div
                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                            status.phase === "failed"
                                ? "bg-red-500/15 text-red-300"
                                : status.phase === "speaking"
                                  ? "bg-violet-500/15 text-violet-300"
                                  : "bg-blue-500/15 text-blue-300"
                        }`}
                    >
                        {phaseLabel(status)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Checkpoint
                        complete={status.page_initialized}
                        label="Recall page loaded"
                    />
                    <Checkpoint
                        complete={status.livekit_connected}
                        label="LiveKit connected"
                    />
                    <Checkpoint
                        complete={status.meeting_audio_published}
                        label="Meeting audio published"
                    />
                    <Checkpoint
                        complete={status.agent_audio_attached}
                        label="Agent audio attached"
                    />
                </div>

                {status.error && (
                    <p className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {status.error}
                    </p>
                )}

                <p className="mt-8 text-sm leading-6 text-slate-400">
                    Meeting audio is sent to the LiveKit Agent. The agent&apos;s
                    response is played through this page and back into the meeting.
                </p>

                <audio ref={audioRef} className="hidden" />
            </section>
        </main>
    );
}
