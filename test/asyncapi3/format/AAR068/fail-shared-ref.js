module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Clinical Order Events", version: "3.0.0" },
  servers: {
    kafkaEu: { host: "kafka-eu.clinic.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    kafkaUs: { host: "kafka-us.clinic.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    partner: { host: "kafka.partner.io:9093", protocol: "kafka-secure", bindings: { $ref: "./shared/bindings.yaml#/server" } },
    mirror: { $ref: "#/components/servers/mirror" },
  },
  channels: {
    labOrders: {
      address: "clinic.cmd.lab.orders.v1",
      bindings: { $ref: "#/components/channelBindings/ordersTopic" },
      messages: {
        labOrderPlaced: { $ref: "#/components/messages/labOrderPlaced" },
        labOrderAmended: {
          name: "labOrderAmended",
          bindings: { $ref: "#/components/messageBindings/keyed", rabbit: {} },
          traits: [{ $ref: "#/components/messageTraits/hl7Envelope" }, { $ref: "./shared/traits.yaml#/fhir" }],
        },
      },
    },
    labOrdersReplica: {
      address: "clinic.cmd.lab.orders.replica.v1",
      bindings: { $ref: "#/components/channelBindings/ordersTopic" },
      messages: {
        labOrderPlaced: { $ref: "#/components/messages/labOrderPlaced" },
        externalResult: { $ref: "./shared/lab-messages.yaml#/components/messages/labResult" },
        dangling: { $ref: "#/components/messages/doesNotExist" },
      },
    },
    imaging: { $ref: "#/components/channels/imaging" },
    imagingMirror: { $ref: "#/components/channels/imaging" },
  },
  operations: {
    placeLabOrder: {
      action: "send",
      channel: { $ref: "#/channels/labOrders" },
      messages: [{ $ref: "#/channels/labOrders/messages/labOrderPlaced" }, { $ref: "#/components/messages/labOrderPlaced" }],
      bindings: { $ref: "#/components/operationBindings/producer" },
      traits: [{ $ref: "#/components/operationTraits/tracing" }, { $ref: "./shared/traits.yaml#/operation" }],
      reply: {
        channel: { $ref: "#/channels/labOrdersReplica" },
        messages: [{ $ref: "#/channels/labOrdersReplica/messages/labOrderPlaced" }],
      },
    },
    replayLabOrder: {
      action: "send",
      channel: { $ref: "#/channels/labOrdersReplica" },
      bindings: { $ref: "#/components/operationBindings/producer" },
      traits: [{ $ref: "#/components/operationTraits/tracing" }],
    },
    receiveImaging: { $ref: "#/components/operations/receiveImaging" },
    receiveImagingAgain: { $ref: "#/components/operations/receiveImaging" },
  },
  components: {
    servers: { mirror: { host: "kafka-mirror.clinic.io:9093", protocol: "kafka", bindings: { kafka: {}, kafka_mirror: {} } } },
    channels: {
      imaging: {
        address: "clinic.cdc.imaging.studies.v1",
        bindings: { kafka: {} },
        messages: { studyCompleted: { name: "studyCompleted", bindings: { $ref: "#/components/messageBindings/keyed" } } },
      },
    },
    operations: {
      receiveImaging: {
        action: "receive",
        channel: { $ref: "#/components/channels/imaging" },
        messages: [{ $ref: "#/components/channels/imaging/messages/studyCompleted" }],
        bindings: { kafka: {}, dicom: {} },
      },
    },
    messages: {
      labOrderPlaced: {
        name: "labOrderPlaced",
        bindings: { $ref: "#/components/messageBindings/keyed" },
        traits: [{ $ref: "#/components/messageTraits/hl7Envelope" }],
      },
    },
    messageTraits: { hl7Envelope: { bindings: { kafka: {}, hl7: {} } } },
    operationTraits: { tracing: { bindings: { kafka: {}, opentelemetry: {} } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.clinic.io" }, confluent: {} } },
    channelBindings: { ordersTopic: { kafka: { partitions: 12 }, kinesis: {} } },
    operationBindings: { producer: { kafka: { clientId: { type: "string" } }, "kafka-ssl": {} } },
    messageBindings: { keyed: { kafka: { key: { type: "string" } }, partitionKey: { type: "string" } } },
  },
};
