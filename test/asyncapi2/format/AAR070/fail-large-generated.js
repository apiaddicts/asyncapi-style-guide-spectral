const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const PROTOCOLS = ["kafka", "amqp", "mqtt", "ws", "http", "sns", "sqs", "nats", "jms", "solace", "googlepubsub", "pulsar", "ibmmq", "redis"];
const VALID = ["0.5.0", "0.4.0", "0.3.0", "0.2.0", "0.1.0", "1.0.0"];
const INVALID = ["latest", "0.4", "v0.5.0", "0.5.0-beta", 0.5, "LATEST", "", " 0.3.0"];
const CHANNEL_COUNT = 500;

const servers = {};
const channels = {};
const messages = {};
const operationTraits = {};
const expectedPaths = [];

const version = (index, invalid) => (invalid ? INVALID[index % INVALID.length] : VALID[index % VALID.length]);
const bindings = (index, invalid) => ({
  [PROTOCOLS[index % PROTOCOLS.length]]: { bindingVersion: version(index, invalid) },
  [PROTOCOLS[(index + 1) % PROTOCOLS.length]]: { bindingVersion: VALID[(index + 1) % VALID.length] },
  "x-owner": { team: "platform", bindingVersion: "latest" },
});
const at = (base, index) => `${base}.${PROTOCOLS[index % PROTOCOLS.length]}.bindingVersion`;

for (let s = 0; s < 20; s++) {
  const invalid = s % 6 === 0;
  servers[`broker${s}`] = { url: `broker-${s}.retail.io:9093`, protocol: "kafka-secure", bindings: bindings(s, invalid) };
  if (invalid) expectedPaths.push(at(`servers.broker${s}.bindings`, s));
}

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const name = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${name}`;
  const flags = {
    channel: i % 7 === 0,
    publish: i % 11 === 0,
    trait: i % 13 === 0,
    message: i % 5 === 0,
    messageTrait: i % 19 === 0,
    oneOf: i % 17 === 0,
  };

  channels[name] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    bindings: bindings(i, flags.channel),
    publish: {
      operationId: `publish${domain}${i}`,
      bindings: bindings(i + 1, flags.publish),
      traits: [{ $ref: `#/components/operationTraits/shared${i % 4}` }, { bindings: bindings(i + 2, flags.trait) }],
      message: {
        name: `${domain}Changed${i}`,
        bindings: bindings(i + 3, flags.message),
        traits: [[{ bindings: bindings(i + 4, flags.messageTrait) }, { bindings: { kafka: { bindingVersion: "ignored" } } }]],
        payload: { type: "object", properties: { bindingVersion: { type: "string", default: "latest" } } },
      },
    },
    subscribe: {
      operationId: `receive${domain}${i}`,
      bindings: { $ref: "#/components/operationBindings/consumer" },
      message: {
        oneOf: [{ $ref: `#/components/messages/shared${i % 5}` }, { name: `${domain}Replayed${i}`, bindings: bindings(i + 5, flags.oneOf) }],
      },
    },
  };

  if (flags.channel) expectedPaths.push(at(`${base}.bindings`, i));
  if (flags.publish) expectedPaths.push(at(`${base}.publish.bindings`, i + 1));
  if (flags.trait) expectedPaths.push(at(`${base}.publish.traits.1.bindings`, i + 2));
  if (flags.message) expectedPaths.push(at(`${base}.publish.message.bindings`, i + 3));
  if (flags.messageTrait) expectedPaths.push(at(`${base}.publish.message.traits.0.0.bindings`, i + 4));
  if (flags.oneOf) expectedPaths.push(at(`${base}.subscribe.message.oneOf.1.bindings`, i + 5));
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, bindings: { kafka: { bindingVersion: s === 2 ? "0.5" : "0.5.0" } } };
}
expectedPaths.push("components.messages.shared2.bindings.kafka.bindingVersion");

for (let t = 0; t < 4; t++) {
  operationTraits[`shared${t}`] = { bindings: { kafka: { bindingVersion: t === 3 ? "latest" : "0.5.0" } } };
}
expectedPaths.push("components.operationTraits.shared3.bindings.kafka.bindingVersion");

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
      operationBindings: { consumer: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" }, amqp: { bindingVersion: "latest" } } },
    },
  },
  expectedPaths: [...expectedPaths, "components.operationBindings.consumer.amqp.bindingVersion"].sort(),
};
