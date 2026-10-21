module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Fleet Telematics Events", version: "4.2.0" },
  channels: {
    "fleet.cdc.vehicles.position.v1": {
      publish: { operationId: "publishPosition", message: { $ref: "#/components/messages/vehiclePosition" } },
      subscribe: { operationId: "consumePosition", message: { $ref: "#/components/messages/vehiclePosition" } },
    },
    "fleet.cdc.vehicles.position.v2": {
      subscribe: {
        operationId: "consumePositionV2",
        message: {
          oneOf: [
            { $ref: "#/components/messages/vehiclePosition" },
            { $ref: "./shared/fleet-messages.yaml#/vehicleStopped" },
            { $ref: "#/components/messages/doesNotExist" },
          ],
        },
      },
    },
    "fleet.cmd.vehicles.immobilize.v1": {
      publish: {
        operationId: "publishImmobilize",
        message: {
          messageId: "immobilizeVehicle",
          contentType: "application/json",
          traits: [{ $ref: "#/components/messageTraits/legacyEncoding" }],
        },
      },
      subscribe: {
        operationId: "consumeImmobilize",
        message: {
          messageId: "immobilizeAck",
          traits: [{ $ref: "#/components/messageTraits/legacyEncoding" }, { $ref: "./shared/traits.yaml#/binary" }],
        },
      },
    },
    "fleet.sys.diagnostics.v1": { $ref: "#/components/channels/diagnostics" },
    "fleet.sys.diagnostics.v2": { $ref: "#/components/channels/diagnostics" },
  },
  components: {
    channels: {
      diagnostics: {
        publish: {
          operationId: "publishDiagnostics",
          message: { messageId: "diagnosticFrame", contentType: "application/vnd.fleet.diag" },
        },
      },
    },
    messages: {
      vehiclePosition: {
        messageId: "vehiclePosition",
        contentType: "text/json",
        traits: [{ $ref: "#/components/messageTraits/legacyEncoding" }],
      },
    },
    messageTraits: {
      legacyEncoding: { contentType: "application/x-msgpack" },
    },
  },
};
