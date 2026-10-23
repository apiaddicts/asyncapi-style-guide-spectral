const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const amount = { type: "object", required: ["paymentId", "amount"], properties: { paymentId: { type: "string" }, amount: { type: "number", minimum: 0 }, currency: { type: ["string", "null"] } } };

module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Card Payments Shared References",
    version: "1.4.0",
    description: "Authorization, capture, refund and FX events sharing messages, channels and trait lists through local references.",
  },
  servers: { kafka: { url: "kafka.payments.example.io:9093", protocol: "kafka-secure" } },
  channels: {
    "payments.cdc.authorizations.v1": {
      publish: { operationId: "publishAuthorization", message: { $ref: "#/components/messages/paymentAuthorized" } },
      subscribe: { operationId: "receiveAuthorization", message: { $ref: "#/components/messages/paymentAuthorized" } },
    },
    "payments.cdc.captures.v1": {
      subscribe: { operationId: "receiveCapture", message: { oneOf: [{ $ref: "#/components/messages/paymentAuthorized" }, { $ref: "#/components/messages/paymentCaptured" }] } },
    },
    "payments.cmd.refunds.v1": { $ref: "#/components/channels/refunds" },
    "payments.cmd.refunds.mirror.v1": { $ref: "#/components/channels/refunds" },
    "payments.cdc.fx.v1": { publish: { operationId: "publishFxRate", message: { $ref: "#/components/messages/fxRateFixed" } } },
  },
  components: {
    channels: {
      refunds: { subscribe: { operationId: "receiveRefund", message: { name: "refundRequested", traits: [], payload: amount } } },
    },
    messages: {
      paymentAuthorized: { name: "paymentAuthorized", payload: amount },
      paymentCaptured: { name: "paymentCaptured", traits: { $ref: "#/components/x-trait-lists/shared%20empty" }, payload: amount },
      fxRateFixed: { name: "fxRateFixed", traits: [{ $ref: "#/components/messageTraits/fx~1rates" }, { $ref: "#/components/messageTraits/settlement%20batch" }], payload: { type: "object" } },
      escapedTilde: { name: "escapedTilde", traits: [{ $ref: "#/components/messageTraits/tilde~0key" }], payload: { type: "object" } },
      malformedPercent: { name: "malformedPercent", traits: [{ $ref: "#/components/messageTraits/fx%E0%A4%A" }], payload: { type: "object" } },
      missingSlash: { name: "missingSlash", traits: [{ $ref: "#components/messageTraits/commonHeaders" }], payload: { type: "object" } },
      rootPointer: { name: "rootPointer", traits: [{ $ref: "#" }], payload: { type: "object" } },
      nonStringRef: { name: "nonStringRef", traits: [{ $ref: 7 }], payload: { type: "object" } },
      cyclicList: { name: "cyclicList", traits: { $ref: "#/components/x-trait-lists/loopA" }, payload: { type: "object" } },
      sharedEmptyA: { name: "sharedEmptyA", traits: { $ref: "#/components/x-trait-lists/empty" }, payload: amount },
      sharedEmptyB: { name: "sharedEmptyB", traits: { $ref: "#/components/x-trait-lists/empty" }, payload: amount },
      tenantChain: { name: "tenantChain", traits: [trait("tenantAware")], payload: amount },
      percentTracing: { name: "percentTracing", traits: [{ $ref: "#/components/messageTraits/trac%69ng" }], payload: amount },
      viaSharedList: { name: "viaSharedList", traits: { $ref: "#/components/x-trait-lists/standard" }, payload: amount },
      viaSharedListAgain: { name: "viaSharedListAgain", traits: { $ref: "#/components/x-trait-lists/standard" }, payload: amount },
    },
    messageTraits: {
      commonHeaders: { headers: { type: "object", properties: { traceId: { type: "string" } } } },
      tracing: { correlationId: { location: "$message.header#/traceparent" } },
      "fx/rates": { headers: { type: "object", properties: { rateSource: { type: "string" } } } },
      "settlement batch": { headers: { type: "object", properties: { batchId: { type: "string" } } } },
      "tilde~key": { headers: { type: "object", properties: { legacy: { type: "boolean" } } } },
      tenantAware: trait("commonHeaders"),
    },
    "x-trait-lists": {
      empty: [],
      "shared empty": [],
      standard: [trait("commonHeaders"), trait("tracing")],
      loopA: { $ref: "#/components/x-trait-lists/loopB" },
      loopB: { $ref: "#/components/x-trait-lists/loopA" },
    },
  },
};
