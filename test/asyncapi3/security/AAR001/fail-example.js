module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Retail Integration Hub",
    version: "3.1.0",
    description: "Order, stock and telemetry events exchanged between stores, warehouses and the ERP.",
  },
  defaultContentType: "application/json",
  servers: {
    "orders-https": { host: "events.quality.es", pathname: "/orders", protocol: "https" },
    "orders-wss": { host: "events.quality.es", pathname: "/stream", protocol: "wss" },
    "stock-amqps": { host: "rabbit.quality.es:5671", protocol: "amqps" },
    "orders-kafka-secure": {
      host: "broker.quality.es:9093",
      protocol: "kafka-secure",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", bindingVersion: "0.5.0" } },
    },
    "store-secure-mqtt": { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5" },
    "legacy-http": { host: "legacy.quality.es", pathname: "/hooks", protocol: "http" },
    "store-ws": { host: "events.quality.es", pathname: "/stream", protocol: "ws" },
    "store-mqtt": { host: "mqtt.quality.es:1883", protocol: "mqtt" },
    "stock-amqp": { host: "rabbit.quality.es:5672", protocol: "amqp" },
    "orders-kafka": { host: "broker-internal.quality.es:9092", protocol: "kafka" },
    "audit-stomp": { host: "stomp.quality.es:61613", protocol: "stomp" },
    "audit-stomps": { host: "stomp.quality.es:61614", protocol: "stomps" },
    "erp-jms": { host: "jms.quality.es:7676", protocol: "jms" },
    "mainframe-ibmmq": { host: "qm1.quality.es:1414", protocol: "ibmmq" },
    "client-kafka-ssl": { host: "broker.quality.es:9094", protocol: "kafka-ssl" },
    "upper-https": { host: "upper.quality.es", protocol: "HTTPS" },
    "padded-https": { host: "padded.quality.es", protocol: " https" },
    "empty-protocol": { host: "empty.quality.es", protocol: "" },
    "null-protocol": { host: "null.quality.es", protocol: null },
    "numeric-protocol": { host: "numeric.quality.es", protocol: 9093 },
    "boolean-protocol": { host: "boolean.quality.es", protocol: true },
    "list-protocol": { host: "list.quality.es", protocol: ["https"] },
    "map-protocol": { host: "map.quality.es", protocol: { name: "https" } },
    "missing-protocol": { host: "missing.quality.es" },
  },
  channels: {
    orderCreated: {
      address: "retail.order-created.v1",
      servers: [{ $ref: "#/servers/orders-kafka" }, { $ref: "#/servers/orders-kafka-secure" }],
      "x-protocol": "http",
      messages: { orderCreated: { $ref: "#/components/messages/OrderCreated" } },
      bindings: { kafka: { topic: "retail.order-created.v1", partitions: 6, bindingVersion: "0.5.0" } },
    },
    storeTelemetry: {
      address: "stores/{storeId}/telemetry",
      servers: [{ $ref: "#/servers/store-mqtt" }, { $ref: "#/servers/store-secure-mqtt" }],
      parameters: { storeId: { description: "Store code." } },
      messages: {
        storeTelemetry: { $ref: "#/components/messages/StoreTelemetry" },
        storeTelemetryAvro: { $ref: "#/components/messages/StoreTelemetryAvro" },
      },
    },
    orderReplies: {
      address: null,
      messages: { orderAck: { name: "orderAck", payload: { type: "object", properties: { ok: { type: "boolean" } } } } },
    },
  },
  operations: {
    onOrderCreated: {
      action: "receive",
      channel: { $ref: "#/channels/orderCreated" },
      messages: [{ $ref: "#/channels/orderCreated/messages/orderCreated" }],
      bindings: { kafka: { groupId: { type: "string", enum: ["erp-sync"] }, bindingVersion: "0.5.0" } },
      reply: {
        channel: { $ref: "#/channels/orderReplies" },
        address: { location: "$message.header#/replyTo" },
        messages: [{ $ref: "#/channels/orderReplies/messages/orderAck" }],
      },
    },
    sendStoreTelemetry: {
      action: "send",
      channel: { $ref: "#/channels/storeTelemetry" },
      messages: [{ $ref: "#/channels/storeTelemetry/messages/storeTelemetry" }],
    },
  },
  components: {
    securitySchemes: { saslScram: { type: "scramSha512" } },
    messages: {
      OrderCreated: {
        name: "orderCreated",
        correlationId: { location: "$message.header#/correlationId" },
        headers: { type: "object", properties: { protocol: { type: "string", enum: ["http"] }, replyTo: { type: "string" } } },
        payload: {
          type: "object",
          properties: { orderId: { type: "string", format: "uuid" }, channel: { type: ["string", "null"] } },
        },
      },
      StoreTelemetry: {
        name: "storeTelemetry",
        payload: { type: "object", properties: { temperature: { type: "number" } } },
      },
      StoreTelemetryAvro: {
        name: "storeTelemetryAvro",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: {
            type: "record",
            name: "StoreTelemetry",
            fields: [
              { name: "temperature", type: "double" },
              { name: "protocol", type: ["null", "string"] },
            ],
          },
        },
      },
    },
  },
};
