const DOMAINS = ["sessions", "chargers", "tariffs", "payments", "trips", "drivers", "vehicles", "stations", "invoices", "alerts"];
const SERVERS = ["production", "production-dr", "chargers", "trips"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const operations = {};
const sharedChannels = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const server = (name) => ({ $ref: `#/servers/${name}` });
const complete = (domain, index) => ({
  address: `mobility.cdc.${domain}.event${index}.v1`,
  servers: [server(SERVERS[index % SERVERS.length])],
  messages: { [domain]: message(domain) },
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { address: `mobility.shared.${i}`, messages: { sessions: message("sessions") } };
    expected.push([path, "missing", name]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { ...complete("sessions", i), servers: [server("sessions-legacy")] };
    expected.push([`${path}.servers`, "noServer", name]);
  } else {
    sharedChannels[name] = complete("sessions", i);
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Channel${c}`;
  const path = `channels.${name}`;
  switch (c % 8) {
    case 0:
      channels[name] = {
        ...complete(domain, c),
        address: `${domain}/{id}/events`,
        servers: [server("production"), server("production-dr")],
        parameters: { id: { description: "Identifier.", enum: ["a", "b"], default: "a" } },
        bindings: { kafka: { partitions: 12, bindingVersion: "0.5.0" } },
      };
      operations[`receive${name}`] = { action: "receive", channel: { $ref: `#/channels/${name}` }, messages: [{ $ref: `#/channels/${name}/messages/${domain}` }] };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { address: `mobility.cdc.${domain}.${c}`, messages: { [domain]: message(domain) } };
        expected.push([path, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { ...complete(domain, c), servers: [] };
        expected.push([`${path}.servers`, "noServer", name]);
      } else {
        channels[name] = { ...complete(domain, c), servers: [server(`${domain}-legacy`), server("trips")] };
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        channels[name] = { ...complete(domain, c), address: null, "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { ...complete(domain, c), servers: ["production"] };
        expected.push([`${path}.servers`, "noServer", name]);
      } else {
        channels[name] = { ...complete(domain, c), servers: { $ref: "#/components/x-server-lists/kafka" } };
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
        channels[name] = { ...complete(domain, c), servers: [{ $ref: "#/components/servers/backup" }] };
        expected.push([`${path}.servers`, "noServer", name]);
      } else {
        channels[name] = complete(domain, c);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { ...complete("sessions", i), servers: null };
    expected.push([`components.channels.${name}.servers`, "noServer", name]);
  } else {
    sharedChannels[name] = complete("sessions", i);
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Mobility Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels and 300 components channels." },
    servers: {
      production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      "production-dr": { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      chargers: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
      trips: { host: "rabbit.quality.es:5671", protocol: "amqps", protocolVersion: "0.9.1" },
    },
    channels,
    operations,
    components: {
      servers: { backup: { host: "kafka-backup.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
      channels: sharedChannels,
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { name: domain, payload: { type: "object" } }])),
      "x-server-lists": { kafka: [server("production"), server("production-dr")] },
    },
  },
  expected,
};
