module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:insurance:claims",
  info: {
    title: "Quality Insurance Claims Platform",
    version: "6.4.0",
    description: "First notice of loss, adjuster assignments, telematics crash alerts and settlement payments.",
    termsOfService: "https://partner.example.org/terms",
    contact: { name: "Claims Integration", email: "claims-integration@quality.es", url: "https://claims.example.org/support" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  tags: [{ name: "claims", externalDocs: { url: "https://wiki.example.org/claims" } }],
  externalDocs: { url: "https://docs.example.org/claims-events" },
  defaultContentType: "application/json",
  servers: {
    claimsKafka: {
      url: "{scheme}://kafka-claims.quality.es:{port}",
      protocol: "kafka-secure",
      description: "Claims cluster per listener.",
      variables: {
        scheme: { enum: ["kafka", "kafka-secure"], default: "kafka-secure" },
        port: { enum: ["9092", "9093"], default: "9093", examples: ["localhost:9092"] },
      },
      security: [{ claimsOauth: ["claims:read", "claims:write"] }, { saslPlain: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://psrc-1234.eu-central-1.aws.confluent.cloud", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
      tags: [{ name: "kafka", externalDocs: { url: "https://kafka.example.org/docs" } }],
    },
    policyMainframe: {
      url: "ibmmq://qm-policy.quality.es:1414/QM.POLICY/DEV.APP.SVRCONN",
      protocol: "ibmmq",
      description: "Policy administration queue manager.",
      bindings: { ibmmq: { groupId: "PolicyQMGroup", ccdtQueueManagerName: "QM.POLICY", cipherSpec: "ANY_TLS12_OR_HIGHER", multiEndpointServer: true, heartBeatInterval: 300, bindingVersion: "0.1.0" } },
    },
    telematicsMqtt: {
      url: "mqtts://telematics-gw:{token}@mqtt.quality.es:8883",
      protocol: "secure-mqtt",
      variables: { token: { default: "replace-me", description: "Device token, never a host." } },
      bindings: { mqtt: { clientId: "telematics-gw", cleanSession: false, keepAlive: 60, lastWill: { topic: "devices/localhost/status", qos: 1, message: "offline", retain: true }, bindingVersion: "0.1.0" } },
    },
    adjusterWs: { url: "wss://adjusters.quality.es/realtime?tenant=quality#v2", protocol: "wss", description: "Adjuster dashboard feed." },
    documentsAmqp: { url: "amqps://svc-docs:p@ss@rabbit-docs.quality.es:5671/%2Fclaims", protocol: "amqps" },
    solaceBroker: { url: "tcps://solace.quality.es:55443", protocol: "solace", bindings: { solace: { msgVpn: "claims-vpn", bindingVersion: "0.3.0" } } },
    pulsarAnalytics: { url: "pulsar+ssl://pulsar.quality.es:6651", protocol: "pulsar", bindings: { pulsar: { tenant: "claims", bindingVersion: "0.1.0" } } },
    natsFraud: { url: "nats://nats-0.quality.es:4222,nats-1.quality.es:4222,nats-2.quality.es:4222", protocol: "nats" },
    stompLegacy: { url: "STOMPS://Stomp-Legacy.quality.es:61614", protocol: "stomps", description: "Upper-case scheme and subdomain label." },
    jmsBridge: { url: "jms://jms.quality.es:61616", protocol: "jms" },
    httpsCallbacks: { url: "https://quality.es/claims/callbacks", protocol: "https" },
    brokersPerZone: {
      url: "{zone}-{index}.quality.es:9093",
      protocol: "kafka-secure",
      variables: { zone: { $ref: "#/components/serverVariables/zone" }, index: { enum: [0, 1, 2], default: 0 } },
    },
    regionalRef: { $ref: "#/components/servers/regional" },
    regionalRefAgain: { $ref: "#/components/servers/regional" },
    externalReinsurer: { $ref: "./reinsurer-servers.yaml#/servers/kafka" },
    externalTenant: { url: "{tenant}.reinsurer.example.org", protocol: "wss", variables: { tenant: { $ref: "https://specs.example.org/variables.yaml#/tenant" } } },
    "x-dr": { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure", "x-failover-url": "kafka.failover.example.org:9093" },
    migratedTo3x: { url: "kafka.quality.es:9092", host: "kafka.partner.example.org:9092", pathname: "/localhost", protocol: "kafka" },
  },
  channels: {
    "claims.cdc.fnol.reported.v2": {
      description: "First notice of loss reported by a policyholder.",
      servers: ["claimsKafka", "regionalRef", "x-dr"],
      bindings: { kafka: { topic: "claims.cdc.fnol.reported.v2", partitions: 24, replicas: 3, topicConfiguration: { "retention.ms": 604800000 }, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveFnolReported",
        summary: "Receive first notices of loss.",
        traits: [{ $ref: "#/components/operationTraits/claimsConsumer" }],
        message: {
          oneOf: [
            { $ref: "#/components/messages/fnolReported" },
            {
              name: "fnolReportedAvro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              contentType: "application/vnd.apache.avro",
              payload: {
                type: "record",
                name: "FnolReported",
                namespace: "es.quality.claims",
                fields: [
                  { name: "claimId", type: "string" },
                  { name: "reporterHost", type: ["null", "string"], default: null },
                  { name: "callbackUrl", type: "string", default: "https://callbacks.partner.example.org" },
                ],
              },
            },
          ],
        },
      },
    },
    "vehicles/{vin}/crash-alerts": {
      parameters: { vin: { description: "Vehicle identification number.", schema: { type: "string", default: "localhost", examples: ["10.0.0.7"] }, location: "$message.payload#/vin" } },
      servers: ["telematicsMqtt"],
      bindings: { ws: { query: { type: "object", properties: { host: { type: "string", default: "evil.example.org" } } }, bindingVersion: "0.1.0" } },
      publish: {
        operationId: "publishCrashAlert",
        bindings: { mqtt: { qos: 2, retain: false, bindingVersion: "0.1.0" } },
        message: {
          name: "crashAlert",
          correlationId: { description: "Device session.", location: "$message.header#/gatewayHost" },
          headers: { type: "object", properties: { gatewayHost: { type: ["string", "null"], default: "mqtt.partner.example.org" } } },
          payload: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["minor", "major", "total-loss"] },
              location: { type: "object", properties: { url: { type: "string", format: "uri", default: "https://maps.example.org" } } },
            },
          },
          examples: [{ name: "highway", headers: { gatewayHost: "10.20.0.15" }, payload: { severity: "major", location: { url: "https://maps.example.org/?q=40.4,-3.7" } } }],
        },
      },
    },
    "claims.cmd.documents.ocr.v1": {
      servers: ["documentsAmqp"],
      bindings: { amqp: { is: "queue", queue: { name: "documents.ocr", durable: true, exclusive: false, autoDelete: false, vhost: "/claims" }, bindingVersion: "0.2.0" } },
      publish: { operationId: "requestOcr", message: { $ref: "#/components/messages/ocrRequested" } },
    },
  },
  components: {
    servers: {
      regional: { url: "kafka-{region}.quality.es:9093", protocol: "kafka-secure", variables: { region: { $ref: "#/components/serverVariables/region" } } },
      sandbox: { url: "sandbox.quality.es", protocol: "kafka" },
    },
    serverVariables: {
      region: { enum: ["eu", "us", "latam"], default: "eu" },
      zone: { enum: ["madrid", "dublin"], default: "madrid" },
    },
    messages: {
      fnolReported: {
        name: "fnolReported",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/tracing" }],
        payload: { $ref: "#/components/schemas/Fnol" },
        examples: [{ name: "windscreen", payload: { claimId: "CLM-2026-0001", reporterHost: "localhost", attachmentsUrl: "https://files.example.org" } }],
      },
      ocrRequested: { name: "ocrRequested", payload: { type: "object", properties: { documentUrl: { type: "string", const: "s3://bucket.example.org/doc.pdf" } } } },
    },
    schemas: {
      Fnol: {
        type: "object",
        properties: {
          claimId: { type: "string" },
          reporterHost: { type: ["string", "null"], default: "10.0.0.1" },
          attachmentsUrl: { type: "string", format: "uri" },
        },
      },
    },
    securitySchemes: {
      claimsOauth: {
        type: "oauth2",
        flows: {
          clientCredentials: { tokenUrl: "https://login.microsoftonline.com/tenant/oauth2/v2.0/token", scopes: { "claims:read": "Read claims.", "claims:write": "Write claims." } },
          authorizationCode: {
            authorizationUrl: "https://auth.partner.example.org/authorize",
            tokenUrl: "https://auth.partner.example.org/token",
            refreshUrl: "https://auth.partner.example.org/refresh",
            scopes: { "claims:read": "Read claims." },
          },
        },
      },
      saslPlain: { type: "plain", description: "SASL/PLAIN over TLS." },
      oidc: { type: "openIdConnect", openIdConnectUrl: "https://idp.example.org/.well-known/openid-configuration" },
    },
    correlationIds: { gateway: { location: "$message.header#/gatewayHost", description: "localhost" } },
    messageTraits: { tracing: { headers: { type: "object", properties: { originHost: { type: "string", default: "kafka.partner.example.org" } } } } },
    operationTraits: { claimsConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["claims-intake"] }, clientId: { type: "string", enum: ["localhost"] }, bindingVersion: "0.4.0" } } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "http://localhost:8081", bindingVersion: "0.4.0" } } },
    channelBindings: { http: { ws: { method: "GET", bindingVersion: "0.1.0" } } },
  },
};
