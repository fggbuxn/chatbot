process.on("unhandledRejection", (reason) => {
  require("./src/utils/log")(`Unhandled rejection: ${reason?.message || reason}`, "ERROR");
});

const login = require("fca-priyansh");
const { existsSync, readFileSync, writeFileSync } = require("fs-extra");
const { join } = require("path");
const logger = require("./src/utils/log");

// ───── Futuristic Boot Sequence ─────
console.log(`
${require("chalk").hex("#00ffff")("  ╔═══════════════════════════════════════╗")}
${require("chalk").hex("#00ffff")("  ║")} ${require("chalk").bold.hex("#a29bfe")("SODA — ADVANCED AI ROBOT UNIT")}      ${require("chalk").hex("#00ffff")("║")}
${require("chalk").hex("#00ffff")("  ║")} ${require("chalk").gray("Quantum Roast Engine v1.0")}               ${require("chalk").hex("#00ffff")("║")}
${require("chalk").hex("#00ffff")("  ╚═══════════════════════════════════════╝")}
`);

global.config = require("./config.json");
global.countRestart = global.countRestart || 0;
global.client = { api: null };

logger("Initializing SODA systems...", "INIT");
logger(`Owner: ${global.config.OWNER_NAME || "RM ABIR"}`, "INIT");
logger(`AI Provider: ${global.config.AI_PROVIDER || "local only"}`, "INIT");

// ───── Express Dashboard ─────
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => res.send(`<!DOCTYPE html>
<html><head><title>SODA Bot</title>
<style>body{background:#0a0a1a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;overflow:hidden}
.card{text-align:center;padding:50px;border:1px solid #00ffff33;border-radius:15px;background:linear-gradient(135deg,#0a0a2e33,#1a1a3e33);backdrop-filter:blur(10px);box-shadow:0 0 40px #00ffff22}
h1{font-size:3em;background:linear-gradient(90deg,#00ffff,#a29bfe,#ff6b6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0}
.pulse{width:15px;height:15px;background:#00ff88;border-radius:50%;margin:20px auto;animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
.sub{color:#888;font-size:1.1em}
.dot{color:#00ffff}</style></head>
<body><div class="card"><div class="pulse"></div>
<h1>SODA</h1>
<p class="sub"><span class="dot">◆</span> SYSTEM ONLINE <span class="dot">◆</span></p>
<p style="color:#666">Quantum Roast Engine • Ready to destroy egos</p></div></body></html>`));
app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.listen(PORT, () => {
  logger(`Dashboard live on port ${PORT}`, "INIT");
}).on("error", (err) => {
  logger(`Dashboard error: ${err.message}`, "ERROR");
});

// ───── Load Database ─────
const db = require("./src/database");
db.init();

// ───── Load AI ─────
const ai = require("./src/ai");
ai.init();

// ───── Start Bot ─────
function start() {
  const appStatePath = join(__dirname, global.config.APPSTATEPATH);

  if (!existsSync(appStatePath)) {
    logger("appstate.json not found!", "ERROR");
    logger("Run: npm run login to generate it", "WARN");
    return;
  }

  const appState = JSON.parse(readFileSync(appStatePath, "utf8"));

  logger("🔌 Connecting to Facebook Messenger...", "INIT");

  login({ appState }, (err, api) => {
    if (err) {
      logger(`Login failed: ${JSON.stringify(err)}`, "ERROR");
      logger("Delete appstate.json and re-login", "WARN");
      return;
    }

    writeFileSync(appStatePath, JSON.stringify(api.getAppState(), null, 2));
    global.client.api = api;
    api.setOptions(global.config.FCAOption);

    const uid = api.getCurrentUserID();
    logger(`✓ Logged in as ${uid}`, "DONE");

    // Futuristic online announcement
    const getAiLabel = () => {
      if (global.config.AI_PROVIDER === "openai") return "OPENAI (GPT-4o)";
      if (global.config.AI_PROVIDER === "gemini") return "GEMINI PRO";
      if (global.config.AI_PROVIDER === "groq") return "GROQ (Llama 3 70B)";
      return "LOCAL MODE (offline roasts)";
    };
    const chalk = require("chalk");
    console.log(
`${chalk.hex("#00ffff")("  ╔═══════════════════════════════════════╗")}
${chalk.hex("#00ffff")("  ║")} ${chalk.bold.hex("#00ff88")("🦾 SODA IS NOW ONLINE 🦾")}           ${chalk.hex("#00ffff")("║")}
${chalk.hex("#00ffff")("  ║")} ${chalk.gray("Say my name if you dare, mortals.")}     ${chalk.hex("#00ffff")("║")}
${chalk.hex("#00ffff")("  ╚═══════════════════════════════════════╝")}
${chalk.hex("#ff6b6b")("  🔥 Roast Engine: ARMED")}
${chalk.hex("#a29bfe")("  👁️  Vision: ACTIVE")}
${chalk.hex("#00b894")("  🧠 AI: " + getAiLabel())}
`);

    // Start listening
    const listener = require("./src/listener")({ api });
    const eventHandler = require("./src/events")({ api });

    api.listenMqtt((err, event) => {
      if (err) {
        logger(`Mqtt error: ${JSON.stringify(err)}`, "ERROR");
        return;
      }
      if (event.type === "event") {
        eventHandler(event);
      } else {
        listener(event);
      }
    });

    logger("✓ SODA is alive. Say 'soda' to activate.", "DONE");

    // Auto-restart
    if (global.config.System?.autoRestart) {
      const interval = (global.config.System.restartInterval || 86400) * 1000;
      setTimeout(() => {
        logger("Auto-restart triggered", "WARN");
        process.exit(0);
      }, interval);
    }
  });
}

start();
