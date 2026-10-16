const TRACE_ID = "4bf92f35-77b3-4da6-a3ce-929d0e0e4736";
const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:mobility:platform:events",
  info: {
    title: "Urban Mobility Platform Events",
    version: "6.2.0",
    description: "Ride requests, vehicle status, payments and zone policies of a shared mobility operator.",
    contact: { name: "Mobility Platform", url: "https://mobility.example.io/platform", email: "platform@mobility.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: { host: "kafka.mobility.example.io:9093", protocol: "kafka-secure", bindings: { kafka: { schemaRegistryUrl: "https://registry.mobility.example.io", bindingVersion: "0.5.0" } } },
    mqttVehicles: { host: "vehicles.mobility.example.io:8883", pathname: "/v2", protocol: "secure-mqtt" },
    wsRiders: { host: "live.mobility.example.io", pathname: "/riders", protocol: "wss" },
  },
  channels: {
    rideRequests: {
      address: "mobility.cmd.rides.requests.v3",
      description: "Ride requests issued by the rider app.",
      servers: [{ $ref: "#/servers/kafkaProd" }, { $ref: "#/servers/wsRiders" }],
      messages: {
        rideRequested: {
          name: "rideRequested",
          contentType: "application/json",
          traits: [{ $ref: "#/components/messageTraits/tracing" }],
          headers: { type: "object", properties: { channel: { type: "string", enum: ["ios", "android", "web"] } } },
          payload: { $ref: "#/components/schemas/RideRequest" },
          examples: [
            {
              name: "airportRide",
              headers: { traceId: TRACE_ID, channel: "ios" },
              payload: {
                rideId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                riderEmail: "rider@example.io",
                pickup: { lat: 40.4168, lon: -3.7038 },
                dropoff: { lat: 40.4983, lon: -3.5676, label: "Terminal 4" },
                vehicleClass: "XL",
                passengers: 3,
                scheduledFor: "2026-01-15T06:30:00+01:00",
                promoCode: null,
                stops: [],
              },
            },
            { name: "now", headers: { traceId: TRACE_ID }, payload: { rideId: TRACE_ID, pickup: { lat: 0, lon: 0 }, dropoff: { lat: 1.5, lon: -1.5 }, vehicleClass: "STANDARD", passengers: 1 } },
          ],
        },
        rideRequestedAvro: {
          name: "rideRequestedAvro",
          contentType: "application/vnd.apache.avro+json",
          headers: { schemaFormat: AVRO, schema: { type: "record", name: "KafkaHeaders", namespace: "io.mobility.kafka", fields: [{ name: "partition", type: "int" }, { name: "traceId", type: ["null", "string"] }] } },
          payload: {
            schemaFormat: "application/vnd.apache.avro+json;version=1.9.0",
            schema: {
              type: "record",
              name: "RideRequested",
              namespace: "io.mobility.rides",
              fields: [
                { name: "rideId", type: { type: "string", logicalType: "uuid" } },
                { name: "pickup", type: { type: "record", name: "GeoPoint", fields: [{ name: "lat", type: "double" }, { name: "lon", type: "double" }] } },
                { name: "dropoff", type: "GeoPoint" },
                { name: "waypoints", type: { type: "array", items: "io.mobility.rides.GeoPoint" }, default: [] },
                { name: "vehicleClass", type: { type: "enum", name: "VehicleClass", symbols: ["STANDARD", "XL", "LUX"] } },
                { name: "fare", type: ["null", { type: "record", name: "Fare", fields: [{ name: "amountCents", type: "long" }, { name: "currency", type: { type: "fixed", name: "Currency", size: 3 } }] }], default: null },
                { name: "requestedAt", type: { type: "long", logicalType: "timestamp-millis" } },
                { name: "attributes", type: { type: "map", values: ["null", "boolean", "string"] }, default: {} },
              ],
            },
          },
          examples: [
            {
              name: "avroRide",
              headers: { partition: 7, traceId: { string: TRACE_ID } },
              payload: {
                rideId: TRACE_ID,
                pickup: { lat: 40.4168, lon: -3.7038 },
                dropoff: { lat: 40.4983, lon: -3.5676 },
                waypoints: [{ lat: 40.45, lon: -3.65 }],
                vehicleClass: "XL",
                fare: { "io.mobility.rides.Fare": { amountCents: 4590, currency: "EUR" } },
                requestedAt: 1768457400000,
                attributes: { childSeat: true, note: "Gate 2", pet: null },
              },
            },
            { name: "minimalAvro", headers: { partition: 0 }, payload: { rideId: TRACE_ID, pickup: { lat: 1, lon: 2 }, dropoff: { lat: 3, lon: 4 }, vehicleClass: "STANDARD", requestedAt: 1768457400001 } },
          ],
        },
        rideCancelled: { $ref: "#/components/messages/rideCancelled" },
      },
    },
    vehicleStatus: {
      address: "mobility/vehicles/{vehicleId}/status",
      description: "Status reported by scooters and bikes.",
      parameters: { vehicleId: { description: "Vehicle identifier.", examples: ["SCT-0042"] } },
      servers: [{ $ref: "#/servers/mqttVehicles" }],
      messages: {
        vehicleStatusReported: {
          name: "vehicleStatusReported",
          payload: {
            schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
            schema: {
              type: "object",
              required: ["vehicleId", "batteryPercent"],
              properties: {
                vehicleId: { type: "string", pattern: "^(SCT|BKE)-[0-9]{4}$" },
                batteryPercent: { type: "integer", minimum: 0, maximum: 100 },
                locked: { type: "boolean" },
                lastRideId: { type: "string", nullable: true },
                faults: { type: "array", nullable: true, items: { type: "string", enum: ["BRAKE", "BATTERY", "IOT"] } },
                speedLimitKmh: { type: "number", minimum: 0, maximum: 25, exclusiveMaximum: false },
              },
            },
          },
          examples: [
            { name: "parked", payload: { vehicleId: "SCT-0042", batteryPercent: 76, locked: true, lastRideId: null, faults: null, speedLimitKmh: 25 } },
            { name: "faulty", payload: { vehicleId: "BKE-0007", batteryPercent: 3, locked: false, faults: ["BATTERY", "IOT"] } },
          ],
        },
        vehicleTombstone: {
          name: "vehicleTombstone",
          payload: { schemaFormat: AVRO, schema: ["null", { type: "record", name: "VehicleKey", fields: [{ name: "vehicleId", type: "string" }] }] },
          examples: [{ name: "deleted", payload: null }, { name: "key", payload: { vehicleId: "SCT-0042" } }],
        },
      },
    },
    payments: {
      address: null,
      description: "Payment results routed through a reply address assigned at runtime.",
      messages: {
        paymentCaptured: {
          name: "paymentCaptured",
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: {
              type: "object",
              required: ["paymentId", "amount"],
              properties: {
                paymentId: { type: "string", format: "uuid" },
                amount: { $ref: "#/components/schemas/Money" },
                method: { oneOf: [{ $ref: "#/components/schemas/CardMethod" }, { $ref: "#/components/schemas/WalletMethod" }] },
                capturedAt: { type: "string", format: "date-time" },
              },
              additionalProperties: false,
            },
          },
          examples: [
            { name: "card", payload: { paymentId: TRACE_ID, amount: { amount: 45.9, currency: "EUR" }, method: { type: "card", last4: "4242" }, capturedAt: "2026-01-15T07:10:00Z" } },
            { name: "wallet", payload: { paymentId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", amount: { amount: 12, currency: "USD" }, method: { type: "wallet", provider: "applepay" } } },
          ],
        },
      },
    },
    zonePolicies: { $ref: "#/components/channels/zonePolicies" },
    partnerFeeds: {
      address: "mobility.cdc.partners.v1",
      messages: {
        partnerTrip: { payload: { $ref: "./schemas/partner-trip.json" }, examples: [{ payload: { anything: true } }] },
        partnerProto: { payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "message T { string id = 1; }" }, examples: [{ payload: 1 }] },
      },
    },
  },
  operations: {
    requestRide: {
      action: "send",
      channel: { $ref: "#/channels/rideRequests" },
      messages: [{ $ref: "#/channels/rideRequests/messages/rideRequested" }, { $ref: "#/channels/rideRequests/messages/rideRequestedAvro" }],
      reply: { channel: { $ref: "#/channels/payments" }, messages: [{ $ref: "#/channels/payments/messages/paymentCaptured" }] },
    },
    reportStatus: { action: "receive", channel: { $ref: "#/channels/vehicleStatus" }, messages: [{ $ref: "#/channels/vehicleStatus/messages/vehicleStatusReported" }] },
  },
  components: {
    channels: {
      zonePolicies: {
        address: "mobility.sys.zones.policies.v1",
        description: "Speed and parking policies per city zone.",
        messages: {
          zonePolicyUpdated: {
            name: "zonePolicyUpdated",
            payload: { $ref: "#/components/schemas/Zone" },
            examples: [
              {
                name: "nested",
                payload: { zoneId: "MAD-CENTRO", maxSpeedKmh: 15, children: [{ zoneId: "MAD-SOL", maxSpeedKmh: 6, children: [] }], validFrom: "2026-02-01", window: "PT8H" },
              },
            ],
          },
        },
      },
    },
    messages: {
      rideCancelled: {
        name: "rideCancelled",
        traits: [{ $ref: "#/components/messageTraits/tracing" }, { $ref: "#/components/messageTraits/cancellationExamples" }],
        payload: { type: "object", required: ["rideId", "reason"], properties: { rideId: { type: "string" }, reason: { enum: ["RIDER", "DRIVER", "NO_SHOW"] }, feeCents: { type: "integer", minimum: 0 } } },
      },
      surgeChanged: {
        name: "surgeChanged",
        payload: {
          type: "object",
          properties: {
            multiplier: { type: "number", minimum: 1, maximum: 5, multipleOf: 0.1 },
            areas: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string" }, contains: { const: "CENTER" } },
            effective: { type: "string", format: "time" },
          },
          dependentRequired: { multiplier: ["areas"] },
        },
        examples: [{ payload: { multiplier: 1.3, areas: ["CENTER", "AIRPORT"], effective: "18:00:00+01:00" } }, { payload: {} }],
      },
      "x-legacy-ping": { name: "legacyPing", payload: { const: "ping" }, examples: [{ payload: "ping" }] },
    },
    schemas: {
      GeoPoint: { type: "object", required: ["lat", "lon"], properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lon: { type: "number", minimum: -180, maximum: 180 }, label: { type: "string" } } },
      RideRequest: {
        type: "object",
        required: ["rideId", "pickup", "dropoff", "vehicleClass"],
        properties: {
          rideId: { type: "string", format: "uuid" },
          riderEmail: { type: "string", format: "email" },
          pickup: { $ref: "#/components/schemas/GeoPoint" },
          dropoff: { $ref: "#/components/schemas/GeoPoint" },
          vehicleClass: { type: "string", enum: ["STANDARD", "XL", "LUX"] },
          passengers: { type: "integer", minimum: 1, maximum: 6 },
          scheduledFor: { type: "string", format: "date-time" },
          promoCode: { type: ["string", "null"], pattern: "^[A-Z0-9]{4,10}$" },
          stops: { type: "array", maxItems: 3, items: { $ref: "#/components/schemas/GeoPoint" } },
        },
        if: { properties: { vehicleClass: { const: "XL" } }, required: ["vehicleClass"] },
        then: { properties: { passengers: { maximum: 6 } } },
        else: { properties: { passengers: { maximum: 4 } } },
      },
      Money: { type: "object", required: ["amount", "currency"], properties: { amount: { type: "number", multipleOf: 0.01, exclusiveMinimum: 0 }, currency: { type: "string", enum: ["EUR", "USD"] } } },
      CardMethod: { type: "object", required: ["type", "last4"], properties: { type: { const: "card" }, last4: { type: "string", pattern: "^[0-9]{4}$" } } },
      WalletMethod: { type: "object", required: ["type", "provider"], properties: { type: { const: "wallet" }, provider: { type: "string", enum: ["applepay", "googlepay"] } } },
      Zone: {
        type: "object",
        required: ["zoneId"],
        properties: {
          zoneId: { type: "string", pattern: "^[A-Z]{3}-[A-Z]+$" },
          maxSpeedKmh: { type: "integer", minimum: 0, maximum: 25 },
          children: { type: "array", items: { $ref: "#/components/schemas/Zone" } },
          validFrom: { type: "string", format: "date" },
          window: { type: "string", format: "duration" },
        },
      },
    },
    messageTraits: {
      tracing: { headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string", format: "uuid" } } } },
      cancellationExamples: { examples: [{ name: "noShow", headers: { traceId: TRACE_ID }, payload: { rideId: "R-1", reason: "NO_SHOW", feeCents: 300 } }] },
    },
  },
};
