module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0" },
  servers: {
    production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", bindings: { amqp: {} } },
    warehouse: { host: "rabbit.quality.es:5671", protocol: "amqps", bindings: {} },
  },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipments.dispatched.v1",
      description: "Shipments dispatched from a warehouse.",
      parameters: { region: { description: "", enum: ["eu", "us"] } },
      messages: {
        shipmentDispatched: { name: "shipmentDispatched", bindings: { amqp: { contentEncoding: "gzip" } }, payload: { type: "object", properties: { carrier: { type: ["string", "null"] } } } },
        shipmentDispatchedAvro: { $ref: "#/components/messages/shipmentDispatchedAvro" },
      },
      bindings: { kafka: { topic: "logistics.cdc.shipments.dispatched.v1", partitions: 6, bindingVersion: "0.5.0" } },
    },
    parcelScanned: {
      address: null,
      description: "Parcel scans routed per scanner.",
      messages: { parcelScanned: { name: "parcelScanned", bindings: {}, traits: [{ $ref: "#/components/messageTraits/blank" }], examples: [] } },
      bindings: { kafka: {} },
    },
  },
  operations: {
    receiveShipment: {
      action: "receive",
      channel: { $ref: "#/channels/shipmentDispatched" },
      bindings: { amqp: { ack: true }, Kafka: null },
      traits: [{ $ref: "#/components/operationTraits/withoutKafka" }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { address: null, messages: {}, bindings: {} } },
    },
    sendParcel: { action: "send", channel: { address: "inline.parcels", bindings: null }, bindings: null },
  },
  components: {
    channels: {
      reusable: { address: "logistics.cdc.reusable.v1", description: "Reusable channel.", messages: {}, bindings: { $ref: "#/components/channelBindings/kafkaDefaults" } },
    },
    operations: { inlineChannel: { action: "send", channel: { address: "inline", bindings: {} } } },
    replies: { inline: { channel: { address: null, bindings: { mqtt: {} } } } },
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
        bindings: { amqp: {} },
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
        },
      },
      orphan: { bindings: null },
    },
    schemas: { Shipment: { type: "object", properties: { id: { type: "string" }, bindings: { type: "object" } } } },
    parameters: { region: { description: "", bindings: {} } },
    operationTraits: { withoutKafka: { bindings: { amqp: { ack: false } } } },
    messageTraits: { blank: { headers: {}, bindings: { kafka: null } } },
    servers: { backup: { host: "kafka-backup.quality.es:9093", protocol: "kafka" } },
    "x-channels": {
      draft: {},
      blank: { address: "", bindings: {} },
      nothing: null,
    },
  },
  "x-channels": {
    drafts: { address: "logistics.cdc.drafts.v1" },
    nulls: null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi2-channels": { "logistics.cdc.legacy.v1": { description: "", subscribe: { bindings: {} } } },
};
