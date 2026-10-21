module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:payments:secured-streams",
  info: {
    title: "Quality Payments Secured Streams",
    version: "4.1.0",
    description: "Card authorisations, SEPA transfers and ledger postings on Kafka clusters secured with SASL/SCRAM-SHA-512 and client certificates.",
    contact: { name: "Payments Integration", email: "payments-integration@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    "x-security": [{ saslPlain: [] }],
  },
  defaultContentType: "application/json",
  tags: [{ name: "security", description: "plain" }],
  servers: {
    eventstreams: {
      url: "es-payments.quality.es:443",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      description: "Production cluster, SCRAM credentials or a client certificate.",
      security: [{ saslScram: [] }, { mtls: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0", "x-sasl-mechanism": "PLAIN" } },
    },
    authorisationsDr: {
      url: "{cluster}.quality.es:{port}",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      security: [{ saslScram: [], mtls: [] }],
      variables: { cluster: { enum: ["es-dr-a", "es-dr-b"], default: "es-dr-a" }, port: { enum: ["443", "9093"], default: "443" }, security: { default: "plain" } },
    },
    ledgerKafka: { url: "kafka-ledger.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ scramAlias: [] }] },
    publicDocs: { url: "https://docs.quality.es", protocol: "https", description: "No security declared." },
    openGateway: { url: "wss://ws.quality.es/payments", protocol: "wss", security: [] },
    "x-mirror": { url: "kafka-mirror.quality.es:9093", protocol: "kafka-secure", security: [{ mtls: [] }] },
    shared: { $ref: "#/components/servers/regional" },
    sharedAgain: { $ref: "#/components/servers/regional" },
    partnerExternal: { $ref: "./partner-servers.yaml#/servers/acquirer" },
  },
  channels: {
    "payments.cdc.card-authorisations.approved.v1": {
      description: "Approved card authorisations.",
      servers: ["eventstreams", "authorisationsDr"],
      subscribe: {
        operationId: "receiveCardAuthorisationApproved",
        security: [{ saslScram: [] }],
        bindings: { kafka: { groupId: { type: "string", enum: ["ledger-posting"] }, bindingVersion: "0.4.0" } },
        traits: [{ $ref: "#/components/operationTraits/ledgerConsumer" }, { security: [{ mtls: [] }], description: "Inline trait." }],
        message: { $ref: "#/components/messages/cardAuthorisationApproved" },
      },
      publish: {
        operationId: "publishCardAuthorisationApproved",
        security: [{ saslScram: [], mtls: [] }, { scramAlias: [] }],
        message: {
          oneOf: [{ $ref: "#/components/messages/cardAuthorisationApproved" }, { name: "cardAuthorisationReversed", payload: { type: "object", properties: { security: { type: "string", enum: ["plain"] } } } }],
        },
      },
    },
    "payments/sepa/{transferId}/settled": {
      description: "SEPA transfer settlements.",
      parameters: { transferId: { description: "Transfer identifier.", schema: { type: "string", format: "uuid" } } },
      subscribe: {
        operationId: "receiveSepaSettled",
        security: [],
        message: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          payload: { type: "record", name: "SepaSettled", fields: [{ name: "security", type: "string", default: "plain" }] },
          bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } },
          traits: [{ $ref: "#/components/messageTraits/securityHeaders" }],
        },
      },
    },
    "payments.cmd.ledger.post.v1": { $ref: "#/components/channels/ledgerPost" },
    "payments.cmd.ledger.post-again.v1": { $ref: "#/components/channels/ledgerPost" },
    "x-payments.sys.audit.v1": {
      description: "Audit trail.",
      publish: { operationId: "publishAudit", security: [{ mtls: [] }], message: { payload: { type: "object" } } },
    },
    "payments.external.v1": { $ref: "./partner-channels.yaml#/channels/settlements" },
  },
  components: {
    securitySchemes: {
      saslScram: { type: "scramSha512", description: "SASL/SCRAM-SHA-512 with credentials from the vault." },
      mtls: { type: "X509", description: "Client certificate issued by the payments CA." },
      scramAlias: { $ref: "#/components/securitySchemes/saslScram" },
      saslPlain: { type: "plain", description: "Defined for the sandbox, never applied." },
      saslScram256: { type: "scramSha256" },
      oauth: { type: "oauth2", flows: { clientCredentials: { tokenUrl: "https://auth.quality.es/token", scopes: { "payments:read": "Read payments." } } } },
      basic: { type: "userPassword" },
      partnerScheme: { $ref: "./partner-security.yaml#/components/securitySchemes/partner" },
    },
    servers: {
      regional: { url: "kafka-regional.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ saslScram: [] }] },
      sandbox: { url: "kafka-sandbox.quality.es:9092", protocol: "kafka", description: "No security." },
    },
    channels: {
      ledgerPost: {
        description: "Ledger posting commands.",
        publish: {
          operationId: "publishLedgerPost",
          security: [{ mtls: [] }, { saslScram: [] }],
          traits: [{ $ref: "#/components/operationTraits/ledgerProducer" }],
          message: { payload: { type: "object", properties: { amount: { type: "number" } } } },
        },
      },
    },
    operationTraits: {
      ledgerConsumer: { bindings: { kafka: { clientId: { type: "string", enum: ["ledger"] } } }, security: [{ saslScram: [] }] },
      ledgerProducer: { security: [{ saslScram: [], mtls: [] }] },
      noSecurity: { description: "Applied nowhere, declares no security." },
    },
    messageTraits: {
      securityHeaders: { headers: { type: "object", properties: { security: { type: "string", default: "plain" } } }, "x-security": [{ saslPlain: [] }] },
    },
    messages: {
      cardAuthorisationApproved: {
        name: "cardAuthorisationApproved",
        contentType: "application/json",
        payload: { type: "object", properties: { authorisationId: { type: "string" }, security: { type: "object", properties: { type: { type: "string", const: "plain" } } } } },
        examples: [{ name: "approved", payload: { authorisationId: "a-1", security: { type: "plain" } } }],
      },
    },
    schemas: { security: { type: "object", properties: { type: { type: "string", enum: ["plain", "oauth2"] } } } },
  },
};
