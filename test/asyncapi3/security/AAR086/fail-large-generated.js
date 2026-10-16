const DOMAINS = ["vehicles", "chargers", "trips", "billing", "maintenance", "drivers", "parking", "insurance", "tolls", "fleet"];
const SERVER_COUNT = 840;
const SHARED_COUNT = 64;
const ARCHIVE_COUNT = 240;

const servers = {};
const sharedServers = {};
const expected = [];
const complete = (host) => ({ host: `${host}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: "3.3.0" });

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.servers.${name}`;
  if (i % 6 === 2) {
    sharedServers[name] = { host: `shared-${i}.quality.es:9093`, protocolVersion: "3.3.0", title: `Shared cluster ${i}` };
    expected.push([path, "missing", name, "protocol"]);
  } else if (i % 6 === 4) {
    sharedServers[name] = { ...complete(`shared-${i}`), host: "" };
    expected.push([`${path}.host`, "empty", name, "host"]);
  } else {
    sharedServers[name] = complete(`shared-${i}`);
  }
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const name = s % 40 === 39 ? `x-${domain}-edge-${s}` : `${domain}Server${s}`;
  const path = `servers.${name}`;
  switch (s % 7) {
    case 0:
      servers[name] = {
        ...complete(`${domain}-${s}`),
        host: `${domain}-${s}.quality.es:{port}`,
        pathname: `/${domain}`,
        variables: { port: { enum: ["9092", "9093"], default: "9093" }, host: { default: "" } },
        bindings: { kafka: { protocolVersion: "", bindingVersion: "0.5.0" } },
      };
      break;
    case 1:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 2:
      if (s % 4 === 2) {
        servers[name] = { host: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", title: "No protocolVersion" };
        expected.push([path, "missing", name, "protocolVersion"]);
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
      break;
    case 3:
      if (s % 9 === 3) {
        servers[name] = { ...complete(`${domain}-${s}`), protocolVersion: null };
        expected.push([`${path}.protocolVersion`, "empty", name, "protocolVersion"]);
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
      break;
    case 4:
      if (s % 8 === 4) {
        servers[name] = [complete(`${domain}-${s}`)];
        expected.push([path, "unusable", name]);
      } else {
        servers[name] = { ...complete(`${domain}-${s}`), summary: `${domain} cluster.` };
      }
      break;
    case 5:
      if (s % 10 === 5) {
        servers[name] = { url: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: "3.3.0" };
        expected.push([path, "missing", name, "host"]);
      } else {
        servers[name] = { $ref: `./partners/${domain}.yaml#/servers/kafka` };
      }
      break;
    default:
      if (s % 12 === 6) {
        servers[name] = { $ref: `#/components/servers/loop${s}` };
        sharedServers[`loop${s}`] = { $ref: `#/servers/${name}` };
        expected.push([`components.servers.loop${s}`, "unusable", `loop${s}`]);
        expected.push([path, "unusable", name]);
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 13 === 7) {
    sharedServers[name] = { pathname: "/archive" };
    ["host", "protocol", "protocolVersion"].forEach((field) => expected.push([`components.servers.${name}`, "missing", name, field]));
  } else {
    sharedServers[name] = complete(`archive-${i}`);
  }
}

const serverNames = Object.keys(servers);

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Mobility Platform Backbone", version: "9.0.0", description: "Generated document with 840 servers and more than 300 components servers." },
    servers,
    channels: {
      vehicleTelemetry: {
        address: "mobility.cdc.vehicle-telemetry.recorded.v1",
        servers: serverNames.slice(0, 40).map((name) => ({ $ref: `#/servers/${name}` })),
        messages: { telemetryRecorded: { payload: { type: "object", properties: { host: { type: "string" } } } } },
      },
    },
    operations: { receiveTelemetry: { action: "receive", channel: { $ref: "#/channels/vehicleTelemetry" } } },
    components: { servers: sharedServers },
  },
  expected,
};
