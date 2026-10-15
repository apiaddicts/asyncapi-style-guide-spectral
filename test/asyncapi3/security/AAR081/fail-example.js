module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:energy",
  info: {
    title: "Quality Smart Grid Telemetry",
    version: "2.4.0",
    description: "Substation telemetry, outage alarms and dispatch commands.",
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: { host: "kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant production cluster." },
    partnerKafka: { host: "kafka.grid-partner.com:9092", protocol: "kafka", description: "Utility partner cluster." },
    localKafka: { host: "localhost:9092", protocol: "kafka" },
    substationMqtt: { host: "10.20.0.15:1883", protocol: "mqtt", pathname: "/substations" },
    regionalKafka: { host: "eu.kafka.quality.es:9093", protocol: "kafka-secure" },
    dispatchAmqp: { host: "RABBIT.QUALITY.ES:5671", protocol: "amqps" },
    controlRoomWs: { host: "quality.es.cdn-edge.net", pathname: "/control", protocol: "wss" },
    bootstrapList: { host: "broker-0.quality.es:9093,broker-1.quality.es:9093,10.0.4.21:9093", protocol: "kafka-secure" },
    schemeInHost: { host: "mqtts://mqtt.grid-partner.com:8883", protocol: "secure-mqtt" },
    hostVariable: {
      host: "{host}",
      protocol: "kafka",
      variables: { host: { enum: ["kafka.quality.es:9092", "kafka.staging.internal:9092"], default: "kafka.quality.es:9092" } },
    },
    environmentDefault: {
      host: "{environment}.quality.es:{port}",
      protocol: "kafka",
      variables: { environment: { enum: ["kafka-dev", "kafka-pro"], default: "sandbox.local" }, port: { default: "9092" } },
    },
    tenantGateway: { host: "{tenant}.quality.es", protocol: "wss", variables: { tenant: { description: "Utility tenant." } } },
    sharedRegion: { host: "grid-{region}.quality.es", protocol: "kafka", variables: { region: { $ref: "#/components/serverVariables/region" } } },
    emptyHost: { host: "", pathname: "/grid", protocol: "wss" },
    numericHost: { host: 9092, protocol: "kafka" },
    trailingDot: { host: "kafka.quality.es.:9093", protocol: "kafka-secure" },
    underscoreHost: { host: "kafka_grid.quality.es:9093", protocol: "kafka-secure" },
    ipv6Broker: { host: "[fd00::12]:9092", protocol: "kafka" },
    "x-legacy": { host: "legacy-grid.example.org", protocol: "kafka", "x-host": "kafka.quality.es" },
    drKafka: { $ref: "#/components/servers/drKafka" },
    drKafkaMirror: { $ref: "#/components/servers/drKafka" },
  },
  channels: {
    substationTelemetry: {
      address: "grid.cdc.substations.telemetry.v4",
      servers: [{ $ref: "#/servers/kafkaProd" }, { $ref: "#/servers/partnerKafka" }, { $ref: "#/components/servers/drKafka" }],
      messages: { reading: { name: "reading", payload: { type: "object", properties: { host: { type: "string", default: "evil.example.org" } } } } },
    },
  },
  operations: {
    receiveTelemetry: { action: "receive", channel: { $ref: "#/channels/substationTelemetry" } },
  },
  components: {
    servers: {
      drKafka: { host: "kafka-dr.grid.example.org:9093", protocol: "kafka-secure" },
      archive: { host: "archive.quality.es", protocol: "kafka" },
      sandbox: { host: "sandbox.quality.es.test:9092", protocol: "kafka" },
    },
    serverVariables: { region: { enum: ["eu", "us", "eu.west"], default: "eu" } },
  },
};
