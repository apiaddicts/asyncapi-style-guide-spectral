const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const LISTED_COUNT = 450;
const ZERO_WIDTH = String.fromCharCode(0x200b);

const VALUES = [
  ["populated", (i) => `Catalogue entry ${i}.`],
  ["empty", () => ""],
  ["empty", () => null],
  ["empty", () => ({})],
  ["empty", () => []],
  ["populated", () => ({ $ref: "#/components/x-texts/owner" })],
  ["empty", () => ({ $ref: "#/components/x-texts/blank" })],
  ["populated", (i) => i],
  ["empty", () => `  ${ZERO_WIDTH}  `],
  ["populated", () => ["catalogue"]],
];

const info = {
  title: "Retail Event Catalogue",
  version: { $ref: "#/components/x-texts/versionAlias" },
  description: `${" ".repeat(200000)}${ZERO_WIDTH}\n`,
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

const DEFAULT_EXPECTED = [["info.description", "empty", "description"]];

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
  fullOption: ["title", "version", "description", ...names].join(","),
  expectedDefault: DEFAULT_EXPECTED,
  expectedFull: [...DEFAULT_EXPECTED, ...expectedFull],
};
