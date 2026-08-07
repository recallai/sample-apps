// REPLACEABLE — Pull the signed session off the Output Media URL.
// Moves `session_token` from the query string into sessionStorage so it is not
// left visible in the address bar. Use your own session handoff if you prefer.

const SESSION_TOKEN_QUERY_KEY = "session_token";
const SESSION_TOKEN_STORAGE_KEY = "recall_livekit_session_token";

export function recoverSessionToken(): string {
    const currentUrl = new URL(window.location.href);
    const queryToken = currentUrl.searchParams.get(SESSION_TOKEN_QUERY_KEY);

    if (queryToken) {
        window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, queryToken);
        currentUrl.searchParams.delete(SESSION_TOKEN_QUERY_KEY);
        window.history.replaceState({}, "", currentUrl);
        return queryToken;
    }

    const storedToken = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (!storedToken) {
        throw new Error("This Output Media page requires a signed session URL");
    }

    return storedToken;
}
