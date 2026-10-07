module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Metro Vehicle Positions", version: "5.2.0" },
  servers: {
    kafkaProd: { host: "kafka.metro.io:9093", protocol: "kafka-secure", bindings: { kafka: {}, confluent: { cluster: "lkc-71ab" } } },
    mqttEdge: { host: "edge.metro.io:8883", protocol: "secure-mqtt", bindings: { mqtt: {}, MQTT: {} } },
    robotFleet: { host: "dds.metro.io", protocol: "ros2", bindings: { ros2: {}, dds: { domainId: 7 } } },
  },
  channels: {
    vehiclePositions: {
      address: "metro.cdc.vehicles.positions.v1",
      bindings: { kafka: { partitions: 24 }, "kafka-ssl": {} },
      messages: {
        positionReported: { $ref: "#/components/messages/positionReported" },
        positionCorrected: {
          name: "positionCorrected",
          bindings: { kafka: { key: { type: "string" } }, bindingVersion: "0.5.0" },
          traits: [
            { $ref: "#/components/messageTraits/commonHeaders" },
            { bindings: { kafak: {} } },
            [{ bindings: { websocket: {} } }, { bindings: { ignored: {} } }],
            [{ $ref: "#/components/messageTraits/commonHeaders" }, { bindings: { ignoredToo: {} } }],
          ],
        },
      },
    },
    serviceAlerts: {
      address: null,
      bindings: { amqp: {}, rabbitmq: { vhost: "/" } },
      messages: {
        alertRaised: { name: "alertRaised", bindings: { amqp: {}, amqps: {} } },
        alertCleared: { name: "alertCleared", bindings: { Amqp: {} } },
      },
    },
    vehicleTelemetry: {
      address: "metro/vehicles/{vehicleId}/telemetry",
      parameters: { vehicleId: { description: "Vehicle identifier." } },
      bindings: { ws: {}, websockets: {} },
      messages: { telemetry: { name: "telemetry", bindings: { mqtt: {}, mqtts: {} } } },
    },
  },
  operations: {
    publishPosition: {
      action: "send",
      channel: { $ref: "#/channels/vehiclePositions" },
      messages: [{ $ref: "#/channels/vehiclePositions/messages/positionReported" }],
      bindings: { kafka: { clientId: { type: "string" } }, groupId: { type: "string" } },
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { bindings: { "ibm-mq": {} } }],
    },
    receiveTelemetry: {
      action: "receive",
      channel: { $ref: "#/channels/vehicleTelemetry" },
      bindings: { mqtt: { qos: 1 }, ros: {} },
      reply: { channel: { $ref: "#/channels/serviceAlerts" }, messages: [{ $ref: "#/channels/serviceAlerts/messages/alertRaised" }] },
    },
  },
  components: {
    servers: { drKafka: { host: "kafka-dr.metro.io:9093", protocol: "kafka", bindings: { kafka: {}, "kafka.v2": {} } } },
    channels: {
      auditTrail: {
        address: "metro.sys.audit.v1",
        bindings: { kinesis: {} },
        messages: { auditLine: { name: "auditLine", bindings: { sns: {}, servicebus: {} } } },
      },
    },
    operations: {
      writeAudit: {
        action: "send",
        channel: { $ref: "#/components/channels/auditTrail" },
        bindings: { sqs: {}, eventbridge: {} },
        traits: [{ bindings: { pubsub: {} } }],
      },
    },
    messages: { positionReported: { name: "positionReported", bindings: { kafka: {}, grpc: {} } } },
    messageTraits: { commonHeaders: { headers: { type: "object" }, bindings: { kafka: {}, "X-internal": {} } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: {}, confluent: {} } } },
    serverBindings: { registry: { kafka: {}, schemaRegistryUrl: "https://registry.metro.io" } },
    channelBindings: { compacted: { kafka: {}, kafka_ssl: {} } },
    operationBindings: { durable: { amqp: {}, rabbit: {} } },
    messageBindings: { keyed: { kafka: {}, key: { type: "string" } } },
  },
};
