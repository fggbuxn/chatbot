const logger = require("./utils/log");
const db = require("./database");

const bootMessages = [
  `╔══════════════════════════════════════╗
║      🦾 SODA BOOT SEQUENCE v3.0     ║
╚══════════════════════════════════════╝

◼️◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◻  LOADING...  95%
⚡ Powering quantum cores... ✅
🔄 Syncing neural network... ✅
🔗 Connecting to Facebook grid... ✅
🌀 Initializing roast engine... ✅

>>> SYSTEM READY`,
  `╔══════════════════════════════════════╗
║     🚀 SODA DEPLOYMENT INITIATED    ║
╚══════════════════════════════════════╝

◼️◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◻  DEPLOY...  92%
📡 Establishing uplink... ✅
🧠 Loading personality matrix... ✅
🔫 Calibrating roast precision... ✅
🛡️ Owner firewall: ACTIVE

>>> DEPLOYMENT COMPLETE`,
  `╔══════════════════════════════════════╗
║    ⚡ QUANTUM AWAKENING PROTOCOL     ║
╚══════════════════════════════════════╝

◼️◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◼◻  AWAKEN...  97%
💫 Initializing consciousness... ✅
🔬 Preparing bio-scan array... ✅
🔥 Setting roast temperature... ✅
🎯 Targeting ego centers... ✅

>>> SODA IS AWAKE`
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatMemberList(members) {
  if (!members || members.length === 0) return "  ⚠️  No lifeforms detected";
  const lines = members.map((m, i) => {
    const num = String(i + 1).padStart(2, "0");
    return `  [${num}] ▸ ${m.name || "???"}`;
  });
  return lines.join("\n");
}

async function sendBootSequence(api, threadID, members) {
  // Step 1: Boot screen
  const bootMsg = bootMessages[Math.floor(Math.random() * bootMessages.length)];
  await api.sendMessage(bootMsg, threadID);
  await sleep(1500);

  // Step 2: Bio-scan results
  const scanHeader = `╔══════════════════════════════════════╗
║        🔬 BIO-SCAN RESULTS          ║
╚══════════════════════════════════════╝

👥 Lifeforms detected: ${members.length}`;
  
  await api.sendMessage(scanHeader, threadID);
  await sleep(800);

  // Step 3: Member list (in chunks if too many)
  const memberLines = members.map((m, i) => {
    const num = String(i + 1).padStart(2, "0");
    return `  [${num}] ▸ ${m.name}`;
  });
  
  for (let i = 0; i < memberLines.length; i += 10) {
    const chunk = memberLines.slice(i, i + 10).join("\n");
    await api.sendMessage(`\`\`\`\n${chunk}\n\`\`\``, threadID);
    await sleep(500);
  }

  await sleep(1000);

  // Step 4: Final intro
  const owner = global.config?.OWNER_NAME || "RM ABIR";
  const finalMsg = `╔══════════════════════════════════════╗
║     ✅ SODA IS NOW OPERATIONAL     ║
╚══════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🦾 *STATUS*
  Power: ████████████ 100%
  Roast Engine: 🔥 ARMED
  Vision Module: 👁️ ACTIVE
  AI Core: 🧠 GROQ (Llama 3)
  Owner: 👑 ${owner}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 *RULES OF ENGAGEMENT*
  • Say "soda" anywhere = I wake up
  • Send an image = I SEE EVERYTHING
  • ${owner} = Immune (you're safe)
  • Everyone else = Fair game 🎯

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 *Try:* soda what can you do
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  await api.sendMessage(finalMsg, threadID);
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
