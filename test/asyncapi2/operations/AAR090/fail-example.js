const message = (name) => ({ $ref: `#/components/messages/${name}` });
const subscribe = (operationId) => ({ operationId, message: message("paymentCaptured") });

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Events", version: "3.4.0" },
  servers: {
    production: {
      url: "kafka.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    terminals: { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    "payments.cdc.compliant.v1": { description: "Compliant channel.", bindings: { kafka: { topic: "payments.cdc.compliant.v1", bindingVersion: "0.4.0" } }, subscribe: subscribe("receiveCompliant") },
    "payments.cdc.noBindings.v1": { description: "Channel without bindings.", subscribe: subscribe("receiveNoBindings") },
    "payments.cdc.emptyBindings.v1": { description: "Empty bindings object.", bindings: {}, subscribe: subscribe("receiveEmptyBindings") },
    "payments.cdc.nullBindings.v1": { description: "Null bindings.", bindings: null, subscribe: subscribe("receiveNullBindings") },
    "payments.cdc.amqpOnly.v1": {
      description: "Only an AMQP binding.",
      bindings: { amqp: { is: "routingKey", exchange: { name: "payments", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      subscribe: subscribe("receiveAmqpOnly"),
    },
    "payments.cdc.mqttAndWs.v1": { description: "MQTT and WebSockets bindings.", bindings: { mqtt: {}, ws: { method: "GET", bindingVersion: "0.1.0" } }, subscribe: subscribe("receiveMqttAndWs") },
    "payments.cdc.upperCase.v1": { description: "Kafka key in title case.", bindings: { Kafka: { topic: "payments.cdc.upperCase.v1" } }, subscribe: subscribe("receiveUpperCase") },
    "payments.cdc.extension.v1": { description: "Kafka binding as an extension.", bindings: { "x-kafka": { topic: "payments.cdc.extension.v1" } }, subscribe: subscribe("receiveExtension") },
    "payments.cdc.kafkaSecure.v1": { description: "Kafka binding under the server protocol name.", bindings: { "kafka-secure": {} }, subscribe: subscribe("receiveKafkaSecure") },
    "payments.cdc.nullKafka.v1": { description: "Null kafka binding.", bindings: { kafka: null }, subscribe: subscribe("receiveNullKafka") },
    "payments.cdc.stringKafka.v1": { description: "Kafka binding given as text.", bindings: { kafka: "enabled" }, subscribe: subscribe("receiveStringKafka") },
    "payments.cdc.listKafka.v1": { description: "Kafka binding given as a list.", bindings: { kafka: [{ topic: "payments.cdc.listKafka.v1" }] }, subscribe: subscribe("receiveListKafka") },
    "payments.cdc.trueKafka.v1": { description: "Kafka binding given as a flag.", bindings: { kafka: true, amqp: { is: "queue" } }, subscribe: subscribe("receiveTrueKafka") },
    "payments.cdc.danglingKafka.v1": { description: "Kafka binding given as a dangling reference.", bindings: { kafka: { $ref: "#/components/x-kafka-bindings/retired" } }, subscribe: subscribe("receiveDanglingKafka") },
    "payments.cdc.operationOnly.v1": {
      description: "Kafka binding only in the operations.",
      subscribe: { operationId: "receiveOperationOnly", bindings: { kafka: { groupId: { type: "string", enum: ["payments"] }, bindingVersion: "0.4.0" } }, message: message("paymentCaptured") },
      publish: { operationId: "publishOperationOnly", bindings: { kafka: { clientId: { type: "string" } } }, message: message("paymentCaptured") },
    },
    "payments.cdc.messageOnly.v1": {
      description: "Kafka binding only in the message.",
      subscribe: { operationId: "receiveMessageOnly", message: { name: "paymentKeyed", bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } }, payload: { type: "object" } } },
    },
    "payments.cdc.traitOnly.v1": {
      description: "Kafka binding only in operation and message traits.",
      subscribe: { operationId: "receiveTraitOnly", traits: [{ $ref: "#/components/operationTraits/paymentsConsumer" }], message: message("paymentKeyedByTrait") },
    },
    "payments.cdc.serverOnly.v1": { description: "Kafka binding only in the server.", servers: ["production"], subscribe: subscribe("receiveServerOnly") },
    "payments.cdc.sharedNoKafka.v1": { description: "Shared bindings without kafka.", bindings: { $ref: "#/components/channelBindings/mqttOnly" }, subscribe: subscribe("receiveSharedNoKafka") },
    "payments.cdc.sharedNullKafka.v1": { description: "Shared bindings with a null kafka binding.", bindings: { $ref: "#/components/channelBindings/nullKafka" }, subscribe: subscribe("receiveSharedNullKafka") },
    "payments.cdc.danglingBindings.v1": { description: "Bindings given as a dangling reference.", bindings: { $ref: "#/components/channelBindings/retired" }, subscribe: subscribe("receiveDanglingBindings") },
    "payments.cdc.nullChannel.v1": null,
    "payments.cdc.stringChannel.v1": "payments.cdc.stringChannel.v1",
    "payments.cdc.listChannel.v1": [{ description: "Listed.", bindings: { kafka: {} } }],
    "x-payments.cdc.partner.v1": { description: "x- channel without bindings.", subscribe: subscribe("receivePartner") },
    "terminals/{terminalId}/payments": {
      description: "Terminal payments over MQTT only.",
      servers: ["terminals"],
      parameters: { terminalId: { description: "Terminal identifier.", schema: { type: "string" } } },
      bindings: { mqtt: {} },
      publish: { operationId: "publishTerminalPayment", bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } }, message: message("paymentCaptured") },
    },
    "payments.refunds.requested": { $ref: "#/components/channels/refundsShared" },
    "payments.refunds.requested.eu": { $ref: "#/components/channels/refundsShared" },
  },
  components: {
    channels: {
      refundsShared: { description: "Shared refunds channel without bindings.", subscribe: subscribe("receiveRefunds") },
      archiveShared: { description: "Archive with empty bindings.", bindings: {}, subscribe: subscribe("receiveArchive") },
      settledShared: { description: "Settled payments.", bindings: { kafka: { partitions: 6 } }, subscribe: subscribe("receiveSettled") },
      nullShared: null,
    },
    channelBindings: {
      mqttOnly: { mqtt: {} },
      nullKafka: { kafka: null },
      unusedWithoutKafka: { amqp: { is: "queue" } },
    },
    "x-kafka-bindings": { settled: { topic: "payments.cdc.settled.v1" } },
    messages: {
      paymentCaptured: { name: "paymentCaptured", payload: { type: "object", properties: { paymentId: { type: "string" }, amount: { type: ["number", "null"] } } } },
      paymentKeyedByTrait: { name: "paymentKeyedByTrait", traits: [{ $ref: "#/components/messageTraits/kafkaKey" }], payload: { type: "object" } },
    },
    messageTraits: { kafkaKey: { bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } } } },
    operationTraits: { paymentsConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["payments"] }, bindingVersion: "0.4.0" } } } },
  },
};
