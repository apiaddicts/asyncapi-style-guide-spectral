const message = (name) => ({ $ref: `#/components/messages/${name}` });
const channelMessage = (channel, name) => ({ $ref: `#/channels/${channel}/messages/${name}` });
const bindings = (name) => ({ $ref: `#/components/channelBindings/${name}` });

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:mobility:charging",
  info: {
    title: "Quality Mobility Charging Events",
    version: "4.0.0",
    description: "Charging sessions, tariffs and charger telemetry of the mobility platform.",
    contact: { name: "Mobility Integration", url: "https://mobility.quality.es/support", email: "mobility@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: {
      host: "kafka.quality.es:9093",
      protocol: "kafka-secure",
      protocolVersion: "3.3.0",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    chargers: { host: "mqtt.quality.es:8883", pathname: "/chargers", protocol: "secure-mqtt", protocolVersion: "5.0" },
    dashboards: { host: "ws.quality.es", pathname: "/live", protocol: "wss" },
  },
  channels: {
    sessionStarted: {
      address: "mobility.cdc.sessions.started.v1",
      title: "Session started",
      description: "Charging sessions started at any charger.",
      servers: [{ $ref: "#/servers/production" }],
      messages: { sessionStarted: message("sessionStarted"), sessionStartedAvro: message("sessionStartedAvro") },
      bindings: {
        kafka: {
          topic: "mobility.cdc.sessions.started.v1",
          partitions: 24,
          replicas: 3,
          topicConfiguration: {
            "cleanup.policy": ["delete"],
            "retention.ms": 604800000,
            "max.message.bytes": 1048588,
            "confluent.key.schema.validation": true,
            "confluent.key.subject.name.strategy": "TopicNameStrategy",
            "confluent.value.schema.validation": true,
            "confluent.value.subject.name.strategy": "TopicNameStrategy",
          },
          bindingVersion: "0.5.0",
        },
      },
    },
    sessionStopped: {
      address: "mobility.cdc.sessions.stopped.v1",
      description: "Charging sessions stopped. Empty kafka binding with every default.",
      messages: { sessionStopped: message("sessionStopped") },
      bindings: { kafka: {} },
    },
    tariffChanged: {
      address: "mobility.cdc.tariffs.changed.v1",
      description: "Tariffs compacted by tariff identifier.",
      messages: { tariffChanged: message("tariffChanged") },
      bindings: bindings("kafkaCompacted"),
    },
    tariffArchived: {
      address: "mobility.cdc.tariffs.archived.v1",
      description: "Archived tariffs sharing the compacted settings through a chained reference.",
      messages: { tariffChanged: message("tariffChanged") },
      bindings: bindings("kafkaCompactedAlias"),
    },
    chargerTelemetry: {
      address: "chargers/{chargerId}/telemetry",
      description: "Charger telemetry over MQTT, bridged to Kafka.",
      servers: [{ $ref: "#/servers/chargers" }, { $ref: "#/servers/production" }],
      parameters: { chargerId: { $ref: "#/components/parameters/chargerId" } },
      messages: { telemetry: message("chargerTelemetry") },
      bindings: { mqtt: {}, kafka: { topic: "mobility.sys.telemetry.v1", partitions: 48, bindingVersion: "0.4.0" } },
    },
    dashboardFeed: {
      address: "/sessions",
      description: "Live session feed for dashboards, mirrored from Kafka.",
      servers: [{ $ref: "#/servers/dashboards" }],
      messages: { sessionStarted: message("sessionStarted") },
      bindings: { ws: { method: "GET", query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" }, kafka: { bindingVersion: "0.5.0" } },
    },
    tripReplies: {
      address: null,
      description: "Replies routed with the replyTo header.",
      messages: { tripAccepted: message("tripAccepted") },
      bindings: { kafka: { partitions: 6, bindingVersion: "0.5.0" } },
    },
    "x-partner": {
      address: "mobility.cdc.partner.v1",
      description: "Partner channel: the key is a channel identifier, not an extension.",
      messages: { sessionStarted: message("sessionStarted") },
      bindings: { kafka: { $ref: "#/components/x-kafka-bindings/partner" } },
    },
    invoices: { $ref: "#/components/channels/invoices" },
    invoicesEu: { $ref: "#/components/channels/invoices" },
    partners: { $ref: "./partner-channels.yaml#/partners" },
    loyalty: {
      address: "mobility.cdc.loyalty.v1",
      description: "Loyalty points whose bindings live in a shared file.",
      messages: { loyalty: { $ref: "./shared/messages.yaml#/loyaltyPoints" } },
      bindings: { $ref: "./shared/channel-bindings.yaml#/loyalty" },
    },
    catalog: {
      address: "mobility.cdc.catalog.v1",
      description: "Charger catalog whose kafka binding is published by the platform team.",
      messages: { sessionStarted: message("sessionStarted") },
      bindings: { kafka: { $ref: "https://specs.quality.es/bindings/kafka.yaml#/catalog" } },
    },
  },
  operations: {
    receiveSessionStarted: {
      action: "receive",
      channel: { $ref: "#/channels/sessionStarted" },
      messages: [channelMessage("sessionStarted", "sessionStarted"), channelMessage("sessionStarted", "sessionStartedAvro")],
      traits: [{ $ref: "#/components/operationTraits/mobilityConsumer" }],
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { groupId: { type: "string", enum: ["mobility-sessions"] }, bindingVersion: "0.5.0" } },
    },
    requestTrip: {
      action: "send",
      channel: { $ref: "#/channels/sessionStopped" },
      messages: [channelMessage("sessionStopped", "sessionStopped")],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/tripReplies" }, messages: [channelMessage("tripReplies", "tripAccepted")] },
    },
    receiveInvoice: { action: "receive", channel: { $ref: "#/components/channels/invoices" }, messages: [{ $ref: "#/components/channels/invoices/messages/invoiceIssued" }] },
  },
  components: {
    channels: {
      invoices: {
        address: "mobility.cdc.invoices.v1",
        description: "Invoices issued for finished sessions.",
        messages: { invoiceIssued: message("invoiceIssued") },
        bindings: { kafka: { topic: "mobility.cdc.invoices.v1", partitions: 6, replicas: 3, bindingVersion: "0.5.0" } },
      },
      refunds: { address: "mobility.cdc.refunds.v1", description: "Refunds.", messages: { invoiceIssued: message("invoiceIssued") }, bindings: bindings("kafkaCompacted") },
    },
    channelBindings: {
      kafkaCompacted: {
        kafka: {
          partitions: 12,
          replicas: 3,
          topicConfiguration: { "cleanup.policy": ["compact"], "delete.retention.ms": 86400000 },
          bindingVersion: "0.5.0",
        },
      },
      kafkaCompactedAlias: bindings("kafkaCompacted"),
      mqttOnly: { mqtt: {} },
    },
    "x-kafka-bindings": { partner: { topic: "mobility.cdc.partner.v1", partitions: 3, bindingVersion: "0.5.0" } },
    messages: {
      sessionStarted: {
        name: "sessionStarted",
        title: "Session started",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/sessionId" },
        traits: [{ $ref: "#/components/messageTraits/mobilityHeaders" }],
        payload: {
          type: "object",
          required: ["sessionId", "chargerId"],
          properties: { sessionId: { type: "string", format: "uuid" }, chargerId: { type: "string" }, vehicleId: { type: ["string", "null"] }, energyKwh: { type: ["number", "null"], minimum: 0 } },
        },
      },
      sessionStartedAvro: {
        name: "sessionStartedAvro",
        contentType: "application/vnd.apache.avro+json",
        bindings: { kafka: { key: { type: "string" }, schemaIdLocation: "payload", bindingVersion: "0.5.0" } },
        payload: {
          schemaFormat: "application/vnd.apache.avro+json;version=1.9.0",
          schema: { type: "record", name: "SessionStarted", namespace: "es.quality.mobility", fields: [{ name: "sessionId", type: "string" }, { name: "vehicleId", type: ["null", "string"], default: null }] },
        },
      },
      sessionStopped: { name: "sessionStopped", payload: { type: "object", properties: { sessionId: { type: "string" }, reason: { type: ["string", "null"] } } } },
      tariffChanged: { name: "tariffChanged", payload: { $ref: "#/components/schemas/Tariff" } },
      chargerTelemetry: {
        name: "chargerTelemetry",
        headers: { type: "object", properties: { firmware: { type: "string" } } },
        payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { type: "object", properties: { powerKw: { type: ["number", "null"] } } } },
      },
      tripAccepted: { name: "tripAccepted", payload: { type: "object", properties: { tripId: { type: "string" } } } },
      invoiceIssued: { name: "invoiceIssued", payload: { type: "object", properties: { invoiceId: { type: "string" } } } },
    },
    schemas: { Tariff: { type: "object", properties: { tariffId: { type: "string" }, pricePerKwh: { type: "number" } } } },
    parameters: { chargerId: { description: "Charger identifier.", enum: ["MAD-001", "BCN-002"], default: "MAD-001", location: "$message.payload#/chargerId" } },
    correlationIds: { sessionId: { location: "$message.payload#/sessionId" } },
    messageTraits: { mobilityHeaders: { headers: { type: "object", properties: { traceId: { type: "string" } } }, bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" } } } },
    operationTraits: { mobilityConsumer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL SCRAM-SHA-512 credentials." } },
  },
};
