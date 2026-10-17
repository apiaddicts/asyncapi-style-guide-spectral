const DOMAINS = ["sessions", "chargers", "tariffs", "payments", "trips", "drivers", "vehicles", "stations", "invoices", "alerts"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const operations = {};
const sharedChannels = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const complete = (domain, index) => ({
  address: `mobility.cdc.${domain}.event${index}.v1`,
  description: `Events of ${domain} number ${index}.`,
  messages: { [domain]: message(domain) },
  bindings: { kafka: { topic: `mobility.cdc.${domain}.event${index}.v1`, partitions: 12, replicas: 3, bindingVersion: "0.5.0" } },
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { address: `mobility.cdc.shared${i}.v1`, messages: { sessions: message("sessions") } };
    expected.push([path, "missing", name]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { ...complete("sessions", i), bindings: { kafka: [] } };
    expected.push([`${path}.bindings.kafka`, "invalid", name]);
  } else {
    sharedChannels[name] = complete("sessions", i);
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Event${c}`;
  const path = `channels.${name}`;
  operations[`receive${name}`] = { action: c % 2 === 0 ? "receive" : "send", channel: { $ref: `#/channels/${name}` }, bindings: { kafka: { groupId: { type: "string" } } } };
  switch (c % 8) {
    case 0:
      channels[name] = { ...complete(domain, c), parameters: { region: { enum: ["eu", "us"] } }, bindings: { kafka: {}, ws: { method: "GET" } } };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { address: `mobility.cdc.${domain}.event${c}.v1`, messages: { [domain]: { ...message(domain) } } };
        expected.push([path, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { ...complete(domain, c), address: null, bindings: { kafka: "on" } };
        expected.push([`${path}.bindings.kafka`, "invalid", name]);
      } else {
        channels[name] = { ...complete(domain, c), bindings: { $ref: "#/components/channelBindings/kafkaDefaults" } };
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = "mobility.cdc.placeholder";
        expected.push([path, "unusable", name]);
      } else {
        channels[name] = { ...complete(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { ...complete(domain, c), bindings: { $ref: "#/components/channelBindings/mqttOnly" } };
        expected.push([`${path}.bindings`, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 6:
      if (c % 12 === 6) {
        channels[name] = { $ref: `#/components/channels/retired${c}` };
        expected.push([path, "unusable", name]);
      } else {
        channels[name] = { $ref: `./partners/${domain}.yaml#/channels/events` };
      }
      break;
    default:
      if (c % 14 === 7) {
        channels[name] = { ...complete(domain, c), bindings: { Kafka: {} } };
        expected.push([`${path}.bindings`, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { ...complete("trips", i), bindings: null };
    expected.push([`components.channels.${name}.bindings`, "missing", name]);
  } else if (i % 11 === 9) {
    sharedChannels[name] = { ...complete("trips", i), bindings: { kafka: { $ref: "#/components/x-kafka-bindings/retired" } } };
    expected.push([`components.channels.${name}.bindings.kafka`, "invalid", name]);
  } else {
    sharedChannels[name] = complete("trips", i);
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Mobility Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels, 900 operations and 300 components channels." },
    servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    operations,
    components: {
      channels: sharedChannels,
      channelBindings: { kafkaDefaults: { kafka: { partitions: 12, replicas: 3, bindingVersion: "0.5.0" } }, mqttOnly: { mqtt: {} } },
      "x-kafka-bindings": { defaults: { partitions: 3 } },
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { name: domain, payload: { type: "object" } }])),
    },
  },
  expected,
};
