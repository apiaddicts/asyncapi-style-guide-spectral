module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Northwind Payment Schemas",
    version: "1.6.0",
    description: "Payment events that share schemas, parameters, channels and messages through local references.",
  },
  channels: {
    "payments.cdc.authorized.v1": {
      description: "The same component message is published and consumed.",
      publish: { operationId: "publishAuthorized", message: { $ref: "#/components/messages/paymentAuthorized" } },
      subscribe: { operationId: "receiveAuthorized", message: { $ref: "#/components/messages/paymentAuthorized" } },
    },
    "payments.cdc.captured.v1": {
      description: "Captured payments, built from shared schemas.",
      publish: {
        operationId: "publishCaptured",
        message: {
          messageId: "paymentCaptured",
          payload: {
            type: "object",
            properties: {
              amount: { $ref: "#/components/schemas/Money" },
              payer: { $ref: "#/components/schemas/PartyAlias" },
              billing: { $ref: "#/components/schemas/Party/properties/billing_address" },
              loop: { $ref: "#/components/schemas/Node" },
              missing: { $ref: "#/components/schemas/DoesNotExist" },
              external: { $ref: "./common/schemas.yaml#/components/schemas/Address" },
              remote: { $ref: "https://schemas.northwind.example.com/payments/fee.json" },
              nonString: { $ref: 42 },
              root: { $ref: "#" },
              noSlash: { $ref: "#components/schemas/Money" },
              badPercent: { $ref: "#/components/schemas/%E0%A4%A" },
              escaped: { $ref: "#/components/x-schemas/fx~1rates/properties/rate~0table" },
              encoded: { $ref: "#/components/x-schemas/fx%20quote" },
              withSiblings: { $ref: "#/components/schemas/Money", properties: { sibling_ignored: { type: "string" } } },
            },
          },
        },
      },
    },
    "payments.cmd.refund.v1": { $ref: "#/components/x-channels/refunds" },
    "payments/{merchantId}/settlements": {
      description: "Settlements per merchant.",
      parameters: { merchantId: { $ref: "#/components/parameters/merchantId" } },
      subscribe: { operationId: "receiveSettlement", message: { $ref: "#/components/x-messages/settlementPosted" } },
    },
  },
  components: {
    schemas: {
      Money: { type: "object", properties: { amount: { type: "number" }, currency_code: { type: "string" } } },
      PartyAlias: { $ref: "#/components/schemas/Party" },
      Party: {
        type: "object",
        properties: {
          partyId: { type: "string" },
          billing_address: { type: "object", properties: { Line1: { type: "string" }, city: { type: "string" } } },
        },
      },
      Node: { type: "object", properties: { next_node: { $ref: "#/components/schemas/Node" }, value: { type: "string" } } },
      CycleA: { $ref: "#/components/schemas/CycleB" },
      CycleB: { $ref: "#/components/schemas/CycleA" },
    },
    "x-schemas": {
      "fx/rates": { type: "object", properties: { "rate~table": { type: "object", properties: { base_currency: { type: "string" } } } } },
      "fx quote": { type: "object", properties: { Bid: { type: "number" }, ask: { type: "number" } } },
      unused: { type: "object", properties: { never_checked: { type: "string" } } },
    },
    "x-channels": {
      refunds: {
        description: "Refund commands.",
        publish: { operationId: "requestRefund", message: { payload: { type: "object", properties: { refund_id: { type: "string" } } } } },
      },
    },
    "x-messages": {
      settlementPosted: { payload: { type: "object", properties: { settlementId: { type: "string" }, Net_Amount: { $ref: "#/components/schemas/Money" } } } },
    },
    parameters: {
      merchantId: { description: "Merchant identifier.", schema: { type: "object", properties: { merchant_code: { type: "string" } } } },
    },
    messages: {
      paymentAuthorized: {
        messageId: "paymentAuthorized",
        payload: { $ref: "#/components/schemas/Money" },
        headers: { type: "object", properties: { Auth_Code: { type: "string" } } },
      },
    },
  },
};
