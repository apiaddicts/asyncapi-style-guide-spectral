module.exports = {
  asyncapi: "2.6.0",
  id: "urn:energy:meter-readings",
  info: { $ref: "#/components/x-shared-info/meteringAlias" },
  defaultContentType: "application/json",
  servers: {
    meteringKafka: {
      url: "kafka.metering.energy.example.io:9093",
      protocol: "kafka-secure",
      description: "Smart meter backbone.",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.metering.energy.example.io", bindingVersion: "0.4.0" } },
    },
  },
  channels: {
    "metering.cdc.readings.received.v4": {
      description: "Half-hourly readings received from smart meters.",
      publish: { operationId: "publishReadingReceived", message: { $ref: "#/components/messages/readingReceived" } },
      subscribe: { operationId: "receiveReadingReceived", message: { $ref: "#/components/messages/readingReceived" } },
    },
  },
  components: {
    messages: {
      readingReceived: {
        name: "readingReceived",
        title: "Reading received",
        payload: { type: "object", properties: { meterId: { type: "string" }, kwh: { type: "number", minimum: 0 }, license: { $ref: "#/components/x-licenses/dataset" } } },
      },
    },
    "x-shared-info": {
      meteringAlias: { $ref: "#/components/x-shared-info/metering" },
      metering: {
        title: "Meter Reading Events",
        version: "4.0.2",
        description: "Smart meter readings and tariff events of the distribution network.",
        license: { $ref: "#/components/x-licenses/openDataAlias" },
      },
    },
    "x-licenses": {
      openDataAlias: { $ref: "#/components/x-licenses/openData" },
      openData: {
        name: { $ref: "#/components/x-texts/odblAlias" },
        url: "https://opendatacommons.org/licenses/odbl/1-0/",
        identifier: "ODbL-1.0",
      },
      dataset: { name: "Open Data Commons", url: "https://opendatacommons.org" },
      unused: { name: "Proprietary" },
    },
    "x-texts": { odblAlias: { $ref: "#/components/x-texts/odbl" }, odbl: "odbl 1.0" },
  },
};
