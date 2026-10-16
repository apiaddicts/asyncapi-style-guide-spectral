const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:grid:operations:event-bus",
  info: {
    title: "Smart Grid Operations Event Bus",
    version: "2.8.0",
    description: "Meter readings, outages, substation commands and tariffs exchanged by the distribution grid.",
    contact: { name: "Grid Platform", url: "https://grid.example.io/platform", email: "platform@grid.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: { host: "kafka.grid.example.io:9093", protocol: "kafka-secure", description: "Production Kafka cluster.", bindings: { kafka: { schemaRegistryUrl: "https://registry.grid.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } } },
    mqttField: { host: "field.grid.example.io:8883", pathname: "/meters", protocol: "secure-mqtt" },
    amqpScada: { host: "scada.grid.example.io:5671", protocol: "amqps" },
  },
  channels: {
    gridTelemetry: {
      address: "grid.cdc.telemetry.readings.v4",
      description: "Readings sent by smart meters.",
      servers: [{ $ref: "#/servers/kafkaProd" }],
      messages: {
        meterReading: {
          name: "meterReading",
          contentType: "application/json",
          headers: { type: "object", required: ["meterId"], properties: { meterId: { type: "string" }, firmware: { type: "string" } } },
          payload: {
            type: "object",
            required: ["meterId", "kwh"],
            properties: {
              meterId: { type: "string" },
              kwh: { type: "number", minimum: 0 },
              readAt: { type: "string", format: "date-time" },
              phase: { type: ["integer", "null"], minimum: 1, maximum: 3 },
            },
          },
          examples: [
            { name: "negative", headers: { meterId: "MTR-1" }, payload: { meterId: "MTR-1", kwh: -0.5, readAt: "2026-01-15T10:00", phase: 2 } },
            { name: "noMeterHeader", headers: { firmware: "1.2.0" }, payload: { meterId: "MTR-2", kwh: 12, phase: "L1" } },
            { name: "singlePhase", headers: { meterId: "MTR-3" }, payload: { meterId: "MTR-3", kwh: 4.25, readAt: "2026-01-15T10:00:00Z", phase: null } },
          ],
        },
        meterReadingAvro: {
          name: "meterReadingAvro",
          contentType: "application/vnd.apache.avro+json",
          headers: {
            schemaFormat: AVRO,
            schema: { type: "record", name: "KafkaHeaders", namespace: "io.grid.kafka", fields: [{ name: "partition", type: "int" }, { name: "traceId", type: ["null", "string"] }] },
          },
          payload: {
            schemaFormat: AVRO,
            schema: {
              type: "record",
              name: "MeterReading",
              namespace: "io.grid.metering",
              fields: [
                { name: "meterId", type: "string" },
                { name: "voltage", type: "double" },
                { name: "quality", type: { type: "enum", name: "Quality", symbols: ["GOOD", "ESTIMATED", "MISSING"] } },
                { name: "tags", type: { type: "map", values: "string" }, default: {} },
              ],
            },
          },
          examples: [
            { name: "broken", payload: { voltage: "230.1", quality: "BAD" } },
            { name: "badHeader", headers: { partition: "3" }, payload: { meterId: "MTR-3", voltage: 229.8, quality: "GOOD" } },
          ],
        },
        meterReadingShared: { $ref: "#/components/messages/tariffChanged" },
      },
    },
    outageAlerts: {
      address: "grid/outages/{feederId}",
      description: "Outages detected on a feeder.",
      parameters: { feederId: { description: "Feeder identifier.", examples: ["F-12"] } },
      servers: [{ $ref: "#/servers/mqttField" }],
      messages: {
        outageDetected: {
          name: "outageDetected",
          payload: {
            schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
            schema: {
              type: "object",
              properties: {
                affectedCustomers: { type: "integer", minimum: 0 },
                feeder: { type: "object", nullable: true, required: ["feederId"], properties: { feederId: { type: "string" }, name: { type: "string" } } },
                estimatedRestore: { type: "string", format: "date-time", nullable: true },
              },
            },
          },
          examples: [
            { name: "fractional", payload: { affectedCustomers: 1200.5, feeder: { name: "F-12" }, estimatedRestore: null } },
            { name: "unknownFeeder", payload: { affectedCustomers: 0, feeder: null } },
          ],
        },
        outageCleared: {
          name: "outageCleared",
          payload: { $ref: "#/components/schemas/OutageCleared" },
          examples: [{ name: "instant", payload: { durationMinutes: 0, cause: 42 } }],
        },
      },
    },
    substationCommands: {
      address: null,
      description: "Commands sent to substations; the address is assigned at runtime.",
      servers: [{ $ref: "#/servers/amqpScada" }],
      messages: {
        breakerTrip: {
          name: "breakerTrip",
          headers: { type: "object", properties: { priority: { type: "integer", minimum: 1, maximum: 5 } } },
          payload: { type: "object", properties: { breakerId: { type: "string", pattern: "^BRK-[0-9]{4}$" } } },
          examples: [{ name: "shortId", headers: { priority: "1" }, payload: { breakerId: "BRK-12" } }],
        },
        breakerReset: {
          name: "breakerReset",
          payload: { type: "object", properties: { operator: { type: "string" }, resetAt: { type: "string", format: "date-time" } } },
          traits: [{ $ref: "#/components/messageTraits/resetExamples" }],
        },
        breakerResetConfirmed: {
          name: "breakerResetConfirmed",
          payload: { type: "object", properties: { operator: { type: "string" }, resetAt: { type: "string", format: "date-time" } } },
          traits: [{ $ref: "#/components/messageTraits/resetExamples" }],
          examples: [{ name: "relative", payload: { operator: "op-1", resetAt: "now" } }],
        },
      },
    },
    partnerFeeds: {
      address: "grid.cdc.partners.v1",
      description: "Partner utilities whose schemas live in another repository.",
      messages: {
        partnerReading: { payload: { $ref: "./schemas/partner-reading.json" }, examples: [{ payload: { anything: true } }] },
        partnerProto: { payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "message R { double kwh = 1; }" }, examples: [{ payload: { kwh: "x" } }] },
      },
    },
  },
  operations: {
    sendReading: {
      action: "send",
      channel: { $ref: "#/channels/gridTelemetry" },
      messages: [{ $ref: "#/channels/gridTelemetry/messages/meterReading" }],
      reply: {
        channel: { $ref: "#/channels/outageAlerts" },
        messages: [{ name: "inlineReply", payload: { type: "object", required: ["ack"] }, examples: [{ payload: {} }] }],
      },
    },
    receiveCommand: {
      action: "receive",
      channel: { $ref: "#/channels/substationCommands" },
      messages: [{ name: "inlineCommand", payload: { type: "string" }, examples: [{ payload: 42 }] }],
    },
  },
  components: {
    channels: {
      gridAudit: {
        address: "grid.sys.audit.v1",
        messages: {
          auditLogged: { name: "auditLogged", payload: { type: "object", properties: { actor: { type: "string" } } }, examples: [{ payload: { actor: 42 } }] },
        },
      },
    },
    messages: {
      tariffChanged: {
        name: "tariffChanged",
        payload: {
          type: "object",
          properties: {
            rates: {
              type: "array",
              uniqueItems: true,
              items: { type: "object", properties: { band: { type: "string" }, pricePerKwh: { type: "number", multipleOf: 0.0001 } } },
            },
          },
        },
        examples: [
          {
            name: "duplicatedBand",
            payload: { rates: [{ band: "PEAK", pricePerKwh: 0.2512 }, { band: "OFF", pricePerKwh: 0.12345 }, { band: "PEAK", pricePerKwh: 0.2512 }] },
          },
        ],
      },
      demandForecast: {
        name: "demandForecast",
        payload: {
          type: "object",
          properties: {
            horizon: { type: "string", format: "duration" },
            points: { type: "array", items: { type: "array", prefixItems: [{ type: "string", format: "date-time" }, { type: "number" }], items: false } },
          },
        },
        examples: [{ name: "withUnits", payload: { horizon: "24h", points: [["2026-01-15T10:00:00Z", 120.5, "MW"], ["2026-01-15T11:00:00Z", 118]] } }],
      },
      "x-legacy-reading": { name: "legacyReading", payload: { type: "object" }, examples: [{ payload: "MTR-1;12.5" }] },
      loadShed: {
        name: "loadShed",
        payload: { schemaFormat: "application/vnd.apache.avro+yaml;version=1.9.0", schema: { type: "record", name: "LoadShed", fields: [{ name: "zones", type: { type: "array", items: "string" } }] } },
        examples: [{ payload: { zones: [7, "Z-2"] } }],
      },
    },
    schemas: {
      OutageCleared: {
        type: "object",
        properties: {
          durationMinutes: { type: "number", exclusiveMinimum: 0 },
          cause: { oneOf: [{ type: "string", enum: ["WEATHER", "EQUIPMENT"] }, { type: "object", required: ["code"], properties: { code: { type: "string" } } }] },
        },
      },
    },
    messageTraits: {
      resetExamples: { examples: [{ name: "fromTrait", payload: { operator: 7, resetAt: "2026-01-15T10:00:00Z" } }] },
    },
  },
};
