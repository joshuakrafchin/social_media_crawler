/**
 * Direct API clients for Mastodon and Bluesky.
 * No API keys required — all endpoints are public.
 */

class MastodonClient {
    constructor(instance = "mastodon.social") {
        this.baseUrl = `https://${instance}/api/v1`;
    }

    async getTrendingStatuses(limit = 20) {
        const res = await fetch(`${this.baseUrl}/trends/statuses?limit=${limit}`);
        if (!res.ok) throw new Error(`Mastodon error (${res.status}): ${res.statusText}`);
        return res.json();
    }

    async getTrendingTags(limit = 20) {
        const res = await fetch(`${this.baseUrl}/trends/tags?limit=${limit}`);
        if (!res.ok) throw new Error(`Mastodon error (${res.status}): ${res.statusText}`);
        return res.json();
    }
}

class BlueskyClient {
    constructor() {
        this.baseUrl = "https://public.api.bsky.app/xrpc";
    }

    async getTrendingTopics() {
        const res = await fetch(`${this.baseUrl}/app.bsky.unspecced.getTrendingTopics`);
        if (!res.ok) throw new Error(`Bluesky error (${res.status}): ${res.statusText}`);
        return res.json();
    }

    async searchPosts(query, limit = 5) {
        const params = new URLSearchParams({ q: query, limit: String(limit), sort: "top" });
        const res = await fetch(`${this.baseUrl}/app.bsky.feed.searchPosts?${params}`);
        if (!res.ok) throw new Error(`Bluesky error (${res.status}): ${res.statusText}`);
        return res.json();
    }
}
