module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Fleet Charging Network", version: "3.1.0" },
  servers: { $ref: "#/components/x-server-catalog/active" },
  channels: {
    sessions: {
      address: "charging/stations/{stationId}/sessions",
      parameters: { stationId: { description: "Charging station identifier." } },
      servers: [{ $ref: "#/servers/eventstreams" }, { $ref: "#/servers/kafka" }, { $ref: "#/servers/production" }],
      messages: { sessionStarted: { name: "sessionStarted", payload: { type: "object" } } },
    },
  },
  operations: { publishSession: { action: "send", channel: { $ref: "#/channels/sessions" } } },
  components: {
    servers: {
      eventStreamsPro: { host: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure" },
      onPremKafka: { host: "kafka.quality.es:9092", protocol: "kafka" },
      production: { host: "kafka-pro.quality.es:9093", protocol: "kafka-secure" },
      alias: { $ref: "#/components/servers/onPremKafka" },
    },
    "x-server-catalog": {
      active: { $ref: "#/components/x-server-catalog/eu~1west~0primary" },
      "eu/west~primary": {
        eventstreams: { $ref: "#/components/servers/eventStreamsPro" },
        kafka: { $ref: "#/components/servers/alias" },
        production: { $ref: "#/components/servers/production" },
        "x-dr": { $ref: "#/components/servers/doesNotExist" },
        partner: { $ref: "./partner-servers.yaml#/servers/kafka" },
        cyclic: { $ref: "#/components/x-server-catalog/loop" },
        Kafka: { host: "kafka-legacy.quality.es:9092", protocol: "kafka" },
      },
      loop: { $ref: "#/components/x-server-catalog/loop" },
      retired: { mqtt: { host: "mqtt.quality.es:1883", protocol: "mqtt" } },
    },
  },
};
