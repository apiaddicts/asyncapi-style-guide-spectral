const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:retail:order-events",
  info: {
    title: "Quality Retail Order Events",
    version: "5.4.0",
    description: "Orders, payments, stock and store notifications of the retail platform.",
    contact: { name: "Retail Integration", email: "retail@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: {
      url: "kafka.retail.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    stores: { url: "mqtt.retail.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    warehouse: { url: "amqps://rabbit.retail.quality.es:5671/retail", protocol: "amqps", protocolVersion: "0.9.1" },
    console: { url: "wss://console.retail.quality.es/ws", protocol: "wss" },
  },
  channels: {
    "retail.cdc.orders.placed.v1": {
      description: "Orders placed in any sales channel.",
      servers: ["production"],
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveOrderPlaced",
        summary: "Receive orders placed.",
        security: [{ saslScram: [] }],
        traits: [trait("observability")],
        bindings: { kafka: { groupId: { type: "string", enum: ["fulfilment"] }, bindingVersion: "0.4.0" } },
        message: { oneOf: [message("orderPlaced"), message("orderPlacedAvro")] },
      },
      publish: { operationId: "publishOrderPlaced", message: message("orderPlaced") },
    },
    "stores/{storeId}/stock": {
      description: "Stock levels reported by store sensors.",
      servers: ["stores"],
      parameters: { storeId: { description: "Store code.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" }, location: "$message.payload#/storeId" } },
      publish: { operationId: "publishStock", bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.1.0" } }, message: message("stockLevel") },
    },
    "retail.cmd.warehouse.picking.v1": {
      servers: ["warehouse"],
      subscribe: { operationId: "receivePicking", bindings: { amqp: { ack: true, bindingVersion: "0.2.0" } }, message: { $ref: "#/components/messages/picking" } },
    },
    "retail.cdc.payments.captured.v1": {
      subscribe: { message: { oneOf: [message("paymentCaptured"), { $ref: "#/components/messages/payment~1refunded" }, { $ref: "#/components/messages/reembolso%20tarjeta" }] } },
      publish: { message: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", contentType: "application/vnd.apache.avro+json", payload: { type: "record", name: "PaymentCaptured", fields: [{ name: "amount", type: "double" }, { name: "voucher", type: ["null", "string"], default: null }] } } },
    },
    "retail.console.events": {
      servers: ["console"],
      subscribe: { message: { name: "consoleEvent", payload: { type: ["object", "null"] }, traits: [{ $ref: "#/components/messageTraits/tracing" }] } },
    },
    "retail.cdc.orders.external.v1": {
      subscribe: { message: { $ref: "./shared/order-messages.yaml#/orderPlaced" } },
      publish: { message: { oneOf: { $ref: "./shared/order-messages.yaml#/all" } } },
    },
    "retail.cdc.orders.shared.v1": { subscribe: { message: { $ref: "#/components/x-message-wrappers/orders" } }, publish: { message: { oneOf: { $ref: "#/components/x-message-lists/orders" } } } },
    "x-retail.cdc.partner.v1": { publish: { message: message("orderPlaced") } },
    "retail.cdc.orders.reused.v1": { $ref: "#/components/channels/sharedOrders" },
    "retail.cdc.orders.reusedAgain.v1": { $ref: "#/components/channels/sharedOrders" },
    "retail.cdc.orders.externalChannel.v1": { $ref: "./shared/channels.yaml#/orders" },
    "retail.cdc.notifications.v1": { description: "Notifications without operations." },
  },
  components: {
    channels: {
      sharedOrders: { description: "Shared order channel.", subscribe: { message: message("orderPlaced") } },
      archive: { publish: { message: { oneOf: [message("orderPlacedAvro")] } } },
    },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL SCRAM credentials." } },
    operationTraits: { observability: { description: "Traced through the platform collector.", tags: [{ name: "observability" }] } },
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    "x-message-wrappers": { orders: { oneOf: [message("orderPlaced"), message("orderPlacedAvro")] } },
    "x-message-lists": { orders: [message("orderPlaced")] },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        title: "Order placed",
        contentType: "application/json",
        correlationId: { location: "$message.header#/correlationId" },
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
        payload: { type: "object", required: ["orderId"], properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        contentType: "application/vnd.apache.avro+json",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "OrderPlaced", namespace: "es.quality.retail", fields: [{ name: "orderId", type: "string" }, { name: "couponCode", type: ["null", "string"], default: null }] },
      },
      stockLevel: { name: "stockLevel", payload: { type: "object", properties: { units: { type: ["integer", "null"] } } } },
      picking: { name: "picking", payload: { type: "object", properties: { orderId: { type: "string" } } } },
      paymentCaptured: { name: "paymentCaptured", payload: { type: "object", properties: { amount: { type: "number" } } } },
      "payment/refunded": { name: "paymentRefunded", payload: { type: "object" } },
      "reembolso tarjeta": { name: "cardRefund", payload: { type: "object" } },
    },
  },
};
