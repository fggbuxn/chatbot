const chalk = require("chalk");

function ts() {
  const d = new Date();
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Dhaka", hour12: false,
    year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

const colors = {
  SODA: chalk.hex("#00ffff"),
  AI: chalk.hex("#a29bfe"),
  ROAST: chalk.hex("#ff6b6b"),
  SCAN: chalk.hex("#00b894"),
  DM: chalk.hex("#fd79a8"),
  INIT: chalk.hex("#6c5ce7"),
  WARN: chalk.yellow,
  ERROR: chalk.red,
  DONE: chalk.green
};

function log(msg, tag = "SODA") {
  const c = colors[tag] || chalk.white;
  console.log(`${chalk.gray(`[${ts()}]`)} ${c(`[ ${tag} ]`)} ${msg}`);
}

module.exports = log;
