const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const bindings = (name) => ({ $ref: `#/components/operationBindings/${name}` });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:retail:order-events",
  info: {
    title: "Quality Retail Order Events",
    version: "5.3.0",
    description: "Order, payment, stock and store events of the omnichannel retail platform.",
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
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    stores: { url: "mqtt.retail.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    warehouse: { url: "amqps://rabbit.retail.quality.es:5671/retail", protocol: "amqps", protocolVersion: "0.9.1" },
    console: { url: "wss://console.retail.quality.es/ws", protocol: "wss" },
  },
  channels: {
    "retail.cdc.orders.placed.v1": {
      description: "Orders placed in any sales channel.",
      servers: ["production"],
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 24, replicas: 3, bindingVersion: "0.5.0" } },
      subscribe: {
        operationId: "receiveOrderPlaced",
        summary: "Receive orders placed.",
        security: [{ saslScram: [] }],
        tags: [{ name: "orders" }],
        bindings: { kafka: { groupId: { type: "string", enum: ["fulfilment"] }, clientId: { type: "string", enum: ["fulfilment-1"] }, bindingVersion: "0.5.0" } },
        message: { oneOf: [message("orderPlaced"), message("orderPlacedAvro")] },
      },
      publish: {
        operationId: "publishOrderPlaced",
        summary: "Publish orders placed.",
        bindings: { kafka: {} },
        message: message("orderPlaced"),
      },
    },
    "retail.cdc.orders.cancelled.v1": {
      description: "Order cancellations.",
      subscribe: { operationId: "receiveOrderCancelled", summary: "Receive cancellations.", bindings: bindings("fulfilmentConsumer"), message: message("orderCancelled") },
      publish: { operationId: "publishOrderCancelled", summary: "Publish cancellations.", bindings: bindings("producerAlias"), message: message("orderCancelled") },
    },
    "retail.cdc.payments.authorised.v1": {
      description: "Payment authorisations.",
      subscribe: { operationId: "receivePaymentAuthorised", summary: "Receive authorisations.", traits: [trait("kafkaConsumer")], message: message("paymentAuthorised") },
      publish: { operationId: "publishPaymentAuthorised", summary: "Publish authorisations.", traits: [trait("observability"), trait("kafkaProducerAlias")], message: message("paymentAuthorised") },
    },
    "retail.cdc.payments.refunded.v1": {
      description: "Payment refunds.",
      subscribe: {
        operationId: "receivePaymentRefunded",
        summary: "Receive refunds.",
        bindings: { amqp: { expiration: 100000, priority: 5, deliveryMode: 2, ack: true, bindingVersion: "0.3.0" } },
        traits: { $ref: "#/components/x-trait-lists/consumer" },
        message: message("paymentAuthorised"),
      },
      publish: {
        operationId: "publishPaymentRefunded",
        summary: "Publish refunds.",
        bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.4.0" } },
        traits: [{ summary: "Refunds.", bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.4.0" } } }],
        message: message("paymentAuthorised"),
      },
    },
    "retail.cdc.stock.adjusted.v1": {
      description: "Stock adjustments.",
      parameters: { region: { description: "Region code.", schema: { type: "string", enum: ["eu", "latam"] }, location: "$message.header#/region" } },
      subscribe: {
        operationId: "receiveStockAdjusted",
        summary: "Receive stock adjustments.",
        bindings: { kafka: { $ref: "#/components/x-kafka/inventory" }, mqtt: { qos: 1, bindingVersion: "0.2.0" }, "x-routing": { owner: "stock" } },
        message: message("stockAdjusted"),
      },
    },
    "stores/{storeId}/terminals/{terminalId}/telemetry": {
      description: "Store terminal telemetry bridged to Kafka.",
      parameters: { storeId: { schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" } }, terminalId: { schema: { type: ["string", "null"] } } },
      bindings: { mqtt: {} },
      publish: {
        operationId: "publishTelemetry",
        summary: "Publish telemetry.",
        bindings: { mqtt: { qos: 0, retain: false, bindingVersion: "0.2.0" }, kafka: { clientId: { type: "string", enum: ["bridge"] } } },
        message: message("telemetry"),
      },
    },
    "retail.cmd.warehouse.picking.v1": {
      description: "Warehouse picking commands.",
      subscribe: { operationId: "receivePicking", summary: "Receive picking commands.", bindings: { $ref: "./shared/operation-bindings.yaml#/warehouse" }, message: message("picking") },
      publish: { operationId: "publishPicking", summary: "Publish picking commands.", traits: [{ $ref: "./shared/operation-traits.yaml#/kafkaProducer" }], message: message("picking") },
    },
    "retail.cdc.prices.changed.v1": {
      description: "Price changes.",
      subscribe: { operationId: "receivePriceChanged", summary: "Receive price changes.", bindings: { kafka: { $ref: "./shared/kafka-operation-bindings.yaml#/pricing" } }, message: message("priceChanged") },
      publish: { operationId: "publishPriceChanged", summary: "Publish price changes.", bindings: { $ref: "#/components/operationBindings/espa%C3%B1a" }, message: message("priceChanged") },
    },
    "retail.cdc.customers.updated.v1": {
      description: "Customer updates.",
      subscribe: { $ref: "#/components/x-operations/receiveCustomer" },
      publish: { $ref: "#/components/x-operations/publishCustomerAlias" },
    },
    "retail.cdc.stores.opened.v1": { $ref: "#/components/channels/storesOpened" },
    "retail.cdc.stores.closed.v1": { $ref: "./shared/channels.yaml#/storesClosed" },
    "x-retail.cdc.partner.orders.v1": {
      description: "Partner orders.",
      publish: { operationId: "publishPartnerOrder", summary: "Publish partner orders.", bindings: { kafka: { groupId: null, bindingVersion: "0.1.0" } }, message: message("orderPlaced") },
    },
    "retail.cdc.console.audit.v1": {
      description: "Console audit trail.",
      bindings: { ws: { method: "GET", bindingVersion: "0.1.0" } },
      subscribe: { operationId: "receiveAudit", summary: "Receive audit.", bindings: { kafka: { "x-owner": "console" } }, traits: [trait("external")], message: message("audit") },
    },
    "retail.cdc.silent.v1": { description: "Channel without operations." },
  },
  components: {
    channels: {
      storesOpened: {
        description: "Store openings.",
        subscribe: { operationId: "receiveStoreOpened", summary: "Receive openings.", bindings: { kafka: { groupId: { type: "string" } } }, message: message("storeOpened") },
        publish: { operationId: "publishStoreOpened", summary: "Publish openings.", traits: [[{ bindings: { kafka: {} } }, {}]], message: message("storeOpened") },
      },
      archive: { description: "Archived orders.", subscribe: { operationId: "receiveArchive", summary: "Receive archive.", bindings: bindings("aliasTwice"), message: message("orderPlaced") } },
    },
    operationBindings: {
      fulfilmentConsumer: { kafka: { groupId: { type: "string", enum: ["fulfilment"] }, bindingVersion: "0.5.0" }, amqp: { ack: true, bindingVersion: "0.3.0" } },
      producer: { kafka: { clientId: { type: "string", enum: ["orders-service"] }, bindingVersion: "0.5.0" } },
      producerAlias: bindings("producer"),
      aliasTwice: bindings("producerAlias"),
      "espa\u00f1a": { kafka: { clientId: { type: "string" } } },
    },
    operationTraits: {
      kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["payments"] }, bindingVersion: "0.5.0" } } },
      kafkaProducer: { bindings: bindings("producer") },
      kafkaProducerAlias: trait("kafkaProducer"),
      observability: { description: "Traced operation.", tags: [{ name: "traced" }] },
      external: { $ref: "./shared/operation-traits.yaml#/audit" },
    },
    "x-trait-lists": { consumer: [trait("observability"), trait("kafkaConsumer")] },
    "x-kafka": { inventory: { groupId: { type: "string", enum: ["inventory"] }, bindingVersion: "0.5.0" } },
    "x-operations": {
      receiveCustomer: { operationId: "receiveCustomerUpdated", summary: "Receive customer updates.", bindings: { kafka: {} }, message: message("customerUpdated") },
      publishCustomer: { operationId: "publishCustomerUpdated", summary: "Publish customer updates.", traits: [trait("kafkaProducer")], message: message("customerUpdated") },
      publishCustomerAlias: { $ref: "#/components/x-operations/publishCustomer" },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        contentType: "application/json",
        correlationId: { location: "$message.header#/correlationId" },
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
        payload: { type: "object", properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
        bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" } },
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "OrderPlaced", namespace: "es.quality.retail", fields: [{ name: "orderId", type: "string" }, { name: "couponCode", type: ["null", "string"], default: null }] },
      },
      orderCancelled: { name: "orderCancelled", payload: { type: "object", properties: { reason: { type: ["string", "null"] } } } },
      paymentAuthorised: { name: "paymentAuthorised", payload: { type: "object" }, traits: [{ $ref: "#/components/messageTraits/kafkaKey" }] },
      stockAdjusted: { name: "stockAdjusted", payload: { type: "object" } },
      telemetry: { name: "telemetry", payload: { type: "object" } },
      picking: { name: "picking", payload: { type: "object" } },
      priceChanged: { name: "priceChanged", payload: { type: "object" } },
      customerUpdated: { name: "customerUpdated", payload: { type: "object" } },
      storeOpened: { name: "storeOpened", payload: { type: "object" } },
      audit: { name: "audit", payload: { type: "object" } },
    },
    messageTraits: { kafkaKey: { bindings: { kafka: { key: { type: "string" } } } } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
  },
};
