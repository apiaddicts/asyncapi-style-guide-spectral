const AVRO = "application/vnd.apache.avro;version=1.9.0";
const JSON_SCHEMA = "application/schema+json;version=draft-07";
const PROTOBUF = "application/vnd.google.protobuf;version=3";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:mobility:fleet-platform",
  info: {
    title: "Urban Mobility Fleet Platform",
    version: "5.1.0",
    description: "Vehicle telemetry, driver commands and dispatch replies of a shared mobility operator.",
    contact: { name: "Fleet Platform", url: "https://fleet.example.io", email: "fleet-platform@example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ name: "telemetry" }, { name: "dispatch" }],
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      host: "kafka.fleet.example.io:9093",
      protocol: "kafka-secure",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.fleet.example.io", bindingVersion: "0.5.0" } },
    },
    mqttEdge: { host: "edge.fleet.example.io:8883", pathname: "/mqtt", protocol: "secure-mqtt", security: [{ $ref: "#/components/securitySchemes/deviceCert" }] },
    wsGateway: { host: "stream.fleet.example.io", pathname: "/v5/live", protocol: "wss" },
    amqpBroker: { host: "mq.fleet.example.io:5671", pathname: "/fleet", protocol: "amqps" },
  },
  channels: {
    vehiclePositions: {
      address: "fleet.cdc.vehicles.positions.v2",
      title: "Vehicle positions",
      servers: [{ $ref: "#/servers/kafkaProd" }],
      messages: {
        positionReported: { $ref: "#/components/messages/positionReported" },
        positionReportedAvro: {
          name: "positionReportedAvro",
          contentType: "application/vnd.apache.avro+json",
          payload: {
            schemaFormat: AVRO,
            schema: {
              type: "record",
              name: "PositionReported",
              namespace: "io.fleet.telemetry",
              fields: [
                { name: "vehicleId", type: "string" },
                { name: "heading", type: ["null", "int"], default: null },
                { name: "battery", type: ["null", { type: "record", name: "Battery", fields: [{ name: "level", type: "int" }] }], default: null },
              ],
            },
          },
          examples: [{ name: "parkedScooter", payload: { vehicleId: "SCT-4410", heading: null, battery: { level: 64 } } }],
        },
        vehicleTombstone: {
          name: "vehicleTombstone",
          summary: "Compaction tombstone emitted when a vehicle is decommissioned.",
          payload: { schemaFormat: JSON_SCHEMA, schema: { type: ["object", "null"], properties: { vehicleId: { type: ["string", "null"] } } } },
          examples: [{ name: "decommissioned", headers: { vehicleId: "SCT-0007" }, payload: null }],
        },
      },
      bindings: { kafka: { topic: "fleet.cdc.vehicles.positions.v2", partitions: 48, bindingVersion: "0.5.0" } },
    },
    driverCommands: {
      address: "fleet/drivers/{driverId}/commands",
      servers: [{ $ref: "#/servers/mqttEdge" }],
      parameters: { driverId: { description: "Driver identifier.", examples: ["DRV-1001"], location: "$message.payload#/driverId" } },
      messages: {
        commandIssued: {
          name: "commandIssued",
          traits: [{ $ref: "#/components/messageTraits/commandSamples" }],
          payload: { type: "object", properties: { driverId: { type: "string" }, command: { type: "string", enum: ["pause", "resume", "return"] } } },
        },
        commandAcknowledged: {
          name: "commandAcknowledged",
          traits: [{ $ref: "#/components/messageTraits/emptyExamples" }, [{ $ref: "#/components/messageTraits/mqttEnvelope" }, { qos: 1 }]],
          payload: { type: "object", properties: { driverId: { type: "string" }, accepted: { type: "boolean" } } },
          examples: [{ name: "accepted", payload: { driverId: "DRV-1001", accepted: true } }],
        },
      },
    },
    dispatchReplies: {
      address: null,
      description: "Dynamic reply channel; the requester sets the address in the replyTo header.",
      messages: {
        dispatchConfirmed: {
          name: "dispatchConfirmed",
          correlationId: { $ref: "#/components/correlationIds/requestId" },
          payload: { $ref: "#/components/schemas/DispatchConfirmation" },
          examples: [{ name: "assigned", headers: { requestId: "req-881" }, payload: { requestId: "req-881", vehicleId: "CAR-220", etaSeconds: 240 } }],
        },
      },
    },
    telemetryHeartbeat: {
      address: "fleet/telemetry/heartbeat",
      messages: {
        heartbeat: {
          name: "heartbeat",
          headers: { type: "object", properties: { deviceId: { type: "string" }, firmware: { type: "string" } } },
          examples: [{ name: "alive", headers: { deviceId: "IOT-77", firmware: "4.2.1" } }],
        },
      },
    },
    tripsProtobuf: {
      address: "fleet.cdc.trips.closed.v1",
      messages: {
        tripClosed: {
          name: "tripClosed",
          contentType: "application/x-protobuf",
          payload: { schemaFormat: PROTOBUF, schema: 'syntax = "proto3"; message TripClosed { string trip_id = 1; int32 meters = 2; }' },
          examples: { $ref: "#/components/x-example-sets/tripsClosed" },
        },
      },
    },
    partnerFeeds: {
      address: "fleet.cdc.partners.v1",
      messages: {
        chargeSessionClosed: { $ref: "./shared/charging.yaml#/components/messages/sessionClosed" },
        partnerTripImported: {
          name: "partnerTripImported",
          traits: [{ $ref: "./shared/message-traits.yaml#/components/messageTraits/partnerSamples" }],
          payload: { type: "object" },
        },
        partnerTripUpdated: { name: "partnerTripUpdated", payload: { type: "object" }, examples: [{ $ref: "./shared/examples.yaml#/partnerTripUpdated" }] },
      },
    },
    auditTrail: { $ref: "#/components/channels/audit" },
  },
  operations: {
    publishPosition: {
      action: "send",
      channel: { $ref: "#/channels/vehiclePositions" },
      messages: [{ $ref: "#/channels/vehiclePositions/messages/positionReported" }, { $ref: "#/channels/vehiclePositions/messages/positionReportedAvro" }],
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
    },
    receiveDriverCommand: {
      action: "receive",
      channel: { $ref: "#/channels/driverCommands" },
      messages: [{ $ref: "#/channels/driverCommands/messages/commandIssued" }],
    },
    requestDispatch: {
      action: "send",
      channel: { $ref: "#/channels/vehiclePositions" },
      messages: [{ $ref: "#/channels/vehiclePositions/messages/positionReported" }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/dispatchReplies" },
        messages: [{ $ref: "#/channels/dispatchReplies/messages/dispatchConfirmed" }],
      },
    },
    auditOperation: { $ref: "#/components/operations/recordAudit" },
  },
  components: {
    schemas: {
      Position: {
        type: "object",
        properties: { vehicleId: { type: "string" }, lat: { type: "number", format: "double" }, lon: { type: "number", format: "double" }, speedKmh: { type: ["number", "null"] } },
        examples: [{ vehicleId: "CAR-220", lat: 40.4168, lon: -3.7038, speedKmh: null }],
      },
      DispatchConfirmation: { type: "object", properties: { requestId: { type: "string" }, vehicleId: { type: "string" }, etaSeconds: { type: ["integer", "null"] } } },
    },
    messages: {
      positionReported: {
        name: "positionReported",
        payload: { $ref: "#/components/schemas/Position" },
        examples: [{ name: "moving", payload: { vehicleId: "CAR-220", lat: 40.4168, lon: -3.7038, speedKmh: 32.5 } }],
      },
      maintenanceDue: { name: "maintenanceDue", payload: { type: "object" }, examples: { $ref: "#/components/x-example-sets/maintenance" } },
      aliasOfPosition: { $ref: "#/components/messages/positionReported" },
    },
    channels: {
      audit: {
        address: "fleet.sys.audit.v1",
        messages: { auditRecorded: { name: "auditRecorded", payload: { type: "object", properties: { actor: { type: "string" } } }, examples: [{ payload: { actor: "dispatcher" } }] } },
      },
    },
    operations: {
      recordAudit: { action: "send", channel: { $ref: "#/components/channels/audit" }, messages: [{ $ref: "#/components/channels/audit/messages/auditRecorded" }] },
    },
    replies: { dispatchReply: { channel: { $ref: "#/channels/dispatchReplies" }, messages: [{ $ref: "#/channels/dispatchReplies/messages/dispatchConfirmed" }] } },
    replyAddresses: { replyTo: { location: "$message.header#/replyTo" } },
    parameters: { driverId: { description: "Driver identifier.", default: "DRV-0000" } },
    correlationIds: { requestId: { location: "$message.header#/requestId" } },
    messageTraits: {
      commandSamples: { examples: [{ name: "pauseRide", payload: { driverId: "DRV-1001", command: "pause" } }] },
      emptyExamples: { examples: [] },
      mqttEnvelope: { headers: { type: "object", properties: { qos: { type: "integer" } } }, bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } } },
    },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512" }, deviceCert: { type: "X509" } },
    "x-example-sets": {
      tripsClosed: [{ name: "shortTrip", payload: { trip_id: "TRP-1", meters: 1200 } }],
      maintenance: [{ payload: { vehicleId: "CAR-220", dueKm: 15000 } }],
    },
  },
};
