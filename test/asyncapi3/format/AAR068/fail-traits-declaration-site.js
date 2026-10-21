module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Customer Lifecycle Events", version: "4.1.0" },
  channels: {
    customers: {
      address: "customers.{event}",
      parameters: { event: { enum: ["registered", "deleted", "merged"] } },
      messages: {
        registered: {
          name: "customerRegistered",
          bindings: { kafka: {} },
          traits: [{ bindings: { mqtt: {}, mqttt: {} } }, { $ref: "#/components/messageTraits/auditTrait" }],
        },
        deleted: {
          name: "customerDeleted",
          bindings: { http: {}, http2: {} },
          traits: [{ $ref: "#/components/messageTraits/auditTrait" }, { bindings: { http: {} } }],
        },
        merged: {
          name: "customerMerged",
          traits: [
            [{ bindings: { sqs: {}, sqss: {} } }, { bindings: { ignored: {} } }],
            [{ $ref: "#/components/messageTraits/auditTrait" }, { bindings: { alsoIgnored: {} } }],
          ],
        },
      },
    },
  },
  operations: {
    onRegistered: {
      action: "receive",
      channel: { $ref: "#/channels/customers" },
      messages: [{ $ref: "#/channels/customers/messages/registered" }],
      traits: [{ bindings: { kafka: {}, kafkaa: {} } }, { $ref: "#/components/operationTraits/auditTrait" }],
    },
    onDeleted: {
      action: "receive",
      channel: { $ref: "#/channels/customers" },
      messages: [{ $ref: "#/channels/customers/messages/deleted" }],
      bindings: { amqp: {}, amqp091: {} },
      traits: [{ $ref: "#/components/operationTraits/auditTrait" }, { bindings: { amqp: { ack: true } } }],
    },
  },
  components: {
    messageTraits: { auditTrait: { bindings: { kafka: {}, audit: {} } } },
    operationTraits: { auditTrait: { bindings: { kafka: {}, auditLog: {} } } },
  },
};
