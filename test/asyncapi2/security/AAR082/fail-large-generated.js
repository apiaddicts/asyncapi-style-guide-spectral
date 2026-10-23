const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const PROTOCOLS = [
  ["kafka-secure", "", ":9093"],
  ["kafka", "kafka://", ":9092"],
  ["secure-mqtt", "mqtts://", ":8883"],
  ["amqps", "amqps://", ":5671/%2Fevents"],
  ["wss", "wss://", "/stream/v1"],
];
const SERVER_COUNT = 600;
const COMPONENT_COUNT = 300;
const CONFIGURED_TYPES = Array.from({ length: 150 }, (_, i) => `${DOMAINS[i % DOMAINS.length]}-cluster-${i}`);

const servers = {};
const componentServers = {};
const expected = [];
const expectedConfigured = [];

for (let i = 0; i < COMPONENT_COUNT; i++) {
  componentServers[`shared${i}`] = { url: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}.` };
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const [protocol, scheme, suffix] = PROTOCOLS[s % PROTOCOLS.length];
  let name;
  let configuredBase = null;
  switch (s % 6) {
    case 0:
      configuredBase = `${domain}-cluster-${s % 300}`;
      name = s % 12 === 0 ? configuredBase : `${configuredBase}_dr`;
      break;
    case 1:
      name = `${domain}Server${s}`;
      break;
    case 2:
      name = `kafka-${domain}-${s}`;
      break;
    case 3:
      name = `${domain}.eventstreams.${s}`;
      break;
    case 4:
      name = `x-${domain}-${s}`;
      break;
    default:
      name = `${domain.toUpperCase()}_${s}`;
  }
  servers[name] =
    s % 4 === 3
      ? { $ref: `#/components/servers/shared${s % COMPONENT_COUNT}` }
      : { url: `${scheme}${domain}-${s}.quality.es${suffix}`, protocol, description: `${domain} server ${s}.` };
  if (s % 6 !== 2) expected.push(`servers.${name}`);
  if (!CONFIGURED_TYPES.includes(configuredBase)) expectedConfigured.push(`servers.${name}`);
}
servers.eventstreams = { url: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure" };
servers.kafka = { url: "kafka.quality.es:9092", protocol: "kafka" };
expectedConfigured.push("servers.eventstreams", "servers.kafka");

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Quality Retail Integration Hub",
      version: "9.0.0",
      description: "Generated document with 602 servers, 300 components servers and 40 channels.",
    },
    servers,
    channels: Object.fromEntries(
      Array.from({ length: 40 }, (_, c) => [
        `retail.cdc.${DOMAINS[c % DOMAINS.length]}.event${c}.v1`,
        {
          servers: Object.keys(servers).slice(c * 10, c * 10 + 10),
          subscribe: { operationId: `receiveEvent${c}`, message: { name: `event${c}`, payload: { type: "object", properties: { id: { type: "string" } } } } },
        },
      ])
    ),
    components: { servers: componentServers },
  },
  expected: expected.sort(),
  configuredTypes: CONFIGURED_TYPES,
  expectedConfigured: expectedConfigured.sort(),
};
