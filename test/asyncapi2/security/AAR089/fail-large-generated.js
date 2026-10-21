const { notApproved, notString, DEFAULT_TYPES } = require("../../../helpers/rules/aar089-channel-security-valid-values");

const DOMAINS = ["orders", "stock", "picking", "carriers", "returns", "pricing", "loyalty", "invoices", "stores", "suppliers"];
const TYPES = ["scramSha512", "X509", "plain", "scramSha256", "gssapi", "userPassword", "apiKey", "httpApiKey", "http", "oauth2", "openIdConnect", "symmetricEncryption", "asymmetricEncryption", "mutualTLS", "ScramSha512", "x509", "scramSha512 ", ""];
const CONFIGURED_TYPES = ["plain", "scramSha256", "gssapi", "oauth2", "mutualTLS", "X509"];
const SERVER_COUNT = 400;
const CHANNEL_COUNT = 300;
const TRAIT_COUNT = 40;
const COMPONENT_SERVER_COUNT = 60;
const COMPONENT_CHANNEL_COUNT = 40;

const securitySchemes = { numericScheme: { type: 512 }, untypedScheme: { description: "No type." } };
TYPES.forEach((type, index) => {
  securitySchemes[`scheme${index}`] = { type, description: `Generated scheme ${index}.` };
});
const NAMES = [...TYPES.map((_, index) => `scheme${index}`), "numericScheme", "untypedScheme"];

const entries = [];
const track = (path, name) => {
  if (name === "untypedScheme") return;
  entries.push({ path, name, type: name === "numericScheme" ? null : securitySchemes[name].type });
};

const pick = (seed) => (seed % 5 === 0 ? NAMES[seed % NAMES.length] : NAMES[seed % 2]);
const securityFor = (seed, at) => {
  const first = pick(seed);
  const second = pick(seed * 3 + 1);
  let list;
  if (seed % 3 === 0 && first !== second) list = [{ [first]: [], [second]: [] }];
  else if (seed % 3 === 1) list = [{ [first]: [] }, { [second]: [] }];
  else list = [{ [first]: [] }];
  list.forEach((requirement, index) => Object.keys(requirement).forEach((name) => track(`${at}.${index}.${name}`, name)));
  return list;
};

const message = { payload: { type: "object", properties: { id: { type: "string" }, security: { type: "string", default: "plain" } } } };

const componentServers = {};
for (let i = 0; i < COMPONENT_SERVER_COUNT; i++) {
  componentServers[`shared${i}`] = { url: `shared-${i}.quality.es:9093`, protocol: "kafka-secure", security: securityFor(1000 + i, `components.servers.shared${i}.security`) };
}

const operationTraits = {};
for (let t = 0; t < TRAIT_COUNT; t++) {
  operationTraits[`trait${t}`] = { description: `Shared consumer trait ${t}.`, security: securityFor(2000 + t, `components.operationTraits.trait${t}.security`) };
}

const servers = {};
for (let s = 0; s < SERVER_COUNT; s++) {
  const domain = DOMAINS[s % DOMAINS.length];
  const name = s % 50 === 49 ? `x-${domain}-edge-${s}` : `${domain}Kafka${s}`;
  if (s % 9 === 4) {
    servers[name] = { $ref: `#/components/servers/shared${s % COMPONENT_SERVER_COUNT}` };
  } else if (s % 11 === 7) {
    servers[name] = { url: `${domain}-${s}.quality.es:9092`, protocol: "kafka", description: "No security." };
  } else {
    servers[name] = { url: `${domain}-${s}.quality.es:9093`, protocol: "kafka-secure", security: securityFor(s, `servers.${name}.security`) };
  }
}

const componentChannels = {};
for (let i = 0; i < COMPONENT_CHANNEL_COUNT; i++) {
  componentChannels[`shared${i}`] = {
    description: `Shared channel ${i}.`,
    publish: { operationId: `publishShared${i}`, security: securityFor(5000 + i, `components.channels.shared${i}.publish.security`), message },
  };
}

const channels = {};
for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  let key = `${domain}.cdc.entity${c}.v1`;
  if (c % 25 === 24) key = `x-${domain}.audit.${c}`;
  else if (c % 10 === 3) key = `${domain}/events/${c}`;
  if (c % 13 === 6) {
    channels[key] = { $ref: `#/components/channels/shared${c % COMPONENT_CHANNEL_COUNT}` };
    continue;
  }
  const trait = c % 2 === 0 ? { $ref: `#/components/operationTraits/trait${c % TRAIT_COUNT}` } : { security: securityFor(4000 + c, `channels.${key}.subscribe.traits.0.security`) };
  channels[key] = {
    description: `Generated channel ${c}.`,
    publish: { operationId: `publish${c}`, security: securityFor(3000 + c, `channels.${key}.publish.security`), message },
    subscribe: { operationId: `receive${c}`, traits: [trait], message },
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
    asyncapi: "2.6.0",
    info: {
      title: "Quality Retail Security Backbone",
      version: "12.0.0",
      description: "Generated document with 400 servers, 300 channels and shared servers, channels and operation traits.",
    },
    servers,
    channels,
    components: { securitySchemes, servers: componentServers, channels: componentChannels, operationTraits },
  },
  configuredTypes: CONFIGURED_TYPES,
  expected: expectedFor(DEFAULT_TYPES),
  expectedConfigured: expectedFor(CONFIGURED_TYPES),
};
