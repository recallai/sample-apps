import { VoiceChatState } from "@heygen/liveavatar-web-sdk";
import { useCallback, useMemo } from "react";
import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

export const useSpeakerActions = () => {
  const {
    sessionRef,
    isMuted,
    voiceChatState,
    isUserTalking,
  } = useLiveAvatarContext();

  const muteMic = useCallback(async () => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.voiceChat.mute();
  }, [sessionRef]);

  const unmuteMic = useCallback(async () => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.voiceChat.unmute();
  }, [sessionRef]);

  const startListening = useCallback(async () => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.voiceChat.start();
  }, [sessionRef]);

  const stopListening = useCallback(() => {
    if (!sessionRef.current) {
      throw new Error("Session is not initialized");
    }
    return sessionRef.current.voiceChat.stop();
  }, [sessionRef]);

  const isMicConnecting = useMemo(() => {
    return voiceChatState === VoiceChatState.STARTING;
  }, [voiceChatState]);

  const isMicActive = useMemo(() => {
    return voiceChatState === VoiceChatState.ACTIVE;
  }, [voiceChatState]);

  return {
    muteMic,
    unmuteMic,
    startListening,
    stopListening,
    isMicConnecting,
    isMicActive,
    isMuted,
    isUserTalking,
  };
};
