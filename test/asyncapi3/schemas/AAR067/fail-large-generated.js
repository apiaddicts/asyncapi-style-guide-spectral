const DOMAINS = ["vehicles", "stops", "fares", "alerts", "drivers", "depots", "routes", "trips"];
const ALLOWED = [
  "application/json",
  "application/cloudevents+json; charset=utf-8",
  "application/vnd.metro.event.v1+avro",
  "text/plain",
  "application/x-protobuf",
  "application/octet-stream",
  "Application/XML",
];
const NOT_ALLOWED = ["text/json", "application/x-ndjson", "multipart/mixed", "application/vnd.apache.avro"];
const MALFORMED = ["application json", "application/*", "", "json"];
const CHANNEL_COUNT = 400;

const channels = {};
const operations = {};
const messages = {};
const messageTraits = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const channelId = `${domain}Event${i}`;
  const base = ["channels", channelId, "messages"];
  const publishedType = i % 7 === 0 ? NOT_ALLOWED[i % NOT_ALLOWED.length] : ALLOWED[i % ALLOWED.length];
  const traitType = i % 13 === 0 ? MALFORMED[i % MALFORMED.length] : ALLOWED[(i + 1) % ALLOWED.length];
  const tupleType = i % 17 === 0 ? NOT_ALLOWED[(i + 2) % NOT_ALLOWED.length] : ALLOWED[(i + 3) % ALLOWED.length];
  const receivedType = i % 11 === 0 ? NOT_ALLOWED[(i + 1) % NOT_ALLOWED.length] : ALLOWED[(i + 2) % ALLOWED.length];

  channels[channelId] = {
    address: i % 9 === 0 ? null : `metro.cdc.${domain}.event-${i}.v1`,
    description: `Events of the ${domain} domain, partition group ${i}.`,
    messages: {
      published: {
        name: `${channelId}Published`,
        contentType: publishedType,
        payload: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: "object" } },
        traits: [
          { $ref: "#/components/messageTraits/commonHeaders" },
          { contentType: traitType },
          [{ contentType: tupleType }, { contentType: "not checked" }],
        ],
      },
      received: { name: `${channelId}Received`, contentType: receivedType },
      shared: { $ref: `#/components/messages/shared${i % 5}` },
      untyped: { name: `${channelId}Untyped` },
    },
  };

  operations[`send${channelId}`] = {
    action: "send",
    channel: { $ref: `#/channels/${channelId}` },
    messages: [{ $ref: `#/channels/${channelId}/messages/published` }],
    reply: { messages: [{ $ref: `#/channels/${channelId}/messages/received` }] },
  };

  if (i % 7 === 0) expectedPaths.push([...base, "published", "contentType"].join("."));
  if (i % 13 === 0) expectedPaths.push([...base, "published", "traits", "1", "contentType"].join("."));
  if (i % 17 === 0) expectedPaths.push([...base, "published", "traits", "2", "0", "contentType"].join("."));
  if (i % 11 === 0) expectedPaths.push([...base, "received", "contentType"].join("."));
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, contentType: s === 3 ? "application/jsonl" : "application/json" };
  if (s === 3) expectedPaths.push(["components", "messages", `shared${s}`, "contentType"].join("."));
}

messageTraits.commonHeaders = { contentType: "text/json", headers: { type: "object" } };
expectedPaths.push("components.messageTraits.commonHeaders.contentType");

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Metro Event Backbone",
      version: "5.0.0",
      description: "Generated document with 400 channels, 400 operations and more than 2,000 messages and traits.",
    },
    defaultContentType: "application/json",
    channels,
    operations,
    components: { messages, messageTraits },
  },
  expectedPaths: expectedPaths.sort(),
};
