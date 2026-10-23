const { notAllowed, notString, ALLOWED_PROTOCOLS } = require("../../../helpers/rules/aar084-server-protocol-valid-values");

const LINES = ["containers", "cranes", "gates", "vessels", "rail", "trucks", "customs", "reefers", "berths", "billing"];
const BAD_PROTOCOLS = ["kafka-ssl", "SASL_SSL", "Kafka", "mqtts", "rabbitmq", "websocket", "tcp", "grpc", "ibm-mq", "eventhubs", "kinesis", " kafka", "kafka-secure ", "AMQPS", "{protocol}", ""];
const SERVER_COUNT = 900;
const SHARED_COUNT = 70;
const ARCHIVE_COUNT = 260;

const servers = {};
const sharedServers = {};
const expected = [];
const expect = (path, server, protocol) => expected.push([path, notAllowed(server, protocol)]);

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 7 === 4;
  const protocol = bad ? BAD_PROTOCOLS[i % BAD_PROTOCOLS.length] : ALLOWED_PROTOCOLS[i % ALLOWED_PROTOCOLS.length];
  sharedServers[`shared${i}`] = { url: `shared-${i}.quality.es:9093`, protocol, description: `Shared broker ${i}.` };
  if (bad) expect(`components.servers.shared${i}.protocol`, `shared${i}`, protocol);
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const line = LINES[s % LINES.length];
  const name = s % 50 === 49 ? `x-${line}-edge-${s}` : `${line}Server${s}`;
  const path = `servers.${name}.protocol`;
  switch (s % 6) {
    case 0: {
      const bad = s % 4 === 0;
      const protocol = bad ? BAD_PROTOCOLS[Math.floor(s / 24) % BAD_PROTOCOLS.length] : ALLOWED_PROTOCOLS[s % ALLOWED_PROTOCOLS.length];
      servers[name] = { url: `${line}-${s}.quality.es:9093`, protocol, protocolVersion: "1.0.0", description: `${line} broker ${s}.` };
      if (bad) expect(path, name, protocol);
      break;
    }
    case 1:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 2: {
      const nonString = s % 10 === 2;
      servers[name] = { url: `${line}-${s}.quality.es:1883`, protocol: nonString ? 1883 : "mqtt", "x-protocol": "mqtts" };
      if (nonString) expected.push([path, notString(name)]);
      break;
    }
    case 3: {
      const bad = s % 9 === 3;
      servers[name] = {
        url: `{scheme}://${line}-${s}.quality.es:{port}`,
        protocol: bad ? "{scheme}" : "kafka-secure",
        variables: { scheme: { enum: ["kafka", "kafka-secure"], default: "kafka-secure" }, port: { enum: ["9092", "9093"], default: "9093" } },
      };
      if (bad) expect(path, name, "{scheme}");
      break;
    }
    case 4:
      servers[name] = s % 8 === 4 ? { url: `${line}-${s}.quality.es`, description: "Protocol left to the schema." } : { url: `${line}-${s}.quality.es`, protocol: null };
      break;
    default: {
      const bad = s % 15 === 5;
      const protocol = bad ? `${ALLOWED_PROTOCOLS[s % ALLOWED_PROTOCOLS.length].toUpperCase()}` : ALLOWED_PROTOCOLS[(s + 3) % ALLOWED_PROTOCOLS.length];
      servers[name] = {
        url: `${line}-${s}.quality.es`,
        protocol,
        bindings: { sns: { consumers: [{ protocol: "email-json" }] }, kafka: { protocol: "SASL_SSL", bindingVersion: "0.4.0" } },
      };
      if (bad) expect(path, name, protocol);
    }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const bad = i % 11 === 6;
  const protocol = bad ? "kafka-ssl" : "kafka";
  sharedServers[`archive${i}`] = { url: `archive-${i}.quality.es:9092`, protocol };
  if (bad) expect(`components.servers.archive${i}.protocol`, `archive${i}`, protocol);
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Quality Port Community System",
      version: "15.0.0",
      description: "Generated document with 900 servers and 330 components servers.",
    },
    servers,
    channels: {
      "ports.cdc.containers.gated-in.v1": {
        servers: Object.keys(servers).slice(0, 40),
        subscribe: { operationId: "receiveContainerGatedIn", message: { payload: { type: "object", properties: { protocol: { type: "string", default: "kafka-ssl" } } } } },
      },
    },
    components: { servers: sharedServers },
  },
  expected: expected.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
};
