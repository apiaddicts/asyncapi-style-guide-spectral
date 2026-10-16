const DOMAINS = ["titles", "episodes", "territories", "windows", "royalties", "takedowns", "dubbing", "subtitles"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const ZERO_WIDTH = String.fromCharCode(0x200b);

const license = {
  name: `${" ".repeat(200000)}${ZERO_WIDTH}\n`,
  url: { $ref: "#/components/x-texts/urlAlias" },
  identifier: "LicenseRef-Catalogue",
};
for (let i = 0; i < EXTENSION_COUNT; i++) license[`x-territory-${i}`] = i % 3 === 0 ? "" : `Territory window ${i}`;

const channels = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  channels[`media.cdc.${domain}.event-${i}.v1`] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${domain}${i}`,
      message: {
        name: `${domain}Changed${i}`,
        title: "",
        payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string" }, url: { type: ["string", "null"] } } } } },
        examples: [{ payload: { license: { name: "", url: "" } } }],
      },
    },
    subscribe: { operationId: `receive${domain}${i}`, message: { $ref: `#/components/messages/shared${i % 4}` } },
  };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, title: "", payload: { $ref: "#/components/schemas/License" } };

const document = {
  asyncapi: "2.6.0",
  id: "urn:media:catalogue",
  info: { title: "Media Catalogue Events", version: "12.0.0", license },
  channels,
  components: {
    messages,
    schemas: { License: { type: "object", properties: { name: { type: "string" }, url: { type: "string" } } } },
    "x-texts": { urlAlias: { $ref: "#/components/x-texts/url" }, url: "https://media.example.io/legal/catalogue-license" },
  },
};

const { license: _, ...infoWithoutLicense } = document.info;

module.exports = {
  document,
  expected: [["info.license.name", "empty", "name"]],
  withoutLicense: { ...document, info: infoWithoutLicense, license },
  expectedWithoutLicense: [["info", "noLicense"]],
};
