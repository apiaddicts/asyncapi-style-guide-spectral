module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Fleet Charging Network", version: "2.1.0" },
  servers: {
    kafkaEu: { url: "kafka-eu.charging.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    kafkaUs: { url: "kafka-us.charging.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    partnerKafka: { url: "kafka.partner.io:9093", protocol: "kafka-secure", bindings: { $ref: "./shared/bindings.yaml#/serverBindings/partner" } },
    mirror: { $ref: "#/components/servers/mirror" },
    mirrorAgain: { $ref: "#/components/servers/mirror" },
  },
  channels: {
    "charging/stations/{stationId}/sessions": {
      parameters: { stationId: { $ref: "#/components/parameters/stationId" } },
      bindings: { $ref: "#/components/channelBindings/sessionsTopic" },
      publish: {
        bindings: { $ref: "#/components/operationBindings/producer" },
        traits: [{ $ref: "#/components/operationTraits/tracing" }, { $ref: "./shared/traits.yaml#/operation" }],
        message: { $ref: "#/components/messages/sessionStarted" },
      },
      subscribe: {
        bindings: { $ref: "#/components/operationBindings/producer", kafka: { bindingVersion: "latest" } },
        traits: [{ $ref: "#/components/operationTraits/tracing" }],
        message: { $ref: "#/components/messages/sessionStarted" },
      },
    },
    "charging/stations/{stationId}/sessions-replay": {
      parameters: { stationId: { $ref: "#/components/parameters/stationId" } },
      bindings: { $ref: "#/components/channelBindings/sessionsTopic" },
      publish: {
        message: {
          oneOf: [
            { $ref: "#/components/messages/sessionStarted" },
            { $ref: "./shared/charging-messages.yaml#/components/messages/externalSession" },
            { $ref: "#/components/messages/doesNotExist" },
          ],
        },
      },
    },
    "charging/diagnostics": { $ref: "#/components/channels/diagnostics" },
    "charging/diagnostics-mirror": { $ref: "#/components/channels/diagnostics" },
    "charging/tariffs": {
      bindings: { kafka: { $ref: "#/components/x-shared-kafka/tariffs", bindingVersion: "latest" } },
      subscribe: { bindings: { kafka: { $ref: "./shared/kafka.yaml#/consumer" } } },
    },
  },
  components: {
    servers: { mirror: { url: "kafka-mirror.charging.io:9093", protocol: "kafka", bindings: { kafka: { bindingVersion: "0.4" } } } },
    channels: {
      diagnostics: {
        bindings: { kafka: { bindingVersion: "0.5.0" } },
        publish: { message: { name: "diagnosticCode", bindings: { $ref: "#/components/messageBindings/keyed" } } },
      },
    },
    parameters: { stationId: { description: "Charging station identifier.", schema: { type: "string" } } },
    messages: {
      sessionStarted: {
        name: "sessionStarted",
        bindings: { $ref: "#/components/messageBindings/keyed" },
        traits: [{ $ref: "#/components/messageTraits/chargingEnvelope" }, { $ref: "./shared/traits.yaml#/message" }],
      },
    },
    messageTraits: { chargingEnvelope: { bindings: { kafka: { bindingVersion: "0.5.0" }, ws: { bindingVersion: "latest" } } } },
    operationTraits: { tracing: { bindings: { kafka: { bindingVersion: "v0.5.0" } } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.charging.io", bindingVersion: "0.5" } } },
    channelBindings: { sessionsTopic: { kafka: { partitions: 24, bindingVersion: "0.5.0-rc1" } } },
    operationBindings: { producer: { kafka: { clientId: { type: "string" }, bindingVersion: 0.5 } } },
    messageBindings: { keyed: { kafka: { key: { type: "string" }, bindingVersion: "latest" } } },
    "x-shared-kafka": { tariffs: { bindingVersion: "latest" } },
  },
};
