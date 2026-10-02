module.exports = {
  "asyncapi": "2.6.0",
  "id": "urn:com:retail:order-service",
  "info": {
    "title": "Order Service Events",
    "version": "1.4.0",
    "description": "Kafka events of the order service, every messageId and message name in camelCase."
  },
  "defaultContentType": "application/json",
  "servers": {
    "production": {
      "url": "broker.retail.example.com:9093",
      "protocol": "kafka-secure",
      "description": "Production Kafka cluster."
    }
  },
  "tags": [{ "name": "Order Lifecycle" }],
  "channels": {
    "retail.cmd.orders.placed.v1": {
      "description": "Orders placed by customers.",
      "bindings": { "kafka": { "topic": "retail.cmd.orders.placed.v1", "partitions": 12, "bindingVersion": "0.4.0" } },
      "publish": {
        "operationId": "publishOrderPlaced",
        "summary": "Publish an order placed event.",
        "message": {
          "messageId": "orderPlaced",
          "name": "orderPlaced",
          "title": "Order Placed",
          "contentType": "application/json",
          "correlationId": { "location": "$message.header#/correlationId" },
          "headers": {
            "type": "object",
            "properties": {
              "correlationId": { "type": "string", "format": "uuid" },
              "name": { "type": "string", "const": "Order_Placed_Header" }
            }
          },
          "payload": {
            "type": "object",
            "properties": {
              "orderId": { "type": "string", "format": "uuid" },
              "name": { "type": ["string", "null"], "maxLength": 120 }
            }
          },
          "examples": [
            { "name": "Order_Placed_Example", "summary": "A first order.", "payload": { "orderId": "1b1f", "name": "Order Placed" } }
          ],
          "bindings": { "kafka": { "key": { "type": "string" }, "bindingVersion": "0.4.0" } },
          "traits": [
            { "$ref": "#/components/messageTraits/commonHeaders" },
            { "messageId": "orderPlaced", "name": "orderPlacedV2" }
          ],
          "x-message-name": "Order_Placed_Extension"
        }
      },
      "subscribe": {
        "operationId": "receiveOrderUpdates",
        "message": {
          "oneOf": [
            { "$ref": "#/components/messages/orderShipped" },
            { "messageId": "orderCancelled", "name": "orderCancelled", "payload": { "type": "object" } },
            { "messageId": "order2fa", "name": "order" }
          ]
        }
      }
    },
    "retail.cdc.payments.captured.v1": {
      "subscribe": {
        "operationId": "receivePaymentCaptured",
        "message": {
          "messageId": "paymentCaptured",
          "name": "paymentCaptured",
          "schemaFormat": "application/vnd.apache.avro;version=1.9.0",
          "contentType": "application/vnd.apache.avro+json",
          "payload": {
            "type": "record",
            "name": "PaymentCaptured",
            "namespace": "org.madrid.retail.cdc.payments",
            "fields": [
              { "name": "payment_id", "type": "string" },
              { "name": "Amount_Value", "type": ["null", "double"], "default": null }
            ]
          }
        }
      }
    },
    "retail.sys.audit.v1": {
      "$ref": "#/components/channels/auditChannel"
    }
  },
  "components": {
    "channels": {
      "auditChannel": {
        "publish": {
          "message": { "messageId": "auditRecorded", "name": "auditRecorded" }
        }
      }
    },
    "messages": {
      "OrderShipped": { "messageId": "orderShippedLegacy", "name": "orderShippedLegacy" },
      "orderShipped": {
        "messageId": "orderShipped",
        "name": "orderShipped",
        "payload": { "$ref": "#/components/schemas/Shipment" },
        "traits": [{ "$ref": "#/components/messageTraits/commonHeaders" }]
      }
    },
    "schemas": {
      "Shipment": {
        "type": "object",
        "properties": {
          "shipmentId": { "type": "string" },
          "name": { "type": "string", "enum": ["Express_Delivery", "Standard Delivery"] }
        }
      }
    },
    "messageTraits": {
      "commonHeaders": {
        "messageId": "commonHeaders",
        "name": "commonHeaders",
        "headers": { "type": "object", "properties": { "name": { "type": "string" } } }
      }
    }
  }
};
