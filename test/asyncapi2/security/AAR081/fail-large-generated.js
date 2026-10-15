const MARKETS = ["omie", "epex", "nordpool", "mibgas", "ree", "rte", "terna", "tennet", "elia", "apg"];
const BAD_NAMES = [
  (m, s) => `${m}.kafka.${s}`,
  (m, s) => `${m} kafka ${s}`,
  (m, s) => `${m}/kafka/${s}`,
  (m, s) => `${m}:${s}`,
  (m, s) => `${m}@${s}`,
  (m, s) => `${m}~${s}`,
  (m, s) => `${m}-kafka-${s}.quality.es`,
  (m, s) => `${m}${String.fromCharCode(0xf1)}${s}`,
];
const SERVER_COUNT = 1000;

const servers = {};
const expected = [];

for (let s = 0; s < SERVER_COUNT; s++) {
  const market = MARKETS[s % MARKETS.length];
  const bad = s % 7 === 3;
  const name = bad ? BAD_NAMES[Math.floor(s / 7) % BAD_NAMES.length](market, s) : [`${market}Kafka${s}`, `${market}-kafka-${s}`, `${market}_kafka_${s}`, `${market.toUpperCase()}${s}`][s % 4];
  switch (s % 5) {
    case 0:
      servers[name] = { url: `kafka-secure://${market}-${s}.quality.es:9093`, protocol: "kafka-secure", description: `${market} cluster ${s}.` };
      break;
    case 1:
      servers[name] = { $ref: "#/components/servers/shared" };
      break;
    case 2:
      servers[name] = { url: "{env}.quality.es", protocol: "kafka", variables: { env: { enum: ["pre", "pro"] } } };
      break;
    case 3:
      servers[name] = null;
      break;
    default:
      servers[name] = { url: `mqtts://${market}.partner.example.org:8883`, protocol: "secure-mqtt" };
  }
  if (bad) expected.push(`servers.${name}`);
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Quality Energy Markets Hub", version: "9.0.0", description: "Generated document with 1000 servers." },
    servers,
    channels: {
      "energy.cdc.prices.published.v1": {
        servers: Object.keys(servers).slice(0, 50),
        subscribe: { operationId: "receivePrice", message: { payload: { type: "object" } } },
      },
    },
    components: { servers: { shared: { url: "kafka-shared.quality.es:9093", protocol: "kafka-secure" }, "shared.copy": { url: "copy.quality.es", protocol: "kafka" } } },
  },
  expected: expected.sort(),
};
