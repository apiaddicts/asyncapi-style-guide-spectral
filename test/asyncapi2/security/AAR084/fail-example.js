module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:ports:terminal-operations",
  info: {
    title: "Quality Port Terminal Operations",
    version: "2.8.0",
    description: "Container moves, crane telemetry, gate events and customs releases published by the terminal operating system.",
  },
  defaultContentType: "application/json",
  servers: {
    terminalKafka: { url: "kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant production cluster." },
    confluentSsl: { url: "pkc-4nym6.eu-west-1.aws.confluent.cloud:9092", protocol: "kafka-ssl", description: "Spring Boot style protocol name." },
    saslSsl: { url: "b-1.terminal.c2.kafka.eu-west-1.amazonaws.com:9096", protocol: "SASL_SSL" },
    upperCaseKafka: { url: "kafka-dr.quality.es:9092", protocol: "Kafka" },
    paddedKafka: { url: "kafka-lab.quality.es:9092", protocol: " kafka" },
    trailingSpace: { url: "kafka-lab.quality.es:9093", protocol: "kafka-secure " },
    craneMqtts: { url: "mqtt.quality.es:8883", protocol: "mqtts", protocolVersion: "5" },
    gateRabbit: { url: "rabbit.quality.es:5672", protocol: "rabbitmq" },
    gateAmqpSsl: { url: "rabbit.quality.es:5671", protocol: "amqp+ssl" },
    yardWebsocket: { url: "wss://yard.quality.es/live", protocol: "websocket" },
    customsGrpc: { url: "customs.quality.es:443", protocol: "grpc" },
    plcTcp: { url: "10.20.0.15:502", protocol: "tcp" },
    mainframeMq: { url: "qm1.quality.es:1414", protocol: "ibm-mq" },
    eventHubs: { url: "terminal.servicebus.windows.net:9093", protocol: "eventhubs" },
    kinesisStream: { url: "kinesis.eu-west-1.amazonaws.com", protocol: "kinesis" },
    placeholderProtocol: { url: "{host}:9092", protocol: "{protocol}", variables: { protocol: { enum: ["kafka", "kafka-secure"], default: "kafka" }, host: { default: "kafka.quality.es" } } },
    emptyProtocol: { url: "kafka.quality.es:9092", protocol: "" },
    numericProtocol: { url: "kafka.quality.es:9092", protocol: 9092 },
    objectProtocol: { url: "kafka.quality.es:9092", protocol: { name: "kafka", secure: true } },
    "x-partner": { url: "kafka.broker-partner.example.org:9092", protocol: "PLAINTEXT" },
    shippingLine: { $ref: "#/components/servers/shippingLine" },
  },
  channels: {
    "ports.cdc.containers.moved.v1": {
      servers: ["terminalKafka", "confluentSsl"],
      subscribe: {
        operationId: "receiveContainerMoved",
        message: { name: "containerMoved", payload: { type: "object", properties: { protocol: { type: "string", default: "kafka-ssl" } } } },
      },
    },
  },
  components: {
    servers: {
      shippingLine: { url: "events.shipping-line.example.org:5671", protocol: "AMQPS", description: "Partner broker referenced by servers.shippingLine." },
      legacyStomp: { url: "stomp.quality.es:61614", protocol: "stomp+ssl" },
      compliant: { url: "kafka-regional.quality.es:9093", protocol: "kafka-secure" },
    },
  },
};
