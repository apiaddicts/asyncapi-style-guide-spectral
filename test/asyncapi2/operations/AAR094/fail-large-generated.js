const DOMAINS = ["orders", "payments", "shipments", "returns", "stock", "prices", "customers", "stores", "carts", "invoices"];
const CHANNEL_COUNT = 600;
const SHARED_COUNT = 50;
const ARCHIVE_COUNT = 200;

const channels = {};
const shared = {};
const expected = [];
const message = (domain) => ({ $ref: `#/components/messages/${domain}` });
const operation = (domain, index, extra = {}) => ({ operationId: `${domain}Operation${index}`, summary: `Exchange ${domain} event number ${index}.`, message: message(domain), ...extra });

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    shared[name] = { publish: { operationId: `publishShared${i}` } };
    expected.push([`${path}.publish`, "missing", name, "publish"]);
  } else if (i % 5 === 3) {
    shared[name] = { subscribe: operation("orders", i, { message: { oneOf: [] } }) };
    expected.push([`${path}.subscribe.message`, "empty", name, "subscribe"]);
  } else {
    shared[name] = { publish: operation("orders", i), subscribe: operation("orders", i) };
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-retail.cdc.${domain}.edge${c}.v1` : `retail.cdc.${domain}.event${c}.v1`;
  const path = `channels.${name}`;
  switch (c % 9) {
    case 0:
      channels[name] = { description: `${domain} events.`, publish: operation(domain, c), subscribe: operation(domain, c, { message: { oneOf: [message(domain), message("orders")] } }) };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { publish: { operationId: `publish${c}` }, subscribe: operation(domain, c) };
        expected.push([`${path}.publish`, "missing", name, "publish"]);
      } else {
        channels[name] = { publish: operation(domain, c) };
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { subscribe: operation(domain, c, { message: { $ref: `#/components/messages/retired${c}` } }) };
        expected.push([`${path}.subscribe.message`, "empty", name, "subscribe"]);
      } else {
        channels[name] = { subscribe: operation(domain, c, { message: { oneOf: { $ref: "#/components/x-message-lists/orders" } } }) };
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = { publish: null };
        expected.push([`${path}.publish`, "unusable", name, "publish"]);
      } else {
        channels[name] = { publish: { ...operation(domain, c), "x-team": domain } };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { publish: operation(domain, c, { message: { oneOf: [null] } }), subscribe: operation(domain, c, { message: null }) };
        expected.push([`${path}.publish.message`, "empty", name, "publish"]);
        expected.push([`${path}.subscribe.message`, "empty", name, "subscribe"]);
      } else {
        channels[name] = { subscribe: operation(domain, c, { message: { oneOf: [null, message(domain)] } }) };
      }
      break;
    case 6:
      if (c % 12 === 6) {
        channels[name] = { subscribe: { $ref: `#/components/x-operations/retired${c}` } };
        expected.push([`${path}.subscribe`, "unusable", name, "subscribe"]);
      } else {
        channels[name] = { subscribe: { $ref: `./partners/${domain}.yaml#/operations/receive` } };
      }
      break;
    case 7:
      if (c % 14 === 7) {
        channels[name] = { publish: { operationId: `publishTraits${c}`, traits: [{ $ref: "#/components/operationTraits/withMessage" }] } };
        expected.push([`${path}.publish`, "missing", name, "publish"]);
      } else {
        channels[name] = { publish: operation(domain, c, { traits: [{ $ref: "#/components/operationTraits/described" }] }) };
      }
      break;
    default:
      channels[name] = { subscribe: { operationId: `receiveExternal${c}`, message: { $ref: `./partners/${domain}.yaml#/messages/event` } } };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    shared[name] = { publish: operation("orders", i, { message: "orders" }) };
    expected.push([`components.channels.${name}.publish.message`, "empty", name, "publish"]);
  } else {
    shared[name] = { publish: operation("orders", i) };
  }
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Quality Retail Platform Backbone", version: "9.0.0", description: "Generated document with 600 channels and 250 components channels." },
    servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    components: {
      channels: shared,
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { name: domain, payload: { type: "object", properties: { id: { type: "string" }, note: { type: ["string", "null"] } } } }])),
      "x-message-lists": { orders: [message("orders")] },
      operationTraits: {
        withMessage: { message: message("orders") },
        described: { summary: "Process retail events." },
      },
    },
  },
  expected,
};
