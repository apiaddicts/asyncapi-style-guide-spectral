module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Energy Server Catalog", version: "2.0.0", description: "Root servers map bundled from a shared catalog." },
  servers: { $ref: "#/components/x-server-catalog/active" },
  channels: {
    "energy.cdc.meters.read.v1": {
      servers: ["kafka", "kafka.prod"],
      publish: { operationId: "publishMeterRead", message: { name: "meterRead", payload: { type: "object" } } },
    },
  },
  components: {
    servers: { drKafka: { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure" } },
    "x-server-catalog": {
      active: { $ref: "#/components/x-server-catalog/eu~1west~0primary" },
      "eu/west~primary": {
        kafka: { $ref: "#/components/servers/drKafka" },
        "kafka.prod": { $ref: "#/components/servers/drKafka" },
        "grid operator": { url: "ree.example.org:9092", protocol: "kafka" },
        "x-dr/eu": { $ref: "#/components/servers/doesNotExist" },
        partner: { $ref: "./partner-servers.yaml#/servers/kafka" },
        "cyclic~loop": { $ref: "#/components/x-server-catalog/loop" },
        Kafka_Legacy: { url: "kafka-legacy.quality.es:9092", protocol: "kafka" },
      },
      loop: { $ref: "#/components/x-server-catalog/loop" },
      retired: { "staging eu": { url: "kafka-pre.quality.es:9093", protocol: "kafka-secure" } },
    },
  },
};
