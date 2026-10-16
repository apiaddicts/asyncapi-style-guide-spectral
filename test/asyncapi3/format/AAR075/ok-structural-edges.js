module.exports = {
  asyncapi: "3.0.0",
  id: "urn:media:streaming-events",
  info: {
    title: "Streaming Playback Events",
    version: 1.0,
    description: "Playback, buffering and entitlement events of the video streaming service.",
    termsOfService: "https://streaming.example.io/terms",
    contact: { "x-pagerduty": "playback-oncall" },
    license: { name: "Proprietary" },
    tags: [null],
    externalDocs: { "x-wiki": "https://wiki.streaming.example.io/playback" },
    "x-audience": "external-public",
    "x-api-id": "b3e8f1a2-6c4d-4e9b-8a7f-1d2c3e4f5a6b",
    "x-legacy-title": "",
    Title: "",
    Tags: [],
  },
  "x-info": { title: "", version: "", description: "" },
  tags: [],
  externalDocs: {},
  servers: {
    info: { host: "edge.streaming.example.io", pathname: "", protocol: "wss", title: "", summary: "", description: "" },
  },
  channels: {
    info: {
      address: null,
      title: "",
      summary: "",
      description: "",
      messages: {
        info: {
          name: "info",
          title: "",
          summary: "",
          description: "",
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: { type: "object", title: "", description: "", properties: { info: { type: "object", properties: { title: { type: "string" }, version: { type: "string" } } } } },
          },
          examples: [{ name: "", summary: "", payload: { info: { title: "", version: "", description: "" } } }],
        },
      },
    },
    playback: { address: "playback/{sessionId}", parameters: { sessionId: { description: "" } }, messages: { heartbeat: { $ref: "#/components/messages/info" } } },
  },
  operations: {
    info: {
      action: "send",
      title: "",
      summary: "",
      description: "",
      channel: { $ref: "#/channels/info" },
      reply: { channel: { $ref: "#/channels/playback" }, messages: [{ $ref: "#/channels/playback/messages/heartbeat" }] },
    },
  },
  components: {
    messages: { info: { name: "info", title: "", description: "", payload: { $ref: "#/components/schemas/info" } } },
    schemas: {
      info: { type: "object", title: "", description: "", required: ["title", "version", "description"], properties: { title: { type: "string" }, version: { type: "string" }, description: { type: "string" } } },
      Info: { type: "null" },
    },
    tags: { empty: { name: "", description: "" } },
    externalDocs: { empty: { url: "", description: "" } },
    operations: { info: { action: "receive", title: "", channel: { $ref: "#/channels/info" } } },
    "x-info": { title: "", version: null, description: "   ", tags: [] },
  },
};
