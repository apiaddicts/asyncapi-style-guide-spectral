module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:retail:order-event-streams",
  info: {
    title: "Quality Retail Order Event Streams",
    version: "5.1.0",
    description: "Orders, payments, stock reservations, store sensors and courier tracking exchanged between the retail platforms.",
    contact: { name: "Retail Integration", email: "retail-integration@quality.es", url: "https://retail.quality.es/support" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    "x-servers-owner": "platform-team",
  },
  defaultContentType: "application/json",
  tags: [{ name: "orders", description: "Order lifecycle." }],
  servers: {
    eventstreams: {
      url: "es-retail.quality.es:443",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      description: "IBM Event Streams production cluster.",
      security: [{ saslScram: [] }],
      tags: [{ name: "kafka", description: "Primary backbone." }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", schemaRegistryVendor: "ibm", bindingVersion: "0.4.0" } },
    },
    ordersDr: {
      url: "{cluster}.quality.es:{port}",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      description: "Disaster recovery cluster.",
      variables: {
        cluster: { enum: ["es-dr-a", "es-dr-b"], default: "es-dr-a", description: "DR cluster." },
        port: { enum: ["443", "9093"], default: "443" },
      },
      security: [{ saslScram: [] }],
    },
    warehouseAmqp: {
      url: "amqps://rabbit.quality.es:5671/warehouse",
      protocol: "amqps",
      protocolVersion: "0.9.1",
      bindings: { amqp: { "x-vhost": "warehouse" } },
    },
    storeSensors: {
      url: "mqtt.quality.es:8883",
      protocol: "secure-mqtt",
      protocolVersion: "5.0",
      bindings: { mqtt: { clientId: "store-gateway", cleanSession: true, keepAlive: 60, bindingVersion: "0.1.0" } },
    },
    courierLive: { url: "wss://live.quality.es/couriers", protocol: "wss", protocolVersion: "13" },
    partnerWebhooks: { url: "https://hooks.quality.es/partners", protocol: "https", protocolVersion: "1.1", security: [{ apiKeyHeader: [] }] },
    legacyMq: { url: "qm1.quality.es:1414", protocol: "ibmmq", protocolVersion: "9.3", bindings: { ibmmq: { groupId: "PRODCLSTR1", cipherSpec: "ANY_TLS12_OR_HIGHER", bindingVersion: "0.1.0" } } },
    numericFields: { url: "kafka-lab.quality.es:9092", protocol: "kafka", protocolVersion: 3.3, description: "Non-string values are populated." },
    zeroWidthText: { url: "kafka-lab.quality.es:9092", protocol: "kafka", protocolVersion: "\u200b3.3.0" },
    "x-mirror": { url: "kafka-mirror.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", description: "MirrorMaker 2 target." },
    regionalShared: { $ref: "#/components/servers/regional" },
    regionalSharedAgain: { $ref: "#/components/servers/regional" },
    regionalChained: { $ref: "#/components/servers/regionalAlias" },
    withSiblings: { $ref: "#/components/servers/regional", url: "", protocolVersion: null },
    partnerExternal: { $ref: "./partner-servers.yaml#/servers/kafka" },
    partnerRemote: { $ref: "https://specs.quality.es/asyncapi/servers.yaml#/servers/kafka" },
  },
  channels: {
    "retail.cdc.orders.placed.v1": {
      description: "Orders placed in any channel.",
      servers: ["eventstreams", "ordersDr", "regionalShared"],
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 12, replicas: 3, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveOrderPlaced",
        bindings: { kafka: { groupId: { type: "string", enum: ["order-fulfilment"] }, bindingVersion: "0.4.0" } },
        traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
        message: {
          oneOf: [{ $ref: "#/components/messages/orderPlaced" }, { $ref: "#/components/messages/orderPlacedAvro" }],
        },
      },
    },
    "stores/{storeId}/sensors/{sensorId}": {
      servers: ["storeSensors"],
      parameters: {
        storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" } },
        sensorId: { $ref: "#/components/parameters/sensorId" },
      },
      publish: {
        operationId: "publishSensorReading",
        message: {
          name: "sensorReading",
          contentType: "application/json",
          headers: { type: "object", properties: { protocolVersion: { type: ["string", "null"] }, host: { type: "string" } } },
          payload: {
            type: "object",
            properties: {
              url: { type: ["string", "null"], format: "uri" },
              protocol: { type: "string", enum: ["mqtt", "kafka"] },
              protocolVersion: { type: ["string", "null"], default: null },
              reading: { type: "number" },
            },
          },
          correlationId: { location: "$message.header#/correlationId" },
          examples: [{ name: "reading", headers: { protocolVersion: null, host: "" }, payload: { url: "", protocol: "mqtt", protocolVersion: null, reading: 21.5 } }],
        },
      },
    },
    "couriers.live.positions": {
      servers: ["courierLive"],
      bindings: { ws: { method: "GET", bindingVersion: "0.1.0" } },
      subscribe: { operationId: "receiveCourierPosition", message: { $ref: "#/components/messages/courierPosition" } },
    },
  },
  components: {
    servers: {
      regional: { url: "kafka-regional.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      regionalAlias: { $ref: "#/components/servers/regional" },
      sandbox: { url: "localhost:9092", protocol: "kafka", protocolVersion: "3.3.0", description: "Local sandbox." },
      remoteShared: { $ref: "./shared-servers.yaml#/sandbox" },
    },
    schemas: {
      Order: {
        type: "object",
        required: ["orderId"],
        properties: {
          orderId: { type: "string" },
          channelUrl: { type: ["string", "null"] },
          protocol: { type: "string" },
          protocolVersion: { type: ["string", "null"] },
        },
      },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        title: "Order placed",
        contentType: "application/json",
        payload: { $ref: "#/components/schemas/Order" },
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }],
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        contentType: "application/vnd.apache.avro",
        payload: {
          type: "record",
          name: "OrderPlaced",
          namespace: "es.quality.retail",
          fields: [
            { name: "orderId", type: "string" },
            { name: "url", type: ["null", "string"], default: null },
            { name: "protocolVersion", type: ["null", "string"], default: null },
          ],
        },
      },
      courierPosition: {
        name: "courierPosition",
        payload: { type: "object", properties: { host: { type: "string" }, lat: { type: "number" }, lon: { type: "number" } } },
      },
    },
    parameters: { sensorId: { description: "Sensor identifier.", schema: { type: "string" } } },
    messageTraits: { commonHeaders: { headers: { type: "object", properties: { url: { type: "string" }, protocolVersion: { type: "string" } } } } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { clientId: { type: "string", enum: ["retail"] } } } } },
    securitySchemes: {
      saslScram: { type: "scramSha512", description: "SASL SCRAM credentials." },
      apiKeyHeader: { type: "httpApiKey", name: "X-API-Key", in: "header" },
    },
    serverBindings: { kafkaIbm: { kafka: { schemaRegistryUrl: "https://registry.quality.es" } } },
    "x-servers": { draft: { description: "Never referenced, so never checked." } },
  },
  "x-servers": { rogue: { url: "" } },
};
