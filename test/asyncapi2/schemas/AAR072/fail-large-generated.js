const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 300;
const SHARED_COUNT = 5;
const AVRO = "application/vnd.apache.avro;version=1.9.0";

const issue = (index, trail, text) => `AAR072: examples[${index}].${trail} ${text}.`;
const channels = {};
const messages = {};
const expected = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const name = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${name}`;
  const prefix = domain.slice(0, 3).toUpperCase();

  const payload = { id: `${prefix}-${i}`, amount: i * 1.5, status: "NEW", tags: ["a"] };
  if (i % 7 === 0) {
    payload.amount = -i - 1;
    expected.push([`${base}.publish.message.examples.0.payload.amount`, issue(0, "payload.amount", "must be >= 0")]);
  }
  if (i % 11 === 0) {
    delete payload.id;
    expected.push([`${base}.publish.message.examples.0.payload`, issue(0, "payload", "must have required property 'id'")]);
  }
  if (i % 13 === 0) {
    payload.status = "LOST";
    expected.push([`${base}.publish.message.examples.0.payload.status`, issue(0, "payload.status", 'must be one of: "NEW", "DONE"')]);
  }
  if (i % 17 === 0) {
    payload.tags = ["a", "b", "c", "d"];
    expected.push([`${base}.publish.message.examples.0.payload.tags`, issue(0, "payload.tags", "must not have more than 3 items")]);
  }

  const avroPayload = { id: `${prefix}-${i}`, version: i, flags: i % 2 === 0 ? null : { map: { hot: true } } };
  if (i % 5 === 0) {
    avroPayload.version = `v${i}`;
    expected.push([`${base}.subscribe.message.oneOf.1.examples.0.payload.version`, issue(0, "payload.version", "must be an int")]);
  }
  if (i % 19 === 0) {
    avroPayload.region = "eu";
    expected.push([`${base}.subscribe.message.oneOf.1.examples.0.payload.region`, issue(0, "payload.region", `is not a field of record '${prefix}Event${i}'`)]);
  }

  channels[name] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${prefix}${i}`,
      message: {
        name: `${domain}Changed${i}`,
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
        examples: [{ name: `${domain}Sample${i}`, payload }],
      },
    },
    subscribe: {
      operationId: `receive${prefix}${i}`,
      message: {
        oneOf: [
          { $ref: `#/components/messages/shared${i % SHARED_COUNT}` },
          {
            name: `${domain}Avro${i}`,
            schemaFormat: AVRO,
            payload: {
              type: "record",
              name: `${prefix}Event${i}`,
              namespace: `io.retail.${domain}`,
              fields: [
                { name: "id", type: "string" },
                { name: "version", type: "int" },
                { name: "flags", type: ["null", { type: "map", values: "boolean" }], default: null },
              ],
            },
            examples: [{ payload: avroPayload }],
          },
        ],
      },
    },
  };
}

for (let s = 0; s < SHARED_COUNT; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, payload: { type: "object", properties: { n: { type: "integer" } } }, examples: [{ payload: { n: s === 2 ? 1.5 : s } }] };
}
expected.push(["components.messages.shared2.examples.0.payload.n", issue(0, "payload.n", "must be an integer")]);

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Retail Change Data Capture", version: "7.0.0", description: "Generated document with 300 channels, 600 operations and 905 messages." },
    channels,
    components: { messages },
  },
  expected,
};
