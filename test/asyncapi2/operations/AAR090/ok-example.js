const message = (name) => ({ $ref: `#/components/messages/${name}` });
const bindings = (name) => ({ $ref: `#/components/channelBindings/${name}` });

const topicConfiguration = {
  "cleanup.policy": ["delete"],
  "retention.ms": 604800000,
  "retention.bytes": 1073741824,
  "delete.retention.ms": 86400000,
  "max.message.bytes": 1048588,
};

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:retail:orders",
  info: {
    title: "Quality Retail Order Events",
    version: "5.1.0",
    description: "Order, payment, stock and store device events of the retail platform.",
    contact: { name: "Retail Integration", url: "https://retail.quality.es/support", email: "integration@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: {
      url: "kafka.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    staging: { url: "kafka-staging.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ saslScram: [] }] },
    devices: { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0", bindings: { mqtt: { clientId: "retail-bridge", cleanSession: false, keepAlive: 60, bindingVersion: "0.2.0" } } },
    stores: { url: "rabbit.quality.es:5671", protocol: "amqps", protocolVersion: "0.9.1" },
  },
  channels: {
    "retail.cdc.orders.placed.v1": {
      description: "Orders placed in any sales channel.",
      servers: ["production", "staging"],
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 24, replicas: 3, topicConfiguration, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveOrderPlaced",
        traits: [{ $ref: "#/components/operationTraits/retailConsumer" }],
        message: { oneOf: [message("orderPlaced"), message("orderPlacedAvro")] },
      },
      publish: { operationId: "publishOrderPlaced", bindings: { kafka: { clientId: { type: "string", enum: ["orders-api"] }, bindingVersion: "0.4.0" } }, message: message("orderPlaced") },
    },
    "retail.cdc.orders.cancelled.v1": {
      description: "Orders cancelled by the customer or the store. Kafka binding 0.1.0, which has no fields.",
      bindings: { kafka: {} },
      subscribe: { operationId: "receiveOrderCancelled", message: message("orderCancelled") },
    },
    "retail.cdc.orders.shipped.v1": {
      description: "Orders handed over to the carrier.",
      bindings: { kafka: { topic: "retail.cdc.orders.shipped.v1", partitions: 6, replicas: 3, bindingVersion: "0.3.0" } },
      subscribe: { operationId: "receiveOrderShipped", message: message("orderShipped") },
    },
    "retail.cmd.payments.capture.v1": {
      description: "Payment capture commands, compacted by payment identifier.",
      bindings: bindings("kafkaCompacted"),
      publish: { operationId: "publishCapturePayment", message: message("capturePayment") },
    },
    "retail.cmd.payments.refund.v1": {
      description: "Refund commands sharing the compacted topic settings through a chained reference.",
      bindings: bindings("kafkaCompactedAlias"),
      publish: { operationId: "publishRefundPayment", message: message("refundPayment") },
    },
    "retail.sys.audit.v1": {
      description: "Audit trail whose kafka binding is shared through a reference.",
      bindings: { kafka: { $ref: "#/components/x-kafka-bindings/audit" }, "x-retention-owner": "security" },
      subscribe: { operationId: "receiveAudit", message: message("auditEntry") },
    },
    "stores/{storeId}/devices/{deviceId}/telemetry": {
      description: "Store device telemetry bridged from MQTT to Kafka.",
      servers: ["devices", "production"],
      parameters: {
        storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" } },
        deviceId: { $ref: "#/components/parameters/deviceId" },
      },
      bindings: { mqtt: {}, kafka: { topic: "retail.sys.telemetry.v1", partitions: 48, bindingVersion: "0.4.0" } },
      subscribe: { operationId: "receiveTelemetry", bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } }, message: message("deviceTelemetry") },
    },
    "retail.cdc.stock.levels.v1": {
      description: "Stock levels replicated to the stores queue.",
      servers: ["production", "stores"],
      bindings: {
        kafka: { topic: "retail.cdc.stock.levels.v1", partitions: 12, replicas: 3, bindingVersion: "0.4.0" },
        amqp: { is: "routingKey", exchange: { name: "retail.stock", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" },
        "x-connector": { name: "stock-sink", tasks: 3 },
      },
      subscribe: { operationId: "receiveStockLevel", message: message("stockLevel") },
    },
    "x-retail.cdc.partner.v1": {
      description: "Partner events: the key is a channel address, not an extension.",
      bindings: { kafka: { bindingVersion: "0.4.0" } },
      subscribe: { operationId: "receivePartnerEvent", message: message("orderPlaced") },
    },
    "retail.cdc.invoices.v1": { $ref: "#/components/channels/invoices" },
    "retail.cdc.invoices.eu.v1": { $ref: "#/components/channels/invoices" },
    "retail.cdc.partners.v1": { $ref: "./partner-channels.yaml#/partners" },
    "retail.cdc.loyalty.v1": {
      description: "Loyalty points whose bindings live in a shared file.",
      bindings: { $ref: "./shared/channel-bindings.yaml#/loyalty" },
      subscribe: { operationId: "receiveLoyalty", message: { $ref: "./shared/messages.yaml#/loyaltyPoints" } },
    },
    "retail.cdc.catalog.v1": {
      description: "Catalog changes whose kafka binding is published by the platform team.",
      bindings: { kafka: { $ref: "https://specs.quality.es/bindings/kafka.yaml#/catalog" } },
      subscribe: { operationId: "receiveCatalogChange", message: message("orderPlaced") },
    },
  },
  components: {
    channels: {
      invoices: {
        description: "Invoices issued for delivered orders.",
        bindings: { kafka: { topic: "retail.cdc.invoices.v1", partitions: 6, replicas: 3, bindingVersion: "0.4.0" } },
        subscribe: { operationId: "receiveInvoice", message: message("invoiceIssued") },
      },
      returns: { description: "Returns accepted by a store.", bindings: bindings("kafkaCompacted"), subscribe: { message: message("orderCancelled") } },
    },
    channelBindings: {
      kafkaCompacted: {
        kafka: {
          partitions: 12,
          replicas: 3,
          topicConfiguration: { "cleanup.policy": ["compact"], "delete.retention.ms": 86400000, "max.message.bytes": 1048588 },
          bindingVersion: "0.4.0",
        },
      },
      kafkaCompactedAlias: bindings("kafkaCompacted"),
      mqttOnly: { mqtt: {} },
      amqpOnly: { amqp: { is: "queue", queue: { name: "retail.orders", durable: true, exclusive: false, autoDelete: false } } },
    },
    "x-kafka-bindings": {
      audit: { topic: "retail.sys.audit.v1", partitions: 3, replicas: 3, topicConfiguration: { "retention.ms": -1 }, bindingVersion: "0.4.0" },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        title: "Order placed",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/retailHeaders" }],
        correlationId: { location: "$message.header#/correlationId" },
        payload: {
          type: "object",
          required: ["orderId", "total"],
          properties: {
            orderId: { type: "string", format: "uuid" },
            total: { type: "number", minimum: 0 },
            couponCode: { type: ["string", "null"] },
            placedAt: { type: "string", format: "date-time" },
          },
        },
        examples: [{ name: "webOrder", payload: { orderId: "6f1c2d3e-0000-4000-8000-000000000001", total: 59.9, couponCode: null, placedAt: "2026-10-16T09:30:00Z" } }],
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        contentType: "application/vnd.apache.avro+json",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } },
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
      orderCancelled: { name: "orderCancelled", payload: { type: "object", properties: { orderId: { type: "string" }, reason: { type: ["string", "null"] } } } },
      orderShipped: { name: "orderShipped", payload: { $ref: "#/components/schemas/Shipment" } },
      capturePayment: { name: "capturePayment", payload: { type: "object", properties: { paymentId: { type: "string" }, amount: { type: "number" } } } },
      refundPayment: { name: "refundPayment", payload: { type: "object", properties: { paymentId: { type: "string" } } } },
      auditEntry: { name: "auditEntry", payload: { type: "object", additionalProperties: true } },
      deviceTelemetry: { name: "deviceTelemetry", headers: { type: "object", properties: { firmware: { type: "string" } } }, payload: { type: "object", properties: { temperature: { type: ["number", "null"] } } } },
      stockLevel: { name: "stockLevel", payload: { type: "object", properties: { sku: { type: "string" }, quantity: { type: "integer", minimum: 0 } } } },
      invoiceIssued: { name: "invoiceIssued", payload: { type: "object", properties: { invoiceId: { type: "string" } } } },
    },
    schemas: {
      Shipment: { type: "object", properties: { orderId: { type: "string" }, carrier: { type: ["string", "null"] } } },
    },
    parameters: { deviceId: { description: "Device identifier.", schema: { type: "string" } } },
    messageTraits: {
      retailHeaders: { headers: { type: "object", properties: { correlationId: { type: "string" } } }, bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } } },
    },
    operationTraits: {
      retailConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["retail-orders"] }, bindingVersion: "0.4.0" } } },
    },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL SCRAM-SHA-512 credentials." } },
  },
};
