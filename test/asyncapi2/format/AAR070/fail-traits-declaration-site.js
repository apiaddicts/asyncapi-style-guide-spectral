module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Customer Identity Events", version: "3.0.0" },
  channels: {
    "customers/registered": {
      subscribe: {
        bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" } },
        traits: [{ bindings: { kafka: { bindingVersion: "latest" } } }],
        message: {
          bindings: { kafka: { bindingVersion: "0.5.0" } },
          traits: [{ bindings: { kafka: { bindingVersion: "0.5" } } }],
        },
      },
    },
    "customers/deleted": {
      subscribe: {
        bindings: { kafka: { bindingVersion: "v0.5.0" } },
        traits: [{ bindings: { kafka: { bindingVersion: "0.5.0" } } }],
        message: {
          bindings: { kafka: { bindingVersion: "0.5.0-beta" } },
          traits: [{ bindings: { kafka: { bindingVersion: "0.5.0" } } }],
        },
      },
    },
    "customers/merged": {
      publish: {
        bindings: { kafka: { bindingVersion: "0.5.0" } },
        traits: [{ $ref: "#/components/operationTraits/auditTrait" }, { bindings: { kafka: { bindingVersion: null } } }],
        message: {
          bindings: { kafka: { bindingVersion: "0.5.0" } },
          traits: [[{ bindings: { kafka: { bindingVersion: "LATEST" } } }, { bindings: { kafka: { bindingVersion: "tuple-second-element" } } }], { $ref: "#/components/messageTraits/auditTrait" }],
        },
      },
    },
    "customers/anonymised": {
      publish: {
        traits: [{ bindings: { kafka: { bindingVersion: "0.4.0" } } }, { bindings: { kafka: { bindingVersion: "0.5.0" } } }],
        message: { traits: [{ bindings: { kafka: { bindingVersion: null } } }, { bindings: { kafka: {} } }] },
      },
    },
  },
  components: {
    messageTraits: { auditTrait: { bindings: { kafka: { bindingVersion: "1.0" } } } },
    operationTraits: { auditTrait: { bindings: { kafka: { bindingVersion: 1 } } } },
  },
};
