import { useCallback } from "react";
import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

export const useSession = () => {
  const {
    sessionRef,
    sessionState,
    isStreamReady,
    connectionQuality,
    startSession,
    stopSession,
    keepAlive,
  } = useLiveAvatarContext();

  const attachElement = useCallback(
    (element: HTMLMediaElement) => {
      if (!sessionRef.current) {
        throw new Error("Session is not initialized");
      }
      return sessionRef.current.attach(element);
    },
    [sessionRef],
  );

  return {
    sessionState,
    isStreamReady,
    connectionQuality,
    startSession,
    stopSession,
    keepAlive,
    attachElement,
  };
};
