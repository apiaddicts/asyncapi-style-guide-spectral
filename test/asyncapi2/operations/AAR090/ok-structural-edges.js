module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0" },
  tags: [{ name: "logistics" }],
  servers: {
    production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", bindings: { amqp: {} } },
    warehouse: { url: "rabbit.quality.es:5671", protocol: "amqps", bindings: {} },
  },
  channels: {
    "logistics.cdc.shipments.dispatched.v1": {
      description: "Shipments dispatched from a warehouse.",
      parameters: { region: { description: "", schema: { type: ["string", "null"] }, bindings: { amqp: {} } } },
      bindings: { kafka: { topic: "logistics.cdc.shipments.dispatched.v1", partitions: 6, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveShipmentDispatched",
        bindings: { amqp: { ack: true }, Kafka: null },
        traits: [{}, { $ref: "#/components/operationTraits/withoutKafka" }],
        message: {
          oneOf: [
            { name: "shipmentDispatched", bindings: { amqp: { contentEncoding: "gzip" } }, payload: { type: "object", properties: { carrier: { type: ["string", "null"] } } } },
            { $ref: "#/components/messages/shipmentDispatchedAvro" },
          ],
        },
      },
      publish: { operationId: "publishShipmentDispatched", bindings: null, message: { oneOf: [] } },
    },
    "logistics.cdc.parcels.scanned.v1": {
      description: "Parcel scans.",
      bindings: { kafka: {} },
      publish: { message: { name: "parcelScanned", bindings: {}, traits: [{ $ref: "#/components/messageTraits/blank" }], examples: [] } },
    },
  },
  components: {
    channels: {
      reusable: { description: "Reusable channel.", bindings: { $ref: "#/components/channelBindings/kafkaDefaults" }, subscribe: { message: { $ref: "#/components/messages/shipmentDispatchedAvro" } } },
    },
    channelBindings: {
      kafkaDefaults: { kafka: {} },
      amqpOnly: { amqp: { is: "queue" } },
      empty: {},
      nothing: null,
      nullKafka: { kafka: null },
    },
    operationBindings: { amqpAck: { amqp: { ack: true } }, empty: {} },
    messageBindings: { amqpOnly: { amqp: {} }, nullKafka: { kafka: null } },
    serverBindings: { empty: {}, nullKafka: { kafka: null } },
    messages: {
      shipmentDispatchedAvro: {
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        bindings: { amqp: {} },
        payload: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
      },
      orphan: { bindings: null },
      emptyOneOf: { oneOf: [] },
    },
    schemas: { Shipment: { type: "object", properties: { id: { type: "string" }, bindings: { type: "object" } } } },
    parameters: { region: { description: "", bindings: {} } },
    operationTraits: { withoutKafka: { bindings: { amqp: { ack: false } } } },
    messageTraits: { blank: { headers: {}, bindings: { kafka: null } } },
    servers: { backup: { url: "kafka-backup.quality.es:9093", protocol: "kafka" } },
    "x-channels": {
      draft: {},
      blank: { description: "", bindings: {} },
      nothing: null,
    },
  },
  "x-channels": {
    "logistics.cdc.drafts.v1": {},
    "logistics.cdc.nulls.v1": null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi3-channels": { draft: { address: null, bindings: {} } },
};
