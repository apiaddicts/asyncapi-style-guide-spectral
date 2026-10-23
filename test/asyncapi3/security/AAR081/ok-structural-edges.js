module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Grid Structural Edges", version: "1.0.0", description: "Names the rule must not read.", "x-server": "kafka prod" },
  "x-servers": { "kafka.prod": { host: "kafka.quality.es", protocol: "kafka" }, "eu west": {} },
  servers: {
    kafka: { host: "kafka.quality.es:9092", pathname: "/eu west/kafka.prod", protocol: "kafka", "x-names": { "kafka.prod": "eu west" }, variables: { "env.name": { default: "pro" } } },
    eventstreams: {
      host: "es.quality.es:443",
      protocol: "kafka-secure",
      security: [{ $ref: "#/components/securitySchemes/sasl.scram" }],
      bindings: { kafka: { schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
      tags: [{ name: "kafka prod" }],
      externalDocs: { url: "https://docs.example.org/eu west" },
    },
  },
  channels: {
    "grid.frequency": {
      address: "grid/{zone}/frequency",
      servers: [{ $ref: "#/servers/kafka" }, { $ref: "#/components/servers/dr.kafka" }, { $ref: "#/x-servers/kafka.prod" }],
      parameters: { zone: { enum: ["eu west", "es.north"], default: "es.north" } },
      messages: {
        "frequency.measured": {
          payload: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: "object", properties: { "kafka.prod": { type: "number" } } } },
        },
      },
    },
    nullAddress: { address: null, servers: [{ $ref: "#/servers/eventstreams" }] },
  },
  operations: {
    "send.frequency": { action: "send", channel: { $ref: "#/channels/grid.frequency" }, servers: { "kafka prod": {} } },
    requestCurtailment: { action: "send", channel: { $ref: "#/channels/nullAddress" }, reply: { address: { location: "$message.header#/eu west" } } },
  },
  components: {
    servers: { "dr.kafka": { host: "kafka-dr.quality.es", protocol: "kafka" }, "archive store": null, "subestación": "scalar" },
    channels: { "mirror.channel": { address: "mirror", servers: [{ $ref: "#/components/servers/dr.kafka" }] } },
    operations: { "mirror.op": { action: "receive", channel: { $ref: "#/components/channels/mirror.channel" } } },
    serverBindings: { "kafka.prod": { kafka: { bindingVersion: "0.5.0" } } },
    securitySchemes: { "sasl.scram": { type: "scramSha512" } },
    "x-servers": { "kafka.prod": { host: "kafka.quality.es", protocol: "kafka" } },
  },
};
