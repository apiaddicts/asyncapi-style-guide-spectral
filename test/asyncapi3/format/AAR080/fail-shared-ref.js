module.exports = {
  asyncapi: "3.0.0",
  id: "urn:research:genomics",
  info: { $ref: "#/components/x-shared-info/genomicsAlias" },
  defaultContentType: "application/json",
  servers: {
    labKafka: { host: "kafka.genomics.research.example.io:9093", protocol: "kafka-secure", description: "Sequencing backbone." },
  },
  channels: {
    runsCompleted: {
      address: "genomics.cdc.runs.completed.v2",
      servers: [{ $ref: "#/servers/labKafka" }],
      messages: { runCompleted: { $ref: "#/components/messages/runCompleted" } },
    },
  },
  operations: {
    publishRunCompleted: { action: "send", channel: { $ref: "#/channels/runsCompleted" }, messages: [{ $ref: "#/channels/runsCompleted/messages/runCompleted" }] },
    receiveRunCompleted: { action: "receive", channel: { $ref: "#/channels/runsCompleted" } },
  },
  components: {
    messages: {
      runCompleted: { name: "runCompleted", payload: { type: "object", properties: { runId: { type: "string" }, license: { $ref: "#/components/x-licenses/dataset" } } } },
    },
    "x-shared-info": {
      genomicsAlias: { $ref: "#/components/x-shared-info/genomics" },
      genomics: {
        title: "Genomics Sequencing Events",
        version: "2.1.0",
        description: "Sequencing runs and variant calls of the research laboratory.",
        license: { $ref: "#/components/x-licenses/researchAlias" },
      },
    },
    "x-licenses": {
      researchAlias: { $ref: "#/components/x-licenses/research" },
      research: { name: { $ref: "#/components/x-texts/ccAlias" }, url: "https://creativecommons.org/licenses/by-sa/4.0/", identifier: "CC-BY-SA-4.0" },
      dataset: { name: "Creative Commons Attribution", url: "https://creativecommons.org" },
      unused: { name: "Proprietary" },
    },
    "x-texts": { ccAlias: { $ref: "#/components/x-texts/cc" }, cc: "CC BY-SA 4.0" },
  },
};
