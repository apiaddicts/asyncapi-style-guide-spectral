module.exports = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Payments Gateway Events",
    "version": "4.0.0",
    "description": "Tag names that break kebab-case in every location AsyncAPI 2.x allows."
  },
  "servers": {
    "rabbitProduction": {
      "url": "amqps://rabbit.payments.example.com:5671",
      "protocol": "amqps",
      "tags": [{ "name": "production" }, { "name": "EU West" }]
    }
  },
  "tags": [
    { "name": "Payments" },
    { "name": "card_authorizations" },
    { "name": "pci-dss-v4" }
  ],
  "channels": {
    "payments.authorized": {
      "publish": {
        "tags": [{ "name": "cardAuthorizations" }],
        "traits": [{ "$ref": "#/components/operationTraits/amqpPublisher" }, { "tags": [{ "name": "Publisher" }] }],
        "message": {
          "tags": [{ "name": "payment--authorized" }],
          "traits": [{ "$ref": "#/components/messageTraits/auditable" }, { "tags": [{ "name": "inline_trait" }] }]
        }
      },
      "subscribe": {
        "message": {
          "oneOf": [
            { "$ref": "#/components/messages/paymentDeclined" },
            { "tags": [{ "name": "voids" }, { "name": "-voids" }] }
          ]
        }
      }
    }
  },
  "components": {
    "servers": {
      "kafkaProduction": { "url": "kafka.payments.example.com:9093", "protocol": "kafka-secure", "tags": [{ "name": "KAFKA" }] }
    },
    "channels": {
      "refunds": {
        "subscribe": {
          "tags": [{ "name": "refunds." }],
          "message": { "tags": [{ "name": "refund issued" }] }
        }
      }
    },
    "messages": {
      "paymentDeclined": { "tags": [{ "name": "Declines" }] }
    },
    "operationTraits": {
      "amqpPublisher": { "tags": [{ "name": "AMQP-Publisher" }] }
    },
    "messageTraits": {
      "auditable": { "tags": [{ "name": "audit trail" }] }
    }
  }
};
