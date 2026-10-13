const issue = (index, trail, text) => `AAR072: examples[${index}].${trail} ${text}.`;
const REASONS = 'must be one of: "FRAUD", "DUPLICATE", "NOT_RECEIVED"';
const C = "channels.chargebacks.messages";

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Payments Shared Definitions", version: "2.0.0", description: "Payment events that share messages, channels and examples through references." },
    channels: {
      authorizations: {
        address: "payments.cdc.authorizations.v1",
        messages: {
          paymentAuthorized: { $ref: "#/components/messages/paymentAuthorized" },
          paymentAuthorizedAgain: { $ref: "#/components/messages/paymentAlias" },
        },
      },
      refunds: { $ref: "#/components/channels/refunds" },
      refundsMirror: { $ref: "#/components/channels/refunds" },
      ledger: {
        address: "payments.sys.ledger.v1",
        messages: {
          ledgerPosted: { $ref: "#/components/x-library/messages/ledgerPosted" },
          ledgerPostedAlias: { $ref: "#/components/messages/ledgerAlias" },
          crossChannel: { $ref: "#/channels/authorizations/messages/paymentAuthorized" },
        },
      },
      archive: { $ref: "#/components/x-library/channels/archive" },
      chargebacks: {
        address: "payments.cdc.chargebacks.v1",
        messages: {
          chargebackOpened: { name: "chargebackOpened", payload: { $ref: "#/components/schemas/Chargeback" }, examples: { $ref: "#/components/x-example-sets/chargebacks" } },
          chargebackResolved: {
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
            ],
          },
          chargebackAvro: {
            name: "chargebackAvro",
            payload: { $ref: "#/components/schemas/ChargebackAvro" },
            examples: [{ payload: { chargebackId: "CB-7", amount: "10" } }],
          },
        },
      },
      external: {
        address: "payments.cdc.external.v1",
        messages: { captured: { $ref: "./messages/payment.yaml#/PaymentCaptured" }, cycle: { $ref: "#/components/messages/cycleA" } },
      },
      escaped: {
        address: "payments.cdc.escaped.v1",
        messages: { v2: { $ref: "#/components/messages/refund~1v2" }, legacy: { $ref: "#/components/messages/refund%20legacy" } },
      },
      externalChannel: { $ref: "./channels/external.yaml#/channel" },
      danglingChannel: { $ref: "#/components/channels/missing" },
    },
    operations: {
      authorize: {
        action: "send",
        channel: { $ref: "#/channels/authorizations" },
        messages: [{ $ref: "#/channels/authorizations/messages/paymentAuthorized" }],
        reply: { channel: { $ref: "#/channels/refunds" }, messages: [{ $ref: "#/components/x-library/messages/replyOnly" }] },
      },
    },
    components: {
      channels: {
        refunds: {
          address: "payments.cdc.refunds.v1",
          messages: {
            refundIssued: {
              name: "refundIssued",
              payload: { type: "object", properties: { refundId: { type: "string" }, amount: { type: "number", exclusiveMinimum: 0 } } },
              examples: [{ payload: { refundId: "RF-1", amount: 0 } }],
            },
          },
        },
      },
      messages: {
        paymentAuthorized: { name: "paymentAuthorized", payload: { $ref: "#/components/schemas/Payment" }, examples: [{ payload: { paymentId: "PAY-1", amount: -5, currency: "EUR" } }] },
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
        ChargebackAvro: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "Chargeback", fields: [{ name: "chargebackId", type: "string" }, { name: "amount", type: "double" }] },
        },
      },
      "x-library": {
        messages: {
          ledgerPosted: {
            name: "ledgerPosted",
            payload: { type: "object", required: ["entryId", "debit", "credit"], properties: { entryId: { type: "string" }, debit: { type: "number" }, credit: { type: "number" } } },
            examples: [{ payload: { entryId: "LE-1", debit: "100.00", credit: 100 } }],
          },
          replyOnly: { name: "replyOnly", payload: { type: "object", required: ["ack"] }, examples: [{ payload: {} }] },
        },
        channels: {
          archive: {
            address: "payments.sys.archive.v1",
            messages: {
              paymentArchived: {
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
    ["components.channels.refunds.messages.refundIssued.examples.0.payload.amount", issue(0, "payload.amount", "must be > 0")],
    ["components.x-library.messages.ledgerPosted.examples.0.payload.debit", issue(0, "payload.debit", "must be number")],
    ["components.x-library.channels.archive.messages.paymentArchived.examples.0.payload.archivedAt", issue(0, "payload.archivedAt", 'must match format "date-time"')],
    [`${C}.chargebackOpened.examples`, issue(1, "payload.chargebackId", "must be string")],
    [`${C}.chargebackOpened.examples`, issue(1, "payload.reason", REASONS)],
    [`${C}.chargebackResolved.examples.0`, issue(0, "payload.amount", "must be number")],
    [`${C}.chargebackResolved.examples.1.payload`, issue(1, "payload.reason", REASONS)],
    [`${C}.chargebackResolved.examples.2.payload.amount`, issue(2, "payload.amount", "must be >= 0")],
    [`${C}.chargebackResolved.examples.2.payload.cardholder`, issue(2, "payload.cardholder.email", 'must match format "email"')],
    [`${C}.chargebackAvro.examples.0.payload.amount`, issue(0, "payload.amount", "must be a double")],
    ["components.messages.refund/v2.examples.0.payload.refundId", issue(0, "payload.refundId", "must be string")],
    ["components.messages.refund legacy.examples.0.payload", issue(0, "payload", "must have required property 'legacyId'")],
  ],
};
