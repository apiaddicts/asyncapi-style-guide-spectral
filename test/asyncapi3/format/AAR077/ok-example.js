const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:mobility:ride-hailing",
  info: {
    title: "Ride Hailing Marketplace Events",
    version: "4.1.0",
    description: "Ride requests, driver matching and live trip positions of the ride hailing marketplace.",
    termsOfService: "https://rides.mobility.example.io/terms",
    contact: {
      name: "Marketplace Platform Team",
      url: "https://rides.mobility.example.io/platform",
      email: "marketplace-platform@mobility.example.io",
      "x-slack": "#marketplace-platform",
    },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ name: "rides", description: "Ride lifecycle events." }],
    externalDocs: { description: "Marketplace handbook.", url: "https://rides.mobility.example.io/handbook" },
  },
  defaultContentType: "application/json",
  servers: {
    ridesKafka: {
      host: "kafka-{region}.rides.mobility.example.io:9093",
      protocol: "kafka-secure",
      description: "Marketplace event backbone.",
      variables: { region: { enum: ["eu-west", "us-east"], default: "eu-west" } },
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.rides.mobility.example.io", bindingVersion: "0.5.0" } },
    },
    driverMqtt: { host: "drivers.mobility.example.io:8883", protocol: "secure-mqtt", description: "Driver app gateway.", bindings: { mqtt: { clientId: "rides-ingest", cleanSession: false, keepAlive: 30, bindingVersion: "0.2.0" } } },
    riderWs: { host: "live.mobility.example.io", pathname: "/ws/trips", protocol: "wss", title: "Live trip tracking", description: "Rider app live channel." },
  },
  channels: {
    rideRequested: {
      address: "rides.cdc.requests.created.v4",
      title: "Ride requests",
      description: "Ride requests created in the rider app.",
      servers: [{ $ref: "#/servers/ridesKafka" }],
      bindings: { kafka: { topic: "rides.cdc.requests.created.v4", partitions: 24, bindingVersion: "0.5.0" } },
      messages: {
        rideRequested: { $ref: "#/components/messages/rideRequested" },
        rideRequestedAvro: {
          name: "rideRequestedAvro",
          title: "Ride requested in Avro",
          payload: {
            schemaFormat: AVRO,
            schema: {
              type: "record",
              name: "RideRequested",
              namespace: "io.example.mobility.rides",
              fields: [
                { name: "rideId", type: "string" },
                { name: "pickup", type: "string" },
                { name: "riderContact", type: ["null", { type: "record", name: "RiderContact", fields: [{ name: "name", type: ["null", "string"], default: null }, { name: "email", type: ["null", "string"], default: null }] }], default: null },
              ],
            },
          },
        },
      },
    },
    driverLocation: {
      address: "drivers/{driverId}/location",
      title: "Driver locations",
      description: "Positions reported by the driver app.",
      servers: [{ $ref: "#/servers/driverMqtt" }],
      parameters: { driverId: { description: "Driver identifier.", examples: ["driver-42"] } },
      messages: { locationUpdated: { $ref: "#/components/messages/locationUpdated" } },
    },
    tripUpdates: {
      address: null,
      title: "Trip updates",
      description: "Replies addressed through the replyTo header.",
      servers: [{ $ref: "#/servers/riderWs" }],
      messages: { tripUpdated: { $ref: "#/components/messages/tripUpdated" } },
    },
  },
  operations: {
    publishRideRequested: {
      action: "send",
      title: "Publish ride requests",
      summary: "The rider app publishes ride requests.",
      channel: { $ref: "#/channels/rideRequested" },
      messages: [{ $ref: "#/channels/rideRequested/messages/rideRequested" }, { $ref: "#/channels/rideRequested/messages/rideRequestedAvro" }],
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/tripUpdates" },
        messages: [{ $ref: "#/channels/tripUpdates/messages/tripUpdated" }],
      },
    },
    matchDriver: {
      action: "receive",
      title: "Match drivers",
      summary: "Matching receives ride requests.",
      channel: { $ref: "#/channels/rideRequested" },
      bindings: { kafka: { groupId: { type: "string", enum: ["matching"] }, bindingVersion: "0.5.0" } },
    },
    receiveDriverLocation: {
      action: "receive",
      title: "Receive driver locations",
      channel: { $ref: "#/channels/driverLocation" },
      messages: [{ $ref: "#/channels/driverLocation/messages/locationUpdated" }],
    },
  },
  components: {
    messages: {
      rideRequested: {
        name: "rideRequested",
        title: "Ride requested",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/traced" }],
        correlationId: { $ref: "#/components/correlationIds/rideId" },
        payload: { $ref: "#/components/schemas/RideRequest" },
      },
      locationUpdated: {
        name: "locationUpdated",
        title: "Location updated",
        payload: { type: "object", required: ["lat", "lon"], properties: { lat: { type: "number" }, lon: { type: "number" }, heading: { type: ["integer", "null"] } } },
      },
      tripUpdated: {
        name: "tripUpdated",
        title: "Trip updated",
        payload: {
          schemaFormat: "application/schema+json;version=draft-07",
          schema: { type: "object", properties: { rideId: { type: "string" }, driver: { $ref: "#/components/schemas/Contact" }, etaMinutes: { type: ["integer", "null"] } } },
        },
      },
    },
    schemas: {
      RideRequest: {
        type: "object",
        required: ["rideId", "pickup"],
        properties: {
          rideId: { type: "string", format: "uuid" },
          pickup: { type: "string" },
          dropoff: { type: ["string", "null"] },
          rider: { $ref: "#/components/schemas/Contact" },
        },
      },
      Contact: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" } } },
    },
    correlationIds: { rideId: { description: "Ride identifier.", location: "$message.payload#/rideId" } },
    messageTraits: { traced: { headers: { type: "object", properties: { traceparent: { type: "string" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["rider-app"] }, bindingVersion: "0.5.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials per service." } },
  },
};
