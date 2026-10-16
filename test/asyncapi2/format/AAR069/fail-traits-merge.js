module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Yard Automation Trait Merging", version: "2.0.0" },
  channels: {
    "merge/complement": {
      publish: { bindings: { ros2: { role: "publisher" } }, traits: [{ $ref: "#/components/operationTraits/rosNode" }] },
      subscribe: { traits: [{ bindings: { ros2: { role: "subscriber" } } }, { bindings: { ros2: { node: "/yard/gate" }, "x-ros2": {} } }] },
    },
    "merge/arrays": {
      publish: {
        bindings: { sns: { consumers: [{ protocol: "sqs", endpoint: { name: "gate-events" }, rawMessageDelivery: false }] } },
        traits: [{ bindings: { sns: { consumers: [{ protocol: "http" }] } } }],
      },
      subscribe: { bindings: { sqs: { queues: [{ name: "gate-events" }] } }, traits: [{ bindings: { sqs: { queues: [{}] } } }] },
    },
    "merge/trait-order": {
      publish: {
        traits: [
          { bindings: { sns: { consumers: [{ protocol: "sqs", endpoint: { name: "gate-events" }, rawMessageDelivery: false }] } } },
          { bindings: { sns: { consumers: [{ protocol: "http" }] } } },
        ],
      },
      subscribe: {
        traits: [
          { bindings: { sns: { consumers: [{ protocol: "http" }] } } },
          { bindings: { sns: { consumers: [{ protocol: "sqs", endpoint: { name: "gate-events" }, rawMessageDelivery: false }] } } },
        ],
      },
    },
    "merge/blank": {
      publish: { bindings: { ros2: { role: "", node: "/yard/crane" } }, traits: [{ bindings: { ros2: { role: "subscriber" } } }] },
      subscribe: { bindings: { ros2: { role: "publisher", node: "/yard/crane" } }, traits: [{ bindings: { ros2: { node: "  " } } }] },
    },
    "merge/trait-only": {
      publish: { traits: [{ $ref: "#/components/operationTraits/snsOnly" }] },
      subscribe: { bindings: { ros2: null }, traits: [{ bindings: { ros2: { role: "subscriber", node: "/yard/scanner" } } }] },
    },
    "merge/definitions": {
      publish: { bindings: { $ref: "#/components/operationBindings/rosRole" }, traits: [{ bindings: { ros2: { node: "/yard/lights" } } }] },
      subscribe: { bindings: { $ref: "#/components/operationBindings/rosRole" } },
    },
    "merge/scalar": {
      publish: { bindings: { ros2: "publisher" }, traits: [{ bindings: { ros2: { node: "/yard/reefer" } } }] },
      subscribe: { bindings: { ros2: {} }, traits: [{ $ref: "./yard-traits.yaml#/operationTraits/rosNode" }] },
    },
    "merge/unresolvable": {
      publish: { bindings: { ros2: {} }, traits: [{ $ref: "#/components/operationTraits/doesNotExist" }] },
      subscribe: { bindings: { ros2: { node: "/yard/tower" } }, traits: [{ bindings: { $ref: "#/components/operationBindings/rosRole" } }] },
    },
    "merge/empty-definition": {
      publish: { bindings: { ros2: { node: "/yard/weighbridge" } }, traits: [{ bindings: { $ref: "#/components/operationBindings/empty" } }] },
      subscribe: { bindings: { sqs: {} }, traits: [{ $ref: "#/components/operationTraits/loopA" }] },
    },
    "merge/tuple-operation": {
      publish: { bindings: { ros2: {} }, traits: [[{ bindings: { ros2: { role: "publisher", node: "/yard/ignored" } } }, {}]] },
    },
    "merge/escaped": {
      publish: { traits: [{ $ref: "#/components/operationTraits/sns~1fanout" }] },
      subscribe: { traits: [{ $ref: "#/components/operationTraits/sns%20fanout%20v2" }] },
    },
    "merge/escaped-tilde": {
      publish: { traits: [{ $ref: "#/components/operationTraits/ros~0node" }] },
    },
    "merge/messages": {
      publish: {
        message: {
          name: "gateOpened",
          bindings: { googlepubsub: { schema: {} } },
          traits: [[{ $ref: "#/components/messageTraits/pubsubSchema" }, { name: "example" }]],
        },
      },
      subscribe: {
        message: {
          oneOf: [
            { name: "gateClosed", traits: [[{ $ref: "#/components/messageTraits/pubsubSchemaless" }, {}]] },
            { name: "gateJammed", traits: [{ $ref: "#/components/messageTraits/alias" }] },
            { name: "gateLooped", bindings: { googlepubsub: { schema: {} } }, traits: [{ $ref: "#/components/messageTraits/loopA" }] },
            { name: "gateBlanked", bindings: { googlepubsub: { schema: { name: "projects/yard/schemas/gate" } } }, traits: [{ bindings: { googlepubsub: { schema: { name: "" } } } }] },
            { name: "gateRestored", bindings: { googlepubsub: { schema: { name: "" } } }, traits: [{ bindings: { googlepubsub: { schema: { name: "projects/yard/schemas/gate" } } } }] },
          ],
        },
      },
    },
  },
  components: {
    messageTraits: {
      pubsubSchema: { bindings: { googlepubsub: { schema: { name: "projects/yard/schemas/gate" } } } },
      pubsubSchemaless: { bindings: { googlepubsub: { schema: {} } } },
      alias: { $ref: "#/components/messageTraits/pubsubSchemaless" },
      loopA: { $ref: "#/components/messageTraits/loopB" },
      loopB: { $ref: "#/components/messageTraits/loopA" },
    },
    operationTraits: {
      rosNode: { bindings: { ros2: { node: "/yard/dispatcher" } } },
      snsOnly: { bindings: { sns: { consumers: [{ protocol: "sqs" }] } } },
      loopA: { $ref: "#/components/operationTraits/loopB" },
      loopB: { $ref: "#/components/operationTraits/loopA" },
      "sns/fanout": { bindings: { sns: { consumers: [{}] } } },
      "sns fanout v2": { bindings: { sns: { consumers: [{}] } } },
      "ros~node": { bindings: { ros2: { role: "publisher" } } },
    },
    operationBindings: {
      rosRole: { ros2: { role: "publisher" } },
      empty: {},
    },
  },
};
