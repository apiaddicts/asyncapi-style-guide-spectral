const message = (name) => ({ $ref: `#/components/messages/${name}` });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:retail:order-events",
  info: {
    title: "Quality Retail Order Events",
    version: "5.3.0",
    description: "Orders, payments, stock, store telemetry and customer chat exchanged by the retail platform.",
    contact: { name: "Retail Integration", email: "retail@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: { url: "kafka.retail.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ saslScram: [] }] },
    stores: { url: "mqtt.retail.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    warehouse: { url: "amqps://rabbit.retail.quality.es:5671/retail", protocol: "amqps", protocolVersion: "0.9.1" },
    chat: { url: "wss://chat.retail.quality.es/ws", protocol: "wss" },
  },
  channels: {
    "retail.cdc.orders.placed.v1": {
      description: "Orders placed in any sales channel.",
      servers: ["production"],
      subscribe: {
        operationId: "receiveOrderPlaced",
        traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
        message: { oneOf: [message("orderPlaced"), message("orderPlacedAvro")] },
      },
      publish: { operationId: "publishOrderPlaced", message: message("orderPlaced") },
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
    },
    "stores/{storeId}/sensors/{sensorId}/telemetry": {
      description: "Telemetry reported by store sensors.",
      servers: ["stores"],
      parameters: {
        storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" }, location: "$message.payload#/storeId" },
        sensorId: { $ref: "#/components/parameters/sensorId" },
      },
      publish: { operationId: "publishSensorReading", message: message("sensorReading") },
    },
    "warehouse.picking.commands": {
      description: "Picking commands sent to the warehouse over AMQP.",
      servers: ["warehouse"],
      subscribe: { operationId: "receivePickingCommand", message: { oneOf: [message("startPicking"), message("cancelPicking")] } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "warehouse", type: "topic", durable: true }, bindingVersion: "0.2.0" } },
    },
    "/chat/{conversationId}": {
      description: "Chat between customers and agents.",
      servers: ["chat"],
      parameters: { conversationId: { description: "Conversation identifier.", schema: { type: "string" } } },
      publish: { operationId: "sendChatMessage", message: { name: "chatMessage", payload: { type: "object", properties: { text: { type: "string" }, attachment: { type: ["string", "null"] } } } } },
    },
    "retail.cdc.stock.heartbeat.v1": {
      description: "Heartbeats without any field, an empty message is still a message.",
      subscribe: { operationId: "receiveHeartbeat", message: {} },
    },
    "retail.cdc.stock.adjusted.v1": {
      description: "Adjustments listing a retired message next to a usable one.",
      subscribe: { operationId: "receiveStockAdjusted", message: { oneOf: [message("retiredAdjustment"), message("stockAdjusted")] } },
      publish: { operationId: "publishStockAdjusted", message: { oneOf: [] } },
    },
    "retail.partner.orders.v1": {
      description: "Orders defined by a partner schema registry.",
      subscribe: { operationId: "receivePartnerOrder", message: { $ref: "https://schemas.partner.example.io/asyncapi/messages.yaml#/order" } },
    },
    "retail.cdc.returns.v1": {
      description: "Returns whose message list is shared.",
      subscribe: { operationId: "receiveReturn", message: { oneOf: { $ref: "#/components/x-message-lists/returns" } } },
    },
    "retail.cdc.invoices.v1": { $ref: "#/components/channels/invoicesIssued" },
    "retail.cdc.invoices.mirror.v1": { $ref: "#/components/channels/invoicesIssued" },
    "retail.cdc.payments.v1": { $ref: "./shared/payment-channels.yaml#/paymentCaptured" },
    "x-retail.partner.sync.v1": {
      description: "Partner synchronisation channel whose address starts with x-.",
      publish: { operationId: "publishPartnerSync", message: message("partnerSynced") },
    },
  },
  components: {
    channels: {
      invoicesIssued: { description: "Invoices issued after each order.", subscribe: { operationId: "receiveInvoice", message: message("invoiceIssued") } },
      unusedArchive: { description: "Archived channel kept for reuse.", publish: { message: { payload: { type: "string" } } } },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        title: "Order placed",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/orderId" },
        headers: { type: "object", properties: { traceId: { type: "string" }, retry: { type: ["integer", "null"] } } },
        payload: { $ref: "#/components/schemas/Order" },
        traits: [{ $ref: "#/components/messageTraits/tracing" }],
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        contentType: "application/vnd.apache.avro+json",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: {
          type: "record",
          name: "OrderPlaced",
          namespace: "es.quality.retail",
          fields: [
            { name: "orderId", type: "string" },
            { name: "couponCode", type: ["null", "string"], default: null },
          ],
        },
      },
      sensorReading: { name: "sensorReading", payload: { type: "object", properties: { celsius: { type: ["number", "null"] } } } },
      startPicking: { name: "startPicking", payload: { type: "object" } },
      cancelPicking: { name: "cancelPicking", schemaFormat: "application/vnd.aai.asyncapi+json;version=2.6.0", payload: { type: "object" } },
      stockAdjusted: { name: "stockAdjusted", payload: { type: "object" } },
      returnRequested: { name: "returnRequested", payload: { type: "object" } },
      returnRefunded: { name: "returnRefunded", payload: { type: "object" } },
      invoiceIssued: { name: "invoiceIssued", payload: { type: "object" } },
      partnerSynced: { name: "partnerSynced", payload: { type: "object" } },
    },
    schemas: {
      Order: { type: "object", required: ["orderId"], properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
    },
    parameters: { sensorId: { description: "Sensor identifier.", schema: { type: "string" } } },
    correlationIds: { orderId: { description: "Order correlation.", location: "$message.header#/orderId" } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["billing"] }, bindingVersion: "0.4.0" } } } },
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    "x-message-lists": { returns: [message("returnRequested"), message("returnRefunded")] },
  },
};
