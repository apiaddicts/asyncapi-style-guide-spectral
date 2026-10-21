module.exports = {
  asyncapi: "2.6.0",
  id: "urn:harbor:logistics:event-mesh",
  info: {
    title: "Harbor Logistics Event Mesh",
    version: "4.2.0",
    description: "Container terminal events exchanged between the gate, the yard, the cranes and the customs broker.",
    contact: { name: "Terminal Platform", url: "https://harbor.example.io/platform", email: "platform@harbor.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      url: "kafka-{zone}.harbor.example.io:9093",
      protocol: "kafka-secure",
      variables: { zone: { enum: ["north", "south"], default: "north" } },
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.harbor.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    amqpBroker: { url: "amqps://rabbit.harbor.example.io:5671/terminal", protocol: "amqps", security: [{ brokerCert: [] }] },
    mqttEdge: { url: "mqtts://edge.harbor.example.io:8883", protocol: "secure-mqtt", bindings: { mqtt: { clientId: "berth-gateway", cleanSession: false, bindingVersion: "0.2.0" } } },
    wsGateway: { url: "wss://stream.harbor.example.io/v4", protocol: "wss" },
  },
  channels: {
    "harbor.cdc.containers.gate-in.v1": {
      description: "Containers registered at the inbound gate.",
      servers: ["kafkaProd"],
      bindings: { kafka: { topic: "harbor.cdc.containers.gate-in.v1", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishGateIn",
        summary: "Gate registers a container.",
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        message: {
          name: "containerGatedIn",
          title: "Container gated in",
          contentType: "application/json",
          correlationId: { $ref: "#/components/correlationIds/visitId" },
          headers: { $ref: "#/components/schemas/TraceHeaders" },
          payload: { $ref: "#/components/schemas/ContainerEvent" },
          examples: [
            {
              name: "reeferContainer",
              summary: "A refrigerated container arriving by truck.",
              headers: { traceId: "4bf92f3577b34da6", visitId: "VIS-88120" },
              payload: { containerId: "MSCU1234565", isoType: "45R1", grossWeightKg: 27850, sealNumber: null, gate: "N3" },
            },
            { name: "emptyContainer", payload: { containerId: "TGHU8812340", isoType: "22G1", grossWeightKg: 2230, sealNumber: "SL-0091", gate: "N1" } },
          ],
        },
      },
      subscribe: {
        operationId: "receiveGateIn",
        summary: "Yard planner consumes gate events.",
        bindings: { kafka: { groupId: { type: "string", enum: ["yard-planner"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/containerGatedIn" },
            {
              name: "containerGatedInAvro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "ContainerGatedIn",
                namespace: "io.harbor.gate",
                fields: [
                  { name: "containerId", type: "string" },
                  { name: "sealNumber", type: ["null", "string"], default: null },
                  { name: "hazmat", type: ["null", { type: "record", name: "Hazmat", fields: [{ name: "unNumber", type: "string" }] }], default: null },
                ],
              },
              examples: [{ name: "avroGateIn", payload: { containerId: "MSCU1234565", sealNumber: null, hazmat: null } }],
            },
            {
              name: "containerGateInTombstone",
              summary: "Compaction tombstone emitted when a gate visit is purged.",
              payload: { type: ["object", "null"], properties: { containerId: { type: ["string", "null"] } } },
              examples: [{ name: "tombstone", headers: { visitId: "VIS-88120" }, payload: null }],
            },
          ],
        },
      },
    },
    "harbor.cmd.cranes.assign.v1": {
      description: "Crane assignment commands issued by the berth planner.",
      servers: ["amqpBroker"],
      bindings: { amqp: { is: "routingKey", exchange: { name: "cranes", type: "topic", durable: true, vhost: "/terminal" }, bindingVersion: "0.3.0" } },
      publish: { operationId: "requestCraneAssignment", message: { $ref: "#/components/messages/craneAssignmentRequested" } },
      subscribe: {
        operationId: "receiveCraneAssignment",
        message: {
          name: "craneAssigned",
          traits: [{ $ref: "#/components/messageTraits/amqpEnvelope" }],
          payload: { type: "object", required: ["craneId", "vesselVisit"], properties: { craneId: { type: "string" }, vesselVisit: { type: "string" }, shift: { type: "integer", format: "int32" } } },
          examples: [{ name: "nightShift", payload: { craneId: "STS-04", vesselVisit: "MAERSK-ESSEN-2241", shift: 3 } }],
        },
      },
    },
    "harbor/berths/{berthId}/status": {
      description: "Berth sensors publish their status over MQTT.",
      servers: ["mqttEdge"],
      parameters: { berthId: { description: "Berth identifier.", schema: { type: "string", pattern: "^B[0-9]{2}$" }, location: "$message.payload#/berthId" } },
      publish: {
        operationId: "publishBerthStatus",
        message: {
          name: "berthStatusChanged",
          payload: { $ref: "#/components/schemas/BerthStatus" },
          examples: [{ $ref: "#/components/x-examples/berthOccupied" }, { name: "berthFree", payload: { berthId: "B07", occupied: false, vessel: null } }],
        },
      },
      subscribe: {
        operationId: "receiveBerthHeartbeat",
        message: {
          name: "berthHeartbeat",
          summary: "Liveness probe that carries all its data in headers.",
          headers: { type: "object", properties: { sensorId: { type: "string" }, uptimeSeconds: { type: "integer", format: "int64" } } },
          examples: [{ name: "sensorAlive", headers: { sensorId: "BS-07-A", uptimeSeconds: 86400 } }],
        },
      },
    },
    "harbor.sys.vessels.eta.v2": {
      description: "Vessel ETA updates streamed to the control room.",
      servers: ["wsGateway"],
      bindings: { ws: { method: "GET", query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" } },
      subscribe: {
        operationId: "streamVesselEta",
        message: {
          oneOf: [
            {
              name: "vesselEtaChanged",
              traits: [{ $ref: "#/components/messageTraits/etaSamples" }],
              payload: { $ref: "#/components/schemas/VesselEta" },
            },
            {
              name: "vesselEtaRevised",
              examples: [],
              traits: [[{ $ref: "#/components/messageTraits/etaSamples" }, { channel: "control-room" }]],
              payload: { $ref: "#/components/schemas/VesselEta" },
            },
            {
              name: "vesselEtaConfirmed",
              examples: [{ payload: { vesselImo: "9811000", eta: "2026-10-14T06:30:00Z" } }],
              traits: [{ $ref: "#/components/messageTraits/wsEnvelope" }],
              payload: { $ref: "#/components/schemas/VesselEta" },
            },
          ],
        },
      },
    },
    "harbor.cdc.customs.holds.v1": {
      description: "Customs holds placed on containers.",
      servers: ["kafkaProd"],
      subscribe: {
        operationId: "receiveCustomsHold",
        message: {
          name: "customsHoldPlaced",
          payload: { type: "object", properties: { containerId: { type: "string" }, reason: { type: "string", enum: ["inspection", "documents", "duties"] } } },
          examples: { $ref: "#/components/x-example-sets/customsHolds" },
        },
      },
      publish: { operationId: "publishCustomsRelease", message: { $ref: "./shared/customs-messages.yaml#/components/messages/customsReleased" } },
    },
    "harbor.cdc.yard.moves.v1": {
      description: "Yard moves; one producer keeps its examples in a shared trait file.",
      servers: ["kafkaProd"],
      publish: {
        operationId: "publishYardMove",
        message: {
          name: "yardMoveCompleted",
          traits: [{ $ref: "./shared/message-traits.yaml#/components/messageTraits/yardMoveSamples" }],
          payload: { type: "object", properties: { moveId: { type: "string" }, from: { type: "string" }, to: { type: "string" } } },
        },
      },
      subscribe: {
        operationId: "receiveYardMove",
        message: {
          name: "yardMoveReplayed",
          payload: { type: "object", properties: { moveId: { type: "string" } } },
          examples: [{ $ref: "./shared/examples.yaml#/yardMoveReplayed" }],
        },
      },
    },
    "harbor.cdc.audit.v1": { $ref: "#/components/channels/auditTrail" },
  },
  components: {
    schemas: {
      TraceHeaders: { type: "object", properties: { traceId: { type: "string" }, visitId: { type: ["string", "null"] } } },
      ContainerEvent: {
        type: "object",
        required: ["containerId", "isoType"],
        properties: {
          containerId: { type: "string", pattern: "^[A-Z]{4}[0-9]{7}$" },
          isoType: { type: "string", maxLength: 4 },
          grossWeightKg: { type: "integer", format: "int32", minimum: 0 },
          sealNumber: { type: ["string", "null"] },
          gate: { type: "string" },
        },
        examples: [{ containerId: "MSCU1234565", isoType: "45R1" }],
      },
      BerthStatus: { type: "object", properties: { berthId: { type: "string" }, occupied: { type: "boolean" }, vessel: { type: ["string", "null"] } }, example: { berthId: "B07", occupied: true } },
      VesselEta: { type: "object", properties: { vesselImo: { type: "string" }, eta: { type: "string", format: "date-time" }, delayMinutes: { type: ["integer", "null"], format: "int32" } } },
      CraneAssignment: {
        type: "record",
        name: "CraneAssignment",
        namespace: "io.harbor.cranes",
        fields: [
          { name: "craneId", type: "string" },
          { name: "vesselVisit", type: "string" },
          { name: "examples", type: ["null", { type: "array", items: "string" }], default: null },
        ],
      },
    },
    messages: {
      containerGatedIn: {
        name: "containerGatedIn",
        payload: { $ref: "#/components/schemas/ContainerEvent" },
        examples: [{ name: "dryVan", payload: { containerId: "CMAU7812230", isoType: "42G1", grossWeightKg: 18400, sealNumber: "SL-7781", gate: "S2" } }],
      },
      craneAssignmentRequested: {
        name: "craneAssignmentRequested",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        contentType: "application/vnd.apache.avro+json",
        payload: { $ref: "#/components/schemas/CraneAssignment" },
        traits: [{ $ref: "#/components/messageTraits/amqpEnvelope" }],
        examples: [{ name: "berthWindow", payload: { craneId: "STS-02", vesselVisit: "CMA-JULES-0912", examples: null } }],
      },
      gateTransaction: {
        oneOf: [
          { name: "gateOpened", payload: { type: "object" }, examples: [{ payload: { gate: "N3" } }] },
          { name: "gateClosed", headers: { type: "object", properties: { gate: { type: "string" } } }, examples: [{ headers: { gate: "N3" } }] },
        ],
      },
      aliasOfGatedIn: { $ref: "#/components/messages/containerGatedIn" },
      externalCustoms: { $ref: "./shared/customs-messages.yaml#/components/messages/customsInspected" },
    },
    channels: {
      auditTrail: {
        description: "Every terminal command, kept for audit.",
        publish: {
          operationId: "publishAuditEntry",
          message: { name: "auditEntryRecorded", payload: { type: "object", properties: { actor: { type: "string" } } }, examples: [{ payload: { actor: "berth-planner" } }] },
        },
      },
    },
    messageTraits: {
      amqpEnvelope: {
        headers: { type: "object", properties: { correlationId: { type: "string" }, replyTo: { type: "string" } } },
        bindings: { amqp: { deliveryMode: 2, priority: 5, bindingVersion: "0.3.0" } },
      },
      etaSamples: { examples: [{ name: "onTime", payload: { vesselImo: "9811000", eta: "2026-10-14T06:00:00Z", delayMinutes: null } }] },
      wsEnvelope: { headers: { type: "object", properties: { sessionId: { type: "string" } } } },
    },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["gate-service"] }, bindingVersion: "0.4.0" } } } },
    correlationIds: { visitId: { description: "Gate visit identifier.", location: "$message.header#/visitId" } },
    securitySchemes: { saslScram: { type: "scramSha512" }, brokerCert: { type: "X509" } },
    "x-example-sets": { customsHolds: [{ name: "inspection", payload: { containerId: "MSCU1234565", reason: "inspection" } }] },
    "x-examples": { berthOccupied: { name: "berthOccupied", payload: { berthId: "B07", occupied: true, vessel: "MAERSK ESSEN" } } },
  },
};
