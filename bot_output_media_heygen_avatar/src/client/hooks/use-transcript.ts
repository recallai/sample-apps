import { useLiveAvatarContext } from "../contexts/LiveAvatarContext";

export const useTranscript = () => {
    const { transcript } = useLiveAvatarContext();

    return { transcript };
};

