module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:clearhouse:payments-clearing",
  info: {
    title: "Clearhouse Payments Clearing",
    version: "5.0.1",
    description: "Settlement and chargeback events exchanged between the acquiring banks and the clearing house.",
  },
  tags: { $ref: "#/components/x-tag-sets/platform" },
  servers: {
    kafkaClearing: {
      url: "kafka.clearhouse.example.com:9093",
      protocol: "kafka-secure",
      tags: { $ref: "#/components/x-tag-sets/platform" },
    },
  },
  channels: {
    "clearing.cmd.payments.settle.v1": {
      description: "Settlement requests and confirmations.",
      publish: {
        operationId: "publishSettlementRequested",
        tags: [{ $ref: "#/components/x-tag-library/settlement" }, { $ref: "#/components/x-tag-library/settlementAlias" }],
        message: { $ref: "#/components/messages/settlementRequested" },
      },
      subscribe: {
        operationId: "receiveSettlementConfirmed",
        tags: [{ $ref: "#/components/x-tag-library/clearingAlias" }],
        message: { $ref: "#/components/x-message-library/settlementConfirmed" },
      },
    },
    "clearing.cdc.payments.chargeback.v1": {
      description: "Chargebacks opened by the issuers.",
      subscribe: {
        operationId: "receiveChargeback",
        traits: [{ $ref: "#/components/x-trait-library/auditedAlias" }],
        message: {
          oneOf: [{ $ref: "#/components/messages/settlementRequested" }, { $ref: "#/components/x-message-library/chargebackOpened" }],
        },
      },
    },
  },
  components: {
    messages: {
      settlementRequested: {
        name: "settlementRequested",
        title: "Settlement requested",
        tags: [{ $ref: "#/components/x-tag-library/settlement" }, { name: "requests" }],
        traits: [{ $ref: "#/components/messageTraits/clearingHeaders" }],
        payload: { type: "object", properties: { batchId: { type: "string" }, amount: { type: "number", format: "double", minimum: 0 } } },
      },
    },
    messageTraits: {
      clearingHeaders: { headers: { type: "object", properties: { bankCode: { type: "string" } } }, tags: { $ref: "#/components/x-tag-sets/headers" } },
    },
    "x-tag-sets": {
      platform: [{ name: "clearing-platform", description: "" }, { $ref: "#/components/x-tag-library/clearing" }],
      headers: [{ name: "headers" }],
    },
    "x-tag-library": {
      settlement: { name: "settlement" },
      settlementAlias: { $ref: "#/components/x-tag-library/settlement" },
      clearing: { name: "clearing", description: null },
      clearingAlias: { $ref: "#/components/x-tag-library/clearingAliasTwice" },
      clearingAliasTwice: { $ref: "#/components/x-tag-library/clearing" },
      chargebacks: { description: "Card chargebacks raised by the issuers." },
      cycleA: { $ref: "#/components/x-tag-library/cycleB" },
      cycleB: { $ref: "#/components/x-tag-library/cycleA" },
    },
    "x-message-library": {
      settlementConfirmed: {
        name: "settlementConfirmed",
        title: "Settlement confirmed",
        tags: [{ $ref: "#/components/x-tag-library/chargebacks" }, { name: "confirmations", description: "Settlement confirmations." }],
      },
      chargebackOpened: {
        name: "chargebackOpened",
        title: "Chargeback opened",
        tags: [{ $ref: "#/components/x-tag-library/chargebacks" }, { $ref: "#/components/x-tag-library/cycleA" }],
      },
    },
    "x-trait-library": {
      audited: { tags: [{ name: "audited" }] },
      auditedAlias: { $ref: "#/components/x-trait-library/audited" },
    },
  },
};
