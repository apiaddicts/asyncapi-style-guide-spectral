module.exports = {
  asyncapi: "3.0.0",
  id: "urn:metrotransit:realtime",
  info: {
    title: "Metro Transit Realtime Events",
    version: "2.8.0",
    description: "Vehicle positions, service alerts and fare transactions of the metro transit network.",
    tags: [{ name: "realtime" }],
  },
  defaultContentType: "application/json",
  servers: {
    vehicleBroker: {
      host: "mqtt.metrotransit.io:8883",
      pathname: "/realtime",
      protocol: "secure-mqtt",
      description: "Onboard units publish here.",
    },
    fareBackbone: {
      host: "kafka.metrotransit.io:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.metrotransit.io", bindingVersion: "0.5.0" } },
    },
  },
  channels: {
    vehiclePositions: {
      address: "transit/vehicles/{vehicleId}/position",
      description: "Position reports of every vehicle.",
      parameters: { vehicleId: { description: "Fleet number.", enum: ["bus-101", "tram-7"], default: "bus-101" } },
      messages: {
        positionReported: { $ref: "#/components/messages/positionReported" },
        positionCorrected: {
          name: "positionCorrected",
          contentType: "application/cloudevents+json; charset=utf-8",
          traits: [
            { $ref: "#/components/messageTraits/commonHeaders" },
            { contentType: "application/json" },
            [{ $ref: "#/components/messageTraits/commonHeaders" }, { contentType: "not checked" }],
            [{ contentType: "application/vnd.metro.position.v2+json" }, { reason: "tuple form" }],
          ],
          headers: {
            type: "object",
            properties: { "content-type": { type: "string", const: "text/json" }, contentType: { type: "string", enum: ["bogus"] } },
          },
          payload: {
            schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
            schema: {
              type: "object",
              properties: {
                vehicleId: { type: "string" },
                contentType: { type: ["string", "null"], enum: ["text/json", null] },
                bearing: { type: ["number", "null"], minimum: 0, maximum: 360 },
              },
            },
          },
          examples: [{ name: "corrected", headers: { contentType: "bogus" }, payload: { vehicleId: "bus-101", contentType: "text/json" } }],
          bindings: { mqtt: { contentType: "text/json", qos: 1, bindingVersion: "0.2.0" } },
          "x-content-type": "text/json",
        },
      },
    },
    serviceAlerts: {
      address: null,
      description: "Dynamic address: one topic per line.",
      messages: {
        alertRaised: {
          name: "alertRaised",
          contentType: "application/x-protobuf",
          payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "syntax = \"proto3\"; message Alert { string id = 1; }" },
        },
        alertCleared: { name: "alertCleared", payload: { type: "object" } },
        alertNull: { name: "alertNull", contentType: null },
      },
    },
    fareTransactions: {
      address: "metro.cdc.fares.transactions.v1",
      messages: {
        fareCharged: {
          name: "fareCharged",
          contentType: "application/vnd.metro.fare.v1+avro",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "FareCharged",
              namespace: "io.metrotransit.fares",
              fields: [
                { name: "cardId", type: "string" },
                { name: "contentType", type: ["null", "string"], default: null },
                { name: "amountCents", type: ["null", "long"], default: null },
              ],
            },
          },
        },
        fareRefunded: { name: "fareRefunded", contentType: "application/avro" },
      },
    },
    auditTrail: { $ref: "#/components/channels/auditTrail" },
    rawFrames: {
      address: "transit/raw/{unitId}",
      parameters: { unitId: { description: "Onboard unit." } },
      messages: { rawFrame: { name: "rawFrame", contentType: "application/octet-stream" } },
    },
  },
  operations: {
    reportPosition: {
      action: "send",
      channel: { $ref: "#/channels/vehiclePositions" },
      messages: [{ $ref: "#/channels/vehiclePositions/messages/positionReported" }, { $ref: "#/channels/vehiclePositions/messages/positionCorrected" }],
      reply: {
        channel: { $ref: "#/channels/serviceAlerts" },
        messages: [{ $ref: "#/channels/serviceAlerts/messages/alertRaised" }],
      },
    },
    chargeFare: {
      action: "receive",
      channel: { $ref: "#/channels/fareTransactions" },
      messages: [{ $ref: "#/channels/fareTransactions/messages/fareCharged" }],
      bindings: { kafka: { groupId: { type: "string", enum: ["fares"] }, bindingVersion: "0.5.0" } },
    },
  },
  components: {
    channels: {
      auditTrail: {
        address: "metro.sys.audit.trail.v1",
        messages: { auditLine: { name: "auditLine", contentType: "text/plain; charset=us-ascii" } },
      },
    },
    messages: {
      positionReported: {
        name: "positionReported",
        contentType: "application/json",
        correlationId: { location: "$message.header#/correlationId" },
        payload: { type: "object", properties: { latitude: { type: "number", format: "double" } } },
      },
      stopArrivals: { name: "stopArrivals", contentType: "Text/CSV; header=present" },
      timetable: { name: "timetable", contentType: "application/yaml" },
      sensorFrame: { name: "sensorFrame", contentType: "application/cbor" },
      gtfsFeed: { name: "gtfsFeed", contentType: "application/atom+xml" },
      depotReport: { name: "depotReport", contentType: "application/xml", traits: [{ $ref: "#/components/messageTraits/protobufTrait" }] },
      legacyNull: { name: "legacyNull", contentType: null },
    },
    messageTraits: {
      commonHeaders: {
        contentType: "application/json",
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
      },
      protobufTrait: { contentType: "application/protobuf" },
      noContentTypeTrait: { headers: { type: "object" } },
    },
    operations: {
      replayPositions: { action: "receive", channel: { $ref: "#/channels/vehiclePositions" } },
    },
    replies: {
      alertReply: { messages: [{ $ref: "#/components/messages/positionReported" }] },
    },
    schemas: {
      Attachment: { type: "object", properties: { contentType: { type: "string", enum: ["text/json"], examples: ["bogus"] } } },
    },
  },
};
