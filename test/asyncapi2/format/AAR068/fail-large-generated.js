const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const VALID = ["kafka", "amqp", "mqtt", "ws", "http", "sns", "sqs", "nats", "jms", "solace", "googlepubsub", "pulsar", "ibmmq", "redis"];
const INVALID = ["kafak", "rabbitmq", "Kafka", "websocket", "kafka-ssl", "bindingVersion", "mqtts", "grpc"];
const CHANNEL_COUNT = 500;

const servers = {};
const channels = {};
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
  servers[`broker${s}`] = { url: `broker-${s}.retail.io:9093`, protocol: "kafka-secure", bindings: bindings(VALID[s % VALID.length], invalid) };
  if (invalid !== undefined) expectedPaths.push(`servers.broker${s}.bindings.${invalid}`);
}

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const name = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${name}`;
  const channelInvalid = i % 7 === 0 ? INVALID[i % INVALID.length] : undefined;
  const publishInvalid = i % 11 === 0 ? INVALID[(i + 1) % INVALID.length] : undefined;
  const traitInvalid = i % 13 === 0 ? INVALID[(i + 2) % INVALID.length] : undefined;
  const messageInvalid = i % 5 === 0 ? INVALID[(i + 3) % INVALID.length] : undefined;
  const oneOfInvalid = i % 17 === 0 ? INVALID[(i + 4) % INVALID.length] : undefined;
  const messageTraitInvalid = i % 19 === 0 ? INVALID[(i + 5) % INVALID.length] : undefined;

  channels[name] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    bindings: bindings(VALID[i % VALID.length], channelInvalid),
    publish: {
      operationId: `publish${domain}${i}`,
      bindings: bindings(VALID[(i + 1) % VALID.length], publishInvalid),
      traits: [{ $ref: `#/components/operationTraits/shared${i % 4}` }, { bindings: bindings(VALID[(i + 2) % VALID.length], traitInvalid) }],
      message: {
        name: `${domain}Changed${i}`,
        bindings: bindings(VALID[(i + 3) % VALID.length], messageInvalid),
        traits: [[{ bindings: bindings(VALID[(i + 4) % VALID.length], messageTraitInvalid) }, { bindings: { ignored: {} } }]],
        payload: { type: "object", properties: { bindings: { type: "object", properties: { kafak: { type: "string" } } } } },
      },
    },
    subscribe: {
      operationId: `receive${domain}${i}`,
      bindings: { $ref: "#/components/operationBindings/consumer" },
      message: {
        oneOf: [{ $ref: `#/components/messages/shared${i % 5}` }, { name: `${domain}Replayed${i}`, bindings: bindings(VALID[(i + 5) % VALID.length], oneOfInvalid) }],
      },
    },
  };

  if (channelInvalid !== undefined) expectedPaths.push(`${base}.bindings.${channelInvalid}`);
  if (publishInvalid !== undefined) expectedPaths.push(`${base}.publish.bindings.${publishInvalid}`);
  if (traitInvalid !== undefined) expectedPaths.push(`${base}.publish.traits.1.bindings.${traitInvalid}`);
  if (messageInvalid !== undefined) expectedPaths.push(`${base}.publish.message.bindings.${messageInvalid}`);
  if (messageTraitInvalid !== undefined) expectedPaths.push(`${base}.publish.message.traits.0.0.bindings.${messageTraitInvalid}`);
  if (oneOfInvalid !== undefined) expectedPaths.push(`${base}.subscribe.message.oneOf.1.bindings.${oneOfInvalid}`);
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, bindings: s === 2 ? { kafka: {}, confluent: {} } : { kafka: {} } };
}
expectedPaths.push("components.messages.shared2.bindings.confluent");

for (let t = 0; t < 4; t++) {
  operationTraits[`shared${t}`] = { bindings: t === 3 ? { kafka: {}, kafka_streams: {} } : { kafka: {} } };
}
expectedPaths.push("components.operationTraits.shared3.bindings.kafka_streams");

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Retail Change Data Capture",
      version: "7.0.0",
      description: "Generated document with 20 servers, 500 channels, 1,000 operations and more than 3,500 bindings objects.",
    },
    servers,
    channels,
    components: {
      messages,
      operationTraits,
      operationBindings: { consumer: { kafka: { groupId: { type: "string" } }, rabbitmq: {} } },
    },
  },
  expectedPaths: [...expectedPaths, "components.operationBindings.consumer.rabbitmq"].sort(),
};
