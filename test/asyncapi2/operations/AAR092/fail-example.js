const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Events", version: "4.2.0", description: "Payment lifecycle events." },
  servers: {
    production: { url: "kafka.payments.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    terminals: { url: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    "payments.cdc.noSummary.v1": { description: "No summary.", publish: { operationId: "publishPayment", message: message("payment") } },
    "payments.cdc.bothMissing.v1": { description: "Both operations without summary.", publish: { operationId: "publishBoth" }, subscribe: { message: message("payment") } },
    "payments.cdc.blankSummary.v1": { description: "Blank summary.", subscribe: { summary: " ", message: message("payment") } },
    "payments.cdc.nullSummary.v1": { description: "Null summary.", subscribe: { summary: null, message: message("payment") } },
    "payments.cdc.zeroWidthSummary.v1": { description: "Zero-width summary.", publish: { summary: "\u200b\u2060", message: message("payment") } },
    "payments.cdc.emptyOperation.v1": { description: "Empty operation.", subscribe: {} },
    "payments.cdc.nullOperation.v1": { description: "Null operation.", publish: null },
    "payments.cdc.stringOperation.v1": { description: "String operation.", subscribe: "receivePayment" },
    "payments.cdc.listOperation.v1": { description: "List operation.", publish: [{ summary: "Publish payments." }] },
    "payments.cdc.v3Style.v1": { description: "AsyncAPI 3.x operation.", subscribe: { action: "receive", channel: { $ref: "#/channels/payments.cdc.noSummary.v1" }, title: "Payments" } },
    "payments.cdc.extensionsOnly.v1": { description: "Extensions only.", publish: { "x-summary": "Publish payments." } },
    "payments.cdc.descriptionOnly.v1": { description: "Description only.", publish: { description: "Publish payments.", message: message("payment") } },
    "payments.cdc.lookAlikeKeys.v1": { description: "Look-alike keys.", Publish: {}, SUBSCRIBE: {}, send: {}, receive: {}, "x-publish": {} },
    "payments.cdc.traitOverridesBlank.v1": { description: "Trait summary over a blank one.", publish: { summary: "", traits: [trait("ledger")] } },
    "payments.cdc.traitBlankOverOwn.v1": { description: "Blank trait summary over the own one.", subscribe: { summary: "Receive payments.", traits: [trait("blankSummary")] } },
    "payments.cdc.traitsLastBlank.v1": { description: "Last trait blank.", subscribe: { traits: [trait("ledger"), { summary: " " }] } },
    "payments.cdc.noOperations.v1": { description: "Channel without operations." },
    "payments.cdc.nullChannel.v1": null,
    "x-payments.cdc.partner.v1": { description: "Partner channel.", publish: {} },
    "stores/{storeId}/terminals/{terminalId}": {
      description: "Terminal events.",
      parameters: { storeId: { schema: { type: "string" } }, terminalId: { schema: { type: "string" } } },
      subscribe: { operationId: "receiveTerminal", message: message("payment") },
    },
    "payments.refunds.requested": { $ref: "#/components/channels/refundsShared" },
  },
  components: {
    channels: {
      refundsShared: { description: "Shared refunds.", publish: { operationId: "publishRefund" }, subscribe: { summary: "Receive refunds." } },
      archiveShared: { description: "Archive.", subscribe: { summary: "" } },
      nullShared: null,
    },
    operationTraits: {
      ledger: { summary: "Record ledger entries." },
      blankSummary: { summary: "" },
    },
    messages: { payment: { messageId: "payment", payload: { type: "object", properties: { paymentId: { type: "string" } } } } },
  },
};
