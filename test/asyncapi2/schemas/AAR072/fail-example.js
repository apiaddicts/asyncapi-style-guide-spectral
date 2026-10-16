const TRACE_ID = "4bf92f35-77b3-4da6-a3ce-929d0e0e4736";

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:fleet:telematics:event-hub",
  info: {
    title: "Fleet Telematics Event Hub",
    version: "3.4.0",
    description: "Vehicle positions, dispatch orders, maintenance and billing events exchanged by the fleet platform.",
    contact: { name: "Fleet Platform", url: "https://fleet.example.io/platform", email: "platform@fleet.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      url: "kafka-{region}.fleet.example.io:9093",
      protocol: "kafka-secure",
      variables: { region: { enum: ["eu-west", "us-east"], default: "eu-west" } },
      bindings: { kafka: { schemaRegistryUrl: "https://registry.fleet.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    mqttEdge: { url: "mqtts://edge.fleet.example.io:8883", protocol: "secure-mqtt", bindings: { mqtt: { clientId: "fleet-gateway", cleanSession: false, bindingVersion: "0.2.0" } } },
    amqpBilling: { url: "amqps://rabbit.fleet.example.io:5671/billing", protocol: "amqps" },
    wsLive: { url: "wss://live.fleet.example.io/v3", protocol: "wss" },
  },
  channels: {
    "fleet.cdc.telemetry.position.v2": {
      description: "Positions reported by the on-board units every few seconds.",
      servers: ["kafkaProd", "wsLive"],
      bindings: { kafka: { topic: "fleet.cdc.telemetry.position.v2", partitions: 48, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishPosition",
        summary: "On-board unit reports a position.",
        message: {
          name: "positionReported",
          contentType: "application/json",
          headers: { $ref: "#/components/schemas/TelemetryHeaders" },
          payload: { $ref: "#/components/schemas/Position" },
          examples: [
            {
              name: "speeding",
              summary: "Speed above the physical limit and a latitude sent as text.",
              headers: { traceId: TRACE_ID, tenant: "eu-west" },
              payload: { vehicleId: "VH-0042", speedKmh: 312.5, heading: 270, position: { lat: "40.4168", lon: -3.7038 } },
            },
            {
              name: "missingVehicle",
              headers: { traceId: "trace-123", tenant: "eu-west" },
              payload: { speedKmh: 88, heading: 90, position: { lat: 40.4168, lon: -3.7038 } },
            },
            {
              name: "parked",
              headers: { traceId: TRACE_ID, tenant: "us-east" },
              payload: { vehicleId: "VH-0007", speedKmh: 0, heading: 0, position: { lat: 40.7128, lon: -74.006 } },
            },
          ],
        },
      },
      subscribe: {
        operationId: "receivePosition",
        summary: "Route planner consumes positions.",
        message: {
          oneOf: [
            { $ref: "#/components/messages/vehicleRegistered" },
            {
              name: "positionReportedAvro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "PositionReported",
                namespace: "io.fleet.telemetry",
                fields: [
                  { name: "vehicleId", type: "string" },
                  { name: "recordedAt", type: { type: "long", logicalType: "timestamp-millis" } },
                  { name: "source", type: { type: "enum", name: "Source", symbols: ["GPS", "GLONASS", "GALILEO"] } },
                  { name: "accuracyMeters", type: ["null", "float"], default: null },
                ],
              },
              examples: [
                { name: "beidou", payload: { vehicleId: "VH-0042", recordedAt: "2026-01-15T10:00:00Z", source: "BEIDOU", accuracyMeters: null, firmware: "4.2.1" } },
                { name: "galileo", payload: { vehicleId: "VH-0042", recordedAt: 1768471200000, source: "GALILEO", accuracyMeters: { float: 2.5 } } },
              ],
            },
            {
              name: "positionPurged",
              summary: "Compaction tombstone.",
              payload: { type: ["object", "null"], properties: { vehicleId: { type: "string" } } },
              examples: [{ name: "deleted", payload: "DELETED" }, { name: "tombstone", payload: null }],
            },
          ],
        },
      },
    },
    "fleet.cmd.dispatch.assign.v1": {
      description: "Dispatch orders assigned to drivers.",
      servers: ["kafkaProd"],
      publish: {
        operationId: "publishDispatch",
        summary: "Dispatcher assigns a route.",
        message: {
          name: "dispatchAssigned",
          payload: {
            type: "object",
            required: ["dispatchId", "stops"],
            properties: {
              dispatchId: { type: "string" },
              priority: { type: "string", enum: ["LOW", "NORMAL", "URGENT"] },
              stops: {
                type: "array",
                uniqueItems: true,
                items: { type: "object", required: ["stopId"], properties: { stopId: { type: "string" }, eta: { type: "string", format: "date-time" } } },
              },
            },
          },
          examples: [
            {
              name: "critical",
              payload: {
                dispatchId: "DSP-1",
                priority: "CRITICAL",
                stops: [
                  { stopId: "S1", eta: "2026-01-15T10:00:00Z" },
                  { stopId: "S2", eta: "2026-01-15 25:00" },
                  { stopId: "S1", eta: "2026-01-15T10:00:00Z" },
                ],
              },
            },
          ],
        },
      },
      subscribe: {
        operationId: "receiveDispatchAck",
        summary: "Driver app acknowledges a dispatch.",
        message: {
          name: "dispatchAcknowledged",
          schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
          payload: {
            type: "object",
            properties: {
              driver: { type: "object", nullable: true, required: ["licenseId"], properties: { licenseId: { type: "string" }, name: { type: "string" } } },
              notes: { type: "string", nullable: true, maxLength: 140 },
              acceptedAt: { type: "string", format: "date-time", nullable: true },
            },
          },
          examples: [
            {
              name: "verbose",
              payload: {
                driver: { name: "Ana Torres" },
                notes: "Driver accepted the route but asked to skip the second stop because the loading dock is closed for maintenance until further notice from the warehouse team.",
                acceptedAt: null,
              },
            },
            { name: "unassigned", payload: { driver: null, notes: null, acceptedAt: "2026-01-15T10:05:00+01:00" } },
          ],
        },
      },
    },
    "fleet/vehicles/{vehicleId}/maintenance": {
      description: "Maintenance events published by the workshops over MQTT.",
      servers: ["mqttEdge"],
      parameters: { vehicleId: { description: "Vehicle identifier.", schema: { type: "string", pattern: "^VH-\\d{4}$" } } },
      publish: {
        operationId: "publishMaintenance",
        summary: "Workshop reports a maintenance.",
        message: {
          name: "maintenanceCompleted",
          payload: { type: "object", properties: { workshopId: { type: "string" }, mileageKm: { type: "integer", minimum: 0 } } },
          traits: [{ $ref: "#/components/messageTraits/workshopHeaders" }, { $ref: "#/components/messageTraits/workshopExamples" }],
          examples: [{ name: "ownExample", headers: { tenant: "eu-west" }, payload: { workshopId: "WS-9", mileageKm: 120500 } }],
        },
      },
      subscribe: {
        operationId: "receiveMaintenanceDue",
        summary: "Workshops receive due maintenances.",
        message: {
          name: "maintenanceDue",
          headers: { type: "object", required: ["tenant"], properties: { tenant: { type: "string" }, priority: { type: "integer", minimum: 1, maximum: 5 } } },
          payload: { type: "object", properties: { dueOn: { type: "string", format: "date" } } },
          examples: [{ name: "highPriority", headers: { priority: "high" }, payload: { dueOn: "2026-03-01" } }],
        },
      },
    },
    "fleet.sys.billing.invoices.v1": {
      description: "Invoices issued to fleet customers.",
      servers: ["amqpBilling", "kafkaProd"],
      publish: {
        operationId: "publishInvoice",
        summary: "Billing issues an invoice.",
        message: {
          name: "invoiceIssued",
          payload: {
            type: "object",
            additionalProperties: false,
            required: ["invoiceId", "currency", "lines"],
            properties: {
              invoiceId: { type: "string" },
              currency: { type: "string", pattern: "^[A-Z]{3}$" },
              issuedAt: { type: "string", format: "date-time" },
              lines: { type: "array", minItems: 1, items: { type: "object", properties: { description: { type: "string" }, amount: { type: "number", multipleOf: 0.01 } } } },
            },
          },
          examples: [
            {
              name: "legacyInvoice",
              payload: { invoiceId: "INV-2026-0001", currency: "eur", issuedAt: "2026-01-31T23:59:59Z", lines: [{ description: "Fuel card", amount: 10.005 }], "x-legacy-ref": "A1" },
            },
          ],
        },
      },
      subscribe: {
        operationId: "receiveInvoiceAvro",
        summary: "Ledger consumes invoices in Avro.",
        message: {
          name: "invoiceIssuedAvro",
          schemaFormat: "application/vnd.apache.avro+json;version=1.9.0",
          payload: {
            type: "record",
            name: "Invoice",
            namespace: "io.fleet.billing",
            fields: [
              { name: "invoiceId", type: "string" },
              { name: "total", type: { type: "bytes", logicalType: "decimal", precision: 12, scale: 2 } },
              { name: "paid", type: "boolean", default: false },
            ],
          },
          examples: [{ name: "numericTotal", payload: { invoiceId: "INV-2026-0001", total: 125.5 } }],
        },
      },
    },
    "fleet.cdc.partners.v1": {
      description: "Partner events whose schemas live in another repository.",
      servers: ["kafkaProd"],
      publish: {
        operationId: "publishPartnerEvent",
        summary: "Partner gateway relays events.",
        message: {
          name: "partnerEvent",
          payload: { $ref: "./schemas/partner-event.json" },
          examples: [{ payload: { anything: "goes" } }, { payload: 42 }],
        },
      },
      subscribe: {
        operationId: "receivePartnerProtobuf",
        summary: "Partner events in protobuf.",
        message: {
          name: "partnerEventProto",
          schemaFormat: "application/vnd.google.protobuf;version=3",
          payload: "syntax = \"proto3\"; message PartnerEvent { string id = 1; }",
          examples: [{ payload: { id: 42 } }],
        },
      },
    },
  },
  components: {
    channels: {
      "fleet.sys.audit.v1": {
        description: "Audit trail of every fleet operation.",
        subscribe: {
          operationId: "receiveAudit",
          summary: "Compliance consumes the audit trail.",
          message: {
            name: "auditLogged",
            payload: { type: "object", properties: { actor: { type: "string" }, action: { type: "string" } } },
            examples: [{ payload: { actor: 42, action: "vehicle.retired" } }],
          },
        },
      },
    },
    messages: {
      vehicleRegistered: {
        name: "vehicleRegistered",
        title: "Vehicle registered",
        payload: {
          type: "object",
          required: ["vin"],
          properties: {
            vin: { type: "string", minLength: 17, maxLength: 17 },
            registeredOn: { type: "string", format: "date" },
            examples: { type: "array" },
          },
          examples: [{ vin: "short" }],
        },
        "x-examples": [{ payload: { vin: 1 } }],
        examples: [
          { name: "shortVin", payload: { vin: "WVWZZZ1JZXW00", registeredOn: "2026-01-15" } },
          { name: "invalidDate", payload: { vin: "WVWZZZ1JZXW000001", registeredOn: "2026-02-30" } },
        ],
      },
      driverShiftEnded: {
        name: "driverShiftEnded",
        payload: { type: "object", properties: { driverId: { type: "string" } } },
        examples: [{ payload: "shift-ended" }],
      },
      geofenceBreached: {
        name: "geofenceBreached",
        payload: {
          type: "object",
          properties: {
            zone: {
              oneOf: [
                {
                  type: "object",
                  required: ["center", "radiusMeters"],
                  properties: { center: { $ref: "#/components/schemas/GeoPoint" }, radiusMeters: { type: "number", exclusiveMinimum: 0 } },
                },
                { type: "array", minItems: 3, items: { $ref: "#/components/schemas/GeoPoint" } },
              ],
            },
          },
        },
        examples: [
          { name: "namedZone", payload: { zone: "Z-12" } },
          { name: "zeroRadius", payload: { zone: { center: { lat: 40.4, lon: -3.7 }, radiusMeters: 0 } } },
          { name: "polygon", payload: { zone: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, { lat: 3, lon: 1 }] } },
        ],
      },
      "x-legacy-ping": {
        name: "legacyPing",
        payload: { const: "ping" },
        examples: [{ payload: "pong" }],
      },
      tripSummary: {
        oneOf: [
          {
            name: "tripSummary",
            payload: { type: "object", properties: { distanceKm: { type: "number", minimum: 0 } } },
            examples: [{ payload: { distanceKm: -1 } }],
          },
        ],
      },
    },
    schemas: {
      TelemetryHeaders: {
        type: "object",
        required: ["traceId"],
        properties: { traceId: { type: "string", format: "uuid" }, tenant: { type: "string", enum: ["eu-west", "us-east"] } },
      },
      GeoPoint: { type: "object", required: ["lat", "lon"], properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lon: { type: "number", minimum: -180, maximum: 180 } } },
      Position: {
        type: "object",
        required: ["vehicleId", "position"],
        properties: {
          vehicleId: { type: "string", pattern: "^VH-\\d{4}$" },
          speedKmh: { type: "number", minimum: 0, maximum: 300 },
          heading: { type: "integer", minimum: 0, maximum: 359 },
          position: { $ref: "#/components/schemas/GeoPoint" },
        },
      },
    },
    messageTraits: {
      workshopHeaders: { headers: { type: "object", required: ["tenant"], properties: { tenant: { type: "string" } } } },
      workshopExamples: { examples: [{ name: "fromTrait", headers: { tenant: "eu-west" }, payload: { workshopId: 7, mileageKm: 98000 } }] },
    },
  },
};
