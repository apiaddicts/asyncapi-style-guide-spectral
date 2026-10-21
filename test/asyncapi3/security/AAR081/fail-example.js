module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:energy:dso-gateway",
  info: {
    title: "Quality Distribution Operator Gateway",
    version: "2.0.0",
    description: "Smart meter flows, flexibility requests and curtailment orders exchanged with retailers.",
  },
  defaultContentType: "application/json",
  servers: {
    kafka: { host: "kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant name." },
    "kafka.quality.es": { host: "kafka.quality.es:9093", protocol: "kafka-secure", description: "The host used as the name." },
    "meters prod": { host: "meters.quality.es:9093", protocol: "kafka-secure" },
    "retailer/iberdrola": { host: "kafka.retailer.example.org:9092", protocol: "kafka" },
    "flex~0market": { host: "flex.quality.es:9092", protocol: "kafka" },
    "curtail~1orders": { host: "curtail.quality.es:9092", protocol: "kafka" },
    "mqtt:8883": { host: "mqtt.quality.es:8883", protocol: "secure-mqtt" },
    "{tenant}": { host: "{tenant}.quality.es", protocol: "wss", variables: { tenant: { enum: ["acme"] } } },
    "subestación": { host: "sub.quality.es", protocol: "kafka" },
    " kafka": { host: "leading.quality.es", protocol: "kafka" },
    "": { host: "empty.quality.es", protocol: "kafka" },
    "x-dr.eu": { host: "dr.quality.es", protocol: "kafka" },
    "dr.kafka": { $ref: "#/components/servers/drKafka" },
    "null server": null,
    "array server": [{ host: "kafka.quality.es", protocol: "kafka" }],
  },
  channels: {
    meterReadings: {
      address: "dso.cdc.meters.readings.v2",
      servers: [{ $ref: "#/servers/kafka" }, { $ref: "#/servers/meters prod" }, { $ref: "#/servers/retailer~1iberdrola" }],
      messages: { readingTaken: { name: "readingTaken", payload: { type: "object" } } },
    },
  },
  operations: { receiveReading: { action: "receive", channel: { $ref: "#/channels/meterReadings" } } },
  components: {
    servers: { drKafka: { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure" }, "archive.store": { host: "archive.quality.es", protocol: "kafka" } },
  },
};
