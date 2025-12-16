/**
 * Helper function to fetch with retry.
 * Respects the Retry-After header.
 */
export async function fetch_with_retry(url: string, options: RequestInit, max_attempts: number = 5): Promise<Response> {
    for (let attempt = 1; attempt <= max_attempts; attempt++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            let retry_after = Number(response.headers.get("Retry-After")) || 0;
            console.log(`Rate limit exceeded, retrying in ${retry_after} seconds`);
            if (!retry_after) {
                console.error("Retry-After header not found");
                retry_after = 0;
            }
            await new Promise((resolve) => setTimeout(
                resolve,
                1000 * (retry_after + Math.ceil(Math.random() * 5))
            ));
            continue;
        }
        return response;
    }
    throw new Error(`Max attempts (${max_attempts}) reached while fetching ${url}. options=${JSON.stringify(options)}`);
}