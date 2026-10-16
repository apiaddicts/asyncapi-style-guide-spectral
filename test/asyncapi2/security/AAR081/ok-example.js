module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:energy:trading",
  info: {
    title: "Quality Energy Trading Events",
    version: "3.2.0",
    description: "Bids, market clearing prices, meter readings and settlement statements of the energy trading desk.",
  },
  defaultContentType: "application/json",
  servers: {
    eventstreams: { url: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure", description: "IBM Event Streams cluster." },
    kafka: { url: "kafka.partner.example.org:9092", protocol: "kafka", description: "Hosts are not this rule's concern." },
    production: { url: "{env}.quality.es:9093", protocol: "kafka-secure", variables: { env: { enum: ["kafka.pro", "kafka.dr"] } } },
    kafkaProd: { url: "localhost:9092", protocol: "kafka" },
    "kafka-secure-eu-west-1": { url: "kafka-euw.quality.es:9093", protocol: "kafka-secure" },
    mqtt_meters: { url: "mqtts://10.20.0.15:8883", protocol: "secure-mqtt" },
    AMQP_SETTLEMENTS: { url: "amqps://rabbit.quality.es:5671", protocol: "amqps" },
    "x-legacy": { url: "legacy.quality.es", protocol: "kafka", "x-server-name": "legacy.kafka" },
    "-": { url: "dash.quality.es", protocol: "kafka" },
    _: { url: "underscore.quality.es", protocol: "kafka" },
    "01": { url: "first.quality.es", protocol: "kafka" },
    drKafka: { $ref: "#/components/servers/dr.kafka" },
    partnerKafka: { $ref: "./partner-servers.yaml#/servers/partner.kafka" },
    constructor: { url: "constructor.quality.es", protocol: "kafka" },
  },
  channels: {
    "energy.cdc.bids.submitted.v3": {
      servers: ["eventstreams", "kafka", "dr.kafka", "partner kafka"],
      subscribe: {
        operationId: "receiveBidSubmitted",
        message: {
          name: "bidSubmitted",
          payload: { type: "object", properties: { "server.name": { type: "string", default: "kafka prod" }, "market/zone": { type: "string" } } },
          examples: [{ name: "spain", payload: { "server.name": "eu west", "market/zone": "ES" } }],
        },
      },
    },
    "meters/{meterId}/readings": {
      parameters: { meterId: { schema: { type: "string", enum: ["meter.01", "meter 02"] } } },
      servers: ["mqtt_meters"],
      publish: { operationId: "publishReading", message: { name: "readingTaken", payload: { type: "object" } } },
    },
  },
  components: {
    servers: {
      "dr.kafka": { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure", description: "Component ids may contain dots." },
      "archive.store": { url: "archive.quality.es", protocol: "kafka" },
    },
    serverVariables: { "env.name": { enum: ["pro", "pre"] } },
    schemas: { "Bid.v3": { type: "object", properties: { "eu west": { type: "string" } } } },
    securitySchemes: { "sasl.scram": { type: "scramSha512" } },
  },
  "x-servers": { "kafka prod": { url: "kafka.quality.es", protocol: "kafka" } },
};
