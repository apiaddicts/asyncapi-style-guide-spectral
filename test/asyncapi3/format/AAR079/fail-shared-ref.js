const handbook = { $ref: "#/components/externalDocs/handbookAlias" };

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:orbital:ground-station",
  info: {
    title: "Orbital Ground Station",
    version: "1.6.0",
    description: "Telemetry downlinks, antenna schedules and command uplinks of the Orbital ground station network.",
    externalDocs: handbook,
    tags: [{ $ref: "#/components/tags/antenna" }],
  },
  servers: {
    kafkaGround: { $ref: "#/components/servers/kafkaGround" },
  },
  channels: {
    telemetry: { $ref: "#/components/channels/downlink" },
    commands: {
      address: "orbital.cmd.uplink.v1",
      title: "Command uplink",
      externalDocs: handbook,
      servers: [{ $ref: "#/servers/kafkaGround" }],
      messages: { commandSent: { $ref: "#/components/messages/commandSent" } },
    },
  },
  operations: {
    receiveTelemetry: {
      action: "receive",
      channel: { $ref: "#/channels/telemetry" },
      messages: [{ $ref: "#/channels/telemetry/messages/telemetryFrame" }],
      externalDocs: { $ref: "#/components/externalDocs/cycleA" },
      traits: [{ $ref: "#/components/operationTraits/groundOps" }],
    },
    sendCommand: {
      action: "send",
      channel: { $ref: "#/channels/commands" },
      messages: [{ $ref: "#/channels/commands/messages/commandSent" }],
      externalDocs: handbook,
      traits: [{ $ref: "#/components/operationTraits/groundOps" }],
      reply: { $ref: "#/components/replies/commandAck" },
    },
  },
  components: {
    externalDocs: {
      handbook: { url: "https://docs.orbital.example.com/handbook" },
      handbookAlias: { $ref: "#/components/externalDocs/handbook" },
      cycleA: { $ref: "#/components/externalDocs/cycleB" },
      cycleB: { $ref: "#/components/externalDocs/cycleA" },
    },
    tags: {
      antenna: { name: "antenna", description: "Antenna scheduling.", externalDocs: { $ref: "#/components/x-docs/antennaAlias" } },
      antennaAlias: { $ref: "#/components/tags/antenna" },
    },
    servers: {
      kafkaGround: { host: "kafka.orbital.example.com:9093", protocol: "kafka-secure", externalDocs: handbook, tags: [{ $ref: "#/components/tags/antennaAlias" }] },
    },
    channels: {
      downlink: {
        address: "orbital.cdc.telemetry.downlink.v2",
        title: "Telemetry downlink",
        externalDocs: { description: "Downlink channel." },
        messages: { telemetryFrame: { $ref: "#/components/messages/telemetryFrame" } },
      },
    },
    messages: {
      telemetryFrame: {
        name: "telemetryFrame",
        title: "Telemetry frame",
        externalDocs: { url: "https://docs.orbital.example.com/frames" },
        traits: [{ $ref: "#/components/messageTraits/groundHeaders" }],
        payload: { $ref: "#/components/schemas/Telemetry" },
      },
      commandSent: {
        name: "commandSent",
        title: "Command sent",
        externalDocs: handbook,
        traits: [{ $ref: "#/components/messageTraits/groundHeaders" }],
        payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { $ref: "#/components/schemas/TelemetryBody" } },
      },
      commandAck: { name: "commandAck", title: "Command acknowledged", externalDocs: handbook, payload: { $ref: "#/components/schemas/Telemetry" } },
    },
    replies: {
      commandAck: { channel: { $ref: "#/components/channels/downlink" }, messages: [{ $ref: "#/components/messages/commandAck" }] },
    },
    schemas: {
      Telemetry: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { $ref: "#/components/schemas/TelemetryBody" } },
      TelemetryBody: {
        type: "object",
        externalDocs: handbook,
        properties: { frameId: { type: "string", externalDocs: {} }, headers: { $ref: "#/components/schemas/GroundHeaders" } },
      },
      GroundHeaders: { type: "object", externalDocs: { description: "Ground station headers." }, properties: { stationId: { type: "string" } } },
    },
    operationTraits: { groundOps: { externalDocs: handbook, tags: [{ $ref: "#/components/tags/antenna" }] } },
    messageTraits: { groundHeaders: { externalDocs: handbook, headers: { $ref: "#/components/schemas/GroundHeaders" } } },
    "x-docs": {
      antenna: { description: "Antenna scheduling handbook.", url: null },
      antennaAlias: { $ref: "#/components/x-docs/antenna" },
    },
  },
};
