const OpenAI = require("openai");
const logger = require("./utils/log");
const { randomRoast } = require("./roasts");
const { buildSystemPrompt } = require("./personality");
const db = require("./database");

let client = null;

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function init() {
  const c = global.config;

  // Sanitize any corrupted conversation data (content arrays saved by old versions)
  try {
    const cols = require("./database");
    const convos = require("fs-extra").readJsonSync(
      require("path").join(__dirname, "..", "data", "conversations.json"),
      { throws: false }
    ) || {};
    let cleaned = 0;
    for (const uid of Object.keys(convos)) {
      const arr = convos[uid];
      if (!Array.isArray(arr)) continue;
      convos[uid] = arr.map(entry => {
        if (entry && typeof entry === "object" && Array.isArray(entry.content)) {
          cleaned++;
          return { ...entry, content: entry.content.find(c => c.type === "text")?.text || JSON.stringify(entry.content) };
        }
        return entry;
      });
    }
    if (cleaned > 0) {
      require("fs-extra").writeJsonSync(
        require("path").join(__dirname, "..", "data", "conversations.json"),
        convos,
        { spaces: 2 }
      );
      logger(`Sanitized ${cleaned} corrupted conversation entries`, "DB");
    }
  } catch {}

  if (c.AI_PROVIDER === "groq" && c.GROQ_API_KEY) {
    client = new OpenAI({ baseURL: GROQ_BASE, apiKey: c.GROQ_API_KEY });
    logger("Groq (Llama 3 70B) connected", "AI");
  } else if (c.AI_PROVIDER === "openai" && c.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: c.OPENAI_API_KEY });
    logger("OpenAI connected", "AI");
  } else {
    logger("No API key — using local replies only", "WARN");
  }
}

async function ask(prompt, userId, imageUrl = null) {
  const history = db.getConvo(userId);

  if (!client) return fallbackReply();

  try {
    const isVision = Boolean(imageUrl);
    const model = isVision && global.config.AI_PROVIDER === "groq"
      ? GROQ_VISION_MODEL
      : global.config.AI_PROVIDER === "groq"
        ? GROQ_MODEL
        : "gpt-4o-mini";

    const msgs = [
      { role: "system", content: buildSystemPrompt() },
      ...history.slice(-10).map(m => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.find(c => c.type === "text")?.text || JSON.stringify(m.content)
          : m.content
      })),
    ];

    if (imageUrl) {
      msgs.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      msgs.push({ role: "user", content: prompt });
    }

    const resp = await client.chat.completions.create({
      model,
      messages: msgs,
      max_tokens: 1024,
      temperature: 0.85
    });

    return resp.choices[0]?.message?.content || fallbackReply();
  } catch (err) {
    logger(`AI error: ${err.message}`, "ERROR");
    if (err.status === 429) {
      notifyOwner("⚠️ Groq quota exhausted. Using local replies.");
    } else {
      notifyOwner(`⚠️ AI API error: ${err.message}`);
    }
    return fallbackReply();
  }
}

function fallbackReply() {
  return `🦾 *LOCAL REPLY MODE ACTIVATED*\n${randomRoast()}\n\n*(My AI cloud connection is buffering. Try again later, mortal.)*`;
}

function notifyOwner(msg) {
  try {
    const api = global.client?.api;
    const ownerId = global.config?.OWNER_ID;
    if (api && ownerId) {
      api.sendMessage(`🤖 *SODA SYSTEM MSG*\n${msg}`, ownerId).catch(() => {});
    }
  } catch {}
}

module.exports = { init, ask, notifyOwner };
