const DOMAINS = ["orders", "payments", "shipments", "customers", "inventory", "invoices", "returns", "loyalty"];
const CHANNEL_COUNT = 400;

const channels = {};
const messages = {};
const messageTraits = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const channelKey = `retail.cmd.${domain}.event-${i}.v1`;
  const base = `${domain}Event${i}`;
  const publishId = i % 7 === 0 ? `${domain.toUpperCase()}_EVENT_${i}` : `${base}Published`;
  const subscribeName = i % 11 === 0 ? `${domain}-event-${i}-received` : `${base}Received`;
  const traitName = i % 13 === 0 ? `${base}_Trait` : `${base}Trait`;

  channels[channelKey] = {
    description: `Events of the ${domain} domain, partition group ${i}.`,
    publish: {
      operationId: `publish${i}`,
      message: {
        messageId: publishId,
        name: `${base}Published`,
        payload: { type: "object", properties: { name: { type: "string" }, id: { type: "string" } } },
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }, { name: traitName }],
      },
    },
    subscribe: {
      operationId: `subscribe${i}`,
      message: {
        oneOf: [
          { messageId: `${base}Received`, name: subscribeName },
          { $ref: `#/components/messages/shared${i % 5}` },
        ],
      },
    },
  };

  if (i % 7 === 0) expectedPaths.push(["channels", channelKey, "publish", "message", "messageId"].join("."));
  if (i % 13 === 0) expectedPaths.push(["channels", channelKey, "publish", "message", "traits", "1", "name"].join("."));
  if (i % 11 === 0) expectedPaths.push(["channels", channelKey, "subscribe", "message", "oneOf", "0", "name"].join("."));
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { messageId: s === 3 ? `Shared${s}` : `shared${s}`, name: `shared${s}` };
  if (s === 3) expectedPaths.push(["components", "messages", `shared${s}`, "messageId"].join("."));
}

messageTraits.commonHeaders = { messageId: "commonHeaders", name: "common_headers" };
expectedPaths.push("components.messageTraits.commonHeaders.name");

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Retail Event Backbone",
      version: "5.0.0",
      description: "Generated document with 400 channels, 800 operations and more than 1,600 messages and traits.",
    },
    channels,
    components: { messages, messageTraits },
  },
  expectedPaths: expectedPaths.sort(),
};
