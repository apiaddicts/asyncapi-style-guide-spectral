module.exports = {
  asyncapi: "2.6.0",
  id: "urn:quality:payments:event-backbone",
  info: {
    title: "Quality Payments Event Backbone",
    version: "4.2.0",
    description: "Payment lifecycle events published on IBM Event Streams and on the on-premises Kafka cluster.",
    contact: { name: "Payments Platform Team", email: "payments-platform@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    "x-servers": { production: { url: "kafka.example.org", protocol: "kafka" } },
    "x-server-type": "production",
  },
  defaultContentType: "application/json",
  servers: {
    eventstreams: {
      url: "es-kafka-bootstrap-eventstreams.{cluster}.quality.es:{port}",
      protocol: "kafka-secure",
      protocolVersion: "3.6.0",
      description: "IBM Event Streams cluster for payment events.",
      variables: {
        cluster: { enum: ["apps-dev", "apps-pre", "apps-pro"], default: "apps-pro", description: "OpenShift cluster domain." },
        port: { enum: ["443", "9093"], default: "443" },
      },
      security: [{ eventStreamsScram: [] }],
      tags: [{ name: "production", description: "Serves production traffic." }, { name: "staging" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es/apis/ccompat/v7", schemaRegistryVendor: "apicurio", bindingVersion: "0.4.0" } },
    },
    kafka: {
      url: "kafka://kafka-{env}.quality.es:9092",
      protocol: "kafka",
      description: "On-premises Kafka cluster kept for settlement batches.",
      variables: { env: { enum: ["dev", "pre", "pro"], default: "pro" } },
      security: [{ kafkaMtls: [] }],
      "x-server-name": "production",
    },
  },
  channels: {
    "payments.cdc.payment.created.v1": {
      description: "Payment created in the core banking system.",
      servers: ["eventstreams", "kafka"],
      publish: {
        operationId: "publishPaymentCreated",
        summary: "Publish a created payment.",
        tags: [{ name: "kafka" }, { name: "production" }],
        bindings: { kafka: { groupId: { type: "string", enum: ["payments-production"] }, clientId: { type: "string", enum: ["staging-client"] }, bindingVersion: "0.4.0" } },
        message: { $ref: "#/components/messages/PaymentCreated" },
      },
    },
    "payments.cmd.refund.requested.v1": {
      description: "Refund requested by a customer.",
      servers: ["eventstreams"],
      parameters: {},
      subscribe: {
        operationId: "receiveRefundRequested",
        summary: "Receive a refund request.",
        traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
        message: {
          oneOf: [{ $ref: "#/components/messages/RefundRequested" }, { $ref: "#/components/messages/RefundCancelled" }],
        },
      },
    },
    "payments/{region}/settlements": {
      description: "Settlement batches per region.",
      servers: ["kafka"],
      parameters: { region: { description: "Settlement region.", schema: { type: "string", enum: ["production", "staging", "eu", "us"] } } },
      subscribe: {
        operationId: "receiveSettlementBatch",
        message: {
          name: "settlementBatch",
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          contentType: "application/vnd.apache.avro",
          payload: {
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
  components: {
    servers: {
      production: { url: "es-kafka-bootstrap.apps-pro.quality.es:443", protocol: "kafka-secure" },
      staging: { url: "es-kafka-bootstrap.apps-pre.quality.es:443", protocol: "kafka-secure" },
      drKafka: { url: "kafka-dr.quality.es:9092", protocol: "kafka" },
      "x-mirror": { url: "mirror.quality.es:9092", protocol: "kafka" },
      Kafka: { $ref: "#/components/servers/drKafka" },
    },
    serverVariables: { production: { enum: ["pro"], default: "pro" } },
    schemas: {
      PaymentCreated: {
        type: "object",
        required: ["paymentId", "amount"],
        properties: {
          paymentId: { type: "string", format: "uuid" },
          amount: { type: "number", format: "double", minimum: 0 },
          servers: { type: "object", properties: { production: { type: "string" }, staging: { type: ["string", "null"] } } },
          serverType: { type: "string", enum: ["production", "staging", "mqtt"] },
        },
      },
      Refund: { type: "object", properties: { refundId: { type: "string" }, reason: { type: ["string", "null"], maxLength: 200 } } },
    },
    messages: {
      PaymentCreated: {
        name: "paymentCreated",
        title: "Payment created",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }],
        payload: { $ref: "#/components/schemas/PaymentCreated" },
        examples: [{ name: "production", payload: { paymentId: "4b6e1d0a-1d1f-4f3f-9a77-0f2d1b4e6a10", amount: 12.5, serverType: "production" } }],
      },
      RefundRequested: { name: "refundRequested", payload: { $ref: "#/components/schemas/Refund" } },
      RefundCancelled: { name: "refundCancelled", payload: { $ref: "#/components/schemas/Refund" } },
    },
    securitySchemes: {
      eventStreamsScram: { type: "scramSha512", description: "SCRAM credentials issued by Event Streams." },
      kafkaMtls: { type: "X509", description: "Mutual TLS for the on-premises cluster." },
    },
    messageTraits: { commonHeaders: { headers: { type: "object", properties: { server: { type: "string", const: "production" } } } } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["refunds-staging"] }, bindingVersion: "0.4.0" } } } },
    serverBindings: { production: { kafka: { bindingVersion: "0.4.0" } } },
  },
  tags: [{ name: "production" }, { name: "rabbitmq" }],
};
