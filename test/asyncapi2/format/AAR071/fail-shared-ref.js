const payment = { type: "object", properties: { paymentId: { type: "string" }, amount: { type: "number", format: "double" } } };

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Payments Shared Messages", version: "2.1.0" },
  channels: {
    "payments.cdc.authorized.v1": {
      publish: { operationId: "publishAuthorized", message: { $ref: "#/components/messages/paymentAuthorized" } },
      subscribe: {
        operationId: "receiveAuthorized",
        message: {
          oneOf: [
            { $ref: "#/components/messages/paymentAuthorized" },
            { $ref: "#/components/messages/aliasOfAuthorized" },
            { $ref: "#/components/messages/paymentCaptured" },
          ],
        },
      },
    },
    "payments.cdc.captured.v1": {
      publish: { operationId: "publishCaptured", message: { $ref: "#/components/messages/aliasOfAlias", examples: [{ payload: { paymentId: "pay-1" } }] } },
      subscribe: { operationId: "receiveCaptured", message: { $ref: "#/components/messages/paymentCaptured" } },
    },
    "payments.cdc.refunded.v1": { $ref: "#/components/channels/refunds" },
    "payments.cdc.disputes.v1": { $ref: "#/components/channels/refunds" },
    "payments.cdc.external.v1": {
      publish: { operationId: "publishChargeback", message: { $ref: "./shared/payments.yaml#/components/messages/chargeback" } },
      subscribe: { operationId: "receiveUnknown", message: { $ref: "#/components/messages/doesNotExist" } },
    },
  },
  components: {
    channels: {
      refunds: {
        publish: { operationId: "publishRefund", message: { $ref: "#/components/messages/refundIssued" } },
        subscribe: { operationId: "receiveRefundRejection", message: { name: "refundRejected", payload: payment, examples: [] } },
      },
    },
    messages: {
      paymentAuthorized: { name: "paymentAuthorized", payload: payment },
      aliasOfAuthorized: { $ref: "#/components/messages/paymentAuthorized" },
      aliasOfAlias: { $ref: "#/components/messages/aliasOfAuthorized" },
      paymentCaptured: { name: "paymentCaptured", payload: payment, examples: [{ name: "card", payload: { paymentId: "pay-77", amount: 12.5 } }] },
      refundIssued: { name: "refundIssued", payload: payment, examples: [{ name: "partialRefund", summary: "Half of the order is refunded." }] },
      loopA: { $ref: "#/components/messages/loopB" },
      loopB: { $ref: "#/components/messages/loopA" },
      sharedExamples: { name: "sharedExamples", payload: payment, examples: { $ref: "#/components/messages/paymentCaptured/examples" } },
      sharedEmptyExamples: { name: "sharedEmptyExamples", payload: payment, examples: { $ref: "#/components/channels/refunds/subscribe/message/examples" } },
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
