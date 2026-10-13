const strict = { type: "object", required: ["id"], additionalProperties: false, properties: { id: { type: "string" } } };

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Structural Edge Cases", version: "1.0.0" },
  channels: {
    nullChannel: null,
    scalarChannel: "orders",
    arrayChannel: [{ publish: { message: { payload: strict, examples: [{ payload: {} }] } } }],
    emptyChannel: {},
    operations: {
      publish: null,
      subscribe: "receiveOrder",
    },
    arrayOperation: { publish: [{ message: { payload: strict, examples: [{ payload: {} }] } }] },
    refOperation: { publish: { $ref: "#/components/x-operations/badPublish" }, subscribe: { $ref: "./operations.yaml#/receive" } },
    messageShapes: {
      publish: { operationId: "nullMessage", message: null },
      subscribe: { operationId: "scalarMessage", message: "orderPlaced" },
    },
    arrayMessage: { publish: { operationId: "arrayMessage", message: [{ payload: strict, examples: [{ payload: {} }] }] } },
    emptyMessage: { publish: { operationId: "emptyMessage", message: {} } },
    oneOfEdges: {
      publish: { operationId: "emptyOneOf", message: { oneOf: [] } },
      subscribe: { operationId: "oddOneOf", message: { oneOf: [null, 42, "x", [], {}, { $ref: "./messages.yaml#/External" }, { $ref: "#/components/messages/missing" }] } },
    },
    noSchemas: {
      publish: { operationId: "noSchemas", message: { name: "noSchemas", examples: [{ payload: { anything: true }, headers: { any: 1 } }, { payload: null }, { headers: null }] } },
      subscribe: { operationId: "nullSchemas", message: { name: "nullSchemas", payload: null, headers: null, examples: [{ payload: 42, headers: "x" }] } },
    },
    unusableExamples: {
      publish: {
        operationId: "unusableExamples",
        message: { oneOf: [
          { name: "nullExamples", payload: strict, examples: null },
          { name: "objectExamples", payload: strict, examples: { payload: {} } },
          { name: "scalarExamples", payload: strict, examples: "orderPlaced" },
          { name: "emptyExamples", payload: strict, examples: [] },
          { name: "oddItems", payload: strict, examples: [null, 42, "x", [], [{ payload: {} }], {}, { name: "label", summary: "no payload" }, { Payload: {} }, { "x-payload": {} }] },
          { name: "refItems", payload: strict, examples: [{ $ref: "./examples.yaml#/order" }, { $ref: "#/components/x-examples/missing" }, { $ref: 42 }] },
          { name: "externalList", payload: strict, examples: { $ref: "./examples.yaml#/list" } },
          { name: "danglingList", payload: strict, examples: { $ref: "#/components/x-example-sets/missing" } },
          { name: "listToObject", payload: strict, examples: { $ref: "#/components/x-example-sets/notAList" } },
        ] },
      },
      subscribe: {
        operationId: "externalSchemas",
        message: { name: "externalSchemas", payload: { $ref: "./schemas/order.json" }, headers: { $ref: "../shared/headers.json#/TraceHeaders" }, examples: [{ payload: { id: 1, extra: true }, headers: 5 }] },
      },
    },
    ignoredFormats: {
      publish: {
        operationId: "ignoredFormats",
        message: { oneOf: [
          { name: "protobuf", schemaFormat: "application/vnd.google.protobuf;version=3", payload: strict, examples: [{ payload: {} }] },
          { name: "raml", schemaFormat: "application/raml+yaml;version=1.0", payload: strict, examples: [{ payload: {} }] },
          { name: "xsd", schemaFormat: "application/xml", payload: strict, examples: [{ payload: {} }] },
          { name: "numericFormat", schemaFormat: 2, payload: strict, examples: [{ payload: {} }] },
          { name: "emptyFormat", schemaFormat: "", payload: strict, examples: [{ payload: {} }] },
        ] },
      },
    },
    externalTraits: {
      publish: {
        operationId: "externalTraits",
        message: { name: "externalTraits", payload: strict, traits: [{ $ref: "./traits.yaml#/kafka" }], examples: [{ payload: {} }] },
      },
      subscribe: {
        operationId: "externalTraitList",
        message: { name: "externalTraitList", payload: strict, traits: { $ref: "./traits.yaml#/lists/kafka" }, examples: [{ payload: {} }] },
      },
    },
    schemaExamplesOnly: {
      publish: {
        operationId: "schemaExamplesOnly",
        message: {
          name: "schemaExamplesOnly",
          payload: { ...strict, examples: [{ id: 1, extra: true }], example: { extra: true }, default: { id: 2 } },
          "x-examples": [{ payload: { id: 1 } }],
          examples: [{ payload: { id: "a" } }],
        },
      },
    },
    v3Shapes: {
      address: "orders",
      messages: { orderPlaced: { payload: strict, examples: [{ payload: {} }] } },
    },
  },
  operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/v3Shapes" }, messages: [{ payload: strict, examples: [{ payload: {} }] }] } },
  components: {
    channels: null,
    messages: {
      nullMessage: null,
      scalarMessage: "orderPlaced",
      arrayMessage: [{ payload: strict, examples: [{ payload: {} }] }],
      externalMessage: { $ref: "./messages.yaml#/OrderPlaced" },
      danglingMessage: { $ref: "#/components/messages/nowhere" },
      nonStringRef: { $ref: 42 },
    },
    messageTraits: { badExamples: { payload: strict, examples: [{ payload: {} }] } },
    schemas: { Strict: strict },
    "x-operations": { badPublish: { message: { payload: strict, examples: [{ payload: {} }] } } },
    "x-example-sets": { notAList: { payload: {} } },
    "x-messages": { orphan: { payload: strict, examples: [{ payload: {} }] } },
  },
  "x-messages": { orphan: { payload: strict, examples: [{ payload: {} }] } },
};
