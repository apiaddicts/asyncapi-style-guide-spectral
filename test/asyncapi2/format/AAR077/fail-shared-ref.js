module.exports = {
  asyncapi: "2.6.0",
  id: "urn:telecom:network-events",
  info: { $ref: "#/components/x-shared-info/networkAlias" },
  defaultContentType: "application/json",
  servers: {
    networkKafka: {
      url: "kafka.noc.telecom.example.io:9093",
      protocol: "kafka-secure",
      description: "Network operations backbone.",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.noc.telecom.example.io", bindingVersion: "0.4.0" } },
    },
  },
  channels: {
    "noc.sys.cells.alarm.raised.v1": {
      description: "Alarms raised by radio cells.",
      publish: {
        operationId: "publishCellAlarm",
        summary: "The element manager publishes cell alarms.",
        message: { $ref: "#/components/messages/cellAlarm" },
      },
      subscribe: {
        operationId: "receiveCellAlarm",
        summary: "The ticketing system receives cell alarms.",
        message: { $ref: "#/components/messages/cellAlarm" },
      },
    },
  },
  components: {
    messages: {
      cellAlarm: {
        name: "cellAlarm",
        title: "Cell alarm",
        payload: {
          type: "object",
          properties: {
            cellId: { type: "string" },
            severity: { type: "string", enum: ["minor", "major", "critical"] },
            escalation: { $ref: "#/components/x-contacts/escalation" },
          },
        },
      },
    },
    "x-shared-info": {
      networkAlias: { $ref: "#/components/x-shared-info/network" },
      network: {
        title: "Network Operations Events",
        version: { $ref: "#/components/x-texts/version" },
        description: "Alarms and performance counters of the radio access network.",
        contact: { $ref: "#/components/x-contacts/supportAlias" },
      },
    },
    "x-contacts": {
      supportAlias: { $ref: "#/components/x-contacts/support" },
      support: {
        name: { $ref: "#/components/x-texts/teamLoopA" },
        url: { $ref: "./shared/contacts.yaml#/noc/url" },
        Email: "noc@telecom.example.io",
        "x-email": "noc@telecom.example.io",
      },
      escalation: { name: "NOC Escalation", email: "escalation@telecom.example.io" },
      unused: { name: "", email: "" },
    },
    "x-texts": {
      version: "7.0.2",
      teamLoopA: { $ref: "#/components/x-texts/teamLoopB" },
      teamLoopB: { $ref: "#/components/x-texts/teamLoopA" },
    },
  },
};
