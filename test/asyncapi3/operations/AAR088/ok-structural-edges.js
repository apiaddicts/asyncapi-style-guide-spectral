module.exports = {
  asyncapi: "3.1.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0", tags: [{ name: "logistics" }] },
  servers: {
    production: { host: "kafka.quality.es:9093", protocol: "kafka-secure" },
    unused: { host: "kafka-unused.quality.es:9093", protocol: "kafka-secure", "x-servers": [] },
  },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipments.dispatched.v1",
      servers: [{ $ref: "#/servers/production" }],
      parameters: { region: { description: "", "x-servers": [] } },
      bindings: { kafka: { servers: [], partitions: 3 } },
      messages: {
        shipmentDispatched: {
          name: "shipmentDispatched",
          servers: null,
          payload: { type: "object", properties: { servers: { type: "array", items: { type: ["string", "null"] } } } },
          traits: [{ $ref: "#/components/messageTraits/blank" }],
        },
        shipmentDispatchedAvro: { $ref: "#/components/messages/shipmentDispatchedAvro" },
      },
    },
  },
  operations: {
    receiveShipment: {
      action: "receive",
      servers: [],
      channel: { $ref: "#/channels/shipmentDispatched" },
      messages: [],
      traits: [{ servers: [] }, { $ref: "#/components/operationTraits/blank" }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/components/channels/reusable" }, servers: [], messages: [] },
    },
    orphanOperation: { action: "send", channel: { $ref: "#/x-channels/draft" } },
  },
  components: {
    channels: {
      reusable: { address: null, servers: [{ $ref: "#/servers/production" }], messages: { replied: { $ref: "#/components/messages/shipmentDispatchedAvro" } } },
    },
    operations: { blankOperation: { action: "send", channel: { address: "inline", servers: [] }, servers: [] } },
    replies: { blankReply: { address: { location: "$message.header#/replyTo" }, channel: { address: null, messages: {} }, messages: [] } },
    replyAddresses: { dynamic: { location: "$message.header#/replyTo", servers: [] } },
    messages: {
      shipmentDispatchedAvro: {
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "ShipmentDispatched", fields: [{ name: "servers", type: ["null", { type: "array", items: "string" }], default: null }] },
        },
      },
      orphan: { servers: [] },
    },
    schemas: { Shipment: { type: "object", properties: { servers: { type: "array" } } } },
    parameters: { region: { description: "" } },
    operationTraits: { blank: { servers: [], bindings: { kafka: { groupId: { type: "string" } } } } },
    messageTraits: { blank: { servers: [], headers: {} } },
    servers: { backup: { host: "", protocol: "kafka" } },
    "x-channels": { draft: {}, blank: { address: null, servers: [] }, nothing: null },
  },
  "x-channels": {
    draft: {},
    blank: { address: "", servers: [] },
    nothing: null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi2-channels": { "logistics.cdc.drafts.v1": { description: "", servers: [] } },
};
