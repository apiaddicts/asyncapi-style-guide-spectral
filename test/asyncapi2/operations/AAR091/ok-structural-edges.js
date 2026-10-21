module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Logistics Backbone", version: "1.0.0" },
  tags: [{ name: "logistics" }],
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure" } },
  channels: {
    "logistics.cdc.shipments.dispatched.v1": {
      parameters: { region: { description: "", schema: { type: ["string", "null"] } } },
      subscribe: {
        operationId: "receiveShipmentDispatched",
        traits: [{}, { $ref: "#/components/operationTraits/withoutMessage" }],
        message: {
          oneOf: [
            { name: "shipmentDispatched", payload: { type: "object", properties: { carrier: { type: ["string", "null"] } } } },
            { $ref: "#/components/messages/shipmentDispatchedAvro" },
          ],
        },
      },
      publish: { operationId: "publishShipmentDispatched", message: { oneOf: [] } },
    },
    "logistics.cdc.parcels.scanned.v1": {
      bindings: { kafka: { topic: "", partitions: 3 } },
      publish: { message: { name: "parcelScanned", headers: { type: "object" }, traits: [{ $ref: "#/components/messageTraits/blank" }], examples: [] } },
    },
  },
  components: {
    channels: {
      reusable: { subscribe: { message: { $ref: "#/components/messages/shipmentDispatchedAvro" } } },
    },
    messages: {
      shipmentDispatchedAvro: {
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "ShipmentDispatched", fields: [{ name: "carrier", type: ["null", "string"], default: null }] },
      },
      orphan: null,
      emptyOneOf: { oneOf: [] },
      retired: { $ref: "#/components/messages/missing" },
    },
    schemas: { Shipment: { type: "object", properties: { message: { type: "object" }, messages: { type: "array", items: {} } } } },
    parameters: { region: { description: "" } },
    operationTraits: { withoutMessage: { bindings: { kafka: { groupId: { type: "string" } } } } },
    messageTraits: { blank: { headers: {} } },
    servers: { backup: { url: "", protocol: "kafka" } },
    "x-channels": {
      draft: {},
      blank: { publish: { message: { oneOf: [] } } },
      nothing: null,
    },
  },
  "x-channels": {
    "logistics.cdc.drafts.v1": {},
    "logistics.cdc.nulls.v1": null,
  },
  "x-channel-list": [{}, null, "logistics.cdc.text.v1"],
  "x-asyncapi3-channels": { draft: { address: null, messages: {} } },
};
