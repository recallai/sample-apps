import { SessionState } from "@heygen/liveavatar-web-sdk";
import { Mic, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/Button";
import { ScrollArea } from "./components/ui/ScrollArea";
import { useLiveAvatarContext } from "./contexts/LiveAvatarContext";
import { useSession } from "./hooks/use-session";
import { useSpeakerActions } from "./hooks/use-speaker-actions";

function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold text-white tracking-tight">
                    HeyGen Avatar Demo
                </h1>
                <p className="text-slate-300 max-w-md mx-auto">
                    Start a conversation with an AI-powered avatar using voice
                    or text.
                </p>
                <Button
                    size="lg"
                    onClick={() => setIsModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                    <Phone className="mr-2 h-5 w-5" />
                    Start Avatar Session
                </Button>
            </div>

            {isModalOpen && (
                <AvatarModal onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
}

function AvatarModal({ onClose }: { onClose: () => void }) {
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

    // Auto-start session when modal opens
    useEffect(() => {
        if (sessionState === SessionState.INACTIVE) {
            void startSession();
        }
    }, [sessionState, startSession]);

    const handleClose = async () => {
        if (isConnected) {
            await stopSession();
        }
        onClose();
    };

    const toggleMute = async () => {
        if (isMuted) {
            await unmuteMic();
        } else {
            await muteMic();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-4xl mx-4 aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-2xl shadow-purple-500/20 border border-slate-800">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Avatar Video */}
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
                            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-slate-300">
                                {isConnecting
                                    ? "Connecting to avatar..."
                                    : "Initializing session..."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Speaking Indicators */}
                {isStreamReady && (
                    <div className="absolute top-4 left-4 flex gap-2">
                        {isAvatarTalking && (
                            <div className="px-3 py-1.5 rounded-full bg-purple-600/90 text-white text-sm font-medium flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                Avatar speaking
                            </div>
                        )}
                        {isUserTalking && (
                            <div className="px-3 py-1.5 rounded-full bg-emerald-600/90 text-white text-sm font-medium flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                You're speaking
                            </div>
                        )}
                    </div>
                )}

                {/* Transcript Overlay */}
                {transcript.length > 0 && (
                    <div className="absolute bottom-20 left-4 right-4">
                        <ScrollArea className="max-h-32 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 p-4">
                            <div className="space-y-2">
                                {transcript.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`text-sm ${
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

                {/* Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    {/* Mute/Unmute */}
                    <Button
                        variant={isMuted ? "destructive" : "outline"}
                        size="icon-lg"
                        onClick={toggleMute}
                        disabled={!isConnected || isMicConnecting}
                        className="rounded-full"
                    >
                        {isMuted ? (
                            <MicOff className="h-5 w-5" />
                        ) : (
                            <Mic className="h-5 w-5" />
                        )}
                    </Button>

                    {/* End Call */}
                    <Button
                        variant="destructive"
                        size="icon-lg"
                        onClick={handleClose}
                        className="rounded-full bg-red-600 hover:bg-red-700"
                    >
                        <PhoneOff className="h-5 w-5" />
                    </Button>
                </div>

                {/* Mic Status Indicator */}
                {isConnected && (
                    <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                        {isMicConnecting && "Connecting mic..."}
                        {isMicActive && !isMuted && "Mic active"}
                        {isMicActive && isMuted && "Mic muted"}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
