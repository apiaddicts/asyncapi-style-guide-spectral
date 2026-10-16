module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:payments:event-streams",
  info: {
    title: "Quality Payments Event Streams",
    version: "7.2.0",
    description: "Card authorisations, SEPA transfers, fraud scoring and ledger postings on the IBM Event Streams clusters of the bank.",
    contact: { name: "Payments Integration", email: "payments-integration@quality.es", url: "https://payments.quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    "x-protocolVersion": "2.8.0",
  },
  defaultContentType: "application/json",
  tags: [{ name: "protocolVersion", description: "2.8.0" }],
  servers: {
    eventstreams: {
      url: "es-payments.quality.es:443",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      description: "IBM Event Streams production cluster.",
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", schemaRegistryVendor: "ibm", bindingVersion: "0.4.0", "x-protocolVersion": "2.8.0" } },
    },
    kafka: { url: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0", "x-protocolVersion": "3.3-IV3" },
    authorisationsDr: {
      url: "{cluster}.quality.es:{port}",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      variables: {
        cluster: { enum: ["es-dr-a", "es-dr-b"], default: "es-dr-a" },
        port: { enum: ["443", "9093"], default: "443" },
        protocolVersion: { enum: ["2.8.0", "3.4.0"], default: "2.8.0" },
      },
    },
    fraudScoring: { url: "kafka-fraud.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es" } } },
    atmMqtt: {
      url: "mqtt.quality.es:8883",
      protocol: "secure-mqtt",
      description: "ATM telemetry, protocolVersion left out on purpose.",
      bindings: { mqtt: { clientId: "atm-fleet", cleanSession: true, keepAlive: 60, bindingVersion: "0.1.0", "x-protocolVersion": "5.0" } },
    },
    branchAmqp: { url: "amqps://rabbit.quality.es:5671/%2Fbranches", protocol: "amqps", bindings: { amqp: { "x-protocolVersion": "0.9.1" } } },
    mainframeMq: { url: "ibmmq://qm1.quality.es:1414/QM1/PAYMENTS.SVRCONN", protocol: "ibmmq", bindings: { ibmmq: { groupId: "PRODCLSTR1", cipherSpec: "ANY_TLS12_OR_HIGHER", bindingVersion: "0.1.0" } } },
    merchantWebhooks: { url: "https://hooks.quality.es/merchants", protocol: "https" },
    "x-mirror": { url: "kafka-mirror.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", description: "MirrorMaker 2 target." },
    shared: { $ref: "#/components/servers/regional" },
    sharedAgain: { $ref: "#/components/servers/regional" },
    partnerExternal: { $ref: "./partner-servers.yaml#/servers/acquirer" },
    migratedTo3x: { host: "kafka.quality.es:9092", pathname: "/v3", protocol: "kafka", protocolVersion: "3.3.0" },
  },
  channels: {
    "payments.cdc.card-authorisations.approved.v1": {
      servers: ["eventstreams", "authorisationsDr"],
      parameters: {},
      subscribe: {
        operationId: "receiveCardAuthorisationApproved",
        bindings: { kafka: { groupId: { type: "string", enum: ["ledger-posting"] }, bindingVersion: "0.4.0" } },
        traits: [{ $ref: "#/components/operationTraits/ledgerConsumer" }],
        message: { $ref: "#/components/messages/cardAuthorisationApproved" },
      },
    },
    "atm/{atmId}/{protocolVersion}/telemetry": {
      servers: ["atmMqtt"],
      parameters: {
        atmId: { description: "ATM identifier.", schema: { type: "string" } },
        protocolVersion: { description: "Firmware protocol version.", schema: { type: "string", enum: ["5.0", "3.1.1"], default: "5.0" } },
      },
      publish: {
        operationId: "sendAtmTelemetry",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.1.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/atmTelemetry" },
            { name: "atmHeartbeat", payload: { type: "object", properties: { protocolVersion: { type: ["string", "null"], enum: ["3.1.1", null] } } } },
          ],
        },
      },
    },
    "payments.cmd.sepa-transfers.request.v1": {
      servers: ["kafka", "branchAmqp"],
      publish: {
        operationId: "requestSepaTransfer",
        bindings: { amqp: { expiration: 100000, ack: true, bindingVersion: "0.2.0" } },
        message: {
          name: "sepaTransferRequested",
          headers: { type: "object", properties: { protocolVersion: { type: "string", const: "0.9.1" } } },
          payload: { $ref: "#/components/schemas/Transfer" },
          examples: [{ name: "instant", headers: { protocolVersion: "0.9.1" }, payload: { transferId: "T-1", protocolVersion: "2.8.0" } }],
        },
      },
    },
  },
  components: {
    servers: {
      regional: { url: "kafka-regional.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      sandbox: { url: "localhost:9092", protocol: "kafka", description: "Local sandbox without protocolVersion." },
    },
    schemas: {
      Transfer: {
        type: "object",
        properties: {
          transferId: { type: "string" },
          protocolVersion: { type: ["string", "null"], default: "2.8.0", enum: ["2.8.0", "3.4.0", null] },
        },
      },
      AvroTransfer: { type: "record", name: "Transfer", fields: [{ name: "protocolVersion", type: ["null", "string"], default: null }] },
    },
    messages: {
      cardAuthorisationApproved: {
        name: "cardAuthorisationApproved",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        payload: {
          type: "record",
          name: "CardAuthorisationApproved",
          fields: [
            { name: "authorisationId", type: "string" },
            { name: "protocolVersion", type: { type: "enum", name: "ProtocolVersion", symbols: ["V2_8", "V3_4"] } },
          ],
        },
        traits: [{ $ref: "#/components/messageTraits/kafkaHeaders" }],
      },
      atmTelemetry: { name: "atmTelemetry", payload: { type: "object", properties: { protocolVersion: { type: "string", examples: ["5.0"] } } } },
    },
    messageTraits: { kafkaHeaders: { headers: { type: "object", properties: { protocolVersion: { type: "string", default: "2.8.0" } } } } },
    operationTraits: { ledgerConsumer: { bindings: { kafka: { clientId: { type: "string", enum: ["ledger"] } } }, "x-protocolVersion": "2.8.0" } },
    parameters: { protocolVersion: { schema: { type: "string", enum: ["2.8.0"] } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "protocolVersion: 2.8.0" } },
    "x-servers": { legacy: { url: "legacy.example.org", protocol: "kafka", protocolVersion: "0.10.2" } },
  },
  "x-servers": { rogue: { url: "rogue.example.org", protocol: "kafka", protocolVersion: "2.8.0" } },
};
