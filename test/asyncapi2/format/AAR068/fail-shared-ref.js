module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Fleet Telematics Backbone", version: "1.8.0" },
  servers: {
    kafkaEu: { url: "kafka-eu.fleet.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    kafkaUs: { url: "kafka-us.fleet.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    partnerKafka: { url: "kafka.partner.io:9093", protocol: "kafka-secure", bindings: { $ref: "./shared/bindings.yaml#/serverBindings/partner" } },
    mirror: { $ref: "#/components/servers/mirror" },
  },
  channels: {
    "fleet/vehicles/{vehicleId}/position": {
      parameters: { vehicleId: { $ref: "#/components/parameters/vehicleId" } },
      bindings: { $ref: "#/components/channelBindings/telemetryTopic" },
      publish: {
        bindings: { $ref: "#/components/operationBindings/producer" },
        traits: [{ $ref: "#/components/operationTraits/tracing" }, { $ref: "./shared/traits.yaml#/operation" }],
        message: { $ref: "#/components/messages/vehiclePosition" },
      },
      subscribe: {
        bindings: { $ref: "#/components/operationBindings/producer", rabbit: {} },
        traits: [{ $ref: "#/components/operationTraits/tracing" }],
        message: { $ref: "#/components/messages/vehiclePosition" },
      },
    },
    "fleet/vehicles/{vehicleId}/position-replay": {
      parameters: { vehicleId: { $ref: "#/components/parameters/vehicleId" } },
      bindings: { $ref: "#/components/channelBindings/telemetryTopic" },
      publish: {
        message: {
          oneOf: [
            { $ref: "#/components/messages/vehiclePosition" },
            { $ref: "./shared/fleet-messages.yaml#/components/messages/externalPosition" },
            { $ref: "#/components/messages/doesNotExist" },
          ],
        },
      },
    },
    "fleet/diagnostics": { $ref: "#/components/channels/diagnostics" },
    "fleet/diagnostics-mirror": { $ref: "#/components/channels/diagnostics" },
  },
  components: {
    servers: { mirror: { url: "kafka-mirror.fleet.io:9093", protocol: "kafka", bindings: { kafka: {}, kafka_mirror: {} } } },
    channels: {
      diagnostics: {
        bindings: { kafka: {} },
        publish: { message: { name: "diagnosticCode", bindings: { $ref: "#/components/messageBindings/keyed" } } },
      },
    },
    parameters: { vehicleId: { description: "Vehicle identifier.", schema: { type: "string" } } },
    messages: {
      vehiclePosition: {
        name: "vehiclePosition",
        bindings: { $ref: "#/components/messageBindings/keyed" },
        traits: [{ $ref: "#/components/messageTraits/telemetryEnvelope" }, { $ref: "./shared/traits.yaml#/message" }],
      },
    },
    messageTraits: { telemetryEnvelope: { bindings: { kafka: {}, websocket: {} } } },
    operationTraits: { tracing: { bindings: { kafka: {}, opentelemetry: {} } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.fleet.io" }, confluent: {} } },
    channelBindings: { telemetryTopic: { kafka: { partitions: 24 }, kinesis: {} } },
    operationBindings: { producer: { kafka: { clientId: { type: "string" } }, "kafka-ssl": {} } },
    messageBindings: { keyed: { kafka: { key: { type: "string" } }, partitionKey: { type: "string" } } },
  },
};
