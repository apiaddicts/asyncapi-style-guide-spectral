const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const amount = { type: "object", required: ["paymentId", "amount"], properties: { paymentId: { type: "string" }, amount: { type: "number", minimum: 0 }, currency: { type: ["string", "null"] } } };

module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Card Payments Shared References",
    version: "2.1.0",
    description: "Authorization, capture, refund and FX events sharing messages, channels and trait lists through local references.",
  },
  servers: { kafka: { host: "kafka.payments.example.io:9093", protocol: "kafka-secure" } },
  channels: {
    authorizations: {
      address: "payments.cdc.authorizations.v1",
      messages: { paymentAuthorized: { $ref: "#/components/messages/paymentAuthorized" } },
    },
    captures: {
      address: "payments.cdc.captures.v1",
      messages: { paymentAuthorized: { $ref: "#/components/messages/paymentAuthorized" }, paymentCaptured: { $ref: "#/components/messages/paymentCaptured" } },
    },
    refunds: { $ref: "#/components/channels/refunds" },
    refundsMirror: { $ref: "#/components/channels/refunds" },
    fxRates: { address: "payments.cdc.fx.v1", messages: { fxRateFixed: { $ref: "#/components/messages/fxRateFixed" } } },
  },
  operations: {
    publishAuthorization: { action: "send", channel: { $ref: "#/channels/authorizations" }, messages: [{ $ref: "#/channels/authorizations/messages/paymentAuthorized" }] },
    receiveCapture: { action: "receive", channel: { $ref: "#/channels/captures" }, messages: [{ $ref: "#/channels/captures/messages/paymentCaptured" }] },
    receiveRefund: { action: "receive", channel: { $ref: "#/channels/refunds" }, messages: [{ $ref: "#/components/channels/refunds/messages/refundRequested" }] },
    publishFxRate: { action: "send", channel: { $ref: "#/channels/fxRates" }, messages: [{ $ref: "#/channels/fxRates/messages/fxRateFixed" }] },
  },
  components: {
    channels: {
      refunds: { address: "payments.cmd.refunds.v1", messages: { refundRequested: { name: "refundRequested", traits: [], payload: amount } } },
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
