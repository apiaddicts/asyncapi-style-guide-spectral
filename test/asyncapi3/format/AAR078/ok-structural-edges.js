module.exports = {
  asyncapi: "3.0.0",
  id: "urn:software:entitlements",
  info: {
    title: "",
    version: "1.0.0",
    license: {
      name: 0,
      url: { $ref: "#/components/x-texts/urlAlias" },
      identifier: "",
      "x-spdx-id": null,
    },
    contact: {},
    tags: [{ name: "license", description: "" }],
    "x-license": {},
  },
  license: {},
  "x-license": { name: "", url: "" },
  servers: {
    license: { host: "licensing.software.example.io", pathname: "/license", protocol: "wss", title: "", summary: "" },
  },
  channels: {
    license: {
      address: null,
      title: "",
      messages: {
        license: {
          name: "license",
          title: "",
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string" }, url: { type: ["string", "null"] } } } } },
          },
          examples: [{ name: "", payload: { license: { name: "", url: "" } } }],
        },
      },
    },
    seatLicense: {
      address: "seats/{seatId}/license",
      parameters: { seatId: { description: "" } },
      messages: { licenseChanged: { $ref: "#/components/messages/license" } },
    },
  },
  operations: {
    license: { action: "send", title: "", channel: { $ref: "#/channels/license" }, reply: { channel: { $ref: "#/channels/seatLicense" } } },
    receiveSeatLicense: { action: "receive", channel: { $ref: "#/channels/seatLicense" }, messages: [{ $ref: "#/channels/seatLicense/messages/licenseChanged" }] },
  },
  components: {
    messages: {
      license: { name: "license", title: "", traits: [{ $ref: "#/components/messageTraits/license" }], payload: { $ref: "#/components/schemas/License" } },
    },
    schemas: {
      License: { type: "object", title: "", required: ["name", "url"], properties: { name: { type: "string" }, url: { type: "string" } } },
    },
    messageTraits: { license: { headers: { type: "object", properties: { license: { type: "string" } } } } },
    operationTraits: { license: { title: "", summary: "" } },
    replies: { license: { channel: { $ref: "#/channels/license" } } },
    tags: { license: { name: "license", description: "" } },
    "x-licenses": { empty: {}, blank: { name: "", url: " " } },
    "x-texts": { urlAlias: { $ref: "#/components/x-texts/url" }, url: "https://software.example.io/legal/eula" },
    license: { name: "", url: "" },
  },
};
