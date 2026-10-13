const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 6;
const ALL = ["commonHeaders", "tracing"];

const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const channels = {};
const operations = {};
const messages = {};
const expectedDefault = [];
const expectedNamed = [];

const multiFormat = (domain) => ({
  schemaFormat: "application/schema+json;version=draft-07",
  schema: { type: "object", properties: { id: { type: "string" }, domain: { type: "string", const: domain }, version: { type: ["integer", "null"] } } },
});

const VARIANTS = {
  absent: { fields: {}, default: "missing", named: ALL },
  emptyList: { fields: { traits: [] }, default: "none", named: ALL },
  headersOnly: { fields: { traits: [trait("commonHeaders")] }, default: null, named: ["tracing"] },
  refList: { fields: { traits: { $ref: "#/components/x-trait-lists/standard" } }, default: null, named: [] },
  tuple: { fields: { traits: [[trait("commonHeaders"), { region: "eu" }], [trait("tracing"), {}]] }, default: null, named: [] },
  both: { fields: { traits: [trait("commonHeaders"), trait("tracing")] }, default: null, named: [] },
  notArray: { fields: { traits: { headers: { type: "object" } } }, default: "notArray", named: ALL },
  dangling: { fields: { traits: [trait("missing")] }, default: "none", named: ALL },
  inline: { fields: { traits: [{ headers: { type: "object", properties: { node: { type: "string" } } } }] }, default: null, named: ALL },
  alias: { fields: { traits: [trait("platformDefaults"), trait("tracing")] }, default: null, named: [] },
};

const record = (path, variant) => {
  const { fields, default: kind, named } = VARIANTS[variant];
  const at = (k) => (k === "missing" ? path : `${path}.traits`);
  if (kind !== null) expectedDefault.push([at(kind), kind, []]);
  if (named.length > 0) {
    const namedKind = !("traits" in fields) ? "missing" : kind === "notArray" ? "notArray" : "lacks";
    expectedNamed.push([at(namedKind), namedKind, named]);
  }
};

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}Events${i}`;
  const base = `channels.${key}.messages`;

  const changedVariant = i % 7 === 0 ? "absent" : i % 11 === 0 ? "emptyList" : i % 13 === 0 ? "headersOnly" : i % 5 === 0 ? "refList" : i % 3 === 0 ? "tuple" : "both";
  const replayedVariant = i % 9 === 0 ? "notArray" : i % 19 === 0 ? "dangling" : i % 4 === 0 ? "inline" : i % 6 === 0 ? "alias" : "both";

  channels[key] = {
    address: i % 10 === 0 ? null : `retail.cdc.${domain}.event-${i}.v1`,
    description: `Change data capture of ${domain}, partition group ${i}.`,
    messages: {
      changed: { name: `${domain}Changed${i}`, payload: multiFormat(domain), ...VARIANTS[changedVariant].fields },
      replayed: { name: `${domain}Replayed${i}`, payload: multiFormat(domain), ...VARIANTS[replayedVariant].fields },
      shared: { $ref: `#/components/messages/shared${i % SHARED_COUNT}` },
    },
  };
  operations[`publish${key}`] = { action: "send", channel: { $ref: `#/channels/${key}` }, messages: [{ $ref: `#/channels/${key}/messages/changed` }] };
  operations[`receive${key}`] = {
    action: "receive",
    channel: { $ref: `#/channels/${key}` },
    messages: [{ $ref: `#/channels/${key}/messages/replayed` }, { $ref: `#/channels/${key}/messages/shared` }],
  };

  record(`${base}.changed`, changedVariant);
  record(`${base}.replayed`, replayedVariant);
}

for (let s = 0; s < SHARED_COUNT; s++) {
  const variant = s === 3 ? "absent" : s === 4 ? "inline" : "both";
  messages[`shared${s}`] = { name: `shared${s}`, payload: { type: "object" }, ...VARIANTS[variant].fields };
  record(`components.messages.shared${s}`, variant);
}

const byPath = (a, b) => a[0].localeCompare(b[0]);

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Retail Change Data Capture",
      version: "8.0.0",
      description: "Generated document with 400 channels, 800 operations, 806 messages and 1600 message references.",
    },
    channels,
    operations,
    components: {
      messages,
      messageTraits: {
        commonHeaders: { headers: { type: "object", properties: { traceId: { type: "string" } } } },
        tracing: { correlationId: { location: "$message.header#/traceparent" } },
        headersAlias: trait("commonHeaders"),
        platformDefaults: trait("headersAlias"),
      },
      "x-trait-lists": { standard: [trait("commonHeaders"), trait("tracing")] },
    },
  },
  expectedDefault: expectedDefault.sort(byPath),
  expectedNamed: expectedNamed.sort(byPath),
};
