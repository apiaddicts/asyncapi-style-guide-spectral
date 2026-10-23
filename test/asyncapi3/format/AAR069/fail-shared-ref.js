module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Warehouse Robotics Shared Definitions", version: "2.1.0" },
  servers: {
    drMirror: { $ref: "#/components/servers/drJms" },
    jmsChained: { host: "mq-a.robotics.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/jmsChainStart" } },
    jmsExternal: { host: "mq-b.robotics.io:61616", protocol: "jms", bindings: { $ref: "./shared/bindings.yaml#/serverBindings/jms" } },
    jmsDangling: { host: "mq-c.robotics.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/doesNotExist" } },
    jmsSibling: { host: "mq-d.robotics.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/jmsChainEnd", jms: {} } },
  },
  channels: {
    telemetryA: { $ref: "#/components/channels/telemetry" },
    telemetryB: { $ref: "#/components/channels/telemetry" },
    robotPosition: {
      address: "robots/{robotId}/position",
      parameters: { robotId: { description: "Robot identifier." } },
      bindings: {
        sqs: { queue: { $ref: "#/components/schemas/QueueSpec" } },
        pulsar: { $ref: "#/components/channelBindings/pulsarShared/pulsar" },
      },
      messages: {
        positionReported: { $ref: "#/components/messages/positionReported" },
        positionExternal: { $ref: "./shared/messages.yaml#/messages/positionReported" },
        positionDangling: { $ref: "#/components/messages/doesNotExist" },
      },
    },
    audit: {
      address: "robots.audit",
      bindings: { $ref: "#/channels/robotPosition/bindings" },
      messages: { positionAlias: { $ref: "#/components/messages/positionAlias" } },
    },
    commands: {
      address: "robots.commands",
      messages: {
        commandIssued: { name: "commandIssued", bindings: { $ref: "#/components/messageBindings/keyed" } },
        commandAcked: { name: "commandAcked", bindings: { $ref: "#/components/messageBindings/keyed" } },
      },
    },
  },
  operations: {
    publishPosition: {
      action: "send",
      channel: { $ref: "#/channels/robotPosition" },
      messages: [{ $ref: "#/channels/robotPosition/messages/positionReported" }],
      bindings: { sns: { consumers: { $ref: "#/components/schemas/Consumers" } } },
    },
    receivePosition: {
      action: "receive",
      channel: { $ref: "#/channels/robotPosition" },
      bindings: { sqs: { queues: [{ $ref: "#/components/schemas/QueueSpec" }, { name: { $ref: "#/components/schemas/QueueName" } }, null, "positions"] } },
    },
    issueCommand: { action: "send", channel: { $ref: "#/channels/commands" }, bindings: { $ref: "#/components/operationBindings/rosShared" } },
    ackCommand: { action: "receive", channel: { $ref: "#/channels/commands" }, bindings: { $ref: "#/components/operationBindings/rosShared" } },
    sharedOperation: { $ref: "#/components/operations/sharedOp" },
    sharedOperationReplica: { $ref: "#/components/operations/sharedOp" },
    externalOperation: { $ref: "./shared/operations.yaml#/operations/x" },
  },
  components: {
    servers: { drJms: { host: "mq-dr.robotics.io:61616", protocol: "jms", bindings: { jms: {} } } },
    channels: {
      telemetry: {
        address: "robots.telemetry",
        bindings: { pulsar: { namespace: "telemetry" } },
        messages: { positionReported: { $ref: "#/components/messages/positionReported" } },
      },
    },
    operations: {
      sharedOp: { action: "send", channel: { $ref: "#/components/channels/telemetry" }, bindings: { ros2: { role: "publisher" } } },
    },
    schemas: {
      QueueSpec: { type: "object", properties: { name: { type: "string" } } },
      QueueName: { type: "string" },
      Consumers: { type: "array" },
    },
    messages: {
      positionReported: { name: "positionReported", bindings: { googlepubsub: { schema: {} } } },
      positionAlias: { $ref: "#/components/messages/positionReported" },
    },
    serverBindings: {
      jmsChainStart: { $ref: "#/components/serverBindings/jmsChainEnd" },
      jmsChainEnd: { jms: { properties: [{ name: "jms.clientID" }] } },
      external: { $ref: "./shared/bindings.yaml#/serverBindings/jms" },
    },
    channelBindings: { pulsarShared: { pulsar: { persistence: "persistent" } } },
    operationBindings: { rosShared: { ros2: { node: "/robots/commander" } } },
    messageBindings: { keyed: { googlepubsub: { schema: { name: "" } } } },
  },
};
