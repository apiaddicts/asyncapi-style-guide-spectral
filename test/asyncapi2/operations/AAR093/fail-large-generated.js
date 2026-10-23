const DOMAINS = ["orders", "payments", "shipments", "invoices", "returns", "stock", "prices", "customers", "stores", "alerts"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const sharedChannels = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const kafka = (domain, index) => ({ groupId: { type: "string", enum: [`${domain}-group-${index}`] }, bindingVersion: "0.5.0" });
const operation = (domain, index, extra = {}) => ({ operationId: `${domain}Operation${index}`, summary: `Exchange ${domain} event number ${index}.`, message: message(domain), bindings: { kafka: kafka(domain, index) }, ...extra });

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { description: `Shared ${i}.`, publish: { operationId: `publishShared${i}`, message: message("orders") } };
    expected.push([`${path}.publish`, "missing", name, "publish"]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { description: `Shared ${i}.`, subscribe: operation("orders", i, { bindings: { amqp: { ack: true } } }) };
    expected.push([`${path}.subscribe.bindings`, "missing", name, "subscribe"]);
  } else {
    sharedChannels[name] = { description: `Shared ${i}.`, subscribe: operation("orders", i) };
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-retail.cdc.${domain}.edge${c}.v1` : `retail.cdc.${domain}.event${c}.v1`;
  const path = `channels.${name}`;
  switch (c % 9) {
    case 0:
      channels[name] = { description: `Events of ${domain}.`, bindings: { kafka: { topic: name, partitions: 6 } }, publish: operation(domain, c), subscribe: operation(domain, c, { bindings: { kafka: {} } }) };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { description: `Events of ${domain}.`, bindings: { kafka: {} }, subscribe: { operationId: `receive${c}`, message: message(domain) } };
        expected.push([`${path}.subscribe`, "missing", name, "subscribe"]);
      } else {
        channels[name] = { description: `Events of ${domain}.`, subscribe: operation(domain, c) };
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { description: `Events of ${domain}.`, publish: operation(domain, c, { bindings: { kafka: null } }) };
        expected.push([`${path}.publish.bindings.kafka`, "invalid", name, "publish"]);
      } else {
        channels[name] = { description: `Events of ${domain}.`, publish: operation(domain, c, { bindings: { $ref: "#/components/operationBindings/consumer" } }) };
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = { description: `Events of ${domain}.`, subscribe: null };
        expected.push([`${path}.subscribe`, "unusable", name, "subscribe"]);
      } else {
        channels[name] = { description: `Events of ${domain}.`, subscribe: { ...operation(domain, c), "x-team": domain } };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { description: `Events of ${domain}.`, publish: { operationId: `publish${c}`, bindings: { mqtt: { qos: 1 } } }, subscribe: {} };
        expected.push([`${path}.publish.bindings`, "missing", name, "publish"], [`${path}.subscribe`, "missing", name, "subscribe"]);
      } else {
        channels[name] = { description: `Events of ${domain}.`, publish: operation(domain, c), subscribe: operation(domain, c) };
      }
      break;
    case 6:
      if (c % 12 === 6) {
        channels[name] = { $ref: `#/components/channels/retired${c}` };
      } else {
        channels[name] = { $ref: `./partners/${domain}.yaml#/channels/events` };
      }
      break;
    case 7:
      if (c % 14 === 7) {
        channels[name] = { description: `Events of ${domain}.`, subscribe: { operationId: `receive${c}`, message: message(domain), traits: [trait("nullKafka")] } };
        expected.push(["components.operationTraits.nullKafka.bindings.kafka", "invalid", name, "subscribe"]);
      } else {
        channels[name] = { description: `Events of ${domain}.`, subscribe: { operationId: `receive${c}`, message: message(domain), bindings: { amqp: {} }, traits: [trait("described"), trait("kafka")] } };
      }
      break;
    default:
      channels[name] = { description: `Events of ${domain}.` };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { description: `Archive ${i}.`, publish: operation("orders", i, { bindings: { kafka: "archive" } }) };
    expected.push([`components.channels.${name}.publish.bindings.kafka`, "invalid", name, "publish"]);
  } else {
    sharedChannels[name] = { description: `Archive ${i}.`, publish: operation("orders", i) };
  }
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Quality Retail Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels and 300 components channels." },
    servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    components: {
      channels: sharedChannels,
      operationBindings: { consumer: { kafka: { groupId: { type: "string" } } } },
      operationTraits: {
        nullKafka: { bindings: { kafka: null } },
        kafka: { bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" } } },
        described: { summary: "Process retail events." },
      },
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { messageId: domain, payload: { type: "object" } }])),
    },
  },
  expected,
};
