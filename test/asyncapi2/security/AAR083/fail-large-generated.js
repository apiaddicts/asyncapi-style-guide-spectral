const { mismatch, notString } = require("../../../helpers/rules/aar083-server-host-pattern");

const LINES = ["motor", "home", "health", "life", "travel", "pet", "cyber", "marine", "fleet", "liability"];
const SCHEMES = ["kafka-secure://", "mqtts://", "amqps://", "wss://", "", "nats://", "pulsar+ssl://", "ibmmq://"];
const BAD_HOSTS = [
  (s) => `pkc-${s}.eu-west-1.aws.confluent.cloud`,
  (s) => `b-${s % 3}.claims.c2.kafka.eu-west-1.amazonaws.com`,
  (s) => `ns-${s}.servicebus.windows.net`,
  (s) => `kafka-${s}.claims.svc.cluster.local`,
  (s) => `claims-${s}.qualty.es`,
  (s) => `claims-${s}.quality.es.evil.net`,
  (s) => `eu.claims-${s}.quality.es`,
  (s) => `Claims-${s}.QUALITY.es`,
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
const expected = [];
const expect = (path, server, host) => expected.push([path, mismatch(server, host)]);

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 8 === 5;
  const host = bad ? BAD_HOSTS[i % BAD_HOSTS.length](i) : `shared-${i}.quality.es`;
  sharedServers[`shared${i}`] = { url: `kafka-secure://${host}:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}.` };
  if (bad) expect(`components.servers.shared${i}.url`, `shared${i}`, host);
}

for (let i = 0; i < CLUSTER_COUNT; i++) {
  const hosts = [`kafka-${i}-a.quality.es:9093`, `kafka-${i}-b.quality.es:9093`, `kafka-${i}-c.quality.es:9093`];
  if (i % 7 === 3) hosts.push(`kafka-${i}.reinsurer.example.org:9093`);
  serverVariables[`cluster${i}`] = { enum: hosts, default: hosts[0] };
  serverVariables[`cluster${i}Alias`] = { $ref: `#/components/serverVariables/cluster${i}` };
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const line = LINES[s % LINES.length];
  const scheme = SCHEMES[s % SCHEMES.length];
  const name = s % 50 === 49 ? `x-${line}-edge-${s}` : `${line}Server${s}`;
  const path = `servers.${name}.url`;
  switch (s % 8) {
    case 0: {
      const bad = s % 3 === 0;
      const host = bad ? BAD_HOSTS[Math.floor(s / 24) % BAD_HOSTS.length](s) : `${line}-${s}.quality.es`;
      servers[name] = { url: `${scheme}${host}:9093`, protocol: "kafka-secure", description: `${line} server ${s}.` };
      if (bad) expect(path, name, host);
      break;
    }
    case 1: {
      const hosts = [0, 1, 2, 3, 4].map((n) => `${line}-${s}-${n}.quality.es`);
      if (s % 5 === 1) hosts[2] = `10.2.${s % 256}.${s % 200}`;
      if (s % 15 === 1) hosts[4] = "localhost";
      servers[name] = { url: hosts.map((host) => `${host}:9093`).join(","), protocol: "kafka-secure" };
      [hosts[2], hosts[4]].filter((host) => !host.endsWith(".quality.es")).forEach((host) => expect(path, name, host));
      break;
    }
    case 2: {
      const bad = s % 6 === 2;
      const values = bad ? ["dev", "pre", "pro.partner"] : ["dev", "pre", "pro"];
      servers[name] = {
        url: `${scheme}{env}-${line}-${s}.quality.es:{port}`,
        protocol: "kafka",
        variables: { env: { enum: values, default: "pro" }, port: { enum: ["9092", "9093"], default: "9093" } },
      };
      if (bad) expect(path, name, `pro.partner-${line}-${s}.quality.es`);
      break;
    }
    case 3:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 4: {
      const cluster = s % CLUSTER_COUNT;
      servers[name] = { url: "{brokers}", protocol: "kafka-secure", variables: { brokers: { $ref: `#/components/serverVariables/cluster${cluster}Alias` } } };
      if (cluster % 7 === 3) expect(path, name, `kafka-${cluster}.reinsurer.example.org`);
      break;
    }
    case 5: {
      const bad = s % 4 === 1;
      const host = bad ? `${line}.partner-${s}.example.org` : `${line}-${s}.quality.es`;
      servers[name] = { url: `${scheme}svc-${line}:s3cr3t@${host}:5671/%2F${line}?heartbeat=30#primary`, protocol: "amqps" };
      if (bad) expect(path, name, host);
      break;
    }
    case 6: {
      const nonString = s % 10 === 6;
      servers[name] = { url: nonString ? 9093 : `${line}-${s}.quality.es`, protocol: "kafka" };
      if (nonString) expected.push([path, notString(name, "url")]);
      break;
    }
    default: {
      const bad = s % 16 === 7;
      const host = bad ? `{tenant}.${line}.quality.es` : `${line}-${s}.quality.es`;
      servers[name] = { url: `wss://${host}/stream`, protocol: "wss", variables: { tenant: { description: "Unresolved tenant." } } };
      if (bad) expect(path, name, host);
    }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const bad = i % 11 === 4;
  const host = bad ? `archive-${i}.example.org` : `archive-${i}.quality.es`;
  sharedServers[`archive${i}`] = { url: host, protocol: "kafka" };
  if (bad) expect(`components.servers.archive${i}.url`, `archive${i}`, host);
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Quality Insurance Integration Backbone",
      version: "12.0.0",
      description: "Generated document with 800 servers, 300 components servers and 80 shared server variables.",
    },
    servers,
    channels: {
      "insurance.cdc.policies.issued.v1": {
        servers: Object.keys(servers).slice(0, 40),
        subscribe: { operationId: "receivePolicyIssued", message: { payload: { type: "object", properties: { brokerUrl: { type: "string", default: "kafka://evil.example.org" } } } } },
      },
    },
    components: { servers: sharedServers, serverVariables },
  },
  expected: expected.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
};
