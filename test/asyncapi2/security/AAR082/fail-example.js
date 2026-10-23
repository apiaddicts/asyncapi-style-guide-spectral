module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Quality Logistics Tracking Events",
    version: "2.8.1",
    description: "Shipment tracking events spread across several brokers and environments.",
  },
  servers: {
    eventstreams: { url: "es-kafka-bootstrap-eventstreams.apps-pro.quality.es:443", protocol: "kafka-secure", description: "IBM Event Streams." },
    kafka: { url: "kafka.quality.es:9092", protocol: "kafka", description: "On-premises Kafka." },
    production: { url: "kafka-pro.quality.es:9093", protocol: "kafka-secure", description: "Production brokers." },
    staging: { url: "kafka-pre.quality.es:9093", protocol: "kafka-secure" },
    Kafka: { url: "kafka-legacy.quality.es:9092", protocol: "kafka" },
    EventStreams: { url: "es-legacy.quality.es:443", protocol: "kafka-secure" },
    "event-streams": { url: "es-dr.quality.es:443", protocol: "kafka-secure" },
    "kafka-secure": { url: "kafka-tls.quality.es:9093", protocol: "kafka-secure" },
    "kafka-dev": { url: "kafka-{env}.quality.es:9092", protocol: "kafka", variables: { env: { enum: ["dev", "int"], default: "dev" } } },
    eventstreams_pre: { url: "es-kafka-bootstrap-eventstreams.apps-pre.quality.es:443", protocol: "kafka-secure" },
    kafkapro: { url: "kafka-pro.quality.es:9092", protocol: "kafka" },
    "kafka.pro": { url: "kafka-pro.quality.es:9092", protocol: "kafka" },
    "pro-kafka": { url: "kafka-pro.quality.es:9092", protocol: "kafka" },
    "Kafka-pro": { url: "kafka-pro.quality.es:9092", protocol: "kafka" },
    mqttTelemetry: { url: "mqtts://mqtt.quality.es:8883", protocol: "secure-mqtt", description: "Vehicle telemetry." },
    rabbitmq: { url: "amqps://rabbit.quality.es:5671/%2Ftracking", protocol: "amqps" },
    "x-legacy": { url: "legacy.quality.es:9092", protocol: "kafka" },
    "": { url: "unnamed.quality.es:9092", protocol: "kafka" },
    "kafka ": { url: "kafka-padded.quality.es:9092", protocol: "kafka" },
    "dr kafka": { $ref: "#/components/servers/drKafka" },
    nullServer: null,
    "2": { url: "kafka-2.quality.es:9092", protocol: "kafka" },
  },
  channels: {
    "logistics.cdc.shipment.dispatched.v1": {
      description: "Shipment dispatched from a warehouse.",
      servers: ["eventstreams", "production", "Kafka"],
      publish: {
        operationId: "publishShipmentDispatched",
        message: {
          name: "shipmentDispatched",
          contentType: "application/json",
          payload: { type: "object", properties: { shipmentId: { type: "string" }, warehouse: { type: ["string", "null"] } } },
        },
      },
    },
    "logistics/{vehicleId}/position": {
      servers: ["mqttTelemetry"],
      parameters: { vehicleId: { schema: { type: "string" } } },
      subscribe: { operationId: "receivePosition", message: { $ref: "#/components/messages/Position" } },
    },
  },
  components: {
    servers: {
      drKafka: { url: "kafka-dr.quality.es:9092", protocol: "kafka" },
      production: { url: "kafka-pro.quality.es:9093", protocol: "kafka-secure" },
      "x-mirror": { url: "mirror.quality.es:9092", protocol: "kafka" },
    },
    messages: {
      Position: { name: "position", payload: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" } } } },
    },
  },
};
