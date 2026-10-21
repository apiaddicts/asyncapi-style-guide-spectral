module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0", tags: [{ name: "logistics" }] },
  servers: {
    production: { url: "kafka.quality.es:9093", protocol: "kafka-secure" },
    unused: { url: "kafka-unused.quality.es:9093", protocol: "kafka-secure", "x-servers": [] },
  },
  channels: {
    "logistics.cdc.shipments.dispatched.v1": {
      description: "Shipments dispatched from a warehouse.",
      servers: ["production"],
      parameters: { region: { description: "", schema: { type: "string" }, "x-servers": [] } },
      bindings: { kafka: { servers: [], bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishShipment",
        servers: [],
        traits: [{ $ref: "#/components/operationTraits/blank" }],
        message: {
          name: "shipmentDispatched",
          servers: null,
          payload: { type: "object", properties: { servers: { type: "array", items: { type: ["string", "null"] } }, carrier: { type: ["string", "null"] } } },
          traits: [{ $ref: "#/components/messageTraits/blank" }],
        },
      },
      subscribe: {
        operationId: "receiveShipment",
        message: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          payload: { type: "record", name: "ShipmentDispatched", fields: [{ name: "servers", type: ["null", { type: "array", items: "string" }], default: null }] },
        },
      },
    },
  },
  components: {
    servers: { backup: { url: "kafka-backup.quality.es:9093", protocol: "kafka-secure" } },
    messages: { orphan: { servers: [] }, nothing: { name: "nothing", headers: { type: "object", properties: { servers: { type: "string" } } } } },
    schemas: { Shipment: { type: "object", properties: { servers: { type: "array" } } } },
    parameters: { region: { description: "", schema: { type: "string" } } },
    operationTraits: { blank: { servers: [], bindings: { kafka: { groupId: { type: "string" } } } } },
    messageTraits: { blank: { servers: [], headers: {} } },
    "x-channels": { draft: {}, blank: { description: "", servers: [] }, nothing: null },
  },
  "x-channels": {
    draft: {},
    blank: { description: "", servers: [] },
    nothing: null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi3-channels": { draft: { address: "logistics.drafts", servers: [] } },
};
