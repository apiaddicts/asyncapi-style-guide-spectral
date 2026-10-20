const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 6;

const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const channels = {};
const messages = {};
const expected = [];
const expectedNamed = [];
const NAMED = ["commonHeaders", "tracing"];

const objectPayload = (domain) => ({ type: "object", properties: { id: { type: "string" }, domain: { type: "string", const: domain }, version: { type: ["integer", "null"] } } });

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
  expected: expected.sort(byPath),
  expectedNamed: expectedNamed.sort(byPath),
};
