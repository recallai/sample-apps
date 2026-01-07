import { SessionState } from "@heygen/liveavatar-web-sdk";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "./components/ui/Button";
import { ScrollArea } from "./components/ui/ScrollArea";
import { useLiveAvatarContext } from "./contexts/LiveAvatarContext";
import { useSession } from "./hooks/use-session";
import { useSpeakerActions } from "./hooks/use-speaker-actions";

function App() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const {
        sessionState,
        isStreamReady,
        startSession,
        stopSession,
        attachElement,
    } = useSession();
    const {
        muteMic,
        unmuteMic,
        startListening,
        isMuted,
        isMicConnecting,
        isMicActive,
        isUserTalking,
    } = useSpeakerActions();
    const { transcript, isAvatarTalking } = useLiveAvatarContext();

    const isConnected = sessionState === SessionState.CONNECTED;
    const isConnecting = sessionState === SessionState.CONNECTING;

    // Attach video element when stream is ready
    useEffect(() => {
        if (isStreamReady && videoRef.current) {
            attachElement(videoRef.current);
        }
    }, [isStreamReady, attachElement]);

    // Auto-start session on mount
    useEffect(() => {
        if (sessionState === SessionState.INACTIVE) {
            void startSession();
        }
    }, [sessionState, startSession]);

    // Auto-enable mic when connected
    useEffect(() => {
        if (isConnected && !isMicActive && !isMicConnecting) {
            void startListening().then(() => {
                // Unmute after starting to listen
                void unmuteMic();
            });
        }
    }, [isConnected, isMicActive, isMicConnecting, startListening, unmuteMic]);

    const handleEndSession = async () => {
        await stopSession();
        // Optionally reload or show end screen
        window.location.reload();
    };

    const toggleMute = async () => {
        if (isMuted) {
            await unmuteMic();
        } else {
            await muteMic();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950">
            {/* Avatar Video - Full Screen */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Loading/Connecting State */}
            {!isStreamReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xl text-slate-300">
                            {isConnecting
                                ? "Connecting to avatar..."
                                : "Initializing session..."}
                        </p>
                    </div>
                </div>
            )}

            {/* Speaking Indicators */}
            {isStreamReady && (
                <div className="absolute top-6 left-6 flex gap-3">
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

            {/* Transcript Overlay */}
            {transcript.length > 0 && (
                <div className="absolute bottom-28 left-6 right-6 max-w-2xl mx-auto">
                    <ScrollArea className="max-h-40 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-5">
                        <div className="space-y-3">
                            {transcript.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={`text-base ${
                                        entry.participant === "avatar"
                                            ? "text-purple-300"
                                            : "text-emerald-300"
                                    }`}
                                >
                                    <span className="font-semibold">
                                        {entry.participant === "avatar"
                                            ? "Avatar"
                                            : "You"}
                                        :
                                    </span>{" "}
                                    {entry.text}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Controls - Bottom Center */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
                {/* Mute/Unmute */}
                <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="icon-lg"
                    onClick={toggleMute}
                    disabled={!isConnected || isMicConnecting}
                    className="rounded-full w-14 h-14 backdrop-blur-sm"
                >
                    {isMuted ? (
                        <MicOff className="h-6 w-6" />
                    ) : (
                        <Mic className="h-6 w-6" />
                    )}
                </Button>

                {/* End Session */}
                <Button
                    variant="destructive"
                    size="icon-lg"
                    onClick={handleEndSession}
                    className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
                >
                    <PhoneOff className="h-6 w-6" />
                </Button>
            </div>

            {/* Mic Status Indicator */}
            {isConnected && (
                <div className="absolute bottom-8 right-6 text-sm text-slate-400">
                    {isMicConnecting && "Connecting mic..."}
                    {isMicActive && !isMuted && "🎤 Mic active"}
                    {isMicActive && isMuted && "🔇 Mic muted"}
                </div>
            )}
        </div>
    );
}

export default App;
