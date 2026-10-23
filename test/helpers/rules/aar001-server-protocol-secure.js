const { Document } = require("@stoplight/spectral-core");
const Parsers = require("@stoplight/spectral-parsers");

const RULE = "asa:AAR001";
const OPTION = "pattern";
const DEFAULT_PATTERN = "^(https|wss|amqps|kafka-secure|secure-mqtt)$";
const DEFAULT_SECURE_PROTOCOLS = ["https", "wss", "amqps", "kafka-secure", "secure-mqtt"];

const SECURE_SERVERS = [
  ["orders-https", "https"],
  ["orders-wss", "wss"],
  ["stock-amqps", "amqps"],
  ["orders-kafka-secure", "kafka-secure"],
  ["store-secure-mqtt", "secure-mqtt"],
];

const INSECURE_SERVERS = [
  ["legacy-http", "http"],
  ["store-ws", "ws"],
  ["store-mqtt", "mqtt"],
  ["stock-amqp", "amqp"],
  ["orders-kafka", "kafka"],
  ["audit-stomp", "stomp"],
  ["audit-stomps", "stomps"],
  ["erp-jms", "jms"],
  ["mainframe-ibmmq", "ibmmq"],
  ["client-kafka-ssl", "kafka-ssl"],
  ["upper-https", "HTTPS"],
  ["padded-https", " https"],
  ["empty-protocol", ""],
];

const NON_STRING_PROTOCOLS = [null, 9093, true, ["https"], { name: "https" }];

const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);

const notSecure = (protocol, source = DEFAULT_PATTERN) => `AAR001: Server protocol '${protocol}' must match '${source}'.`;

const lint = (linter, doc) => linter.run(new Document(JSON.stringify(doc, null, 2), Parsers.Json, "aar001.json"));

const findings = (results) =>
  results
    .filter((r) => r.code === RULE)
    .map((r) => [r.path.join("."), r.message])
    .sort(byPathAndMessage);

const expectedFindings = (regex = new RegExp(DEFAULT_PATTERN), source = DEFAULT_PATTERN) =>
  [...SECURE_SERVERS, ...INSECURE_SERVERS]
    .filter(([, protocol]) => !regex.test(protocol))
    .map(([server, protocol]) => [`servers.${server}.protocol`, notSecure(protocol, source)])
    .sort(byPathAndMessage);

const withVersion = (doc, version) => ({ ...JSON.parse(JSON.stringify(doc)), asyncapi: version });

const serversDoc = (version, servers, extra = {}) => ({
  asyncapi: version,
  info: { title: "Generated Servers Catalog", version: "1.0.0" },
  servers,
  ...(version.startsWith("3.") ? {} : { channels: {} }),
  ...extra,
});

const INSECURE_SAMPLES = ["kafka", "http", "ws", "mqtt", "amqp", "stomp", "stomps", "jms", "ibmmq", "kafka-ssl", "SASL_SSL", "HTTPS", " https", ""];

const largeFleet = (version, address) => {
  const servers = {};
  const sharedServers = {};
  const expected = [];
  const regions = ["eu", "us", "latam", "apac", "mena"];
  const SERVER_COUNT = 1500;
  const SHARED_COUNT = 60;

  for (let i = 0; i < SHARED_COUNT; i++) {
    const insecure = i % 5 === 2;
    const protocol = insecure ? INSECURE_SAMPLES[i % INSECURE_SAMPLES.length] : DEFAULT_SECURE_PROTOCOLS[i % DEFAULT_SECURE_PROTOCOLS.length];
    sharedServers[`shared${i}`] = { ...address(`shared-${i}`), protocol, description: `Shared broker ${i}.` };
    if (insecure) expected.push([`components.servers.shared${i}.protocol`, notSecure(protocol)]);
  }

  for (let s = 0; s < SERVER_COUNT; s++) {
    const region = regions[s % regions.length];
    const name = s % 50 === 49 ? `x-${region}-edge-${s}` : `${region}Broker${s}`;
    const path = `servers.${name}.protocol`;
    switch (s % 6) {
      case 0: {
        const insecure = s % 4 === 0;
        const protocol = insecure ? INSECURE_SAMPLES[Math.floor(s / 24) % INSECURE_SAMPLES.length] : DEFAULT_SECURE_PROTOCOLS[s % DEFAULT_SECURE_PROTOCOLS.length];
        servers[name] = { ...address(`${region}-${s}`), protocol, description: `${region} broker ${s}.` };
        if (insecure) expected.push([path, notSecure(protocol)]);
        break;
      }
      case 1:
        servers[name] = { $ref: `#/components/servers/shared${Math.floor(s / 6) % SHARED_COUNT}` };
        break;
      case 2:
        servers[name] = { ...address(`${region}-${s}`), protocol: s % 12 === 2 ? 1883 : null, "x-protocol": "http" };
        break;
      case 3:
        servers[name] = { ...address(`${region}-${s}`), protocol: "kafka-secure", bindings: { kafka: { protocol: "SASL_PLAINTEXT", bindingVersion: "0.4.0" } } };
        break;
      case 4: {
        const protocol = s % 8 === 4 ? "mqtt" : "secure-mqtt";
        servers[name] = { ...address(`${region}-${s}`), protocol, variables: { protocol: { enum: ["mqtt", "mqtts"], default: "mqtt" } } };
        if (protocol === "mqtt") expected.push([path, notSecure(protocol)]);
        break;
      }
      default:
        servers[name] = s % 12 === 5 ? "kafka" : { ...address(`${region}-${s}`), description: "Protocol left to the schema." };
    }
  }

  const document = {
    asyncapi: version,
    info: { title: "Global Retail Broker Fleet", version: "9.0.0", description: "Every regional broker of the retail platform." },
    servers,
    ...(version.startsWith("3.") ? {} : { channels: {} }),
    components: { servers: sharedServers },
  };
  return { document, expected: expected.sort(byPathAndMessage) };
};

module.exports = {
  RULE,
  OPTION,
  DEFAULT_PATTERN,
  DEFAULT_SECURE_PROTOCOLS,
  SECURE_SERVERS,
  INSECURE_SERVERS,
  NON_STRING_PROTOCOLS,
  notSecure,
  lint,
  findings,
  expectedFindings,
  withVersion,
  serversDoc,
  largeFleet,
};
