module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Warehouse Robotics Shared Definitions", version: "1.4.0" },
  servers: {
    drMirror: { $ref: "#/components/servers/drJms" },
    jmsChained: { url: "tcp://mq-a.robotics.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/jmsChainStart" } },
    jmsExternal: { url: "tcp://mq-b.robotics.io:61616", protocol: "jms", bindings: { $ref: "./shared/bindings.yaml#/serverBindings/jms" } },
    jmsDangling: { url: "tcp://mq-c.robotics.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/doesNotExist" } },
    jmsSibling: { url: "tcp://mq-d.robotics.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/jmsChainEnd", jms: {} } },
  },
  channels: {
    "telemetry/a": { $ref: "#/components/channels/telemetry" },
    "telemetry/b": { $ref: "#/components/channels/telemetry" },
    "telemetry/{robotId}/position": {
      parameters: { robotId: { description: "Robot identifier.", schema: { type: "string" } } },
      bindings: {
        sqs: { queue: { $ref: "#/components/schemas/QueueSpec" } },
        pulsar: { $ref: "#/components/channelBindings/pulsarShared/pulsar" },
      },
      publish: {
        bindings: { sns: { consumers: { $ref: "#/components/schemas/Consumers" } } },
        message: { $ref: "#/components/messages/positionReported" },
      },
      subscribe: {
        bindings: { sqs: { queues: [{ $ref: "#/components/schemas/QueueSpec" }, { name: { $ref: "#/components/schemas/QueueName" } }, null, "positions"] } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/positionReported" },
            { $ref: "./shared/messages.yaml#/messages/positionReported" },
            { $ref: "#/components/messages/doesNotExist" },
          ],
        },
      },
    },
    audit: {
      bindings: { $ref: "#/channels/telemetry~1%7BrobotId%7D~1position/bindings" },
      publish: { message: { $ref: "#/components/messages/positionAlias" } },
    },
    "robots/commands": {
      publish: { bindings: { $ref: "#/components/operationBindings/rosShared" }, message: { name: "commandIssued", bindings: { $ref: "#/components/messageBindings/keyed" } } },
      subscribe: { bindings: { $ref: "#/components/operationBindings/rosShared" }, message: { name: "commandAcked", bindings: { $ref: "#/components/messageBindings/keyed" } } },
    },
  },
  components: {
    servers: { drJms: { url: "tcp://mq-dr.robotics.io:61616", protocol: "jms", bindings: { jms: {} } } },
    channels: {
      telemetry: {
        bindings: { pulsar: { namespace: "telemetry" } },
        publish: { message: { $ref: "#/components/messages/positionReported" } },
      },
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
