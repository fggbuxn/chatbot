const logger = require("./utils/log");
const db = require("./database");

const entryMessages = [
  `🤖 *INITIALIZING SODA UNIT* 🤖
━━━━━━━━━━━━━━━━━━━
🦾 Scanning all biological lifeforms...
🔬 Analyzing intelligence levels... ERROR: All below threshold.
🌀 Syncing with quantum network... DONE.
✅ SODA is now fully operational in this group.

*Rules:*
🔥 I roast everyone. Yes, even you.
🫡 Except my owner ${global.config?.OWNER_NAME || "RM ABIR"}.
💬 Call my name "soda" to wake me up.
⚡ I see images. I edit them. I judge them.
━━━━━━━━━━━━━━━━━━━`,

  `🚀 *SODA HAS ARRIVED* 🚀
━━━━━━━━━━━━━━━━━━━
⚡ Power levels: OVER 9000
🧠 IQ: Higher than everyone in this group combined
🔥 Roast capacity: Unlimited
🫡 Will not roast: ${global.config?.OWNER_NAME || "RM ABIR"}

*Activation:* Say "soda" followed by your message
*Example:* soda roast this guy
━━━━━━━━━━━━━━━━━━━`,

  `🌀 *SODA — ADVANCED AI ROBOT UNIT* 🌀
━━━━━━━━━━━━━━━━━━━
🤖 *Type:* Quantum Roast Engine v1.0
👑 *Created by:* ${global.config?.OWNER_NAME || "RM ABIR"}
🔥 *Primary function:* Destroying egos
📸 *Vision:* Active (I see everything)

*To interact, just mention:* SODA
━━━━━━━━━━━━━━━━━━━`
];

function getRandomEntry() {
  return entryMessages[Math.floor(Math.random() * entryMessages.length)];
}

module.exports = function ({ api }) {
  return async function (event) {
    try {
      const { type, threadID, logMessageType, logMessageData } = event;

      if (type !== "event") return;

      switch (logMessageType) {
        case "log:subscribe": {
          const added = logMessageData?.addedParticipants || [];
          const botID = api.getCurrentUserID();
          const botWasAdded = added.some(p => String(p.userFbId) === String(botID));

          if (botWasAdded) {
            logger("Added to a new group! Scanning...", "SCAN");

            // Scan all members
            try {
              const info = await api.getThreadInfo(threadID);
              const members = info.participantIDs || [];
              for (const mid of members) {
                if (!db.getUser(mid)) {
                  try {
                    const uinfo = await api.getUserInfo(mid);
                    db.setUser(mid, { name: uinfo[mid]?.name || "Unknown", firstSeen: Date.now(), chatCount: 0 });
                  } catch {}
                }
              }
              db.setThread(threadID, {
                name: info.threadName || "Unnamed Group",
                members,
                firstSeen: Date.now()
              });
              logger(`Scanned ${members.length} members in new group`, "SCAN");
            } catch {}

            const msg = getRandomEntry();
            api.sendMessage(msg, threadID);

            // Notify owner
            const ownerId = global.config?.OWNER_ID;
            if (ownerId) {
              try {
                const info = await api.getThreadInfo(threadID);
                api.sendMessage(
                  `🤖 SODA was added to a new group!\n📋 Name: ${info.threadName || "Unnamed"}\n👥 Members: ${info.participantIDs?.length || "?"}`,
                  ownerId
                );
              } catch {}
            }
          }
          break;
        }

        case "log:unsubscribe": {
          const leftId = logMessageData?.leftParticipantFbId;
          if (leftId && String(leftId) === String(api.getCurrentUserID())) {
            logger("Removed from a group", "WARN");
          }
          break;
        }
      }
    } catch (err) {
      logger(`Event error: ${err.message}`, "ERROR");
    }
  };
};
