const message = (channelName, name) => ({ $ref: `#/channels/${channelName}/messages/${name}` });

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0", tags: [{ name: "logistics" }] },
  servers: {
    production: { host: "kafka.quality.es:9093", protocol: "kafka-secure" },
    depots: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt" },
  },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipments.dispatched.v1",
      parameters: { region: { description: "", enum: ["eu", "latam"] } },
      messages: {
        shipmentDispatched: {
          payload: { type: "object", properties: { carrier: { type: ["string", "null"] }, messages: { type: "array", items: { type: "string" } } } },
          traits: [{ $ref: "#/components/messageTraits/blank" }],
        },
        empty: null,
      },
      publish: { message: null },
      subscribe: {},
    },
    parcelScanned: { address: null, messages: { parcelAvro: { $ref: "#/components/messages/parcelAvro" } } },
    silent: { address: "logistics.cdc.silent.v1", messages: {} },
    unusable: null,
    text: "logistics.cdc.text.v1",
  },
  operations: {
    receiveShipment: {
      action: "receive",
      channel: { $ref: "#/channels/shipmentDispatched" },
      traits: [{}, { description: "" }, { $ref: "#/components/operationTraits/emptyMessages" }],
      messages: [message("shipmentDispatched", "shipmentDispatched"), null, message("shipmentDispatched", "missing")],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/silent" }, messages: [] },
    },
    sendParcel: { action: "send", channel: { $ref: "#/channels/parcelScanned" }, messages: [message("parcelScanned", "parcelAvro")], reply: { messages: null } },
    sendExternal: { $ref: "./shared/operations.yaml#/sendParcel" },
    sendExternalMessages: { action: "send", channel: { $ref: "#/channels/silent" }, messages: { $ref: "./shared/messages.yaml#/parcels" } },
  },
  components: {
    channels: { reusable: { address: "", messages: {} }, nullChannel: null, legacy: { publish: {}, subscribe: { message: { oneOf: [] } } } },
    operations: { reusable: { action: "send", messages: [message("parcelScanned", "parcelAvro")] } },
    replies: { blank: { channel: { $ref: "#/channels/silent" }, messages: [] }, nullMessages: { messages: null }, dangling: { messages: [{ $ref: "#/components/messages/gone" }] } },
    operationTraits: { emptyMessages: { messages: [] }, nullMessage: { message: null }, unused: {} },
    messageTraits: { blank: { messages: [], message: null } },
    messages: {
      parcelAvro: {
        payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Parcel", fields: [{ name: "carrier", type: ["null", "string"], default: null }] } },
      },
      orphan: null,
      blank: {},
    },
    schemas: { Shipment: { type: "object", properties: { messages: { type: "array" }, message: { type: "string" } } } },
    parameters: { region: { description: "", enum: ["eu"] } },
    correlationIds: { blank: { location: "$message.header#/id", description: "" } },
    "x-operations": { draft: {}, blank: { messages: [] } },
  },
  "x-operations": { drafts: { action: "send" }, blank: { messages: null } },
  "x-operation-list": [{}, null],
};
