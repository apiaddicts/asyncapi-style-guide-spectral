const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:mobility:ride-hailing",
  info: {
    title: "Ride Hailing Platform Events",
    version: "6.3.0",
    description:
      "Ride requests, driver dispatch, live vehicle positions and fare settlement events exchanged between the rider app, the driver app and the back office.\n\nEvery event is published at least once and carries a trace context header.",
    termsOfService: "https://mobility.example.io/terms",
    contact: { name: "Mobility Integration", url: "https://mobility.example.io/integration", email: "integration@mobility.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    "x-audience": "company-internal",
    "x-api-id": "9f2b4c1e-3c55-4d6b-9a71-5e0c2d8b7a10",
  },
  defaultContentType: "application/json",
  tags: [
    { name: "dispatch", description: "Driver assignment and trip lifecycle." },
    { name: "telemetry", description: "Live vehicle positions." },
  ],
  externalDocs: { description: "Mobility event catalogue.", url: "https://mobility.example.io/events" },
  servers: {
    kafkaProd: {
      url: "kafka-{region}.mobility.example.io:9093",
      protocol: "kafka-secure",
      description: "Event backbone of the dispatch platform.",
      variables: { region: { enum: ["eu-west", "us-east"], default: "eu-west" } },
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.mobility.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    mqttFleet: {
      url: "mqtts://fleet.mobility.example.io:8883",
      protocol: "secure-mqtt",
      description: "Broker the driver apps publish positions to.",
      bindings: { mqtt: { clientId: "dispatch-ingest", cleanSession: false, keepAlive: 60, bindingVersion: "0.2.0" } },
    },
    riderSocket: { url: "wss://live.mobility.example.io/v6", protocol: "wss", description: "Live trip updates for the rider app." },
  },
  channels: {
    "mobility.cmd.rides.requested.v1": {
      description: "Ride requests created by the rider app.",
      servers: ["kafkaProd"],
      bindings: { kafka: { topic: "mobility.cmd.rides.requested.v1", partitions: 48, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishRideRequested",
        summary: "The rider app publishes a ride request.",
        description: "Published once per confirmed request.",
        tags: [{ name: "dispatch" }],
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        message: { $ref: "#/components/messages/rideRequested" },
      },
      subscribe: {
        operationId: "receiveRideRequested",
        summary: "Dispatch receives ride requests.",
        bindings: { kafka: { groupId: { type: "string", enum: ["dispatch-matcher"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/rideRequested" },
            {
              name: "rideRequestedAvro",
              title: "Ride requested, Avro",
              schemaFormat: AVRO,
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "RideRequested",
                namespace: "io.example.mobility.dispatch",
                fields: [
                  { name: "rideId", type: "string" },
                  { name: "riderId", type: "string" },
                  { name: "pickupGeohash", type: "string" },
                  { name: "requestedAt", type: { type: "long", logicalType: "timestamp-millis" } },
                  { name: "promoCode", type: ["null", "string"], default: null },
                ],
              },
            },
          ],
        },
      },
    },
    "fleet/{vehicleId}/position": {
      description: "Live positions of every vehicle, one topic per vehicle.",
      servers: ["mqttFleet"],
      parameters: { vehicleId: { $ref: "#/components/parameters/vehicleId" } },
      publish: {
        operationId: "publishVehiclePosition",
        summary: "Driver apps publish the vehicle position every five seconds.",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } },
        message: {
          name: "vehiclePosition",
          title: "Vehicle position",
          contentType: "application/json",
          traits: [{ $ref: "#/components/messageTraits/traced" }],
          payload: {
            type: "object",
            required: ["lat", "lon", "recordedAt"],
            properties: {
              lat: { type: "number", minimum: -90, maximum: 90 },
              lon: { type: "number", minimum: -180, maximum: 180 },
              heading: { type: ["integer", "null"], minimum: 0, maximum: 359 },
              recordedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    "rides/{rideId}/status": {
      description: "Trip status pushed to the rider app.",
      servers: ["riderSocket"],
      parameters: { rideId: { description: "Ride identifier.", schema: { type: "string", format: "uuid" } } },
      subscribe: {
        operationId: "receiveTripStatus",
        summary: "The rider app receives trip status changes.",
        bindings: { ws: { query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" } },
        message: { $ref: "#/components/messages/tripStatusChanged" },
      },
    },
    "mobility.cdc.fares.settled.v2": {
      description: "Fares settled after each trip.",
      servers: ["kafkaProd"],
      subscribe: {
        operationId: "receiveFareSettled",
        summary: "Finance receives settled fares.",
        message: { $ref: "#/components/messages/fareSettled" },
      },
    },
  },
  components: {
    messages: {
      rideRequested: {
        name: "rideRequested",
        title: "Ride requested",
        summary: "A rider asked for a ride.",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/traced" }],
        correlationId: { $ref: "#/components/correlationIds/rideId" },
        payload: { $ref: "#/components/schemas/RideRequest" },
        examples: [{ name: "airportPickup", payload: { rideId: "r-1042", riderId: "u-77", pickup: { lat: 40.4719, lon: -3.5626 } } }],
      },
      tripStatusChanged: {
        name: "tripStatusChanged",
        title: "Trip status changed",
        payload: {
          type: "object",
          properties: {
            rideId: { type: "string" },
            status: { type: "string", enum: ["driverAssigned", "driverArrived", "inProgress", "completed", "cancelled"] },
            etaSeconds: { type: ["integer", "null"] },
          },
        },
      },
      fareSettled: {
        name: "fareSettled",
        title: "Fare settled",
        schemaFormat: AVRO,
        payload: {
          type: "record",
          name: "FareSettled",
          namespace: "io.example.mobility.finance",
          fields: [
            { name: "rideId", type: "string" },
            { name: "amount", type: { type: "bytes", logicalType: "decimal", precision: 10, scale: 2 } },
            { name: "currency", type: "string" },
            { name: "tip", type: ["null", "double"], default: null },
          ],
        },
      },
    },
    schemas: {
      RideRequest: {
        type: "object",
        description: "A ride request as captured by the rider app.",
        required: ["rideId", "riderId", "pickup"],
        properties: {
          rideId: { type: "string", format: "uuid" },
          riderId: { type: "string" },
          pickup: { $ref: "#/components/schemas/GeoPoint" },
          dropoff: { oneOf: [{ $ref: "#/components/schemas/GeoPoint" }, { type: "null" }] },
          seats: { type: "integer", minimum: 1, maximum: 6 },
        },
      },
      GeoPoint: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" } } },
    },
    parameters: { vehicleId: { description: "Fleet vehicle identifier.", schema: { type: "string", pattern: "^veh-[0-9]{6}$" } } },
    correlationIds: { rideId: { description: "Ride identifier.", location: "$message.payload#/rideId" } },
    messageTraits: { traced: { headers: { type: "object", properties: { traceparent: { type: "string" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["rider-app"] }, bindingVersion: "0.4.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials issued per service." } },
  },
};
