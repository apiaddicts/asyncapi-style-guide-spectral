const { mismatch } = require("../../../helpers/rules/aar081-server-host-pattern");

const DOMAINS = ["trips", "drivers", "riders", "payments", "pricing", "dispatch", "vehicles", "support"];
const PROTOCOLS = [
  ["kafka-secure", ":9093", undefined],
  ["secure-mqtt", ":8883", "/fleet"],
  ["amqps", ":5671", "/events"],
  ["wss", "", "/stream/v1"],
  ["kafka", ":9092", undefined],
  ["pulsar+ssl", ":6651", undefined],
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
const channels = {};
const expected = [];
const expect = (path, server, host) => expected.push([path, mismatch(server, host)]);
const withPathname = (server, pathname) => (pathname === undefined ? server : { ...server, pathname });

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 10 === 3;
  const host = bad ? `shared-${i}.partner.example.org` : `shared-${i}.quality.es`;
  sharedServers[`shared${i}`] = { host: `${host}:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}.` };
  if (bad) expect(`components.servers.shared${i}.host`, `shared${i}`, host);
}

for (let i = 0; i < CLUSTER_COUNT; i++) {
  const hosts = [`kafka-${i}a.quality.es:9092`, `kafka-${i}b.quality.es:9093`];
  if (i % 6 === 5) hosts.push("localhost:9092");
  serverVariables[`cluster${i}`] = { enum: hosts, default: hosts[0], description: `Cluster ${i} brokers.` };
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const [protocol, port, pathname] = PROTOCOLS[s % PROTOCOLS.length];
  const name = `${domain}Server${s}`;
  const path = `servers.${name}.host`;
  switch (s % 5) {
    case 0: {
      const bad = s % 7 === 0;
      const host = bad ? BAD_HOSTS[Math.floor(s / 35) % BAD_HOSTS.length](s) : `${domain}-${s}.quality.es`;
      servers[name] = withPathname({ host: `${host}${port}`, protocol, description: `${domain} server ${s}.` }, pathname);
      if (bad) expect(path, name, host);
      break;
    }
    case 1: {
      const bad = s % 9 === 1;
      const third = bad ? `10.1.${s % 256}.9` : `${domain}-${s}-c.quality.es`;
      servers[name] = { host: `${domain}-${s}-a.quality.es:9093,${domain}-${s}-b.quality.es:9093,${third}:9093`, protocol: "kafka-secure" };
      if (bad) expect(path, name, third);
      break;
    }
    case 2: {
      const bad = s % 11 === 2;
      const values = bad ? ["dev", "pre", "pro.legacy"] : ["dev", "pre", "pro"];
      servers[name] = withPathname(
        {
          host: `{env}-${domain}-${s}.quality.es:{port}`,
          protocol,
          variables: { env: { enum: values, default: "pre" }, port: { enum: ["9092", "9093"], default: "9092" } },
        },
        pathname
      );
      if (bad) expect(path, name, `pro.legacy-${domain}-${s}.quality.es`);
      break;
    }
    case 3:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    default: {
      const cluster = s % CLUSTER_COUNT;
      servers[name] = { host: "{brokers}", protocol: "kafka", variables: { brokers: { $ref: `#/components/serverVariables/cluster${cluster}` } } };
      if (cluster % 6 === 5) expect(path, name, "localhost");
    }
  }
  if (s % 10 === 0) {
    channels[`${domain}Channel${s}`] = {
      address: `mobility.cdc.${domain}.event-${s}.v1`,
      servers: [{ $ref: `#/servers/${name}` }],
      messages: { changed: { name: `${domain}Changed${s}`, payload: { type: "object" } } },
    };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const bad = i % 13 === 0;
  const host = bad ? `archive-${i}.example.org` : `archive-${i}.quality.es`;
  sharedServers[`archive${i}`] = { host, protocol: "kafka" };
  if (bad) expect(`components.servers.archive${i}.host`, `archive${i}`, host);
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Quality Mobility Integration Hub",
      version: "9.0.0",
      description: "Generated document with 400 servers, 250 components servers and 20 shared server variables.",
    },
    servers,
    channels,
    components: { servers: sharedServers, serverVariables },
  },
  expected: expected.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
};
