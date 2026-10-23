const docsRef = (name) => ({ $ref: `#/components/x-docs/${name}` });
const complete = { description: "Baggage handling handbook.", url: "https://docs.skyport.example.com/baggage" };

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:skyport:baggage-handling",
  info: {
    title: "Skyport Baggage Handling",
    version: "2.1.0",
    description: "Screening, loading and rejection events of the Skyport baggage handling system.",
  },
  externalDocs: docsRef("handbookAliasTwice"),
  tags: { $ref: "#/components/x-tag-sets/platform" },
  servers: {
    kafkaBaggage: {
      url: "kafka.skyport.example.com:9093",
      protocol: "kafka-secure",
      tags: { $ref: "#/components/x-tag-sets/platform" },
    },
  },
  channels: {
    "skyport.cmd.bags.screen.v1": {
      description: "Screening requests and results.",
      publish: {
        operationId: "publishBagScreened",
        externalDocs: docsRef("handbook"),
        traits: [{ $ref: "#/components/x-trait-library/auditedAlias" }],
        message: { $ref: "#/components/messages/bagScreened" },
      },
      subscribe: {
        operationId: "receiveScreeningOutcome",
        externalDocs: docsRef("cycleA"),
        message: { oneOf: [{ $ref: "#/components/messages/bagScreened" }, { $ref: "#/components/x-message-library/bagRejected" }] },
      },
    },
    "skyport.cdc.bags.loaded.v1": {
      description: "Bags loaded into an aircraft hold.",
      publish: {
        operationId: "publishBagLoaded",
        externalDocs: { $ref: "#/components/x-docs/list/0" },
        traits: [{ $ref: "#/components/x-trait-library/audited" }],
        message: { $ref: "#/components/x-message-library/bagLoadedAlias" },
      },
      subscribe: {
        operationId: "receiveLoadCorrection",
        externalDocs: docsRef("cycleB"),
        message: { $ref: "#/components/x-message-library/bagRejected" },
      },
    },
  },
  components: {
    messages: {
      bagScreened: {
        name: "bagScreened",
        title: "Bag screened",
        externalDocs: docsRef("handbookAlias"),
        payload: { $ref: "#/components/schemas/BagAlias" },
      },
    },
    schemas: {
      Bag: {
        type: "object",
        externalDocs: docsRef("handbook"),
        properties: { tag: { $ref: "#/components/schemas/BagTag" }, weight: { type: ["number", "null"], minimum: 0 } },
      },
      BagAlias: { $ref: "#/components/schemas/Bag" },
      BagTag: { type: "string", pattern: "^[0-9]{10}$", externalDocs: { description: "IATA bag tag." } },
      HandlingHeaders: { type: "object", properties: { station: { type: "string", externalDocs: {} }, tag: { $ref: "#/components/schemas/BagTag" } } },
    },
    messageTraits: {
      handlingHeaders: { externalDocs: docsRef("handbook"), headers: { $ref: "#/components/schemas/HandlingHeaders" } },
      handlingHeadersAlias: { $ref: "#/components/messageTraits/handlingHeaders" },
    },
    "x-message-library": {
      bagRejected: {
        name: "bagRejected",
        title: "Bag rejected",
        externalDocs: { url: "https://docs.skyport.example.com/rejections" },
        payload: { type: "object", properties: { bag: { $ref: "#/components/schemas/Bag" }, tag: { $ref: "#/components/schemas/BagTag" } } },
      },
      bagLoaded: {
        name: "bagLoaded",
        title: "Bag loaded",
        externalDocs: complete,
        traits: [{ $ref: "#/components/messageTraits/handlingHeadersAlias" }],
        payload: { $ref: "#/components/schemas/Bag" },
      },
      bagLoadedAlias: { $ref: "#/components/x-message-library/bagLoaded" },
    },
    "x-trait-library": {
      audited: { externalDocs: docsRef("baggage"), tags: [{ name: "audited", description: "Audited operations.", externalDocs: docsRef("handbook") }] },
      auditedAlias: { $ref: "#/components/x-trait-library/audited" },
    },
    "x-tag-sets": {
      platform: [
        { name: "baggage", description: "Baggage events.", externalDocs: docsRef("handbookAliasTwice") },
        { name: "security", description: "Security screening.", externalDocs: { description: "Screening rules." } },
        { name: "handling", description: "Ground handling.", externalDocs: docsRef("complete") },
      ],
    },
    "x-docs": {
      handbook: { url: "https://docs.skyport.example.com/handbook" },
      handbookAlias: docsRef("handbook"),
      handbookAliasTwice: docsRef("handbookAlias"),
      baggage: { description: "Baggage handbook.", url: null },
      complete,
      cycleA: docsRef("cycleB"),
      cycleB: docsRef("cycleA"),
      list: [{ description: "Load planning.", url: "" }],
    },
  },
};
