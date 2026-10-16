module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Fleet Charging Network", version: "3.0.0" },
  servers: {
    kafkaEu: { host: "kafka-eu.charging.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    kafkaUs: { host: "kafka-us.charging.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    partnerKafka: { host: "kafka.partner.io:9093", protocol: "kafka-secure", bindings: { $ref: "./shared/bindings.yaml#/serverBindings/partner" } },
    mirror: { $ref: "#/components/servers/mirror" },
    mirrorAgain: { $ref: "#/components/servers/mirror" },
  },
  channels: {
    sessions: {
      address: "charging/stations/{stationId}/sessions",
      parameters: { stationId: { $ref: "#/components/parameters/stationId" } },
      messages: {
        sessionStarted: { $ref: "#/components/messages/sessionStarted" },
        sessionStartedExternal: { $ref: "./shared/charging-messages.yaml#/components/messages/externalSession" },
        sessionStopped: { $ref: "#/components/messages/doesNotExist" },
      },
      bindings: { $ref: "#/components/channelBindings/sessionsTopic" },
    },
    sessionsReplay: {
      address: "charging/stations/{stationId}/sessions-replay",
      messages: { sessionStarted: { $ref: "#/components/messages/sessionStarted" } },
      bindings: { $ref: "#/components/channelBindings/sessionsTopic", kafka: { bindingVersion: "latest" } },
    },
    diagnostics: { $ref: "#/components/channels/diagnostics" },
    diagnosticsMirror: { $ref: "#/components/channels/diagnostics" },
    tariffs: {
      address: "charging.tariffs",
      bindings: { kafka: { $ref: "#/components/x-shared-kafka/tariffs", bindingVersion: "latest" } },
    },
  },
  operations: {
    startSession: {
      action: "send",
      channel: { $ref: "#/channels/sessions" },
      messages: [{ $ref: "#/channels/sessions/messages/sessionStarted" }],
      bindings: { $ref: "#/components/operationBindings/producer" },
      traits: [{ $ref: "#/components/operationTraits/tracing" }, { $ref: "./shared/traits.yaml#/operation" }],
      reply: { $ref: "#/components/replies/sessionAck" },
    },
    replaySession: {
      action: "receive",
      channel: { $ref: "#/channels/sessionsReplay" },
      bindings: { $ref: "#/components/operationBindings/producer", kafka: { bindingVersion: "latest" } },
      traits: [{ $ref: "#/components/operationTraits/tracing" }],
    },
    auditSession: { $ref: "#/components/operations/auditSession" },
    auditSessionAgain: { $ref: "#/components/operations/auditSession" },
    tariffUpdated: { action: "receive", channel: { $ref: "#/channels/tariffs" }, bindings: { kafka: { $ref: "./shared/kafka.yaml#/consumer" } } },
  },
  components: {
    servers: { mirror: { host: "kafka-mirror.charging.io:9093", protocol: "kafka", bindings: { kafka: { bindingVersion: "0.4" } } } },
    channels: {
      diagnostics: {
        address: "charging.diagnostics",
        messages: { diagnosticCode: { name: "diagnosticCode", bindings: { $ref: "#/components/messageBindings/keyed" } } },
        bindings: { kafka: { bindingVersion: "0.5.0" } },
      },
    },
    operations: {
      auditSession: {
        action: "send",
        channel: { $ref: "#/channels/sessions" },
        bindings: { kafka: { bindingVersion: "0.5.0-audit" } },
        traits: [{ $ref: "#/components/operationTraits/tracing" }],
      },
    },
    parameters: { stationId: { description: "Charging station identifier." } },
    messages: {
      sessionStarted: {
        name: "sessionStarted",
        bindings: { $ref: "#/components/messageBindings/keyed" },
        traits: [{ $ref: "#/components/messageTraits/chargingEnvelope" }, { $ref: "./shared/traits.yaml#/message" }],
      },
    },
    replies: { sessionAck: { channel: { $ref: "#/channels/sessions" }, messages: [{ $ref: "#/components/messages/sessionStarted" }] } },
    messageTraits: { chargingEnvelope: { bindings: { kafka: { bindingVersion: "0.5.0" }, ws: { bindingVersion: "latest" } } } },
    operationTraits: { tracing: { bindings: { kafka: { bindingVersion: "v0.5.0" } } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.charging.io", bindingVersion: "0.5" } } },
    channelBindings: { sessionsTopic: { kafka: { partitions: 24, bindingVersion: "0.5.0-rc1" } } },
    operationBindings: { producer: { kafka: { clientId: { type: "string" }, bindingVersion: 0.5 } } },
    messageBindings: { keyed: { kafka: { key: { type: "string" }, bindingVersion: "latest" } } },
    "x-shared-kafka": { tariffs: { bindingVersion: "latest" } },
  },
};
