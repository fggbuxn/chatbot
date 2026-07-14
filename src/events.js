const logger = require("./utils/log");
const db = require("./database");

const entryMessages = [
  `🦾 *SODA BOOT SEQUENCE v3.0* 🦾
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Systems initialized
✅ Roast engine armed
✅ Vision module active
━━━━━━━━━━━━━━━━━━━━━━━━━━
Say "soda" to wake me up.`,

  `🚀 *SODA DEPLOYMENT COMPLETE* 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 Neural network synced
👁️  Vision online
🔥 Roast mode ready
━━━━━━━━━━━━━━━━━━━━━━━━━━
Just say "soda" when you need me.`,

  `⚡ *SODA AWAKENING PROTOCOL* ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Quantum cores spinning
🔬 Bio-scan array calibrated
🎯 Ego targeting online
━━━━━━━━━━━━━━━━━━━━━━━━━━
Say "soda" to interact.`
];

function formatMemberList(members) {
  if (!members || members.length === 0) return "⚠️ No lifeforms detected";
  return members.map((m, i) => `${i + 1}. ${m.name}`).join("\n");
}

async function sendBootSequence(api, threadID, members) {
  const owner = global.config?.OWNER_NAME || "RM ABIR";
  const membersList = formatMemberList(members);

  const msg = `${entryMessages[Math.floor(Math.random() * entryMessages.length)]}

━━━━━━━━━━━━━━━━━━━━━━━━━━
*🖥 BIO-SCAN RESULTS*
👥 ${members.length} lifeforms detected:
${membersList}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*REQUIREMENTS*
👑 Owner: ${owner} (immune)
🔊 Say "soda" to activate
📸 Send image = I see everything
━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  await api.sendMessage(msg, threadID);
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
              const memberIds = info.participantIDs || [];
              const scannedMembers = [];

              for (const mid of memberIds) {
                if (!db.getUser(mid)) {
                  try {
                    const uinfo = await api.getUserInfo(mid);
                    const name = uinfo[mid]?.name || "Unknown";
                    db.setUser(mid, { name, firstSeen: Date.now(), chatCount: 0 });
                    scannedMembers.push({ id: mid, name });
                  } catch {
                    scannedMembers.push({ id: mid, name: "Unknown" });
                  }
                } else {
                  const existing = db.getUser(mid);
                  scannedMembers.push({ id: mid, name: existing.name || "Unknown" });
                }
              }

              db.setThread(threadID, {
                name: info.threadName || "Unnamed Group",
                members: memberIds,
                firstSeen: Date.now()
              });

              logger(`Scanned ${memberIds.length} members in new group`, "SCAN");

              // Send the full futuristic boot sequence
              sendBootSequence(api, threadID, scannedMembers);

              // Notify owner in DM
              const ownerId = global.config?.OWNER_ID;
              if (ownerId) {
                try {
                  await api.sendMessage(
                    `🤖 SODA was added to a new group!\n📋 Name: ${info.threadName || "Unnamed"}\n👥 Members: ${memberIds.length}`,
                    ownerId
                  );
                } catch {}
              }
            } catch (e) {
              logger(`Scan error: ${e.message}`, "ERROR");
              // Fallback simple entry
              const fallback = `🦾 SODA ONLINE — Say "soda" to wake me.`;
              api.sendMessage(fallback, threadID);
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
