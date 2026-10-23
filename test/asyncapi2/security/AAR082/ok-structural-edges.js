module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Structural Edges", version: "1.0.0", description: "Server names outside the root servers map.", "x-servers": { production: {} } },
  servers: {
    eventstreams: null,
    kafka: { $ref: "#/components/servers/production" },
  },
  "x-servers": { production: { url: "kafka.example.org", protocol: "kafka" } },
  channels: {
    "fleet/{vehicleId}/position": {
      servers: ["production", "staging", "Kafka", ""],
      parameters: { vehicleId: { schema: { type: "string", enum: ["production", "staging"] } } },
      bindings: { ws: { query: { type: "object", properties: { production: { type: "string" } } } } },
      subscribe: {
        operationId: "receivePosition",
        security: [{ production: [] }],
        message: {
          headers: { type: "object", properties: { staging: { type: "string" } } },
          payload: { type: "object", properties: { production: { type: "string" }, servers: { type: "object", additionalProperties: { type: "string" } } } },
          examples: [{ headers: { staging: "yes" }, payload: { production: "kafka-pro", servers: { mqtt: "mqtt.quality.es" } } }],
        },
      },
    },
  },
  operations: { production: { action: "send", channel: { $ref: "#/channels/fleet~1{vehicleId}~1position" }, servers: [{ $ref: "#/components/servers/production" }] } },
  components: {
    servers: { production: { url: "kafka-pro.quality.es:9093", protocol: "kafka-secure" }, staging: null, "": { protocol: "kafka" }, "x-mirror": [] },
    serverVariables: { production: { enum: ["pro"] }, staging: { default: "pre" } },
    serverBindings: { production: { kafka: { bindingVersion: "0.4.0" } } },
    securitySchemes: { production: { type: "userPassword" } },
    schemas: { production: { type: "object", properties: { staging: { type: "string" } } } },
    messages: { production: { name: "staging", payload: { type: "string" } } },
    "x-servers": { rabbitmq: { url: "rabbit.example.org", protocol: "amqp" } },
  },
  tags: [{ name: "production" }, { name: "staging" }],
};
