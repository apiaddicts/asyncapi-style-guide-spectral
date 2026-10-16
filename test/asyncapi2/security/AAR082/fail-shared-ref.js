module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Fleet Charging Network", version: "2.1.0" },
  servers: { $ref: "#/components/x-server-catalog/active" },
  channels: {
    "charging/stations/{stationId}/sessions": {
      parameters: { stationId: { description: "Charging station identifier.", schema: { type: "string" } } },
      servers: ["eventstreams", "kafka", "production"],
      publish: { operationId: "publishSession", message: { name: "sessionStarted", payload: { type: "object" } } },
    },
  },
  components: {
    servers: {
      eventStreamsPro: { url: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure" },
      onPremKafka: { url: "kafka.quality.es:9092", protocol: "kafka" },
      production: { url: "kafka-pro.quality.es:9093", protocol: "kafka-secure" },
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
        Kafka: { url: "kafka-legacy.quality.es:9092", protocol: "kafka" },
      },
      loop: { $ref: "#/components/x-server-catalog/loop" },
      retired: { mqtt: { url: "mqtt.quality.es:1883", protocol: "mqtt" } },
    },
  },
};
