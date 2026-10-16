const { notApproved, notString, DEFAULT_VERSIONS } = require("../../../helpers/rules/aar085-server-protocol-version-valid-values");

const LINES = ["orders", "stock", "picking", "carriers", "returns", "pricing", "loyalty", "invoices", "stores", "suppliers"];
const BAD_VERSIONS = ["2.8.0", "3.4.0", "3.3", "v3.3.0", "3.3-IV3", "3.3.1", "0.9.1", "5.0", "3.3.0 ", " 3.3.0", "latest", "{version}", "", "7.3.0-ccs", "3.3.0-rc1", "3.6.0"];
const CONFIGURED_VERSIONS = ["2.8.0", "3.4.0", "3.6.0", "0.9.1", "5.0", "3.3-IV3"];
const SERVER_COUNT = 900;
const SHARED_COUNT = 70;
const ARCHIVE_COUNT = 260;

const servers = {};
const sharedServers = {};
const entries = [];
const track = (path, server, version) => entries.push({ path, server, version });

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 7 === 4;
  const version = bad ? BAD_VERSIONS[i % BAD_VERSIONS.length] : "3.3.0";
  sharedServers[`shared${i}`] = { url: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: version, description: `Shared cluster ${i}.` };
  track(`components.servers.shared${i}.protocolVersion`, `shared${i}`, version);
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const line = LINES[s % LINES.length];
  const name = s % 50 === 49 ? `x-${line}-edge-${s}` : `${line}Server${s}`;
  const path = `servers.${name}.protocolVersion`;
  switch (s % 6) {
    case 0: {
      const version = s % 4 === 0 ? BAD_VERSIONS[Math.floor(s / 24) % BAD_VERSIONS.length] : "3.3.0";
      servers[name] = { url: `${line}-${s}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: version, "x-protocolVersion": "2.8.0", description: `${line} cluster ${s}.` };
      track(path, name, version);
      break;
    }
    case 1:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 2: {
      const nonString = s % 10 === 2;
      servers[name] = { url: `${line}-${s}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: nonString ? 3.3 : "3.3.0" };
      track(path, name, nonString ? null : "3.3.0");
      break;
    }
    case 3: {
      const version = s % 9 === 3 ? "{version}" : "3.3.0";
      servers[name] = {
        url: `${line}-${s}.quality.es:{port}`,
        protocol: "kafka-secure",
        protocolVersion: version,
        variables: { port: { enum: ["9092", "9093"], default: "9093" }, version: { enum: ["3.3.0"], default: "3.3.0" } },
      };
      track(path, name, version);
      break;
    }
    case 4:
      servers[name] = s % 8 === 4 ? { url: `${line}-${s}.quality.es`, protocol: "kafka", description: "No protocolVersion." } : { url: `${line}-${s}.quality.es`, protocol: "kafka", protocolVersion: null };
      break;
    default: {
      const version = s % 15 === 5 ? "V3.3.0" : "3.3.0";
      servers[name] = {
        url: `${line}-${s}.quality.es`,
        protocol: "kafka",
        protocolVersion: version,
        bindings: { kafka: { protocolVersion: "2.8.0", bindingVersion: "0.4.0" }, mqtt: { protocolVersion: "5.0" } },
      };
      track(path, name, version);
    }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const version = i % 11 === 6 ? "2.8.0" : "3.3.0";
  sharedServers[`archive${i}`] = { url: `archive-${i}.quality.es:9092`, protocol: "kafka", protocolVersion: version };
  track(`components.servers.archive${i}.protocolVersion`, `archive${i}`, version);
}

const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const expectedFor = (versions) =>
  entries
    .filter(({ version }) => version === null || !versions.includes(version))
    .map(({ path, server, version }) => [path, version === null ? notString(server) : notApproved(server, version, versions)])
    .sort(byPathAndMessage);

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Quality Retail Commerce Backbone",
      version: "12.0.0",
      description: "Generated document with 900 servers and 330 components servers.",
    },
    servers,
    channels: {
      "retail.cdc.orders.placed.v1": {
        servers: Object.keys(servers).slice(0, 40),
        subscribe: { operationId: "receiveOrderPlaced", message: { payload: { type: "object", properties: { protocolVersion: { type: "string", default: "2.8.0" } } } } },
      },
    },
    components: { servers: sharedServers },
  },
  configuredVersions: CONFIGURED_VERSIONS,
  expected: expectedFor(DEFAULT_VERSIONS),
  expectedConfigured: expectedFor(CONFIGURED_VERSIONS),
};
