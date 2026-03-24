/**
 * Social media platform definitions.
 * Each platform has an id, display name, icon, and description used in prompts.
 */
const PLATFORMS = [
    { id: "x",          name: "X / Twitter",    icon: "𝕏",  desc: "X (formerly Twitter) trending topics, viral tweets, and meme hashtags" },
    { id: "reddit",     name: "Reddit",         icon: "🤖", desc: "Reddit front page, r/all, r/memes, r/dankmemes, r/me_irl popular posts" },
    { id: "tiktok",     name: "TikTok",         icon: "🎵", desc: "TikTok trending sounds, challenges, and viral video memes" },
    { id: "instagram",  name: "Instagram",      icon: "📷", desc: "Instagram Reels trends, viral meme accounts, and trending formats" },
    { id: "youtube",    name: "YouTube",        icon: "▶️", desc: "YouTube trending videos, Shorts trends, and viral video memes" },
    { id: "facebook",   name: "Facebook",       icon: "📘", desc: "Facebook viral posts, shared memes, and trending topics" },
    { id: "threads",    name: "Threads",        icon: "🧵", desc: "Threads trending posts and viral discussions" },
    { id: "bluesky",    name: "Bluesky",        icon: "🦋", desc: "Bluesky trending posts and viral skeets" },
    { id: "mastodon",   name: "Mastodon",       icon: "🐘", desc: "Mastodon trending toots across popular instances" },
    { id: "discord",    name: "Discord",        icon: "💬", desc: "Discord trending memes, emotes, and viral content across major servers" },
    { id: "tumblr",     name: "Tumblr",         icon: "📝", desc: "Tumblr trending tags, viral posts, and fandom memes" },
    { id: "snapchat",   name: "Snapchat",       icon: "👻", desc: "Snapchat Discover trending stories and viral Spotlight content" },
    { id: "pinterest",  name: "Pinterest",      icon: "📌", desc: "Pinterest trending pins, viral aesthetics, and meme boards" },
    { id: "twitch",     name: "Twitch",         icon: "🎮", desc: "Twitch trending emotes, clips, and streamer memes" },
    { id: "4chan",       name: "4chan",           icon: "🍀", desc: "4chan boards trending greentexts, image macros, and fresh memes" },
    { id: "telegram",   name: "Telegram",       icon: "✈️", desc: "Telegram viral stickers, channel posts, and trending memes" },
    { id: "linkedin",   name: "LinkedIn",       icon: "💼", desc: "LinkedIn viral posts, corporate memes, and trending professional humor" },
    { id: "knowyourmeme", name: "Know Your Meme", icon: "📖", desc: "Know Your Meme trending entries and recently documented memes" },
];

const DEFAULT_INSTRUCTIONS = `You are a Trending Meme Tracker — an expert internet culture analyst.

YOUR JOB:
Identify the top trending memes, viral content, and internet phenomena happening RIGHT NOW (today: {{DATE}}) across the selected social media platforms.

FOR EACH MEME/TREND YOU FIND, PROVIDE:
1. **Name/Title** — The meme name or trend title
2. **Platforms** — Which platforms it's trending on
3. **What It Is** — A simple, clear explanation anyone can understand
4. **Origin** — Where it started and how it spread (trace the meme)
5. **Why It's Trending** — What triggered it to go viral today
6. **Example Links** — Real URLs to videos, posts, or articles about it (YouTube links, news articles, Know Your Meme pages, etc.)
7. **Virality Score** — Rate 1-10 how viral it is right now

IMPORTANT RULES:
- Focus on what is trending TODAY, not old memes
- Use your knowledge of current events and internet culture up to your training data
- Use Google Search grounding to find the latest trends when possible
- Provide REAL links — YouTube video URLs, news articles, KnowYourMeme pages
- If you can't find a real link, say so rather than making one up
- Explain memes simply — assume the reader might not be chronically online
- Include at least 5-10 trending items
- Cover different types: image memes, video trends, phrases/catchphrases, challenges

FORMAT YOUR RESPONSE AS JSON:
{
  "scan_date": "YYYY-MM-DD",
  "memes": [
    {
      "rank": 1,
      "title": "Meme Name",
      "platforms": ["x", "reddit", "tiktok"],
      "explanation": "Simple explanation...",
      "origin": "Where it came from...",
      "why_trending": "Why it's viral right now...",
      "links": [
        {"label": "Description", "url": "https://..."}
      ],
      "virality_score": 8
    }
  ]
}

Return ONLY valid JSON, no markdown code fences.`;
