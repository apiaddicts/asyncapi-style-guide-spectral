module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:energy:market-gateway",
  info: {
    title: "Quality Energy Market Gateway",
    version: "1.8.0",
    description: "Market operator feeds, grid operator signals and balancing responsible party messages.",
  },
  defaultContentType: "application/json",
  servers: {
    kafka: { url: "kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant name." },
    "kafka.quality.es": { url: "kafka.quality.es:9093", protocol: "kafka-secure", description: "The host used as the name." },
    "kafka prod": { url: "kafka-pro.quality.es:9093", protocol: "kafka-secure" },
    "market/omie": { url: "omie.example.org:9092", protocol: "kafka" },
    "grid~ree": { url: "ree.example.org:9092", protocol: "kafka" },
    "mqtt:1883": { url: "mqtt.quality.es:1883", protocol: "mqtt" },
    "kafka,eventstreams": { url: "kafka.quality.es:9092", protocol: "kafka" },
    "{environment}": { url: "{environment}.quality.es", protocol: "kafka", variables: { environment: { enum: ["pro"] } } },
    "españa": { url: "es.quality.es", protocol: "kafka" },
    "kafka ": { url: "trailing.quality.es", protocol: "kafka" },
    "": { url: "empty.quality.es", protocol: "kafka" },
    "x-legacy.eu": { url: "legacy.quality.es", protocol: "kafka" },
    "settlements@bank": { url: "amqps://bank.example.org:5671", protocol: "amqps" },
    "1.5": { url: "float.quality.es", protocol: "kafka" },
    "dr.kafka": { $ref: "#/components/servers/drKafka" },
    "null server": null,
    "scalar server": "kafka.quality.es:9092",
  },
  channels: {
    "energy.cdc.prices.cleared.v1": {
      servers: ["kafka", "kafka prod", "dr.kafka"],
      subscribe: { operationId: "receiveClearedPrice", message: { name: "priceCleared", payload: { type: "object" } } },
    },
  },
  components: {
    servers: { drKafka: { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure" }, "archive.store": { url: "archive.quality.es", protocol: "kafka" } },
  },
};
