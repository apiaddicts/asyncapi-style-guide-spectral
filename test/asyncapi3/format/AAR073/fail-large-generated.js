const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 6;

const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const channels = {};
const operations = {};
const messages = {};
const expected = [];
const expectedNamed = [];
const NAMED = ["commonHeaders", "tracing"];

const multiFormat = (domain) => ({
  schemaFormat: "application/schema+json;version=draft-07",
  schema: { type: "object", properties: { id: { type: "string" }, domain: { type: "string", const: domain }, version: { type: ["integer", "null"] } } },
});

const VARIANTS = {
  absent: { fields: {}, kind: "missing", applied: [] },
  emptyList: { fields: { traits: [] }, kind: "none", applied: [] },
  headersOnly: { fields: { traits: [trait("commonHeaders")] }, kind: null, applied: ["commonHeaders"] },
  refList: { fields: { traits: { $ref: "#/components/x-trait-lists/standard" } }, kind: null, applied: NAMED },
  tuple: { fields: { traits: [[trait("commonHeaders"), { region: "eu" }], [trait("tracing"), {}]] }, kind: null, applied: NAMED },
  both: { fields: { traits: [trait("commonHeaders"), trait("tracing")] }, kind: null, applied: NAMED },
  notArray: { fields: { traits: { headers: { type: "object" } } }, kind: "notArray" },
  dangling: { fields: { traits: [trait("missing")] }, kind: "none", applied: [] },
  inline: { fields: { traits: [{ headers: { type: "object", properties: { node: { type: "string" } } } }] }, kind: null, applied: [] },
  alias: { fields: { traits: [trait("platformDefaults"), trait("tracing")] }, kind: null, applied: ["platformDefaults", "headersAlias", "commonHeaders", "tracing"] },
};

const record = (path, variant) => {
  const { kind, applied } = VARIANTS[variant];
  if (kind !== null) expected.push([kind === "missing" ? path : `${path}.traits`, kind]);
  if (kind === "notArray") expectedNamed.push([`${path}.traits`, kind]);
  else NAMED.filter((name) => !applied.includes(name)).forEach((name) => expectedNamed.push([kind === "missing" ? path : `${path}.traits`, "trait", name]));
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
  expected: expected.sort(byPath),
  expectedNamed: expectedNamed.sort(byPath),
};
