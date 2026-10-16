const { notApproved, notString, DEFAULT_VERSIONS } = require("../../../helpers/rules/aar085-server-protocol-version-valid-values");

const DOMAINS = ["vehicles", "chargers", "trips", "billing", "maintenance", "drivers", "parking", "insurance", "tolls", "fleet"];
const BAD_VERSIONS = ["2.8.0", "3.7.0", "3", "V3.3.0", "3.3-IV0", "3.3.2", "0-9-1", "5.0", "3.3.0\t", "  3.3.0", "stable", "{protocolVersion}", "", "3.3.0.0", "3.3.0-SNAPSHOT", "4.0.0"];
const CONFIGURED_VERSIONS = ["2.8.0", "3.7.0", "4.0.0", "0-9-1", "5.0", "3.3-IV0"];
const SERVER_COUNT = 840;
const SHARED_COUNT = 64;
const ARCHIVE_COUNT = 240;

const servers = {};
const sharedServers = {};
const entries = [];
const track = (path, server, version) => entries.push({ path, server, version });

for (let i = 0; i < SHARED_COUNT; i++) {
  const bad = i % 6 === 2;
  const version = bad ? BAD_VERSIONS[i % BAD_VERSIONS.length] : "3.3.0";
  sharedServers[`shared${i}`] = { host: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: version, title: `Shared cluster ${i}` };
  track(`components.servers.shared${i}.protocolVersion`, `shared${i}`, version);
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const name = s % 40 === 39 ? `x-${domain}-edge-${s}` : `${domain}Server${s}`;
  const path = `servers.${name}.protocolVersion`;
  switch (s % 6) {
    case 0: {
      const version = s % 4 === 0 ? BAD_VERSIONS[Math.floor(s / 24) % BAD_VERSIONS.length] : "3.3.0";
      servers[name] = { host: `${domain}-${s}.quality.es:9093`, pathname: `/${domain}`, protocol: "kafka-secure", protocolVersion: version, "x-protocolVersion": "2.8.0" };
      track(path, name, version);
      break;
    }
    case 1:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 2: {
      const nonString = s % 10 === 2;
      servers[name] = { host: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: nonString ? [3, 3, 0] : "3.3.0" };
      track(path, name, nonString ? null : "3.3.0");
      break;
    }
    case 3: {
      const version = s % 9 === 3 ? "{protocolVersion}" : "3.3.0";
      servers[name] = {
        host: `${domain}-${s}.quality.es:{port}`,
        protocol: "kafka-secure",
        protocolVersion: version,
        variables: { port: { enum: ["9092", "9093"], default: "9093" }, protocolVersion: { enum: ["3.3.0"], default: "3.3.0" } },
      };
      track(path, name, version);
      break;
    }
    case 4:
      servers[name] = s % 8 === 4 ? { host: `${domain}-${s}.quality.es`, protocol: "kafka", title: "No protocolVersion" } : { host: `${domain}-${s}.quality.es`, protocol: "kafka", protocolVersion: null };
      break;
    default: {
      const version = s % 15 === 5 ? "v3.3.0" : "3.3.0";
      servers[name] = {
        host: `${domain}-${s}.quality.es`,
        protocol: "kafka",
        protocolVersion: version,
        bindings: { kafka: { protocolVersion: "2.8.0", bindingVersion: "0.5.0" }, mqtt: { protocolVersion: "5.0" } },
      };
      track(path, name, version);
    }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const version = i % 13 === 7 ? "3.7.0" : "3.3.0";
  sharedServers[`archive${i}`] = { host: `archive-${i}.quality.es:9092`, protocol: "kafka", protocolVersion: version };
  track(`components.servers.archive${i}.protocolVersion`, `archive${i}`, version);
}

const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const expectedFor = (versions) =>
  entries
    .filter(({ version }) => version === null || !versions.includes(version))
    .map(({ path, server, version }) => [path, version === null ? notString(server) : notApproved(server, version, versions)])
    .sort(byPathAndMessage);

const serverNames = Object.keys(servers);

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Quality Mobility Platform Backbone",
      version: "9.0.0",
      description: "Generated document with 840 servers and 304 components servers.",
    },
    servers,
    channels: {
      vehicleTelemetry: {
        address: "mobility.cdc.vehicle-telemetry.recorded.v1",
        servers: serverNames.slice(0, 40).filter((name) => !name.startsWith("x-")).map((name) => ({ $ref: `#/servers/${name}` })),
        messages: { telemetryRecorded: { payload: { type: "object", properties: { protocolVersion: { type: "string", default: "2.8.0" } } } } },
      },
    },
    operations: { receiveTelemetry: { action: "receive", channel: { $ref: "#/channels/vehicleTelemetry" } } },
    components: { servers: sharedServers },
  },
  configuredVersions: CONFIGURED_VERSIONS,
  expected: expectedFor(DEFAULT_VERSIONS),
  expectedConfigured: expectedFor(CONFIGURED_VERSIONS),
};
