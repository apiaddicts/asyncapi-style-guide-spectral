const DOMAINS = ["titles", "episodes", "territories", "windows", "royalties", "takedowns", "dubbing", "subtitles"];
const CHANNEL_COUNT = 1200;
const EXTENSION_COUNT = 400;
const IDEOGRAPHIC_SPACE = String.fromCharCode(0x3000);

const license = {
  name: { $ref: "#/components/x-texts/nameAlias" },
  url: `${IDEOGRAPHIC_SPACE.repeat(50000)}\t`,
  identifier: "LicenseRef-Catalogue",
};
for (let i = 0; i < EXTENSION_COUNT; i++) license[`x-territory-${i}`] = i % 2 === 0 ? null : `Territory window ${i}`;

const channels = {};
const operations = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}Changed${i}`;
  channels[key] = {
    address: i % 10 === 0 ? null : `media.cdc.${domain}.event-${i}.v1`,
    messages: {
      [key]: {
        name: key,
        title: "",
        payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string" }, url: { type: ["string", "null"] } } } } },
        examples: [{ payload: { license: { name: "", url: "" } } }],
      },
      shared: { $ref: `#/components/messages/shared${i % 4}` },
    },
  };
  operations[`send${key}`] = { action: i % 2 === 0 ? "send" : "receive", channel: { $ref: `#/channels/${key}` }, messages: [{ $ref: `#/channels/${key}/messages/${key}` }] };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, title: "", payload: { $ref: "#/components/schemas/License" } };

const document = {
  asyncapi: "3.0.0",
  id: "urn:media:catalogue",
  info: { title: "Media Catalogue Events", version: "12.0.0", license },
  channels,
  operations,
  components: {
    messages,
    schemas: { License: { type: "object", properties: { name: { type: "string" }, url: { type: "string" } } } },
    "x-texts": { nameAlias: { $ref: "#/components/x-texts/name" }, name: "Catalogue Distribution License" },
  },
};

const { license: _, ...infoWithoutLicense } = document.info;

module.exports = {
  document,
  expected: [["info.license.url", "empty", "url"]],
  withoutLicense: { ...document, info: { ...infoWithoutLicense, "x-license": license } },
  expectedWithoutLicense: [["info", "noLicense"]],
};
