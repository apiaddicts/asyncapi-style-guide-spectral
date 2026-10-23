const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:media:rights-distribution",
  info: {
    title: "Media Rights Distribution Events",
    version: "6.2.0",
    description: "Licensing windows, territory grants and royalty statements of the streaming catalogue.",
    termsOfService: "https://rights.media.example.io/terms",
    contact: { name: "Rights Platform Team", url: "https://rights.media.example.io/platform", email: "rights-platform@media.example.io" },
    license: {
      name: "Apache 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      "x-spdx-id": "Apache-2.0",
      "x-legal-review": "2026-03-01",
    },
    "x-audience": "partner",
  },
  defaultContentType: "application/json",
  tags: [
    { name: "licensing", description: "Content licensing windows." },
    { name: "royalties", description: "Royalty settlement." },
  ],
  externalDocs: { description: "Rights platform handbook.", url: "https://rights.media.example.io/handbook" },
  servers: {
    rightsKafka: {
      url: "kafka-{region}.rights.media.example.io:9093",
      protocol: "kafka-secure",
      description: "Rights event backbone.",
      variables: { region: { enum: ["eu-west-1", "us-east-1"], default: "eu-west-1" } },
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.rights.media.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    royaltiesAmqp: { url: "amqps://royalties.media.example.io:5671/settlement", protocol: "amqps", description: "Royalty settlement broker.", security: [{ brokerCert: [] }] },
    devicesMqtt: { url: "mqtts://devices.media.example.io:8883", protocol: "secure-mqtt", description: "Set-top box gateways.", bindings: { mqtt: { clientId: "rights-edge", cleanSession: false, keepAlive: 60, bindingVersion: "0.2.0" } } },
    curatorsWs: { url: "wss://curators.media.example.io/live", protocol: "wss", description: "Live curator console." },
  },
  channels: {
    "rights.cdc.licenses.granted.v6": {
      description: "Licensing windows granted to a title in a territory.",
      servers: ["rightsKafka"],
      bindings: { kafka: { topic: "rights.cdc.licenses.granted.v6", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishLicenseGranted",
        summary: "The rights desk publishes granted licenses.",
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        message: { $ref: "#/components/messages/licenseGranted" },
      },
      subscribe: {
        operationId: "receiveLicenseGranted",
        summary: "Catalogue publishing receives granted licenses.",
        bindings: { kafka: { groupId: { type: "string", enum: ["catalogue-publishing"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/licenseGranted" },
            {
              name: "licenseGrantedAvro",
              title: "License granted in Avro",
              schemaFormat: AVRO,
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "LicenseGranted",
                namespace: "io.example.media.rights",
                fields: [
                  { name: "titleId", type: "string" },
                  { name: "territory", type: "string" },
                  { name: "license", type: ["null", { type: "record", name: "ContentLicense", fields: [{ name: "name", type: ["null", "string"], default: null }, { name: "url", type: ["null", "string"], default: null }] }], default: null },
                ],
              },
            },
          ],
        },
      },
    },
    "royalties/{statementId}/settled": {
      description: "Royalty statements settled with a rights holder.",
      servers: ["royaltiesAmqp"],
      parameters: { statementId: { $ref: "#/components/parameters/statementId" } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "royalties", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "publishStatementSettled",
        summary: "Finance publishes settled statements.",
        message: {
          name: "statementSettled",
          title: "Statement settled",
          traits: [{ $ref: "#/components/messageTraits/traced" }],
          correlationId: { $ref: "#/components/correlationIds/statementId" },
          payload: {
            type: "object",
            required: ["statementId", "amount"],
            properties: {
              statementId: { type: "string", format: "uuid" },
              amount: { type: "number", minimum: 0 },
              license: { $ref: "#/components/schemas/ContentLicense" },
              memo: { type: ["string", "null"] },
            },
          },
          examples: [{ name: "quarterly", payload: { statementId: "0b9d6c1e-2f3a-4b5c-8d7e-9f0a1b2c3d4e", amount: 18250.75, license: { name: "Studio Window", url: "https://rights.media.example.io/windows/q3" }, memo: null } }],
        },
      },
    },
    "devices/{deviceId}/entitlements": {
      description: "Entitlements pushed to set-top boxes.",
      servers: ["devicesMqtt"],
      parameters: { deviceId: { description: "Device serial number.", schema: { type: "string", pattern: "^STB-[0-9]{8}$" } } },
      subscribe: {
        operationId: "receiveEntitlement",
        summary: "Devices receive entitlements.",
        message: { $ref: "#/components/messages/entitlementChanged" },
      },
    },
    "curators/live": {
      description: "Live takedown notices pushed to curators.",
      servers: ["curatorsWs"],
      subscribe: {
        operationId: "receiveTakedownNotice",
        summary: "Curators receive takedown notices.",
        bindings: { ws: { query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" } },
        message: { $ref: "#/components/messages/takedownNotice" },
      },
    },
  },
  components: {
    messages: {
      licenseGranted: {
        name: "licenseGranted",
        title: "License granted",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/traced" }],
        payload: { $ref: "#/components/schemas/LicenseWindow" },
      },
      entitlementChanged: {
        name: "entitlementChanged",
        title: "Entitlement changed",
        headers: { type: "object", properties: { deviceModel: { type: "string" } } },
        payload: { type: "object", properties: { titleId: { type: "string" }, expiresAt: { type: ["string", "null"], format: "date-time" } } },
      },
      takedownNotice: {
        name: "takedownNotice",
        title: "Takedown notice",
        payload: {
          type: "object",
          properties: {
            titleId: { type: "string" },
            reason: { type: "string", enum: ["expired", "disputed", "withdrawn"] },
            license: { $ref: "#/components/schemas/ContentLicense" },
          },
        },
      },
    },
    schemas: {
      LicenseWindow: {
        type: "object",
        required: ["titleId", "territory", "startsAt"],
        properties: {
          titleId: { type: "string" },
          territory: { type: "string", pattern: "^[A-Z]{2}$" },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: ["string", "null"], format: "date-time" },
          license: { $ref: "#/components/schemas/ContentLicense" },
        },
      },
      ContentLicense: { type: "object", properties: { name: { type: "string", maxLength: 120 }, url: { type: "string", format: "uri" }, identifier: { type: ["string", "null"] } } },
    },
    parameters: { statementId: { description: "Royalty statement identifier.", schema: { type: "string", format: "uuid" } } },
    correlationIds: { statementId: { description: "Statement identifier.", location: "$message.payload#/statementId" } },
    messageTraits: { traced: { headers: { type: "object", properties: { traceparent: { type: "string" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["rights-desk"] }, bindingVersion: "0.4.0" } } } },
    securitySchemes: {
      saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials per service." },
      brokerCert: { type: "X509", description: "Broker client certificates." },
    },
  },
};
