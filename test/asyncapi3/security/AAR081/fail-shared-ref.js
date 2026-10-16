module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Grid Server Catalog", version: "3.0.0", description: "Root servers map bundled from a shared catalog." },
  servers: { $ref: "#/components/x-server-catalog/active" },
  channels: {
    flexibility: {
      address: "grid.cdc.flexibility.offered.v1",
      servers: [{ $ref: "#/components/x-server-catalog/eu~1west~0primary/kafka" }],
      messages: { offered: { name: "flexibilityOffered", payload: { type: "object" } } },
    },
  },
  operations: { publishFlexibility: { action: "send", channel: { $ref: "#/channels/flexibility" } } },
  components: {
    servers: { drKafka: { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure" } },
    "x-server-catalog": {
      active: { $ref: "#/components/x-server-catalog/eu~1west~0primary" },
      "eu/west~primary": {
        kafka: { $ref: "#/components/servers/drKafka" },
        "kafka.prod": { $ref: "#/components/servers/drKafka" },
        "grid operator": { host: "ree.example.org:9092", protocol: "kafka" },
        "x-dr/eu": { $ref: "#/components/servers/doesNotExist" },
        partner: { $ref: "./partner-servers.yaml#/components/servers/kafka" },
        "cyclic~loop": { $ref: "#/components/x-server-catalog/loop" },
        Kafka_Legacy: { host: "kafka-legacy.quality.es:9092", protocol: "kafka" },
        "omie~150": { host: "omie.quality.es", protocol: "kafka" },
      },
      loop: { $ref: "#/components/x-server-catalog/loop" },
      retired: { "staging eu": { host: "kafka-pre.quality.es:9093", protocol: "kafka-secure" } },
    },
  },
};
