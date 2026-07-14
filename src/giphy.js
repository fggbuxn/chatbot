const logger = require("./utils/log");
const axios = require("axios");

const GIPHY_API = "https://api.giphy.com/v1/gifs";

function getKey() {
  return global.config?.GIPHY_API_KEY;
}

async function searchGif(query) {
  const key = getKey();
  if (!key) return null;

  try {
    const { data } = await axios.get(`${GIPHY_API}/search`, {
      params: {
        api_key: key,
        q: query,
        limit: 8,
        rating: "g"
      },
      timeout: 5000
    });

    if (data.data?.length > 0) {
      const gif = data.data[Math.floor(Math.random() * data.data.length)];
      return gif.images?.original?.url || gif.images?.downsized?.url || null;
    }
    return null;
  } catch (err) {
    logger(`GIPHY error: ${err.message}`, "ERROR");
    return null;
  }
}

function pickKeywords(prompt, reply) {
  const roastWords = ["roast", "burn", "destroy", "obliterate", "savage", "wreck"];
  const laughWords = ["lol", "lmao", "funny", "joke", "haha", "hilarious", "laugh"];
  const dumbWords = ["dumb", "stupid", "idiot", "fool", "clown", "joke", "trash"];
  const coolWords = ["cool", "awesome", "nice", "sick", "dope", "lit", "fire"];

  const text = `${prompt} ${reply}`.toLowerCase();

  if (roastWords.some(w => text.includes(w))) return "roast";
  if (laughWords.some(w => text.includes(w))) return "lol";
  if (dumbWords.some(w => text.includes(w))) return "facepalm";
  if (coolWords.some(w => text.includes(w))) return "cool";

  const topics = ["fail", "eyeroll", "sarcasm", "deal with it", "whatever", "bye", "sorry"];
  return topics[Math.floor(Math.random() * topics.length)];
}

module.exports = { searchGif, pickKeywords };