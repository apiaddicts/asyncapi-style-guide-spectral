module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Logistics Structural Edges", version: "1.0.0", description: "Server-like nodes the rule must skip.", "x-url": "" },
  "x-servers": { rogue: { url: "", protocol: null }, empty: {}, nothing: null },
  servers: {
    kafka: { url: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0" },
    dock: {
      url: "mqtt.quality.es:{port}",
      protocol: "mqtt",
      protocolVersion: "5.0",
      variables: { port: { enum: ["1883", "8883"], default: "8883" }, url: { default: "" }, protocolVersion: { default: "" } },
      security: [{ evil: [] }],
      bindings: { mqtt: { clientId: "dock-gateway", bindingVersion: "0.1.0", url: "", protocolVersion: null }, kafka: {} },
      tags: [{ name: "protocolVersion", description: "" }],
    },
  },
  channels: {
    "logistics/{dockId}/doors": {
      servers: ["kafka", "dock", "missingServer"],
      parameters: { dockId: { schema: { type: "string", properties: { url: { type: "string" } } }, location: "$message.header#/url" } },
      bindings: { ws: { headers: { type: "object", properties: { protocolVersion: { type: "string" } } }, bindingVersion: "0.1.0" }, kafka: { "x-url": "" } },
      subscribe: {
        operationId: "receiveDoorEvent",
        bindings: { kafka: { groupId: { type: "string" }, protocolVersion: "" } },
        traits: [{ bindings: { kafka: { clientId: { type: "string" } } }, "x-servers": { a: {} } }],
        message: {
          oneOf: [
            {
              name: "doorOpened",
              headers: { type: "object", properties: { url: { type: ["string", "null"] }, protocol: { type: "string" } } },
              payload: { type: "object", required: ["url", "protocol", "protocolVersion"], properties: { url: { type: "string" }, protocol: { type: "string" }, protocolVersion: { type: "string" } } },
              examples: [{ payload: { url: "", protocol: "", protocolVersion: "" } }],
              traits: [{ headers: { type: "object", properties: { protocolVersion: { type: "string" } } } }],
              correlationId: { location: "$message.header#/url" },
            },
            {
              name: "doorClosed",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: { type: "record", name: "DoorClosed", fields: [{ name: "url", type: ["null", "string"] }, { name: "protocolVersion", type: ["null", "string"], default: null }] },
            },
          ],
        },
      },
    },
  },
  components: {
    servers: {
      shared: { url: "kafka-shared.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    },
    serverVariables: { url: { default: "" }, protocol: { enum: [""] } },
    serverBindings: { legacy: { kafka: { url: "", protocol: null, protocolVersion: "" } } },
    channelBindings: { legacy: { amqp: { is: "routingKey" } } },
    schemas: { Server: { type: "object", required: ["url", "protocol", "protocolVersion"], properties: { url: { type: "string" }, protocol: { type: "string" }, protocolVersion: { type: "string" } } } },
    messages: { serverMoved: { payload: { $ref: "#/components/schemas/Server" }, examples: [{ payload: { url: "", protocol: "", protocolVersion: "" } }] } },
    messageTraits: { transport: { headers: { type: "object", properties: { url: { type: "string" } } } } },
    operationTraits: { versioned: { "x-protocolVersion": "" } },
    parameters: { url: { schema: { type: "string" } } },
    correlationIds: { byUrl: { location: "$message.header#/url" } },
    securitySchemes: { evil: { type: "userPassword", description: "" } },
    "x-servers": { rogue: { url: "", protocol: "", protocolVersion: "" } },
  },
};
