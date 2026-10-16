module.exports = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Order Service Events",
    "version": "1.4.0",
    "description": "Kafka events of the order service whose messageIds and message names break camelCase."
  },
  "channels": {
    "retail.cmd.orders.placed.v1": {
      "publish": {
        "operationId": "publishOrderPlaced",
        "message": {
          "messageId": "OrderPlaced",
          "name": "order_placed",
          "payload": { "type": "object" },
          "traits": [
            { "$ref": "#/components/messageTraits/commonHeaders" },
            { "messageId": "order-placed-trait", "name": "ORDER_PLACED" }
          ]
        }
      },
      "subscribe": {
        "operationId": "receiveOrderUpdates",
        "message": {
          "oneOf": [
            { "$ref": "#/components/messages/orderShipped" },
            { "messageId": "order cancelled", "name": "orderCancelled" },
            { "messageId": "orderRefunded", "name": "2orderRefunded" }
          ]
        }
      }
    },
    "retail.cdc.payments.captured.v1": {
      "subscribe": {
        "operationId": "receivePaymentCaptured",
        "message": {
          "messageId": "paymentCapturedID",
          "name": "payment.captured",
          "schemaFormat": "application/vnd.apache.avro;version=1.9.0",
          "payload": { "type": "record", "name": "PaymentCaptured", "fields": [] }
        }
      }
    }
  },
  "components": {
    "channels": {
      "auditChannel": {
        "publish": {
          "message": { "messageId": "Audit_Recorded", "name": "auditRecorded" }
        }
      }
    },
    "messages": {
      "orderShipped": {
        "messageId": "orderShipped",
        "name": "OrderShipped",
        "traits": [{ "$ref": "#/components/messageTraits/commonHeaders" }]
      }
    },
    "messageTraits": {
      "commonHeaders": {
        "messageId": "common-headers",
        "name": "Common Headers"
      }
    }
  }
};
