import {
    ConnectionQuality,
    LiveAvatarSession,
    SessionState,
    SessionEvent,
    VoiceChatEvent,
    VoiceChatState,
    AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import { createContext, useContext, useEffect, useRef, useState } from "react";

enum MessageSender {
    USER = "user",
    AVATAR = "avatar",
}

/**
 * The React context for the LiveAvatarSession state.
 */
export const LiveAvatarContext = createContext<{
    sessionRef: React.RefObject<LiveAvatarSession>;

    isMuted: boolean;
    voiceChatState: VoiceChatState;

    sessionState: SessionState;
    isStreamReady: boolean;
    connectionQuality: ConnectionQuality;

    isUserTalking: boolean;
    isAvatarTalking: boolean;

    messages: {
        sender: MessageSender;
        message: string;
        timestamp: number;
    }[];
}>({
    sessionRef: {
        current: null,
    } as unknown as React.RefObject<LiveAvatarSession>,
    connectionQuality: ConnectionQuality.UNKNOWN,
    isMuted: true,
    voiceChatState: VoiceChatState.INACTIVE,
    sessionState: SessionState.DISCONNECTED,
    isStreamReady: false,
    isUserTalking: false,
    isAvatarTalking: false,
    messages: [],
});

/**
 * The state of the LiveAvatarSession.
 * Tracks the session state, connection quality, and whether the stream is ready.
 */
const useSessionState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
    const [sessionState, setSessionState] = useState<SessionState>(
        sessionRef.current?.state || SessionState.INACTIVE,
    );
    const [connectionQuality, setConnectionQuality] =
        useState<ConnectionQuality>(
            sessionRef.current?.connectionQuality || ConnectionQuality.UNKNOWN,
        );
    const [isStreamReady, setIsStreamReady] = useState<boolean>(false);

    useEffect(() => {
        if (!sessionRef.current) {
            console.error("Session reference is null");
            return;
        }
        sessionRef.current.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
            setSessionState(state);
            if (state === SessionState.DISCONNECTED) {
                sessionRef.current!.removeAllListeners();
                sessionRef.current!.voiceChat.removeAllListeners();
                setIsStreamReady(false);
            }
        });
        sessionRef.current.on(SessionEvent.SESSION_STREAM_READY, () => {
            setIsStreamReady(true);
        });
        sessionRef.current.on(
            SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
            setConnectionQuality,
        );
    }, [sessionRef]);

    return { sessionState, isStreamReady, connectionQuality };
};

/**
 * The state of the voice chat.
 * Tracks the muted state and the voice chat state.
 */
const useVoiceChatState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
    const [isMuted, setIsMuted] = useState(true);
    const [voiceChatState, setVoiceChatState] = useState<VoiceChatState>(
        sessionRef.current?.voiceChat.state || VoiceChatState.INACTIVE,
    );

    useEffect(() => {
        if (sessionRef.current) {
            sessionRef.current.voiceChat.on(VoiceChatEvent.MUTED, () => {
                setIsMuted(true);
            });
            sessionRef.current.voiceChat.on(VoiceChatEvent.UNMUTED, () => {
                setIsMuted(false);
            });
            sessionRef.current.voiceChat.on(
                VoiceChatEvent.STATE_CHANGED,
                setVoiceChatState,
            );
        }
    }, [sessionRef]);

    return { isMuted, voiceChatState };
};

/**
 * The state of the Avatar's speech activity.
 * Tracks whether the user or the avatar is speaking.
 */
const useTalkingState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
    const [isUserTalking, setIsUserTalking] = useState(false);
    const [isAvatarTalking, setIsAvatarTalking] = useState(false);

    useEffect(() => {
        if (sessionRef.current) {
            sessionRef.current.on(AgentEventsEnum.USER_SPEAK_STARTED, () => {
                setIsUserTalking(true);
            });
            sessionRef.current.on(AgentEventsEnum.USER_SPEAK_ENDED, () => {
                setIsUserTalking(false);
            });
            sessionRef.current.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
                setIsAvatarTalking(true);
            });
            sessionRef.current.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
                setIsAvatarTalking(false);
            });
        }
    }, [sessionRef]);

    return { isUserTalking, isAvatarTalking };
};

/**
 * The state of the chat history.
 * Tracks the messages sent by the user or the avatar.
 */
const useChatHistoryState = (
    sessionRef: React.RefObject<LiveAvatarSession>,
) => {
    const [messages, setMessages] = useState<LiveAvatarSessionMessage[]>([]);
    const currentSenderRef = useRef<MessageSender | null>(null);

    useEffect(() => {
        if (sessionRef.current) {
            const handleMessage = (
                sender: MessageSender,
                { task_id, message }: { task_id: string; message: string },
            ) => {
                if (currentSenderRef.current === sender) {
                    setMessages((prev) => [
                        ...prev.slice(0, -1),
                        {
                            ...prev[prev.length - 1]!,
                            message: [
                                prev[prev.length - 1]!.message,
                                message,
                            ].join(""),
                        },
                    ]);
                } else {
                    currentSenderRef.current = sender;
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: task_id,
                            sender: sender,
                            message,
                            timestamp: Date.now(),
                        },
                    ]);
                }
            };

            sessionRef.current.on(
                AgentEventsEnum.USER_SPEAK_STARTED,
                (data) => {
                    console.log("USER_SPEAK_STARTED", data);
                    handleMessage(MessageSender.USER, {
                        task_id: data.task_id,
                        message: data.text || "",
                    });
                },
            );
        }
    }, [sessionRef]);

    return { messages };
};

export const LiveAvatarContextProvider = ({
    children,
    sessionAccessToken,
}: {
    children: React.ReactNode;
    sessionAccessToken: string;
}) => {
    // Default voice chat on
    const config = {
        voiceChat: true,
        apiUrl: "https://api.liveavatar.com",
    };
    const sessionRef = useRef<LiveAvatarSession>(
        new LiveAvatarSession(sessionAccessToken, config),
    );

    const { sessionState, isStreamReady, connectionQuality } =
        useSessionState(sessionRef);

    const { isMuted, voiceChatState } = useVoiceChatState(sessionRef);
    const { isUserTalking, isAvatarTalking } = useTalkingState(sessionRef);
    // const { messages } = useChatHistoryState(sessionRef);

    return (
        <LiveAvatarContext.Provider
            value={{
                sessionRef,
                sessionState,
                isStreamReady,
                connectionQuality,
                isMuted,
                voiceChatState,
                isUserTalking,
                isAvatarTalking,
                messages: [], // TODO - properly implement chat history
            }}
        >
            {children}
        </LiveAvatarContext.Provider>
    );
};

export const useLiveAvatarContext = () => {
    return useContext(LiveAvatarContext);
};
