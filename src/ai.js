const OpenAI = require("openai");
const logger = require("./utils/log");
const { randomRoast } = require("./roasts");
const { buildSystemPrompt } = require("./personality");
const db = require("./database");

let client = null;

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama3-70b-8192";

function init() {
  const c = global.config;

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
    const msgs = [
      { role: "system", content: buildSystemPrompt() },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
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

    const model = global.config.AI_PROVIDER === "groq" ? GROQ_MODEL : "gpt-4o-mini";

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
      api.sendMessage(`🤖 *SODA SYSTEM MSG*\n${msg}`, ownerId);
    }
  } catch {}
}

module.exports = { init, ask, notifyOwner };
