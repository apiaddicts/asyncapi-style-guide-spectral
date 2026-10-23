const { notAllowed, notString, ALLOWED_PROTOCOLS } = require("../../../helpers/rules/aar084-server-protocol-valid-values");

const PLANTS = ["press", "paint", "assembly", "welding", "logistics", "quality", "energy", "maintenance", "molding", "packaging"];
const BAD_PROTOCOLS = ["kafka-ssl", "SASL_SSL", "KAFKA", "mqtts", "rabbitmq", "socket.io", "modbus-tcp", "opc.tcp", "ibm_mq", "rediss", "jetstream", "mqtt\t", "Kafka-Secure", "amqp091", "${PROTOCOL}", "   "];
const SERVER_COUNT = 1000;
const SHARED_COUNT = 80;
const ARCHIVE_COUNT = 240;

const servers = {};
const sharedServers = {};
const channels = {};
const operations = {};
const expected = [];
const expect = (path, server, protocol) => expected.push([path, notAllowed(server, protocol)]);

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 6 === 1;
  const protocol = bad ? BAD_PROTOCOLS[i % BAD_PROTOCOLS.length] : ALLOWED_PROTOCOLS[i % ALLOWED_PROTOCOLS.length];
  sharedServers[`shared${i}`] = { host: `shared-${i}.quality.es:9093`, protocol, description: `Shared broker ${i}.` };
  if (bad) expect(`components.servers.shared${i}.protocol`, `shared${i}`, protocol);
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const plant = PLANTS[s % PLANTS.length];
  const name = s % 50 === 49 ? `x-${plant}-edge-${s}` : `${plant}Server${s}`;
  const path = `servers.${name}.protocol`;
  switch (s % 6) {
    case 0: {
      const bad = s % 4 === 0;
      const protocol = bad ? BAD_PROTOCOLS[Math.floor(s / 24) % BAD_PROTOCOLS.length] : ALLOWED_PROTOCOLS[s % ALLOWED_PROTOCOLS.length];
      servers[name] = { host: `${plant}-${s}.quality.es:9093`, pathname: `/${plant}`, protocol, protocolVersion: "1.0.0" };
      if (bad) expect(path, name, protocol);
      break;
    }
    case 1:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 2: {
      const nonString = s % 10 === 2;
      servers[name] = { host: `${plant}-${s}.quality.es:1883`, protocol: nonString ? { name: "mqtt" } : "mqtt", "x-protocol": "mqtts" };
      if (nonString) expected.push([path, notString(name)]);
      break;
    }
    case 3: {
      const bad = s % 9 === 3;
      servers[name] = {
        host: `${plant}-${s}.quality.es:{port}`,
        protocol: bad ? "{protocol}" : "kafka-secure",
        variables: { protocol: { enum: ["kafka", "kafka-secure"], default: "kafka-secure" }, port: { enum: ["9092", "9093"], default: "9093" } },
      };
      if (bad) expect(path, name, "{protocol}");
      break;
    }
    case 4:
      servers[name] = s % 8 === 4 ? { host: `${plant}-${s}.quality.es` } : { host: `${plant}-${s}.quality.es`, protocol: null };
      break;
    default: {
      const bad = s % 15 === 5;
      const protocol = bad ? `${ALLOWED_PROTOCOLS[s % ALLOWED_PROTOCOLS.length]}s` : ALLOWED_PROTOCOLS[(s + 5) % ALLOWED_PROTOCOLS.length];
      servers[name] = { host: `${plant}-${s}.quality.es`, protocol, bindings: { kafka: { "x-protocol": "SASL_SSL", bindingVersion: "0.5.0" } } };
      if (bad && !ALLOWED_PROTOCOLS.includes(protocol)) expect(path, name, protocol);
    }
  }
  if (s % 25 === 0) {
    channels[`${plant}${s}`] = { address: s % 50 === 0 ? null : `plant.cdc.${plant}.events.v${s}`, servers: [{ $ref: `#/servers/${name}` }] };
    operations[`receive${plant}${s}`] = { action: s % 2 === 0 ? "receive" : "send", channel: { $ref: `#/channels/${plant}${s}` } };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const bad = i % 11 === 6;
  const protocol = bad ? "pulsar+ssl" : "pulsar";
  sharedServers[`archive${i}`] = { host: `archive-${i}.quality.es:6651`, protocol };
  if (bad) expect(`components.servers.archive${i}.protocol`, `archive${i}`, protocol);
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Quality Manufacturing Integration Backbone",
      version: "9.0.0",
      description: "Generated document with 1000 servers, 320 components servers, channels and operations.",
    },
    servers,
    channels,
    operations,
    components: { servers: sharedServers },
  },
  expected: expected.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
};
