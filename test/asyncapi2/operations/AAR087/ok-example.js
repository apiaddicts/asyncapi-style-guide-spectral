module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:retail:order-event-streams",
  info: {
    title: "Quality Retail Order Event Streams",
    version: "5.1.0",
    description: "Orders, payments, stock reservations, store sensors and courier tracking exchanged between the retail platforms.",
    contact: { name: "Retail Integration", email: "retail-integration@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ saslScram: [] }] },
    warehouse: { url: "rabbit.quality.es:5671", protocol: "amqps", protocolVersion: "0.9.1" },
    sensors: { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    live: { url: "wss://live.quality.es/couriers", protocol: "wss" },
  },
  channels: {
    "retail.cdc.orders.placed.v1": {
      description: "Orders placed in any sales channel.",
      servers: ["production"],
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 12, replicas: 3, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveOrderPlaced",
        summary: "Receive placed orders.",
        traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
        message: { oneOf: [{ $ref: "#/components/messages/orderPlaced" }, { $ref: "#/components/messages/orderPlacedAvro" }] },
      },
      publish: { operationId: "publishOrderPlaced", message: { $ref: "#/components/messages/orderPlaced" } },
    },
    "retail.cmd.payments.capture.v1": {
      description: "Payment capture commands sent to the payment gateway.",
      publish: {
        operationId: "sendCapturePayment",
        message: {
          name: "capturePayment",
          title: "Capture payment",
          correlationId: { description: "Payment correlation.", location: "$message.header#/correlationId" },
          headers: { type: "object", properties: { correlationId: { type: "string" }, retryCount: { type: ["integer", "null"] } } },
          payload: { type: "object", properties: { paymentId: { type: "string" }, amount: { type: "number" }, voucher: { type: ["string", "null"] } } },
          traits: [{ $ref: "#/components/messageTraits/tracing" }],
        },
      },
    },
    "stores/{storeId}/sensors/{sensorId}": {
      description: "Temperature and door sensors of each store.",
      servers: ["sensors"],
      parameters: {
        storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" } },
        sensorId: { $ref: "#/components/parameters/sensorId" },
      },
      bindings: { mqtt: { bindingVersion: "0.1.0" } },
      publish: { operationId: "publishSensorReading", bindings: { mqtt: { qos: 1, retain: false } }, message: { $ref: "#/components/messages/sensorReading" } },
    },
    "warehouse.stock.reserved": {
      description: "Stock reservations confirmed by the warehouse.",
      servers: ["warehouse"],
      bindings: { amqp: { is: "routingKey", exchange: { name: "warehouse", type: "topic", durable: true } } },
      subscribe: { operationId: "receiveStockReserved", message: { $ref: "#/components/messages/stockReserved" } },
    },
    "couriers/{courierId}/position": {
      description: "Live courier positions streamed to the tracking page.",
      servers: ["live"],
      parameters: { courierId: { description: "Courier identifier.", schema: { type: "string" } } },
      subscribe: { operationId: "receiveCourierPosition", message: { $ref: "./shared/courier-messages.yaml#/courierPosition" } },
    },
    "retail.sys.orders.audit.v1": {
      description: "Order audit trail, published from a shared channel definition.",
      subscribe: { $ref: "./shared/audit-operations.yaml#/receiveAudit" },
    },
    "retail.cdc.returns.created.v1": { $ref: "#/components/channels/returnsCreated" },
    "retail.cdc.returns.created.v1.retry": { $ref: "#/components/channels/returnsCreated" },
    "retail.cdc.invoices.issued.v1": { $ref: "./shared/invoice-channels.yaml#/invoicesIssued" },
    "retail.cdc.loyalty.points.v1": {
      description: "Loyalty points, where only the subscribe operation carries messages.",
      publish: { operationId: "publishLoyaltyPoints", message: { oneOf: [] } },
      subscribe: { operationId: "receiveLoyaltyPoints", message: { $ref: "#/components/messages/loyaltyPoints" } },
    },
    "retail.cdc.pricing.changed.v1": {
      description: "Price changes, described with an empty message placeholder.",
      subscribe: { operationId: "receivePriceChanged", message: {} },
    },
    "x-retail.cdc.partners.synced.v1": {
      description: "Partner synchronisation channel whose key starts with x-.",
      subscribe: { operationId: "receivePartnerSynced", message: { $ref: "#/components/messages/partnerSynced" } },
    },
  },
  components: {
    channels: {
      returnsCreated: {
        description: "Returns created by customers or stores.",
        subscribe: { operationId: "receiveReturnCreated", message: { $ref: "#/components/messages/returnCreated" } },
      },
      unusedArchive: {
        description: "Archived channel kept for reuse.",
        publish: { operationId: "publishArchive", message: { name: "archive", payload: { type: "string" } } },
      },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        title: "Order placed",
        contentType: "application/json",
        payload: { $ref: "#/components/schemas/Order" },
        examples: [{ payload: { orderId: "o-1", couponCode: null } }],
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        contentType: "application/vnd.apache.avro+json",
        payload: {
          type: "record",
          name: "OrderPlaced",
          namespace: "es.quality.retail",
          fields: [
            { name: "orderId", type: "string" },
            { name: "couponCode", type: ["null", "string"], default: null },
            { name: "lines", type: { type: "array", items: { type: "record", name: "OrderLine", fields: [{ name: "sku", type: "string" }] } } },
          ],
        },
      },
      sensorReading: { name: "sensorReading", payload: { type: "object", properties: { celsius: { type: ["number", "null"] } } } },
      stockReserved: { name: "stockReserved", payload: { type: "object" } },
      loyaltyPoints: { name: "loyaltyPoints", payload: { type: "object" } },
      partnerSynced: { name: "partnerSynced", payload: { type: "object" } },
      returnCreated: { name: "returnCreated", payload: { type: "object" } },
    },
    schemas: {
      Order: { type: "object", required: ["orderId"], properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
    },
    parameters: { sensorId: { description: "Sensor identifier.", schema: { type: "string" } } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["order-fulfilment"] }, bindingVersion: "0.4.0" } } } },
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
  },
};
