const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const ZERO_WIDTH = String.fromCharCode(0x200b);

const contact = {
  name: `${" ".repeat(200000)}${ZERO_WIDTH}\n`,
  url: "https://retail.example.io/integration",
  email: { $ref: "#/components/x-texts/emailAlias" },
};
for (let i = 0; i < EXTENSION_COUNT; i++) contact[`x-catalog-${i}`] = i % 3 === 0 ? "" : `Catalogue owner ${i}`;

const channels = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  channels[`retail.cdc.${domain}.event-${i}.v1`] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${domain}${i}`,
      message: {
        name: `${domain}Changed${i}`,
        title: "",
        payload: { type: "object", properties: { contact: { type: "object", properties: { name: { type: "string" }, email: { type: ["string", "null"] } } } } },
        examples: [{ payload: { contact: { name: "", email: "" } } }],
      },
    },
    subscribe: { operationId: `receive${domain}${i}`, message: { $ref: `#/components/messages/shared${i % 4}` } },
  };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, title: "", payload: { $ref: "#/components/schemas/Contact" } };

const document = {
  asyncapi: "2.6.0",
  id: "urn:retail:event-catalogue",
  info: { title: "Retail Event Catalogue", version: "12.0.0", contact },
  channels,
  components: {
    messages,
    schemas: { Contact: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } } },
    "x-texts": { emailAlias: { $ref: "#/components/x-texts/email" }, email: "retail-integration@retail.example.io" },
  },
};

const { contact: _, ...infoWithoutContact } = document.info;

module.exports = {
  document,
  expected: [["info.contact.name", "empty", "name"]],
  withoutContact: { ...document, info: infoWithoutContact, contact },
  expectedWithoutContact: [["info", "noContact"]],
};
