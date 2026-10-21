const DOMAINS = ["orders", "payments", "stock", "returns", "invoices", "loyalty", "pricing", "carts", "couriers", "stores"];
const SERVERS = ["production", "production-dr", "warehouse", "sensors"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const sharedChannels = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const complete = (domain, index) => ({
  description: `Events of ${domain} number ${index}.`,
  servers: [SERVERS[index % SERVERS.length]],
  subscribe: { operationId: `receive${domain}${index}`, message: message(domain) },
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { description: `Shared ${i}.`, subscribe: { message: message("orders") } };
    expected.push([path, "missing", name]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { ...complete("orders", i), servers: ["orders-legacy"] };
    expected.push([`${path}.servers`, "noServer", name]);
  } else {
    sharedChannels[name] = complete("orders", i);
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-retail.cdc.${domain}.edge${c}.v1` : `retail.cdc.${domain}.event${c}.v1`;
  const path = `channels.${name}`;
  switch (c % 8) {
    case 0:
      channels[name] = {
        ...complete(domain, c),
        servers: ["production", "production-dr"],
        parameters: { id: { description: "Identifier.", schema: { type: "string" } } },
        bindings: { kafka: { partitions: 12, bindingVersion: "0.4.0" } },
      };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { description: `Events of ${domain}.`, subscribe: { message: message(domain) } };
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
        channels[name] = { ...complete(domain, c), servers: [`${domain}-legacy`, "warehouse"] };
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        channels[name] = { ...complete(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { ...complete(domain, c), servers: [{ $ref: "#/servers/production" }] };
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
        channels[name] = { ...complete(domain, c), servers: ["Production"] };
        expected.push([`${path}.servers`, "noServer", name]);
      } else {
        channels[name] = complete(domain, c);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { ...complete("orders", i), servers: null };
    expected.push([`components.channels.${name}.servers`, "noServer", name]);
  } else {
    sharedChannels[name] = complete("orders", i);
  }
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Quality Retail Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels and 300 components channels." },
    servers: {
      production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      "production-dr": { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      warehouse: { url: "rabbit.quality.es:5671", protocol: "amqps", protocolVersion: "0.9.1" },
      sensors: { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    },
    channels,
    components: {
      channels: sharedChannels,
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { name: domain, payload: { type: "object" } }])),
      "x-server-lists": { kafka: ["production", "production-dr"] },
    },
  },
  expected,
};
