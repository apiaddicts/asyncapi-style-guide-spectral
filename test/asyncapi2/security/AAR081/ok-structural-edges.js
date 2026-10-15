module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Energy Structural Edges", version: "1.0.0", description: "Names the rule must not read.", "x-server": "kafka prod" },
  "x-servers": { "kafka.prod": { url: "kafka.quality.es", protocol: "kafka" }, "eu west": {} },
  servers: {
    kafka: { url: "kafka.quality.es:9092", protocol: "kafka", "x-names": { "kafka.prod": "eu west" }, variables: { "env.name": { default: "pro" } } },
    eventstreams: {
      url: "es.quality.es:443",
      protocol: "kafka-secure",
      security: [{ "sasl.scram": [] }],
      bindings: { kafka: { "schema.registry": "x", bindingVersion: "0.4.0" }, "ibm mq": {} },
      tags: [{ name: "kafka prod" }],
    },
  },
  channels: {
    "grid/{zone}/frequency": {
      servers: ["kafka prod", "eu/west", "kafka.prod", ""],
      parameters: { zone: { schema: { type: "string", enum: ["eu west", "es.north"] } } },
      bindings: { ws: { query: { type: "object", properties: { "server name": { type: "string" } } } } },
      subscribe: {
        operationId: "receiveFrequency",
        message: {
          oneOf: [
            { name: "frequencyMeasured", payload: { type: "object", properties: { "kafka.prod": { type: "number" } } } },
            { name: "frequencyAvro", schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: { type: "record", name: "Frequency", fields: [{ name: "eu_west", type: ["null", "double"] }] } },
          ],
        },
      },
    },
  },
  operations: { "send.frequency": { action: "send", servers: { "kafka prod": {} } } },
  components: {
    servers: { "dr.kafka": { url: "kafka-dr.quality.es", protocol: "kafka" }, "archive store": null, "españa": "scalar" },
    channels: { "mirror.channel": { servers: ["kafka prod"] } },
    serverBindings: { "kafka.prod": { kafka: { bindingVersion: "0.4.0" } } },
    messages: { "server.moved": { payload: { type: "object", properties: { "eu west": { type: "string" } } }, examples: [{ payload: { "eu west": "kafka.prod" } }] } },
    "x-servers": { "kafka.prod": { url: "kafka.quality.es", protocol: "kafka" } },
  },
};
