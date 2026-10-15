module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Structural Edges", version: "1.0.0", description: "Nodes the rule must skip.", "x-host": "localhost" },
  servers: {
    nullServer: null,
    scalarServer: "kafka.example.org:9092",
    numberServer: 9092,
    arrayServer: [{ host: "kafka.example.org", protocol: "kafka" }],
    missingHost: { protocol: "kafka", description: "No host at all." },
    nullHost: { host: null, protocol: "kafka" },
    urlOnly: { url: "kafka://kafka.example.org:9092", protocol: "kafka", description: "A 2.x url left in a 3.x document." },
    pathnameOnly: { pathname: "/localhost", protocol: "wss" },
    compliantWithPathname: { host: "ws.quality.es", pathname: "//evil.example.org/stream", protocol: "wss" },
    extensionsOnly: { host: "kafka.quality.es", protocol: "kafka", "x-url": "localhost", "x-host": "10.0.0.1", "x-variables": { host: "evil.example.org" } },
    unusedVariables: {
      host: "kafka.quality.es",
      pathname: "/{basePath}",
      protocol: "kafka",
      variables: { basePath: { enum: ["evil.example.org"] }, env: { default: "localhost" }, "x-host": { default: "localhost" } },
    },
    bindingsWithUrls: {
      host: "mqtt.quality.es",
      protocol: "mqtt",
      bindings: { mqtt: { lastWill: { topic: "localhost/status" }, bindingVersion: "0.2.0" }, kafka: { schemaRegistryUrl: "http://localhost:8081" } },
      security: [{ $ref: "#/components/securitySchemes/evil" }],
      externalDocs: { url: "https://evil.example.org/docs" },
      tags: [{ name: "localhost" }],
    },
  },
  channels: {
    vehiclePosition: {
      address: "fleet/{vehicleId}/position",
      servers: [{ $ref: "#/servers/nullServer" }, { $ref: "#/components/x-servers/rogue" }],
      parameters: { vehicleId: { default: "localhost", examples: ["evil.example.org"] } },
      bindings: { ws: { query: { type: "object", properties: { host: { type: "string", default: "evil.example.org" } } } } },
      messages: {
        position: {
          headers: { type: "object", properties: { host: { type: "string", const: "kafka://evil.example.org" } } },
          payload: { type: "object", properties: { host: { type: "string" }, url: { type: "string" } } },
          examples: [{ headers: { host: "kafka://evil.example.org" }, payload: { host: "localhost", url: "10.0.0.1" } }],
        },
      },
    },
    nullAddress: { address: null, servers: [{ $ref: "#/servers/missingHost" }] },
  },
  operations: {
    sendPosition: { action: "send", channel: { $ref: "#/channels/vehiclePosition" }, host: "evil.example.org" },
    requestRoute: { action: "send", channel: { $ref: "#/channels/vehiclePosition" }, reply: { address: { location: "$message.header#/replyTo", host: "evil.example.org" } } },
  },
  components: {
    servers: { nullServer: null, scalar: "localhost", list: ["localhost"], noHost: { protocol: "kafka" }, urlOnly: { url: "localhost", protocol: "kafka" } },
    serverVariables: { env: { enum: ["localhost", "evil.example.org"] } },
    schemas: { Server: { type: "object", properties: { url: { type: "string", default: "localhost" }, host: { type: "string", default: "10.0.0.1" } } } },
    "x-servers": { rogue: { host: "evil.example.org", protocol: "kafka" } },
    replies: { routeReply: { address: { location: "$message.header#/replyTo", host: "evil.example.org" } } },
    replyAddresses: { rogue: { location: "$message.header#/replyTo", host: "evil.example.org" } },
    securitySchemes: { evil: { type: "httpApiKey", name: "localhost", in: "header" } },
  },
};
