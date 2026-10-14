const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const LISTED_COUNT = 450;
const NBSP = String.fromCharCode(0xa0);

const VALUES = [
  ["populated", (i) => `Catalogue entry ${i}.`],
  ["empty", () => ""],
  ["empty", () => null],
  ["empty", () => ({})],
  ["empty", () => []],
  ["populated", () => ({ $ref: "#/components/x-texts/owner" })],
  ["empty", () => ({ $ref: "#/components/x-texts/blank" })],
  ["populated", (i) => i % 2 === 0],
  ["empty", () => NBSP.repeat(3)],
  ["populated", () => ({ $ref: "#/components/externalDocs/catalogue" })],
];

const info = {
  title: "Retail Event Catalogue",
  version: "12.0.0",
  description: NBSP.repeat(100000),
  tags: Array.from({ length: 2000 }, (_, i) => ({ name: `domain-${i}` })),
  externalDocs: { $ref: "#/components/externalDocs/catalogueAlias" },
};
const expectedFull = [];
const names = [];

for (let i = 0; i < LISTED_COUNT; i++) {
  const name = `x-catalog-${i}`;
  names.push(name);
  if (i >= EXTENSION_COUNT) {
    expectedFull.push(["info", "missing", name]);
    continue;
  }
  const [state, value] = VALUES[i % VALUES.length];
  info[name] = value(i);
  if (state === "empty") expectedFull.push([`info.${name}`, "empty", name]);
}

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

const DEFAULT_EXPECTED = [["info.description", "empty", "description"]];

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
  fullOption: ["title", "version", "description", "tags", "externalDocs", ...names].join(","),
  expectedDefault: DEFAULT_EXPECTED,
  expectedFull: [...DEFAULT_EXPECTED, ...expectedFull],
};
