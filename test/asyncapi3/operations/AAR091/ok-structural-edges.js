module.exports = {
  asyncapi: "3.1.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0", tags: [{ name: "logistics" }] },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure" } },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipments.dispatched.v1",
      messages: {
        shipmentDispatched: { name: "shipmentDispatched", payload: { type: "object", properties: { carrier: { type: ["string", "null"] } } } },
        shipmentDispatchedAvro: { $ref: "#/components/messages/shipmentDispatchedAvro" },
      },
    },
    parcelScanned: {
      address: "logistics.cdc.parcels.scanned.v1",
      messages: { parcelScanned: { headers: { type: "object" }, traits: [{ $ref: "#/components/messageTraits/blank" }] } },
    },
  },
  operations: {
    receiveShipment: {
      action: "receive",
      channel: { $ref: "#/channels/shipmentDispatched" },
      messages: [],
      traits: [{}, { $ref: "#/components/operationTraits/blank" }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/components/channels/reusable" }, messages: [] },
    },
    sendParcel: { action: "send", channel: { $ref: "#/channels/parcelScanned" }, messages: [{ $ref: "#/components/messages/missing" }] },
    orphanOperation: { action: "send", channel: { $ref: "#/x-channels/draft" } },
    inlineChannel: { action: "send", channel: { address: "logistics.inline", messages: {} } },
    inlineReply: { action: "send", channel: { $ref: "#/channels/parcelScanned" }, reply: { channel: { address: null, messages: {} } } },
  },
  components: {
    channels: {
      reusable: { address: "logistics.replies", messages: { replied: { $ref: "#/components/messages/shipmentDispatchedAvro" } } },
    },
    operations: {
      blankOperation: { action: "send", channel: { $ref: "#/components/channels/reusable" }, messages: [] },
      inlineChannel: { action: "send", channel: { messages: {} } },
    },
    replies: { blankReply: { address: { location: "$message.header#/replyTo" }, channel: { messages: { a: null } }, messages: [] } },
    replyAddresses: { dynamic: { location: "$message.header#/replyTo" } },
    messages: {
      shipmentDispatchedAvro: {
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
        },
      },
      orphan: null,
      retired: { $ref: "#/components/messages/missing" },
    },
    schemas: { Shipment: { type: "object", properties: { messages: { type: "array", items: {} } } } },
    parameters: { region: { description: "" } },
    correlationIds: { blank: { location: "$message.header#/id" } },
    operationTraits: { blank: { bindings: { kafka: { groupId: { type: "string" } } } } },
    messageTraits: { blank: { headers: {} } },
    servers: { backup: { host: "", protocol: "kafka" } },
    "x-channels": { draft: {}, blank: { address: null, messages: {} }, nothing: null },
  },
  "x-channels": {
    draft: {},
    blank: { address: "", messages: {} },
    nothing: null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi2-channels": { "logistics.cdc.drafts.v1": { publish: {} } },
};
