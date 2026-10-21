module.exports = {
  asyncapi: "3.0.0",
  id: "urn:logistics:warehouse-robots",
  info: {
    title: "Warehouse Robotics Events",
    description: "\t\n",
    termsOfService: "https://robots.logistics.example.io/terms",
    contact: null,
    license: {},
    tags: [],
    externalDocs: { $ref: "#/components/externalDocs/missingHandbook" },
    "x-api-id": "e7b2c9d4-5f1a-4b3e-8c6d-2a9f0e1b7c3d",
  },
  tags: [{ name: "robots", description: "Root-level tags are not part of the 3.x info object." }],
  externalDocs: { url: "https://robots.logistics.example.io/docs" },
  servers: {
    fleetMqtt: {
      host: "fleet.logistics.example.io:8883",
      protocol: "secure-mqtt",
      description: "Robot fleet broker.",
      bindings: { mqtt: { clientId: "fleet-manager", cleanSession: false, bindingVersion: "0.2.0" } },
    },
    wmsKafka: { host: "kafka.wms.logistics.example.io:9093", protocol: "kafka-secure", description: "Warehouse management backbone." },
  },
  channels: {
    robotTelemetry: {
      address: "robots/{robotId}/telemetry",
      title: "",
      description: "",
      parameters: { robotId: { description: "" } },
      servers: [{ $ref: "#/servers/fleetMqtt" }],
      messages: {
        batteryLevel: {
          name: "batteryLevel",
          title: "",
          payload: { type: "object", properties: { percent: { type: "integer", minimum: 0, maximum: 100 }, charging: { type: ["boolean", "null"] } } },
        },
        info: { name: "info", title: "", payload: { type: "object", properties: { title: { type: "string" }, version: { type: "string" } } } },
      },
    },
    pickTasks: {
      address: "wms.cmd.pick-tasks.assigned.v3",
      servers: [{ $ref: "#/servers/wmsKafka" }],
      messages: { pickTaskAssigned: { $ref: "#/components/messages/pickTaskAssigned" } },
    },
    pickReplies: { address: null, messages: { pickTaskAccepted: { payload: { type: "object", properties: { taskId: { type: "string" } } } } } },
  },
  operations: {
    reportTelemetry: { action: "send", title: "", summary: "", channel: { $ref: "#/channels/robotTelemetry" } },
    assignPickTask: {
      action: "receive",
      channel: { $ref: "#/channels/pickTasks" },
      reply: { channel: { $ref: "#/channels/pickReplies" }, address: { location: "$message.header#/replyTo" } },
    },
  },
  components: {
    messages: {
      pickTaskAssigned: {
        name: "pickTaskAssigned",
        title: "Pick task assigned",
        payload: {
          type: "object",
          properties: { taskId: { type: "string" }, aisle: { type: "string" }, priority: { type: ["integer", "null"] } },
        },
      },
    },
    externalDocs: { robotsHandbook: { url: "https://robots.logistics.example.io/handbook" } },
    "x-info": { title: "", version: "", description: "" },
  },
};
