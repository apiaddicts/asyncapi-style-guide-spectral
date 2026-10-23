module.exports = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Payments Gateway Events",
    "version": "4.0.0",
    "description": "AMQP and Kafka events of the payments gateway, every tag name in kebab-case.",
    "tags": [{ "name": "Not_Evaluated_In_V2" }]
  },
  "servers": {
    "rabbitProduction": {
      "url": "amqps://rabbit.payments.example.com:5671",
      "protocol": "amqps",
      "tags": [{ "name": "production" }, { "name": "eu-west-1" }]
    },
    "kafkaProduction": { "$ref": "#/components/servers/kafkaProduction" }
  },
  "tags": [
    { "name": "payments", "description": "Payment lifecycle." },
    { "name": "card-authorizations", "externalDocs": { "url": "https://docs.example.com/cards" } },
    { "name": "pci-dss-v4" }
  ],
  "channels": {
    "payments.authorized": {
      "description": "Authorized payments.",
      "tags": [{ "name": "Not_Evaluated_In_V2" }],
      "bindings": { "amqp": { "is": "routingKey", "exchange": { "name": "Payments_Exchange", "type": "topic" }, "bindingVersion": "0.2.0" } },
      "publish": {
        "operationId": "publishPaymentAuthorized",
        "tags": [{ "name": "payments" }, { "name": "card-authorizations" }],
        "traits": [{ "$ref": "#/components/operationTraits/amqpPublisher" }, { "tags": [{ "name": "publisher" }] }],
        "message": {
          "name": "paymentAuthorized",
          "tags": [{ "name": "payment-authorized" }],
          "payload": {
            "type": "object",
            "properties": {
              "tags": { "type": "array", "items": { "type": "string", "enum": ["High Risk", "Manual_Review"] } }
            }
          },
          "examples": [{ "name": "First_Payment", "payload": { "tags": ["High Risk"] } }],
          "traits": [{ "$ref": "#/components/messageTraits/auditable" }, { "tags": [{ "name": "inline-trait" }] }],
          "x-tags": [{ "name": "Not_Evaluated_Extension" }]
        }
      },
      "subscribe": {
        "operationId": "receivePaymentAuthorized",
        "message": {
          "oneOf": [
            { "$ref": "#/components/messages/paymentDeclined" },
            { "name": "paymentVoided", "tags": [{ "name": "voids" }, { "name": "v2" }] }
          ]
        }
      }
    },
    "payments.refunded": { "$ref": "#/components/channels/refunds" }
  },
  "operations": {
    "Not_Evaluated_In_V2": { "tags": [{ "name": "Not_Evaluated_In_V2" }] }
  },
  "components": {
    "servers": {
      "kafkaProduction": {
        "url": "kafka.payments.example.com:9093",
        "protocol": "kafka-secure",
        "tags": [{ "name": "kafka" }, { "name": "production" }]
      }
    },
    "channels": {
      "refunds": {
        "subscribe": {
          "tags": [{ "name": "refunds" }],
          "message": { "tags": [{ "name": "refund-issued" }] }
        }
      }
    },
    "messages": {
      "paymentDeclined": {
        "name": "paymentDeclined",
        "tags": [{ "name": "declines" }],
        "schemaFormat": "application/vnd.apache.avro;version=1.9.0",
        "payload": { "type": "record", "name": "PaymentDeclined", "fields": [{ "name": "Reason_Code", "type": ["null", "string"] }] }
      }
    },
    "operationTraits": {
      "amqpPublisher": { "tags": [{ "name": "amqp" }], "bindings": { "amqp": { "ack": true, "bindingVersion": "0.2.0" } } }
    },
    "messageTraits": {
      "auditable": { "tags": [{ "name": "audit-trail" }] }
    },
    "tags": { "Not_Evaluated_In_V2": { "name": "Not_Evaluated_In_V2" } }
  }
};
