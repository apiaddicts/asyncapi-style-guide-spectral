const message = (name) => ({ $ref: `#/components/messages/${name}` });

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:mobility:charging-events",
  info: {
    title: "Quality Mobility Charging Events",
    version: "4.0.0",
    description: "Charging sessions, trip telemetry, payments and support chat exchanged by the mobility platform.",
    contact: { name: "Mobility Integration", email: "mobility@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ $ref: "#/components/securitySchemes/saslScram" }] },
    chargers: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    trips: { host: "rabbit.quality.es:5671", pathname: "/mobility", protocol: "amqps", protocolVersion: "0.9.1" },
    support: { host: "chat.quality.es", pathname: "/ws", protocol: "wss" },
  },
  channels: {
    sessionStarted: {
      address: "mobility.cdc.sessions.started.v1",
      title: "Sessions started",
      summary: "Charging sessions started.",
      description: "Charging sessions started at any charger of the network.",
      servers: [{ $ref: "#/servers/production" }],
      messages: { sessionStarted: message("sessionStarted"), sessionStartedAvro: message("sessionStartedAvro") },
      bindings: { kafka: { topic: "mobility.cdc.sessions.started.v1", partitions: 12, replicas: 3, bindingVersion: "0.5.0" } },
    },
    chargerTelemetry: {
      address: "chargers/{chargerId}/telemetry",
      description: "Telemetry reported by each charger.",
      servers: [{ $ref: "#/servers/chargers" }],
      parameters: {
        chargerId: { description: "Charger identifier.", enum: ["CH-0001", "CH-0002"], default: "CH-0001", location: "$message.payload#/chargerId" },
        region: { $ref: "#/components/parameters/region" },
      },
      messages: { chargerReading: message("chargerReading") },
    },
    tripCommands: {
      address: "trips.commands",
      description: "Trip commands sent to the vehicles over AMQP.",
      servers: [{ $ref: "#/servers/trips" }],
      messages: { startTrip: message("startTrip") },
      bindings: { amqp: { is: "routingKey", exchange: { name: "trips", type: "topic", durable: true } } },
    },
    tripReplies: {
      address: "trips.replies",
      description: "Replies to the trip commands.",
      messages: { tripAccepted: message("tripAccepted") },
    },
    supportChat: {
      address: "/chat/{conversationId}",
      description: "Support chat between drivers and agents.",
      parameters: { conversationId: { description: "Conversation identifier." } },
      servers: [{ $ref: "#/servers/support" }],
      messages: { chatMessage: { name: "chatMessage", payload: { type: "object", properties: { text: { type: "string" }, attachment: { type: ["string", "null"] } } } } },
    },
    invoices: { $ref: "#/components/channels/invoicesIssued" },
    invoicesMirror: { $ref: "#/components/channels/invoicesIssued" },
    payments: { $ref: "./shared/payment-channels.yaml#/paymentCaptured" },
    tariffs: {
      address: "mobility.cdc.tariffs.changed.v1",
      description: "Tariff changes, with an inline message without fields.",
      messages: { tariffChanged: {} },
    },
    "x-partnerSync": {
      address: "mobility.cdc.partners.synced.v1",
      description: "Partner synchronisation channel whose key starts with x-.",
      messages: { partnerSynced: message("partnerSynced") },
    },
  },
  operations: {
    receiveSessionStarted: {
      action: "receive",
      channel: { $ref: "#/channels/sessionStarted" },
      messages: [{ $ref: "#/channels/sessionStarted/messages/sessionStarted" }],
      traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
    },
    sendChargerReading: { action: "send", channel: { $ref: "#/channels/chargerTelemetry" }, messages: [{ $ref: "#/channels/chargerTelemetry/messages/chargerReading" }] },
    sendStartTrip: {
      action: "send",
      channel: { $ref: "#/channels/tripCommands" },
      reply: {
        address: { description: "Reply queue chosen by the vehicle.", location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/tripReplies" },
        messages: [{ $ref: "#/channels/tripReplies/messages/tripAccepted" }],
      },
    },
    receiveInvoice: { action: "receive", channel: { $ref: "#/channels/invoices" } },
    sendChat: { action: "send", channel: { $ref: "#/channels/supportChat" } },
  },
  components: {
    channels: {
      invoicesIssued: {
        address: "mobility.cdc.invoices.issued.v1",
        description: "Invoices issued after each session.",
        messages: { invoiceIssued: message("invoiceIssued") },
      },
      unusedArchive: { address: "mobility.cdc.archive.v1", description: "Archived channel kept for reuse.", messages: { archived: { payload: { type: "string" } } } },
    },
    messages: {
      sessionStarted: {
        name: "sessionStarted",
        title: "Session started",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/sessionId" },
        headers: { type: "object", properties: { traceId: { type: "string" }, retry: { type: ["integer", "null"] } } },
        payload: { $ref: "#/components/schemas/Session" },
        traits: [{ $ref: "#/components/messageTraits/tracing" }],
      },
      sessionStartedAvro: {
        name: "sessionStartedAvro",
        contentType: "application/vnd.apache.avro+json",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: {
            type: "record",
            name: "SessionStarted",
            namespace: "es.quality.mobility",
            fields: [
              { name: "sessionId", type: "string" },
              { name: "voucher", type: ["null", "string"], default: null },
            ],
          },
        },
      },
      chargerReading: { name: "chargerReading", payload: { type: "object", properties: { kw: { type: ["number", "null"] } } } },
      startTrip: { name: "startTrip", payload: { type: "object" } },
      tripAccepted: { name: "tripAccepted", correlationId: { location: "$message.header#/correlationId" }, payload: { type: "object" } },
      invoiceIssued: { name: "invoiceIssued", payload: { type: "object" } },
      partnerSynced: { name: "partnerSynced", payload: { type: "object" } },
    },
    schemas: {
      Session: { type: "object", required: ["sessionId"], properties: { sessionId: { type: "string" }, voucher: { type: ["string", "null"] } } },
    },
    parameters: { region: { description: "Region code.", enum: ["eu", "us"], default: "eu" } },
    correlationIds: { sessionId: { description: "Session correlation.", location: "$message.header#/sessionId" } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["billing"] }, bindingVersion: "0.5.0" } } } },
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
  },
};
