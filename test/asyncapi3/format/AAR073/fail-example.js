const AVRO = "application/vnd.apache.avro;version=1.9.0";
const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });

const reading = {
  type: "object",
  required: ["meterId", "liters"],
  properties: { meterId: { type: "string" }, liters: { type: "number", minimum: 0 }, temperature: { type: ["number", "null"] } },
};

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:utility:water-network",
  info: {
    title: "Water Network Telemetry",
    version: "4.0.3",
    description: "Smart meter readings, leak alerts and valve commands of a municipal water utility.",
    contact: { name: "Network Operations", url: "https://water.example.io/noc", email: "noc@water.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: { host: "kafka.water.example.io:9093", protocol: "kafka-secure", security: [{ $ref: "#/components/securitySchemes/saslScram" }] },
    mqttField: { host: "field.water.example.io:8883", pathname: "/meters", protocol: "secure-mqtt" },
    amqpScada: { host: "scada.water.example.io:5671", pathname: "/valves", protocol: "amqps" },
  },
  channels: {
    meterTelemetry: {
      address: "water.cdc.meters.readings.v2",
      servers: [{ $ref: "#/servers/kafkaProd" }],
      messages: {
        readingReported: { name: "readingReported", contentType: "application/json", payload: reading },
        readingBatch: { name: "readingBatch", traits: [], payload: { type: "array", items: reading } },
        readingCorrected: { name: "readingCorrected", traits: [trait("commonHeaders")], payload: reading },
        readingAvro: {
          name: "readingAvro",
          contentType: "application/vnd.apache.avro+json",
          traits: { headers: { type: "object", properties: { meterModel: { type: "string" } } } },
          payload: { schemaFormat: AVRO, schema: { type: "record", name: "Reading", fields: [{ name: "meterId", type: "string" }, { name: "temperature", type: ["null", "double"], default: null }] } },
        },
        sharedTariff: { $ref: "#/components/messages/tariffChanged" },
      },
    },
    leakAlerts: {
      address: null,
      description: "Leak alerts delivered to the address carried in the replyTo header.",
      messages: {
        leakDetected: { name: "leakDetected", traits: [trait("missing")], payload: { type: "object", properties: { zone: { type: "string" } } } },
        leakCleared: { name: "leakCleared", traits: [[trait("commonHeaders"), {}], [trait("tracing"), {}]], payload: { type: "object" } },
        leakHeartbeat: { name: "leakHeartbeat", traits: [trait("blank"), {}], payload: { type: "object" } },
      },
    },
    valveCommands: {
      address: "valves/{valveId}/commands",
      servers: [{ $ref: "#/servers/amqpScada" }],
      parameters: { valveId: { description: "Valve asset tag.", enum: ["V-001", "V-002", "V-003"] } },
      messages: {
        valveOpened: { name: "valveOpened", traits: [trait("headersAlias")], payload: { type: "object" } },
        valveClosed: { name: "valveClosed", traits: { $ref: "#/components/x-trait-lists/standard" }, payload: { type: "object" } },
        valveJammed: { name: "valveJammed", traits: "commonHeaders", payload: { type: "object" } },
      },
    },
  },
  operations: {
    reportReading: {
      action: "send",
      channel: { $ref: "#/channels/meterTelemetry" },
      messages: [{ $ref: "#/channels/meterTelemetry/messages/readingReported" }, { $ref: "#/channels/meterTelemetry/messages/readingBatch" }],
    },
    receiveLeak: {
      action: "receive",
      channel: { $ref: "#/channels/valveCommands" },
      messages: [{ $ref: "#/channels/valveCommands/messages/valveOpened" }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/leakAlerts" }, messages: [{ $ref: "#/channels/leakAlerts/messages/leakDetected" }] },
    },
    legacyInline: { action: "send", channel: { $ref: "#/channels/meterTelemetry" }, messages: [{ name: "inlineOperationMessage", payload: { type: "object" } }] },
  },
  components: {
    channels: {
      networkAudit: { address: "water.sys.audit.v1", messages: { auditLogged: { name: "auditLogged", traits: null, payload: { type: "object" } } } },
    },
    replies: { leakReply: { channel: { $ref: "#/channels/leakAlerts" }, messages: [{ name: "inlineReplyMessage", payload: { type: "object" } }] } },
    messages: {
      tariffChanged: { name: "tariffChanged", payload: { type: "object", properties: { cents: { type: "integer" } } } },
      pressureForecast: { name: "pressureForecast", traits: [trait("cycleA")], payload: { type: "object" } },
      "x-legacy-reading": { name: "legacyReading", traits: [], payload: { type: "string" } },
      legacyOneOf: { oneOf: [{ name: "legacyA", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } }] },
      qualitySample: { name: "qualitySample", traits: [{ $ref: "./shared/message-traits.yaml#/components/messageTraits/tracingV2" }], payload: { type: "object" } },
      meterPing: { name: "meterPing", traits: [{ headers: { type: "object", properties: { firmware: { type: "string" } } } }], payload: { type: "object" } },
      consumptionDigest: { name: "consumptionDigest", traits: [trait("CommonHeaders"), trait("tracing")], payload: { type: "object" } },
      billingCycle: { name: "billingCycle", traits: [trait("commonHeaders"), { $ref: "./traits/tracing.yaml" }], payload: { type: "object" } },
    },
    messageTraits: {
      commonHeaders: { headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string" }, utility: { type: ["string", "null"] } } } },
      tracing: { correlationId: { location: "$message.header#/traceparent" } },
      CommonHeaders: { headers: { type: "object" } },
      blank: {},
      headersAlias: trait("commonHeaders"),
      cycleA: trait("cycleB"),
      cycleB: trait("cycleA"),
    },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    "x-trait-lists": { standard: [trait("commonHeaders"), trait("tracing")] },
  },
};
