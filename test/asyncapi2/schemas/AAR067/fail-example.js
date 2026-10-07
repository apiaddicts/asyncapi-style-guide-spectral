module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Northwind Retail Order Events",
    version: "2.1.0",
    description: "Order, payment and fulfilment events of the Northwind retail platform.",
  },
  defaultContentType: "application/jsn",
  servers: {
    production: { url: "broker.northwind.io:9093", protocol: "kafka-secure" },
  },
  channels: {
    "retail.cmd.orders.placed.v1": {
      description: "Orders placed in any sales channel.",
      publish: {
        operationId: "publishOrderPlaced",
        message: {
          messageId: "orderPlaced",
          contentType: "text/json",
          traits: [
            { $ref: "#/components/messageTraits/kafkaHeaders" },
            { contentType: "application/x-ndjson" },
            { contentType: "application/json; charset=utf-8" },
          ],
          payload: { type: "object", properties: { orderId: { type: "string" } } },
        },
      },
      subscribe: {
        operationId: "consumeOrderPlaced",
        message: {
          oneOf: [
            {
              messageId: "orderPlacedAvro",
              contentType: "application/vnd.apache.avro;version=1.9.0",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: { type: "record", name: "OrderPlaced", fields: [{ name: "orderId", type: "string" }] },
            },
            { $ref: "#/components/messages/orderCancelled" },
            { messageId: "orderPlacedLegacy", contentType: "application json" },
            { messageId: "orderPlacedJson", contentType: "application/json" },
          ],
        },
      },
    },
    "retail.cdc.payments.captured.v1": {
      description: "Captured card payments.",
      subscribe: {
        operationId: "consumePaymentCaptured",
        message: {
          messageId: "paymentCaptured",
          contentType: "multipart/form-data; boundary=northwind",
          payload: { type: "object" },
        },
      },
    },
    "retail.sys.audit.trail.v1": { $ref: "#/components/channels/auditTrail" },
  },
  components: {
    channels: {
      auditTrail: {
        description: "Audit lines.",
        publish: {
          operationId: "publishAuditLine",
          message: { messageId: "auditLine", contentType: "text/html", payload: { type: "string" } },
        },
      },
    },
    messages: {
      orderCancelled: {
        messageId: "orderCancelled",
        contentType: "application/cloudevents+json",
        payload: { type: "object" },
      },
      orderShipped: {
        messageId: "orderShipped",
        contentType: "application/*",
        payload: { type: "object" },
      },
      paymentEvents: {
        oneOf: [
          { messageId: "paymentAuthorized", contentType: "application/avro" },
          { messageId: "paymentReceipt", contentType: "image/png" },
        ],
      },
    },
    messageTraits: {
      kafkaHeaders: {
        contentType: "application/json",
        headers: { type: "object", properties: { traceparent: { type: "string" } } },
      },
      legacyFormTrait: { contentType: "application/x-www-form-urlencoded" },
    },
  },
};
