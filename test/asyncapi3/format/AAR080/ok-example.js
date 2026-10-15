module.exports = {
  asyncapi: "3.0.0",
  id: "urn:mobility:ride-hailing",
  info: {
    title: "Ride Hailing Events",
    version: "3.5.0",
    description: "Ride requests, driver dispatch and trip telemetry of the ride-hailing platform.",
    termsOfService: "https://rides.mobility.example.io/legal/terms",
    contact: { name: "Dispatch Platform", email: "dispatch@mobility.example.io" },
    license: { name: "MPL-2.0", url: "https://www.mozilla.org/en-US/MPL/2.0/", "x-spdx-list": "3.29.0" },
    tags: [{ name: "rides", description: "Licensed under Mozilla Public License 2.0." }],
    externalDocs: { description: "Mozilla Public License 2.0 terms of the SDK.", url: "https://rides.mobility.example.io/docs" },
    "x-license": { name: "Mozilla Public License 2.0" },
  },
  license: { name: "Proprietary" },
  "x-license": { name: "MPL 2.0" },
  defaultContentType: "application/json",
  servers: {
    dispatchKafka: {
      host: "kafka-{region}.rides.mobility.example.io:9093",
      protocol: "kafka-secure",
      description: "Dispatch backbone, one cluster per region.",
      variables: { region: { enum: ["eu-south", "eu-north"], default: "eu-south", description: "Licensed region." } },
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.rides.mobility.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    telemetryMqtt: {
      host: "telemetry.rides.mobility.example.io:8883",
      protocol: "secure-mqtt",
      description: "Vehicles report positions.",
      bindings: { mqtt: { clientId: "rides-core", cleanSession: false, keepAlive: 30, bindingVersion: "0.2.0" } },
    },
    receiptsAmqp: { host: "receipts.mobility.example.io:5671", pathname: "/rides", protocol: "amqps", description: "Receipt broker.", security: [{ $ref: "#/components/securitySchemes/mtls" }] },
    riderWs: { host: "live.rides.mobility.example.io", pathname: "/rider", protocol: "wss", description: "Live feed for the rider app." },
  },
  channels: {
    rideRequested: {
      address: "rides.cdc.requests.created.v3",
      title: "Ride requested",
      servers: [{ $ref: "#/servers/dispatchKafka" }],
      bindings: { kafka: { topic: "rides.cdc.requests.created.v3", partitions: 24, replicas: 3, bindingVersion: "0.5.0" } },
      messages: {
        rideRequested: { $ref: "#/components/messages/rideRequested" },
        rideRequestedAvro: {
          name: "rideRequestedAvro",
          title: "Ride requested in Avro",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "RideRequested",
              namespace: "io.example.mobility.rides",
              fields: [
                { name: "rideId", type: "string" },
                { name: "license", type: ["null", { type: "record", name: "DriverLicense", fields: [{ name: "name", type: "string", default: "Mozilla Public License 2.0" }] }], default: null },
              ],
            },
          },
        },
      },
    },
    driverPositions: {
      address: "drivers/{driverId}/position",
      servers: [{ $ref: "#/servers/telemetryMqtt" }],
      parameters: { driverId: { description: "Licensed driver identifier.", enum: ["drv-001", "drv-002"], default: "drv-001" } },
      messages: { positionReported: { $ref: "#/components/messages/positionReported" } },
    },
    dispatchReplies: {
      address: null,
      messages: { driverAssigned: { name: "driverAssigned", title: "Driver assigned", payload: { type: "object", properties: { rideId: { type: "string" }, driverLicense: { type: ["string", "null"], enum: ["MPL 2.0", null] } } } } },
    },
    receipts: {
      address: "receipts/{riderId}",
      servers: [{ $ref: "#/servers/receiptsAmqp" }],
      parameters: { riderId: { $ref: "#/components/parameters/riderId" } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "receipts", type: "topic", durable: true, autoDelete: false, vhost: "/rides" }, bindingVersion: "0.3.0" } },
      messages: {
        receiptIssued: {
          name: "receiptIssued",
          title: "Receipt issued",
          traits: [{ $ref: "#/components/messageTraits/rideHeaders" }],
          payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { $ref: "#/components/schemas/Receipt" } },
          examples: [{ name: "issued", payload: { receiptId: "rcp-1", license: { name: "Mozilla Public License 2.0" } } }],
        },
      },
    },
    riderFeed: { address: "rider/{riderId}/feed", servers: [{ $ref: "#/servers/riderWs" }], parameters: { riderId: { description: "Rider identifier." } }, messages: { license: { name: "license", payload: { type: "object", properties: { name: { type: "string", const: "GPL v3" } } } } } },
  },
  operations: {
    requestRide: {
      action: "send",
      title: "Request a ride",
      channel: { $ref: "#/channels/rideRequested" },
      messages: [{ $ref: "#/channels/rideRequested/messages/rideRequested" }, { $ref: "#/channels/rideRequested/messages/rideRequestedAvro" }],
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/dispatchReplies" }, messages: [{ $ref: "#/channels/dispatchReplies/messages/driverAssigned" }] },
    },
    receivePositions: {
      action: "receive",
      channel: { $ref: "#/channels/driverPositions" },
      messages: [{ $ref: "#/channels/driverPositions/messages/positionReported" }],
      bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } },
    },
    receiveReceipts: { action: "receive", channel: { $ref: "#/channels/receipts" }, reply: { $ref: "#/components/replies/receiptAck" } },
    sendRiderFeed: { action: "send", channel: { $ref: "#/channels/riderFeed" }, tags: [{ name: "license", description: "MPL 2.0" }] },
  },
  components: {
    messages: {
      rideRequested: {
        name: "rideRequested",
        title: "Ride requested",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/rideId" },
        payload: { $ref: "#/components/schemas/RideRequest" },
      },
      positionReported: { name: "positionReported", payload: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" }, heading: { type: ["integer", "null"] } } } },
    },
    schemas: {
      RideRequest: {
        type: "object",
        required: ["rideId", "pickup"],
        properties: {
          rideId: { type: "string", format: "uuid" },
          pickup: { type: "string" },
          license: { type: ["object", "null"], properties: { name: { type: "string", examples: ["MPL 2.0"] } } },
        },
      },
      Receipt: { type: "object", properties: { receiptId: { type: "string" }, license: { type: "object", properties: { name: { type: "string", enum: ["Mozilla Public License 2.0"] } } } } },
    },
    parameters: { riderId: { description: "Rider identifier." } },
    correlationIds: { rideId: { description: "Ride identifier.", location: "$message.payload#/rideId" } },
    replies: { receiptAck: { channel: { $ref: "#/channels/dispatchReplies" } } },
    messageTraits: { rideHeaders: { headers: { type: "object", properties: { license: { type: "string", default: "MPL 2.0" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["rides-gateway"] }, bindingVersion: "0.5.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials." }, mtls: { type: "X509", description: "Mutual TLS." } },
    "x-licenses": { sdk: { name: "Mozilla Public License 2.0" }, portal: { name: 42 } },
  },
};
