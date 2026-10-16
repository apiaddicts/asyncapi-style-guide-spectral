module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Customer Lifecycle Events", version: "4.1.0" },
  channels: {
    "customers/registered": {
      subscribe: {
        traits: [{ bindings: { kafka: {}, kafkaa: {} } }, { $ref: "#/components/operationTraits/auditTrait" }],
        message: {
          name: "customerRegistered",
          bindings: { kafka: {} },
          traits: [{ bindings: { mqtt: {}, mqttt: {} } }, { $ref: "#/components/messageTraits/auditTrait" }],
        },
      },
    },
    "customers/deleted": {
      subscribe: {
        bindings: { amqp: {}, amqp091: {} },
        traits: [{ $ref: "#/components/operationTraits/auditTrait" }, { bindings: { amqp: { ack: true } } }],
        message: {
          name: "customerDeleted",
          bindings: { http: {}, http2: {} },
          traits: [{ $ref: "#/components/messageTraits/auditTrait" }, { bindings: { http: {} } }],
        },
      },
    },
    "customers/merged": {
      publish: {
        message: {
          name: "customerMerged",
          traits: [
            [{ bindings: { sqs: {}, sqss: {} } }, { bindings: { ignored: {} } }],
            [{ $ref: "#/components/messageTraits/auditTrait" }, { bindings: { alsoIgnored: {} } }],
          ],
        },
      },
    },
  },
  components: {
    messageTraits: { auditTrait: { bindings: { kafka: {}, audit: {} } } },
    operationTraits: { auditTrait: { bindings: { kafka: {}, auditLog: {} } } },
  },
};
