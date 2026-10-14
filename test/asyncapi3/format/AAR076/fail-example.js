module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:gridwise:energy-events",
  info: {
    title: "GridWise Energy Events",
    version: "1.6.0",
    description: "Smart meter readings, grid balancing setpoints and operator alerts of the GridWise distribution grid.",
    tags: [
      { name: "energy", description: "Energy metering and grid balancing.", externalDocs: { url: "https://docs.gridwise.example.com/energy" }, "x-owner": "grid-platform" },
      { name: "metering" },
      { $ref: "#/components/tags/demandResponse" },
      { $ref: "#/components/tags/missing" },
    ],
  },
  servers: {
    mqttMeters: {
      host: "mqtt.gridwise.example.com:8883",
      protocol: "secure-mqtt",
      tags: [{ name: "smart-meters", description: null }],
      security: [{ $ref: "#/components/securitySchemes/meterCertificate" }],
    },
    kafkaGrid: { host: "kafka.gridwise.example.com:9093", protocol: "kafka-secure", tags: [{ $ref: "#/components/tags/production" }] },
    wsOperators: { $ref: "#/components/servers/wsOperators" },
  },
  channels: {
    meterReadings: {
      address: "meters/{meterId}/readings",
      parameters: { meterId: { description: "Meter serial number." } },
      tags: [{ name: "readings", description: "" }, "telemetry"],
      messages: {
        readingReported: {
          name: "readingReported",
          contentType: "application/vnd.apache.avro+json",
          tags: [{ name: "", description: "Fifteen minute interval readings." }, { $ref: "#/components/tags/demandResponse" }],
          traits: [
            { $ref: "#/components/messageTraits/meterHeaders" },
            { tags: [{ name: "inline-message-trait" }] },
            [{ tags: [{ description: "Tag of a trait in tuple form." }] }, {}],
          ],
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "ReadingReported",
              namespace: "com.gridwise.metering",
              fields: [
                { name: "meterId", type: "string" },
                { name: "tags", type: ["null", { type: "array", items: "string" }], default: null },
              ],
            },
          },
          correlationId: { location: "$message.header#/correlationId" },
        },
        readingRejected: { $ref: "#/components/messages/readingRejected" },
      },
      servers: [{ $ref: "#/servers/mqttMeters" }],
    },
    operatorAlerts: {
      address: null,
      description: "Dynamic per-operator alert stream.",
      tags: [{ name: "alerts" }],
      messages: { alertRaised: { name: "alertRaised", tags: [{}], payload: { type: "object", properties: { tags: { type: ["array", "null"] } } } } },
    },
    gridBalancing: { $ref: "#/components/channels/gridBalancing" },
  },
  operations: {
    reportReading: {
      action: "send",
      channel: { $ref: "#/channels/meterReadings" },
      messages: [{ $ref: "#/channels/meterReadings/messages/readingReported" }],
      tags: [{ name: "producers", description: "  " }, null],
      traits: [{ $ref: "#/components/operationTraits/mqttQos" }, { tags: [{ name: "inline-operation-trait" }] }],
      reply: {
        channel: { $ref: "#/channels/operatorAlerts" },
        messages: [{ $ref: "#/channels/operatorAlerts/messages/alertRaised" }],
      },
    },
    receiveAlerts: {
      action: "receive",
      channel: { $ref: "#/channels/operatorAlerts" },
      tags: [{ $ref: "#/components/tags/demandResponse" }, { $ref: "./shared/tags.yaml#/components/tags/external" }],
    },
    balanceGrid: { $ref: "#/components/operations/balanceGrid" },
  },
  components: {
    servers: {
      wsOperators: { host: "ws.gridwise.example.com", pathname: "/operators", protocol: "wss", tags: [{ name: "operators", description: [] }] },
    },
    channels: {
      gridBalancing: {
        address: "grid.balancing.setpoints",
        tags: [{ name: "balancing" }],
        messages: { setpointChanged: { name: "setpointChanged", tags: [{ name: "setpoints", description: "Frequency setpoints." }] } },
      },
    },
    operations: {
      balanceGrid: { action: "send", channel: { $ref: "#/components/channels/gridBalancing" }, tags: [{ name: "balancers", description: {} }] },
    },
    messages: {
      readingRejected: { name: "readingRejected", tags: [{ name: "rejections" }] },
    },
    operationTraits: {
      mqttQos: { tags: [{ name: "qos", description: "\t" }], bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } } },
    },
    messageTraits: {
      meterHeaders: { headers: { type: "object", properties: { meterId: { type: "string" } } }, tags: [{ name: "meter-headers" }] },
    },
    tags: {
      production: { name: "production", description: "Production environment.", externalDocs: { url: "https://docs.gridwise.example.com/production" }, "x-owner": "grid-platform" },
      demandResponse: { name: "demand-response", description: "" },
      unused: { name: "unused" },
      productionAlias: { $ref: "#/components/tags/production" },
    },
    replies: {
      alertReply: { channel: { $ref: "#/channels/operatorAlerts" } },
    },
    securitySchemes: { meterCertificate: { type: "X509" } },
  },
};
