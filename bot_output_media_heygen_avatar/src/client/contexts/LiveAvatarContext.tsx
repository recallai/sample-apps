import {
    ConnectionQuality,
    LiveAvatarSession,
    SessionState,
    SessionEvent,
    VoiceChatEvent,
    VoiceChatState,
    AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useMemo,
    useCallback,
    type ReactNode,
} from "react";

// ============================================================================
// Types
// ============================================================================

type ParticipantType = "user" | "avatar";

interface Transcript {
    id: string;
    participant: ParticipantType;
    text: string;
    timestamp: number;
}

interface LiveAvatarContextValue {
    sessionRef: React.RefObject<LiveAvatarSession | null>;

    // Session state
    sessionState: SessionState;
    isStreamReady: boolean;
    connectionQuality: ConnectionQuality;

    // Voice chat state
    isMuted: boolean;
    voiceChatState: VoiceChatState;

    // Talking state
    isUserTalking: boolean;
    isAvatarTalking: boolean;

    // Conversation
    transcript: Transcript[];

    // Session actions
    startSession: () => Promise<void>;
    stopSession: () => Promise<void>;
    keepAlive: () => Promise<void>;
}

interface LiveAvatarProviderProps {
    children: ReactNode;
    sessionAccessToken: string;
}

// ============================================================================
// Context
// ============================================================================

const LiveAvatarContext = createContext<LiveAvatarContextValue | null>(null);

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Manages the LiveAvatarSession lifecycle and state.
 * Tracks session state, connection quality, and stream readiness.
 */
function useSessionState(
    session: LiveAvatarSession | null,
    onDisconnect?: () => void,
) {
    const [sessionState, setSessionState] = useState<SessionState>(
        session?.state ?? SessionState.INACTIVE,
    );
    const [connectionQuality, setConnectionQuality] =
        useState<ConnectionQuality>(
            session?.connectionQuality ?? ConnectionQuality.UNKNOWN,
        );
    const [isStreamReady, setIsStreamReady] = useState(false);

    useEffect(() => {
        if (!session) {
            return;
        }

        const handleStateChange = (state: SessionState) => {
            setSessionState(state);
            if (state === SessionState.DISCONNECTED) {
                setIsStreamReady(false);
                onDisconnect?.();
            }
        };

        const handleStreamReady = () => {
            setIsStreamReady(true);
        };

        const handleQualityChange = (quality: ConnectionQuality) => {
            setConnectionQuality(quality);
        };

        session.on(SessionEvent.SESSION_STATE_CHANGED, handleStateChange);
        session.on(SessionEvent.SESSION_STREAM_READY, handleStreamReady);
        session.on(
            SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
            handleQualityChange,
        );

        return () => {
            session.off(SessionEvent.SESSION_STATE_CHANGED, handleStateChange);
            session.off(SessionEvent.SESSION_STREAM_READY, handleStreamReady);
            session.off(
                SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
                handleQualityChange,
            );
        };
    }, [session, onDisconnect]);

    return { sessionState, isStreamReady, connectionQuality };
}

/**
 * Manages voice chat state including mute status.
 */
function useVoiceChatState(session: LiveAvatarSession | null) {
    const [isMuted, setIsMuted] = useState(true);
    const [voiceChatState, setVoiceChatState] = useState<VoiceChatState>(
        session?.voiceChat.state ?? VoiceChatState.INACTIVE,
    );

    useEffect(() => {
        if (!session) {
            return;
        }

        const handleMuted = () => setIsMuted(true);
        const handleUnmuted = () => setIsMuted(false);
        const handleStateChanged = (state: VoiceChatState) =>
            setVoiceChatState(state);

        session.voiceChat.on(VoiceChatEvent.MUTED, handleMuted);
        session.voiceChat.on(VoiceChatEvent.UNMUTED, handleUnmuted);
        session.voiceChat.on(VoiceChatEvent.STATE_CHANGED, handleStateChanged);

        return () => {
            session.voiceChat.off(VoiceChatEvent.MUTED, handleMuted);
            session.voiceChat.off(VoiceChatEvent.UNMUTED, handleUnmuted);
            session.voiceChat.off(
                VoiceChatEvent.STATE_CHANGED,
                handleStateChanged,
            );
        };
    }, [session]);

    return { isMuted, voiceChatState };
}

/**
 * Tracks speaking state for both user and avatar.
 */
function useTalkingState(session: LiveAvatarSession | null) {
    const [isUserTalking, setIsUserTalking] = useState(false);
    const [isAvatarTalking, setIsAvatarTalking] = useState(false);

    useEffect(() => {
        if (!session) {
            return;
        }

        const handleUserSpeakStarted = () => setIsUserTalking(true);
        const handleUserSpeakEnded = () => setIsUserTalking(false);
        const handleAvatarSpeakStarted = () => setIsAvatarTalking(true);
        const handleAvatarSpeakEnded = () => setIsAvatarTalking(false);

        session.on(AgentEventsEnum.USER_SPEAK_STARTED, handleUserSpeakStarted);
        session.on(AgentEventsEnum.USER_SPEAK_ENDED, handleUserSpeakEnded);
        session.on(
            AgentEventsEnum.AVATAR_SPEAK_STARTED,
            handleAvatarSpeakStarted,
        );
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, handleAvatarSpeakEnded);

        return () => {
            session.off(
                AgentEventsEnum.USER_SPEAK_STARTED,
                handleUserSpeakStarted,
            );
            session.off(AgentEventsEnum.USER_SPEAK_ENDED, handleUserSpeakEnded);
            session.off(
                AgentEventsEnum.AVATAR_SPEAK_STARTED,
                handleAvatarSpeakStarted,
            );
            session.off(
                AgentEventsEnum.AVATAR_SPEAK_ENDED,
                handleAvatarSpeakEnded,
            );
        };
    }, [session]);

    return { isUserTalking, isAvatarTalking };
}

/**
 * Manages the conversation history (transcripts) between user and avatar.
 */
function useConversationState(session: LiveAvatarSession | null) {
    const [transcript, setConversation] = useState<Transcript[]>([]);
    const currentParticipantRef = useRef<ParticipantType | null>(null);

    const handleTranscript = useCallback(
        (
            participant: ParticipantType,
            data: { taskId: string; text: string },
        ) => {
            const { taskId, text } = data;

            setConversation((prev) => {
                if (
                    currentParticipantRef.current === participant &&
                    prev.length > 0
                ) {
                    // Append to the last transcript from the same participant
                    const lastTranscript = prev[prev.length - 1];
                    return [
                        ...prev.slice(0, -1),
                        {
                            ...lastTranscript,
                            text: lastTranscript.text + text,
                        },
                    ];
                }

                // Start a new transcript
                currentParticipantRef.current = participant;
                return [
                    ...prev,
                    {
                        id: taskId,
                        participant,
                        text,
                        timestamp: Date.now(),
                    },
                ];
            });
        },
        [],
    );

    useEffect(() => {
        if (!session) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleUserSpeakStarted = (data: any) => {
            console.log("USER_SPEAK_STARTED", data);
            handleTranscript("user", {
                taskId: data.task_id ?? data.event_id ?? "",
                text: data.text ?? "",
            });
        };

        session.on(AgentEventsEnum.USER_SPEAK_STARTED, handleUserSpeakStarted);

        return () => {
            session.off(
                AgentEventsEnum.USER_SPEAK_STARTED,
                handleUserSpeakStarted,
            );
        };
    }, [session, handleTranscript]);

    return { transcript };
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * LiveAvatarContextProvider
 *
 * React Context provider that manages the lifecycle and state of a HeyGen
 * LiveAvatar session. This provider handles:
 *
 * - Session initialization and cleanup (start/stop)
 * - Real-time session state tracking (connecting, connected, disconnected)
 * - Voice chat state management (mute/unmute, active/inactive)
 * - Speaking activity detection for both user and avatar
 * - Conversation history (transcripts) between user and avatar
 * - Connection quality monitoring
 *
 * Usage:
 *   <LiveAvatarContextProvider sessionAccessToken={token}>
 *     <YourApp />
 *   </LiveAvatarContextProvider>
 *
 * Then in child components:
 *   const { startSession, stopSession, sessionState, ... } = useLiveAvatarContext();
 */
const SESSION_CONFIG = {
    voiceChat: true,
    apiUrl: "https://api.liveavatar.com",
} as const;

export function LiveAvatarContextProvider({
    children,
    sessionAccessToken,
}: LiveAvatarProviderProps) {
    // Lazy initialization to avoid creating new session on every render
    const sessionRef = useRef<LiveAvatarSession | null>(null);

    if (sessionRef.current === null) {
        sessionRef.current = new LiveAvatarSession(
            sessionAccessToken,
            SESSION_CONFIG,
        );
    }

    const session = sessionRef.current;

    /**
     * Cleans up all session listeners.
     * Called on disconnect and unmount.
     */
    const cleanupSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.removeAllListeners();
            sessionRef.current.voiceChat.removeAllListeners();
        }
    }, []);

    const { sessionState, isStreamReady, connectionQuality } = useSessionState(
        session,
        cleanupSession,
    );
    const { isMuted, voiceChatState } = useVoiceChatState(session);
    const { isUserTalking, isAvatarTalking } = useTalkingState(session);
    const { transcript } = useConversationState(session);

    /**
     * Starts the LiveAvatar session.
     */
    const startSession = useCallback(async () => {
        if (!sessionRef.current) {
            throw new Error("Session is not initialized");
        }
        await sessionRef.current.start();
    }, []);

    /**
     * Stops the LiveAvatar session and cleans up listeners.
     */
    const stopSession = useCallback(async () => {
        if (!sessionRef.current) {
            return;
        }
        await sessionRef.current.stop();
        // Note: cleanup happens via the onDisconnect callback in useSessionState
    }, []);

    /**
     * Sends a keep-alive signal to prevent server-side session timeout.
     *
     * Avatar sessions have a server-side timeout (typically <10 minutes of
     * inactivity). Use this when:
     * - User has the session open but is idle (reading, thinking, AFK)
     * - You want to keep the connection alive without actual user interaction
     * - Before performing an action after a long pause
     */
    const keepAlive = useCallback(async () => {
        if (!sessionRef.current) {
            throw new Error("Session is not initialized");
        }
        await sessionRef.current.keepAlive();
    }, []);

    // Cleanup session on unmount
    useEffect(() => {
        return () => {
            cleanupSession();
        };
    }, [cleanupSession]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<LiveAvatarContextValue>(
        () => ({
            sessionRef,
            sessionState,
            isStreamReady,
            connectionQuality,
            isMuted,
            voiceChatState,
            isUserTalking,
            isAvatarTalking,
            transcript,
            startSession,
            stopSession,
            keepAlive,
        }),
        [
            sessionState,
            isStreamReady,
            connectionQuality,
            isMuted,
            voiceChatState,
            isUserTalking,
            isAvatarTalking,
            transcript,
            startSession,
            stopSession,
            keepAlive,
        ],
    );

    return (
        <LiveAvatarContext.Provider value={contextValue}>
            {children}
        </LiveAvatarContext.Provider>
    );
}

// ============================================================================
// Consumer Hook
// ============================================================================

/**
 * useLiveAvatarContext
 *
 * Hook to access the LiveAvatar session state and actions from the context.
 * Provides access to session controls (start/stop), real-time state updates,
 * voice chat status, and transcript history.
 *
 * Must be used within a LiveAvatarContextProvider.
 *
 * @returns {LiveAvatarContextValue} The context value containing:
 *   - sessionRef: Reference to the underlying LiveAvatarSession
 *   - sessionState: Current session state (INACTIVE, CONNECTING, CONNECTED, etc.)
 *   - isStreamReady: Whether the video stream is ready for display
 *   - connectionQuality: Current connection quality indicator
 *   - isMuted: Whether the user's microphone is muted
 *   - voiceChatState: Current voice chat state
 *   - isUserTalking: Whether the user is currently speaking
 *   - isAvatarTalking: Whether the avatar is currently speaking
 *   - transcript: Array of transcripts between user and avatar
 *   - startSession: Function to start the session
 *   - stopSession: Function to stop the session and cleanup
 *   - keepAlive: Function to prevent server-side session timeout during idle periods
 *
 * @throws Error if used outside of LiveAvatarContextProvider
 */
export function useLiveAvatarContext(): LiveAvatarContextValue {
    const context = useContext(LiveAvatarContext);

    if (context === null) {
        throw new Error(
            "useLiveAvatarContext must be used within a LiveAvatarContextProvider",
        );
    }

    return context;
}
