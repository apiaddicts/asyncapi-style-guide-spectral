const message = (name) => ({ $ref: `#/components/messages/${name}` });
const DESCRIPTION = { description: "Payment events." };

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Gateway", version: "3.0.0", description: "Payment events with incomplete channels." },
  servers: {
    production: { url: "kafka.payments.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ saslScram: [] }] },
    terminals: { url: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    "payments.cdc.captured.v1": { ...DESCRIPTION, subscribe: { operationId: "receiveCaptured", message: message("paymentCaptured") } },
    "payments.cdc.noOperations.v1": DESCRIPTION,
    "payments.cdc.noMessage.v1": { ...DESCRIPTION, publish: { operationId: "publishNoMessage", summary: "No message." } },
    "payments.cdc.emptyOperations.v1": { publish: {}, subscribe: null },
    "payments.cdc.emptyOneOf.v1": { ...DESCRIPTION, publish: { operationId: "publishEmptyOneOf", message: { oneOf: [] } } },
    "payments.cdc.nullOneOfItem.v1": { subscribe: { operationId: "receiveNullItem", message: { oneOf: [null] } } },
    "payments.cdc.danglingItems.v1": { subscribe: { operationId: "receiveDangling", message: { oneOf: [message("paymentCapturedV0"), message("paymentRefundedV0")] } } },
    "payments.cdc.bothUnusable.v1": { publish: { operationId: "publishBoth", message: null }, subscribe: { operationId: "receiveBoth", message: "paymentCaptured" } },
    "payments.cdc.danglingMessage.v1": { subscribe: { operationId: "receiveDanglingMessage", message: message("retiredMessage") } },
    "payments.cdc.nullComponent.v1": { subscribe: { operationId: "receiveNullComponent", message: message("retiredNull") } },
    "payments.cdc.listMessage.v1": { publish: { operationId: "publishList", message: [message("paymentCaptured")] } },
    "payments.cdc.cyclicWrapper.v1": { publish: { operationId: "publishCyclic", message: { $ref: "#/components/x-message-wrappers/loopA" } } },
    "payments.cdc.mixedOneOf.v1": { subscribe: { operationId: "receiveMixed", message: { oneOf: [null, message("gone"), message("paymentCaptured")] } } },
    "payments.cdc.emptyMessageObject.v1": { subscribe: { operationId: "receiveEmptyObject", message: {} } },
    "payments.cdc.externalMessage.v1": { subscribe: { operationId: "receiveExternal", message: { $ref: "https://schemas.partner.example.io/asyncapi/messages.yaml#/refund" } } },
    "payments.cdc.unusablePublish.v1": { publish: { operationId: "publishUnusable", message: { oneOf: [] } }, subscribe: { operationId: "receiveUsable", message: message("paymentCaptured") } },
    "payments.cdc.messagesMap.v1": { ...DESCRIPTION, messages: { paymentCaptured: message("paymentCaptured") } },
    "payments.cdc.sendReceive.v1": { send: { message: message("paymentCaptured") }, receive: { message: message("paymentCaptured") } },
    "payments.cdc.traitMessage.v1": { subscribe: { operationId: "receiveTrait", traits: [{ message: message("paymentCaptured") }] } },
    "payments.cdc.bindingMessage.v1": { bindings: { kafka: { message: message("paymentCaptured"), bindingVersion: "0.4.0" } } },
    "payments.cdc.upperCase.v1": { Publish: { message: message("paymentCaptured") }, SUBSCRIBE: { message: message("paymentCaptured") } },
    "payments.cdc.extensionsOnly.v1": { "x-publish": { message: message("paymentCaptured") } },
    "payments.cdc.nullChannel.v1": null,
    "payments.cdc.stringChannel.v1": "payments.cdc.captured.v1",
    "payments.cdc.listChannel.v1": [{ subscribe: { message: message("paymentCaptured") } }],
    "x-payments.cdc.partner.v1": { publish: { operationId: "publishPartner", message: { oneOf: [] } } },
    "terminals/{terminalId}/payments": {
      parameters: { terminalId: { description: "Terminal identifier.", schema: { type: "string" } } },
      subscribe: { operationId: "receiveTerminalPayment" },
    },
    "payments.refunds.requested": { $ref: "#/components/channels/refundsShared" },
  },
  components: {
    channels: {
      refundsShared: { description: "Refunds without operations." },
      archiveShared: { publish: { operationId: "publishArchive", message: { oneOf: [message("gone")] } } },
      nullShared: null,
      fineShared: { subscribe: { message: message("paymentCaptured") } },
    },
    messages: {
      paymentCaptured: { name: "paymentCaptured", payload: { type: "object", properties: { amount: { type: ["number", "null"] } } } },
      retiredNull: null,
    },
    "x-message-wrappers": { loopA: { oneOf: [{ $ref: "#/components/x-message-wrappers/loopB" }] }, loopB: { oneOf: [{ $ref: "#/components/x-message-wrappers/loopA" }, null] } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
  },
};
