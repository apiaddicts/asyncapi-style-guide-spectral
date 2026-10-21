module.exports = {
  asyncapi: "3.0.0",
  id: "urn:research:genomics-pipeline",
  info: { $ref: "#/components/x-shared-info/genomicsAlias" },
  servers: {
    genomicsKafka: { host: "kafka.genomics.research.example.io:9093", protocol: "kafka-secure", description: "Sequencing pipeline backbone." },
  },
  channels: {
    runCompleted: {
      address: "genomics.sys.runs.completed.v1",
      messages: { runCompleted: { $ref: "#/components/messages/runCompleted" } },
    },
  },
  operations: {
    publishRunCompleted: {
      action: "send",
      channel: { $ref: "#/channels/runCompleted" },
      messages: [{ $ref: "#/channels/runCompleted/messages/runCompleted" }],
      reply: { channel: { $ref: "#/components/channels/runAcks" } },
    },
  },
  components: {
    channels: { runAcks: { address: null, messages: { runAck: { payload: { type: "object", properties: { status: { type: "string" } } } } } } },
    messages: {
      runCompleted: {
        name: "runCompleted",
        title: "Run completed",
        payload: { type: "object", properties: { runId: { type: "string" }, reads: { type: "integer", format: "int64" }, dataLicense: { $ref: "#/components/x-licenses/dataUse" } } },
      },
    },
    "x-shared-info": {
      genomicsAlias: { $ref: "#/components/x-shared-info/genomics" },
      genomics: {
        title: "Genomics Pipeline Events",
        version: "3.2.0",
        license: { $ref: "#/components/x-licenses/researchAlias" },
      },
    },
    "x-licenses": {
      researchAlias: { $ref: "#/components/x-licenses/research" },
      research: {
        url: { $ref: "#/components/x-texts/urlLoopA" },
        NAME: "Research Use Only",
        "x-name": { $ref: "#/components/x-texts/name" },
      },
      dataUse: { name: "", url: "" },
    },
    "x-texts": {
      name: "Research Use Only",
      urlLoopA: { $ref: "#/components/x-texts/urlLoopB" },
      urlLoopB: { $ref: "#/components/x-texts/urlLoopA" },
    },
  },
};
