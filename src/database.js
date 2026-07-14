const fs = require("fs-extra");
const path = require("path");
const logger = require("./utils/log");

const DATA_DIR = path.join(__dirname, "..", "data");
const COLLECTIONS = ["users", "threads", "conversations"];

const cache = {};

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name) {
  const fp = filePath(name);
  if (fs.existsSync(fp)) {
    try {
      cache[name] = fs.readJsonSync(fp, { throws: false }) || {};
    } catch {
      cache[name] = {};
    }
  } else {
    cache[name] = {};
  }
  return cache[name];
}

function save(name) {
  fs.ensureDirSync(DATA_DIR);
  fs.writeJsonSync(filePath(name), cache[name] || {}, { spaces: 2 });
}

function init() {
  fs.ensureDirSync(DATA_DIR);
  for (const col of COLLECTIONS) load(col);
  const counts = COLLECTIONS.map(c => Object.keys(cache[c] || {}).length);
  logger(`Database ready — ${counts[0]} users, ${counts[1]} threads`, "DB");
}

function getCol(name) {
  if (!cache[name]) load(name);
  return cache[name];
}

function setCol(name, data) {
  cache[name] = data;
  save(name);
}

function getUser(id) {
  const col = getCol("users");
  return col[id] || null;
}

function setUser(id, data) {
  const col = getCol("users");
  col[id] = { ...(col[id] || {}), ...data, id };
  save("users");
}

function getThread(id) {
  const col = getCol("threads");
  return col[id] || null;
}

function setThread(id, data) {
  const col = getCol("threads");
  col[id] = { ...(col[id] || {}), ...data, id };
  save("threads");
}

function getConvo(userId) {
  const col = getCol("conversations");
  return col[userId] || [];
}

function setConvo(userId, history) {
  const col = getCol("conversations");
  col[userId] = history.slice(-20);
  save("conversations");
}

function addToConvo(userId, role, content) {
  const h = getConvo(userId);
  h.push({ role, content, time: Date.now() });
  setConvo(userId, h);
}

module.exports = {
  init, getUser, setUser, getThread, setThread,
  getConvo, setConvo, addToConvo
};
