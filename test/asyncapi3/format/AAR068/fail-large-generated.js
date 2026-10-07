const DOMAINS = ["vehicles", "stops", "fares", "alerts", "drivers", "depots", "routes", "trips"];
const VALID = ["kafka", "amqp", "mqtt", "ws", "http", "sns", "sqs", "nats", "jms", "solace", "googlepubsub", "pulsar", "ibmmq", "redis", "ros2"];
const INVALID = ["kafak", "rabbitmq", "Kafka", "websocket", "kafka-ssl", "bindingVersion", "mqtts", "grpc"];
const CHANNEL_COUNT = 400;

const servers = {};
const channels = {};
const operations = {};
const messages = {};
const operationTraits = {};
const expectedPaths = [];

const bindings = (valid, invalid) => {
  const result = { [valid]: { bindingVersion: "latest" }, "x-owner": { team: "platform" } };
  if (invalid !== undefined) result[invalid] = {};
  return result;
};

for (let s = 0; s < 20; s++) {
  const invalid = s % 6 === 0 ? INVALID[s % INVALID.length] : undefined;
  servers[`broker${s}`] = { host: `broker-${s}.metro.io:9093`, protocol: "kafka-secure", bindings: bindings(VALID[s % VALID.length], invalid) };
  if (invalid !== undefined) expectedPaths.push(`servers.broker${s}.bindings.${invalid}`);
}

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const channelId = `${domain}Event${i}`;
  const channelInvalid = i % 7 === 0 ? INVALID[i % INVALID.length] : undefined;
  const messageInvalid = i % 5 === 0 ? INVALID[(i + 3) % INVALID.length] : undefined;
  const messageTraitInvalid = i % 13 === 0 ? INVALID[(i + 2) % INVALID.length] : undefined;
  const tupleInvalid = i % 17 === 0 ? INVALID[(i + 4) % INVALID.length] : undefined;
  const operationInvalid = i % 11 === 0 ? INVALID[(i + 1) % INVALID.length] : undefined;
  const operationTraitInvalid = i % 19 === 0 ? INVALID[(i + 5) % INVALID.length] : undefined;

  channels[channelId] = {
    address: i % 9 === 0 ? null : `metro.cdc.${domain}.event-${i}.v1`,
    description: `Events of the ${domain} domain, partition group ${i}.`,
    bindings: bindings(VALID[i % VALID.length], channelInvalid),
    messages: {
      published: {
        name: `${channelId}Published`,
        bindings: bindings(VALID[(i + 1) % VALID.length], messageInvalid),
        payload: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: "object", properties: { bindings: { type: "object" } } } },
        traits: [
          { $ref: "#/components/messageTraits/commonHeaders" },
          { bindings: bindings(VALID[(i + 2) % VALID.length], messageTraitInvalid) },
          [{ bindings: bindings(VALID[(i + 3) % VALID.length], tupleInvalid) }, { bindings: { ignored: {} } }],
        ],
      },
      shared: { $ref: `#/components/messages/shared${i % 5}` },
    },
  };

  operations[`send${channelId}`] = {
    action: "send",
    channel: { $ref: `#/channels/${channelId}` },
    messages: [{ $ref: `#/channels/${channelId}/messages/published` }],
    bindings: bindings(VALID[(i + 4) % VALID.length], operationInvalid),
    traits: [{ $ref: `#/components/operationTraits/shared${i % 4}` }, { bindings: bindings(VALID[(i + 5) % VALID.length], operationTraitInvalid) }],
    reply: { messages: [{ $ref: `#/channels/${channelId}/messages/shared` }] },
  };

  const base = `channels.${channelId}`;
  if (channelInvalid !== undefined) expectedPaths.push(`${base}.bindings.${channelInvalid}`);
  if (messageInvalid !== undefined) expectedPaths.push(`${base}.messages.published.bindings.${messageInvalid}`);
  if (messageTraitInvalid !== undefined) expectedPaths.push(`${base}.messages.published.traits.1.bindings.${messageTraitInvalid}`);
  if (tupleInvalid !== undefined) expectedPaths.push(`${base}.messages.published.traits.2.0.bindings.${tupleInvalid}`);
  if (operationInvalid !== undefined) expectedPaths.push(`operations.send${channelId}.bindings.${operationInvalid}`);
  if (operationTraitInvalid !== undefined) expectedPaths.push(`operations.send${channelId}.traits.1.bindings.${operationTraitInvalid}`);
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, bindings: s === 3 ? { kafka: {}, confluent: {} } : { kafka: {} } };
}
expectedPaths.push("components.messages.shared3.bindings.confluent");

for (let t = 0; t < 4; t++) {
  operationTraits[`shared${t}`] = { bindings: t === 1 ? { kafka: {}, kafka_streams: {} } : { kafka: {} } };
}
expectedPaths.push("components.operationTraits.shared1.bindings.kafka_streams");

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Metro Event Backbone",
      version: "6.0.0",
      description: "Generated document with 20 servers, 400 channels, 400 operations and more than 3,000 bindings objects.",
    },
    servers,
    channels,
    operations,
    components: {
      messages,
      operationTraits,
      messageTraits: { commonHeaders: { bindings: { kafka: {}, rabbitmq: {} } } },
    },
  },
  expectedPaths: [...expectedPaths, "components.messageTraits.commonHeaders.bindings.rabbitmq"].sort(),
};
