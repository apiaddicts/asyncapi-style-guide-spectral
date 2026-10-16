const hidden = { type: "object", properties: { hidden_field: { type: "string" } } };

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Structural Edges", version: "1.0.0", description: "Nodes of unexpected types and 2.x-only structures." },
  channels: {
    nullChannel: null,
    scalarChannel: "orders",
    arrayChannel: [{ messages: { orderPlaced: { payload: hidden } } }],
    emptyChannel: {},
    nullMessages: { address: null, messages: null },
    arrayMessages: { address: "orders", messages: [{ payload: hidden }] },
    messageEdges: { address: "orders", messages: { nullMessage: null, scalarMessage: "orderPlaced", arrayMessage: [{ payload: hidden }], emptyMessage: {}, danglingMessage: { $ref: "#/components/messages/missing" } } },
    payloadEdges: {
      address: "orders",
      messages: {
        nullParts: { payload: null, headers: null, traits: null },
        scalarParts: { payload: "order_id", headers: 42, traits: "tracing" },
        booleanParts: { payload: true, headers: false },
        multiFormatWithoutSchema: { payload: { schemaFormat: "application/schema+json;version=draft-07" }, headers: { schemaFormat: null } },
        multiFormatNullSchema: { payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: null } },
        multiFormatUnknown: { payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: hidden } },
        multiFormatNonString: { payload: { schemaFormat: 42, schema: hidden }, headers: { schemaFormat: ["application/schema+json;version=draft-07"], schema: hidden } },
        danglingPayload: { payload: { $ref: "#/components/schemas/missing" }, headers: { $ref: "./headers.yaml#/Common" } },
      },
    },
    traitEdges: {
      address: "orders",
      messages: {
        traitList: { traits: [null, 42, "tracing", [], [null], [42, {}], { $ref: "#/components/messageTraits/missing" }, { $ref: "#" }, { headers: null }, { headers: "hidden_field" }] },
        traitObject: { traits: { headers: hidden } },
      },
    },
    v2Shape: {
      address: "orders.v2",
      parameters: { orderId: { description: "Order.", schema: hidden }, legacyRef: { $ref: "#/components/parameters/legacy" } },
      publish: { message: { payload: hidden } },
      subscribe: { message: { oneOf: [{ payload: hidden }] } },
      messages: { variants: { oneOf: [{ payload: hidden }, { headers: hidden }] } },
    },
  },
  operations: {
    nullOperation: null,
    scalarOperation: "send",
    noMessages: { action: "send", channel: { $ref: "#/channels/emptyChannel" } },
    messagesNotArray: { action: "send", messages: { $ref: "#/components/x-messages/hidden" } },
    messageEdges: { action: "receive", messages: [null, 42, { $ref: "#/components/messages/missing" }, { $ref: "./messages.yaml#/Order" }] },
    replyEdges: { action: "send", reply: { messages: null } },
    replyRef: { action: "send", reply: { $ref: "#/components/replies/missing" } },
    replyScalar: { action: "send", reply: "orderAck" },
    danglingOperation: { $ref: "#/components/operations/missing" },
  },
  components: {
    schemas: { nullSchema: null, scalarSchema: "string", numericSchema: 7, emptyUnion: [], primitiveUnion: ["null", "string"], booleanSchema: true, emptySchema: {}, multiFormatRaml: { schemaFormat: "application/raml+yaml;version=1.0", schema: hidden } },
    messages: { nullMessage: null, scalarMessage: "orderPlaced", arrayMessage: [{ payload: hidden }], v2Variants: { oneOf: [{ payload: hidden }] } },
    messageTraits: { nullTrait: null, scalarTrait: "tracing", noHeaders: { contentType: "application/json" }, danglingTrait: { $ref: "#/components/messageTraits/missing" } },
    parameters: { legacy: { description: "Legacy parameter.", schema: hidden } },
    channels: { nullChannel: null, arrayChannel: [{ messages: { orderPlaced: { payload: hidden } } }] },
    operations: { nullOperation: null, arrayOperation: [{ messages: [{ $ref: "#/components/x-messages/hidden" }] }] },
    replies: { nullReply: null, scalarReply: "ack", messagesNotArray: { messages: { $ref: "#/components/x-messages/hidden" } }, danglingReply: { $ref: "#/components/replies/missing" } },
    "x-messages": { hidden: { payload: hidden } },
    "x-schemas": { hidden },
  },
};
