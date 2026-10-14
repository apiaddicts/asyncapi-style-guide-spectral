module.exports = {
  asyncapi: "3.0.0",
  id: "urn:banking:instant-payments",
  info: { $ref: "#/components/x-shared-info/instantPayments" },
  servers: {
    paymentsAmqp: { host: "mq.payments.example.io:5671", pathname: "/instant", protocol: "amqps", description: "Instant payments broker." },
  },
  channels: {
    transferRequests: {
      address: "payments.cmd.transfers.requested.v1",
      messages: { transferRequested: { $ref: "#/components/messages/transferRequested" } },
    },
    transferResults: {
      address: null,
      messages: { transferSettled: { name: "transferSettled", title: "Transfer settled", payload: { type: "object", properties: { transferId: { type: "string" } } } } },
    },
  },
  operations: {
    requestTransfer: {
      action: "send",
      channel: { $ref: "#/channels/transferRequests" },
      reply: { channel: { $ref: "#/channels/transferResults" } },
    },
    receiveTransfer: { action: "receive", channel: { $ref: "#/channels/transferRequests" }, messages: [{ $ref: "#/channels/transferRequests/messages/transferRequested" }] },
  },
  components: {
    messages: {
      transferRequested: {
        name: "transferRequested",
        title: "Transfer requested",
        correlationId: { location: "$message.header#/transferId" },
        payload: {
          type: "object",
          required: ["transferId", "amount", "creditorIban"],
          properties: {
            transferId: { type: "string", format: "uuid" },
            amount: { type: "string", pattern: "^[0-9]+\\.[0-9]{2}$" },
            creditorIban: { type: "string", pattern: "^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$" },
            remittance: { type: ["string", "null"], maxLength: 140 },
          },
        },
      },
    },
    externalDocs: { schemeRulebook: { description: "SCT Inst rulebook.", url: "https://payments.example.io/rulebook" }, rulebookAlias: { $ref: "#/components/externalDocs/schemeRulebook" } },
    "x-shared-info": {
      instantPayments: { $ref: "#/components/x-shared-info/instantPaymentsBase" },
      instantPaymentsBase: {
        title: "Instant Payments",
        description: { $ref: "#/components/x-texts/descriptionAlias" },
        termsOfService: { $ref: "#/components/x-texts/emptyTerms" },
        contact: { $ref: "#/components/x-contacts/payments" },
        tags: { $ref: "#/components/x-tag-lists/empty" },
        externalDocs: { $ref: "#/components/externalDocs/rulebookAlias" },
        "x-audience": { $ref: "./shared/audiences.yaml#/partner" },
        "x-api-id": { $ref: "#" },
      },
      unused: { title: "", version: "", description: "", tags: [] },
    },
    "x-texts": {
      descriptionAlias: { $ref: "#/components/x-texts/description" },
      description: "SEPA instant credit transfers between participant banks.",
      emptyTerms: "",
    },
    "x-contacts": { payments: { name: "Instant Payments Desk", email: "instant@payments.example.io" } },
    "x-tag-lists": { empty: [] },
  },
};
