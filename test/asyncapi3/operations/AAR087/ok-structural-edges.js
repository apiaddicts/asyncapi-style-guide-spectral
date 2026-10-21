module.exports = {
  asyncapi: "3.1.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0", tags: [{ name: "logistics" }] },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure" } },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipments.dispatched.v1",
      description: "Shipments dispatched from a warehouse.",
      parameters: { region: { description: "" } },
      messages: {
        shipmentDispatched: { name: "shipmentDispatched", description: "", payload: { type: "object", properties: { carrier: { type: ["string", "null"], description: "" } } } },
        shipmentDispatchedAvro: { $ref: "#/components/messages/shipmentDispatchedAvro" },
      },
    },
    parcelScanned: {
      address: "logistics.cdc.parcels.scanned.v1",
      description: "Parcel scans.",
      bindings: { kafka: { topic: "", partitions: 3 } },
      messages: { parcelScanned: { name: "parcelScanned", headers: { type: "object", description: "" }, traits: [{ $ref: "#/components/messageTraits/blank" }] } },
    },
  },
  operations: {
    receiveShipment: {
      action: "receive",
      description: "",
      summary: "",
      channel: { $ref: "#/channels/shipmentDispatched" },
      messages: [],
      traits: [{}, { $ref: "#/components/operationTraits/blank" }],
      reply: { address: { location: "$message.header#/replyTo", description: "" }, channel: { $ref: "#/components/channels/reusable" }, messages: [] },
    },
    sendParcel: { action: "send", channel: { $ref: "#/channels/parcelScanned" } },
    orphanOperation: { action: "send", channel: { $ref: "#/x-channels/draft" } },
  },
  components: {
    channels: {
      reusable: { address: "logistics.replies", description: "Reusable reply channel.", messages: { replied: { $ref: "#/components/messages/shipmentDispatchedAvro" } } },
    },
    operations: { blankOperation: { action: "send", channel: { $ref: "#/components/channels/reusable" }, description: "" } },
    replies: { blankReply: { address: { location: "$message.header#/replyTo" }, messages: [] } },
    replyAddresses: { dynamic: { location: "$message.header#/replyTo", description: "" } },
    messages: {
      shipmentDispatchedAvro: {
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
        },
      },
      orphan: {},
    },
    schemas: { Shipment: { type: "object", description: "", properties: { id: { type: "string" } } } },
    parameters: { region: { description: "" } },
    correlationIds: { blank: { location: "$message.header#/id", description: "" } },
    operationTraits: { blank: { description: "", bindings: { kafka: { groupId: { type: "string" } } } } },
    messageTraits: { blank: { description: "", headers: {} } },
    servers: { backup: { host: "", protocol: "kafka" } },
    "x-channels": { draft: {}, blank: { address: null, description: "", messages: {} }, nothing: null },
  },
  "x-channels": {
    draft: {},
    blank: { address: "", description: "", messages: {} },
    nothing: null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi2-channels": { "logistics.cdc.drafts.v1": { description: "", publish: {} } },
};
