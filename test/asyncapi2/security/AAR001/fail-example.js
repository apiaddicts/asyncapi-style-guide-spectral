module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Retail Integration Hub",
    version: "2.4.0",
    description: "Order, stock and telemetry events exchanged between stores, warehouses and the ERP.",
  },
  defaultContentType: "application/json",
  servers: {
    "orders-https": { url: "https://events.quality.es/orders", protocol: "https" },
    "orders-wss": { url: "wss://events.quality.es/stream", protocol: "wss" },
    "stock-amqps": { url: "rabbit.quality.es:5671", protocol: "amqps" },
    "orders-kafka-secure": {
      url: "broker.quality.es:9093",
      protocol: "kafka-secure",
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", bindingVersion: "0.4.0" } },
    },
    "store-secure-mqtt": { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "3.1.1" },
    "legacy-http": { url: "http://legacy.quality.es/hooks", protocol: "http" },
    "store-ws": { url: "ws://events.quality.es/stream", protocol: "ws" },
    "store-mqtt": { url: "mqtt.quality.es:1883", protocol: "mqtt" },
    "stock-amqp": { url: "rabbit.quality.es:5672", protocol: "amqp" },
    "orders-kafka": { url: "broker-internal.quality.es:9092", protocol: "kafka" },
    "audit-stomp": { url: "stomp.quality.es:61613", protocol: "stomp" },
    "audit-stomps": { url: "stomp.quality.es:61614", protocol: "stomps" },
    "erp-jms": { url: "jms.quality.es:7676", protocol: "jms" },
    "mainframe-ibmmq": { url: "ibmmq://qm1.quality.es:1414/QM1/DEV.APP.SVRCONN", protocol: "ibmmq" },
    "client-kafka-ssl": { url: "broker.quality.es:9094", protocol: "kafka-ssl" },
    "upper-https": { url: "https://upper.quality.es", protocol: "HTTPS" },
    "padded-https": { url: "https://padded.quality.es", protocol: " https" },
    "empty-protocol": { url: "https://empty.quality.es", protocol: "" },
    "null-protocol": { url: "https://null.quality.es", protocol: null },
    "numeric-protocol": { url: "https://numeric.quality.es", protocol: 9093 },
    "boolean-protocol": { url: "https://boolean.quality.es", protocol: true },
    "list-protocol": { url: "https://list.quality.es", protocol: ["https"] },
    "map-protocol": { url: "https://map.quality.es", protocol: { name: "https" } },
    "missing-protocol": { url: "https://missing.quality.es" },
  },
  channels: {
    "retail.order-created.v1": {
      description: "An order was accepted by a store.",
      servers: ["orders-kafka", "orders-kafka-secure"],
      "x-protocol": "http",
      bindings: { kafka: { topic: "retail.order-created.v1", partitions: 6, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "onOrderCreated",
        bindings: { kafka: { groupId: { type: "string", enum: ["erp-sync"] }, bindingVersion: "0.4.0" } },
        message: { $ref: "#/components/messages/OrderCreated" },
      },
    },
    "stores/{storeId}/telemetry": {
      description: "Telemetry sent by every store gateway.",
      servers: ["store-mqtt", "store-secure-mqtt"],
      parameters: { storeId: { description: "Store code.", schema: { type: "string" } } },
      publish: {
        operationId: "sendStoreTelemetry",
        message: {
          oneOf: [{ $ref: "#/components/messages/StoreTelemetry" }, { $ref: "#/components/messages/StoreTelemetryAvro" }],
        },
      },
    },
  },
  components: {
    securitySchemes: { saslScram: { type: "scramSha512" } },
    messages: {
      OrderCreated: {
        name: "orderCreated",
        headers: { type: "object", properties: { protocol: { type: "string", enum: ["http"] } } },
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
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: {
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
};
