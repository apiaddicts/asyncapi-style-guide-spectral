const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const bindings = (name) => ({ $ref: `#/components/operationBindings/${name}` });
const op = (id, extra = {}) => ({ operationId: id, summary: `Operation ${id}.`, message: message("payment"), ...extra });

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Gateway", version: "3.1.0", description: "Payment events of the card and wallet gateway." },
  servers: {
    production: {
      url: "kafka.payments.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    terminals: { url: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt" },
  },
  channels: {
    "payments.cdc.complete.v1": {
      description: "Complete operations.",
      publish: op("publishComplete", { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } }),
      subscribe: op("receiveComplete", { traits: [trait("kafkaConsumer")] }),
    },
    "payments.cdc.noBindings.v1": { description: "No bindings.", publish: op("publishNoBindings") },
    "payments.cdc.emptyBindings.v1": { description: "Empty bindings.", subscribe: op("receiveEmptyBindings", { bindings: {} }) },
    "payments.cdc.nullBindings.v1": { description: "Null bindings.", publish: op("publishNullBindings", { bindings: null }) },
    "payments.cdc.amqpOnly.v1": { description: "AMQP only.", subscribe: op("receiveAmqpOnly", { bindings: { amqp: { ack: true, bindingVersion: "0.3.0" } } }) },
    "payments.cdc.mqttAndHttp.v1": { description: "MQTT and HTTP.", publish: op("publishMqttAndHttp", { bindings: { mqtt: { qos: 1 }, http: { method: "POST" } } }) },
    "payments.cdc.upperCase.v1": { description: "Upper case key.", subscribe: op("receiveUpperCase", { bindings: { Kafka: {}, KAFKA: {} } }) },
    "payments.cdc.extension.v1": { description: "Extension key.", publish: op("publishExtension", { bindings: { "x-kafka": {} } }) },
    "payments.cdc.kafkaSecure.v1": { description: "Protocol name as key.", subscribe: op("receiveKafkaSecure", { bindings: { "kafka-secure": {} } }) },
    "payments.cdc.nullKafka.v1": { description: "Null kafka binding.", publish: op("publishNullKafka", { bindings: { kafka: null } }) },
    "payments.cdc.stringKafka.v1": { description: "String kafka binding.", subscribe: op("receiveStringKafka", { bindings: { kafka: "enabled" } }) },
    "payments.cdc.listKafka.v1": { description: "List kafka binding.", publish: op("publishListKafka", { bindings: { kafka: [{ groupId: { type: "string" } }] } }) },
    "payments.cdc.trueKafka.v1": { description: "Boolean kafka binding.", subscribe: op("receiveTrueKafka", { bindings: { kafka: true } }) },
    "payments.cdc.danglingKafka.v1": { description: "Dangling kafka binding.", publish: op("publishDanglingKafka", { bindings: { kafka: { $ref: "#/components/x-kafka/retired" } } }) },
    "payments.cdc.channelOnly.v1": { description: "Kafka binding on the channel only.", bindings: { kafka: { topic: "payments.cdc.channelOnly.v1", partitions: 6 } }, subscribe: op("receiveChannelOnly") },
    "payments.cdc.messageOnly.v1": { description: "Kafka binding on the message only.", publish: { operationId: "publishMessageOnly", message: { name: "payment", bindings: { kafka: { key: { type: "string" } } } } } },
    "payments.cdc.messageTraitOnly.v1": { description: "Kafka binding on a message trait only.", subscribe: { operationId: "receiveMessageTraitOnly", message: { name: "payment", traits: [{ $ref: "#/components/messageTraits/kafkaKey" }] } } },
    "payments.cdc.serverOnly.v1": { description: "Kafka binding on the server only.", servers: ["production"], publish: op("publishServerOnly") },
    "payments.cdc.sharedNoKafka.v1": { description: "Shared bindings without kafka.", subscribe: op("receiveSharedNoKafka", { bindings: bindings("amqpOnly") }) },
    "payments.cdc.sharedNullKafka.v1": { description: "Shared bindings with a null kafka binding.", publish: op("publishSharedNullKafka", { bindings: bindings("nullKafka") }) },
    "payments.cdc.danglingBindings.v1": { description: "Dangling shared bindings.", subscribe: op("receiveDanglingBindings", { bindings: bindings("retired") }) },
    "payments.cdc.traitNoKafka.v1": { description: "Trait without kafka.", publish: op("publishTraitNoKafka", { traits: [trait("amqpOnly"), trait("observability")] }) },
    "payments.cdc.traitNullKafka.v1": { description: "Trait with a null kafka binding.", subscribe: op("receiveTraitNullKafka", { traits: [trait("nullKafka")] }) },
    "payments.cdc.traitOverrides.v1": { description: "Trait overriding the kafka binding.", publish: op("publishTraitOverrides", { bindings: { kafka: {} }, traits: [{ bindings: { kafka: "off" } }] }) },
    "payments.cdc.bothMissing.v1": { description: "Both operations without bindings.", publish: {}, subscribe: op("receiveBothMissing", { bindings: { solace: {} } }) },
    "payments.cdc.nullOperation.v1": { description: "Null operation.", publish: null },
    "payments.cdc.stringOperation.v1": { description: "String operation.", subscribe: "receivePayment" },
    "payments.cdc.listOperation.v1": { description: "List operation.", publish: [op("publishListed", { bindings: { kafka: {} } })] },
    "payments.cdc.v3Style.v1": { description: "Operation written for AsyncAPI 3.x.", subscribe: { action: "receive", channel: { $ref: "#/channels/payments.cdc.complete.v1" }, messages: [message("payment")] } },
    "x-payments.cdc.partner.v1": { description: "Partner payments.", publish: op("publishPartner") },
    "terminals/{terminalId}/payments": {
      description: "Terminal payments.",
      parameters: { terminalId: { schema: { type: ["string", "null"] } } },
      subscribe: op("receiveTerminalPayment", { bindings: { mqtt: { qos: 2, bindingVersion: "0.2.0" } } }),
    },
  },
  components: {
    channels: {
      refundsShared: { description: "Shared refunds.", publish: op("publishRefund") },
      archiveShared: { description: "Shared archive.", subscribe: op("receiveArchive", { bindings: {} }), publish: op("publishArchive", { bindings: { kafka: {} } }) },
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
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "Payment", fields: [{ name: "paymentId", type: "string" }, { name: "wallet", type: ["null", "string"], default: null }] },
      },
    },
  },
};
