const DOMAINS = ["titles", "episodes", "territories", "windows", "royalties", "takedowns", "dubbing", "subtitles"];
const CHANNEL_COUNT = 1500;
const EXTENSION_COUNT = 400;
const NAME = "Media Catalogue Licence, Version 2026, ".repeat(10000);

const license = { name: NAME, url: "https://media.example.io/legal/catalogue-license", identifier: "Apache-2.0" };
for (let i = 0; i < EXTENSION_COUNT; i++) license[`x-territory-${i}`] = i % 3 === 0 ? "Apache 2.0" : `Territory window ${i}`;

const channels = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  channels[`media.cdc.${domain}.event-${i}.v1`] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${domain}${i}`,
      message: {
        name: `${domain}Changed${i}`,
        payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string", enum: ["Apache 2.0", "Proprietary"] } } } } },
        examples: [{ payload: { license: { name: i % 2 === 0 ? "Apache License 2.0" : "MIT License" } } }],
      },
    },
    subscribe: { operationId: `receive${domain}${i}`, message: { $ref: `#/components/messages/shared${i % 4}` } },
  };
}

const messages = {};
for (let s = 0; s < 4; s++) messages[`shared${s}`] = { name: `shared${s}`, payload: { $ref: "#/components/schemas/License" } };

const document = {
  asyncapi: "2.6.0",
  id: "urn:media:catalogue",
  info: { title: "Media Catalogue Events", version: "12.0.0", license },
  channels,
  components: {
    messages,
    schemas: { License: { type: "object", properties: { name: { type: "string", default: "Apache 2.0" }, url: { type: "string" } } } },
  },
};

module.exports = {
  document,
  expected: [["info.license.name", "invalid", `${NAME.slice(0, 77)}...`]],
  withSpdxName: { ...document, info: { ...document.info, license: { ...license, name: "CC-BY-NC-SA-4.0" } } },
  withLowerCaseName: { ...document, info: { ...document.info, license: { ...license, name: "cc by nc sa 4.0" } } },
  expectedLowerCase: [["info.license.name", "suggest", "cc by nc sa 4.0", "CC-BY-NC-SA-4.0"]],
};
