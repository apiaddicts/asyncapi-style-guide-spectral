const { mismatch, notString } = require("../../../helpers/rules/aar083-server-host-pattern");

const AREAS = ["press", "paint", "welding", "assembly", "logistics", "quality", "energy", "maintenance", "warehouse", "tooling"];
const PROTOCOLS = [
  ["kafka-secure", ":9093", undefined],
  ["secure-mqtt", ":8883", "/lines"],
  ["amqps", ":5671", "/%2Fplant"],
  ["wss", "", "/realtime"],
  ["kafka", ":9092", undefined],
  ["nats", ":4222", undefined],
  ["pulsar", ":6651", "/plant"],
  ["ibmmq", ":1414", "/QM1"],
];
const BAD_HOSTS = [
  (s) => `pkc-${s}.eu-west-1.aws.confluent.cloud`,
  (s) => `b-${s % 3}.plants.c2.kafka.eu-west-1.amazonaws.com`,
  (s) => `ns-${s}.servicebus.windows.net`,
  (s) => `kafka-${s}.plants.svc.cluster.local`,
  (s) => `plant-${s}.qualty.es`,
  (s) => `plant-${s}.quality.es.evil.net`,
  (s) => `eu.plant-${s}.quality.es`,
  (s) => `Plant-${s}.QUALITY.es`,
  (s) => `172.16.${s % 256}.10`,
  (s) => `[fd00::${(s % 4096).toString(16)}]`,
];
const SERVER_COUNT = 800;
const SHARED_COUNT = 60;
const CLUSTER_COUNT = 40;
const ARCHIVE_COUNT = 240;

const servers = {};
const sharedServers = {};
const serverVariables = {};
const channels = {};
const operations = {};
const expected = [];
const expect = (path, server, host) => expected.push([path, mismatch(server, host)]);
const withPathname = (server, pathname) => (pathname === undefined ? server : { ...server, pathname });

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 8 === 5;
  const host = bad ? BAD_HOSTS[i % BAD_HOSTS.length](i) : `shared-${i}.quality.es`;
  sharedServers[`shared${i}`] = { host: `${host}:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}.` };
  if (bad) expect(`components.servers.shared${i}.host`, `shared${i}`, host);
}

for (let i = 0; i < CLUSTER_COUNT; i++) {
  const hosts = [`kafka-${i}-a.quality.es:9093`, `kafka-${i}-b.quality.es:9093`, `kafka-${i}-c.quality.es:9093`];
  if (i % 7 === 3) hosts.push(`kafka-${i}.supplier.example.org:9093`);
  serverVariables[`cluster${i}`] = { enum: hosts, default: hosts[0] };
  serverVariables[`cluster${i}Alias`] = { $ref: `#/components/serverVariables/cluster${i}` };
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const area = AREAS[s % AREAS.length];
  const [protocol, port, pathname] = PROTOCOLS[s % PROTOCOLS.length];
  const name = s % 50 === 49 ? `x-${area}-edge-${s}` : `${area}Server${s}`;
  const path = `servers.${name}.host`;
  switch (s % 8) {
    case 0: {
      const bad = s % 3 === 0;
      const host = bad ? BAD_HOSTS[Math.floor(s / 24) % BAD_HOSTS.length](s) : `${area}-${s}.quality.es`;
      servers[name] = withPathname({ host: `${host}${port}`, protocol, description: `${area} server ${s}.` }, pathname);
      if (bad) expect(path, name, host);
      break;
    }
    case 1: {
      const hosts = [0, 1, 2, 3, 4].map((n) => `${area}-${s}-${n}.quality.es`);
      if (s % 5 === 1) hosts[2] = `10.2.${s % 256}.${s % 200}`;
      if (s % 15 === 1) hosts[4] = "localhost";
      servers[name] = { host: hosts.map((host) => `${host}:9093`).join(","), protocol: "kafka-secure" };
      [hosts[2], hosts[4]].filter((host) => !host.endsWith(".quality.es")).forEach((host) => expect(path, name, host));
      break;
    }
    case 2: {
      const bad = s % 6 === 2;
      const values = bad ? ["dev", "pre", "pro.supplier"] : ["dev", "pre", "pro"];
      servers[name] = withPathname(
        {
          host: `{env}-${area}-${s}.quality.es:{port}`,
          protocol,
          variables: { env: { enum: values, default: "pro" }, port: { enum: ["9092", "9093"], default: "9093" } },
        },
        pathname
      );
      if (bad) expect(path, name, `pro.supplier-${area}-${s}.quality.es`);
      break;
    }
    case 3:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 4: {
      const cluster = s % CLUSTER_COUNT;
      servers[name] = { host: "{brokers}", protocol: "kafka-secure", variables: { brokers: { $ref: `#/components/serverVariables/cluster${cluster}Alias` } } };
      if (cluster % 7 === 3) expect(path, name, `kafka-${cluster}.supplier.example.org`);
      break;
    }
    case 5: {
      const bad = s % 4 === 1;
      const host = bad ? `${area}.supplier-${s}.example.org` : `${area}-${s}.quality.es`;
      servers[name] = { host: `amqps://svc-${area}:s3cr3t@${host}:5671`, pathname: `/%2F${area}`, protocol: "amqps" };
      if (bad) expect(path, name, host);
      break;
    }
    case 6: {
      const nonString = s % 10 === 6;
      servers[name] = { host: nonString ? 9093 : `${area}-${s}.quality.es`, protocol: "kafka" };
      if (nonString) expected.push([path, notString(name, "host")]);
      break;
    }
    default: {
      const bad = s % 16 === 7;
      const host = bad ? `{tenant}.${area}.quality.es` : `${area}-${s}.quality.es`;
      servers[name] = { host, pathname: "/stream/{tenant}", protocol: "wss", variables: { tenant: { description: "Unresolved tenant." } } };
      if (bad) expect(path, name, host);
    }
  }
  if (s % 20 === 0) {
    channels[`${area}Channel${s}`] = {
      address: s % 40 === 0 ? null : `plant.cdc.${area}.event-${s}.v1`,
      servers: [{ $ref: `#/servers/${name}` }],
      messages: { changed: { name: `${area}Changed${s}`, payload: { type: "object", properties: { host: { type: "string", default: "evil.example.org" } } } } },
    };
    operations[`receive${area}${s}`] = { action: "receive", channel: { $ref: `#/channels/${area}Channel${s}` } };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const bad = i % 11 === 4;
  const host = bad ? `archive-${i}.example.org` : `archive-${i}.quality.es`;
  sharedServers[`archive${i}`] = { host, protocol: "kafka" };
  if (bad) expect(`components.servers.archive${i}.host`, `archive${i}`, host);
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Quality Manufacturing Integration Backbone",
      version: "12.0.0",
      description: "Generated document with 800 servers, 300 components servers and 80 shared server variables.",
    },
    servers,
    channels,
    operations,
    components: { servers: sharedServers, serverVariables },
  },
  expected: expected.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
};
