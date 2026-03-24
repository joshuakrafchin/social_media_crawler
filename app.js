/**
 * Main application — fetches trending content from Mastodon and Bluesky.
 */
(function () {
    // ---- State ----
    let selectedPlatforms = new Set(["mastodon", "bluesky"]);
    const mastodon = new MastodonClient();
    const bluesky = new BlueskyClient();

    // ---- DOM refs ----
    const $ = (sel) => document.querySelector(sel);
    const platformGrid = $("#platform-grid");
    const scanBtn = $("#scan-btn");
    const resultsSection = $("#results-section");
    const resultsContainer = $("#results-container");
    const loadingEl = $("#loading");
    const loadingText = $("#loading-text");

    // ---- Init ----
    function init() {
        renderPlatforms();
        bindEvents();
        updateScanBtnState();
    }

    // ---- Platform Grid ----
    function renderPlatforms() {
        platformGrid.innerHTML = "";
        for (const p of PLATFORMS) {
            const card = document.createElement("div");
            card.className = "platform-card selected";
            card.dataset.id = p.id;
            card.innerHTML = `<div class="icon">${p.icon}</div><div class="name">${p.name}</div>`;
            card.addEventListener("click", () => togglePlatform(p.id, card));
            platformGrid.appendChild(card);
        }
    }

    function togglePlatform(id, card) {
        if (selectedPlatforms.has(id)) {
            selectedPlatforms.delete(id);
            card.classList.remove("selected");
        } else {
            selectedPlatforms.add(id);
            card.classList.add("selected");
        }
        updateScanBtnState();
    }

    function updateScanBtnState() {
        const hasPlatforms = selectedPlatforms.size > 0;
        scanBtn.disabled = !hasPlatforms;
        if (!hasPlatforms) {
            scanBtn.textContent = "Select at Least One Platform";
        } else {
            const names = PLATFORMS.filter(p => selectedPlatforms.has(p.id)).map(p => p.name);
            scanBtn.textContent = `Scan ${names.join(" & ")} for Trending Content`;
        }
    }

    // ---- Events ----
    function bindEvents() {
        scanBtn.addEventListener("click", startScan);
        $("#new-scan-btn").addEventListener("click", resetToScan);
    }

    // ---- Scanning ----
    async function startScan() {
        resultsSection.classList.remove("hidden");
        loadingEl.classList.remove("hidden");
        resultsContainer.innerHTML = "";
        scanBtn.disabled = true;

        const names = PLATFORMS.filter(p => selectedPlatforms.has(p.id)).map(p => p.name);
        loadingText.textContent = `Fetching trending content from ${names.join(" & ")}...`;

        const results = [];

        try {
            const promises = [];

            if (selectedPlatforms.has("mastodon")) {
                promises.push(fetchMastodon());
            }
            if (selectedPlatforms.has("bluesky")) {
                promises.push(fetchBluesky());
            }

            const settled = await Promise.allSettled(promises);

            for (const result of settled) {
                if (result.status === "fulfilled") {
                    results.push(...result.value);
                } else {
                    results.push({
                        type: "error",
                        platform: "unknown",
                        message: result.reason?.message || "Unknown error"
                    });
                }
            }

            renderResults(results);
        } catch (err) {
            resultsContainer.innerHTML = `<div class="meme-card"><div class="meme-body">
                <h4>Error</h4>
                <p>${escapeHtml(err.message)}</p>
            </div></div>`;
        } finally {
            loadingEl.classList.add("hidden");
            scanBtn.disabled = false;
            updateScanBtnState();
        }
    }

    async function fetchMastodon() {
        const [statuses, tags] = await Promise.all([
            mastodon.getTrendingStatuses(10),
            mastodon.getTrendingTags(10)
        ]);

        const items = [];

        // Trending tags
        for (const tag of tags) {
            const todayUses = tag.history?.[0]?.uses || 0;
            const todayAccounts = tag.history?.[0]?.accounts || 0;
            items.push({
                type: "tag",
                platform: "mastodon",
                name: `#${tag.name}`,
                url: tag.url,
                uses: todayUses,
                accounts: todayAccounts,
            });
        }

        // Trending statuses
        for (const s of statuses) {
            items.push({
                type: "status",
                platform: "mastodon",
                author: s.account?.display_name || s.account?.username || "Unknown",
                handle: `@${s.account?.username || "unknown"}`,
                avatar: s.account?.avatar,
                content: s.content,
                url: s.url,
                reblogs: s.reblogs_count || 0,
                favourites: s.favourites_count || 0,
                replies: s.replies_count || 0,
                createdAt: s.created_at,
            });
        }

        return items;
    }

    async function fetchBluesky() {
        const data = await bluesky.getTrendingTopics();
        const topics = data.topics || [];
        const items = [];

        // Show trending topics
        for (const t of topics) {
            items.push({
                type: "topic",
                platform: "bluesky",
                name: t.displayName || t.topic,
                topic: t.topic,
                description: t.description || "",
                link: t.link || "",
            });
        }

        // Fetch top posts for the first few topics
        const topTopics = topics.slice(0, 5);
        const postResults = await Promise.allSettled(
            topTopics.map(t => bluesky.searchPosts(t.topic, 3))
        );

        for (const result of postResults) {
            if (result.status !== "fulfilled") continue;
            const posts = result.value.posts || [];
            for (const p of posts) {
                items.push({
                    type: "status",
                    platform: "bluesky",
                    author: p.author?.displayName || p.author?.handle || "Unknown",
                    handle: `@${p.author?.handle || "unknown"}`,
                    avatar: p.author?.avatar,
                    content: p.record?.text || "",
                    url: `https://bsky.app/profile/${p.author?.handle}/post/${p.uri?.split("/").pop()}`,
                    reblogs: p.repostCount || 0,
                    favourites: p.likeCount || 0,
                    replies: p.replyCount || 0,
                    createdAt: p.indexedAt,
                });
            }
        }

        return items;
    }

    // ---- Rendering ----
    function renderResults(items) {
        resultsContainer.innerHTML = "";

        const mastodonItems = items.filter(i => i.platform === "mastodon");
        const blueskyItems = items.filter(i => i.platform === "bluesky");
        const errors = items.filter(i => i.type === "error");

        if (errors.length) {
            for (const e of errors) {
                const card = document.createElement("div");
                card.className = "meme-card";
                card.innerHTML = `<div class="meme-body"><h4>Error</h4><p>${escapeHtml(e.message)}</p></div>`;
                resultsContainer.appendChild(card);
            }
        }

        if (mastodonItems.length) {
            renderPlatformSection("\ud83d\udc18 Mastodon Trending", mastodonItems);
        }
        if (blueskyItems.length) {
            renderPlatformSection("\ud83e\udd8b Bluesky Trending", blueskyItems);
        }

        if (!mastodonItems.length && !blueskyItems.length && !errors.length) {
            resultsContainer.innerHTML = `<div class="meme-card"><div class="meme-body"><p>No trending content found.</p></div></div>`;
        }
    }

    function renderPlatformSection(title, items) {
        const section = document.createElement("div");
        section.className = "platform-results";

        const heading = document.createElement("h3");
        heading.className = "platform-heading";
        heading.textContent = title;
        section.appendChild(heading);

        // Render tags/topics first
        const tags = items.filter(i => i.type === "tag" || i.type === "topic");
        if (tags.length) {
            const tagContainer = document.createElement("div");
            tagContainer.className = "trending-tags";
            for (const tag of tags) {
                const el = document.createElement("a");
                el.className = "trending-tag";
                el.href = tag.url || tag.link || "#";
                el.target = "_blank";
                el.rel = "noopener";
                if (tag.type === "tag") {
                    el.textContent = `${tag.name} (${tag.uses} uses)`;
                } else {
                    el.textContent = tag.name;
                }
                tagContainer.appendChild(el);
            }
            section.appendChild(tagContainer);
        }

        // Render statuses
        const statuses = items.filter(i => i.type === "status");
        for (const s of statuses) {
            section.appendChild(renderStatusCard(s));
        }

        resultsContainer.appendChild(section);
    }

    function renderStatusCard(s) {
        const card = document.createElement("div");
        card.className = "meme-card";

        const timeAgo = formatTimeAgo(s.createdAt);
        const contentHtml = s.platform === "mastodon" ? s.content : escapeHtml(s.content);

        card.innerHTML = `
            <div class="status-header">
                ${s.avatar ? `<img class="status-avatar" src="${escapeAttr(s.avatar)}" alt="">` : ""}
                <div class="status-author">
                    <span class="author-name">${escapeHtml(s.author)}</span>
                    <span class="author-handle">${escapeHtml(s.handle)}</span>
                </div>
                <span class="status-time">${timeAgo}</span>
            </div>
            <div class="status-content">${contentHtml}</div>
            <div class="status-stats">
                <span title="Replies">\ud83d\udcac ${s.replies}</span>
                <span title="Reposts">\ud83d\udd01 ${s.reblogs}</span>
                <span title="Likes">\u2764\ufe0f ${s.favourites}</span>
                <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener" class="status-link">View Post \u2197</a>
            </div>`;

        return card;
    }

    function resetToScan() {
        resultsSection.classList.add("hidden");
        resultsContainer.innerHTML = "";
    }

    // ---- Utilities ----
    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str || "";
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return "";
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diff = Math.floor((now - then) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // ---- Go ----
    init();
})();
