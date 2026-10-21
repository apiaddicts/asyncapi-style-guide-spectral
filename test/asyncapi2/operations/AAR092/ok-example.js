const message = (name) => ({ $ref: `#/components/messages/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:payments:ledger",
  info: {
    title: "Quality Payments Ledger",
    version: "3.4.0",
    description: "Payment authorisations, refunds, terminal telemetry and settlement commands.",
    contact: { name: "Payments Integration", email: "payments@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: { url: "kafka.payments.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ saslScram: [] }] },
    terminals: { url: "mqtt.payments.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    settlement: { url: "amqps://rabbit.payments.quality.es:5671/payments", protocol: "amqps", protocolVersion: "0.9.1" },
    console: { url: "wss://console.payments.quality.es/ws", protocol: "wss" },
  },
  channels: {
    "payments.cdc.authorisations.v1": {
      description: "Payment authorisations.",
      subscribe: {
        operationId: "receiveAuthorisation",
        summary: "Receive payment authorisations.",
        description: "Consumed by the ledger.",
        security: [{ saslScram: [] }],
        tags: [{ name: "payments" }],
        bindings: { kafka: { groupId: { type: "string", enum: ["ledger"] }, bindingVersion: "0.4.0" } },
        message: { oneOf: [message("authorisation"), message("authorisationAvro")] },
      },
      publish: { operationId: "publishAuthorisation", traits: [trait("ledger")], message: message("authorisation") },
    },
    "terminals/{terminalId}/telemetry": {
      description: "Terminal telemetry.",
      parameters: { terminalId: { description: "Terminal identifier.", schema: { type: "string", pattern: "^T[0-9]{6}$" }, location: "$message.payload#/terminalId" } },
      subscribe: { summary: "Receive terminal telemetry.", message: message("telemetry") },
    },
    "payments.cmd.settlements": {
      description: "Settlement commands.",
      publish: { summary: "", traits: [trait("settlement")], message: message("settlement") },
      subscribe: { traits: [trait("ledger"), trait("settlement")], message: message("settlement") },
    },
    "console/sessions": { description: "Back-office console.", publish: { summary: { $ref: "#/components/x-texts/console" }, message: message("console") } },
    "payments.cdc.refunds.v1": { $ref: "#/components/channels/refunds" },
    "payments.partner.feed": { $ref: "./partners/channels.yaml#/feed" },
    "payments.partner.operations": { description: "Partner operations.", subscribe: { $ref: "./partners/operations.yaml#/receiveFeed" }, publish: { traits: [{ $ref: "./partners/traits.yaml#/feed" }] } },
    "x-payments.cdc.legacy.v1": { description: "Legacy feed.", subscribe: { summary: 0, message: message("authorisation") } },
    "payments.cdc.silent.v1": { description: "Channel without operations." },
  },
  components: {
    channels: {
      refunds: { description: "Refunds.", subscribe: { summary: "Receive refunds.", message: message("refund") }, publish: { traits: [{ $ref: "#/components/x-trait-lists/refunds/0" }], message: message("refund") } },
    },
    operationTraits: {
      ledger: { summary: "Record ledger entries.", bindings: { kafka: { groupId: { type: "string", enum: ["ledger"] }, bindingVersion: "0.4.0" } } },
      settlement: { summary: "Settle payments." },
      blank: { summary: "" },
    },
    messages: {
      authorisation: {
        messageId: "authorisation",
        name: "authorisation",
        contentType: "application/json",
        correlationId: { location: "$message.header#/correlationId" },
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
        payload: { type: "object", properties: { paymentId: { type: "string" }, voucher: { type: ["string", "null"] } } },
      },
      authorisationAvro: {
        messageId: "authorisationAvro",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: { type: "record", name: "Authorisation", namespace: "es.quality.payments", fields: [{ name: "paymentId", type: "string" }, { name: "voucher", type: ["null", "string"], default: null }] },
      },
      telemetry: { messageId: "telemetry", payload: { type: "object", properties: { terminalId: { type: "string" } } } },
      settlement: { messageId: "settlement", payload: { type: "object" } },
      console: { messageId: "console", payload: { type: "string" } },
      refund: { messageId: "refund", payload: { type: "object" } },
    },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    "x-texts": { console: "Send console commands." },
    "x-trait-lists": { refunds: [{ summary: "Publish refunds." }] },
  },
};
