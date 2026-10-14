const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const ZERO_WIDTH = String.fromCharCode(0x200b);

const VALUES = [
  (i) => `Catalogue entry ${i}.`,
  () => "",
  () => null,
  () => ({}),
  () => [],
  () => ({ $ref: "#/components/x-texts/owner" }),
  () => ({ $ref: "#/components/x-texts/blank" }),
  (i) => i,
  () => `  ${ZERO_WIDTH}  `,
  () => ["catalogue"],
];

const info = {
  title: "Retail Event Catalogue",
  version: { $ref: "#/components/x-texts/versionAlias" },
  description: `${" ".repeat(200000)}${ZERO_WIDTH}\n`,
};
for (let i = 0; i < EXTENSION_COUNT; i++) info[`x-catalog-${i}`] = VALUES[i % VALUES.length](i);

const channels = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  channels[`retail.cdc.${domain}.event-${i}.v1`] = {
    description: i % 3 === 0 ? "" : `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${domain}${i}`,
      summary: "",
      message: {
        name: `${domain}Changed${i}`,
        title: "",
        payload: { type: "object", properties: { info: { type: "object", properties: { title: { type: "string" }, version: { type: ["string", "null"] } } } } },
      },
    },
    subscribe: { operationId: `receive${domain}${i}`, message: { $ref: `#/components/messages/shared${i % 4}` } },
  };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, title: "", description: "", payload: { type: "object" } };

module.exports = {
  document: {
    asyncapi: "2.6.0",
    id: "urn:retail:event-catalogue",
    info,
    channels,
    components: {
      messages,
      "x-texts": { versionAlias: { $ref: "#/components/x-texts/version" }, version: "12.0.0", owner: "Retail Platform", blank: "\t" },
    },
  },
  expected: [["info.description", "empty", "description"]],
};
