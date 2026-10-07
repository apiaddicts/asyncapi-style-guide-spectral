module.exports = {
  asyncapi: "2.6.0",
  id: "urn:harborline:logistics:events",
  info: {
    title: "Harborline Logistics Events",
    version: "3.4.0",
    description: "Shipment, container and telemetry events exchanged across the Harborline terminals.",
  },
  defaultContentType: "application/json",
  servers: {
    kafkaTerminals: {
      url: "kafka-1.harborline.io:9093",
      protocol: "kafka-secure",
      description: "Terminal event backbone.",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.harborline.io", bindingVersion: "0.4.0" } },
    },
    mqttSensors: {
      url: "mqtts://sensors.harborline.io:8883",
      protocol: "secure-mqtt",
      description: "Crane and reefer sensors.",
    },
  },
  channels: {
    "harborline.cmd.shipments.created.v1": {
      description: "A shipment booking was confirmed.",
      publish: {
        operationId: "publishShipmentCreated",
        message: {
          messageId: "shipmentCreated",
          name: "shipmentCreated",
          contentType: "application/cloudevents+json; charset=utf-8",
          traits: [{ $ref: "#/components/messageTraits/commonHeaders" }, { contentType: "application/json" }],
          headers: {
            type: "object",
            properties: {
              "content-type": { type: "string", const: "application/jsn" },
              contentType: { type: "string", enum: ["text/html", "bogus"] },
            },
          },
          payload: {
            type: "object",
            properties: {
              shipmentId: { type: "string", format: "uuid" },
              contentType: { type: "string", enum: ["image/png", "not a mime"] },
              attachments: {
                type: "array",
                items: { type: "object", properties: { contentType: { type: "string", default: "application/x-ndjson" } } },
              },
            },
          },
          examples: [
            {
              name: "bookedViaPortal",
              headers: { contentType: "bogus/" },
              payload: { shipmentId: "6b0d6c1e-3e5a-4f7b-9d16-0c7c3f1f4b11", contentType: "text/html" },
            },
          ],
          bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } },
          "x-content-type": "not/checked here",
          "x-contentType": "bogus",
        },
      },
      subscribe: {
        operationId: "consumeShipmentCreated",
        message: {
          oneOf: [
            { $ref: "#/components/messages/shipmentDelayed" },
            {
              messageId: "shipmentAmended",
              contentType: "Application/JSON",
              payload: { type: "object", properties: { reason: { type: ["string", "null"] } } },
            },
            { messageId: "shipmentNoContentType", payload: { type: "string" } },
            { messageId: "shipmentNullContentType", contentType: null },
          ],
        },
      },
    },
    "harborline.cdc.containers.weighed.v1": {
      description: "Verified gross mass of a container.",
      subscribe: {
        operationId: "consumeContainerWeighed",
        message: { $ref: "#/components/messages/containerWeighed" },
      },
    },
    "harborline/telemetry/{deviceId}": {
      description: "Crane telemetry frames.",
      parameters: { deviceId: { schema: { type: "string", pattern: "^crane-[0-9]+$" } } },
      publish: {
        operationId: "publishCraneTelemetry",
        message: {
          messageId: "craneTelemetry",
          contentType: "application/x-protobuf",
          schemaFormat: "application/vnd.google.protobuf;version=3",
          payload: "syntax = \"proto3\"; message Frame { string id = 1; }",
          bindings: { mqtt: { bindingVersion: "0.1.0" } },
        },
      },
    },
    "harborline/sensors/{sensorId}/raw": {
      description: "Raw reefer sensor buffers.",
      parameters: { sensorId: { schema: { type: "string" } } },
      publish: {
        operationId: "publishReeferRaw",
        message: { messageId: "reeferRaw", contentType: "application/octet-stream", payload: { type: "string", format: "binary" } },
      },
    },
    "harborline.sys.audit.trail.v1": { $ref: "#/components/channels/auditTrail" },
    "harborline.cmd.invoices.issued.v1": {
      description: "Invoice documents in UBL.",
      subscribe: {
        operationId: "consumeInvoiceIssued",
        message: {
          messageId: "invoiceIssued",
          contentType: "application/soap+xml; charset=utf-8",
          traits: [{ $ref: "#/components/messageTraits/protobufEnvelope" }],
          payload: { type: "string" },
        },
      },
    },
  },
  components: {
    channels: {
      auditTrail: {
        description: "Audit trail lines.",
        publish: {
          operationId: "publishAuditLine",
          message: { messageId: "auditLine", contentType: "text/plain; charset=us-ascii", payload: { type: "string" } },
        },
      },
    },
    messages: {
      shipmentDelayed: {
        messageId: "shipmentDelayed",
        contentType: "application/vnd.harborline.shipment.v2+avro",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: {
          type: "record",
          name: "ShipmentDelayed",
          namespace: "io.harborline.shipments",
          fields: [
            { name: "shipmentId", type: "string" },
            { name: "contentType", type: ["null", "string"], default: null },
            { name: "delayMinutes", type: ["null", "int"], default: null },
          ],
        },
      },
      containerWeighed: {
        messageId: "containerWeighed",
        contentType: "application/xml",
        payload: { type: "object", properties: { vgmKg: { type: ["number", "null"], minimum: 0 } } },
      },
      manifestExported: {
        messageId: "manifestExported",
        contentType: "Text/CSV; header=present",
        payload: { type: "string" },
      },
      berthPlan: { messageId: "berthPlan", contentType: "application/yaml" },
      reeferAlarm: { messageId: "reeferAlarm", contentType: "application/cbor" },
      legacyNull: { messageId: "legacyNull", contentType: null },
      gateEvents: {
        oneOf: [
          { messageId: "gateIn", contentType: "application/vnd.harborline.gate.v1+json" },
          { messageId: "gateOut", contentType: "application/avro" },
        ],
      },
    },
    messageTraits: {
      commonHeaders: {
        contentType: "application/json",
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
      },
      protobufEnvelope: { contentType: "application/protobuf" },
      noContentTypeTrait: { headers: { type: "object" } },
      nullContentTypeTrait: { contentType: null },
    },
    schemas: {
      Attachment: {
        type: "object",
        properties: { contentType: { type: "string", enum: ["text/json", "bogus"], example: "application/jsn" } },
      },
    },
  },
};
