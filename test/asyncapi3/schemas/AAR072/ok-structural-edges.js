const strict = { type: "object", required: ["id"], additionalProperties: false, properties: { id: { type: "string" } } };
const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Structural Edge Cases", version: "1.0.0" },
  channels: {
    nullChannel: null,
    scalarChannel: "orders",
    arrayChannel: [{ messages: { m: { payload: strict, examples: [{ payload: {} }] } } }],
    emptyChannel: {},
    noMessages: { address: "orders" },
    nullMessages: { address: "orders", messages: null },
    arrayMessages: { address: "orders", messages: [{ payload: strict, examples: [{ payload: {} }] }] },
    oddMessages: {
      address: null,
      messages: {
        nullMessage: null,
        scalarMessage: "orderPlaced",
        arrayMessage: [{ payload: strict, examples: [{ payload: {} }] }],
        emptyMessage: {},
        externalMessage: { $ref: "./messages.yaml#/OrderPlaced" },
        danglingMessage: { $ref: "#/components/messages/nowhere" },
        nonStringRef: { $ref: 42 },
      },
    },
    noSchemas: {
      address: "no-schemas",
      messages: {
        noSchemas: { examples: [{ payload: { anything: true }, headers: { any: 1 } }, { payload: null }, { headers: null }] },
        nullSchemas: { payload: null, headers: null, examples: [{ payload: 42, headers: "x" }] },
        multiFormatWithoutSchema: { payload: { schemaFormat: AVRO }, headers: { schemaFormat: AVRO, schema: null }, examples: [{ payload: 1, headers: 2 }] },
      },
    },
    unusableExamples: {
      address: "unusable",
      messages: {
        nullExamples: { payload: strict, examples: null },
        objectExamples: { payload: strict, examples: { payload: {} } },
        scalarExamples: { payload: strict, examples: "orderPlaced" },
        emptyExamples: { payload: strict, examples: [] },
        oddItems: { payload: strict, examples: [null, 42, "x", [], [{ payload: {} }], {}, { name: "label", summary: "no payload" }, { Payload: {} }, { "x-payload": {} }] },
        refItems: { payload: strict, examples: [{ $ref: "./examples.yaml#/order" }, { $ref: "#/components/x-examples/missing" }, { $ref: 42 }] },
        externalList: { payload: strict, examples: { $ref: "./examples.yaml#/list" } },
        danglingList: { payload: strict, examples: { $ref: "#/components/x-example-sets/missing" } },
        listToObject: { payload: strict, examples: { $ref: "#/components/x-example-sets/notAList" } },
        externalSchemas: {
          payload: { $ref: "./schemas/order.json" },
          headers: { schemaFormat: "application/schema+json;version=draft-07", schema: { $ref: "../shared/headers.json#/TraceHeaders" } },
          examples: [{ payload: { id: 1, extra: true }, headers: 5 }],
        },
        externalMultiFormat: { payload: { $ref: "./schemas/multi-format.yaml#/OrderAvro" }, examples: [{ payload: "x" }] },
      },
    },
    ignoredFormats: {
      address: "ignored",
      messages: {
        protobuf: { payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: strict }, examples: [{ payload: {} }] },
        raml: { payload: { schemaFormat: "application/raml+yaml;version=1.0", schema: strict }, examples: [{ payload: {} }] },
        xsd: { payload: { schemaFormat: "application/xml", schema: strict }, examples: [{ payload: {} }] },
        numericFormat: { payload: { schemaFormat: 3, schema: strict }, examples: [{ payload: {} }] },
        emptyFormat: { payload: { schemaFormat: "", schema: strict }, examples: [{ payload: {} }] },
        protobufHeaders: { headers: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: strict }, examples: [{ headers: {} }] },
      },
    },
    externalTraits: {
      address: "external-traits",
      messages: {
        externalTraits: { payload: strict, traits: [{ $ref: "./traits.yaml#/kafka" }], examples: [{ payload: {} }] },
        externalTraitList: { payload: strict, traits: { $ref: "./traits.yaml#/lists/kafka" }, examples: [{ payload: {} }] },
      },
    },
    schemaExamplesOnly: {
      address: "schema-examples",
      messages: {
        schemaExamplesOnly: {
          payload: { ...strict, examples: [{ id: 1, extra: true }], example: { extra: true }, default: { id: 2 } },
          "x-examples": [{ payload: { id: 1 } }],
          examples: [{ payload: { id: "a" } }],
        },
      },
    },
    v2Shapes: {
      address: "legacy",
      publish: { message: { payload: strict, examples: [{ payload: {} }] } },
      subscribe: { message: { oneOf: [{ payload: strict, examples: [{ payload: {} }] }] } },
    },
  },
  operations: {
    nullOperation: null,
    inlineMessages: { action: "send", channel: { $ref: "#/channels/noSchemas" }, messages: [{ payload: strict, examples: [{ payload: {} }] }] },
    inlineReply: {
      action: "receive",
      channel: { $ref: "#/channels/noSchemas" },
      reply: { address: { location: "$message.header#/replyTo" }, messages: [{ payload: strict, examples: [{ payload: {} }] }] },
    },
  },
  components: {
    channels: null,
    messages: {
      nullMessage: null,
      scalarMessage: "orderPlaced",
      arrayMessage: [{ payload: strict, examples: [{ payload: {} }] }],
      externalMessage: { $ref: "./messages.yaml#/OrderPlaced" },
    },
    operations: { inline: { action: "send", messages: [{ payload: strict, examples: [{ payload: {} }] }] } },
    replies: { inline: { messages: [{ payload: strict, examples: [{ payload: {} }] }] } },
    messageTraits: { badExamples: { payload: strict, examples: [{ payload: {} }] } },
    schemas: { Strict: strict },
    "x-example-sets": { notAList: { payload: {} } },
    "x-messages": { orphan: { payload: strict, examples: [{ payload: {} }] } },
  },
  "x-messages": { orphan: { payload: strict, examples: [{ payload: {} }] } },
};
