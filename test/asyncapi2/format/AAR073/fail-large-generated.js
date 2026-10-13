const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 6;
const ALL = ["commonHeaders", "tracing"];

const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const channels = {};
const messages = {};
const expectedDefault = [];
const expectedNamed = [];

const objectPayload = (domain) => ({ type: "object", properties: { id: { type: "string" }, domain: { type: "string", const: domain }, version: { type: ["integer", "null"] } } });

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
  const name = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${name}`;

  const publishVariant = i % 7 === 0 ? "absent" : i % 11 === 0 ? "emptyList" : i % 13 === 0 ? "headersOnly" : i % 5 === 0 ? "refList" : i % 3 === 0 ? "tuple" : "both";
  const memberVariant = i % 9 === 0 ? "notArray" : i % 19 === 0 ? "dangling" : i % 4 === 0 ? "inline" : i % 6 === 0 ? "alias" : "both";

  channels[name] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: { operationId: `publish${domain}${i}`, message: { name: `${domain}Changed${i}`, payload: objectPayload(domain), ...VARIANTS[publishVariant].fields } },
    subscribe: {
      operationId: `receive${domain}${i}`,
      message: {
        oneOf: [{ $ref: `#/components/messages/shared${i % SHARED_COUNT}` }, { name: `${domain}Replayed${i}`, payload: objectPayload(domain), ...VARIANTS[memberVariant].fields }],
      },
    },
  };

  record(`${base}.publish.message`, publishVariant);
  record(`${base}.subscribe.message.oneOf.1`, memberVariant);
}

for (let s = 0; s < SHARED_COUNT; s++) {
  const variant = s === 3 ? "absent" : s === 4 ? "inline" : "both";
  messages[`shared${s}`] = { name: `shared${s}`, payload: { type: "object" }, ...VARIANTS[variant].fields };
  record(`components.messages.shared${s}`, variant);
}

const byPath = (a, b) => a[0].localeCompare(b[0]);

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Retail Change Data Capture",
      version: "7.0.0",
      description: "Generated document with 400 channels, 800 operations, 806 messages and 400 message references.",
    },
    channels,
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
