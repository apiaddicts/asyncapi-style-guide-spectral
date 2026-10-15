module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Yard Structural Edges", version: "1.0.0", description: "Nodes the rule must skip.", "x-protocol": "rabbitmq" },
  "x-servers": { rogue: { url: "rogue.example.org", protocol: "rabbitmq" } },
  servers: {
    nullServer: null,
    scalarServer: "kafka://evil.example.org:9092",
    numberServer: 9093,
    booleanServer: false,
    arrayServer: [{ url: "evil.example.org", protocol: "rabbitmq" }, "tcp"],
    emptyServer: {},
    missingProtocol: { url: "kafka.quality.es:9092", description: "No protocol at all." },
    nullProtocol: { url: "kafka.quality.es:9092", protocol: null },
    extensionProtocolOnly: { url: "kafka.quality.es:9092", "x-protocol": "kafka-ssl", "x-protocols": ["tcp", "udp"] },
    protocolVersionOnly: { url: "kafka.quality.es:9092", protocolVersion: "kafka-ssl" },
    capitalizedField: { url: "kafka.quality.es:9092", Protocol: "rabbitmq", PROTOCOL: "tcp", protocol_: "grpc" },
    bindingsAndSecurity: {
      url: "mqtt.quality.es:1883",
      protocol: "mqtt",
      security: [{ apiKey: [] }],
      variables: { protocol: { enum: ["mqtts", "tcp"], default: "mqtts" } },
      bindings: {
        mqtt: { clientId: "yard-gateway", lastWill: { topic: "yard/status", qos: 1, message: "offline", retain: false }, bindingVersion: "0.1.0" },
        kafka: { protocol: "SASL_SSL", schemaRegistryUrl: "http://10.0.0.1:8081", bindingVersion: "0.4.0" },
        "x-transport": { protocol: "tcp" },
      },
    },
  },
  channels: {
    "yard/{craneId}/status": {
      servers: ["nullServer", "missingProtocol", "notDeclared"],
      parameters: { craneId: { schema: { type: "string", enum: ["tcp", "udp"], default: "tcp" }, location: "$message.header#/protocol" } },
      bindings: { ws: { headers: { type: "object", properties: { protocol: { type: "string", const: "socket.io" } } }, bindingVersion: "0.1.0" } },
      subscribe: {
        operationId: "receiveCraneStatus",
        bindings: { sns: { consumers: [{ protocol: "email", endpoint: { url: "mailto:yard@quality.es" }, rawMessageDelivery: false }] } },
        message: {
          headers: { type: "object", properties: { protocol: { type: "string", default: "rabbitmq" } } },
          payload: { type: "object", properties: { servers: { type: "object", properties: { protocol: { const: "tcp" } } } } },
          examples: [{ headers: { protocol: "grpc" }, payload: { servers: { protocol: "udp" } } }],
        },
      },
    },
  },
  components: {
    servers: { nullServer: null, scalar: "tcp", list: ["rabbitmq"], noProtocol: { url: "localhost" }, nullProtocol: { url: "localhost", protocol: null } },
    schemas: { Server: { type: "object", properties: { protocol: { type: "string", default: "rabbitmq", enum: ["tcp"] } } } },
    messages: { serverMoved: { payload: { type: "object", properties: { protocol: { type: "string", examples: ["kafka-ssl"] } } }, examples: [{ payload: { protocol: "tcp" } }] } },
    messageTraits: { transport: { headers: { type: "object", properties: { protocol: { type: "string", enum: ["mqtts"] } } } } },
    parameters: { protocol: { schema: { type: "string", enum: ["kafka-ssl"] } } },
    securitySchemes: { apiKey: { type: "apiKey", in: "user", description: "protocol: rabbitmq" } },
    "x-servers": { rogue: { url: "evil.example.org", protocol: "rabbitmq" } },
  },
};
