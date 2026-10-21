const incomplete = { name: "Not_Evaluated" };
const docs = { url: "https://docs.payments.example.com/tags" };

module.exports = {
  asyncapi: "2.5.0",
  info: {
    title: "Payments Gateway Events",
    version: "4.0.0",
    description: "Degenerate structures around tags and locations AsyncAPI 2.x does not define; nothing here is a Tag object to check.",
    tags: [incomplete],
  },
  tags: [],
  servers: {
    nullServer: null,
    scalarServer: "notAServer",
    refServer: { $ref: "#/components/servers/complete", tags: [incomplete] },
    externalServer: { $ref: "./servers.yaml#/kafka" },
    danglingServer: { $ref: "#/components/servers/missing" },
    nullTags: { url: "kafka:9092", protocol: "kafka", tags: null },
    objectTags: { url: "kafka:9092", protocol: "kafka", tags: incomplete },
    stringTags: { url: "kafka:9092", protocol: "kafka", tags: "Not_A_List" },
    danglingTags: { url: "kafka:9092", protocol: "kafka", tags: { $ref: "#/components/x-tag-sets/missing" } },
    externalTags: { url: "kafka:9092", protocol: "kafka", tags: { $ref: "./tags.yaml#/serverTags" } },
  },
  channels: {
    nullChannel: null,
    scalarChannel: "notAChannel",
    externalChannel: { $ref: "./channels.yaml#/payments" },
    danglingChannel: { $ref: "#/components/channels/missing" },
    refWithSiblings: { $ref: "#/components/channels/complete", publish: { tags: [incomplete] } },
    channelTags: { tags: [incomplete], publish: { operationId: "publishChannelTags" } },
    nullOperations: { publish: null, subscribe: "notAnOperation" },
    externalOperation: { publish: { $ref: "./operations.yaml#/publish", tags: [incomplete] } },
    degenerate: {
      publish: {
        operationId: "publishDegenerate",
        tags: "notAList",
        traits: [null, "notATrait", { $ref: "./traits.yaml#/producer" }, { $ref: "#/components/operationTraits/missing", tags: [incomplete] }, []],
        message: {
          tags: [],
          traits: { tags: [incomplete] },
        },
      },
      subscribe: {
        operationId: "receiveDegenerate",
        traits: { tags: [incomplete] },
        message: {
          oneOf: [null, "notAMessage", { $ref: "#/components/messages/missing" }, { $ref: "./messages.yaml#/refund" }, { $ref: "#/components/messages/complete" }],
          tags: [incomplete],
        },
      },
    },
    arrayMessage: { publish: { operationId: "publishArrayMessage", message: [{ tags: [incomplete] }] } },
    refMessageWithSiblings: { publish: { operationId: "publishRefMessage", message: { $ref: "#/components/messages/complete", tags: [incomplete] } } },
    payloadTags: {
      subscribe: {
        operationId: "receivePayloadTags",
        message: {
          name: "payloadTags",
          payload: {
            type: "object",
            properties: {
              tags: { type: ["array", "null"], items: { type: "object", properties: { name: { type: "string" } } }, examples: [[incomplete]], default: [incomplete] },
            },
          },
          headers: { type: "object", properties: { tags: { type: "string" } } },
          examples: [{ name: "withTags", payload: { tags: [incomplete] }, headers: { tags: "Not_A_Tag" } }],
          bindings: { kafka: { key: { type: "string" }, tags: [incomplete], bindingVersion: "0.4.0" } },
          externalDocs: { url: "https://docs.example.com", tags: [incomplete] },
          correlationId: { location: "$message.header#/correlationId", tags: [incomplete] },
        },
      },
      parameters: { region: { description: "Region.", schema: { type: "string" }, tags: [incomplete] } },
      bindings: { kafka: { topic: "payments", tags: [incomplete], bindingVersion: "0.4.0" } },
    },
  },
  operations: {
    sendPayment: { action: "send", tags: [incomplete] },
  },
  "x-tags": [incomplete],
  "x-shared": { tags: [incomplete] },
  components: {
    servers: { nullServer: null, complete: { url: "kafka:9092", protocol: "kafka", tags: [{ name: "kafka", description: "Kafka cluster.", externalDocs: docs, "x-owner": "payments" }] } },
    channels: { nullChannel: null, complete: { publish: { operationId: "publishComplete", tags: [{ name: "complete", description: "Complete channel.", externalDocs: docs, "x-owner": "payments" }] } } },
    messages: {
      nullMessage: null,
      refMessage: { $ref: "./messages.yaml#/Payment_Message" },
      complete: { name: "complete", tags: [{ name: "complete-message", description: "Complete message.", externalDocs: docs, "x-owner": "payments" }] },
    },
    schemas: {
      Tag: { type: "object", required: ["name"], properties: { name: { type: "string" }, description: { type: ["string", "null"] } } },
      Tagged: { type: "object", properties: { tags: { type: "array", items: { $ref: "#/components/schemas/Tag" } } }, examples: [{ tags: [incomplete] }] },
    },
    operationTraits: { nullTrait: null, noTags: { description: "No tags." }, emptyTags: { tags: [] } },
    messageTraits: { refTrait: { $ref: "#/components/messageTraits/missing", tags: [incomplete] }, externalTrait: { $ref: "./traits.yaml#/headers" } },
    tags: { orders: incomplete },
    operations: { receiveOrder: { action: "receive", tags: [incomplete] } },
    replies: { orderReply: { channel: { $ref: "#/x-channels/replies" } } },
    "x-tag-sets": {},
  },
  "x-channels": { replies: { tags: [incomplete] } },
};
