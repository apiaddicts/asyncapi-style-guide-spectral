module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:energy:grid-telemetry",
  info: {
    title: "Quality Grid Telemetry",
    version: "4.1.0",
    description: "Substation telemetry, outage alarms and dispatch commands of the distribution grid.",
  },
  defaultContentType: "application/json",
  servers: {
    eventstreams: { host: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure", title: "Event Streams" },
    kafka: { host: "kafka.partner.example.org:9092", protocol: "kafka", summary: "Hosts are not this rule's concern." },
    production: { host: "{env}.quality.es:9093", protocol: "kafka-secure", variables: { env: { enum: ["kafka.pro", "kafka.dr"] } } },
    substationMqtt: { host: "10.20.0.15:1883", pathname: "/substations/eu.west", protocol: "mqtt" },
    "dispatch-amqp": { host: "rabbit.quality.es:5671", pathname: "/%2Fdispatch", protocol: "amqps" },
    SCADA_WS: { host: "scada.quality.es", pathname: "/realtime", protocol: "wss" },
    "x-legacy": { host: "legacy.quality.es", protocol: "kafka", "x-server-name": "legacy.kafka" },
    "-": { host: "dash.quality.es", protocol: "kafka" },
    "01": { host: "first.quality.es", protocol: "kafka" },
    drKafka: { $ref: "#/components/servers/dr.kafka" },
    partnerKafka: { $ref: "./partner-servers.yaml#/components/servers/partner.kafka" },
    toString: { host: "tostring.quality.es", protocol: "kafka" },
  },
  channels: {
    substationTelemetry: {
      address: "grid.cdc.substations.telemetry.v4",
      servers: [{ $ref: "#/servers/eventstreams" }, { $ref: "#/servers/kafka" }, { $ref: "#/components/servers/dr.kafka" }],
      messages: {
        reading: {
          name: "reading",
          payload: { type: "object", properties: { "server.name": { type: ["string", "null"], default: "kafka prod" } } },
          examples: [{ name: "north", payload: { "server.name": "eu west" } }],
        },
      },
    },
    outageAlarms: {
      address: null,
      servers: [{ $ref: "#/servers/substationMqtt" }],
      messages: {
        alarm: {
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: { type: "record", name: "Alarm", namespace: "es.quality.grid", fields: [{ name: "server_name", type: ["null", "string"], default: null }] },
          },
        },
      },
    },
  },
  operations: {
    "receive.telemetry": { action: "receive", channel: { $ref: "#/channels/substationTelemetry" } },
    sendAlarm: { action: "send", channel: { $ref: "#/channels/outageAlarms" }, reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/outageAlarms" } } },
  },
  components: {
    servers: {
      "dr.kafka": { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure", description: "Component ids may contain dots." },
      "archive.store": { host: "archive.quality.es", protocol: "kafka" },
    },
    serverVariables: { "env.name": { enum: ["pro", "pre"] } },
    securitySchemes: { "sasl.scram": { type: "scramSha512" } },
    replies: { "reply.default": { address: { location: "$message.header#/replyTo" } } },
  },
  "x-servers": { "kafka prod": { host: "kafka.quality.es", protocol: "kafka" } },
};
