module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Fabrikam Treasury Shared Schemas",
    version: "1.3.0",
    description: "Treasury events that share schemas, channels, messages and replies through local references.",
  },
  channels: {
    payments: {
      address: "treasury.cdc.payments.v1",
      messages: {
        paymentReleased: {
          name: "paymentReleased",
          payload: {
            type: "object",
            properties: {
              amount: { $ref: "#/components/schemas/Money" },
              beneficiary: { $ref: "#/components/schemas/PartyAlias" },
              address: { $ref: "#/components/schemas/Party/properties/postal_address" },
              loop: { $ref: "#/components/schemas/Node" },
              wrapped: { $ref: "#/components/schemas/WrappedMoney" },
              missing: { $ref: "#/components/schemas/DoesNotExist" },
              external: { $ref: "./common/schemas.yaml#/components/schemas/Iban" },
              remote: { $ref: "https://schemas.fabrikam.example.com/treasury/fee.json" },
              nonString: { $ref: 42 },
              root: { $ref: "#" },
              escaped: { $ref: "#/components/x-schemas/fx~1rates/properties/rate~0table" },
              encoded: { $ref: "#/components/x-schemas/fx%20quote" },
              withSiblings: { $ref: "#/components/schemas/Money", properties: { sibling_ignored: { type: "string" } } },
            },
          },
        },
        paymentReturned: { $ref: "#/components/messages/paymentReturned" },
      },
    },
    paymentsMirror: { $ref: "#/components/channels/paymentsMirror" },
    statements: {
      address: null,
      messages: { statementIssued: { $ref: "#/components/x-messages/statementIssued" } },
    },
  },
  operations: {
    releasePayment: {
      action: "send",
      channel: { $ref: "#/channels/payments" },
      messages: [{ $ref: "#/channels/payments/messages/paymentReleased" }],
      reply: { $ref: "#/components/replies/paymentAck" },
    },
    audit: { $ref: "#/components/operations/auditPayments" },
  },
  components: {
    schemas: {
      Money: { type: "object", properties: { amount: { type: "number" }, currency_code: { type: "string" } } },
      PartyAlias: { $ref: "#/components/schemas/Party" },
      Party: {
        type: "object",
        properties: {
          partyId: { type: "string" },
          postal_address: { type: "object", properties: { Line1: { type: "string" }, city: { type: "string" } } },
        },
      },
      Node: { type: "object", properties: { next_node: { $ref: "#/components/schemas/Node" }, value: { type: "string" } } },
      WrappedMoney: { schemaFormat: "application/schema+json;version=draft-07", schema: { $ref: "#/components/schemas/Money" } },
      AvroLedger: {
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        schema: { type: "record", name: "Ledger", fields: [{ name: "ledgerId", type: "string" }, { name: "entries", type: { type: "array", items: { $ref: "#/components/x-avro/LedgerEntry" } } }] },
      },
      CycleA: { $ref: "#/components/schemas/CycleB" },
      CycleB: { $ref: "#/components/schemas/CycleA" },
    },
    "x-avro": { LedgerEntry: { type: "record", name: "LedgerEntry", fields: [{ name: "entry_id", type: "string" }] } },
    "x-schemas": {
      "fx/rates": { type: "object", properties: { "rate~table": { type: "object", properties: { base_currency: { type: "string" } } } } },
      "fx quote": { type: "object", properties: { Bid: { type: "number" }, ask: { type: "number" } } },
      unused: { type: "object", properties: { never_checked: { type: "string" } } },
    },
    "x-messages": {
      statementIssued: { name: "statementIssued", payload: { type: "object", properties: { statementId: { type: "string" }, Closing_Balance: { $ref: "#/components/schemas/Money" } } } },
      ackOnly: { name: "ackOnly", payload: { type: "object", properties: { ack_code: { type: "string" } } } },
      auditOnly: { name: "auditOnly", headers: { type: "object", properties: { Auditor: { type: "string" } } } },
    },
    channels: {
      paymentsMirror: {
        address: "treasury.cdc.payments.mirror.v1",
        messages: { paymentMirrored: { $ref: "#/channels/payments/messages/paymentReleased" }, mirrorOnly: { name: "mirrorOnly", payload: { type: "object", properties: { mirror_lag_ms: { type: "integer" } } } } },
      },
    },
    operations: { auditPayments: { action: "receive", channel: { $ref: "#/channels/payments" }, messages: [{ $ref: "#/components/x-messages/auditOnly" }] } },
    replies: { paymentAck: { messages: [{ $ref: "#/components/x-messages/ackOnly" }] } },
    messages: {
      paymentReturned: {
        name: "paymentReturned",
        payload: { $ref: "#/components/schemas/Money" },
        headers: { type: "object", properties: { Return_Reason: { type: "string" } } },
      },
    },
  },
};
