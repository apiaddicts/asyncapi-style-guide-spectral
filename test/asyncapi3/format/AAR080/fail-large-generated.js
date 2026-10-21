const DOMAINS = ["meters", "tariffs", "outages", "invoices", "contracts", "readings", "alerts", "payments"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const NAME = "Utility Data Sharing Agreement, Edition 2026, ".repeat(10000);

const license = { name: NAME, url: "https://utility.example.io/legal/data-sharing", identifier: "CC-BY-4.0" };
for (let i = 0; i < EXTENSION_COUNT; i++) license[`x-region-${i}`] = i % 3 === 0 ? "CC BY 4.0" : `Region ${i}`;

const channels = {};
const operations = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  channels[`${domain}${i}`] = {
    address: i % 10 === 0 ? null : `utility.cdc.${domain}.event-${i}.v1`,
    messages: {
      [`${domain}Changed${i}`]: {
        name: `${domain}Changed${i}`,
        payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string", enum: ["CC BY 4.0", "Proprietary"] } } } } },
        examples: [{ payload: { license: { name: i % 2 === 0 ? "Creative Commons Attribution 4.0" : "MIT License" } } }],
      },
      shared: { $ref: `#/components/messages/shared${i % 4}` },
    },
  };
  operations[`send${domain}${i}`] = { action: "send", channel: { $ref: `#/channels/${domain}${i}` } };
  operations[`receive${domain}${i}`] = { action: "receive", channel: { $ref: `#/channels/${domain}${i}` }, messages: [{ $ref: `#/channels/${domain}${i}/messages/shared` }] };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, payload: { $ref: "#/components/schemas/License" } };

const document = {
  asyncapi: "3.0.0",
  id: "urn:utility:data-sharing",
  info: { title: "Utility Data Sharing Events", version: "8.0.0", license },
  channels,
  operations,
  components: {
    messages,
    schemas: { License: { type: "object", properties: { name: { type: "string", default: "CC BY 4.0" }, url: { type: "string" } } } },
  },
};

module.exports = {
  document,
  expected: [["info.license.name", "invalid", `${NAME.slice(0, 77)}...`]],
  withSpdxName: { ...document, info: { ...document.info, license: { ...license, name: "CC-BY-4.0" } } },
  withLowerCaseName: { ...document, info: { ...document.info, license: { ...license, name: "cc by 4.0" } } },
  expectedLowerCase: [["info.license.name", "suggest", "cc by 4.0", "CC-BY-4.0"]],
};
