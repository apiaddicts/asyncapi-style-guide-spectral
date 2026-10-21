const message = (name) => ({ $ref: `#/components/messages/${name}` });
const server = (name) => ({ $ref: `#/servers/${name}` });
const messages = { sessionStarted: message("sessionStarted") };

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Mobility Charging Events", version: "4.0.0" },
  servers: {
    production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    chargers: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    compliant: { address: "mobility.cdc.compliant.v1", servers: [server("production")], messages },
    noServers: { address: "mobility.cdc.noServers.v1", description: "Available on every server.", messages },
    emptyServers: { address: "mobility.cdc.emptyServers.v1", servers: [], messages },
    nullServers: { address: "mobility.cdc.nullServers.v1", servers: null, messages },
    danglingServer: { address: "mobility.cdc.dangling.v1", servers: [server("charging-legacy")], messages },
    caseServer: { address: "mobility.cdc.case.v1", servers: [server("Production")], messages },
    componentServer: { address: "mobility.cdc.component.v1", servers: [{ $ref: "#/components/servers/backupCluster" }], messages },
    nameServers: { address: "mobility.cdc.names.v1", servers: ["production"], messages },
    singleReference: { address: "mobility.cdc.single.v1", servers: server("production"), messages },
    inlineServer: { address: "mobility.cdc.inline.v1", servers: [{ host: "kafka.quality.es:9093", protocol: "kafka-secure" }], messages },
    deepPointer: { address: "mobility.cdc.deep.v1", servers: [{ $ref: "#/servers/production/bindings" }], messages },
    mixedServers: { address: "mobility.cdc.mixed.v1", servers: [server("charging-legacy"), server("production")], messages },
    extensionServers: { address: "mobility.cdc.extension.v1", "x-servers": [server("production")], messages },
    bindingServers: { address: "mobility.cdc.binding.v1", bindings: { kafka: { servers: [server("production")], bindingVersion: "0.5.0" } }, messages },
    messageServers: { address: "mobility.cdc.message.v1", messages: { sessionStarted: { name: "sessionStarted", servers: [server("production")] } } },
    chargerTelemetry: {
      address: "chargers/{chargerId}/telemetry",
      parameters: { chargerId: { description: "Charger identifier." } },
      servers: [server("chargers")],
      messages,
    },
    tripReplies: { address: null, description: "Replies routed with the replyTo header.", messages: { tripAccepted: message("tripAccepted") } },
    nullChannel: null,
    stringChannel: "mobility.cdc.string.v1",
    listChannel: [{ address: "mobility.cdc.list.v1", servers: [server("production")], messages }],
    "x-partner": { address: "mobility.cdc.partner.v1", messages },
    shared: { $ref: "#/components/channels/sharedHub" },
    external: { $ref: "./shared/mobility-channels.yaml#/sessions" },
  },
  operations: {
    receiveCompliant: { action: "receive", channel: { $ref: "#/channels/compliant" }, messages: [{ $ref: "#/channels/compliant/messages/sessionStarted" }] },
    sendTrip: {
      action: "send",
      channel: { $ref: "#/channels/compliant" },
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/tripReplies" } },
    },
    receiveShared: { action: "receive", channel: { $ref: "#/channels/shared" } },
  },
  components: {
    servers: { backupCluster: { host: "kafka-backup.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels: {
      sharedHub: { address: "mobility.cdc.hub.v1", description: "Shared hub without servers.", messages },
      legacyQueue: { address: "mobility.cdc.legacy.v1", servers: [], messages },
      nullShared: null,
      compliantShared: { address: "mobility.cdc.shared.v1", servers: [server("production")], messages },
      replyShared: { address: null, servers: [server("chargers")], messages },
    },
    messages: {
      sessionStarted: { name: "sessionStarted", payload: { type: "object", properties: { sessionId: { type: "string" } } } },
      tripAccepted: { name: "tripAccepted", payload: { type: "object" } },
    },
  },
};
