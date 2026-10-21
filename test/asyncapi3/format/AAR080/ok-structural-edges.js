module.exports = {
  asyncapi: "3.0.0",
  id: "urn:software:entitlements",
  info: {
    title: "Software Entitlement Events",
    version: "1.0.0",
    license: { name: { $ref: "#/components/x-texts/spdx" }, url: "https://software.example.io/legal/eula" },
    License: { name: "Apache 2.0" },
    licence: { name: "Proprietary" },
    contact: { name: "MIT License" },
    tags: [{ name: "Apache 2.0", description: "License tag." }],
    externalDocs: { description: "Apache License 2.0", url: "https://software.example.io/legal" },
    "x-license": { name: "GNU GPL v3" },
  },
  license: { name: "Commercial" },
  "x-license": { name: "Apache License 2.0", url: "" },
  servers: {
    license: {
      host: "licensing.software.example.io",
      pathname: "/license",
      protocol: "wss",
      title: "Apache 2.0",
      summary: "MIT License",
      variables: { license: { enum: ["Apache 2.0", "MIT License"], default: "Apache 2.0" } },
      tags: [{ name: "Apache 2.0" }],
    },
  },
  channels: {
    license: {
      address: null,
      title: "Apache 2.0",
      messages: {
        license: {
          name: "license",
          title: "Apache 2.0",
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string", default: "Apache 2.0" } } } } },
          },
          examples: [{ name: "license", payload: { license: { name: "Apache License 2.0" } }, headers: { license: "MIT License" } }],
        },
        licenseAvro: {
          name: "licenseAvro",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: { type: "record", name: "License", fields: [{ name: "name", type: { type: "enum", name: "LicenseName", symbols: ["APACHE_2", "MIT_LICENSE"] }, default: "APACHE_2" }] },
          },
        },
      },
    },
    seatLicense: {
      address: "seats/{license}/license",
      parameters: { license: { description: "Proprietary", enum: ["Apache 2.0", "MIT License"] } },
      messages: { licenseChanged: { $ref: "#/components/messages/license" } },
    },
  },
  operations: {
    license: { action: "send", title: "Apache 2.0", channel: { $ref: "#/channels/license" }, reply: { channel: { $ref: "#/channels/seatLicense" } }, tags: [{ name: "Proprietary" }] },
    receiveSeatLicense: { action: "receive", channel: { $ref: "#/channels/seatLicense" }, messages: [{ $ref: "#/channels/seatLicense/messages/licenseChanged" }] },
  },
  components: {
    messages: {
      license: {
        name: "license",
        title: "Licence",
        traits: [{ $ref: "#/components/messageTraits/license" }],
        payload: { $ref: "#/components/schemas/License" },
        bindings: { kafka: { key: { type: "string", enum: ["Apache 2.0"] }, bindingVersion: "0.5.0" } },
      },
    },
    schemas: {
      License: { type: "object", title: "License", required: ["name"], properties: { name: { type: "string", enum: ["Apache License 2.0", 42, null] }, url: { type: ["string", "null"] } } },
    },
    messageTraits: { license: { headers: { type: "object", properties: { license: { type: "string", default: "Proprietary" } } }, examples: [{ headers: { license: "Apache 2.0" } }] } },
    operationTraits: { license: { title: "Apache 2.0", summary: "MIT License" } },
    replies: { license: { channel: { $ref: "#/channels/license" } } },
    tags: { license: { name: "Apache 2.0", description: "Proprietary" } },
    externalDocs: { license: { description: "Apache License 2.0", url: "https://software.example.io/legal" } },
    "x-licenses": { legacy: { name: "Mozilla Public License 2.0" }, broken: { name: 42 }, list: [{ name: "Apache 2.0" }] },
    "x-texts": { spdx: "LGPL-2.1-or-later" },
  },
};
