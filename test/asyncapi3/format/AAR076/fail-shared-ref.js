module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:swiftpay:instant-payments",
  info: {
    title: "SwiftPay Instant Payments Hub",
    version: "2.0.0",
    description: "Instant transfer requests, settlements and confirmations routed by the SwiftPay hub.",
    tags: { $ref: "#/components/x-tag-sets/platform" },
  },
  servers: {
    kafkaHub: { host: "kafka.swiftpay.example.com:9093", protocol: "kafka-secure", tags: { $ref: "#/components/x-tag-sets/platform" } },
  },
  channels: {
    transfers: {
      address: "payments.transfers.v1",
      tags: [{ $ref: "#/components/tags/transfersAlias" }],
      messages: { transferRequested: { $ref: "#/components/messages/transferRequested" } },
    },
  },
  operations: {
    sendTransfer: {
      action: "send",
      channel: { $ref: "#/channels/transfers" },
      messages: [{ $ref: "#/channels/transfers/messages/transferRequested" }],
      tags: [{ $ref: "#/components/tags/transfers" }],
      traits: [{ $ref: "#/components/x-trait-library/auditedAlias" }],
      reply: { $ref: "#/components/replies/transferReply" },
    },
    receiveSettled: {
      action: "receive",
      channel: { $ref: "#/components/x-channel-library/settlements" },
      messages: [{ $ref: "#/components/x-channel-library/settlements/messages/transferSettled" }],
    },
  },
  components: {
    messages: {
      transferRequested: {
        name: "transferRequested",
        tags: [{ $ref: "#/components/tags/transfers" }, { name: "requests" }],
        traits: [{ $ref: "#/components/messageTraits/hubHeaders" }],
        payload: { type: "object", properties: { amount: { type: "number", format: "double", minimum: 0.01 }, currency: { type: "string", enum: ["EUR"] } } },
      },
    },
    messageTraits: {
      hubHeaders: { headers: { type: "object", properties: { bic: { type: "string" } } }, tags: { $ref: "#/components/x-tag-sets/headers" } },
    },
    replies: {
      transferReply: {
        channel: { $ref: "#/components/x-channel-library/confirmations" },
        messages: [{ $ref: "#/components/x-channel-library/confirmations/messages/transferConfirmed" }],
      },
    },
    tags: {
      transfers: { name: "transfers" },
      transfersAlias: { $ref: "#/components/tags/transfersAliasTwice" },
      transfersAliasTwice: { $ref: "#/components/tags/transfers" },
      platform: { name: "payments-hub", description: null },
      cycleA: { $ref: "#/components/tags/cycleB" },
      cycleB: { $ref: "#/components/tags/cycleA" },
    },
    "x-tag-sets": {
      platform: [{ $ref: "#/components/tags/platform" }, { name: "sepa-instant", description: "" }],
      headers: [{ name: "headers" }],
    },
    "x-channel-library": {
      settlements: {
        address: "payments.settlements.v1",
        tags: [{ description: "Settled transfers." }],
        messages: { transferSettled: { name: "transferSettled", tags: [{ $ref: "#/components/tags/cycleA" }] } },
      },
      confirmations: {
        address: null,
        messages: { transferConfirmed: { name: "transferConfirmed", tags: [{ name: "confirmations", description: "Confirmed transfers." }, { name: "sca" }] } },
      },
    },
    "x-trait-library": {
      audited: { tags: [{ name: "audited" }] },
      auditedAlias: { $ref: "#/components/x-trait-library/audited" },
    },
  },
};
