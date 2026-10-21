const TAGS = ["payments", "card-authorizations", "refunds", "chargebacks", "settlements", "fraud-screening", "payouts"];
const CHANNEL_COUNT = 350;

const channels = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const tag = TAGS[i % TAGS.length];
  const channelKey = `payments.${tag}.${i}`;
  const operationTag = i % 6 === 0 ? `${tag.toUpperCase()}_${i}` : `${tag}-${i}`;
  const messageTag = i % 8 === 0 ? `${tag} message` : `${tag}-message`;
  const traitTag = i % 10 === 0 ? `${tag}Trait` : `${tag}-trait`;

  channels[channelKey] = {
    publish: {
      tags: [{ name: tag }, { name: operationTag }],
      traits: [{ tags: [{ name: traitTag }] }],
      message: {
        tags: [{ name: messageTag }],
        payload: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } },
      },
    },
    subscribe: {
      message: { oneOf: [{ tags: [{ name: tag }] }, { $ref: "#/components/messages/shared" }] },
    },
  };

  if (i % 6 === 0) expectedPaths.push(["channels", channelKey, "publish", "tags", "1", "name"].join("."));
  if (i % 10 === 0) expectedPaths.push(["channels", channelKey, "publish", "traits", "0", "tags", "0", "name"].join("."));
  if (i % 8 === 0) expectedPaths.push(["channels", channelKey, "publish", "message", "tags", "0", "name"].join("."));
}

expectedPaths.push("components.messages.shared.tags.1.name");

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Payments Event Backbone",
      version: "9.0.0",
      description: "Generated document with 350 channels and more than 1,700 tags.",
    },
    tags: TAGS.map((name) => ({ name })),
    channels,
    components: {
      messages: { shared: { tags: [{ name: "shared" }, { name: "Shared_Tag" }] } },
    },
  },
  expectedPaths: expectedPaths.sort(),
};
