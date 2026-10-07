module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Metro Transit Realtime Events",
    version: "2.9.0",
    description: "Vehicle positions, service alerts and fare transactions of the metro transit network.",
  },
  defaultContentType: "text/json",
  servers: {
    vehicleBroker: { host: "mqtt.metrotransit.io:8883", protocol: "secure-mqtt" },
  },
  channels: {
    vehiclePositions: {
      address: "transit/vehicles/{vehicleId}/position",
      parameters: { vehicleId: { description: "Fleet number." } },
      messages: {
        positionReported: { $ref: "#/components/messages/positionReported" },
        positionCorrected: {
          name: "positionCorrected",
          contentType: "application/jsn",
          traits: [
            { $ref: "#/components/messageTraits/commonHeaders" },
            { contentType: "application/x-ndjson" },
            [{ contentType: "image/png" }, { contentType: "application/json" }],
            [{ $ref: "#/components/messageTraits/commonHeaders" }, { contentType: "image/png" }],
          ],
        },
        positionSnapshot: { name: "positionSnapshot", contentType: "application/cloudevents+json" },
      },
    },
    serviceAlerts: {
      address: null,
      messages: {
        alertRaised: { name: "alertRaised", contentType: "application/vnd.apache.avro;version=1.9.0" },
        alertCleared: { name: "alertCleared", contentType: "*/*" },
      },
    },
    auditTrail: { $ref: "#/components/channels/auditTrail" },
  },
  operations: {
    reportPosition: {
      action: "send",
      channel: { $ref: "#/channels/vehiclePositions" },
      messages: [{ $ref: "#/channels/vehiclePositions/messages/positionCorrected" }],
      reply: { channel: { $ref: "#/channels/serviceAlerts" }, messages: [{ $ref: "#/channels/serviceAlerts/messages/alertRaised" }] },
    },
  },
  components: {
    channels: {
      auditTrail: {
        address: "metro.sys.audit.trail.v1",
        messages: { auditLine: { name: "auditLine", contentType: "text/html" } },
      },
    },
    messages: {
      positionReported: { name: "positionReported", contentType: "multipart/mixed" },
      timetable: { name: "timetable", contentType: "application/yaml" },
      depotReport: { name: "depotReport", contentType: " application/xml" },
    },
    messageTraits: {
      commonHeaders: { contentType: "application/json", headers: { type: "object" } },
      legacyTrait: { contentType: "application/x-www-form-urlencoded" },
    },
  },
};
