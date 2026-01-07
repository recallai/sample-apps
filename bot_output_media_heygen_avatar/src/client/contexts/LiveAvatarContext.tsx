import {
    LiveAvatarSession,
    SessionState,
    SessionEvent,
    AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import { useQuery } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

interface LiveAvatarContextValue {
    sessionRef: React.RefObject<LiveAvatarSession | null>;
    sessionState: SessionState;
    isStreamReady: boolean;

    // Talking state
    isUserTalking: boolean;
    isAvatarTalking: boolean;

    // Error state
    sessionError: string | null;
    startSession: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const LiveAvatarContext = createContext<LiveAvatarContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

const SESSION_CONFIG = {
    voiceChat: true,
    apiUrl: "https://api.liveavatar.com",
} as const;

export function LiveAvatarContextProvider({
    children,
}: {
    children: ReactNode;
}) {
    const sessionRef = useRef<LiveAvatarSession | null>(null);

    // Session state
    const [sessionState, setSessionState] = useState<SessionState>(
        SessionState.INACTIVE,
    );
    const [isStreamReady, setIsStreamReady] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    // Talking state
    const [isUserTalking, setIsUserTalking] = useState(false);
    const [isAvatarTalking, setIsAvatarTalking] = useState(false);

    // Fetch the session token
    const {
        data: sessionData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["heygen-session-token"],
        queryFn: async () => {
            const response = await fetch("/api/session", { method: "POST" });
            if (!response.ok) throw new Error(await response.text());
            return z
                .object({
                    session_id: z.string(),
                    session_token: z.string(),
                })
                .parse(await response.json());
        },
        staleTime: Infinity,
        retry: false,
    });

    // Initialize the LiveAvatarSession once we have the token
    if (sessionData?.session_token && !sessionRef.current) {
        sessionRef.current = new LiveAvatarSession(
            sessionData.session_token,
            SESSION_CONFIG,
        );
    }

    const session = sessionRef.current;

    // Set up session event listeners and cleanup
    useEffect(() => {
        if (!session) return;

        session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
            setSessionState(state);
            if (state === SessionState.DISCONNECTED) {
                setIsStreamReady(false);
            }
        });
        session.on(SessionEvent.SESSION_STREAM_READY, () =>
            setIsStreamReady(true),
        );
        session.on(AgentEventsEnum.USER_SPEAK_STARTED, () =>
            setIsUserTalking(true),
        );
        session.on(AgentEventsEnum.USER_SPEAK_ENDED, () =>
            setIsUserTalking(false),
        );
        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () =>
            setIsAvatarTalking(true),
        );
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () =>
            setIsAvatarTalking(false),
        );

        // Cleanup on unmount
        return () => {
            void session.stop();
            session.removeAllListeners();
            session.voiceChat.removeAllListeners();
        };
    }, [session]);

    // Start session
    const startSession = useCallback(async () => {
        try {
            setSessionError(null);
            if (!sessionRef.current) {
                throw new Error("Session is not initialized");
            }
            await sessionRef.current.start();
        } catch (e) {
            const errorMessage =
                e instanceof Error ? e.message : "Failed to start session";
            console.error("Error starting session:", e);
            setSessionError(errorMessage);
            toast.error(errorMessage);
        }
    }, []);

    // Memoize context value
    const contextValue = useMemo<LiveAvatarContextValue>(
        () => ({
            sessionRef,
            sessionState,
            isStreamReady,
            isUserTalking,
            isAvatarTalking,
            sessionError,
            startSession,
        }),
        [
            sessionState,
            isStreamReady,
            isUserTalking,
            isAvatarTalking,
            sessionError,
            startSession,
        ],
    );

    if (isLoading) return <div>Loading avatar session...</div>;
    if (error) return <div>Error loading avatar session: {error.message}</div>;
    if (!session) return <div>Initializing avatar session...</div>;

    return (
        <LiveAvatarContext.Provider value={contextValue}>
            {children}
        </LiveAvatarContext.Provider>
    );
}

// ============================================================================
// Consumer Hook
// ============================================================================

export function useLiveAvatarContext(): LiveAvatarContextValue {
    const context = useContext(LiveAvatarContext);

    if (context === null) {
        throw new Error(
            "useLiveAvatarContext must be used within a LiveAvatarContextProvider",
        );
    }

    return context;
}
