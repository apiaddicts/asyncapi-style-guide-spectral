const message = (name) => ({ $ref: `#/components/messages/${name}` });

module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Payments Event Streams", version: "3.4.0" },
  servers: {
    production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    warehouse: { url: "rabbit.quality.es:5671", protocol: "amqps", protocolVersion: "0.9.1" },
    sensors: { url: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    "payments.cdc.compliant.v1": {
      description: "Compliant channel.",
      subscribe: { operationId: "receiveCompliant", message: message("paymentCaptured") },
    },
    "payments.cdc.noDescription.v1": {
      subscribe: { operationId: "receiveNoDescription", message: message("paymentCaptured") },
    },
    "payments.cdc.noOperations.v1": {
      description: "Channel that only declares parameters and bindings.",
      bindings: { kafka: { partitions: 6, bindingVersion: "0.4.0" } },
    },
    "payments.cdc.noMessage.v1": {
      description: "Operation without message.",
      publish: { operationId: "publishNoMessage", summary: "Publishes nothing.", bindings: { kafka: { clientId: "payments" } } },
    },
    "payments.cdc.empty.v1": {},
    "payments.cdc.blankDescription.v1": {
      description: "   ",
      subscribe: { message: message("paymentCaptured") },
    },
    "payments.cdc.nullDescription.v1": {
      description: null,
      subscribe: { message: message("paymentCaptured") },
    },
    "payments.cdc.zeroWidthDescription.v1": {
      description: "\u200b\ufeff",
      subscribe: { message: message("paymentCaptured") },
    },
    "payments.cdc.emptyOneOf.v1": {
      description: "Publish declares an empty oneOf.",
      publish: { operationId: "publishEmptyOneOf", message: { oneOf: [] } },
    },
    "payments.cdc.bothEmpty.v1": {
      description: "Both operations declare an empty message.",
      publish: { operationId: "publishNull", message: null },
      subscribe: { operationId: "receiveEmptyOneOf", message: { oneOf: [] } },
    },
    "payments.cdc.danglingMessage.v1": {
      description: "The message reference does not resolve.",
      subscribe: { operationId: "receiveDangling", message: message("retired") },
    },
    "payments.cdc.messagesMap.v1": {
      description: "Written with the AsyncAPI 3.x messages map.",
      messages: { paymentCaptured: message("paymentCaptured") },
    },
    "payments.cdc.sendReceive.v1": {
      description: "Written with the AsyncAPI 3.x actions.",
      send: { message: message("paymentCaptured") },
      receive: { message: message("paymentCaptured") },
    },
    "payments.cdc.traitMessage.v1": {
      description: "The message only appears in an operation trait.",
      subscribe: { operationId: "receiveTraitMessage", traits: [{ message: message("paymentCaptured") }] },
    },
    "payments.cdc.extensionsOnly.v1": {
      "x-description": "Extensions do not count.",
      "x-publish": { message: message("paymentCaptured") },
    },
    "payments.cdc.operationDescriptionOnly.v1": {
      publish: { operationId: "publishOperationDescription", description: "Only the operation is described.", message: message("paymentCaptured") },
    },
    "payments.cdc.nullChannel.v1": null,
    "payments.cdc.stringChannel.v1": "payments.cdc.string.v1",
    "payments.cdc.listChannel.v1": [{ description: "Listed.", subscribe: { message: message("paymentCaptured") } }],
    "x-payments.cdc.partner.v1": {
      subscribe: { operationId: "receivePartner", message: message("paymentCaptured") },
    },
    "stores/{storeId}/terminals/{terminalId}": {
      description: "Payment terminal heartbeats.",
      servers: ["sensors"],
      parameters: { storeId: { schema: { type: "string" } }, terminalId: { schema: { type: "string" } } },
      publish: { operationId: "publishHeartbeat", bindings: { mqtt: { qos: 1 } } },
    },
    "payments.refunds.requested": {
      servers: ["warehouse"],
      bindings: { amqp: { is: "routingKey", exchange: { name: "payments", type: "topic" } } },
      subscribe: { operationId: "receiveRefundRequested", message: { oneOf: [message("refundRequested"), message("paymentCaptured")] } },
    },
    "payments.cdc.shared.v1": { $ref: "#/components/channels/refundsShared" },
  },
  components: {
    channels: {
      refundsShared: {
        subscribe: { operationId: "receiveRefundShared", message: message("refundRequested") },
      },
      archiveShared: { description: "", publish: {} },
      nullShared: null,
      compliantShared: {
        description: "Compliant shared channel.",
        publish: { operationId: "publishCompliantShared", message: message("refundRequested") },
      },
    },
    messages: {
      paymentCaptured: { name: "paymentCaptured", payload: { type: "object", properties: { paymentId: { type: "string" } } } },
      refundRequested: { name: "refundRequested", payload: { type: "object", properties: { refundId: { type: ["string", "null"] } } } },
    },
  },
};
