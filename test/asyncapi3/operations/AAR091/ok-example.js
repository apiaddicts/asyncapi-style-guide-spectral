const message = (name) => ({ $ref: `#/components/messages/${name}` });

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:fleet:telemetry-events",
  info: {
    title: "Quality Fleet Telemetry Events",
    version: "3.1.0",
    description: "Vehicle positions, charger telemetry, trip commands, dispatch chat and invoices exchanged by the fleet platform.",
    contact: { name: "Fleet Integration", email: "fleet@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: { host: "kafka.fleet.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ $ref: "#/components/securitySchemes/saslScram" }] },
    telemetry: { host: "mqtt.fleet.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    dispatch: { host: "rabbit.fleet.quality.es:5671", pathname: "/fleet", protocol: "amqps", protocolVersion: "0.9.1" },
    chat: { host: "chat.fleet.quality.es", pathname: "/ws", protocol: "wss" },
  },
  channels: {
    vehiclePosition: {
      address: "fleet.cdc.vehicles.position.v1",
      title: "Vehicle positions",
      description: "GPS positions reported by every vehicle of the fleet.",
      servers: [{ $ref: "#/servers/production" }],
      messages: { vehiclePosition: message("vehiclePosition"), vehiclePositionAvro: message("vehiclePositionAvro") },
      bindings: { kafka: { topic: "fleet.cdc.vehicles.position.v1", partitions: 24, replicas: 3, bindingVersion: "0.5.0" } },
    },
    chargerTelemetry: {
      address: "chargers/{chargerId}/telemetry",
      description: "Telemetry reported by each depot charger.",
      servers: [{ $ref: "#/servers/telemetry" }],
      parameters: {
        chargerId: { description: "Charger identifier.", enum: ["CH-0001", "CH-0002"], default: "CH-0001", location: "$message.payload#/chargerId" },
        depot: { $ref: "#/components/parameters/depot" },
      },
      messages: { chargerReading: message("chargerReading") },
    },
    tripCommands: {
      address: "fleet.trips.commands",
      description: "Trip commands sent to the vehicles over AMQP.",
      servers: [{ $ref: "#/servers/dispatch" }],
      messages: { startTrip: message("startTrip"), cancelTrip: message("cancelTrip") },
      bindings: { amqp: { is: "routingKey", exchange: { name: "fleet.trips", type: "topic", durable: true }, bindingVersion: "0.3.0" } },
    },
    tripReplies: {
      address: null,
      description: "Replies routed through the replyTo header of each command.",
      messages: { tripAccepted: message("tripAccepted") },
    },
    dispatchChat: {
      address: "/chat/{conversationId}",
      description: "Chat between drivers and dispatchers.",
      servers: [{ $ref: "#/servers/chat" }],
      parameters: { conversationId: { description: "Conversation identifier." } },
      messages: { chatMessage: { name: "chatMessage", payload: { type: "object", properties: { text: { type: "string" }, attachment: { type: ["string", "null"] } } } } },
    },
    heartbeats: {
      address: "fleet.heartbeats",
      description: "Heartbeats without any field, an empty message is still a message.",
      messages: { heartbeat: {} },
    },
    mixedMessages: {
      address: "fleet.cdc.vehicles.alerts.v1",
      description: "Alerts with a retired entry next to a usable message.",
      messages: { retired: null, legacy: message("retiredAlert"), alert: message("vehicleAlert") },
    },
    partnerPositions: {
      address: "fleet.partner.positions.v1",
      description: "Positions defined by a partner schema registry.",
      messages: { partnerPosition: { $ref: "https://schemas.partner.example.io/asyncapi/messages.yaml#/position" } },
    },
    sharedMap: {
      address: "fleet.cdc.maintenance.v1",
      description: "Maintenance events whose messages map is shared.",
      messages: { $ref: "#/components/x-message-maps/maintenance" },
    },
    invoices: { $ref: "#/components/channels/invoicesIssued" },
    invoicesMirror: { $ref: "#/components/channels/invoicesIssued" },
    payments: { $ref: "./shared/payment-channels.yaml#/paymentCaptured" },
    "x-partnerSync": {
      address: "fleet.cdc.partners.synced.v1",
      description: "Partner synchronisation channel whose key starts with x-.",
      messages: { "x-partnerSynced": message("partnerSynced") },
    },
  },
  operations: {
    receivePosition: {
      action: "receive",
      channel: { $ref: "#/channels/vehiclePosition" },
      messages: [{ $ref: "#/channels/vehiclePosition/messages/vehiclePosition" }],
      traits: [{ $ref: "#/components/operationTraits/kafkaConsumer" }],
    },
    sendChargerReading: { action: "send", channel: { $ref: "#/channels/chargerTelemetry" }, messages: [{ $ref: "#/channels/chargerTelemetry/messages/chargerReading" }] },
    sendStartTrip: {
      action: "send",
      channel: { $ref: "#/channels/tripCommands" },
      messages: [{ $ref: "#/channels/tripCommands/messages/startTrip" }],
      reply: {
        address: { description: "Reply queue chosen by the vehicle.", location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/tripReplies" },
        messages: [{ $ref: "#/channels/tripReplies/messages/tripAccepted" }],
      },
    },
    receiveInvoice: { action: "receive", channel: { $ref: "#/channels/invoices" } },
    sendChat: { action: "send", channel: { $ref: "#/channels/dispatchChat" } },
  },
  components: {
    channels: {
      invoicesIssued: {
        address: "fleet.cdc.invoices.issued.v1",
        description: "Invoices issued after each trip.",
        messages: { invoiceIssued: message("invoiceIssued") },
      },
      unusedArchive: { address: "fleet.cdc.archive.v1", description: "Archived channel kept for reuse.", messages: { archived: { payload: { type: "string" } } } },
    },
    messages: {
      vehiclePosition: {
        name: "vehiclePosition",
        title: "Vehicle position",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/vehicleId" },
        headers: { type: "object", properties: { traceId: { type: "string" }, retry: { type: ["integer", "null"] } } },
        payload: { $ref: "#/components/schemas/Position" },
        traits: [{ $ref: "#/components/messageTraits/tracing" }],
      },
      vehiclePositionAvro: {
        name: "vehiclePositionAvro",
        contentType: "application/vnd.apache.avro+json",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: {
            type: "record",
            name: "VehiclePosition",
            namespace: "es.quality.fleet",
            fields: [
              { name: "vehicleId", type: "string" },
              { name: "speed", type: ["null", "double"], default: null },
            ],
          },
        },
      },
      chargerReading: { name: "chargerReading", payload: { type: "object", properties: { kw: { type: ["number", "null"] } } } },
      startTrip: { name: "startTrip", payload: { type: "object" } },
      cancelTrip: { name: "cancelTrip", payload: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: "object" } } },
      tripAccepted: { name: "tripAccepted", correlationId: { location: "$message.header#/correlationId" }, payload: { type: "object" } },
      vehicleAlert: { name: "vehicleAlert", payload: { type: "object" } },
      invoiceIssued: { name: "invoiceIssued", payload: { type: "object" } },
      partnerSynced: { name: "partnerSynced", payload: { type: "object" } },
      maintenanceDue: { name: "maintenanceDue", payload: { type: "object" } },
    },
    schemas: {
      Position: { type: "object", required: ["vehicleId"], properties: { vehicleId: { type: "string" }, speed: { type: ["number", "null"] } } },
    },
    parameters: { depot: { description: "Depot code.", enum: ["MAD", "BCN"], default: "MAD" } },
    correlationIds: { vehicleId: { description: "Vehicle correlation.", location: "$message.header#/vehicleId" } },
    operationTraits: { kafkaConsumer: { bindings: { kafka: { groupId: { type: "string", enum: ["billing"] }, bindingVersion: "0.5.0" } } } },
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    "x-message-maps": { maintenance: { maintenanceDue: message("maintenanceDue") } },
  },
};
