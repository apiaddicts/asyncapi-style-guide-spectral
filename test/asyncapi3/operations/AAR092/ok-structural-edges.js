module.exports = {
  asyncapi: "3.1.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0", tags: [{ name: "logistics" }] },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure" } },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipments.dispatched.v1",
      description: "",
      parameters: { region: { description: "" } },
      messages: {
        shipmentDispatched: { name: "shipmentDispatched", summary: "", payload: { type: "object", properties: { carrier: { type: ["string", "null"], description: "" } } } },
        shipmentDispatchedAvro: { $ref: "#/components/messages/shipmentDispatchedAvro" },
      },
    },
    parcelScanned: { address: null, messages: {}, publish: { summary: "" }, subscribe: {} },
    draft: {},
  },
  operations: {
    receiveShipment: {
      action: "receive",
      channel: { $ref: "#/channels/shipmentDispatched" },
      summary: "Receive dispatched shipments.",
      description: "",
      title: "",
      messages: [],
      traits: [{}, { $ref: "#/components/operationTraits/blank" }, { description: "" }],
      reply: { address: { location: "$message.header#/replyTo", description: "" }, channel: { $ref: "#/channels/missingReplies" }, messages: [] },
    },
    sendParcel: {
      action: "send",
      channel: { $ref: "#/channels/parcelScanned" },
      summary: "Send parcel scans.",
      reply: { channel: {}, address: { location: "" } },
      bindings: { kafka: { summary: "" } },
    },
  },
  components: {
    channels: { reusable: { address: "", messages: {} } },
    operations: { reusable: { action: "send", channel: { $ref: "#/components/channels/reusable" }, summary: "Reusable operation.", description: "" } },
    replies: { blankReply: { address: { location: "$message.header#/replyTo" }, channel: {}, messages: [] }, emptyReply: {} },
    replyAddresses: { dynamic: { location: "$message.header#/replyTo", description: "" } },
    messages: {
      shipmentDispatchedAvro: {
        summary: "",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
        },
      },
      orphan: {},
    },
    schemas: { Shipment: { type: "object", description: "", properties: { action: { type: "string" }, channel: { type: "string" }, summary: { type: "string" } } } },
    parameters: { region: { description: "" } },
    correlationIds: { blank: { location: "$message.header#/id", description: "" } },
    operationTraits: { blank: { summary: "", description: "" }, unused: { summary: null }, empty: {} },
    messageTraits: { blank: { summary: "", headers: {} } },
    servers: { backup: { host: "", protocol: "kafka" } },
    "x-operations": { draft: {}, blank: { action: "", channel: {}, summary: "" }, nothing: null },
  },
  "x-operations": { draft: {}, blank: { action: null, channel: null, summary: null }, nothing: null },
  "x-operation-list": [{}, null, "sendParcel"],
  "x-asyncapi2-channels": { "logistics.cdc.drafts.v1": { description: "", publish: {}, subscribe: { summary: "" } } },
};
