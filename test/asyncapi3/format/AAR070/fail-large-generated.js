const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const PROTOCOLS = ["kafka", "amqp", "mqtt", "ws", "http", "sns", "sqs", "nats", "jms", "solace", "googlepubsub", "pulsar", "ibmmq", "ros2"];
const VALID = ["0.5.0", "0.4.0", "0.3.0", "0.2.0", "0.1.0", "1.0.0"];
const INVALID = ["latest", "0.4", "v0.5.0", "0.5.0-beta", 0.5, "LATEST", "", " 0.3.0"];
const CHANNEL_COUNT = 400;

const servers = {};
const channels = {};
const operations = {};
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
  servers[`broker${s}`] = { host: `broker-${s}.retail.io:9093`, protocol: "kafka-secure", bindings: bindings(s, invalid) };
  if (invalid) expectedPaths.push(at(`servers.broker${s}.bindings`, s));
}

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const channelKey = `${domain}Event${i}`;
  const channelBase = `channels.${channelKey}`;
  const flags = {
    channel: i % 7 === 0,
    message: i % 5 === 0,
    messageTrait: i % 19 === 0,
    send: i % 11 === 0,
    trait: i % 13 === 0,
    receive: i % 17 === 0,
  };

  channels[channelKey] = {
    address: i % 9 === 0 ? null : `retail.cdc.${domain}.event-${i}.v1`,
    description: `Change data capture of ${domain}, partition group ${i}.`,
    bindings: bindings(i, flags.channel),
    messages: {
      changed: {
        name: `${domain}Changed${i}`,
        bindings: bindings(i + 3, flags.message),
        traits: [{ $ref: `#/components/messageTraits/shared${i % 3}` }, [{ bindings: bindings(i + 4, flags.messageTrait) }, { bindings: { kafka: { bindingVersion: "ignored" } } }]],
        payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { type: "object", properties: { bindingVersion: { type: ["string", "null"] } } } },
      },
      replayed: { $ref: `#/components/messages/shared${i % 5}` },
    },
  };

  operations[`publish${domain}${i}`] = {
    action: "send",
    channel: { $ref: `#/channels/${channelKey}` },
    messages: [{ $ref: `#/channels/${channelKey}/messages/changed` }],
    bindings: bindings(i + 1, flags.send),
    traits: [{ $ref: `#/components/operationTraits/shared${i % 4}` }, { bindings: bindings(i + 2, flags.trait) }],
    reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: `#/channels/${channelKey}` } },
  };
  operations[`receive${domain}${i}`] = {
    action: "receive",
    channel: { $ref: `#/channels/${channelKey}` },
    bindings: i % 2 === 0 ? { $ref: "#/components/operationBindings/consumer" } : bindings(i + 5, flags.receive),
  };

  if (flags.channel) expectedPaths.push(at(`${channelBase}.bindings`, i));
  if (flags.message) expectedPaths.push(at(`${channelBase}.messages.changed.bindings`, i + 3));
  if (flags.messageTrait) expectedPaths.push(at(`${channelBase}.messages.changed.traits.1.0.bindings`, i + 4));
  if (flags.send) expectedPaths.push(at(`operations.publish${domain}${i}.bindings`, i + 1));
  if (flags.trait) expectedPaths.push(at(`operations.publish${domain}${i}.traits.1.bindings`, i + 2));
  if (flags.receive && i % 2 !== 0) expectedPaths.push(at(`operations.receive${domain}${i}.bindings`, i + 5));
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, bindings: { kafka: { bindingVersion: s === 2 ? "0.5" : "0.5.0" } } };
}
expectedPaths.push("components.messages.shared2.bindings.kafka.bindingVersion");

const messageTraits = {};
for (let t = 0; t < 3; t++) {
  messageTraits[`shared${t}`] = { bindings: { kafka: { bindingVersion: t === 1 ? "v0.5.0" : "0.5.0" } } };
}
expectedPaths.push("components.messageTraits.shared1.bindings.kafka.bindingVersion");

for (let t = 0; t < 4; t++) {
  operationTraits[`shared${t}`] = { bindings: { kafka: { bindingVersion: t === 3 ? "latest" : "0.5.0" } } };
}
expectedPaths.push("components.operationTraits.shared3.bindings.kafka.bindingVersion");

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Retail Change Data Capture",
      version: "8.0.0",
      description: "Generated document with 20 servers, 400 channels, 800 operations and more than 3,000 bindings objects.",
    },
    servers,
    channels,
    operations,
    components: {
      messages,
      messageTraits,
      operationTraits,
      operationBindings: { consumer: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" }, amqp: { bindingVersion: "latest" } } },
    },
  },
  expectedPaths: [...expectedPaths, "components.operationBindings.consumer.amqp.bindingVersion"].sort(),
};
