const DOMAINS = ["vehicles", "drivers", "routes", "depots", "parcels", "fuel"];
const CHANNEL_COUNT = 300;
const MESSAGES_PER_CHANNEL = 4;

const channels = {};
const operations = {};
const messages = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const channelKey = `${domain}Channel${i}`;
  const channelMessages = {};

  for (let m = 0; m < MESSAGES_PER_CHANNEL; m++) {
    const n = i * MESSAGES_PER_CHANNEL + m;
    const badKey = n % 9 === 0;
    const badName = n % 14 === 0;
    const key = badKey ? `${domain}_event_${n}` : `${domain}Event${n}`;
    channelMessages[key] =
      m === 3
        ? { $ref: `#/components/messages/shared${i % 4}` }
        : {
            name: badName ? `${domain.toUpperCase()}-EVENT-${n}` : `${domain}Event${n}`,
            payload: { type: "object", properties: { name: { type: ["string", "null"] } } },
            traits: [{ $ref: "#/components/messageTraits/fleetHeaders" }],
          };
    if (badKey) expectedPaths.push(["channels", channelKey, "messages", key].join("."));
    if (badName && m !== 3) expectedPaths.push(["channels", channelKey, "messages", key, "name"].join("."));
  }

  channels[channelKey] = { address: i % 10 === 0 ? null : `fleet/${domain}/${i}`, messages: channelMessages };
  operations[`send${domain}${i}`] = {
    action: i % 2 === 0 ? "send" : "receive",
    channel: { $ref: `#/channels/${channelKey}` },
    messages: Object.keys(channelMessages).map((key) => ({ $ref: `#/channels/${channelKey}/messages/${key}` })),
  };
}

for (let s = 0; s < 4; s++) {
  const key = s === 2 ? `Shared${s}` : `shared${s}`;
  messages[key] = { name: s === 1 ? `shared_${s}` : `shared${s}` };
  if (s === 2) expectedPaths.push(`components.messages.${key}`);
  if (s === 1) expectedPaths.push(`components.messages.${key}.name`);
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Fleet Event Backbone",
      version: "7.0.0",
      description: "Generated document with 300 channels, 1,200 messages and 300 operations.",
    },
    channels,
    operations,
    components: {
      messages,
      messageTraits: { fleetHeaders: { name: "fleetHeaders" } },
    },
  },
  expectedPaths: expectedPaths.sort(),
};
