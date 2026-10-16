const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1200;
const EXTENSION_COUNT = 400;
const IDEOGRAPHIC_SPACE = String.fromCharCode(0x3000);

const contact = {
  name: { $ref: "#/components/x-texts/teamAlias" },
  url: "https://retail.example.io/integration",
  email: `${IDEOGRAPHIC_SPACE.repeat(50000)}\t`,
};
for (let i = 0; i < EXTENSION_COUNT; i++) contact[`x-catalog-${i}`] = i % 2 === 0 ? null : `Catalogue owner ${i}`;

const channels = {};
const operations = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}Changed${i}`;
  channels[key] = {
    address: i % 10 === 0 ? null : `retail.cdc.${domain}.event-${i}.v1`,
    messages: {
      [key]: {
        name: key,
        title: "",
        payload: { type: "object", properties: { contact: { type: "object", properties: { name: { type: "string" }, email: { type: ["string", "null"] } } } } },
        examples: [{ payload: { contact: { name: "", email: "" } } }],
      },
      shared: { $ref: `#/components/messages/shared${i % 4}` },
    },
  };
  operations[`send${key}`] = { action: i % 2 === 0 ? "send" : "receive", channel: { $ref: `#/channels/${key}` }, messages: [{ $ref: `#/channels/${key}/messages/${key}` }] };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, title: "", payload: { $ref: "#/components/schemas/Contact" } };

const document = {
  asyncapi: "3.0.0",
  id: "urn:retail:event-catalogue",
  info: { title: "Retail Event Catalogue", version: "12.0.0", contact },
  channels,
  operations,
  components: {
    messages,
    schemas: { Contact: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } } },
    "x-texts": { teamAlias: { $ref: "#/components/x-texts/team" }, team: "Retail Integration" },
  },
};

const { contact: _, ...infoWithoutContact } = document.info;

module.exports = {
  document,
  expected: [["info.contact.email", "empty", "email"]],
  withoutContact: { ...document, info: { ...infoWithoutContact, "x-contact": contact } },
  expectedWithoutContact: [["info", "noContact"]],
};
