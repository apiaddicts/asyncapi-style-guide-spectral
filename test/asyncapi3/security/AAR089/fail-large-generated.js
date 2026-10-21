const { notApproved, notString, DEFAULT_TYPES } = require("../../../helpers/rules/aar089-channel-security-valid-values");

const DOMAINS = ["vehicles", "drivers", "routes", "depots", "fuel", "tolls", "parcels", "returns", "billing", "alerts"];
const TYPES = ["scramSha512", "X509", "plain", "scramSha256", "gssapi", "userPassword", "apiKey", "httpApiKey", "http", "oauth2", "openIdConnect", "symmetricEncryption", "asymmetricEncryption", "mutualTLS", "ScramSha512", "x509", "scramSha512 ", ""];
const CONFIGURED_TYPES = ["plain", "scramSha256", "gssapi", "oauth2", "mutualTLS", "X509"];
const SERVER_COUNT = 400;
const OPERATION_COUNT = 450;
const TRAIT_COUNT = 40;
const COMPONENT_SERVER_COUNT = 60;
const COMPONENT_OPERATION_COUNT = 40;

const securitySchemes = { numericScheme: { type: 512 }, untypedScheme: { description: "No type." } };
TYPES.forEach((type, index) => {
  securitySchemes[`scheme${index}`] = { type, description: `Generated scheme ${index}.` };
});
const NAMES = [...TYPES.map((_, index) => `scheme${index}`), "numericScheme", "untypedScheme"];

const entries = [];
const track = (path, name, type) => entries.push({ path, name, type });

const pick = (seed) => (seed % 5 === 0 ? NAMES[seed % NAMES.length] : NAMES[seed % 2]);
const itemFor = (seed, at) => {
  const name = pick(seed);
  if (seed % 4 === 3 && name !== "untypedScheme") {
    const type = name === "numericScheme" ? 512 : securitySchemes[name].type;
    track(`${at}.type`, undefined, typeof type === "string" ? type : null);
    return { type, description: "Inline scheme." };
  }
  if (name !== "untypedScheme") track(at, name, name === "numericScheme" ? null : securitySchemes[name].type);
  return { $ref: `#/components/securitySchemes/${name}` };
};
const securityFor = (seed, at) => {
  const count = seed % 3 === 1 ? 2 : 1;
  return Array.from({ length: count }, (_, index) => itemFor(seed * 3 + index * 7, `${at}.${index}`));
};

const channels = {};
DOMAINS.forEach((domain) => {
  channels[domain] = { address: `fleet.cdc.${domain}.v1`, description: `${domain} events.`, messages: { event: { payload: { type: "object", properties: { security: { type: ["string", "null"] } } } } } };
});

const componentServers = {};
for (let i = 0; i < COMPONENT_SERVER_COUNT; i++) {
  componentServers[`shared${i}`] = { host: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", security: securityFor(1000 + i, `components.servers.shared${i}.security`) };
}

const operationTraits = {};
for (let t = 0; t < TRAIT_COUNT; t++) {
  operationTraits[`trait${t}`] = { description: `Shared trait ${t}.`, security: securityFor(2000 + t, `components.operationTraits.trait${t}.security`) };
}

const componentOperations = {};
for (let i = 0; i < COMPONENT_OPERATION_COUNT; i++) {
  componentOperations[`shared${i}`] = {
    action: i % 2 === 0 ? "send" : "receive",
    channel: { $ref: `#/channels/${DOMAINS[i % DOMAINS.length]}` },
    security: securityFor(5000 + i, `components.operations.shared${i}.security`),
  };
}

const servers = {};
for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const name = s % 50 === 49 ? `x-${domain}-edge-${s}` : `${domain}Kafka${s}`;
  if (s % 9 === 4) {
    servers[name] = { $ref: `#/components/servers/shared${s % COMPONENT_SERVER_COUNT}` };
  } else if (s % 11 === 7) {
    servers[name] = { host: `${domain}-${s}.quality.es:9092`, protocol: "kafka", description: "No security." };
  } else {
    servers[name] = { host: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", security: securityFor(s, `servers.${name}.security`) };
  }
}

const operations = {};
for (let o = 0; o < OPERATION_COUNT; o++) {
  const domain = DOMAINS[o % DOMAINS.length];
  let id = `${o % 2 === 0 ? "send" : "receive"}${domain}${o}`;
  if (o % 25 === 24) id = `x-${domain}-audit-${o}`;
  else if (o % 10 === 3) id = `${domain}/events/${o}`;
  if (o % 13 === 6) {
    operations[id] = { $ref: `#/components/operations/shared${o % COMPONENT_OPERATION_COUNT}` };
    continue;
  }
  const trait = o % 2 === 0 ? { $ref: `#/components/operationTraits/trait${o % TRAIT_COUNT}` } : { security: securityFor(4000 + o, `operations.${id}.traits.0.security`) };
  operations[id] = {
    action: o % 2 === 0 ? "send" : "receive",
    channel: { $ref: `#/channels/${domain}` },
    security: securityFor(3000 + o, `operations.${id}.security`),
    traits: [trait],
    messages: [{ $ref: `#/channels/${domain}/messages/event` }],
  };
}

const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const expectedFor = (types) =>
  entries
    .filter(({ type }) => type === null || !types.includes(type))
    .map(({ path, name, type }) => [path, type === null ? notString(name) : notApproved(name, type, types)])
    .sort(byPathAndMessage);

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Quality Fleet Security Backbone",
      version: "12.0.0",
      description: "Generated document with 400 servers, 450 operations and shared servers, operations and operation traits.",
    },
    servers,
    channels,
    operations,
    components: { securitySchemes, servers: componentServers, operations: componentOperations, operationTraits },
  },
  configuredTypes: CONFIGURED_TYPES,
  expected: expectedFor(DEFAULT_TYPES),
  expectedConfigured: expectedFor(CONFIGURED_TYPES),
};
