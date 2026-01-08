import { useCallback } from "react";
import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

/**
 * Manages the HeyGen avatar session lifecycle.
 * Call startSession() to connect, then wait for isStreamReady before rendering.
 */
export const useSession = () => {
  const { sessionRef, sessionState, isStreamReady, startSession } =
    useLiveAvatarContext();

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
    startSession,
    attachElement,
  };
};
