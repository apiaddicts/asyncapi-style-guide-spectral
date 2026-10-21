const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const NBSP = String.fromCharCode(0xa0);

const VALUES = [
  (i) => `Catalogue entry ${i}.`,
  () => "",
  () => null,
  () => ({}),
  () => [],
  () => ({ $ref: "#/components/x-texts/owner" }),
  () => ({ $ref: "#/components/x-texts/blank" }),
  (i) => i % 2 === 0,
  () => NBSP.repeat(3),
  () => ({ $ref: "#/components/externalDocs/catalogue" }),
];

const info = {
  title: "Retail Event Catalogue",
  version: "12.0.0",
  description: NBSP.repeat(100000),
  tags: Array.from({ length: 2000 }, (_, i) => ({ name: `domain-${i}` })),
  externalDocs: { $ref: "#/components/externalDocs/catalogueAlias" },
};
for (let i = 0; i < EXTENSION_COUNT; i++) info[`x-catalog-${i}`] = VALUES[i % VALUES.length](i);

const channels = {};
const operations = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}Event${i}`;
  channels[key] = {
    address: i % 5 === 0 ? null : `retail.cdc.${domain}.event-${i}.v1`,
    title: "",
    description: i % 3 === 0 ? "" : `Change data capture of ${domain}, partition group ${i}.`,
    messages: {
      changed: { name: `${domain}Changed${i}`, title: "", payload: { type: "object", properties: { info: { type: "object", properties: { title: { type: "string" } } } } } },
      shared: { $ref: `#/components/messages/shared${i % 4}` },
    },
  };
  operations[`publish${key}`] = { action: "send", title: "", channel: { $ref: `#/channels/${key}` }, messages: [{ $ref: `#/channels/${key}/messages/changed` }] };
  operations[`receive${key}`] = { action: "receive", channel: { $ref: `#/channels/${key}` } };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, title: "", description: "", payload: { type: "object" } };

module.exports = {
  document: {
    asyncapi: "3.0.0",
    id: "urn:retail:event-catalogue",
    info,
    channels,
    operations,
    components: {
      messages,
      externalDocs: { catalogueAlias: { $ref: "#/components/externalDocs/catalogue" }, catalogue: { url: "https://retail.example.io/catalogue" } },
      "x-texts": { owner: "Retail Platform", blank: "\n" },
    },
  },
  expected: [["info.description", "empty", "description"]],
};
