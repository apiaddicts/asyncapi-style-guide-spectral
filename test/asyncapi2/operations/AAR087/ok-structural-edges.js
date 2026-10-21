module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0" },
  tags: [{ name: "logistics" }],
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure" } },
  channels: {
    "logistics.cdc.shipments.dispatched.v1": {
      description: "Shipments dispatched from a warehouse.",
      parameters: { region: { description: "", schema: { type: ["string", "null"] } } },
      subscribe: {
        operationId: "receiveShipmentDispatched",
        description: "",
        summary: "",
        tags: [{ name: "" }],
        traits: [{}, { $ref: "#/components/operationTraits/withoutMessage" }],
        message: {
          oneOf: [
            { name: "shipmentDispatched", description: "", payload: { type: "object", properties: { carrier: { type: ["string", "null"], description: "" } } } },
            { $ref: "#/components/messages/shipmentDispatchedAvro" },
          ],
        },
      },
      publish: { operationId: "publishShipmentDispatched", message: { oneOf: [] } },
    },
    "logistics.cdc.parcels.scanned.v1": {
      description: "Parcel scans.",
      bindings: { kafka: { topic: "", partitions: 3 } },
      publish: { message: { name: "parcelScanned", headers: { type: "object", description: "" }, traits: [{ $ref: "#/components/messageTraits/blank" }], examples: [] } },
    },
  },
  components: {
    channels: {
      reusable: { description: "Reusable channel.", subscribe: { message: { $ref: "#/components/messages/shipmentDispatchedAvro" } } },
    },
    messages: {
      shipmentDispatchedAvro: {
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
      },
      orphan: {},
      emptyOneOf: { oneOf: [] },
    },
    schemas: { Shipment: { type: "object", description: "", properties: { id: { type: "string" } } } },
    parameters: { region: { description: "" } },
    operationTraits: { withoutMessage: { description: "", bindings: { kafka: { groupId: { type: "string" } } } } },
    messageTraits: { blank: { description: "", headers: {} } },
    servers: { backup: { url: "", protocol: "kafka" } },
    "x-channels": {
      draft: {},
      blank: { description: "", publish: {} },
      nothing: null,
    },
  },
  "x-channels": {
    "logistics.cdc.drafts.v1": {},
    "logistics.cdc.nulls.v1": null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi3-channels": { draft: { address: null, description: "", messages: {} } },
};
