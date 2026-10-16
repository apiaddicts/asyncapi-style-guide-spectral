module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Structural Edges", version: "1.0.0", description: "Server names outside the root servers map.", tags: [{ name: "production" }] },
  servers: {
    eventstreams: null,
    kafka: { $ref: "#/components/servers/production" },
  },
  "x-servers": { production: { host: "kafka.example.org", protocol: "kafka" } },
  channels: {
    position: {
      address: "fleet/{vehicleId}/position",
      servers: [{ $ref: "#/components/servers/production" }, { $ref: "#/servers/staging" }, { $ref: "#/components/servers/staging" }],
      parameters: { vehicleId: { enum: ["production", "staging"], location: "$message.payload#/production" } },
      bindings: { ws: { query: { type: "object", properties: { production: { type: "string" } } } } },
      messages: {
        production: {
          name: "staging",
          headers: { type: "object", properties: { staging: { type: "string" } } },
          payload: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: "object", properties: { production: { type: "string" } } } },
          correlationId: { location: "$message.header#/production" },
          examples: [{ headers: { staging: "yes" }, payload: { production: "kafka-pro" } }],
        },
      },
    },
    replies: { address: null, servers: [{ $ref: "#/servers/kafka" }] },
  },
  operations: {
    production: {
      action: "send",
      channel: { $ref: "#/channels/position" },
      security: [{ $ref: "#/components/securitySchemes/production" }],
      reply: { channel: { $ref: "#/channels/replies" }, address: { location: "$message.header#/staging" } },
    },
  },
  components: {
    servers: { production: { host: "kafka-pro.quality.es:9093", protocol: "kafka-secure" }, staging: null, "": { protocol: "kafka" }, "x-mirror": [] },
    serverVariables: { production: { enum: ["pro"] }, staging: { default: "pre" } },
    serverBindings: { production: { kafka: { bindingVersion: "0.5.0" } } },
    securitySchemes: { production: { type: "userPassword" } },
    schemas: { production: { type: "object", properties: { staging: { type: "string" } } } },
    channels: { production: { address: "staging", servers: [{ $ref: "#/servers/kafka" }] } },
    operations: { staging: { action: "receive", channel: { $ref: "#/components/channels/production" } } },
    messages: { production: { name: "staging", payload: { type: "string" } } },
    replies: { production: { channel: { $ref: "#/channels/replies" } } },
    replyAddresses: { staging: { location: "$message.header#/replyTo" } },
    tags: { production: { name: "staging" } },
    externalDocs: { production: { url: "https://docs.quality.es/servers/production" } },
    "x-servers": { rabbitmq: { host: "rabbit.example.org", protocol: "amqp" } },
  },
};
