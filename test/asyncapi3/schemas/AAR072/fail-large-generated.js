const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 300;
const SHARED_COUNT = 5;
const AVRO = "application/vnd.apache.avro;version=1.9.0";

const issue = (index, trail, text) => `AAR072: examples[${index}].${trail} ${text}.`;
const channels = {};
const operations = {};
const messages = {};
const expected = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}Event${i}`;
  const base = `channels.${key}.messages`;
  const prefix = domain.slice(0, 3).toUpperCase();

  const payload = { id: `${prefix}-${i}`, amount: i * 1.5, status: "NEW", tags: ["a"] };
  const headers = { traceId: `t-${i}`, attempt: 1 };
  if (i % 7 === 0) {
    payload.amount = -i - 1;
    expected.push([`${base}.changed.examples.0.payload.amount`, issue(0, "payload.amount", "must be >= 0")]);
  }
  if (i % 11 === 0) {
    delete payload.id;
    expected.push([`${base}.changed.examples.0.payload`, issue(0, "payload", "must have required property 'id'")]);
  }
  if (i % 13 === 0) {
    payload.status = "LOST";
    expected.push([`${base}.changed.examples.0.payload.status`, issue(0, "payload.status", 'must be one of: "NEW", "DONE"')]);
  }
  if (i % 17 === 0) {
    headers.attempt = 0;
    expected.push([`${base}.changed.examples.0.headers.attempt`, issue(0, "headers.attempt", "must be >= 1")]);
  }

  const avroPayload = { id: `${prefix}-${i}`, version: i, flags: i % 2 === 0 ? null : { map: { hot: true } } };
  if (i % 5 === 0) {
    avroPayload.version = `v${i}`;
    expected.push([`${base}.changedAvro.examples.0.payload.version`, issue(0, "payload.version", "must be an int")]);
  }
  if (i % 19 === 0) {
    avroPayload.region = "eu";
    expected.push([`${base}.changedAvro.examples.0.payload.region`, issue(0, "payload.region", `is not a field of record '${prefix}Event${i}'`)]);
  }

  channels[key] = {
    address: i % 9 === 0 ? null : `retail.cdc.${domain}.event-${i}.v1`,
    description: `Change data capture of ${domain}, partition group ${i}.`,
    messages: {
      changed: {
        name: `${domain}Changed${i}`,
        traits: [{ $ref: "#/components/messageTraits/kafkaHeaders" }],
        payload: {
          type: "object",
          required: ["id", "amount"],
          properties: {
            id: { type: "string", pattern: `^${prefix}-\\d+$` },
            amount: { type: "number", minimum: 0 },
            status: { enum: ["NEW", "DONE"] },
            tags: { type: "array", maxItems: 3, items: { type: "string" } },
          },
        },
        examples: [{ name: `${domain}Sample${i}`, headers, payload }],
      },
      changedAvro: {
        name: `${domain}Avro${i}`,
        payload: {
          schemaFormat: AVRO,
          schema: {
            type: "record",
            name: `${prefix}Event${i}`,
            namespace: `io.retail.${domain}`,
            fields: [
              { name: "id", type: "string" },
              { name: "version", type: "int" },
              { name: "flags", type: ["null", { type: "map", values: "boolean" }], default: null },
            ],
          },
        },
        examples: [{ payload: avroPayload }],
      },
      shared: { $ref: `#/components/messages/shared${i % SHARED_COUNT}` },
    },
  };
  operations[`publish${prefix}${i}`] = {
    action: i % 2 === 0 ? "send" : "receive",
    channel: { $ref: `#/channels/${key}` },
    messages: [{ $ref: `#/channels/${key}/messages/changed` }, { $ref: `#/channels/${key}/messages/changedAvro` }],
  };
}

for (let s = 0; s < SHARED_COUNT; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, payload: { type: "object", properties: { n: { type: "integer" } } }, examples: [{ payload: { n: s === 2 ? 1.5 : s } }] };
}
expected.push(["components.messages.shared2.examples.0.payload.n", issue(0, "payload.n", "must be integer")]);

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Retail Change Data Capture", version: "7.0.0", description: "Generated document with 300 channels, 300 operations and 605 messages." },
    channels,
    operations,
    components: {
      messages,
      messageTraits: { kafkaHeaders: { headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string" }, attempt: { type: "integer", minimum: 1 } } } } },
    },
  },
  expected,
};
