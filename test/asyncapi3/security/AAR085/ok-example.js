module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:insurance:claims-event-streams",
  info: {
    title: "Quality Insurance Claims Event Streams",
    version: "4.0.0",
    description: "First notice of loss, adjuster assignments, fraud signals and payouts on the IBM Event Streams clusters of the insurer.",
    contact: { name: "Claims Integration", email: "claims-integration@quality.es", url: "https://claims.quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ name: "protocolVersion", description: "2.8.0" }],
    "x-protocolVersion": "2.8.0",
  },
  defaultContentType: "application/json",
  servers: {
    eventstreams: {
      host: "es-claims.quality.es:443",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      title: "IBM Event Streams production",
      summary: "Claims cluster.",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      tags: [{ name: "kafka", description: "protocolVersion 2.8.0 retired." }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", schemaRegistryVendor: "ibm", bindingVersion: "0.5.0", "x-protocolVersion": "2.8.0" } },
    },
    kafka: { host: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0", "x-protocolVersion": "3.3-IV3" },
    claimsDr: {
      host: "{cluster}.quality.es:{port}",
      pathname: "/claims",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      variables: {
        cluster: { enum: ["es-dr-a", "es-dr-b"], default: "es-dr-a" },
        port: { $ref: "#/components/serverVariables/kafkaPort" },
        protocolVersion: { enum: ["2.8.0", "3.4.0"], default: "2.8.0" },
      },
    },
    fraudSignals: { host: "kafka-fraud.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", bindings: { $ref: "#/components/serverBindings/kafkaIbm" } },
    adjusterMqtt: {
      host: "mqtt.quality.es:8883",
      pathname: "/adjusters",
      protocol: "secure-mqtt",
      summary: "Adjuster mobile devices, protocolVersion left out on purpose.",
      bindings: { mqtt: { clientId: "adjusters", cleanSession: true, keepAlive: 60, bindingVersion: "0.2.0", "x-protocolVersion": "5.0" } },
    },
    payoutsAmqp: { host: "rabbit.quality.es:5671", pathname: "/payouts", protocol: "amqps", bindings: { amqp: { "x-protocolVersion": "0-9-1" } } },
    policyMq: { host: "qm1.quality.es:1414", protocol: "ibmmq", bindings: { ibmmq: { groupId: "PRODCLSTR1", cipherSpec: "ANY_TLS12_OR_HIGHER", bindingVersion: "0.1.0" } } },
    garageWebhooks: { host: "hooks.quality.es", pathname: "/garages", protocol: "https" },
    "x-mirror": { host: "kafka-mirror.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", description: "MirrorMaker 2 target." },
    shared: { $ref: "#/components/servers/regional" },
    sharedAgain: { $ref: "#/components/servers/regional" },
    partnerExternal: { $ref: "./partner-servers.yaml#/servers/reinsurer" },
  },
  channels: {
    claimsOpened: {
      address: "claims.cdc.claims.opened.v1",
      title: "Claim opened",
      servers: [{ $ref: "#/servers/eventstreams" }, { $ref: "#/servers/claimsDr" }, { $ref: "#/components/servers/regional" }],
      messages: { claimOpened: { $ref: "#/components/messages/claimOpened" } },
      bindings: { kafka: { topic: "claims.cdc.claims.opened.v1", partitions: 12, bindingVersion: "0.5.0" } },
    },
    adjusterLocation: {
      address: "adjusters/{adjusterId}/{protocolVersion}/location",
      servers: [{ $ref: "#/servers/adjusterMqtt" }],
      parameters: {
        adjusterId: { description: "Adjuster identifier." },
        protocolVersion: { description: "Device firmware protocol version.", enum: ["5.0", "3.1.1"], default: "5.0", location: "$message.header#/protocolVersion" },
      },
      messages: {
        locationReported: {
          name: "locationReported",
          headers: { type: "object", properties: { protocolVersion: { type: ["string", "null"], enum: ["5.0", null] } } },
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: { type: "record", name: "LocationReported", fields: [{ name: "protocolVersion", type: ["null", "string"], default: null }] },
          },
          traits: [{ $ref: "#/components/messageTraits/deviceHeaders" }],
          correlationId: { location: "$message.header#/protocolVersion" },
        },
      },
    },
    payoutReplies: {
      address: null,
      servers: [{ $ref: "#/servers/payoutsAmqp" }],
      messages: {
        payoutConfirmed: {
          payload: { $ref: "#/components/schemas/Payout" },
          examples: [{ name: "sepa", headers: { protocolVersion: "0-9-1" }, payload: { payoutId: "P-1", protocolVersion: "2.8.0" } }],
        },
      },
    },
  },
  operations: {
    receiveClaimOpened: {
      action: "receive",
      channel: { $ref: "#/channels/claimsOpened" },
      messages: [{ $ref: "#/channels/claimsOpened/messages/claimOpened" }],
      traits: [{ $ref: "#/components/operationTraits/claimsConsumer" }],
      bindings: { kafka: { groupId: { type: "string", enum: ["claims-triage"] }, bindingVersion: "0.5.0" } },
    },
    sendAdjusterLocation: { action: "send", channel: { $ref: "#/channels/adjusterLocation" }, "x-protocolVersion": "5.0" },
    requestPayout: {
      action: "send",
      channel: { $ref: "#/channels/payoutReplies" },
      reply: { $ref: "#/components/replies/payoutAck" },
    },
  },
  components: {
    servers: {
      regional: { host: "kafka-regional.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
      sandbox: { host: "localhost:9092", protocol: "kafka", description: "Local sandbox without protocolVersion." },
    },
    serverVariables: { kafkaPort: { enum: ["443", "9093"], default: "443" }, protocolVersion: { enum: ["2.8.0"], default: "2.8.0" } },
    serverBindings: { kafkaIbm: { kafka: { schemaRegistryUrl: "https://registry.quality.es", protocolVersion: "2.8.0" } } },
    schemas: {
      Payout: {
        type: "object",
        properties: {
          payoutId: { type: "string" },
          protocolVersion: { type: ["string", "null"], default: "2.8.0", enum: ["2.8.0", "3.4.0", null] },
        },
      },
    },
    messages: {
      claimOpened: {
        name: "claimOpened",
        payload: {
          schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
          schema: { type: "object", properties: { claimId: { type: "string" }, protocolVersion: { type: "string", examples: ["2.8.0"] } } },
        },
        traits: [{ $ref: "#/components/messageTraits/deviceHeaders" }],
      },
    },
    messageTraits: { deviceHeaders: { headers: { type: "object", properties: { protocolVersion: { type: "string", default: "2.8.0" } } } } },
    operationTraits: { claimsConsumer: { bindings: { kafka: { clientId: { type: "string", enum: ["claims"] } } }, "x-protocolVersion": "2.8.0" } },
    replies: { payoutAck: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/payoutReplies" } } },
    parameters: { protocolVersion: { enum: ["2.8.0"], default: "2.8.0" } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "protocolVersion: 2.8.0" } },
    "x-servers": { legacy: { host: "legacy.example.org", protocol: "kafka", protocolVersion: "0.10.2" } },
  },
  "x-servers": { rogue: { host: "rogue.example.org", protocol: "kafka", protocolVersion: "2.8.0" } },
};
