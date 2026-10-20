const channel = (name) => ({ $ref: `#/channels/${name}` });
const message = (channelName, name) => ({ $ref: `#/channels/${channelName}/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const op = (action, extra = {}) => ({ action, channel: channel("payments"), summary: `${action} payment events.`, ...extra });
const authorized = message("payments", "paymentAuthorized");

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Payments Gateway", version: "3.1.0", description: "Payment events of the card and wallet gateway." },
  servers: {
    production: {
      host: "kafka.payments.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    terminals: { host: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt" },
  },
  channels: {
    payments: {
      address: "payments.cdc.payments.v1",
      servers: [{ $ref: "#/servers/production" }],
      messages: { paymentAuthorized: { $ref: "#/components/messages/paymentAuthorized" }, paymentCaptured: { $ref: "#/components/messages/paymentCaptured" } },
      bindings: { kafka: { topic: "payments.cdc.payments.v1", partitions: 6 } },
    },
    paymentReplies: { address: null, messages: { paymentAccepted: { $ref: "#/components/messages/paymentCaptured" } } },
    terminals: {
      address: "terminals/{terminalId}/payments",
      servers: [{ $ref: "#/servers/terminals" }],
      parameters: { terminalId: { description: "Terminal identifier." } },
      messages: { terminalPayment: { $ref: "#/components/messages/paymentAuthorized" } },
    },
  },
  operations: {
    sendAuthorized: op("send", { messages: [authorized] }),
    receiveBoth: op("receive", {
      messages: [authorized, message("payments", "paymentCaptured")],
      reply: { address: { location: "$message.header#/replyTo" }, channel: channel("paymentReplies"), messages: [message("paymentReplies", "paymentAccepted")] },
    }),
    noMessages: op("send"),
    emptyMessages: op("receive", { messages: [] }),
    nullMessages: op("send", { messages: null }),
    danglingEntry: op("receive", { messages: [message("payments", "paymentRefunded")] }),
    nullEntries: op("send", { messages: [null, null] }),
    scalarEntries: op("receive", { messages: ["paymentAuthorized", 42, true] }),
    mapMessages: op("send", { messages: { paymentAuthorized: authorized } }),
    singleReference: op("receive", { messages: authorized }),
    channelMessagesMap: op("send", { messages: { $ref: "#/channels/payments/messages" } }),
    singularMessage: op("receive", { message: authorized }),
    inlineChannelOnly: op("send", { channel: { address: "payments.cdc.inline.v1", messages: { paymentAuthorized: { $ref: "#/components/messages/paymentAuthorized" } } } }),
    replyOnly: op("receive", { reply: { address: { location: "$message.header#/replyTo" }, channel: channel("paymentReplies"), messages: [message("paymentReplies", "paymentAccepted")] } }),
    traitOnly: op("send", { traits: [trait("withMessages"), trait("observability")] }),
    extension: op("receive", { "x-messages": [authorized] }),
    upperCase: op("send", { Messages: [authorized], MESSAGES: [authorized] }),
    danglingList: op("receive", { messages: { $ref: "#/components/x-message-lists/retired" } }),
    cyclicEntries: op("send", { messages: [{ $ref: "#/components/messages/loopA" }, { $ref: "#/operations/cyclicEntries/messages/1" }] }),
    emptyOperation: {},
    nullOperation: null,
    stringOperation: "receivePayment",
    listOperation: [op("send", { messages: [authorized] })],
    v2Style: { operationId: "receivePayment", summary: "Receive payments.", message: { $ref: "#/components/messages/paymentAuthorized" }, subscribe: { message: { $ref: "#/components/messages/paymentAuthorized" } } },
    "x-partner": op("send"),
    "terminals/payments": op("receive", { channel: channel("terminals"), messages: [] }),
  },
  components: {
    operations: {
      refundsShared: op("send"),
      archiveShared: op("receive", { messages: [] }),
      archiveFine: op("send", { messages: [authorized] }),
      nullShared: null,
    },
    operationTraits: {
      withMessages: { messages: [authorized] },
      observability: { description: "Traced operation." },
    },
    messages: {
      paymentAuthorized: {
        name: "paymentAuthorized",
        contentType: "application/vnd.apache.avro+json",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "PaymentAuthorized", fields: [{ name: "paymentId", type: "string" }, { name: "wallet", type: ["null", "string"], default: null }] },
        },
      },
      paymentCaptured: { name: "paymentCaptured", payload: { type: "object", properties: { paymentId: { type: "string" }, voucher: { type: ["string", "null"] } } } },
      loopA: { $ref: "#/components/messages/loopB" },
      loopB: { $ref: "#/components/messages/loopA" },
    },
  },
};
