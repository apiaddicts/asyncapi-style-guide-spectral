module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Clinical Order Events", version: "3.0.0" },
  channels: {
    labOrders: {
      address: "clinic.cmd.lab.orders.v1",
      messages: {
        labOrderPlaced: { $ref: "#/components/messages/labOrderPlaced" },
        labOrderAmended: {
          name: "labOrderAmended",
          contentType: "application/json",
          traits: [{ $ref: "#/components/messageTraits/hl7Envelope" }, { $ref: "./shared/traits.yaml#/fhir" }],
        },
      },
    },
    labOrdersReplica: {
      address: "clinic.cmd.lab.orders.replica.v1",
      messages: {
        labOrderPlaced: { $ref: "#/components/messages/labOrderPlaced" },
        externalResult: { $ref: "./shared/lab-messages.yaml#/components/messages/labResult" },
        dangling: { $ref: "#/components/messages/doesNotExist" },
      },
    },
    imaging: { $ref: "#/components/channels/imaging" },
    imagingMirror: { $ref: "#/components/channels/imaging" },
  },
  operations: {
    placeLabOrder: {
      action: "send",
      channel: { $ref: "#/channels/labOrders" },
      messages: [{ $ref: "#/channels/labOrders/messages/labOrderPlaced" }, { $ref: "#/components/messages/labOrderPlaced" }],
      reply: {
        channel: { $ref: "#/channels/labOrdersReplica" },
        messages: [{ $ref: "#/channels/labOrdersReplica/messages/labOrderPlaced" }],
      },
    },
    receiveImaging: { $ref: "#/components/operations/receiveImaging" },
  },
  components: {
    channels: {
      imaging: {
        address: "clinic.cdc.imaging.studies.v1",
        messages: {
          studyCompleted: {
            name: "studyCompleted",
            contentType: "application/dicom",
            traits: [{ $ref: "#/components/messageTraits/hl7Envelope" }],
          },
        },
      },
    },
    operations: {
      receiveImaging: {
        action: "receive",
        channel: { $ref: "#/components/channels/imaging" },
        messages: [{ $ref: "#/components/channels/imaging/messages/studyCompleted" }],
      },
    },
    messages: {
      labOrderPlaced: {
        name: "labOrderPlaced",
        contentType: "application/fhir+ndjson",
        traits: [{ $ref: "#/components/messageTraits/hl7Envelope" }],
      },
    },
    messageTraits: {
      hl7Envelope: { contentType: "x-application/hl7-v2+er7" },
    },
  },
};
