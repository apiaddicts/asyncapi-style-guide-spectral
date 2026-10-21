const docs = (topic) => ({ description: `Runbook for ${topic}.`, url: `https://docs.cityflow.example.com/runbooks/${topic}` });
const incomplete = { url: "https://docs.cityflow.example.com/not-checked" };
const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:cityflow:bike-share",
  info: {
    title: "Cityflow Bike Share Operations",
    version: "5.2.0",
    description: "Dock, ride and rebalancing events of the Cityflow bike share network.",
    externalDocs: { $ref: "#/components/externalDocs/operationsHandbook" },
    tags: [
      { name: "docks", description: "Dock events.", externalDocs: docs("docks") },
      { $ref: "#/components/tags/rides" },
    ],
  },
  externalDocs: incomplete,
  tags: [{ name: "not-a-3x-location", externalDocs: incomplete }],
  servers: {
    kafkaCore: {
      host: "kafka.cityflow.example.com:9093",
      protocol: "kafka-secure",
      description: "Core Kafka cluster.",
      externalDocs: docs("kafka-core"),
      tags: [{ name: "production", description: "Production cluster.", externalDocs: docs("production") }],
      variables: {},
      bindings: { kafka: { schemaRegistryUrl: "https://registry.cityflow.example.com", bindingVersion: "0.5.0" } },
    },
    mqttDocks: { host: "mqtt.cityflow.example.com:8883", pathname: "/docks", protocol: "mqtt", description: "Dock telemetry broker.", externalDocs: { $ref: "#/components/externalDocs/mqtt" } },
    wsRiders: { host: "live.cityflow.example.com", pathname: "/riders", protocol: "wss", description: "Rider app live feed." },
  },
  channels: {
    dockStatus: {
      address: "cityflow.cdc.docks.status.v2",
      title: "Dock status",
      externalDocs: docs("dock-status"),
      tags: [{ name: "telemetry", description: "Telemetry streams.", externalDocs: docs("telemetry") }],
      servers: [{ $ref: "#/servers/kafkaCore" }, { $ref: "#/servers/mqttDocks" }],
      parameters: {},
      messages: {
        dockStatusChanged: {
          name: "dockStatusChanged",
          title: "Dock status changed",
          contentType: "application/json",
          externalDocs: docs("dock-status-changed"),
          tags: [{ $ref: "#/components/tags/telemetryTag" }],
          traits: [{ $ref: "#/components/messageTraits/cityHeaders" }, [{ externalDocs: docs("tuple-trait") }, {}]],
          headers: { type: "object", externalDocs: docs("dock-headers"), properties: { dockId: { type: "string" } } },
          payload: {
            schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
            schema: {
              type: "object",
              externalDocs: docs("dock-status-payload"),
              required: ["dockId", "externalDocs"],
              properties: {
                dockId: { type: "string", externalDocs: docs("dock-ids") },
                freeSlots: { type: ["integer", "null"], minimum: 0 },
                externalDocs: { type: "object", properties: { url: { type: "string", format: "uri" } } },
                location: { $ref: "#/components/schemas/GeoPoint" },
              },
              examples: [{ dockId: "D-001", externalDocs: incomplete }],
            },
          },
          examples: [{ name: "free", payload: { dockId: "D-001", externalDocs: {} } }],
        },
      },
    },
    rideCompleted: {
      address: "cityflow.cdc.rides.completed.v1",
      title: "Ride completed",
      externalDocs: { $ref: "#/components/externalDocs/rides" },
      messages: {
        rideCompleted: {
          name: "rideCompleted",
          title: "Ride completed",
          externalDocs: docs("ride-completed"),
          payload: { schemaFormat: AVRO, schema: { $ref: "#/components/schemas/RideAvro" } },
        },
        rideCompletedJson: {
          name: "rideCompletedJson",
          title: "Ride completed JSON",
          externalDocs: docs("ride-completed-json"),
          payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { type: "object", externalDocs: docs("ride-json"), properties: { rideId: { type: "string" } } } },
        },
      },
    },
    riderReplies: {
      address: null,
      title: "Rider replies",
      externalDocs: docs("rider-replies"),
      messages: {
        rideQuote: {
          name: "rideQuote",
          title: "Ride quote",
          externalDocs: docs("ride-quote"),
          payload: { schemaFormat: "application/vnd.oai.openapi;version=3.0.0", schema: { type: "object", nullable: true, externalDocs: docs("ride-quote-payload") } },
        },
      },
    },
    legacyFeed: {
      address: "cityflow/legacy/{stationId}",
      title: "Legacy feed",
      parameters: { stationId: { description: "Station id.", schema: { type: "string", externalDocs: incomplete } } },
      publish: { externalDocs: incomplete, message: { externalDocs: incomplete } },
      messages: {
        legacyEvent: {
          name: "legacyEvent",
          oneOf: [{ externalDocs: incomplete }],
          payload: { schemaFormat: "application/raml+yaml;version=1.0", schema: { type: "object", externalDocs: incomplete } },
        },
        protobufEvent: { name: "protobufEvent", payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "syntax = \"proto3\";" } },
      },
    },
  },
  operations: {
    publishDockStatus: {
      action: "send",
      title: "Publish dock status",
      channel: { $ref: "#/channels/dockStatus" },
      messages: [{ $ref: "#/channels/dockStatus/messages/dockStatusChanged" }],
      externalDocs: docs("publish-dock-status"),
      tags: [{ name: "producers", description: "Producers.", externalDocs: docs("producers") }],
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
      bindings: { kafka: { groupId: { type: "string", externalDocs: incomplete }, bindingVersion: "0.5.0" } },
    },
    receiveRideCompleted: {
      action: "receive",
      channel: { $ref: "#/channels/rideCompleted" },
      messages: [{ $ref: "#/channels/rideCompleted/messages/rideCompleted" }, { $ref: "#/channels/rideCompleted/messages/rideCompletedJson" }],
      externalDocs: { $ref: "#/components/externalDocs/rides" },
    },
    requestRideQuote: {
      action: "send",
      channel: { $ref: "#/channels/dockStatus" },
      externalDocs: docs("ride-quotes"),
      reply: { $ref: "#/components/replies/rideQuote" },
    },
  },
  components: {
    externalDocs: {
      operationsHandbook: { description: "Operations handbook.", url: "https://docs.cityflow.example.com/operations", "x-owner": "ops" },
      rides: docs("rides"),
      mqtt: docs("mqtt"),
    },
    tags: {
      rides: { name: "rides", description: "Ride events.", externalDocs: { $ref: "#/components/externalDocs/rides" } },
      telemetryTag: { name: "telemetry", description: "Telemetry streams.", externalDocs: docs("telemetry") },
    },
    schemas: {
      GeoPoint: { type: "object", externalDocs: docs("geo-point"), properties: { lat: { type: "number" }, lon: { type: "number" } } },
      RideAvro: {
        type: "record",
        name: "RideCompleted",
        namespace: "com.cityflow.rides",
        externalDocs: incomplete,
        fields: [{ name: "rideId", type: "string" }, { name: "distance", type: ["null", "double"], default: null, externalDocs: {} }],
      },
      DockAvro: { schemaFormat: AVRO, schema: { type: "record", name: "Dock", externalDocs: incomplete, fields: [] } },
      Fare: { schemaFormat: "application/vnd.aai.asyncapi+yaml;version=3.0.0", schema: { type: "object", externalDocs: docs("fares") } },
    },
    parameters: { stationId: { description: "Station id.", schema: { type: "string", externalDocs: incomplete } } },
    replies: {
      rideQuote: {
        channel: { $ref: "#/channels/riderReplies" },
        messages: [{ $ref: "#/channels/riderReplies/messages/rideQuote" }],
        externalDocs: incomplete,
      },
    },
    operationTraits: {
      kafkaProducer: { externalDocs: docs("kafka-producer"), tags: [{ name: "kafka", description: "Kafka.", externalDocs: docs("kafka") }] },
    },
    messageTraits: {
      cityHeaders: {
        externalDocs: docs("city-headers"),
        headers: { schemaFormat: "application/vnd.aai.asyncapi;version=3.0.0", schema: { type: "object", externalDocs: docs("city-header-schema") } },
      },
    },
    "x-docs": { unreferenced: incomplete },
  },
};
