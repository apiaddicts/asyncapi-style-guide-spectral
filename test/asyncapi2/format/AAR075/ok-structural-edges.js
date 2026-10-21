module.exports = {
  asyncapi: "2.6.0",
  id: "urn:energy:smart-meters",
  info: {
    title: "Smart Meter Readings",
    version: 3,
    description: "Interval readings and outage notifications of the smart meter fleet.",
    termsOfService: "https://energy.example.io/terms",
    contact: { "x-slack": "#meter-platform" },
    license: { name: "Proprietary" },
    "x-audience": "external-partner",
    "x-api-id": "6d1f7c3a-2a9e-4e57-bf2c-91d0a8c4e7f3",
    "x-legacy-title": "",
    Title: "",
    DESCRIPTION: null,
  },
  "x-info": { title: "", version: "", description: "" },
  tags: [{ name: "readings", description: "" }],
  externalDocs: { description: "", url: "https://energy.example.io/docs" },
  servers: {
    info: { url: "mqtts://meters.energy.example.io:8883", protocol: "secure-mqtt", description: "" },
  },
  channels: {
    info: {
      description: "",
      publish: {
        operationId: "info",
        summary: "",
        description: "",
        message: {
          name: "info",
          title: "",
          summary: "",
          description: "",
          payload: {
            type: "object",
            title: "",
            description: "",
            properties: {
              info: { type: "object", properties: { title: { type: "string", description: "" }, version: { type: "string" }, description: { type: ["string", "null"] } } },
              title: { type: "string" },
            },
          },
          examples: [{ name: "", summary: "", payload: { info: { title: "", version: "", description: "" } } }],
        },
      },
    },
    "meters/{meterId}/readings": {
      parameters: { meterId: { description: "", schema: { type: "string" } } },
      subscribe: {
        operationId: "receiveReading",
        message: { $ref: "#/components/messages/info" },
      },
    },
  },
  components: {
    messages: {
      info: { name: "info", title: "", description: "", payload: { $ref: "#/components/schemas/info" } },
    },
    schemas: {
      info: { type: "object", title: "", description: "", required: ["title", "version", "description"], properties: { title: { type: "string" }, version: { type: "string" }, description: { type: "string" } } },
      Info: { type: "null" },
    },
    "x-info": { title: "", version: null, description: "   " },
    "x-shared-info": { platform: {} },
  },
};
