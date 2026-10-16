const message = (name) => ({ $ref: `#/components/messages/${name}` });
const messages = { sessionStarted: message("sessionStarted") };

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Mobility Charging Events", version: "4.0.0" },
  servers: {
    production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    chargers: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    compliant: { address: "mobility.cdc.compliant.v1", description: "Compliant channel.", messages },
    noAddress: { description: "Channel without address.", messages },
    nullAddress: { address: null, description: "Address unknown until runtime.", messages },
    blankAddress: { address: "   ", description: "Blank address.", messages },
    noDescription: { address: "mobility.cdc.noDescription.v1", messages },
    emptyDescription: { address: "mobility.cdc.emptyDescription.v1", description: "", messages },
    zeroWidthDescription: { address: "mobility.cdc.zeroWidth.v1", description: "\u200b\u2060", messages },
    noMessages: { address: "mobility.cdc.noMessages.v1", description: "Channel without messages." },
    emptyMessages: { address: "mobility.cdc.emptyMessages.v1", description: "Empty messages map.", messages: {} },
    nullMessages: { address: "mobility.cdc.nullMessages.v1", description: "Null messages map.", messages: null },
    emptyChannel: {},
    v2Style: { description: "Written with publish and subscribe.", subscribe: { message: message("sessionStarted") }, publish: { message: message("sessionStarted") } },
    lookAlikes: { topic: "mobility.cdc.lookAlikes.v1", name: "lookAlikes", summary: "Look-alikes.", title: "Look-alikes", message: message("sessionStarted") },
    upperCase: { Address: "mobility.cdc.upperCase.v1", DESCRIPTION: "Upper case.", Messages: messages },
    extensionsOnly: { "x-address": "mobility.cdc.extensions.v1", "x-description": "Extensions.", "x-messages": messages },
    addressInBindings: { description: "The topic only appears in the binding.", messages, bindings: { kafka: { topic: "mobility.cdc.bindings.v1", bindingVersion: "0.5.0" } } },
    tripReplies: { address: null, description: "Replies routed with the replyTo header.", messages: { tripAccepted: message("tripAccepted") } },
    referencedByOperation: { address: "mobility.cdc.referenced.v1", description: "Operations list messages, the channel does not." },
    nullChannel: null,
    stringChannel: "mobility.cdc.string.v1",
    listChannel: [{ address: "mobility.cdc.list.v1", description: "Listed.", messages }],
    "x-partner": { address: "mobility.cdc.partner.v1", messages },
    chargerTelemetry: {
      address: "chargers/{chargerId}/telemetry",
      parameters: { chargerId: { description: "Charger identifier." } },
      servers: [{ $ref: "#/servers/chargers" }],
      messages: {},
    },
    shared: { $ref: "#/components/channels/sharedHub" },
  },
  operations: {
    receiveCompliant: { action: "receive", channel: { $ref: "#/channels/compliant" }, messages: [{ $ref: "#/channels/compliant/messages/sessionStarted" }] },
    sendTrip: {
      action: "send",
      channel: { $ref: "#/channels/compliant" },
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/tripReplies" } },
    },
    receiveReferenced: { action: "receive", channel: { $ref: "#/channels/referencedByOperation" }, messages: [message("sessionStarted")] },
    receiveShared: { action: "receive", channel: { $ref: "#/channels/shared" } },
  },
  components: {
    channels: {
      sharedHub: { description: "Shared hub without address.", messages },
      legacyQueue: { address: "", description: "Legacy queue.", messages: {} },
      nullShared: null,
      compliantShared: { address: "mobility.cdc.shared.v1", description: "Compliant shared channel.", messages },
    },
    messages: {
      sessionStarted: { name: "sessionStarted", payload: { type: "object", properties: { sessionId: { type: "string" } } } },
      tripAccepted: { name: "tripAccepted", payload: { type: "object" } },
    },
  },
};
