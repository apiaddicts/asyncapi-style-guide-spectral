module.exports = {
  asyncapi: "3.0.0",
  id: "urn:banking:instant-payments",
  info: { $ref: "#/components/x-shared-info/instantPaymentsAlias" },
  servers: {
    paymentsKafka: { host: "kafka.payments.bank.example.io:9093", protocol: "kafka-secure", description: "Instant payments backbone." },
  },
  channels: {
    transferInitiated: {
      address: "payments.cmd.transfers.initiated.v1",
      messages: { transferInitiated: { $ref: "#/components/messages/transferInitiated" } },
    },
  },
  operations: {
    initiateTransfer: {
      action: "send",
      channel: { $ref: "#/channels/transferInitiated" },
      messages: [{ $ref: "#/channels/transferInitiated/messages/transferInitiated" }],
      reply: { channel: { $ref: "#/components/channels/transferStatus" } },
    },
  },
  components: {
    channels: { transferStatus: { address: null, messages: { transferStatus: { payload: { type: "object", properties: { status: { type: "string" } } } } } } },
    messages: {
      transferInitiated: {
        name: "transferInitiated",
        title: "Transfer initiated",
        payload: { type: "object", properties: { transferId: { type: "string" }, amount: { type: "integer", format: "int64" }, beneficiary: { $ref: "#/components/x-contacts/beneficiary" } } },
      },
    },
    "x-shared-info": {
      instantPaymentsAlias: { $ref: "#/components/x-shared-info/instantPayments" },
      instantPayments: {
        title: "Instant Payments Events",
        version: "3.2.0",
        contact: { $ref: "#/components/x-contacts/supportAlias" },
      },
    },
    "x-contacts": {
      supportAlias: { $ref: "#/components/x-contacts/support" },
      support: {
        name: { $ref: "#/components/x-texts/teamLoopA" },
        url: "https://payments.bank.example.io/support",
        EMAIL: "instant-payments@bank.example.io",
        "x-email": { $ref: "#/components/x-texts/email" },
      },
      beneficiary: { name: "", email: "" },
    },
    "x-texts": {
      email: "instant-payments@bank.example.io",
      teamLoopA: { $ref: "#/components/x-texts/teamLoopB" },
      teamLoopB: { $ref: "#/components/x-texts/teamLoopA" },
    },
  },
};
