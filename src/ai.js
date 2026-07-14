const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("./utils/log");
const { randomRoast } = require("./roasts");
const { buildSystemPrompt } = require("./personality");
const db = require("./database");
const axios = require("axios");

let openai = null;
let gemini = null;

function init() {
  const c = global.config;
  if (c.AI_PROVIDER === "openai" && c.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: c.OPENAI_API_KEY });
    logger("OpenAI connected", "AI");
  }
  if (c.AI_PROVIDER === "gemini" && c.GEMINI_API_KEY) {
    const gen = new GoogleGenerativeAI(c.GEMINI_API_KEY);
    gemini = gen.getGenerativeModel({ model: "gemini-1.5-pro" });
    logger("Gemini 1.5 Pro ready", "AI");
  }
  if (!openai && !gemini) {
    logger("No API key set — using local replies only", "WARN");
  }
}

async function ask(prompt, userId, imageUrl = null) {
  const c = global.config;
  const history = db.getConvo(userId);

  if (c.AI_PROVIDER === "openai" && openai) {
    return askOpenAI(prompt, history, imageUrl);
  }
  if (c.AI_PROVIDER === "gemini" && gemini) {
    return askGemini(prompt, history, imageUrl);
  }

  return fallbackReply();
}

async function askOpenAI(prompt, history, imageUrl) {
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

    const resp = await openai.chat.completions.create({
      model: imageUrl ? "gpt-4o-mini" : "gpt-4o-mini",
      messages: msgs,
      max_tokens: 1024,
      temperature: 0.85
    });

    return resp.choices[0]?.message?.content || fallbackReply();
  } catch (err) {
    logger(`OpenAI error: ${err.message}`, "ERROR");
    notifyOwner(`⚠️ OpenAI API error: ${err.message}`);
    return fallbackReply();
  }
}

async function askGemini(prompt, history, imageUrl) {
  try {
    const contents = history.slice(-10).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    if (imageUrl) {
      const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const base64 = Buffer.from(imgResp.data).toString("base64");
      const mime = imgResp.headers["content-type"] || "image/jpeg";

      const result = await gemini.generateContent({
        contents: [
          ...contents,
          {
            role: "user",
            parts: [
              { text: `${buildSystemPrompt()}\n\nUser: ${prompt || "Roast this image creatively."}` },
              { inlineData: { mimeType: mime, data: base64 } }
            ]
          }
        ],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.85 }
      });
      return result.response.text();
    }

    const chat = gemini.startChat({
      history: contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.85 },
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] }
    });

    const result = await chat.sendMessage(prompt || "Say something funny");
    return result.response.text();
  } catch (err) {
    logger(`Gemini error: ${err.message}`, "ERROR");
    notifyOwner(`⚠️ Gemini API error: ${err.message}`);
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
