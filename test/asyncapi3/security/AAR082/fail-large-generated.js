const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const PROTOCOLS = [
  ["kafka-secure", ":9093", undefined],
  ["kafka", ":9092", undefined],
  ["secure-mqtt", ":8883", "/telemetry"],
  ["amqps", ":5671", "/events"],
  ["wss", "", "/stream/v1"],
];
const SERVER_COUNT = 600;
const COMPONENT_COUNT = 300;
const CONFIGURED_TYPES = Array.from({ length: 150 }, (_, i) => `${DOMAINS[i % DOMAINS.length]}-cluster-${i}`);

const servers = {};
const componentServers = {};
const expected = [];
const expectedConfigured = [];

for (let i = 0; i < COMPONENT_COUNT; i++) {
  componentServers[`shared${i}`] = { host: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}.` };
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const [protocol, port, pathname] = PROTOCOLS[s % PROTOCOLS.length];
  let name;
  switch (s % 6) {
    case 0:
      name = `${domain}-cluster-${s % 300}`;
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
      : { host: `${domain}-${s}.quality.es${port}`, protocol, ...(pathname ? { pathname } : {}), title: `${domain} server ${s}` };
  expected.push(`servers.${name}`);
  if (!CONFIGURED_TYPES.includes(name)) expectedConfigured.push(`servers.${name}`);
}
servers.eventstreams = { host: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure" };
servers.kafka = { host: "kafka.quality.es:9092", protocol: "kafka" };
expectedConfigured.push("servers.eventstreams", "servers.kafka");

const escape = (name) => name.replace(/~/g, "~0").replace(/\//g, "~1");
const channels = {};
const operations = {};
for (let c = 0; c < 40; c++) {
  const key = `event${c}`;
  channels[key] = {
    address: `retail.cdc.${DOMAINS[c % DOMAINS.length]}.event${c}.v1`,
    servers: Object.keys(servers)
      .slice(c * 10, c * 10 + 10)
      .map((name) => ({ $ref: `#/servers/${escape(name)}` })),
    messages: { [key]: { name: key, payload: { type: "object", properties: { id: { type: "string" } } } } },
  };
  operations[`receive${c}`] = { action: c % 2 === 0 ? "receive" : "send", channel: { $ref: `#/channels/${key}` } };
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Quality Retail Integration Hub",
      version: "10.0.0",
      description: "Generated document with 602 servers, 300 components servers, 40 channels and 40 operations.",
    },
    servers,
    channels,
    operations,
    components: { servers: componentServers },
  },
  expected: expected.sort(),
  configuredTypes: CONFIGURED_TYPES,
  expectedConfigured: expectedConfigured.sort(),
};
