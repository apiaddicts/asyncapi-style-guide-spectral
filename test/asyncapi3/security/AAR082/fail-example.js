module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Quality Logistics Tracking Events",
    version: "3.0.0",
    description: "Shipment tracking events spread across several brokers and environments.",
  },
  servers: {
    eventstreams: { host: "es-kafka-bootstrap-eventstreams.apps-pro.quality.es:443", protocol: "kafka-secure", title: "IBM Event Streams" },
    kafka: { host: "kafka.quality.es:9092", protocol: "kafka", title: "On-premises Kafka" },
    production: { host: "kafka-pro.quality.es:9093", protocol: "kafka-secure", description: "Production brokers." },
    staging: { host: "kafka-pre.quality.es:9093", protocol: "kafka-secure" },
    Kafka: { host: "kafka-legacy.quality.es:9092", protocol: "kafka" },
    EventStreams: { host: "es-legacy.quality.es:443", protocol: "kafka-secure" },
    "event-streams": { host: "es-dr.quality.es:443", protocol: "kafka-secure" },
    "kafka-secure": { host: "kafka-tls.quality.es:9093", protocol: "kafka-secure" },
    "kafka-dev": { host: "kafka-{env}.quality.es:9092", protocol: "kafka", variables: { env: { enum: ["dev", "int"], default: "dev" } } },
    mqttTelemetry: { host: "mqtt.quality.es:8883", pathname: "/telemetry", protocol: "secure-mqtt" },
    rabbitmq: { host: "rabbit.quality.es:5671", pathname: "/tracking", protocol: "amqps" },
    "x-legacy": { host: "legacy.quality.es:9092", protocol: "kafka" },
    "": { host: "unnamed.quality.es:9092", protocol: "kafka" },
    "kafka ": { host: "kafka-padded.quality.es:9092", protocol: "kafka" },
    "dr kafka": { $ref: "#/components/servers/drKafka" },
    nullServer: null,
    "2": { host: "kafka-2.quality.es:9092", protocol: "kafka" },
  },
  channels: {
    shipmentDispatched: {
      address: "logistics.cdc.shipment.dispatched.v1",
      servers: [{ $ref: "#/servers/eventstreams" }, { $ref: "#/servers/production" }, { $ref: "#/servers/Kafka" }],
      messages: {
        shipmentDispatched: {
          name: "shipmentDispatched",
          contentType: "application/json",
          payload: { type: "object", properties: { shipmentId: { type: "string" }, warehouse: { type: ["string", "null"] } } },
        },
      },
    },
    position: {
      address: "logistics/{vehicleId}/position",
      servers: [{ $ref: "#/servers/mqttTelemetry" }],
      parameters: { vehicleId: { description: "Vehicle identifier." } },
      messages: { position: { $ref: "#/components/messages/Position" } },
    },
  },
  operations: {
    publishShipmentDispatched: { action: "send", channel: { $ref: "#/channels/shipmentDispatched" } },
    receivePosition: { action: "receive", channel: { $ref: "#/channels/position" } },
  },
  components: {
    servers: {
      drKafka: { host: "kafka-dr.quality.es:9092", protocol: "kafka" },
      production: { host: "kafka-pro.quality.es:9093", protocol: "kafka-secure" },
      "x-mirror": { host: "mirror.quality.es:9092", protocol: "kafka" },
    },
    messages: {
      Position: { name: "position", payload: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" } } } },
    },
  },
};
