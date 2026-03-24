/**
 * Gemini API wrapper for trending meme analysis.
 */
class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        // Use Gemini 2.0 Flash — fast, capable, and supports grounding with Google Search
        this.model = "gemini-2.0-flash";
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    }

    /**
     * Call Gemini API with grounding (Google Search) enabled.
     */
    async generate(systemInstruction, userPrompt, history = []) {
        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

        const contents = [];

        // Add conversation history
        for (const msg of history) {
            contents.push({
                role: msg.role,
                parts: [{ text: msg.text }]
            });
        }

        // Add the current user message
        contents.push({
            role: "user",
            parts: [{ text: userPrompt }]
        });

        const body = {
            contents,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            tools: [{
                googleSearch: {}
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const msg = err?.error?.message || response.statusText;
            throw new Error(`Gemini API error (${response.status}): ${msg}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates.length) {
            throw new Error("No response from Gemini. The model may have filtered the output.");
        }

        const candidate = data.candidates[0];
        const parts = candidate.content?.parts || [];

        // Extract text from all parts
        let text = parts.map(p => p.text || "").join("");

        return {
            text,
            groundingMetadata: candidate.groundingMetadata || null
        };
    }

    /**
     * Scan for trending memes across selected platforms.
     */
    async scanTrending(platforms, instructions) {
        const platformList = platforms.map(p => `- ${p.desc}`).join("\n");
        const today = new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });

        const resolvedInstructions = instructions.replace("{{DATE}}", today);

        const userPrompt = `Today is ${today}.

Scan these platforms for what's trending right now:
${platformList}

Find the top trending memes, viral content, and internet phenomena. Follow the system instructions for format.`;

        const result = await this.generate(resolvedInstructions, userPrompt);
        return result;
    }

    /**
     * Chat follow-up about the scan results.
     */
    async chat(question, scanContext, history, instructions) {
        const today = new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });

        const systemPrompt = `You are a helpful internet culture expert. Today is ${today}.

You previously scanned social media and found these trending memes/content. Use this context to answer questions:

${scanContext}

Guidelines:
- Answer questions about the memes, explain them further, find connections
- If asked about something not in the scan, use your knowledge and Google Search to help
- Keep answers concise but informative
- Provide links when relevant
- Format your response in plain text with markdown-like formatting (use ** for bold, etc.)
${instructions ? "\nAdditional user instructions:\n" + instructions : ""}`;

        const result = await this.generate(systemPrompt, question, history);
        return result;
    }
}
