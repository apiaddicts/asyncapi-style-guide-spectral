module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Fleet Tracking Events",
    version: "2.0.0",
    description: "Vehicle positions and maintenance alerts shared through reusable server definitions.",
  },
  servers: {
    primary: { $ref: "#/components/servers/kafkaPlain" },
    secondary: { $ref: "#/components/servers/kafkaPlain" },
    chained: { $ref: "#/components/servers/hop" },
    secureShared: { $ref: "#/components/servers/kafkaTls" },
    dangling: { $ref: "#/components/servers/missing" },
    inline: { host: "fleet.quality.es", pathname: "/live", protocol: "wss" },
  },
  channels: {
    vehiclePosition: {
      address: "fleet.vehicle-position.v1",
      servers: [{ $ref: "#/servers/primary" }, { $ref: "#/servers/secureShared" }],
      messages: {
        vehiclePosition: {
          name: "vehiclePosition",
          payload: {
            type: "object",
            properties: { plate: { type: "string" }, speed: { type: ["number", "null"] } },
          },
        },
      },
    },
  },
  operations: {
    onVehiclePosition: {
      action: "receive",
      channel: { $ref: "#/channels/vehiclePosition" },
      messages: [{ $ref: "#/channels/vehiclePosition/messages/vehiclePosition" }],
    },
  },
  components: {
    servers: {
      kafkaPlain: { host: "broker-internal.quality.es:9092", protocol: "kafka" },
      hop: { $ref: "#/components/servers/mqttPlain" },
      mqttPlain: { host: "mqtt.quality.es:1883", protocol: "mqtt" },
      kafkaTls: { host: "broker.quality.es:9093", protocol: "kafka-secure" },
      unusedHttp: { host: "unused.quality.es", protocol: "http" },
    },
  },
};
