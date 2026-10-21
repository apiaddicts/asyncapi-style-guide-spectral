module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Customer Identity Events", version: "4.0.0" },
  channels: {
    registered: {
      address: "customers.registered",
      messages: {
        customerRegistered: {
          bindings: { kafka: { bindingVersion: "0.5.0" } },
          traits: [{ bindings: { kafka: { bindingVersion: "0.5" } } }],
        },
      },
    },
    deleted: {
      address: "customers.deleted",
      messages: {
        customerDeleted: {
          bindings: { kafka: { bindingVersion: "0.5.0-beta" } },
          traits: [{ bindings: { kafka: { bindingVersion: "0.5.0" } } }],
        },
      },
    },
    merged: {
      address: "customers.merged",
      messages: {
        customerMerged: {
          bindings: { kafka: { bindingVersion: "0.5.0" } },
          traits: [[{ bindings: { kafka: { bindingVersion: "LATEST" } } }, { bindings: { kafka: { bindingVersion: "tuple-second-element" } } }], { $ref: "#/components/messageTraits/auditTrait" }],
        },
        customerAnonymised: { traits: [{ bindings: { kafka: { bindingVersion: null } } }, { bindings: { kafka: {} } }] },
      },
    },
  },
  operations: {
    onRegistered: {
      action: "receive",
      channel: { $ref: "#/channels/registered" },
      bindings: { kafka: { bindingVersion: "0.5.0" } },
      traits: [{ bindings: { kafka: { bindingVersion: "latest" } } }],
    },
    onDeleted: {
      action: "receive",
      channel: { $ref: "#/channels/deleted" },
      bindings: { kafka: { bindingVersion: "v0.5.0" } },
      traits: [{ bindings: { kafka: { bindingVersion: "0.5.0" } } }],
    },
    publishMerged: {
      action: "send",
      channel: { $ref: "#/channels/merged" },
      bindings: { kafka: { bindingVersion: "0.5.0" } },
      traits: [{ $ref: "#/components/operationTraits/auditTrait" }, { bindings: { kafka: { bindingVersion: null } } }],
    },
  },
  components: {
    messageTraits: { auditTrait: { bindings: { kafka: { bindingVersion: "1.0" } } } },
    operationTraits: { auditTrait: { bindings: { kafka: { bindingVersion: 1 } } } },
  },
};
