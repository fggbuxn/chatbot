const login = require("fca-priyansh");
const fs = require("fs-extra");
const path = require("path");
const readline = require("readline").createInterface({
  input: process.stdin, output: process.stdout
});

(async () => {
  console.log("\n=== SODA Bot — Login ===\n");

  if (fs.existsSync(path.join(__dirname, "..", "appstate.json"))) {
    console.log("appstate.json already exists. Delete it to re-login.\n");
    readline.close();
    return;
  }

  const cfg = require("../config.json");
  let email = cfg.EMAIL, password = cfg.PASSWORD;

  if (!email || email === "your email") {
    email = await new Promise(r => readline.question("Email/Phone: ", r));
  }
  if (!password || password === "your password") {
    password = await new Promise(r => readline.question("Password: ", r));
  }

  console.log("\nLogging in...\n");

  login({ email, password }, (err, api) => {
    if (err) {
      console.error("Login failed:", err);
      readline.close();
      process.exit(1);
    }
    fs.writeFileSync(
      path.join(__dirname, "..", "appstate.json"),
      JSON.stringify(api.getAppState())
    );
    console.log("\n✓ Login OK! appstate.json saved. Run: npm start\n");
    readline.close();
    process.exit(0);
  });
})();
