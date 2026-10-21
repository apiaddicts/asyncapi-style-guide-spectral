const DOMAINS = ["orders", "payments", "stock", "returns", "pricing", "customers", "loyalty", "shipping", "invoices", "catalog"];
const SERVER_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const servers = {};
const sharedServers = {};
const expected = [];
const complete = (host) => ({ url: `${host}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: "3.3.0" });

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.servers.${name}`;
  if (i % 5 === 1) {
    sharedServers[name] = { url: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", description: `Shared cluster ${i}` };
    expected.push([path, "missing", name, "protocolVersion"]);
  } else if (i % 5 === 3) {
    sharedServers[name] = { ...complete(`shared-${i}`), protocol: "" };
    expected.push([`${path}.protocol`, "empty", name, "protocol"]);
  } else {
    sharedServers[name] = complete(`shared-${i}`);
  }
}

for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const name = s % 50 === 49 ? `x-${domain}-edge-${s}` : `${domain}Server${s}`;
  const path = `servers.${name}`;
  switch (s % 8) {
    case 0:
      servers[name] = {
        ...complete(`${domain}-${s}`),
        url: `${domain}-${s}.quality.es:{port}`,
        variables: { port: { enum: ["9092", "9093"], default: "9093" }, protocolVersion: { default: "" } },
        bindings: { kafka: { protocolVersion: "", bindingVersion: "0.4.0" } },
      };
      break;
    case 1:
      servers[name] = { $ref: `#/components/servers/shared${s % SHARED_COUNT}` };
      break;
    case 2:
      if (s % 3 === 2) {
        servers[name] = { url: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", "x-protocolVersion": "3.3.0" };
        expected.push([path, "missing", name, "protocolVersion"]);
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
      break;
    case 3:
      if (s % 5 === 3) {
        servers[name] = { ...complete(`${domain}-${s}`), url: "  " };
        expected.push([`${path}.url`, "empty", name, "url"]);
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
      break;
    case 4:
      if (s % 16 === 4) {
        servers[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        servers[name] = { ...complete(`${domain}-${s}`), "x-team": domain };
      }
      break;
    case 5:
      if (s % 10 === 5) {
        servers[name] = { description: `Placeholder for ${domain}.` };
        ["url", "protocol", "protocolVersion"].forEach((field) => expected.push([path, "missing", name, field]));
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
      break;
    case 6:
      if (s % 12 === 6) {
        servers[name] = { $ref: `#/components/servers/retired${s}` };
        expected.push([path, "unusable", name]);
      } else {
        servers[name] = { $ref: `./partners/${domain}.yaml#/servers/kafka` };
      }
      break;
    default:
      if (s % 14 === 7) {
        servers[name] = { host: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", protocolVersion: "3.3.0" };
        expected.push([path, "missing", name, "url"]);
      } else {
        servers[name] = complete(`${domain}-${s}`);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedServers[name] = { ...complete(`archive-${i}`), protocolVersion: null };
    expected.push([`components.servers.${name}.protocolVersion`, "empty", name, "protocolVersion"]);
  } else {
    sharedServers[name] = complete(`archive-${i}`);
  }
}

const serverNames = Object.keys(servers);

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Quality Retail Platform Backbone", version: "9.0.0", description: "Generated document with 900 servers and 300 components servers." },
    servers,
    channels: {
      "retail.cdc.orders.placed.v1": {
        servers: serverNames.slice(0, 40),
        subscribe: { operationId: "receiveOrder", message: { name: "orderPlaced", payload: { type: "object", properties: { url: { type: "string" } } } } },
      },
    },
    components: { servers: sharedServers },
  },
  expected,
};
