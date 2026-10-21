const OPERATORS = ["iberdrola", "endesa", "naturgy", "edp", "repsol", "holaluz", "octopus", "totalenergies", "cepsa", "acciona"];
const BAD_NAMES = [
  (o, s) => `${o}.kafka.${s}`,
  (o, s) => `${o} kafka ${s}`,
  (o, s) => `${o}/kafka/${s}`,
  (o, s) => `${o}:${s}`,
  (o, s) => `${o}~1${s}`,
  (o, s) => `${o}~0${s}`,
  (o, s) => `${o}-kafka-${s}.quality.es`,
  (o, s) => `${o}${String.fromCharCode(0xf3)}${s}`,
];
const SERVER_COUNT = 1000;

const servers = {};
const channels = {};
const expected = [];

for (let s = 0; s < SERVER_COUNT; s++) {
  const operator = OPERATORS[s % OPERATORS.length];
  const bad = s % 7 === 3;
  const name = bad ? BAD_NAMES[Math.floor(s / 7) % BAD_NAMES.length](operator, s) : [`${operator}Kafka${s}`, `${operator}-kafka-${s}`, `${operator}_kafka_${s}`, `${operator.toUpperCase()}${s}`][s % 4];
  switch (s % 5) {
    case 0:
      servers[name] = { host: `${operator}-${s}.quality.es:9093`, protocol: "kafka-secure", description: `${operator} cluster ${s}.` };
      break;
    case 1:
      servers[name] = { $ref: "#/components/servers/shared" };
      break;
    case 2:
      servers[name] = { host: "{env}.quality.es", pathname: "/{env}", protocol: "kafka", variables: { env: { enum: ["pre", "pro"] } } };
      break;
    case 3:
      servers[name] = null;
      break;
    default:
      servers[name] = { host: `${operator}.partner.example.org:8883`, protocol: "secure-mqtt" };
  }
  if (bad) expected.push(`servers.${name}`);
  if (s % 25 === 0 && !bad) {
    channels[`${operator}Channel${s}`] = { address: `grid.cdc.${operator}.event-${s}.v1`, servers: [{ $ref: `#/servers/${name}` }] };
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Grid Operators Hub", version: "9.0.0", description: "Generated document with 1000 servers." },
    servers,
    channels,
    components: { servers: { shared: { host: "kafka-shared.quality.es:9093", protocol: "kafka-secure" }, "shared.copy": { host: "copy.quality.es", protocol: "kafka" } } },
  },
  expected: expected.sort(),
};
