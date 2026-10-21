module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Fleet Tracking Events",
    version: "1.8.0",
    description: "Vehicle positions and maintenance alerts shared through reusable server definitions.",
  },
  servers: {
    primary: { $ref: "#/components/servers/kafkaPlain" },
    secondary: { $ref: "#/components/servers/kafkaPlain" },
    chained: { $ref: "#/components/servers/hop" },
    secureShared: { $ref: "#/components/servers/kafkaTls" },
    dangling: { $ref: "#/components/servers/missing" },
    inline: { url: "wss://fleet.quality.es/live", protocol: "wss" },
  },
  channels: {
    "fleet.vehicle-position.v1": {
      description: "GPS position of every vehicle.",
      servers: ["primary", "secureShared"],
      subscribe: {
        operationId: "onVehiclePosition",
        message: {
          name: "vehiclePosition",
          payload: {
            type: "object",
            properties: { plate: { type: "string" }, speed: { type: ["number", "null"] } },
          },
        },
      },
    },
  },
  components: {
    servers: {
      kafkaPlain: { url: "broker-internal.quality.es:9092", protocol: "kafka" },
      hop: { $ref: "#/components/servers/mqttPlain" },
      mqttPlain: { url: "mqtt.quality.es:1883", protocol: "mqtt" },
      kafkaTls: { url: "broker.quality.es:9093", protocol: "kafka-secure" },
      unusedHttp: { url: "http://unused.quality.es", protocol: "http" },
    },
  },
};
