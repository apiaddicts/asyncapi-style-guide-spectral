const DOMAINS = ["orders", "payments", "shipments", "customers", "inventory", "invoices", "returns", "loyalty"];
const ALLOWED = [
  "application/json",
  "application/cloudevents+json; charset=utf-8",
  "application/vnd.retail.event.v1+avro",
  "text/plain",
  "application/x-protobuf",
  "application/octet-stream",
  "APPLICATION/XML",
];
const NOT_ALLOWED = ["text/json", "application/x-ndjson", "multipart/mixed", "application/vnd.apache.avro"];
const MALFORMED = ["application json", "application/*", "", "json"];
const CHANNEL_COUNT = 400;

const channels = {};
const messages = {};
const messageTraits = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const channelKey = `retail.cmd.${domain}.event-${i}.v1`;
  const base = ["channels", channelKey];
  const publishType = i % 7 === 0 ? NOT_ALLOWED[i % NOT_ALLOWED.length] : ALLOWED[i % ALLOWED.length];
  const traitType = i % 13 === 0 ? MALFORMED[i % MALFORMED.length] : ALLOWED[(i + 1) % ALLOWED.length];
  const memberType = i % 11 === 0 ? NOT_ALLOWED[(i + 1) % NOT_ALLOWED.length] : ALLOWED[(i + 2) % ALLOWED.length];

  channels[channelKey] = {
    description: `Events of the ${domain} domain, partition group ${i}.`,
    publish: {
      operationId: `publish${i}`,
      message: {
        messageId: `${domain}Event${i}Published`,
        contentType: publishType,
        payload: { type: "object", properties: { contentType: { type: "string", enum: ["text/json"] } } },
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }, { contentType: traitType }],
      },
    },
    subscribe: {
      operationId: `subscribe${i}`,
      message: {
        oneOf: [
          { messageId: `${domain}Event${i}Received`, contentType: memberType },
          { $ref: `#/components/messages/shared${i % 5}` },
          { messageId: `${domain}Event${i}Untyped` },
        ],
      },
    },
  };

  if (i % 7 === 0) expectedPaths.push([...base, "publish", "message", "contentType"].join("."));
  if (i % 13 === 0) expectedPaths.push([...base, "publish", "message", "traits", "1", "contentType"].join("."));
  if (i % 11 === 0) expectedPaths.push([...base, "subscribe", "message", "oneOf", "0", "contentType"].join("."));
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { messageId: `shared${s}`, contentType: s === 3 ? "application/jsonl" : "application/json" };
  if (s === 3) expectedPaths.push(["components", "messages", `shared${s}`, "contentType"].join("."));
}

messageTraits.commonHeaders = { contentType: "text/json", headers: { type: "object" } };
expectedPaths.push("components.messageTraits.commonHeaders.contentType");

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Retail Event Backbone",
      version: "5.0.0",
      description: "Generated document with 400 channels, 800 operations and more than 1,600 messages and traits.",
    },
    defaultContentType: "application/json",
    channels,
    components: { messages, messageTraits },
  },
  expectedPaths: expectedPaths.sort(),
};
