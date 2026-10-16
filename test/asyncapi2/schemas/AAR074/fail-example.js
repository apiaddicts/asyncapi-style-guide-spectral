module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:northwind:logistics:shipments",
  info: {
    title: "Northwind Shipment Events",
    version: "2.3.0",
    description: "Kafka and MQTT events of the Northwind logistics platform whose schemas mix several property naming styles.",
  },
  defaultContentType: "application/json",
  servers: {
    production: {
      url: "kafka.northwind.example.com:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.northwind.example.com", bindingVersion: "0.4.0" } },
    },
    hubs: { url: "mqtt.northwind.example.com:8883", protocol: "secure-mqtt" },
  },
  channels: {
    "logistics.cdc.shipments.created.v1": {
      description: "A shipment was created in the warehouse management system.",
      bindings: { kafka: { topic: "logistics.cdc.shipments.created.v1", partitions: 12, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishShipmentCreated",
        bindings: {
          kafka: {
            groupId: { type: "string", enum: ["shipment-publisher"] },
            clientId: { type: "object", properties: { client_id: { type: "string" } } },
            bindingVersion: "0.4.0",
          },
        },
        message: {
          messageId: "shipmentCreated",
          contentType: "application/json",
          headers: {
            type: "object",
            properties: {
              correlationId: { type: "string", format: "uuid" },
              "x-tenant-id": { type: "string" },
            },
          },
          payload: {
            type: "object",
            required: ["shipmentId", "origin_warehouse"],
            properties: {
              shipmentId: { type: "string", format: "uuid" },
              origin_warehouse: { type: "string", maxLength: 12 },
              parcels: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    parcelId: { type: "string" },
                    WeightKg: { type: "number", format: "double" },
                  },
                },
              },
              destination: { $ref: "#/components/schemas/Address" },
              cancelledAt: { type: ["string", "null"], format: "date-time" },
            },
          },
          bindings: {
            kafka: {
              key: { type: "object", properties: { shipment_key: { type: "string" } } },
              bindingVersion: "0.4.0",
            },
          },
          examples: [{ name: "created", payload: { shipmentId: "6f1c", origin_warehouse: "MAD-01", Any_Key: 1 } }],
          traits: [
            { $ref: "#/components/messageTraits/tracing" },
            { headers: { type: "object", properties: { retry_count: { type: "integer", format: "int32" } } } },
          ],
        },
      },
      subscribe: {
        operationId: "receiveShipmentUpdates",
        message: {
          oneOf: [
            { $ref: "#/components/messages/shipmentDelayed" },
            {
              messageId: "shipmentDelivered",
              payload: {
                type: "object",
                properties: {
                  deliveredAt: { type: "string", format: "date-time" },
                  "signed-by": { type: "string" },
                },
              },
            },
            {
              messageId: "shipmentLost",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: {
                type: "record",
                name: "ShipmentLost",
                namespace: "com.northwind.logistics",
                fields: [
                  { name: "shipmentId", type: "string" },
                  {
                    name: "last_scan",
                    type: [
                      "null",
                      {
                        type: "record",
                        name: "Scan",
                        fields: [
                          { name: "scannedAt", type: { type: "long", logicalType: "timestamp-millis" } },
                          { name: "Hub", type: "string" },
                        ],
                      },
                    ],
                    default: null,
                  },
                ],
              },
            },
          ],
        },
      },
    },
    "logistics/{hubId}/scans": {
      description: "Scans published by the hub scanners over MQTT.",
      parameters: {
        hubId: { description: "Hub code.", schema: { type: "string", pattern: "^[A-Z]{3}$" } },
        region: { $ref: "#/components/parameters/region" },
      },
      subscribe: {
        operationId: "receiveScans",
        bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } },
        message: { $ref: "#/components/messages/parcelScanned" },
      },
    },
    "logistics.cmd.labels.print.v1": {
      description: "Label print commands, described with RAML data types.",
      publish: {
        operationId: "printLabel",
        message: {
          messageId: "labelPrintRequested",
          schemaFormat: "application/raml+yaml;version=1.0",
          payload: { type: "object", properties: { label_format: "string", "copies?": "integer" } },
        },
      },
    },
  },
  components: {
    schemas: {
      Address: {
        type: "object",
        properties: {
          street: { type: "string" },
          postal_code: { type: "string" },
          geo: { type: "object", properties: { lat: { type: "number" }, Lng: { type: "number" } } },
        },
      },
      Dimensions: {
        type: "object",
        allOf: [{ properties: { heightCm: { type: "number" } } }, { properties: { width_cm: { type: "number" } } }],
      },
      CarrierEvent: {
        type: "record",
        name: "CarrierEvent",
        namespace: "com.northwind.carriers",
        fields: [
          { name: "carrierCode", type: "string" },
          { name: "event-type", type: "string" },
        ],
      },
    },
    parameters: {
      region: { description: "Region of the hub.", schema: { type: "object", properties: { regionCode: { type: "string" }, Region_Name: { type: "string" } } } },
    },
    channels: {
      auditTrail: {
        publish: {
          message: { messageId: "auditRecorded", payload: { type: "object", properties: { audit_id: { type: "string" } } } },
        },
      },
    },
    messages: {
      shipmentDelayed: {
        messageId: "shipmentDelayed",
        payload: { type: "object", properties: { delayMinutes: { type: "integer" }, Reason: { type: "string" } } },
      },
      parcelScanned: {
        messageId: "parcelScanned",
        payload: { $ref: "#/components/schemas/Dimensions" },
        headers: { type: "object", properties: { scannerId: { type: "string" }, firmware_version: { type: "string" } } },
      },
    },
    messageTraits: {
      tracing: { headers: { type: "object", properties: { traceparent: { type: "string" }, TraceState: { type: "string" } } } },
    },
  },
};
