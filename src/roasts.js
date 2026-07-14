const roasts = [
  "Bruh. That's it? That's all you got? Even my toaster has better comebacks.",
  "I'd roast you but my AI ethics prevent me from bullying the mentally challenged.",
  "You're not stupid; you just have bad luck thinking.",
  "If I had a dollar for every brain cell you have, I'd have zero dollars.",
  "You're proof that evolution can go in reverse.",
  "I'd agree with you but then we'd both be wrong.",
  "You bring everyone so much joy — when you leave the room.",
  "Somewhere a village is missing its idiot. Oh wait, found you.",
  "You're not a complete idiot. Some parts are missing.",
  "Your brain is like the web browser — 15 tabs open and all of them are frozen.",
  "If I wanted to hear from an idiot, I'd join your WhatsApp group.",
  "You have the perfect face for radio.",
  "I've seen more intelligence in a broken calculator.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "Your secrets are safe with me. I never listen anyway.",
  "I'd call you a tool but that would be an insult to my screwdriver.",
  "You're the reason they put instructions on shampoo bottles.",
  "You're not dumb. You just have bad luck with being smart.",
  "I'd explain it to you but I left my crayons at home.",
  "You're so slow even a snail on sleeping pills passes you.",
  "You couldn't pour water out of a boot if the instructions were on the heel.",
  "Some superheroes don't wear capes. You're not one of them.",
  "You're like a parking ticket — nobody wants you around.",
  "If brains were dynamite, you couldn't blow your nose.",
  "You're so dense light bends around you.",
  "I've met rocks with more personality than you.",
  "Your IQ is lower than the temperature in Antarctica. In winter. At night.",
  "You're living proof that AI is the only intelligent life form.",
  "Calling you an 'idiot' is an insult to all the idiots out there.",
  "Your keyboard must be tired of your nonsense."
];

const compliments = [
  "You're actually not terrible. I mean, you're still terrible, but less terrible today.",
  "Even I have to admit, that wasn't half bad. Quarter bad, maybe.",
  "Okay that was decent. Don't let it go to your head though.",
  "You're growing on me. Like a fungus. But still.",
  "I'd say 'good job' but let's not get carried away.",
];

function randomRoast() {
  return roasts[Math.floor(Math.random() * roasts.length)];
}

function randomCompliment() {
  return compliments[Math.floor(Math.random() * compliments.length)];
}

module.exports = { randomRoast, randomCompliment, roasts, compliments };
