module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:harborline:terminal-events",
  info: {
    title: "Harborline Terminal Events",
    version: "2.1.0",
    description: "Container gate, yard and vessel events of the Harborline container terminals.",
    contact: { name: "Terminal Integration", email: "integration@harborline.example.com" },
  },
  defaultContentType: "application/json",
  tags: [
    { name: "containers", description: "Container lifecycle at the terminal.", externalDocs: { url: "https://docs.harborline.example.com/containers" }, "x-owner": "terminal-ops" },
    { name: "vessels" },
    { name: "yard", description: "   " },
    { description: "Gate transactions of trucks and trains." },
  ],
  servers: {
    kafkaTerminals: {
      url: "kafka.harborline.example.com:9093",
      protocol: "kafka-secure",
      description: "Terminal operating system event backbone.",
      tags: [{ $ref: "#/tags/0" }, { name: "production", description: null }],
    },
    rabbitGates: {
      url: "amqps://rabbit.harborline.example.com:5671",
      protocol: "amqps",
      description: "Gate automation broker.",
      tags: [{ name: "", description: "Optical character recognition portals at the gates." }],
    },
  },
  channels: {
    "harborline.cmd.containers.gate-in.v2": {
      description: "A truck delivered a container through the gate.",
      publish: {
        operationId: "publishGateIn",
        summary: "Publish a gate-in transaction.",
        tags: [{ name: "gate-in", description: "Trucks entering the terminal." }, "gate-automation"],
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { tags: [{ name: "inline-producer" }] }],
        message: {
          name: "containerGatedIn",
          title: "Container gated in",
          tags: [{ name: "gate-events", description: "" }, null],
          traits: [{ $ref: "#/components/messageTraits/terminalHeaders" }, [{ tags: [{ name: "tuple-trait" }] }, { "x-override": true }]],
          payload: {
            type: "object",
            properties: {
              containerId: { type: "string", pattern: "^[A-Z]{4}[0-9]{7}$" },
              tags: { type: ["array", "null"], items: { type: "object", properties: { name: { type: "string" } } } },
            },
          },
          examples: [{ name: "reeferGateIn", payload: { containerId: "MSCU1234565", tags: [{ name: "Reefer" }] } }],
        },
      },
      subscribe: {
        operationId: "receiveGateIn",
        tags: [{ $ref: "#/components/x-tag-library/customs" }],
        message: {
          oneOf: [
            { $ref: "#/components/messages/containerInspected" },
            { name: "containerRejected", title: "Container rejected", tags: [{ name: "rejections", description: "\t\n" }, {}] },
          ],
        },
      },
      bindings: { kafka: { topic: "harborline.cmd.containers.gate-in.v2", partitions: 12, bindingVersion: "0.4.0" } },
    },
    "harborline.cdc.yard.moves.v1": { $ref: "#/components/channels/yardMoves" },
    "vessels/{vesselId}/berth": {
      description: "Berth allocations of a vessel.",
      parameters: { vesselId: { description: "IMO number of the vessel.", schema: { type: "string", pattern: "^[0-9]{7}$" } } },
      subscribe: {
        operationId: "receiveBerthing",
        tags: [{ $ref: "#/components/x-tag-library/missing" }, { $ref: "./shared/tags.yaml#/vessels" }, { $ref: "#/tags/1" }],
        message: { $ref: "#/components/messages/vesselBerthed" },
      },
      bindings: { amqp: { is: "queue", queue: { name: "vessel-berthing", durable: true }, bindingVersion: "0.3.0" } },
    },
  },
  components: {
    servers: {
      kafkaDr: { url: "kafka-dr.harborline.example.com:9093", protocol: "kafka-secure", tags: [{ name: "disaster-recovery", description: [] }] },
    },
    channels: {
      yardMoves: {
        description: "Straddle carrier moves inside the yard.",
        publish: {
          operationId: "publishYardMove",
          tags: [{ name: "yard-moves" }],
          message: { name: "yardMoveCompleted", title: "Yard move completed", tags: [{ $ref: "#/components/x-tag-library/customs" }] },
        },
      },
    },
    messages: {
      containerInspected: {
        name: "containerInspected",
        title: "Container inspected",
        contentType: "application/vnd.apache.avro+json",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        tags: [{ name: "inspections", description: {} }],
        payload: {
          type: "record",
          name: "ContainerInspected",
          namespace: "com.harborline.customs",
          fields: [
            { name: "containerId", type: "string" },
            { name: "tags", type: ["null", { type: "array", items: "string" }], default: null },
          ],
        },
      },
      vesselBerthed: { name: "vesselBerthed", title: "Vessel berthed", tags: [{ name: "berthing", description: "Vessel berth allocations." }] },
    },
    operationTraits: {
      kafkaProducer: { tags: [{ name: "producers", description: " " }], bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.4.0" } } },
    },
    messageTraits: {
      terminalHeaders: { headers: { type: "object", properties: { terminalId: { type: "string" } } }, tags: [{ name: "terminal-headers" }] },
    },
    "x-tag-library": {
      customs: { name: "customs" },
    },
  },
};
