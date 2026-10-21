const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 6;

const channels = {};
const operations = {};
const messages = {};
const expectedPaths = [];

const objectPayload = (domain) => ({ type: "object", properties: { id: { type: "string" }, domain: { type: "string", const: domain }, version: { type: ["integer", "null"] } } });
const avroPayload = (domain, i) => ({
  schemaFormat: "application/vnd.apache.avro;version=1.9.0",
  schema: { type: "record", name: `Changed${i}`, namespace: `io.retail.${domain}`, fields: [{ name: "id", type: "string" }, { name: "note", type: ["null", "string"], default: null }] },
});

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}Event${i}`;
  const base = `channels.${key}.messages`;

  const changedKind = i % 7 === 0 ? "missing" : i % 11 === 0 ? "empty" : i % 13 === 0 ? "noSample" : "ok";
  const traitOverride = i % 17 === 0;
  const pingKind = i % 9 === 0 ? "missing" : i % 19 === 0 ? "emptyRef" : "ok";

  const changed = {
    name: `${domain}Changed${i}`,
    payload: i % 2 === 0 ? objectPayload(domain) : avroPayload(domain, i),
    traits: [{ $ref: "#/components/messageTraits/kafkaEnvelope" }],
  };
  if (changedKind === "empty") changed.examples = [];
  if (changedKind === "noSample") changed.examples = [{ name: `${domain}Sample${i}`, summary: "Missing its payload." }];
  if (changedKind === "ok") changed.examples = [{ name: `${domain}Sample${i}`, payload: { id: `${domain}-${i}`, domain, version: null } }];
  if (traitOverride) changed.traits.push({ $ref: "#/components/messageTraits/clearedExamples" });

  const ping = { name: `${domain}Ping${i}`, headers: { type: "object", properties: { node: { type: "string" } } } };
  if (pingKind === "emptyRef") ping.examples = { $ref: "#/components/x-example-sets/empty" };
  if (pingKind === "ok") ping.examples = [{ headers: { node: `edge-${i}` } }];

  channels[key] = {
    address: i % 10 === 0 ? null : `retail.cdc.${domain}.event-${i}.v1`,
    description: `Change data capture of ${domain}, partition group ${i}.`,
    messages: { changed, ping, shared: { $ref: `#/components/messages/shared${i % SHARED_COUNT}` } },
  };
  operations[`publish${key}`] = {
    action: "send",
    channel: { $ref: `#/channels/${key}` },
    messages: [{ $ref: `#/channels/${key}/messages/changed` }, { $ref: `#/channels/${key}/messages/shared` }],
  };
  operations[`receive${key}`] = {
    action: "receive",
    channel: { $ref: `#/channels/${key}` },
    messages: [{ $ref: `#/channels/${key}/messages/ping` }],
    reply: { address: { location: "$message.header#/replyTo" }, messages: [{ $ref: `#/channels/${key}/messages/shared` }] },
  };

  if (changedKind === "missing") expectedPaths.push(traitOverride ? `${base}.changed.traits.1` : `${base}.changed`);
  else if (changedKind !== "ok") expectedPaths.push(`${base}.changed.examples`);
  if (pingKind === "missing") expectedPaths.push(`${base}.ping`);
  if (pingKind === "emptyRef") expectedPaths.push(`${base}.ping.examples`);
}

for (let s = 0; s < SHARED_COUNT; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, payload: { type: "object" }, ...(s === 3 ? {} : { examples: [{ payload: { shared: s } }] }) };
}
expectedPaths.push("components.messages.shared3");

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Retail Change Data Capture",
      version: "7.0.0",
      description: "Generated document with 400 channels, 800 operations, 806 messages and 2,000 message references.",
    },
    channels,
    operations,
    components: {
      messages,
      messageTraits: {
        kafkaEnvelope: { headers: { type: "object", properties: { traceId: { type: "string" } } } },
        clearedExamples: { examples: null },
      },
      "x-example-sets": { empty: [] },
    },
  },
  expectedPaths: expectedPaths.sort(),
};
