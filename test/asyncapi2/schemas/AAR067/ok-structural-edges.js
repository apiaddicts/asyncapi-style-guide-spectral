module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Structural Edge Cases", version: "1.0.0" },
  defaultContentType: null,
  channels: {
    nullChannel: null,
    scalarChannel: "retail.cmd.orders.placed.v1",
    arrayChannel: [{ publish: { message: { contentType: "text/json" } } }],
    refChannel: { $ref: "#/components/channels/missing" },
    nullOperations: { publish: null, subscribe: "subscribe" },
    refOperation: { publish: { $ref: "#/components/operations/x" } },
    arrayOperation: { subscribe: [{ message: { contentType: "text/json" } }] },
    nullMessages: {
      publish: { operationId: "a", message: null },
      subscribe: { operationId: "b", message: "orderPlaced" },
    },
    arrayMessage: { publish: { operationId: "c", message: [{ contentType: "text/json" }] } },
    oneOfEdges: {
      publish: { operationId: "d", message: { oneOf: [null, 1, "x", [], { $ref: "#/components/messages/none" }] } },
      subscribe: { operationId: "e", message: { oneOf: { contentType: "text/json" }, contentType: "application/json" } },
    },
    traitEdges: {
      publish: {
        operationId: "f",
        message: { messageId: "g", traits: { contentType: "text/json" } },
      },
      subscribe: { operationId: "h", message: { messageId: "i", traits: "text/json" } },
    },
    nestedTraitArrays: {
      publish: {
        operationId: "n",
        message: { messageId: "o", traits: [null, 7, "text/json", [], [null], [[{ contentType: "text/json" }]], [{ $ref: "#/components/messageTraits/x" }, { contentType: "text/json" }]] },
      },
    },
    v3StyleLeftovers: {
      address: "orders",
      messages: { orderPlaced: { contentType: "text/json" } },
    },
    "x-internal": {
      publish: { operationId: "j", message: { messageId: "k", contentType: "application/avro" } },
    },
    bindingsAndExtensions: {
      bindings: { mqtt: { contentType: "text/json" }, http: { headers: { properties: { contentType: { const: "x" } } } } },
      publish: {
        operationId: "l",
        bindings: { kafka: { contentType: "text/json" } },
        "x-contentType": "text/json",
        message: {
          messageId: "m",
          contentType: "application/json",
          bindings: { mqtt: { contentType: "text/json", bindingVersion: "0.2.0" } },
          correlationId: { location: "$message.header#/contentType" },
          "x-default-content-type": "text/json",
          examples: [{ headers: { contentType: "text/json" }, payload: { contentType: "text/json" } }],
        },
      },
    },
  },
  operations: {
    placeOrder: { action: "send", messages: [{ contentType: "text/json" }] },
  },
  components: {
    channels: null,
    messages: [{ contentType: "text/json" }],
    messageTraits: {
      nullTrait: null,
      scalarTrait: "text/json",
      arrayTrait: [{ contentType: "text/json" }],
      refTrait: { $ref: "#/components/messageTraits/nullTrait" },
    },
    schemas: { contentType: { type: "string", enum: ["text/json"] } },
    "x-messages": { legacy: { contentType: "text/json" } },
  },
};
