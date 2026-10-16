const DOMAINS = ["orders", "payments", "shipments", "customers", "inventory", "invoices", "returns", "loyalty"];
const CHANNEL_COUNT = 400;
const SHARED_COUNT = 20;

const channels = {};
const schemas = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `retail.cdc.${domain}.event-${i}.v1`;
  const reference = i % 7 === 0 ? `${domain}_reference` : `${domain}Reference`;
  const line = i % 11 === 0 ? `Line${i}` : `line${i}`;
  const trace = i % 13 === 0 ? `trace-${i}` : `trace${i}`;
  const amount = i % 17 === 0 ? `amount_${i}` : `amount${i}`;

  channels[key] = {
    description: `Events of the ${domain} domain, partition group ${i}.`,
    publish: {
      operationId: `publishEvent${i}`,
      message: {
        messageId: `${domain}Event${i}`,
        headers: { type: "object", properties: { correlationId: { type: "string" }, [trace]: { type: "string" } } },
        payload: {
          type: "object",
          properties: {
            eventId: { type: "string", format: "uuid" },
            [reference]: { type: "string" },
            lines: { type: "array", items: { type: "object", properties: { [line]: { type: "integer" }, quantity: { type: "integer" } } } },
            shared: { $ref: `#/components/schemas/Shared${i % SHARED_COUNT}` },
          },
        },
      },
    },
    subscribe: {
      operationId: `receiveEvent${i}`,
      message: {
        messageId: `${domain}Snapshot${i}`,
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: {
          type: "record",
          name: `Snapshot${i}`,
          namespace: `com.retail.${domain}`,
          fields: [
            { name: "eventId", type: "string" },
            { name: amount, type: ["null", "double"], default: null },
          ],
        },
      },
    },
  };

  const base = ["channels", key];
  if (i % 7 === 0) expectedPaths.push([...base, "publish", "message", "payload", "properties", reference].join("."));
  if (i % 11 === 0) expectedPaths.push([...base, "publish", "message", "payload", "properties", "lines", "items", "properties", line].join("."));
  if (i % 13 === 0) expectedPaths.push([...base, "publish", "message", "headers", "properties", trace].join("."));
  if (i % 17 === 0) expectedPaths.push([...base, "subscribe", "message", "payload", "fields", "1", "name"].join("."));
}

for (let s = 0; s < SHARED_COUNT; s++) {
  const code = s === 5 ? "Shared_Code" : "sharedCode";
  schemas[`Shared${s}`] = { type: "object", properties: { sharedId: { type: "string" }, [code]: { type: "string" } } };
  if (s === 5) expectedPaths.push(`components.schemas.Shared${s}.properties.${code}`);
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: {
      title: "Retail Event Backbone",
      version: "5.0.0",
      description: "Generated document with 400 channels, 800 messages and more than 3,000 schema properties and Avro fields.",
    },
    channels,
    components: { schemas },
  },
  expectedPaths: expectedPaths.sort(),
};
