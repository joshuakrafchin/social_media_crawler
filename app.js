/**
 * Main application logic for Trending Meme Tracker.
 */
(function () {
    // ---- State ----
    let selectedPlatforms = new Set();
    let gemini = null;
    let lastScanRaw = "";       // raw text from scan
    let lastScanParsed = null;  // parsed JSON
    let chatHistory = [];       // conversation history for follow-ups

    // ---- DOM refs ----
    const $ = (sel) => document.querySelector(sel);
    const settingsPanel = $("#settings-panel");
    const apiKeyInput = $("#api-key");
    const instructionsInput = $("#system-instructions");
    const platformGrid = $("#platform-grid");
    const scanBtn = $("#scan-btn");
    const resultsSection = $("#results-section");
    const resultsContainer = $("#results-container");
    const loadingEl = $("#loading");
    const loadingText = $("#loading-text");
    const chatSection = $("#chat-section");
    const chatMessages = $("#chat-messages");
    const chatInput = $("#chat-input");

    // ---- Init ----
    function init() {
        loadSettings();
        renderPlatforms();
        bindEvents();
        updateScanBtnState();
    }

    function loadSettings() {
        apiKeyInput.value = localStorage.getItem("gemini_api_key") || "";
        const saved = localStorage.getItem("system_instructions");
        instructionsInput.value = saved || DEFAULT_INSTRUCTIONS;
    }

    function saveSettings() {
        localStorage.setItem("gemini_api_key", apiKeyInput.value.trim());
        localStorage.setItem("system_instructions", instructionsInput.value);
    }

    // ---- Platform Grid ----
    function renderPlatforms() {
        platformGrid.innerHTML = "";
        for (const p of PLATFORMS) {
            const card = document.createElement("div");
            card.className = "platform-card";
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
        $("#select-all-btn").textContent = selectedPlatforms.size === PLATFORMS.length ? "Deselect All" : "Select All";
        updateScanBtnState();
    }

    function toggleSelectAll() {
        const allSelected = selectedPlatforms.size === PLATFORMS.length;
        const cards = platformGrid.querySelectorAll(".platform-card");
        if (allSelected) {
            selectedPlatforms.clear();
            cards.forEach(c => c.classList.remove("selected"));
            $("#select-all-btn").textContent = "Select All";
        } else {
            PLATFORMS.forEach(p => selectedPlatforms.add(p.id));
            cards.forEach(c => c.classList.add("selected"));
            $("#select-all-btn").textContent = "Deselect All";
        }
        updateScanBtnState();
    }

    function updateScanBtnState() {
        const hasKey = apiKeyInput.value.trim().length > 0;
        const hasPlatforms = selectedPlatforms.size > 0;
        scanBtn.disabled = !(hasKey && hasPlatforms);
        if (!hasKey) {
            scanBtn.textContent = "Enter API Key in Settings First";
        } else if (!hasPlatforms) {
            scanBtn.textContent = "Select at Least One Platform";
        } else {
            scanBtn.textContent = `Scan ${selectedPlatforms.size} Platform${selectedPlatforms.size > 1 ? "s" : ""} for Trending Memes`;
        }
    }

    // ---- Events ----
    function bindEvents() {
        $("#settings-toggle").addEventListener("click", () => settingsPanel.classList.remove("hidden"));
        $("#settings-close").addEventListener("click", () => settingsPanel.classList.add("hidden"));
        $("#save-settings").addEventListener("click", () => {
            saveSettings();
            updateScanBtnState();
            settingsPanel.classList.add("hidden");
        });
        $("#reset-instructions").addEventListener("click", () => {
            instructionsInput.value = DEFAULT_INSTRUCTIONS;
        });
        $("#toggle-key-visibility").addEventListener("click", () => {
            apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
        });
        $("#select-all-btn").addEventListener("click", toggleSelectAll);
        scanBtn.addEventListener("click", startScan);
        $("#new-scan-btn").addEventListener("click", resetToScan);
        $("#chat-send").addEventListener("click", sendChat);
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) sendChat();
        });
        // Update button state when key changes
        apiKeyInput.addEventListener("input", () => {
            localStorage.setItem("gemini_api_key", apiKeyInput.value.trim());
            updateScanBtnState();
        });
    }

    // ---- Scanning ----
    async function startScan() {
        const key = apiKeyInput.value.trim();
        if (!key) {
            settingsPanel.classList.remove("hidden");
            return;
        }

        saveSettings();
        gemini = new GeminiClient(key);

        const platforms = PLATFORMS.filter(p => selectedPlatforms.has(p.id));
        const instructions = instructionsInput.value || DEFAULT_INSTRUCTIONS;

        // Show results section with loading
        resultsSection.classList.remove("hidden");
        loadingEl.classList.remove("hidden");
        resultsContainer.innerHTML = "";
        chatSection.classList.add("hidden");
        chatMessages.innerHTML = "";
        chatHistory = [];
        lastScanRaw = "";
        lastScanParsed = null;
        scanBtn.disabled = true;

        const platformNames = platforms.map(p => p.name).join(", ");
        loadingText.textContent = `Scanning ${platformNames}... This may take 15-30 seconds.`;

        try {
            const result = await gemini.scanTrending(platforms, instructions);
            lastScanRaw = result.text;
            lastScanParsed = tryParseJSON(result.text);

            if (lastScanParsed && lastScanParsed.memes) {
                renderMemes(lastScanParsed.memes);
            } else {
                // Fallback: render raw text
                renderRawResult(result.text);
            }

            // Show chat section
            chatSection.classList.remove("hidden");
            chatInput.focus();
        } catch (err) {
            resultsContainer.innerHTML = `<div class="meme-card"><div class="meme-body">
                <h4>Error</h4>
                <p>${escapeHtml(err.message)}</p>
                <p style="margin-top:.5rem;color:var(--text-muted)">Check your API key in Settings and try again.</p>
            </div></div>`;
        } finally {
            loadingEl.classList.add("hidden");
            scanBtn.disabled = false;
            updateScanBtnState();
        }
    }

    function tryParseJSON(text) {
        // Strip markdown code fences if present
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
        }
        try {
            return JSON.parse(cleaned);
        } catch {
            // Try to find JSON in the text
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[0]); } catch { /* ignore */ }
            }
            return null;
        }
    }

    // ---- Rendering ----
    function renderMemes(memes) {
        resultsContainer.innerHTML = "";
        for (const meme of memes) {
            const card = document.createElement("div");
            card.className = "meme-card";

            const platformTags = (meme.platforms || [])
                .map(pid => {
                    const p = PLATFORMS.find(pl => pl.id === pid);
                    return `<span class="tag">${p ? p.icon + " " + p.name : pid}</span>`;
                }).join("");

            const links = (meme.links || [])
                .map(l => `<li><a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label || l.url)}</a></li>`)
                .join("");

            const viralityBar = meme.virality_score
                ? `<div style="margin-top:.3rem">
                    <span style="color:var(--text-muted);font-size:.8rem">Virality: ${meme.virality_score}/10</span>
                    <div style="background:var(--border);border-radius:4px;height:6px;margin-top:.2rem">
                        <div style="background:var(--accent);width:${meme.virality_score * 10}%;height:100%;border-radius:4px"></div>
                    </div>
                   </div>`
                : "";

            card.innerHTML = `
                <div class="meme-card-header">
                    <div class="meme-rank">${meme.rank || ""}</div>
                    <div>
                        <div class="meme-title">${escapeHtml(meme.title)}</div>
                        <div class="meme-platforms">${platformTags}</div>
                        ${viralityBar}
                    </div>
                </div>
                <div class="meme-body">
                    <h4>What Is It</h4>
                    <p>${escapeHtml(meme.explanation || "")}</p>
                    <h4>Origin</h4>
                    <p>${escapeHtml(meme.origin || "")}</p>
                    <h4>Why It's Trending Now</h4>
                    <p>${escapeHtml(meme.why_trending || "")}</p>
                    ${links ? `<h4>Links</h4><ul>${links}</ul>` : ""}
                </div>`;

            resultsContainer.appendChild(card);
        }
    }

    function renderRawResult(text) {
        const card = document.createElement("div");
        card.className = "meme-card";
        card.innerHTML = `<div class="meme-body"><p style="white-space:pre-wrap">${escapeHtml(text)}</p></div>`;
        resultsContainer.appendChild(card);
    }

    function resetToScan() {
        resultsSection.classList.add("hidden");
        chatSection.classList.add("hidden");
        resultsContainer.innerHTML = "";
        chatMessages.innerHTML = "";
        chatHistory = [];
        lastScanRaw = "";
        lastScanParsed = null;
    }

    // ---- Chat ----
    async function sendChat() {
        const question = chatInput.value.trim();
        if (!question || !gemini) return;

        chatInput.value = "";

        // Add user message
        appendChatMsg("user", question);
        chatHistory.push({ role: "user", text: question });

        // Show thinking
        const thinkingEl = appendChatMsg("thinking", "Thinking...");

        try {
            const instructions = instructionsInput.value || "";
            const result = await gemini.chat(question, lastScanRaw, chatHistory, instructions);
            thinkingEl.remove();

            const responseText = result.text;
            appendChatMsg("assistant", responseText);
            chatHistory.push({ role: "model", text: responseText });
        } catch (err) {
            thinkingEl.remove();
            appendChatMsg("assistant", `Error: ${err.message}`);
        }

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendChatMsg(type, text) {
        const div = document.createElement("div");
        div.className = `chat-msg ${type}`;
        div.innerHTML = type === "user" ? escapeHtml(text) : formatMarkdownLight(text);
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
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

    function formatMarkdownLight(text) {
        // Simple markdown-ish formatting
        return escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br>")
            .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }

    // ---- Go ----
    init();
})();
