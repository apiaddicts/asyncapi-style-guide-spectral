const complete = { description: "Grid operations runbook.", url: "https://docs.aurora-grid.example.com/operations" };
const urlOnly = (topic) => ({ url: `https://docs.aurora-grid.example.com/${topic}` });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:aurora-grid:smart-metering",
  info: {
    title: "Aurora Grid Smart Metering",
    version: "3.8.2",
    description: "Meter readings, alarms and tariff changes exchanged between the smart meters, the substations and the billing platform.",
    externalDocs: {},
  },
  externalDocs: urlOnly("metering"),
  tags: [
    { name: "metering", description: "Meter readings.", externalDocs: { description: "Metering handbook.", url: "" } },
    { name: "substations", description: "Substation events.", externalDocs: { $ref: "#/components/x-docs/substations" } },
    { name: "billing", description: "Billing events.", externalDocs: complete },
    { name: "grid", description: "Grid events.", externalDocs: "https://docs.aurora-grid.example.com/grid" },
  ],
  servers: {
    kafkaGrid: {
      url: "kafka.aurora-grid.example.com:9093",
      protocol: "kafka-secure",
      description: "Grid Kafka cluster.",
      tags: [{ name: "production", description: "Production cluster.", externalDocs: { description: null, url: "https://docs.aurora-grid.example.com/kafka" } }],
    },
    mqttField: {
      url: "mqtts://field.aurora-grid.example.com:8883",
      protocol: "mqtt",
      description: "Field devices broker.",
      externalDocs: {},
      tags: [{ name: "field", description: "Field devices.", externalDocs: complete }],
    },
  },
  channels: {
    "aurora.cdc.meters.readings.v3": {
      description: "Interval readings sent by every smart meter.",
      externalDocs: {},
      publish: {
        operationId: "publishMeterReading",
        externalDocs: { description: "  ", url: " " },
        tags: [{ name: "readings", description: "Readings.", externalDocs: urlOnly("readings") }],
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { externalDocs: { description: "Inline producer trait." } }, [{ externalDocs: null }, {}]],
        message: {
          name: "meterReading",
          title: "Meter reading",
          contentType: "application/json",
          externalDocs: urlOnly("meter-reading"),
          tags: [{ name: "meter-readings", description: "Meter readings.", externalDocs: {} }],
          traits: [{ $ref: "#/components/messageTraits/gridHeaders" }, [{ externalDocs: { description: "Tuple message trait." } }, {}]],
          headers: { type: "object", externalDocs: { description: "Reading headers." }, properties: { meterFirmware: { type: "string" } } },
          payload: {
            type: "object",
            externalDocs: complete,
            properties: {
              meterId: { type: "string", externalDocs: urlOnly("meter-ids") },
              reading: { type: ["number", "null"], format: "double", externalDocs: { description: "Energy in kWh.", url: null } },
              externalDocs: { type: "object", properties: { url: { type: "string" }, description: { type: "string" } } },
              location: { $ref: "#/components/schemas/GeoPoint" },
            },
            examples: [{ meterId: "MTR-001", externalDocs: {} }],
          },
        },
      },
      subscribe: {
        operationId: "receiveMeterEvents",
        externalDocs: complete,
        message: {
          externalDocs: {},
          oneOf: [
            { $ref: "#/components/messages/meterAlarm" },
            { name: "meterOffline", title: "Meter offline", externalDocs: [], payload: { type: "object", properties: { meterId: { type: "string" } } } },
            {
              name: "meterRecovered",
              title: "Meter recovered",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              externalDocs: complete,
              payload: { type: "record", name: "MeterRecovered", externalDocs: {}, fields: [{ name: "meterId", type: "string" }, { name: "since", type: ["null", "long"], default: null }] },
            },
          ],
        },
      },
    },
    "substations/{substationId}/alarms": {
      description: "Alarms raised by the substations.",
      externalDocs: {},
      parameters: {
        substationId: { description: "Substation code.", schema: { type: "string", externalDocs: { description: "", url: "https://docs.aurora-grid.example.com/substations" } } },
        region: { $ref: "#/components/parameters/region" },
      },
      subscribe: {
        operationId: "receiveSubstationAlarm",
        externalDocs: { $ref: "#/components/x-docs/missing" },
        message: { $ref: "#/components/messages/meterAlarm" },
      },
    },
  },
  components: {
    externalDocs: { notA2xLocation: {} },
    tags: { notA2xLocation: { name: "not-a-2x-location", externalDocs: {} } },
    schemas: {
      GeoPoint: { type: "object", externalDocs: { description: "WGS84 point." }, properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lon: { type: "number", minimum: -180, maximum: 180 } } },
      Tariff: { type: "object", definitions: { band: { type: "string", enum: ["peak", "off-peak"], externalDocs: urlOnly("tariff-bands") } }, properties: { band: { $ref: "#/components/schemas/Tariff/definitions/band" } } },
      AvroAlarm: { type: "record", name: "MeterAlarm", namespace: "com.aurora.grid", externalDocs: {}, fields: [{ name: "code", type: "string" }] },
    },
    parameters: { region: { description: "Grid region.", schema: { type: "string", enum: ["north", "south"], externalDocs: urlOnly("regions") } } },
    messages: {
      meterAlarm: {
        name: "meterAlarm",
        title: "Meter alarm",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        externalDocs: { description: "Alarm catalogue." },
        payload: { $ref: "#/components/schemas/AvroAlarm" },
      },
      tariffChanged: { name: "tariffChanged", title: "Tariff changed", externalDocs: { $ref: "#/components/x-docs/tariffs" }, payload: { $ref: "#/components/schemas/Tariff" } },
    },
    operationTraits: {
      kafkaProducer: {
        externalDocs: { description: "Producer runbook." },
        tags: [{ name: "producers", description: "Kafka producers.", externalDocs: urlOnly("producers") }],
      },
    },
    messageTraits: {
      gridHeaders: { externalDocs: complete, headers: { type: "object", properties: { traceId: { type: "string", externalDocs: {} } } } },
    },
    channels: {
      tariffs: { publish: { operationId: "publishTariffChanged", externalDocs: urlOnly("tariffs"), message: { $ref: "#/components/messages/tariffChanged" } } },
    },
    servers: {
      kafkaDr: {
        url: "kafka-dr.aurora-grid.example.com:9093",
        protocol: "kafka-secure",
        tags: [{ name: "disaster-recovery", description: "DR cluster.", externalDocs: { description: "DR runbook.", url: "" } }],
      },
    },
    "x-docs": {
      substations: { description: "Substation runbooks." },
      tariffs: { description: "Tariff handbook.", url: "  " },
      unreferenced: {},
    },
  },
};
