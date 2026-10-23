const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 6;

const channels = {};
const messages = {};
const expectedPaths = [];

const objectPayload = (domain) => ({ type: "object", properties: { id: { type: "string" }, domain: { type: "string", const: domain }, version: { type: ["integer", "null"] } } });

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const name = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${name}`;

  const publishKind = i % 7 === 0 ? "missing" : i % 11 === 0 ? "empty" : i % 13 === 0 ? "noSample" : "ok";
  const traitOverride = i % 17 === 0;
  const memberKind = i % 9 === 0 ? "missingHeaders" : i % 19 === 0 ? "emptyRef" : i % 5 === 0 ? "headersOk" : "ok";

  const publishMessage = {
    name: `${domain}Changed${i}`,
    payload: objectPayload(domain),
    traits: [{ $ref: "#/components/messageTraits/kafkaEnvelope" }],
  };
  if (publishKind === "empty") publishMessage.examples = [];
  if (publishKind === "noSample") publishMessage.examples = [{ name: `${domain}Sample${i}`, summary: "Missing its payload." }];
  if (publishKind === "ok") publishMessage.examples = [{ name: `${domain}Sample${i}`, payload: { id: `${domain}-${i}`, domain, version: null } }];
  if (traitOverride) publishMessage.traits.push({ $ref: "#/components/messageTraits/clearedExamples" });

  let member;
  if (memberKind === "missingHeaders") {
    member = { name: `${domain}Ping${i}`, headers: { type: "object", properties: { node: { type: "string" } } } };
  } else if (memberKind === "emptyRef") {
    member = { name: `${domain}Replayed${i}`, payload: objectPayload(domain), examples: { $ref: "#/components/x-example-sets/empty" } };
  } else if (memberKind === "headersOk") {
    member = { name: `${domain}Ping${i}`, headers: { type: "object" }, examples: [{ headers: { node: `edge-${i}` } }] };
  } else {
    member = { name: `${domain}Replayed${i}`, payload: objectPayload(domain), examples: { $ref: "#/components/x-example-sets/replayed" } };
  }

  channels[name] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: { operationId: `publish${domain}${i}`, message: publishMessage },
    subscribe: {
      operationId: `receive${domain}${i}`,
      message: { oneOf: [{ $ref: `#/components/messages/shared${i % SHARED_COUNT}` }, member] },
    },
  };

  if (traitOverride) expectedPaths.push(`${base}.publish.message.traits.1`);
  else if (publishKind === "missing") expectedPaths.push(`${base}.publish.message`);
  else if (publishKind !== "ok") expectedPaths.push(`${base}.publish.message.examples`);
  if (memberKind === "missingHeaders") expectedPaths.push(`${base}.subscribe.message.oneOf.1`);
  if (memberKind === "emptyRef") expectedPaths.push(`${base}.subscribe.message.oneOf.1.examples`);
}

for (let s = 0; s < SHARED_COUNT; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, payload: { type: "object" }, ...(s === 3 ? {} : { examples: [{ payload: { shared: s } }] }) };
}
expectedPaths.push("components.messages.shared3");

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
        kafkaEnvelope: { headers: { type: "object", properties: { traceId: { type: "string" } } } },
        clearedExamples: { examples: null },
      },
      "x-example-sets": { empty: [], replayed: [{ payload: { id: "replayed", domain: "orders", version: 3 } }] },
    },
  },
  expectedPaths: expectedPaths.sort(),
};
