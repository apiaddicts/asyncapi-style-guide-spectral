const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 500;
const SERVER_COUNT = 20;

const servers = {};
const channels = {};
const messages = {};
const operationTraits = {};
const expected = [];

const finding = (path, kind, protocol, field) => expected.push(`${path} :: AAR069: ${kind} binding '${protocol}' must declare '${field}'.`);

for (let s = 0; s < SERVER_COUNT; s++) {
  const jms = { properties: [{ name: "clientID", value: `broker-${s}` }] };
  if (s % 6 !== 0) jms.jmsConnectionFactory = "org.apache.activemq.ActiveMQConnectionFactory";
  servers[`broker${s}`] = { url: `tcp://broker-${s}.retail.io:61616`, protocol: "jms", bindings: { jms, "x-owner": { team: "platform" } } };
  if (s % 6 === 0) finding(`servers.broker${s}.bindings.jms`, "Server", "jms", "jmsConnectionFactory");
}

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const name = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${name}`;

  channels[name] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    bindings: {
      pulsar: i % 7 === 0 ? { namespace: domain } : { namespace: domain, persistence: "persistent" },
      sqs: { queue: i % 11 === 0 ? { name: `q-${i}` } : { name: `q-${i}`, fifoQueue: i % 2 === 0 } },
      kafka: { topic: name, partitions: 6 },
    },
    publish: {
      operationId: `publish${domain}${i}`,
      bindings: {
        sns: {
          consumers: [
            { protocol: "sqs", endpoint: { name: `q-${i}` }, rawMessageDelivery: false },
            i % 13 === 0 ? { protocol: "lambda", endpoint: { arn: `arn:aws:lambda:eu-west-1:1:function:f${i}` } } : { protocol: "sqs", endpoint: { name: `q-${i}-b` }, rawMessageDelivery: true },
          ],
        },
      },
      traits: [{ $ref: `#/components/operationTraits/shared${i % 4}` }, { bindings: { ros2: i % 17 === 0 ? { qosPolicies: { history: "keep_last" } } : { node: `/retail/n${i}` } } }],
      message: {
        name: `${domain}Changed${i}`,
        bindings: { googlepubsub: i % 5 === 0 ? { schema: {} } : { schema: { name: `projects/retail/schemas/${domain}` } } },
        payload: { type: "object", properties: { bindings: { type: "object", properties: { googlepubsub: { type: "string" } } } } },
      },
    },
    subscribe: {
      operationId: `receive${domain}${i}`,
      bindings: { sqs: { queues: [{ name: `q-${i}` }, i % 19 === 0 ? { fifoQueue: true } : { name: `q-${i}-b` }] } },
      message: {
        oneOf: [{ $ref: `#/components/messages/shared${i % 5}` }, { name: `${domain}Replayed${i}`, bindings: { googlepubsub: { schema: { name: i % 23 === 0 ? "" : "replay" } } } }],
      },
    },
  };

  if (i % 7 === 0) finding(`${base}.bindings.pulsar`, "Channel", "pulsar", "persistence");
  if (i % 11 === 0) finding(`${base}.bindings.sqs.queue`, "Channel", "sqs", "queue.fifoQueue");
  if (i % 13 === 0) finding(`${base}.publish.bindings.sns.consumers.1`, "Operation", "sns", "consumers[1].rawMessageDelivery");
  if (i % 17 === 0) finding(`${base}.publish.traits.0`, "Operation", "ros2", "node");
  if (i % 5 === 0) finding(`${base}.publish.message.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name");
  if (i % 19 === 0) finding(`${base}.subscribe.bindings.sqs.queues.1`, "Operation", "sqs", "queues[1].name");
  if (i % 23 === 0) finding(`${base}.subscribe.message.oneOf.1.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name");
}

for (let s = 0; s < 5; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, bindings: { googlepubsub: s === 2 ? { schema: {} } : { schema: { name: `projects/retail/schemas/shared${s}` } } } };
}
finding("components.messages.shared2.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name");

for (let t = 0; t < 4; t++) {
  operationTraits[`shared${t}`] = { bindings: { ros2: { role: "publisher" } } };
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Retail Change Data Capture",
      version: "7.0.0",
      description: "Generated document with 20 servers, 500 channels, 1,000 operations and more than 4,000 bindings objects.",
    },
    servers,
    channels,
    components: { messages, operationTraits },
  },
  expected: expected.sort(),
};
