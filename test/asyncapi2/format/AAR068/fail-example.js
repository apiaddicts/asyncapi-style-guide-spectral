const P = "harborline.cmd.containers.gate-in.v2";

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Harborline Container Gate", version: "2.4.0" },
  servers: {
    kafkaProd: {
      url: "kafka.harborline.io:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.harborline.io" }, confluent: { cluster: "lkc-01" } },
    },
    rabbitProd: { url: "amqps://rabbit.harborline.io", protocol: "amqps", bindings: { rabbitmq: { vhost: "/" }, amqp: {} } },
    mqttEdge: { url: "mqtts://edge.harborline.io:8883", protocol: "secure-mqtt", bindings: { mqtt: { clientId: "gate" }, MQTT5: {} } },
  },
  channels: {
    [P]: {
      description: "Containers entering the terminal.",
      bindings: { kafka: { topic: P, partitions: 12 }, "kafka-ssl": { partitions: 12 } },
      publish: {
        operationId: "publishGateIn",
        bindings: { kafka: { groupId: { type: "string" } }, bindingVersion: "0.4.0" },
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { bindings: { kafak: { clientId: { type: "string" } } } }],
        message: {
          name: "gateIn",
          contentType: "application/json",
          bindings: { kafka: { key: { type: "string" } }, Kafka: { key: { type: "string" } } },
          traits: [
            { $ref: "#/components/messageTraits/commonHeaders" },
            { bindings: { websocket: {} } },
            [{ bindings: { amqps: {} } }, { bindings: { nonsense: {} } }],
          ],
        },
      },
      subscribe: {
        operationId: "receiveGateIn",
        bindings: { amqp: { ack: true }, "ibm-mq": {} },
        message: {
          oneOf: [
            { $ref: "#/components/messages/containerInspected" },
            { name: "gateInAccepted", bindings: { kafka: {}, pubsub: {} } },
            { name: "gateInRejected", bindings: { https: { headers: { type: "object" } } } },
          ],
        },
      },
    },
    "harborline/telemetry/{craneId}": {
      parameters: { craneId: { description: "Crane identifier.", schema: { type: "string" } } },
      bindings: { ws: { method: "GET" }, websockets: { query: {} } },
      subscribe: {
        bindings: { mqtt: { qos: 1 }, mqtts: { qos: 2 } },
        message: { name: "craneTelemetry", bindings: { mqtt: {} } },
      },
    },
  },
  components: {
    servers: { drKafka: { url: "kafka-dr.harborline.io:9093", protocol: "kafka", bindings: { kafka: {}, "kafka.v2": {} } } },
    channels: {
      auditTrail: {
        bindings: { kinesis: {} },
        publish: { bindings: { sqs: {}, eventbridge: {} }, message: { name: "auditLine", bindings: { sns: {}, servicebus: {} } } },
      },
    },
    messages: {
      containerInspected: { name: "containerInspected", bindings: { kafka: {}, grpc: {} } },
      gateEvents: { oneOf: [{ name: "gateOpened", bindings: { kafka: {} } }, { name: "gateClosed", bindings: { sse: {} } }] },
    },
    messageTraits: { commonHeaders: { headers: { type: "object" }, bindings: { kafka: {}, "X-internal": {} } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" } }, confluent: {} } } },
    serverBindings: { registry: { kafka: {}, schemaRegistryUrl: "https://registry.harborline.io" } },
    channelBindings: { compacted: { kafka: {}, kafka_ssl: {} } },
    operationBindings: { durable: { amqp: {}, rabbit: {} } },
    messageBindings: { keyed: { kafka: {}, groupId: "gate-readers" } },
  },
};
