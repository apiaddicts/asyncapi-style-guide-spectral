module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:manufacturing:plant-floor",
  info: {
    title: "Quality Smart Factory Plant Floor",
    version: "1.6.0",
    description: "Machine telemetry, quality inspections and work orders exchanged between the MES, the PLC gateways and the ERP.",
  },
  defaultContentType: "application/json",
  servers: {
    plantKafka: { host: "kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant production cluster." },
    confluentSsl: { host: "pkc-4nym6.eu-west-1.aws.confluent.cloud:9092", protocol: "kafka-ssl" },
    saslSsl: { host: "b-1.plant.c2.kafka.eu-west-1.amazonaws.com:9096", protocol: "SASL_SSL" },
    upperCaseKafka: { host: "kafka-dr.quality.es:9092", protocol: "KAFKA" },
    paddedMqtt: { host: "mqtt.quality.es:1883", protocol: "mqtt\t" },
    machineMqtts: { host: "mqtt.quality.es:8883", pathname: "/machines", protocol: "mqtts" },
    mqttV5: { host: "mqtt5.quality.es:1883", protocol: "mqtt-5" },
    mesRabbit: { host: "rabbit.quality.es:5672", protocol: "rabbitmq" },
    hmiSocketIo: { host: "hmi.quality.es", pathname: "/socket.io", protocol: "socket.io" },
    inspectionGrpc: { host: "inspection.quality.es:443", protocol: "grpc" },
    plcModbus: { host: "10.20.0.15:502", protocol: "modbus-tcp" },
    opcUa: { host: "opc.quality.es:4840", protocol: "opc.tcp" },
    erpMq: { host: "qm1.quality.es:1414", protocol: "ibm_mq" },
    eventGrid: { host: "plant.westeurope-1.eventgrid.azure.net", protocol: "eventgrid" },
    redisTls: { host: "cache.quality.es:6380", protocol: "rediss" },
    natsJetStream: { host: "nats.quality.es:4222", protocol: "jetstream" },
    placeholderProtocol: { host: "{host}", protocol: "${PROTOCOL}", variables: { host: { default: "kafka.quality.es:9092" } } },
    blankProtocol: { host: "kafka.quality.es:9092", protocol: "   " },
    booleanProtocol: { host: "kafka.quality.es:9092", protocol: true },
    arrayProtocol: { host: "kafka.quality.es:9092", protocol: ["kafka", "kafka-secure"] },
    refProtocol: { host: "kafka.quality.es:9092", protocol: { $ref: "#/components/x-protocols/kafka" } },
    "x-supplier": { host: "kafka.broker-supplier.example.org:9092", protocol: "PLAINTEXT" },
    supplierRef: { $ref: "#/components/servers/supplier" },
  },
  channels: {
    machineTelemetry: {
      address: "plant.cdc.machine-telemetry.recorded.v1",
      servers: [{ $ref: "#/servers/plantKafka" }, { $ref: "#/servers/confluentSsl" }, { $ref: "#/components/servers/supplier" }],
      messages: {
        telemetryRecorded: {
          name: "telemetryRecorded",
          payload: { type: "object", properties: { protocol: { type: "string", default: "kafka-ssl" } } },
        },
      },
    },
  },
  operations: {
    receiveTelemetry: {
      action: "receive",
      channel: { $ref: "#/channels/machineTelemetry" },
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/machineTelemetry" } },
    },
  },
  components: {
    servers: {
      supplier: { host: "kafka.supplier.example.org:9093", protocol: "Kafka-Secure", description: "Supplier cluster shared by reference." },
      legacyAmqp: { host: "amqp.quality.es:5671", protocol: "amqp091" },
      compliant: { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure" },
    },
    "x-protocols": { kafka: "kafka" },
  },
};
