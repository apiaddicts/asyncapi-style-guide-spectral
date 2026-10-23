const AVRO = "application/vnd.apache.avro;version=1.9.0";
const JSON_SCHEMA = "application/schema+json;version=draft-07";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:grid:telemetry",
  info: {
    title: "Smart Grid Telemetry",
    version: "2.4.0",
    description: "Meter readings, outages and substation commands of a distribution grid operator.",
    contact: { name: "Grid Platform", url: "https://grid.example.io", email: "grid-platform@example.io" },
  },
  servers: {
    kafkaProd: { host: "kafka.grid.example.io:9093", protocol: "kafka-secure" },
    substationMqtt: { host: "scada.grid.example.io:8883", pathname: "/substations", protocol: "secure-mqtt" },
    controlWs: { host: "control.grid.example.io", pathname: "/live", protocol: "wss" },
  },
  channels: {
    meterReadings: {
      address: "grid.cdc.meters.readings.v4",
      messages: {
        readingReported: {
          name: "readingReported",
          payload: {
            schemaFormat: JSON_SCHEMA,
            schema: { type: "object", properties: { meterId: { type: "string" }, kwh: { type: "number", format: "double" } }, examples: [{ meterId: "MTR-1", kwh: 1.25 }] },
          },
          "x-examples": [{ payload: { meterId: "MTR-1" } }],
        },
        readingReportedAvro: {
          name: "readingReportedAvro",
          payload: {
            schemaFormat: AVRO,
            schema: {
              type: "record",
              name: "ReadingReported",
              namespace: "io.grid.meters",
              fields: [
                { name: "meterId", type: "string" },
                { name: "kwh", type: ["null", "double"], default: null },
              ],
            },
          },
        },
        readingCorrected: { name: "readingCorrected", payload: { type: "object" }, examples: [] },
        readingBatch: { name: "readingBatch", payload: { type: "array", items: { type: "object" } }, examples: "see the integration guide" },
        tariffChanged: { $ref: "#/components/messages/tariffChanged" },
      },
    },
    outageAlerts: {
      address: null,
      messages: {
        outageDetected: {
          name: "outageDetected",
          payload: { type: "object", properties: { feederId: { type: "string" }, customersAffected: { type: ["integer", "null"] } } },
          examples: [{ name: "feederTrip", summary: "Feeder F-12 tripped." }],
        },
        outageCleared: {
          name: "outageCleared",
          headers: { type: "object", properties: { incidentId: { type: "string" } } },
          payload: { type: "object", properties: { feederId: { type: "string" } } },
          examples: [{ name: "headersOnly", headers: { incidentId: "INC-77" } }],
        },
      },
    },
    substationCommands: {
      address: "grid/substations/{substationId}/breakers",
      parameters: { substationId: { description: "Substation code.", enum: ["SS-01", "SS-02"] } },
      messages: {
        breakerOpened: {
          name: "breakerOpened",
          payload: { type: "object", properties: { breakerId: { type: "string" } } },
          examples: [],
          traits: [{ $ref: "#/components/messageTraits/breakerSamples" }],
        },
        breakerClosed: {
          name: "breakerClosed",
          payload: { type: "object", properties: { breakerId: { type: "string" } } },
          traits: [{ $ref: "#/components/messageTraits/breakerSamples" }, { $ref: "#/components/messageTraits/emptyExamples" }],
        },
        breakerHeartbeat: { name: "breakerHeartbeat", headers: { type: "object", properties: { rtuId: { type: "string" } } } },
      },
    },
    tariffs: { address: "grid.cdc.tariffs.v1", messages: { tariffChanged: { $ref: "#/components/messages/tariffChanged" } } },
    gridAudit: { $ref: "#/components/channels/gridAudit" },
  },
  operations: {
    publishReading: {
      action: "send",
      channel: { $ref: "#/channels/meterReadings" },
      messages: [{ $ref: "#/channels/meterReadings/messages/readingReported" }, { $ref: "#/channels/meterReadings/messages/tariffChanged" }],
    },
    receiveOutage: {
      action: "receive",
      channel: { $ref: "#/channels/outageAlerts" },
      messages: [{ $ref: "#/channels/outageAlerts/messages/outageDetected" }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/tariffs" }, messages: [{ $ref: "#/channels/tariffs/messages/tariffChanged" }] },
    },
    commandBreaker: { action: "send", channel: { $ref: "#/channels/substationCommands" }, messages: [{ $ref: "#/channels/substationCommands/messages/breakerOpened" }] },
  },
  components: {
    channels: {
      gridAudit: { address: "grid.sys.audit.v1", messages: { auditLogged: { name: "auditLogged", payload: { type: "object", properties: { actor: { type: "string" } } } } } },
    },
    messages: {
      tariffChanged: { name: "tariffChanged", payload: { type: "object", properties: { tariffId: { type: "string" }, pricePerKwh: { type: "number" } } } },
      loadForecast: { name: "loadForecast", payload: { type: "object" }, examples: [null, 0, "forecast"] },
      demandResponse: { name: "demandResponse", payload: { type: "object" }, examples: null },
      "x-legacy-reading": { name: "legacyReading", payload: { type: "object" } },
      meterPing: { name: "meterPing", headers: { type: "object" }, examples: [{ headers: {} }, { summary: "Ping without data." }] },
      legacyOneOf: {
        oneOf: [
          { name: "legacyA", payload: { type: "object" }, examples: [{ payload: {} }] },
          { name: "legacyB", payload: { type: "object" }, examples: [{ payload: {} }] },
        ],
      },
      gridEvent: {
        name: "gridEvent",
        payload: { type: "object" },
        examples: [{ headers: { source: "scada" } }],
        traits: [{ $ref: "#/components/messageTraits/breakerSamples" }],
      },
    },
    messageTraits: {
      breakerSamples: { examples: [{ name: "breakerTrip", payload: { breakerId: "BRK-9" } }] },
      emptyExamples: { examples: [] },
    },
  },
};
