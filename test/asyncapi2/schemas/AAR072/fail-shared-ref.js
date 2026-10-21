const issue = (index, trail, text) => `AAR072: examples[${index}].${trail} ${text}.`;
const REASONS = 'must be one of: "FRAUD", "DUPLICATE", "NOT_RECEIVED"';
const C = "channels.payments.cdc.chargebacks.v1";

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Payments Shared Definitions", version: "2.0.0", description: "Payment events that share messages, channels and examples through references." },
    channels: {
      "payments.cdc.authorizations.v1": {
        publish: { operationId: "publishAuthorization", message: { $ref: "#/components/messages/paymentAuthorized" } },
        subscribe: {
          operationId: "receiveAuthorization",
          message: { oneOf: [{ $ref: "#/components/messages/paymentAuthorized" }, { $ref: "#/components/messages/paymentAlias" }] },
        },
      },
      "payments.cdc.refunds.v1": { $ref: "#/components/channels/refunds" },
      "payments.sys.ledger.v1": {
        publish: { operationId: "publishLedger", message: { $ref: "#/components/x-library/messages/ledgerPosted" } },
        subscribe: { operationId: "receiveLedger", message: { $ref: "#/components/messages/ledgerAlias" } },
      },
      "payments.sys.archive.v1": { $ref: "#/components/x-library/channels/archive" },
      "payments.cdc.chargebacks.v1": {
        publish: {
          operationId: "publishChargeback",
          message: { name: "chargebackOpened", payload: { $ref: "#/components/schemas/Chargeback" }, examples: { $ref: "#/components/x-example-sets/chargebacks" } },
        },
        subscribe: {
          operationId: "receiveChargeback",
          message: {
            name: "chargebackResolved",
            payload: { $ref: "#/components/schemas/Chargeback" },
            examples: [
              { $ref: "#/components/x-examples/badChargeback" },
              { payload: { $ref: "#/components/x-payloads/badChargeback" } },
              { payload: { chargebackId: "CB-3", amount: { $ref: "#/components/x-values/negativeAmount" }, cardholder: { $ref: "#/components/x-values/cardholder" } } },
              { payload: { $ref: "./fixtures/chargeback.json" } },
              { payload: { $ref: "#/components/x-payloads/missing" } },
              { payload: { chargebackId: "CB-6", amount: { $ref: "./fixtures/amount.json" } } },
              { $ref: "./fixtures/example.json" },
              { $ref: "#/components/x-examples/missing" },
            ],
          },
        },
      },
      "payments.cdc.external.v1": {
        publish: { operationId: "publishExternal", message: { $ref: "./messages/payment.yaml#/PaymentCaptured" } },
        subscribe: { operationId: "receiveCycle", message: { $ref: "#/components/messages/cycleA" } },
      },
      "payments.cdc.escaped.v1": {
        publish: { operationId: "publishEscaped", message: { $ref: "#/components/messages/refund~1v2" } },
        subscribe: { operationId: "receiveEscaped", message: { $ref: "#/components/messages/refund%20legacy" } },
      },
      "payments.cdc.external-channel.v1": { $ref: "./channels/external.yaml#/channel" },
      "payments.cdc.dangling.v1": { $ref: "#/components/channels/missing" },
    },
    components: {
      channels: {
        refunds: {
          subscribe: {
            operationId: "receiveRefund",
            message: {
              name: "refundIssued",
              payload: { type: "object", properties: { refundId: { type: "string" }, amount: { type: "number", exclusiveMinimum: 0 } } },
              examples: [{ payload: { refundId: "RF-1", amount: 0 } }],
            },
          },
        },
      },
      messages: {
        paymentAuthorized: {
          name: "paymentAuthorized",
          payload: { $ref: "#/components/schemas/Payment" },
          examples: [{ payload: { paymentId: "PAY-1", amount: -5, currency: "EUR" } }],
        },
        paymentAlias: { $ref: "#/components/messages/paymentAuthorized" },
        ledgerAlias: { $ref: "#/components/x-library/messages/ledgerPosted" },
        "refund/v2": { name: "refundV2", payload: { type: "object", properties: { refundId: { type: "string" } } }, examples: [{ payload: { refundId: 12 } }] },
        "refund legacy": { name: "refundLegacy", payload: { type: "object", required: ["legacyId"] }, examples: [{ payload: {} }] },
        cycleA: { $ref: "#/components/messages/cycleB" },
        cycleB: { $ref: "#/components/messages/cycleA" },
      },
      schemas: {
        Payment: {
          type: "object",
          required: ["paymentId", "amount", "currency"],
          properties: { paymentId: { type: "string" }, amount: { type: "number", minimum: 0 }, currency: { type: "string", pattern: "^[A-Z]{3}$" } },
        },
        Cardholder: { type: "object", properties: { email: { type: "string", format: "email" } } },
        Chargeback: {
          type: "object",
          required: ["chargebackId", "amount"],
          properties: {
            chargebackId: { type: "string" },
            amount: { type: "number", minimum: 0 },
            reason: { type: "string", enum: ["FRAUD", "DUPLICATE", "NOT_RECEIVED"] },
            cardholder: { $ref: "#/components/schemas/Cardholder" },
          },
        },
      },
      "x-library": {
        messages: {
          ledgerPosted: {
            name: "ledgerPosted",
            payload: { type: "object", required: ["entryId", "debit", "credit"], properties: { entryId: { type: "string" }, debit: { type: "number" }, credit: { type: "number" } } },
            examples: [{ payload: { entryId: "LE-1", debit: "100.00", credit: 100 } }],
          },
        },
        channels: {
          archive: {
            publish: {
              operationId: "publishArchive",
              message: {
                name: "paymentArchived",
                payload: { type: "object", properties: { archivedAt: { type: "string", format: "date-time" } } },
                examples: [{ payload: { archivedAt: "yesterday" } }],
              },
            },
          },
        },
      },
      "x-example-sets": {
        chargebacks: [{ payload: { chargebackId: "CB-1", amount: 10, reason: "FRAUD" } }, { payload: { chargebackId: 2, amount: 10, reason: "UNKNOWN" } }],
      },
      "x-examples": { badChargeback: { payload: { chargebackId: "CB-2", amount: "10" } } },
      "x-payloads": { badChargeback: { chargebackId: "CB-4", amount: 10, reason: "LOST" } },
      "x-values": { negativeAmount: -3, cardholder: { email: "not-an-email" } },
    },
  },
  expected: [
    ["components.messages.paymentAuthorized.examples.0.payload.amount", issue(0, "payload.amount", "must be >= 0")],
    ["components.channels.refunds.subscribe.message.examples.0.payload.amount", issue(0, "payload.amount", "must be > 0")],
    ["components.x-library.messages.ledgerPosted.examples.0.payload.debit", issue(0, "payload.debit", "must be a number")],
    ["components.x-library.channels.archive.publish.message.examples.0.payload.archivedAt", issue(0, "payload.archivedAt", 'must match format "date-time"')],
    [`${C}.publish.message.examples`, issue(1, "payload.chargebackId", "must be a string")],
    [`${C}.publish.message.examples`, issue(1, "payload.reason", REASONS)],
    [`${C}.subscribe.message.examples.0`, issue(0, "payload.amount", "must be a number")],
    [`${C}.subscribe.message.examples.1.payload`, issue(1, "payload.reason", REASONS)],
    [`${C}.subscribe.message.examples.2.payload.amount`, issue(2, "payload.amount", "must be >= 0")],
    [`${C}.subscribe.message.examples.2.payload.cardholder`, issue(2, "payload.cardholder.email", 'must match format "email"')],
    ["components.messages.refund/v2.examples.0.payload.refundId", issue(0, "payload.refundId", "must be a string")],
    ["components.messages.refund legacy.examples.0.payload", issue(0, "payload", "must have required property 'legacyId'")],
  ],
};
