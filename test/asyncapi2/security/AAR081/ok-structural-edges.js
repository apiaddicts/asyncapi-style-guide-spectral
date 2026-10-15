module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Structural Edges", version: "1.0.0", description: "Nodes the rule must skip.", "x-url": "localhost" },
  servers: {
    nullServer: null,
    scalarServer: "kafka.example.org:9092",
    numberServer: 9092,
    arrayServer: [{ url: "kafka.example.org", protocol: "kafka" }],
    missingUrl: { protocol: "kafka", description: "No url at all." },
    nullUrl: { url: null, protocol: "kafka" },
    hostOnly: { host: "kafka.example.org:9092", pathname: "/v1", protocol: "kafka" },
    extensionsOnly: { url: "kafka.quality.es", protocol: "kafka", "x-url": "localhost", "x-host": "10.0.0.1", "x-variables": { url: "evil.example.org" } },
    unusedVariables: { url: "kafka.quality.es", protocol: "kafka", variables: { env: { enum: ["evil.example.org"] }, "x-host": { default: "localhost" } } },
    bindingsWithUrls: {
      url: "mqtt.quality.es",
      protocol: "mqtt",
      bindings: { mqtt: { lastWill: { topic: "localhost/status" }, bindingVersion: "0.2.0" }, kafka: { schemaRegistryUrl: "http://localhost:8081" } },
      security: [{ "evil.example.org": [] }],
    },
  },
  channels: {
    "fleet/{vehicleId}/position": {
      servers: ["nullServer", "evil.example.org", "localhost"],
      parameters: { vehicleId: { schema: { type: "string", default: "localhost" } } },
      bindings: { ws: { query: { type: "object", properties: { host: { type: "string", default: "evil.example.org" } } } } },
      subscribe: {
        operationId: "receivePosition",
        message: {
          headers: { type: "object", properties: { url: { type: "string", const: "kafka://evil.example.org" } } },
          payload: { type: "object", properties: { host: { type: "string" }, url: { type: "string" } } },
          examples: [{ headers: { url: "kafka://evil.example.org" }, payload: { host: "localhost", url: "10.0.0.1" } }],
        },
      },
    },
  },
  operations: { sendPosition: { action: "send", channel: { $ref: "#/channels/fleet~1{vehicleId}~1position" }, host: "evil.example.org" } },
  components: {
    servers: { nullServer: null, scalar: "localhost", list: ["localhost"], noUrl: { protocol: "kafka" } },
    serverVariables: { env: { enum: ["localhost", "evil.example.org"] } },
    schemas: { Server: { type: "object", properties: { url: { type: "string", default: "localhost" }, host: { type: "string", default: "10.0.0.1" } } } },
    "x-servers": { rogue: { url: "evil.example.org", protocol: "kafka" } },
    replyAddresses: { rogue: { location: "$message.header#/replyTo", host: "evil.example.org" } },
  },
};
