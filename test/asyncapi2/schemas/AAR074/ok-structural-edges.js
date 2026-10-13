const hidden = { type: "object", properties: { hidden_field: { type: "string" } } };

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Structural Edges", version: "1.0.0", description: "Nodes of unexpected types and 3.x-only structures." },
  channels: {
    nullChannel: null,
    scalarChannel: "orders",
    numericChannel: 42,
    arrayChannel: [{ publish: { message: { payload: hidden } } }],
    emptyChannel: {},
    nullOperations: { publish: null, subscribe: "receiveOrders", parameters: null },
    arrayOperations: { publish: [{ message: { payload: hidden } }], parameters: [{ schema: hidden }] },
    refOperation: { publish: { $ref: "#/components/x-operations/hidden" } },
    scalarMessages: { publish: { message: "orderPlaced" }, subscribe: { message: null } },
    arrayMessage: { publish: { message: [{ payload: hidden }] } },
    emptyMessage: { publish: { message: {} }, subscribe: { message: { oneOf: [] } } },
    oneOfEdges: { publish: { message: { oneOf: [null, "orderPlaced", 42, [], [{ payload: hidden }], { oneOf: null }] } } },
    oneOfWins: { publish: { message: { oneOf: [{ payload: { type: "object" } }], payload: hidden, headers: hidden } } },
    unusablePayloads: {
      publish: { message: { payload: null, headers: null, traits: null } },
      subscribe: { message: { payload: "order_id", headers: 42, traits: "tracing", schemaFormat: "application/vnd.aai.asyncapi;version=2.6.0" } },
    },
    booleanSchemas: { publish: { message: { payload: true, headers: false } } },
    traitEdges: {
      publish: {
        message: {
          traits: [null, 42, "tracing", [], [null], [42, {}], { $ref: "#/components/messageTraits/missing" }, { $ref: "#" }, { headers: null }, { headers: "hidden_field" }],
        },
      },
      subscribe: { message: { traits: { headers: hidden } } },
    },
    "orders/{orderId}": {
      parameters: {
        nullParameter: null,
        scalarParameter: "orderId",
        noSchema: { description: "No schema." },
        nullSchema: { schema: null },
        scalarSchema: { schema: "string" },
        danglingParameter: { $ref: "#/components/parameters/missing" },
        externalParameter: { $ref: "./parameters.yaml#/orderId" },
      },
    },
    v3Shape: {
      address: "orders.v3",
      messages: { orderPlaced: { payload: hidden } },
      publish: {
        message: {
          payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Hidden", fields: [{ name: "hidden_field", type: "string" }] } },
        },
      },
    },
  },
  operations: { sendOrder: { action: "send", messages: [{ $ref: "#/components/x-messages/hidden" }] } },
  components: {
    schemas: { nullSchema: null, scalarSchema: "string", numericSchema: 7, emptyUnion: [], primitiveUnion: ["null", "string"], booleanSchema: true, emptySchema: {} },
    messages: { nullMessage: null, scalarMessage: "orderPlaced", arrayMessage: [{ payload: hidden }] },
    messageTraits: { nullTrait: null, scalarTrait: "tracing", noHeaders: { contentType: "application/json" }, danglingTrait: { $ref: "#/components/messageTraits/missing" } },
    parameters: { nullParameter: null, noSchema: { description: "No schema." } },
    channels: { nullChannel: null, arrayChannel: [{ publish: { message: { payload: hidden } } }] },
    operations: { sendOrder: { action: "send", messages: [{ $ref: "#/components/x-messages/hidden" }] } },
    replies: { orderReply: { messages: [{ $ref: "#/components/x-messages/hidden" }] } },
    "x-operations": { hidden: { message: { payload: hidden } } },
    "x-messages": { hidden: { payload: hidden } },
    "x-schemas": { hidden },
  },
};
