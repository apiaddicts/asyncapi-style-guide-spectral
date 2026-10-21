const AVRO = "application/vnd.apache.avro;version=1.9.0";
const JSON_SCHEMA = "application/schema+json;version=draft-07";
const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const SHARED = "./shared/ride-traits.yaml#/components/messageTraits";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:mobility:ride-hailing",
  info: {
    title: "Ride Hailing Dispatch Platform",
    version: "6.2.0",
    description: "Ride requests, driver locations, quotes and dispatch replies of a ride hailing operator.",
    contact: { name: "Dispatch Platform", url: "https://rides.example.io/dispatch", email: "dispatch@rides.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ name: "dispatch" }, { name: "telemetry" }],
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      host: "kafka.rides.example.io:9093",
      protocol: "kafka-secure",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.rides.example.io", bindingVersion: "0.5.0" } },
    },
    mqttEdge: { host: "edge.rides.example.io:8883", pathname: "/mqtt", protocol: "secure-mqtt", security: [{ $ref: "#/components/securitySchemes/deviceCert" }] },
    wsGateway: { host: "live.rides.example.io", pathname: "/v6/dispatch", protocol: "wss" },
    amqpBroker: { host: "mq.rides.example.io:5671", pathname: "/rides", protocol: "amqps" },
  },
  channels: {
    rideRequests: {
      address: "rides.cmd.requests.v1",
      title: "Ride requests",
      servers: [{ $ref: "#/servers/kafkaProd" }],
      messages: {
        rideRequested: {
          name: "rideRequested",
          title: "Ride requested",
          contentType: "application/json",
          traits: [trait("commonHeaders"), trait("tracing"), trait("kafkaKey")],
          correlationId: { $ref: "#/components/correlationIds/rideId" },
          payload: {
            schemaFormat: JSON_SCHEMA,
            schema: {
              type: "object",
              required: ["rideId", "pickup"],
              properties: { rideId: { type: "string", format: "uuid" }, pickup: { type: "string" }, promoCode: { type: ["string", "null"] } },
            },
          },
        },
        rideRequestedAvro: {
          name: "rideRequestedAvro",
          contentType: "application/vnd.apache.avro+json",
          traits: [[trait("commonHeaders"), { environment: "prod" }], [trait("tracing"), {}]],
          payload: {
            schemaFormat: AVRO,
            schema: {
              type: "record",
              name: "RideRequested",
              namespace: "io.rides.dispatch",
              fields: [
                { name: "rideId", type: "string" },
                { name: "promoCode", type: ["null", "string"], default: null },
                { name: "stops", type: { type: "array", items: "string" } },
              ],
            },
          },
        },
        rideCancelled: { $ref: "#/components/messages/rideCancelled" },
      },
      bindings: { kafka: { topic: "rides.cmd.requests.v1", partitions: 48, replicas: 3, bindingVersion: "0.5.0" } },
    },
    driverLocation: {
      address: "drivers/{driverId}/location",
      servers: [{ $ref: "#/servers/mqttEdge" }],
      parameters: { driverId: { description: "Driver identifier.", examples: ["DRV-0042"] } },
      messages: {
        locationUpdated: {
          name: "locationUpdated",
          traits: [trait("headersAlias"), { $ref: `${SHARED}/tracing` }],
          payload: { type: "object", properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lon: { type: "number", minimum: -180, maximum: 180 }, heading: { type: ["integer", "null"] } } },
        },
      },
    },
    rideReplies: {
      address: null,
      description: "Dynamic reply channel addressed by the replyTo header.",
      messages: {
        rideQuoted: { name: "rideQuoted", traits: { $ref: "#/components/x-trait-lists/standard" }, payload: { type: "object", properties: { amount: { type: "number" } } } },
        quoteExpired: { $ref: "#/components/messages/quoteExpired" },
      },
    },
    dispatchLive: {
      address: "/live",
      servers: [{ $ref: "#/servers/wsGateway" }],
      messages: {
        dispatchSnapshot: {
          name: "dispatchSnapshot",
          traits: [{ $ref: "./traits/common.yaml#/components/messageTraits/commonHeaders" }, { $ref: "https://schemas.rides.example.io/asyncapi/traits.json#/components/messageTraits/tracing" }],
          payload: { type: "array", items: { type: "object" } },
        },
        dispatchPaused: { name: "dispatchPaused", traits: [trait("sharedTracing"), trait("commonHeaders"), { headers: { type: "object", properties: { zone: { type: "string" } } } }], payload: { type: "string" } },
      },
    },
    "x-legacy-trips": {
      address: "legacy.trips",
      messages: { legacyTrip: { name: "legacyTrip", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } } },
    },
    partnerFeed: { $ref: "#/components/channels/partnerFeed" },
    fleetChannel: { $ref: "./shared/fleet-channels.yaml#/channels/fleet" },
  },
  operations: {
    requestRide: {
      action: "send",
      channel: { $ref: "#/channels/rideRequests" },
      messages: [{ $ref: "#/channels/rideRequests/messages/rideRequested" }, { $ref: "#/channels/rideRequests/messages/rideRequestedAvro" }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/rideReplies" },
        messages: [{ $ref: "#/channels/rideReplies/messages/rideQuoted" }],
      },
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
    },
    receiveLocation: {
      action: "receive",
      channel: { $ref: "#/channels/driverLocation" },
      messages: [{ $ref: "#/channels/driverLocation/messages/locationUpdated" }],
      bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } },
    },
    streamDispatch: {
      action: "receive",
      channel: { $ref: "#/channels/dispatchLive" },
      security: [{ $ref: "#/components/securitySchemes/deviceCert" }],
      messages: [{ $ref: "#/channels/dispatchLive/messages/dispatchSnapshot" }],
    },
    cancelRide: { $ref: "#/components/operations/cancelRide" },
  },
  components: {
    channels: {
      partnerFeed: {
        address: "partners.cdc.trips.v1",
        messages: { partnerTripImported: { name: "partnerTripImported", traits: { $ref: "./shared/ride-traits.yaml#/lists/standard" }, payload: { type: "object" } } },
      },
    },
    operations: {
      cancelRide: { action: "send", channel: { $ref: "#/channels/rideRequests" }, messages: [{ $ref: "#/channels/rideRequests/messages/rideCancelled" }] },
    },
    replies: { quoteReply: { channel: { $ref: "#/channels/rideReplies" }, messages: [{ $ref: "#/components/messages/quoteExpired" }] } },
    messages: {
      rideCancelled: {
        name: "rideCancelled",
        traits: [trait("platformDefaults"), [trait("tracing"), { broker: "kafka" }]],
        payload: { schemaFormat: JSON_SCHEMA, schema: { type: "object", properties: { rideId: { type: "string" }, reason: { type: ["string", "null"], enum: ["rider", "driver", "timeout", null] } } } },
      },
      quoteExpired: { name: "quoteExpired", traits: [[trait("commonHeaders"), {}], [trait("tracing"), {}]], payload: { type: "object" } },
      "x-surge-legacy": { name: "surgeLegacy", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } },
    },
    messageTraits: {
      commonHeaders: {
        headers: {
          type: "object",
          required: ["traceId", "tenantId"],
          properties: { traceId: { type: "string", format: "uuid" }, tenantId: { type: "string" }, city: { type: ["string", "null"] } },
        },
      },
      tracing: { correlationId: { $ref: "#/components/correlationIds/traceparent" } },
      kafkaKey: { bindings: { kafka: { key: { type: "string", maxLength: 64 }, bindingVersion: "0.5.0" } } },
      headersAlias: trait("commonHeaders"),
      platformDefaults: trait("headersAlias"),
      sharedTracing: { $ref: `${SHARED}/tracing` },
    },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } } },
    correlationIds: { rideId: { location: "$message.payload#/rideId" }, traceparent: { location: "$message.header#/traceparent" } },
    securitySchemes: { saslScram: { type: "scramSha512" }, deviceCert: { type: "X509" } },
    "x-trait-lists": { standard: [trait("commonHeaders"), trait("tracing")] },
  },
};
