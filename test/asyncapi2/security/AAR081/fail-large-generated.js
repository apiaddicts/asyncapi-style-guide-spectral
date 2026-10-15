const { mismatch } = require("../../../helpers/rules/aar081-server-host-pattern");

const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const PROTOCOLS = [
  ["kafka-secure", "kafka-secure://", ":9093"],
  ["secure-mqtt", "mqtts://", ":8883"],
  ["amqps", "amqps://", ":5671/%2Fevents"],
  ["wss", "wss://", "/stream/v1"],
  ["kafka", "", ":9092"],
  ["nats", "nats://", ":4222"],
];
const BAD_HOSTS = [
  (s) => `kafka-${s}.partner.example.org`,
  () => "localhost",
  (s) => `10.0.${s % 256}.21`,
  (s) => `eu.broker-${s}.quality.es`,
  (s) => `broker-${s}.QUALITY.ES`,
  (s) => `broker_${s}.quality.es`,
  (s) => `quality.es.cdn-${s}.net`,
];
const SERVER_COUNT = 400;
const SHARED_COUNT = 50;
const CLUSTER_COUNT = 20;
const ARCHIVE_COUNT = 200;

const servers = {};
const sharedServers = {};
const serverVariables = {};
const expected = [];
const expect = (path, server, host) => expected.push([path, mismatch(server, host)]);

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 10 === 3;
  const host = bad ? `shared-${i}.partner.example.org` : `shared-${i}.quality.es`;
  sharedServers[`shared${i}`] = { url: `kafka-secure://${host}:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}.` };
  if (bad) expect(`components.servers.shared${i}.url`, `shared${i}`, host);
}

for (let i = 0; i < CLUSTER_COUNT; i++) {
  const hosts = [`kafka-${i}a.quality.es:9092`, `kafka-${i}b.quality.es:9093`];
  if (i % 6 === 5) hosts.push("localhost:9092");
  serverVariables[`cluster${i}`] = { enum: hosts, default: hosts[0], description: `Cluster ${i} brokers.` };
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const [protocol, scheme, suffix] = PROTOCOLS[s % PROTOCOLS.length];
  const name = `${domain}Server${s}`;
  const path = `servers.${name}.url`;
  switch (s % 5) {
    case 0: {
      const bad = s % 7 === 0;
      const host = bad ? BAD_HOSTS[Math.floor(s / 35) % BAD_HOSTS.length](s) : `${domain}-${s}.quality.es`;
      servers[name] = { url: `${scheme}${host}${suffix}`, protocol, description: `${domain} server ${s}.` };
      if (bad) expect(path, name, host);
      break;
    }
    case 1: {
      const bad = s % 9 === 1;
      const third = bad ? `10.1.${s % 256}.9` : `${domain}-${s}-c.quality.es`;
      servers[name] = { url: `${domain}-${s}-a.quality.es:9093,${domain}-${s}-b.quality.es:9093,${third}:9093`, protocol: "kafka-secure" };
      if (bad) expect(path, name, third);
      break;
    }
    case 2: {
      const bad = s % 11 === 2;
      const values = bad ? ["dev", "pre", "pro.legacy"] : ["dev", "pre", "pro"];
      servers[name] = {
        url: `${scheme}{env}-${domain}-${s}.quality.es${suffix === ":9092" ? ":{port}" : suffix}`,
        protocol,
        variables: { env: { enum: values, default: "pre" }, port: { enum: ["9092", "9093"], default: "9092" } },
      };
      if (bad) expect(path, name, `pro.legacy-${domain}-${s}.quality.es`);
      break;
    }
    case 3:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    default: {
      const cluster = s % CLUSTER_COUNT;
      servers[name] = { url: "{brokers}", protocol: "kafka", variables: { brokers: { $ref: `#/components/serverVariables/cluster${cluster}` } } };
      if (cluster % 6 === 5) expect(path, name, "localhost");
    }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const bad = i % 13 === 0;
  const host = bad ? `archive-${i}.example.org` : `archive-${i}.quality.es`;
  sharedServers[`archive${i}`] = { url: host, protocol: "kafka" };
  if (bad) expect(`components.servers.archive${i}.url`, `archive${i}`, host);
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Quality Retail Integration Hub",
      version: "9.0.0",
      description: "Generated document with 400 servers, 250 components servers and 20 shared server variables.",
    },
    servers,
    channels: {
      "retail.cdc.orders.created.v1": { servers: Object.keys(servers).slice(0, 25), subscribe: { operationId: "receiveOrder", message: { payload: { type: "object" } } } },
    },
    components: { servers: sharedServers, serverVariables },
  },
  expected: expected.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
};
