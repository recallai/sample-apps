import { SessionState } from "@heygen/liveavatar-web-sdk";
import { useEffect, useRef, useState } from "react";
import { useLiveAvatarContext } from "./contexts/LiveAvatarContext";
import { useSession } from "./hooks/use-session";
import { useSpeakerActions } from "./hooks/use-speaker-actions";

function App() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasInitialized = useRef(false);
    const [micError, setMicError] = useState<string | null>(null);

    const { isAvatarTalking, sessionError } = useLiveAvatarContext();
    const { startListening, unmuteMic, isUserTalking } = useSpeakerActions();
    const { sessionState, isStreamReady, startSession, attachElement } =
        useSession();

    const isConnecting = sessionState === SessionState.CONNECTING;

    // Attach video element when stream is ready
    useEffect(() => {
        if (isStreamReady && videoRef.current) {
            attachElement(videoRef.current);
        }
    }, [isStreamReady, attachElement]);

    // Request mic permission, start session, and enable mic for user
    useEffect(() => {
        if (sessionState !== SessionState.INACTIVE || hasInitialized.current) {
            return;
        }
        hasInitialized.current = true;

        async function initializeSession() {
            try {
                // Request mic permission (shows browser prompt)
                // This is required for the avatar to be able to hear the user's voice.
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });

                // Start the HeyGen session
                await startSession();

                // Enable voice chat
                await startListening();
                await unmuteMic();
            } catch (error) {
                console.error("Session initialization error:", error);
                if (
                    error instanceof Error &&
                    error.name === "NotAllowedError"
                ) {
                    setMicError(
                        "Microphone access was denied. Click the lock icon in your browser's address bar, then reset permissions and refresh.",
                    );
                } else {
                    setMicError(
                        error instanceof Error
                            ? error.message
                            : "Failed to initialize session.",
                    );
                }
            }
        }

        void initializeSession();
    }, [sessionState, startSession, startListening, unmuteMic]);

    return (
        <div className="fixed inset-0 bg-slate-950">
            {/* Avatar Video - Full Screen */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Loading/Connecting/Error State */}
            {!isStreamReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <div className="text-center space-y-4 max-w-md px-6">
                        {sessionError || micError ? (
                            <>
                                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                                    <span className="text-4xl">⚠️</span>
                                </div>
                                <p className="text-xl text-red-400">
                                    {sessionError || micError}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-xl text-slate-300">
                                    {isConnecting
                                        ? "Connecting to avatar..."
                                        : "Requesting microphone access..."}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Speaking Indicators */}
            {isStreamReady && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                    {isAvatarTalking && (
                        <div className="px-4 py-2 rounded-full bg-purple-600/90 text-white text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
                            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                            Avatar speaking
                        </div>
                    )}
                    {isUserTalking && (
                        <div className="px-4 py-2 rounded-full bg-emerald-600/90 text-white text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
                            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                            You're speaking
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
