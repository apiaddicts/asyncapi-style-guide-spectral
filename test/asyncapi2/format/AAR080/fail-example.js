module.exports = {
  asyncapi: "2.6.0",
  id: "urn:logistics:parcel-tracking",
  info: {
    title: "Parcel Tracking Events",
    version: "2.8.1",
    description: "Pick-up, hub scan and delivery events of the parcel network.",
    contact: { name: "Parcel Platform", email: "parcel-platform@logistics.example.io" },
    license: {
      name: "Apache License, Version 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      identifier: "Apache-2.0",
      spdx: "Apache-2.0",
      Name: "Apache-2.0",
      "x-spdx-id": "Apache-2.0",
    },
    "x-license": { name: "Apache-2.0" },
  },
  license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  defaultContentType: "application/json",
  servers: {
    trackingKafka: {
      url: "kafka.tracking.logistics.example.io:9093",
      protocol: "kafka-secure",
      description: "Tracking backbone.",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.logistics.example.io", bindingVersion: "0.4.0" } },
    },
    hubsAmqp: { url: "amqps://hubs.logistics.example.io:5671/scans", protocol: "amqps", description: "Hub scanner broker." },
  },
  channels: {
    "parcels.cdc.pickups.completed.v2": {
      description: "Parcels picked up by a courier.",
      servers: ["trackingKafka"],
      publish: {
        operationId: "publishPickupCompleted",
        message: {
          name: "pickupCompleted",
          title: "Pickup completed",
          payload: { type: "object", properties: { parcelId: { type: "string" }, license: { type: "object", properties: { name: { type: "string", const: "Apache-2.0" } } } } },
          examples: [{ name: "pickedUp", payload: { parcelId: "PCL-0001", license: { name: "Apache-2.0" } } }],
        },
      },
      subscribe: {
        operationId: "receivePickupCompleted",
        message: {
          oneOf: [
            { $ref: "#/components/messages/pickupCompletedAvro" },
            { name: "pickupCompletedLegacy", title: "Pickup completed legacy", payload: { type: "object", properties: { parcelId: { type: "string" } } } },
          ],
        },
      },
    },
    "hubs/{hubId}/scans": {
      description: "Parcel scans at a hub.",
      servers: ["hubsAmqp"],
      parameters: { hubId: { description: "Hub code.", schema: { type: "string", enum: ["MAD1", "BCN2"] } } },
      bindings: { amqp: { is: "queue", queue: { name: "hub-scans", durable: true, exclusive: false, autoDelete: false, vhost: "/" }, bindingVersion: "0.2.0" } },
      subscribe: {
        operationId: "receiveHubScan",
        message: { name: "hubScanned", title: "Hub scanned", traits: [{ $ref: "#/components/messageTraits/scanHeaders" }], payload: { $ref: "#/components/schemas/Scan" } },
      },
    },
  },
  components: {
    messages: {
      pickupCompletedAvro: {
        name: "pickupCompletedAvro",
        title: "Pickup completed in Avro",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "PickupCompleted", fields: [{ name: "parcelId", type: "string" }, { name: "license", type: ["null", "string"], default: null }] },
      },
    },
    schemas: { Scan: { type: "object", properties: { parcelId: { type: "string" }, scannedAt: { type: ["string", "null"], format: "date-time" } } } },
    messageTraits: { scanHeaders: { headers: { type: "object", properties: { license: { type: "string", const: "MIT" } } } } },
    "x-licenses": { valid: { name: "MIT", url: "https://opensource.org/license/mit" } },
  },
};
