module.exports = {
  asyncapi: "2.6.0",
  id: "urn:software:entitlements",
  info: {
    title: "Software Entitlement Events",
    version: "1.0.0",
    license: {
      name: { $ref: "#/components/x-texts/nameAlias" },
      url: { $ref: "./shared/licenses.yaml#/eula/url" },
      identifier: "",
      "x-spdx-id": "",
      "x-legal": null,
    },
    "x-license": {},
    "x-licenses": [{ name: "", url: "" }],
    contact: {},
  },
  license: {},
  "x-license": { name: "", url: "" },
  tags: [{ name: "license", description: "" }],
  servers: {
    license: { url: "mqtts://licensing.software.example.io:8883", protocol: "secure-mqtt", description: "" },
  },
  channels: {
    license: {
      description: "",
      publish: {
        operationId: "license",
        summary: "",
        message: {
          name: "license",
          title: "",
          payload: {
            type: "object",
            properties: {
              license: { type: "object", properties: { name: { type: "string", description: "" }, url: { type: ["string", "null"] } } },
              name: { type: "string" },
              url: { type: "string" },
            },
          },
          examples: [{ name: "", payload: { license: { name: "", url: "" }, name: "", url: "" } }],
        },
      },
    },
    "seats/{seatId}/license": {
      parameters: { seatId: { description: "", schema: { type: "string" } } },
      subscribe: { operationId: "receiveSeatLicense", message: { $ref: "#/components/messages/license" } },
    },
  },
  components: {
    messages: {
      license: { name: "license", title: "", traits: [{ $ref: "#/components/messageTraits/license" }], payload: { $ref: "#/components/schemas/License" } },
    },
    schemas: {
      License: { type: "object", title: "", required: ["name", "url"], properties: { name: { type: "string" }, url: { type: "string" } } },
      license: { type: "null" },
    },
    messageTraits: { license: { headers: { type: "object", properties: { license: { type: "string" } } } } },
    "x-licenses": { empty: {}, blank: { name: "", url: " " } },
    "x-texts": { nameAlias: { $ref: "#/components/x-texts/name" }, name: "Commercial EULA" },
    license: { name: "", url: "" },
  },
};
