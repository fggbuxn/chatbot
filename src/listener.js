const logger = require("./utils/log");
const db = require("./database");
const { ask, notifyOwner } = require("./ai");
const { getActivationResponse } = require("./personality");
const { randomRoast } = require("./roasts");
const { searchGif, pickKeywords } = require("./giphy");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const pJson = require("../package.json");

const TEMP_DIR = path.join(__dirname, "..", "temp");
fs.ensureDirSync(TEMP_DIR);

async function sendGif(api, threadID, prompt, reply) {
  try {
    const gifUrl = await searchGif(pickKeywords(prompt, reply));
    if (!gifUrl) return;

    const tmpPath = path.join(TEMP_DIR, `gif_${Date.now()}.gif`);
    const resp = await axios({ url: gifUrl, responseType: "stream", timeout: 8000 });
    const writer = fs.createWriteStream(tmpPath);
    resp.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await api.sendMessage({ attachment: fs.createReadStream(tmpPath) }, threadID);
    fs.unlink(tmpPath).catch(() => {});
  } catch {}
}

module.exports = function ({ api }) {
  return async function (event) {
    try {
      const { type, senderID, threadID, body, isGroup } = event;
      if (type !== "message" && type !== "message_reply") return;
      if (!body || typeof body !== "string") return;
      if (senderID === api.getCurrentUserID()) return;

      const ownerId = global.config.OWNER_ID;
      const ownerName = global.config.OWNER_NAME;
      const isOwner = String(senderID) === String(ownerId);
      const isAdmin = global.config.ADMIN_IDS?.includes(String(senderID));

      // Auto-scan and save user
      const existing = db.getUser(senderID);
      if (!existing) {
        try {
          const info = await api.getUserInfo(senderID);
          const name = info[senderID]?.name || "Unknown";
          db.setUser(senderID, { name, firstSeen: Date.now(), chatCount: 0 });
          logger(`👤 New user scanned: ${name}`, "SCAN");
        } catch {}
      } else {
        existing.chatCount = (existing.chatCount || 0) + 1;
        db.setUser(senderID, existing);
      }

      // Auto-scan thread
      if (isGroup && !db.getThread(threadID)) {
        try {
          const info = await api.getThreadInfo(threadID);
          db.setThread(threadID, {
            name: info.threadName || "Unnamed",
            members: info.participantIDs || [],
            firstSeen: Date.now()
          });
          logger(`📋 Thread scanned: ${db.getThread(threadID)?.name || threadID}`, "SCAN");
        } catch {}
      }

      // Detect if replying to SODA's own message (continuation — no wake word needed)
      const botID = api.getCurrentUserID();
      const isReplyToBot = event.messageReply && String(event.messageReply.senderID) === String(botID);

      // Wake word detection: "soda" anywhere OR replying to SODA's message
      const lower = body.toLowerCase();
      if (!lower.includes("soda") && !isReplyToBot) return;

      // Strip wake word to get the actual prompt
      let prompt = body.replace(/soda[!\s,]*/gi, "").trim();

      // Get image if there's a reply attachment
      let imageUrl = null;
      if (event.messageReply?.attachments?.length > 0) {
        const att = event.messageReply.attachments[0];
        if (att.type === "photo" || att.type === "animated_image") {
          imageUrl = att.url;
        }
      }
      if (event.attachments?.length > 0) {
        const att = event.attachments[0];
        if (att.type === "photo" || att.type === "animated_image") {
          imageUrl = att.url;
        }
      }

      // Handle owner
      if (isOwner || isAdmin) {
        logger(`💬 Owner said: "${prompt || "(just woke me)"}"`, "DM");
        if (!prompt && !imageUrl) {
          return api.sendMessage(`🫡 Yes ${ownerName}? I'm always ready for you. What do you need?`, threadID);
        }
        const reply = await ask(prompt || "Say hello to my owner respectfully", senderID, imageUrl);
        db.addToConvo(senderID, "user", prompt);
        db.addToConvo(senderID, "assistant", reply);
        await api.sendMessage(reply, threadID);
        sendGif(api, threadID, prompt, reply);
        return;
      }

      // Handle everyone else — with roasting
      if (!prompt && !imageUrl) {
        return api.sendMessage(`🔥 *ROAST MODE* 🔥\n${randomRoast()}`, threadID);
      }

      const reply = await ask(prompt || "Roast this person creatively", senderID, imageUrl);
      db.addToConvo(senderID, "user", prompt);
      db.addToConvo(senderID, "assistant", reply);
      await api.sendMessage(reply, threadID);
      sendGif(api, threadID, prompt, reply);

    } catch (err) {
      logger(`Listener error: ${err.message}`, "ERROR");
      notifyOwner(`❌ SODA crashed on a message:\n${err.message}`);
    }
  };
};
