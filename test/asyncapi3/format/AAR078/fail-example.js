module.exports = {
  asyncapi: "3.0.0",
  id: "urn:utilities:smart-metering",
  info: {
    title: "Smart Metering Open Data",
    version: "1.9.0",
    description: "Half-hourly consumption, outage and tariff events of the smart metering network.",
    license: {
      title: "Open Data Commons Attribution",
      identifier: "ODC-By-1.0",
      Name: "Open Data Commons Attribution",
      url: null,
    },
    tags: [{ name: "metering", description: "Smart metering events." }],
  },
  license: { name: "ODC-By 1.0", url: "https://opendatacommons.org/licenses/by/1-0/" },
  servers: {
    meteringKafka: {
      host: "kafka.metering.utilities.example.io:9093",
      protocol: "kafka-secure",
      description: "Metering backbone.",
      security: [{ $ref: "#/components/securitySchemes/mtls" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.utilities.example.io", bindingVersion: "0.5.0" } },
    },
  },
  channels: {
    readingsPublished: {
      address: "metering.sys.readings.published.v1",
      title: "Meter readings",
      servers: [{ $ref: "#/servers/meteringKafka" }],
      messages: {
        readingsPublished: {
          name: "readingsPublished",
          title: "Readings published",
          payload: {
            type: "object",
            properties: {
              meterId: { type: "string" },
              kwh: { type: "number" },
              license: { type: "object", properties: { name: { type: "string" }, url: { type: ["string", "null"] } } },
            },
          },
          examples: [{ name: "halfHour", payload: { meterId: "MTR-001", kwh: 0.42, license: { name: "", url: null } } }],
        },
      },
    },
    outageReported: {
      address: "grid/feeders/{feederId}/outages",
      title: "Outages",
      parameters: { feederId: { description: "Feeder identifier." } },
      messages: { outageReported: { $ref: "#/components/messages/outageReported" } },
    },
  },
  operations: {
    publishReadings: { action: "send", channel: { $ref: "#/channels/readingsPublished" } },
    receiveOutage: {
      action: "receive",
      channel: { $ref: "#/channels/outageReported" },
      messages: [{ $ref: "#/channels/outageReported/messages/outageReported" }],
    },
  },
  components: {
    messages: {
      outageReported: {
        name: "outageReported",
        title: "Outage reported",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: {
            type: "record",
            name: "OutageReported",
            fields: [
              { name: "feederId", type: "string" },
              { name: "license", type: ["null", { type: "record", name: "OutageLicense", fields: [{ name: "name", type: "string" }, { name: "url", type: "string" }] }], default: null },
            ],
          },
        },
      },
    },
    schemas: { License: { type: "object", required: ["name", "url"], properties: { name: { type: "string" }, url: { type: "string" } } } },
    securitySchemes: { mtls: { type: "X509", description: "Mutual TLS with utility certificates." } },
    "x-licenses": { open: { name: "ODC-By 1.0", url: "https://opendatacommons.org/licenses/by/1-0/" } },
  },
};
