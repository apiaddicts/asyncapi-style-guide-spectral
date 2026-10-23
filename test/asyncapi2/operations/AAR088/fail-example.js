const message = (name) => ({ $ref: `#/components/messages/${name}` });
const subscribe = { operationId: "receivePayment", message: message("paymentEvent") };

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Event Hub", version: "3.4.0" },
  servers: {
    production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    terminals: { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    "payments.cdc.compliant.v1": { description: "Compliant channel.", servers: ["production"], subscribe },
    "payments.cdc.noServers.v1": { description: "Available on every server.", subscribe },
    "payments.cdc.emptyServers.v1": { description: "Empty server list.", servers: [], subscribe },
    "payments.cdc.nullServers.v1": { description: "Null server list.", servers: null, subscribe },
    "payments.cdc.unknownServer.v1": { description: "Only an undeclared server.", servers: ["payments-legacy"], subscribe },
    "payments.cdc.caseServer.v1": { description: "Server name in another case.", servers: ["Production"], subscribe },
    "payments.cdc.componentServer.v1": { description: "Server defined only in components.", servers: ["backupCluster"], subscribe },
    "payments.cdc.stringServers.v1": { description: "Server name instead of a list.", servers: "production", subscribe },
    "payments.cdc.referenceServers.v1": { description: "Servers listed the AsyncAPI 3.x way.", servers: [{ $ref: "#/servers/production" }], subscribe },
    "payments.cdc.nullEntries.v1": { description: "Only null and blank entries.", servers: [null, "", " "], subscribe },
    "payments.cdc.mixedServers.v1": { description: "An undeclared server next to a declared one.", servers: ["payments-legacy", "production"], subscribe },
    "payments.cdc.extensionServers.v1": { description: "Servers only as an extension.", "x-servers": ["production"], subscribe },
    "payments.cdc.operationServers.v1": { description: "Servers only on the operation.", subscribe: { ...subscribe, servers: ["production"] } },
    "payments.cdc.bindingServers.v1": { description: "Servers only in the binding.", bindings: { kafka: { servers: ["production"], bindingVersion: "0.4.0" } }, subscribe },
    "terminals/{terminalId}/payments": {
      description: "Card terminal payments.",
      parameters: { terminalId: { description: "Terminal identifier.", schema: { type: "string" } } },
      servers: ["terminals"],
      publish: { operationId: "publishTerminalPayment", message: message("paymentEvent") },
    },
    "terminals/{terminalId}/refunds": {
      description: "Card terminal refunds.",
      parameters: { terminalId: { description: "Terminal identifier.", schema: { type: "string" } } },
      publish: { operationId: "publishTerminalRefund", message: message("paymentEvent") },
    },
    "payments.cdc.nullChannel.v1": null,
    "payments.cdc.stringChannel.v1": "payments.cdc.stringChannel.v1",
    "payments.cdc.listChannel.v1": [{ description: "Listed.", servers: ["production"], subscribe }],
    "x-payments.cdc.partner.v1": { description: "Partner channel whose key starts with x-.", subscribe },
    "payments.refunds.requested": { $ref: "#/components/channels/refundsShared" },
    "payments.invoices.issued": { $ref: "./shared/payment-channels.yaml#/invoicesIssued" },
  },
  components: {
    servers: { backupCluster: { url: "kafka-backup.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels: {
      refundsShared: { description: "Shared refunds channel without servers.", subscribe },
      archiveShared: { description: "Archive.", servers: [], subscribe },
      nullShared: null,
      compliantShared: { description: "Compliant shared channel.", servers: ["production"], subscribe },
    },
    messages: { paymentEvent: { name: "paymentEvent", payload: { type: "object", properties: { paymentId: { type: "string" }, voucher: { type: ["string", "null"] } } } } },
  },
};
