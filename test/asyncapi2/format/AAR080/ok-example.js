module.exports = {
  asyncapi: "2.6.0",
  id: "urn:banking:open-payments",
  info: {
    title: "Open Banking Payment Events",
    version: "6.3.0",
    description: "Payment initiation, settlement and consent events exchanged with licensed third-party providers.",
    termsOfService: "https://payments.bank.example.io/legal/terms",
    contact: { name: "Open Banking Integration", email: "open-banking@bank.example.io" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0", "x-spdx-list": "3.29.0" },
    "x-license": { name: "Apache License, Version 2.0" },
  },
  license: { name: "Proprietary" },
  "x-license": { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  defaultContentType: "application/json",
  tags: [{ name: "payments", description: "Licensed under Apache License 2.0." }],
  externalDocs: { description: "Apache License 2.0 terms of the SDK.", url: "https://payments.bank.example.io/docs" },
  servers: {
    paymentsKafka: {
      url: "kafka-{region}.payments.bank.example.io:9093",
      protocol: "kafka-secure",
      description: "Payment backbone, one cluster per region.",
      variables: { region: { enum: ["eu-west", "eu-central"], default: "eu-west", description: "Licensed region." } },
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.payments.bank.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    consentsAmqp: { url: "amqps://consents.bank.example.io:5671/psd2", protocol: "amqps", description: "Consent lifecycle broker.", security: [{ mtls: [] }] },
    devicesMqtt: {
      url: "mqtts://devices.bank.example.io:8883",
      protocol: "secure-mqtt",
      description: "Card terminals report authorisations.",
      bindings: { mqtt: { clientId: "payments-core", cleanSession: false, keepAlive: 60, bindingVersion: "0.1.0" } },
    },
    portalWs: { url: "wss://portal.bank.example.io/live", protocol: "wss", description: "Live feed for the provider portal." },
  },
  channels: {
    "payments.cdc.initiations.created.v6": {
      description: "Payment initiations created by a third-party provider.",
      servers: ["paymentsKafka"],
      bindings: { kafka: { topic: "payments.cdc.initiations.created.v6", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishInitiationCreated",
        summary: "The gateway publishes initiations.",
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        message: { $ref: "#/components/messages/initiationCreated" },
      },
      subscribe: {
        operationId: "receiveInitiationCreated",
        summary: "The ledger receives initiations.",
        bindings: { kafka: { groupId: { type: "string", enum: ["ledger"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/initiationCreated" },
            {
              name: "initiationCreatedAvro",
              title: "Initiation created in Avro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: {
                type: "record",
                name: "InitiationCreated",
                namespace: "io.example.bank.payments",
                fields: [
                  { name: "paymentId", type: "string" },
                  { name: "amountMinor", type: "long" },
                  { name: "license", type: ["null", { type: "record", name: "ProviderLicense", fields: [{ name: "name", type: "string", default: "Proprietary" }, { name: "url", type: ["null", "string"], default: null }] }], default: null },
                ],
              },
            },
          ],
        },
      },
    },
    "consents/{providerId}/revoked": {
      description: "Consents revoked by the account holder.",
      servers: ["consentsAmqp"],
      parameters: { providerId: { description: "Licensed provider identifier.", schema: { type: "string", pattern: "^PSD[A-Z]{2}-[A-Z0-9]{6}$" } } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "consents", type: "topic", durable: true, autoDelete: false, vhost: "/psd2" }, bindingVersion: "0.2.0" } },
      subscribe: {
        operationId: "receiveConsentRevoked",
        summary: "Providers receive revocations.",
        message: {
          name: "consentRevoked",
          title: "Consent revoked",
          traits: [{ $ref: "#/components/messageTraits/psd2Headers" }],
          payload: {
            type: "object",
            required: ["consentId"],
            properties: {
              consentId: { type: "string", format: "uuid" },
              reason: { type: ["string", "null"], enum: ["expired", "revoked", null] },
              providerLicense: { $ref: "#/components/schemas/ProviderLicense" },
            },
          },
          examples: [{ name: "revokedByHolder", payload: { consentId: "6f1c2a9e-4b51-4f57-9c1e-2f3d4a5b6c7d", reason: "revoked", providerLicense: { name: "Apache License 2.0", url: "" } } }],
        },
      },
    },
    "terminals/{terminalId}/authorisations": {
      description: "Card authorisations reported by terminals.",
      servers: ["devicesMqtt"],
      parameters: { terminalId: { $ref: "#/components/parameters/terminalId" } },
      publish: {
        operationId: "publishAuthorisation",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.1.0" } },
        message: { $ref: "#/components/messages/authorisationReported" },
      },
    },
    "portal/license": {
      description: "Provider licence status pushed to the portal.",
      servers: ["portalWs"],
      subscribe: {
        operationId: "receiveLicenseStatus",
        message: { name: "license", title: "Licence status", payload: { type: "object", properties: { name: { type: "string", const: "GPL v3" }, url: { type: "string" } } } },
      },
    },
  },
  components: {
    messages: {
      initiationCreated: {
        name: "initiationCreated",
        title: "Initiation created",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/paymentId" },
        payload: { $ref: "#/components/schemas/Initiation" },
      },
      authorisationReported: {
        name: "authorisationReported",
        title: "Authorisation reported",
        payload: { type: "object", properties: { terminalId: { type: "string" }, approved: { type: "boolean" }, licenseName: { type: "string", default: "MIT License" } } },
      },
    },
    schemas: {
      Initiation: {
        type: "object",
        required: ["paymentId", "amountMinor", "currency"],
        properties: {
          paymentId: { type: "string", format: "uuid" },
          amountMinor: { type: "integer", format: "int64", minimum: 1 },
          currency: { type: "string", pattern: "^[A-Z]{3}$" },
          license: { type: ["object", "null"], properties: { name: { type: "string", examples: ["Apache 2.0"] } } },
        },
      },
      ProviderLicense: { type: "object", required: ["name"], properties: { name: { type: "string", enum: ["Apache License 2.0", "Proprietary"] }, url: { type: ["string", "null"], format: "uri" } } },
    },
    parameters: { terminalId: { description: "Terminal serial number.", schema: { type: "string" } } },
    correlationIds: { paymentId: { description: "Payment identifier.", location: "$message.payload#/paymentId" } },
    messageTraits: { psd2Headers: { headers: { type: "object", properties: { "x-license": { type: "string", default: "Apache 2.0" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["payments-gateway"] }, bindingVersion: "0.4.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials." }, mtls: { type: "X509", description: "Mutual TLS with eIDAS certificates." } },
    "x-licenses": { sdk: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" }, portal: { name: 42 } },
  },
};
