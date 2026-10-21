const message = (name) => ({ $ref: `#/components/messages/${name}` });
const messages = { sessionStarted: message("sessionStarted") };
const channel = (address, extra = {}) => ({ address, description: `Channel ${address}.`, messages, ...extra });

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Mobility Charging Events", version: "4.0.0" },
  servers: {
    production: {
      host: "kafka.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    chargers: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    compliant: channel("mobility.cdc.compliant.v1", { bindings: { kafka: { topic: "mobility.cdc.compliant.v1", bindingVersion: "0.5.0" } } }),
    noBindings: channel("mobility.cdc.noBindings.v1"),
    emptyBindings: channel("mobility.cdc.emptyBindings.v1", { bindings: {} }),
    nullBindings: channel("mobility.cdc.nullBindings.v1", { bindings: null }),
    amqpOnly: channel("mobility.cdc.amqpOnly.v1", { bindings: { amqp: { is: "routingKey", exchange: { name: "mobility", type: "topic" }, bindingVersion: "0.3.0" } } }),
    mqttAndWs: channel("mobility.cdc.mqttAndWs.v1", { bindings: { mqtt: {}, ws: { method: "GET", bindingVersion: "0.1.0" } } }),
    upperCase: channel("mobility.cdc.upperCase.v1", { bindings: { KAFKA: { topic: "mobility.cdc.upperCase.v1" } } }),
    extension: channel("mobility.cdc.extension.v1", { bindings: { "x-kafka": { topic: "mobility.cdc.extension.v1" } } }),
    kafkaSecure: channel("mobility.cdc.kafkaSecure.v1", { bindings: { "kafka-secure": {} } }),
    nullKafka: channel("mobility.cdc.nullKafka.v1", { bindings: { kafka: null } }),
    stringKafka: channel("mobility.cdc.stringKafka.v1", { bindings: { kafka: "enabled" } }),
    listKafka: channel("mobility.cdc.listKafka.v1", { bindings: { kafka: [{ topic: "mobility.cdc.listKafka.v1" }] } }),
    numberKafka: channel("mobility.cdc.numberKafka.v1", { bindings: { kafka: 1, mqtt: {} } }),
    danglingKafka: channel("mobility.cdc.danglingKafka.v1", { bindings: { kafka: { $ref: "#/components/x-kafka-bindings/retired" } } }),
    messageOnly: channel("mobility.cdc.messageOnly.v1", { messages: { keyed: { name: "keyed", bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" } }, payload: { type: "object" } } } }),
    messageTraitOnly: channel("mobility.cdc.messageTraitOnly.v1", { messages: { keyedByTrait: message("keyedByTrait") } }),
    operationOnly: channel("mobility.cdc.operationOnly.v1"),
    serverOnly: channel("mobility.cdc.serverOnly.v1", { servers: [{ $ref: "#/servers/production" }] }),
    sharedNoKafka: channel("mobility.cdc.sharedNoKafka.v1", { bindings: { $ref: "#/components/channelBindings/mqttOnly" } }),
    sharedNullKafka: channel("mobility.cdc.sharedNullKafka.v1", { bindings: { $ref: "#/components/channelBindings/nullKafka" } }),
    danglingBindings: channel("mobility.cdc.danglingBindings.v1", { bindings: { $ref: "#/components/channelBindings/retired" } }),
    tripReplies: { address: null, description: "Replies routed with the replyTo header.", messages: { tripAccepted: message("tripAccepted") } },
    v2Style: {
      description: "Written with publish and subscribe.",
      subscribe: { bindings: { kafka: { groupId: { type: "string" } } }, message: message("sessionStarted") },
      publish: { bindings: { kafka: { clientId: { type: "string" } } }, message: message("sessionStarted") },
    },
    nullChannel: null,
    stringChannel: "mobility.cdc.string.v1",
    listChannel: [{ address: "mobility.cdc.list.v1", bindings: { kafka: {} } }],
    "x-partner": { address: "mobility.cdc.partner.v1", messages },
    chargerTelemetry: {
      address: "chargers/{chargerId}/telemetry",
      parameters: { chargerId: { description: "Charger identifier." } },
      servers: [{ $ref: "#/servers/chargers" }],
      messages,
      bindings: { mqtt: {} },
    },
    shared: { $ref: "#/components/channels/sharedHub" },
    sharedAgain: { $ref: "#/components/channels/sharedHub" },
  },
  operations: {
    receiveOperationOnly: {
      action: "receive",
      channel: { $ref: "#/channels/operationOnly" },
      bindings: { kafka: { groupId: { type: "string", enum: ["mobility"] }, bindingVersion: "0.5.0" } },
      traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
    },
    sendTrip: {
      action: "send",
      channel: { $ref: "#/channels/compliant" },
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/tripReplies" } },
    },
    receiveShared: { action: "receive", channel: { $ref: "#/components/channels/sharedHub" } },
  },
  components: {
    channels: {
      sharedHub: { address: "mobility.cdc.sharedHub.v1", description: "Shared hub without bindings.", messages },
      legacyQueue: { address: "mobility.cdc.legacy.v1", description: "Legacy queue.", messages, bindings: { ibmmq: { destinationType: "queue", queue: { objectName: "LEGACY" } } } },
      settled: { address: "mobility.cdc.settled.v1", description: "Settled.", messages, bindings: { kafka: { partitions: 6 } } },
      nullShared: null,
    },
    channelBindings: {
      mqttOnly: { mqtt: {} },
      nullKafka: { kafka: null },
      unusedWithoutKafka: { amqp: { is: "queue" } },
    },
    messages: {
      sessionStarted: { name: "sessionStarted", payload: { type: "object", properties: { sessionId: { type: "string" }, vehicleId: { type: ["string", "null"] } } } },
      tripAccepted: { name: "tripAccepted", payload: { type: "object" } },
      keyedByTrait: { name: "keyedByTrait", traits: [{ $ref: "#/components/messageTraits/kafkaKey" }], payload: { type: "object" } },
    },
    messageTraits: { kafkaKey: { bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" } } } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } } },
  },
};
