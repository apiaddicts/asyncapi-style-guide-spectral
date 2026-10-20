const DOMAINS = ["rides", "drivers", "payments", "vehicles", "zones", "tariffs", "incidents", "ratings", "promotions", "alerts"];
const OPERATION_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const operations = {};
const shared = {};
const expected = [];
const channel = (name) => ({ $ref: `#/channels/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const kafka = (domain, index) => ({ groupId: { type: "string", enum: [`${domain}-group-${index}`] }, bindingVersion: "0.5.0" });
const operation = (domain, index, extra = {}) => ({
  action: index % 2 === 0 ? "send" : "receive",
  channel: channel(domain),
  summary: `Exchange ${domain} event number ${index}.`,
  messages: [{ $ref: `#/channels/${domain}/messages/${domain}` }],
  bindings: { kafka: kafka(domain, index) },
  ...extra,
});

for (const domain of DOMAINS) {
  channels[domain] = { address: `mobility.cdc.${domain}.v1`, messages: { [domain]: { name: domain, payload: { type: "object" } } }, bindings: { kafka: { topic: `mobility.cdc.${domain}.v1` } } };
}

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.operations.${name}`;
  if (i % 5 === 1) {
    shared[name] = { action: "send", channel: channel("rides") };
    expected.push([path, "missing", name]);
  } else if (i % 5 === 3) {
    shared[name] = operation("rides", i, { bindings: { amqp: { ack: true } } });
    expected.push([`${path}.bindings`, "missing", name]);
  } else {
    shared[name] = operation("rides", i);
  }
}

for (let c = 0; c < OPERATION_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Operation${c}`;
  const path = `operations.${name}`;
  switch (c % 9) {
    case 0:
      operations[name] = operation(domain, c, { reply: { address: { location: "$message.header#/replyTo" }, channel: channel(domain) } });
      break;
    case 1:
      operations[name] = { $ref: `#/components/operations/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        operations[name] = { action: "receive", channel: channel(domain), summary: `Receive ${domain}.` };
        expected.push([path, "missing", name]);
      } else {
        operations[name] = operation(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        operations[name] = operation(domain, c, { bindings: { kafka: null } });
        expected.push([`${path}.bindings.kafka`, "invalid", name]);
      } else {
        operations[name] = operation(domain, c, { bindings: { $ref: "#/components/operationBindings/consumer" } });
      }
      break;
    case 4:
      if (c % 16 === 4) {
        operations[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        operations[name] = { ...operation(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        operations[name] = operation(domain, c, { bindings: { mqtt: { qos: 1 } } });
        expected.push([`${path}.bindings`, "missing", name]);
      } else {
        operations[name] = operation(domain, c, { traits: [trait("kafka")] });
      }
      break;
    case 6:
      if (c % 12 === 6) {
        operations[name] = { $ref: `#/components/operations/retired${c}` };
        expected.push([path, "unusable", name]);
      } else {
        operations[name] = { $ref: `./partners/${domain}.yaml#/operations/events` };
      }
      break;
    case 7:
      if (c % 14 === 7) {
        operations[name] = { action: "receive", channel: channel(domain), traits: [trait("nullKafka")] };
        expected.push(["components.operationTraits.nullKafka.bindings.kafka", "invalid", name]);
      } else {
        operations[name] = { action: "receive", channel: channel(domain), bindings: { kafka: { clientId: { type: "string" } } }, traits: [trait("described"), trait("nullKafka")] };
      }
      break;
    default:
      operations[name] = { action: "send", channel: channel(domain), traits: [trait("described"), trait("kafka")] };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    shared[name] = operation("rides", i, { bindings: { kafka: "archive" } });
    expected.push([`components.operations.${name}.bindings.kafka`, "invalid", name]);
  } else {
    shared[name] = operation("rides", i);
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Mobility Platform Backbone", version: "9.0.0", description: "Generated document with 900 operations and 300 components operations." },
    servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    operations,
    components: {
      operations: shared,
      operationBindings: { consumer: { kafka: { groupId: { type: "string" } } } },
      operationTraits: {
        nullKafka: { bindings: { kafka: null } },
        kafka: { bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" } } },
        described: { summary: "Process mobility events." },
      },
    },
  },
  expected,
};
