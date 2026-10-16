module.exports = {
  asyncapi: "3.0.0",
  id: "urn:quality:payments:event-backbone",
  info: {
    title: "Quality Payments Event Backbone",
    version: "5.0.0",
    description: "Payment lifecycle events published on IBM Event Streams and on the on-premises Kafka cluster.",
    contact: { name: "Payments Platform Team", email: "payments-platform@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ name: "production" }, { name: "rabbitmq" }],
    "x-servers": { production: { host: "kafka.example.org", protocol: "kafka" } },
  },
  defaultContentType: "application/json",
  servers: {
    eventstreams: {
      host: "es-kafka-bootstrap-eventstreams.{cluster}.quality.es:{port}",
      protocol: "kafka-secure",
      protocolVersion: "3.6.0",
      title: "IBM Event Streams cluster",
      summary: "Managed Kafka for payment events.",
      variables: {
        cluster: { enum: ["apps-dev", "apps-pre", "apps-pro"], default: "apps-pro" },
        port: { enum: ["443", "9093"], default: "443" },
      },
      security: [{ $ref: "#/components/securitySchemes/eventStreamsScram" }],
      tags: [{ name: "production", description: "Serves production traffic." }, { $ref: "#/components/tags/staging" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es/apis/ccompat/v7", schemaRegistryVendor: "apicurio", bindingVersion: "0.5.0" } },
    },
    kafka: { $ref: "#/components/servers/onPremKafka" },
  },
  channels: {
    paymentCreated: {
      address: "payments.cdc.payment.created.v1",
      title: "Payment created",
      servers: [{ $ref: "#/servers/eventstreams" }, { $ref: "#/servers/kafka" }],
      messages: { paymentCreated: { $ref: "#/components/messages/PaymentCreated" } },
    },
    refundRequested: {
      address: "payments.cmd.refund.requested.v1",
      servers: [{ $ref: "#/servers/eventstreams" }],
      messages: {
        refundRequested: { $ref: "#/components/messages/RefundRequested" },
        refundCancelled: { $ref: "#/components/messages/RefundCancelled" },
      },
    },
    settlements: {
      address: "payments/{region}/settlements",
      servers: [{ $ref: "#/servers/kafka" }],
      parameters: { region: { enum: ["production", "staging", "eu", "us"], default: "eu", description: "Settlement region." } },
      messages: {
        settlementBatch: {
          name: "settlementBatch",
          contentType: "application/vnd.apache.avro",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "SettlementBatch",
              namespace: "es.quality.payments",
              fields: [
                { name: "batchId", type: "string" },
                { name: "server", type: { type: "enum", name: "ServerType", symbols: ["production", "staging", "eventstreams"] } },
                { name: "kafka", type: ["null", "string"], default: null },
              ],
            },
          },
        },
      },
    },
    refundReplies: { address: null, messages: { refundAccepted: { name: "refundAccepted", payload: { type: "object" } } } },
  },
  operations: {
    publishPaymentCreated: {
      action: "send",
      channel: { $ref: "#/channels/paymentCreated" },
      messages: [{ $ref: "#/channels/paymentCreated/messages/paymentCreated" }],
      tags: [{ name: "kafka" }, { name: "production" }],
      bindings: { kafka: { groupId: { type: "string", enum: ["payments-production"] }, bindingVersion: "0.5.0" } },
    },
    receiveRefundRequested: {
      action: "receive",
      channel: { $ref: "#/channels/refundRequested" },
      traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
      reply: {
        address: { location: "$message.header#/replyTo", description: "Reply topic named production or staging." },
        channel: { $ref: "#/channels/refundReplies" },
      },
    },
    receiveSettlementBatch: { action: "receive", channel: { $ref: "#/channels/settlements" } },
  },
  components: {
    servers: {
      onPremKafka: { host: "kafka-{env}.quality.es:9092", protocol: "kafka", variables: { env: { $ref: "#/components/serverVariables/env" } } },
      production: { host: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure" },
      staging: { host: "es-kafka-bootstrap.apps-pre.quality.es:443", protocol: "kafka-secure" },
      "x-mirror": { host: "mirror.quality.es:9092", protocol: "kafka" },
      Kafka: { $ref: "#/components/servers/onPremKafka" },
    },
    serverVariables: { env: { enum: ["dev", "pre", "pro"], default: "pro" }, production: { enum: ["pro"] } },
    schemas: {
      PaymentCreated: {
        type: "object",
        required: ["paymentId"],
        properties: {
          paymentId: { type: "string", format: "uuid" },
          servers: { type: "object", properties: { production: { type: "string" }, staging: { type: ["string", "null"] } } },
          serverType: { type: "string", enum: ["production", "staging", "mqtt"] },
        },
      },
      Refund: { type: "object", properties: { refundId: { type: "string" } } },
    },
    messages: {
      PaymentCreated: {
        name: "paymentCreated",
        contentType: "application/json",
        correlationId: { location: "$message.header#/production" },
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }],
        payload: { $ref: "#/components/schemas/PaymentCreated" },
        examples: [{ name: "production", payload: { paymentId: "4b6e1d0a-1d1f-4f3f-9a77-0f2d1b4e6a10", serverType: "production" } }],
      },
      RefundRequested: { name: "refundRequested", payload: { $ref: "#/components/schemas/Refund" } },
      RefundCancelled: { name: "refundCancelled", payload: { $ref: "#/components/schemas/Refund" } },
    },
    securitySchemes: { eventStreamsScram: { type: "scramSha512", description: "SCRAM credentials issued by Event Streams." } },
    tags: { staging: { name: "staging" } },
    messageTraits: { commonHeaders: { headers: { type: "object", properties: { server: { type: "string", const: "production" } } } } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["refunds-staging"] }, bindingVersion: "0.5.0" } } } },
    serverBindings: { production: { kafka: { bindingVersion: "0.5.0" } } },
    replies: { production: { channel: { $ref: "#/channels/refundReplies" } } },
    replyAddresses: { staging: { location: "$message.header#/replyTo" } },
  },
};
