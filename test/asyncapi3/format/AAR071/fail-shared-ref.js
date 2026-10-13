const payment = { type: "object", properties: { paymentId: { type: "string" }, amount: { type: "number", format: "double" } } };

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Payments Shared Messages", version: "2.1.0" },
  channels: {
    authorized: {
      address: "payments.cdc.authorized.v1",
      messages: {
        paymentAuthorized: { $ref: "#/components/messages/paymentAuthorized" },
        aliasOfAuthorized: { $ref: "#/components/messages/aliasOfAuthorized" },
        paymentCaptured: { $ref: "#/components/messages/paymentCaptured" },
      },
    },
    captured: {
      address: "payments.cdc.captured.v1",
      messages: {
        paymentCaptured: { $ref: "#/components/messages/paymentCaptured" },
        aliasOfAlias: { $ref: "#/components/messages/aliasOfAlias", examples: [{ payload: { paymentId: "pay-1" } }] },
      },
    },
    refunded: { $ref: "#/components/channels/refunds" },
    disputes: { $ref: "#/components/channels/refunds" },
    external: {
      address: "payments.cdc.external.v1",
      messages: {
        chargeback: { $ref: "./shared/payments.yaml#/components/messages/chargeback" },
        unknown: { $ref: "#/components/messages/doesNotExist" },
      },
    },
  },
  operations: {
    publishAuthorized: {
      action: "send",
      channel: { $ref: "#/channels/authorized" },
      messages: [{ $ref: "#/channels/authorized/messages/paymentAuthorized" }, { $ref: "#/components/messages/paymentAuthorized" }],
      reply: { channel: { $ref: "#/channels/refunded" }, messages: [{ $ref: "#/components/channels/refunds/messages/refundRejected" }] },
    },
    receiveRefund: { action: "receive", channel: { $ref: "#/channels/refunded" }, messages: [{ $ref: "#/components/channels/refunds/messages/refundIssued" }] },
    sharedOperation: { $ref: "#/components/operations/publishRefund" },
  },
  components: {
    channels: {
      refunds: {
        address: "payments.cdc.refunds.v1",
        messages: {
          refundIssued: { $ref: "#/components/messages/refundIssued" },
          refundRejected: { name: "refundRejected", payload: payment, examples: [] },
        },
      },
    },
    operations: {
      publishRefund: { action: "send", channel: { $ref: "#/components/channels/refunds" }, messages: [{ $ref: "#/components/channels/refunds/messages/refundIssued" }] },
    },
    replies: { refundReply: { channel: { $ref: "#/components/channels/refunds" }, messages: [{ $ref: "#/components/channels/refunds/messages/refundRejected" }] } },
    messages: {
      paymentAuthorized: { name: "paymentAuthorized", payload: payment },
      aliasOfAuthorized: { $ref: "#/components/messages/paymentAuthorized" },
      aliasOfAlias: { $ref: "#/components/messages/aliasOfAuthorized" },
      paymentCaptured: { name: "paymentCaptured", payload: payment, examples: [{ name: "card", payload: { paymentId: "pay-77", amount: 12.5 } }] },
      refundIssued: { name: "refundIssued", payload: payment, examples: [{ name: "partialRefund", summary: "Half of the order is refunded." }] },
      loopA: { $ref: "#/components/messages/loopB" },
      loopB: { $ref: "#/components/messages/loopA" },
      sharedExamples: { name: "sharedExamples", payload: payment, examples: { $ref: "#/components/messages/paymentCaptured/examples" } },
      sharedEmptyExamples: { name: "sharedEmptyExamples", payload: payment, examples: { $ref: "#/components/channels/refunds/messages/refundRejected/examples" } },
      chainedExamples: { name: "chainedExamples", payload: payment, examples: { $ref: "#/components/x-example-sets/alias" } },
      escapedSlash: { name: "escapedSlash", payload: payment, examples: { $ref: "#/components/x-example-sets/payments~1captured" } },
      escapedTilde: { name: "escapedTilde", payload: payment, examples: { $ref: "#/components/x-example-sets/fx~0rates" } },
      percentEncoded: { name: "percentEncoded", payload: payment, examples: { $ref: "#/components/x-example-sets/refund%20batch" } },
      malformedPercent: { name: "malformedPercent", payload: payment, examples: { $ref: "#/components/x-example-sets/%E0%A4%A" } },
      missingSlash: { name: "missingSlash", payload: payment, examples: { $ref: "#components/x-example-sets/captured" } },
      rootPointer: { name: "rootPointer", payload: payment, examples: { $ref: "#" } },
      nonStringRef: { name: "nonStringRef", payload: payment, examples: { $ref: 42 } },
      externalExamples: { name: "externalExamples", payload: payment, examples: { $ref: "./shared/examples.yaml#/payments" } },
      itemPointer: { name: "itemPointer", payload: payment, examples: [{ $ref: "#/components/messages/paymentCaptured/examples/0" }] },
      cyclicExamples: { name: "cyclicExamples", payload: payment, examples: { $ref: "#/components/x-example-sets/loop1" } },
    },
    "x-example-sets": {
      captured: [{ payload: { paymentId: "pay-9", amount: 99.99 } }],
      alias: { $ref: "#/components/x-example-sets/captured" },
      "payments/captured": [{ payload: { paymentId: "pay-10" } }],
      "fx~rates": [{ payload: { paymentId: "pay-11" } }],
      "refund batch": [{ payload: { paymentId: "pay-12" } }],
      loop1: { $ref: "#/components/x-example-sets/loop2" },
      loop2: { $ref: "#/components/x-example-sets/loop1" },
    },
  },
};
