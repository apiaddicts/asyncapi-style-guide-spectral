const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const op = (operationId, extra = {}) => ({ operationId, summary: `${operationId} payment events.`, ...extra });
const authorized = message("paymentAuthorized");

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Gateway", version: "3.1.0", description: "Payment events of the card and wallet gateway." },
  servers: {
    production: {
      url: "kafka.payments.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    terminals: { url: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt" },
  },
  channels: {
    "payments.cdc.authorized.v1": { description: "Authorized payments.", publish: op("publishAuthorized", { message: authorized }), subscribe: op("receiveAuthorized", { message: { oneOf: [authorized, message("paymentCaptured")] } }) },
    "payments.cdc.noMessage.v1": { publish: op("publishNoMessage") },
    "payments.cdc.emptyOneOf.v1": { subscribe: op("receiveEmptyOneOf", { message: { oneOf: [] } }) },
    "payments.cdc.nullMessage.v1": { publish: op("publishNullMessage", { message: null }) },
    "payments.cdc.danglingMessage.v1": { subscribe: op("receiveDangling", { message: message("paymentRefunded") }) },
    "payments.cdc.nullItems.v1": { publish: op("publishNullItems", { message: { oneOf: [null, null] } }) },
    "payments.cdc.scalarItems.v1": { subscribe: op("receiveScalarItems", { message: { oneOf: ["paymentAuthorized", 42, true] } }) },
    "payments.cdc.listMessage.v1": { publish: op("publishList", { message: [authorized] }) },
    "payments.cdc.stringMessage.v1": { subscribe: op("receiveString", { message: "paymentAuthorized" }) },
    "payments.cdc.pluralMessages.v1": { publish: op("publishPlural", { messages: [authorized] }) },
    "payments.cdc.traitOnly.v1": { subscribe: op("receiveTraitOnly", { traits: [trait("withMessage"), trait("observability")] }) },
    "payments.cdc.extension.v1": { publish: op("publishExtension", { "x-message": authorized }) },
    "payments.cdc.upperCase.v1": { subscribe: op("receiveUpperCase", { Message: authorized, MESSAGE: authorized }) },
    "payments.cdc.bindingsOnly.v1": { publish: op("publishBindingsOnly", { bindings: { kafka: { message: authorized } } }) },
    "payments.cdc.emptyWrapperRef.v1": { subscribe: op("receiveEmptyWrapper", { message: { $ref: "#/components/x-message-wrappers/emptyOneOf" } }) },
    "payments.cdc.cyclicWrappers.v1": { publish: op("publishCyclicWrappers", { message: { $ref: "#/components/x-message-wrappers/loopA" } }) },
    "payments.cdc.oneOfDanglingList.v1": { subscribe: op("receiveDanglingList", { message: { oneOf: { $ref: "#/components/x-message-lists/retired" } } }) },
    "payments.cdc.bothMissing.v1": { publish: {}, subscribe: { message: { oneOf: [] } } },
    "payments.cdc.oneUsable.v1": { publish: op("publishOneUsable", { message: authorized }), subscribe: op("receiveOneUsable") },
    "payments.cdc.nullOperation.v1": { publish: null },
    "payments.cdc.stringOperation.v1": { subscribe: "receivePayment" },
    "payments.cdc.listOperation.v1": { publish: [op("publishListed", { message: authorized })] },
    "payments.cdc.v3Style.v1": { subscribe: { action: "receive", channel: { $ref: "#/channels/payments.cdc.authorized.v1" }, messages: [authorized] } },
    "x-payments.cdc.partner.v1": { publish: op("publishPartner") },
    "terminals/{terminalId}/payments": {
      parameters: { terminalId: { description: "Terminal identifier.", schema: { type: "string" } } },
      subscribe: op("receiveTerminal", { bindings: { mqtt: { qos: 2, bindingVersion: "0.1.0" } }, message: { oneOf: [] } }),
    },
    "payments.cdc.channelOnly.v1": { description: "Channel without operations, never reported." },
  },
  components: {
    channels: {
      refundsShared: { publish: op("publishRefunds") },
      archiveShared: { subscribe: op("receiveArchive", { message: null }) },
      archiveFine: { publish: op("publishArchive", { message: authorized }) },
    },
    operationTraits: {
      withMessage: { message: authorized },
      observability: { description: "Traced operation." },
    },
    "x-message-wrappers": {
      emptyOneOf: { oneOf: [] },
      loopA: { oneOf: [{ $ref: "#/components/x-message-wrappers/loopB" }] },
      loopB: { oneOf: [{ $ref: "#/components/x-message-wrappers/loopA" }] },
    },
    messages: {
      paymentAuthorized: {
        name: "paymentAuthorized",
        contentType: "application/vnd.apache.avro+json",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "PaymentAuthorized", fields: [{ name: "paymentId", type: "string" }, { name: "wallet", type: ["null", "string"], default: null }] },
      },
      paymentCaptured: { name: "paymentCaptured", payload: { type: "object", properties: { paymentId: { type: "string" }, voucher: { type: ["string", "null"] } } } },
    },
  },
};
