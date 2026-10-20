const channel = (name) => ({ $ref: `#/channels/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const bindings = (name) => ({ $ref: `#/components/operationBindings/${name}` });
const op = (action, extra = {}) => ({ action, channel: channel("payments"), summary: `${action} payment events.`, ...extra });

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Payments Gateway", version: "3.1.0", description: "Payment events of the card and wallet gateway." },
  servers: {
    production: {
      host: "kafka.payments.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    terminals: { host: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt" },
  },
  channels: {
    payments: {
      address: "payments.cdc.payments.v1",
      servers: [{ $ref: "#/servers/production" }],
      messages: { payment: { $ref: "#/components/messages/payment" } },
      bindings: { kafka: { topic: "payments.cdc.payments.v1", partitions: 6 } },
    },
    paymentReplies: { address: null, messages: { paymentAccepted: { $ref: "#/components/messages/payment" } }, bindings: { kafka: {} } },
  },
  operations: {
    sendComplete: op("send", { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } }),
    receiveComplete: op("receive", { traits: [trait("kafkaConsumer")] }),
    noBindings: op("send"),
    emptyBindings: op("receive", { bindings: {} }),
    nullBindings: op("send", { bindings: null }),
    amqpOnly: op("receive", { bindings: { amqp: { ack: true, bindingVersion: "0.3.0" } } }),
    mqttAndHttp: op("send", { bindings: { mqtt: { qos: 1 }, http: { method: "POST" } } }),
    upperCase: op("receive", { bindings: { Kafka: {}, KAFKA: {} } }),
    extension: op("send", { bindings: { "x-kafka": {} } }),
    kafkaSecure: op("receive", { bindings: { "kafka-secure": {} } }),
    nullKafka: op("send", { bindings: { kafka: null } }),
    stringKafka: op("receive", { bindings: { kafka: "enabled" } }),
    listKafka: op("send", { bindings: { kafka: [{ groupId: { type: "string" } }] } }),
    numberKafka: op("receive", { bindings: { kafka: 1 } }),
    danglingKafka: op("send", { bindings: { kafka: { $ref: "#/components/x-kafka/retired" } } }),
    channelOnly: op("receive"),
    messageOnly: op("send", { messages: [{ name: "payment", bindings: { kafka: { key: { type: "string" } } } }] }),
    messageTraitOnly: op("receive", { messages: [{ name: "payment", traits: [{ $ref: "#/components/messageTraits/kafkaKey" }] }] }),
    replyOnly: op("send", { reply: { address: { location: "$message.header#/replyTo" }, channel: channel("paymentReplies"), bindings: { kafka: {} } } }),
    sharedNoKafka: op("receive", { bindings: bindings("amqpOnly") }),
    sharedNullKafka: op("send", { bindings: bindings("nullKafka") }),
    danglingBindings: op("receive", { bindings: bindings("retired") }),
    traitNoKafka: op("send", { traits: [trait("amqpOnly"), trait("observability")] }),
    traitNullKafka: op("receive", { traits: [trait("nullKafka")] }),
    ownWins: op("send", { bindings: { kafka: "off" }, traits: [{ bindings: { kafka: {} } }] }),
    emptyOperation: {},
    nullOperation: null,
    stringOperation: "receivePayment",
    listOperation: [op("send", { bindings: { kafka: {} } })],
    v2Style: { operationId: "receivePayment", summary: "Receive payments.", message: { $ref: "#/components/messages/payment" }, subscribe: { bindings: { kafka: {} } } },
    "x-partner": op("send"),
    "terminals/payments": op("receive", { bindings: { mqtt: { qos: 2, bindingVersion: "0.2.0" } } }),
  },
  components: {
    operations: {
      refundsShared: op("send"),
      archiveShared: op("receive", { bindings: {} }),
      archiveFine: op("send", { bindings: { kafka: {} } }),
      nullShared: null,
    },
    operationBindings: { amqpOnly: { amqp: { ack: false } }, nullKafka: { kafka: null } },
    operationTraits: {
      kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["payments"] }, bindingVersion: "0.5.0" } } },
      amqpOnly: { bindings: { amqp: { ack: true } } },
      observability: { description: "Traced operation." },
      nullKafka: { bindings: { kafka: null } },
    },
    messageTraits: { kafkaKey: { bindings: { kafka: { key: { type: "string" } } } } },
    messages: {
      payment: {
        name: "payment",
        contentType: "application/vnd.apache.avro+json",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "Payment", fields: [{ name: "paymentId", type: "string" }, { name: "wallet", type: ["null", "string"], default: null }] },
        },
      },
    },
  },
};
