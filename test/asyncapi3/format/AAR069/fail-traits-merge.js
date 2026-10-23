const complete = { consumers: [{ protocol: "sqs", endpoint: { name: "gate-events" }, rawMessageDelivery: false }] };
const partial = { consumers: [{ protocol: "http" }] };
const gates = { $ref: "#/channels/gates" };

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Yard Automation Trait Merging", version: "3.0.0" },
  channels: {
    gates: {
      address: "yard/gates/{gateId}",
      parameters: { gateId: { description: "Gate identifier." } },
      messages: {
        gateOpened: {
          name: "gateOpened",
          bindings: { googlepubsub: { schema: {} } },
          traits: [[{ $ref: "#/components/messageTraits/pubsubSchema" }, { name: "example" }]],
        },
        gateClosed: { name: "gateClosed", traits: [[{ $ref: "#/components/messageTraits/pubsubSchemaless" }, {}]] },
        gateJammed: { name: "gateJammed", traits: [{ $ref: "#/components/messageTraits/alias" }] },
        gateLooped: { name: "gateLooped", bindings: { googlepubsub: { schema: {} } }, traits: [{ $ref: "#/components/messageTraits/loopA" }] },
        gateBlanked: {
          name: "gateBlanked",
          bindings: { googlepubsub: { schema: { name: "projects/yard/schemas/gate" } } },
          traits: [{ bindings: { googlepubsub: { schema: { name: "" } } } }],
        },
        gateRestored: {
          name: "gateRestored",
          bindings: { googlepubsub: { schema: { name: "" } } },
          traits: [{ bindings: { googlepubsub: { schema: { name: "projects/yard/schemas/gate" } } } }],
        },
      },
    },
  },
  operations: {
    complementPublish: { action: "send", channel: gates, bindings: { ros2: { role: "publisher" } }, traits: [{ $ref: "#/components/operationTraits/rosNode" }] },
    complementReceive: {
      action: "receive",
      channel: gates,
      traits: [{ bindings: { ros2: { role: "subscriber" } } }, { bindings: { ros2: { node: "/yard/gate" }, "x-ros2": {} } }],
    },
    arraysPublish: { action: "send", channel: gates, bindings: { sns: complete }, traits: [{ bindings: { sns: partial } }] },
    arraysReceive: { action: "receive", channel: gates, bindings: { sqs: { queues: [{ name: "gate-events" }] } }, traits: [{ bindings: { sqs: { queues: [{}] } } }] },
    traitOrderLast: { action: "send", channel: gates, traits: [{ bindings: { sns: complete } }, { bindings: { sns: partial } }] },
    traitOrderFirst: { action: "send", channel: gates, traits: [{ bindings: { sns: partial } }, { bindings: { sns: complete } }] },
    blankPublish: { action: "send", channel: gates, bindings: { ros2: { role: "", node: "/yard/crane" } }, traits: [{ bindings: { ros2: { role: "subscriber" } } }] },
    blankReceive: { action: "receive", channel: gates, bindings: { ros2: { role: "publisher", node: "/yard/crane" } }, traits: [{ bindings: { ros2: { node: "  " } } }] },
    traitOnly: { action: "send", channel: gates, traits: [{ $ref: "#/components/operationTraits/snsOnly" }] },
    nullOwn: { action: "receive", channel: gates, bindings: { ros2: null }, traits: [{ bindings: { ros2: { role: "subscriber", node: "/yard/scanner" } } }] },
    definitionsWithTrait: { action: "send", channel: gates, bindings: { $ref: "#/components/operationBindings/rosRole" }, traits: [{ bindings: { ros2: { node: "/yard/lights" } } }] },
    definitionsOnly: { action: "receive", channel: gates, bindings: { $ref: "#/components/operationBindings/rosRole" } },
    scalarPublish: { action: "send", channel: gates, bindings: { ros2: "publisher" }, traits: [{ bindings: { ros2: { node: "/yard/reefer" } } }] },
    externalTrait: { action: "receive", channel: gates, bindings: { ros2: {} }, traits: [{ $ref: "./yard-traits.yaml#/operationTraits/rosNode" }] },
    danglingTrait: { action: "send", channel: gates, bindings: { ros2: {} }, traits: [{ $ref: "#/components/operationTraits/doesNotExist" }] },
    traitDefinition: { action: "receive", channel: gates, bindings: { ros2: { node: "/yard/tower" } }, traits: [{ bindings: { $ref: "#/components/operationBindings/rosRole" } }] },
    emptyDefinition: { action: "send", channel: gates, bindings: { ros2: { node: "/yard/weighbridge" } }, traits: [{ bindings: { $ref: "#/components/operationBindings/empty" } }] },
    cyclic: { action: "receive", channel: gates, bindings: { sqs: {} }, traits: [{ $ref: "#/components/operationTraits/loopA" }] },
    tupleOperation: { action: "send", channel: gates, bindings: { ros2: {} }, traits: [[{ bindings: { ros2: { role: "publisher", node: "/yard/ignored" } } }, {}]] },
    escaped: { action: "send", channel: gates, traits: [{ $ref: "#/components/operationTraits/sns~1fanout" }] },
    escapedPercent: { action: "receive", channel: gates, traits: [{ $ref: "#/components/operationTraits/sns%20fanout%20v2" }] },
    escapedTilde: { action: "send", channel: gates, traits: [{ $ref: "#/components/operationTraits/ros~0node" }] },
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
