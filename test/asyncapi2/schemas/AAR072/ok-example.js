const TRACE_ID = "4bf92f35-77b3-4da6-a3ce-929d0e0e4736";
const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:harbor:terminal:event-mesh",
  info: {
    title: "Container Terminal Event Mesh",
    version: "5.1.0",
    description: "Gate, yard, crane, customs and billing events of a container terminal.",
    contact: { name: "Terminal Platform", url: "https://harbor.example.io/platform", email: "platform@harbor.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      url: "kafka-{zone}.harbor.example.io:9093",
      protocol: "kafka-secure",
      variables: { zone: { enum: ["north", "south"], default: "north" } },
      bindings: { kafka: { schemaRegistryUrl: "https://registry.harbor.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    amqpCustoms: { url: "amqps://rabbit.harbor.example.io:5671/customs", protocol: "amqps" },
    mqttCranes: { url: "mqtts://cranes.harbor.example.io:8883", protocol: "secure-mqtt" },
    wsOps: { url: "wss://ops.harbor.example.io/stream", protocol: "wss" },
  },
  channels: {
    "harbor.cdc.containers.gate-in.v1": {
      description: "Containers registered at the inbound gate.",
      servers: ["kafkaProd"],
      publish: {
        operationId: "publishGateIn",
        summary: "Gate registers a container.",
        message: {
          name: "containerGatedIn",
          contentType: "application/json",
          headers: { $ref: "#/components/schemas/TraceHeaders" },
          payload: { $ref: "#/components/schemas/ContainerEvent" },
          examples: [
            {
              name: "reefer",
              summary: "A refrigerated container arriving by truck.",
              headers: { traceId: TRACE_ID, visitId: "VIS-88120" },
              payload: { containerId: "MSCU1234565", isoType: "45R1", grossWeightKg: 27850, sealNumber: null, gate: "N3", arrivedAt: "2026-01-15T10:15:30Z", temperatureC: -18.5 },
            },
            { name: "empty", payload: { containerId: "TGHU8812340", isoType: "22G1", grossWeightKg: 2230, sealNumber: "SL-0091", gate: "N1", arrivedAt: "2026-01-15T11:00:00+01:00" } },
            { name: "headersOnly", headers: { traceId: TRACE_ID } },
            { name: "labelOnly", summary: "Example without payload nor headers." },
          ],
        },
      },
      subscribe: {
        operationId: "receiveGateIn",
        summary: "Yard planner consumes gate events.",
        message: {
          oneOf: [
            { $ref: "#/components/messages/containerGatedIn" },
            {
              name: "containerGatedInAvro",
              schemaFormat: AVRO,
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "ContainerGatedIn",
                namespace: "io.harbor.gate",
                fields: [
                  { name: "containerId", type: "string" },
                  { name: "sealNumber", type: ["null", "string"], default: null },
                  { name: "hazmat", type: ["null", { type: "record", name: "Hazmat", fields: [{ name: "unNumber", type: "string" }, { name: "class", type: { type: "enum", name: "HazmatClass", symbols: ["CLASS_1", "CLASS_3", "CLASS_9"] } }] }], default: null },
                  { name: "previousHazmat", type: ["null", "Hazmat"], default: null },
                  { name: "gatedAt", type: { type: "long", logicalType: "timestamp-millis" } },
                  { name: "visitId", type: { type: "string", logicalType: "uuid" } },
                  { name: "checksum", type: { type: "fixed", name: "Crc32", size: 4 } },
                  { name: "attributes", type: { type: "map", values: ["null", "string", "long"] }, default: {} },
                  { name: "lanes", type: { type: "array", items: "int" }, default: [] },
                ],
              },
              examples: [
                {
                  name: "avroGateIn",
                  payload: {
                    containerId: "MSCU1234565",
                    sealNumber: { string: "SL-0091" },
                    hazmat: { "io.harbor.gate.Hazmat": { unNumber: "UN1203", class: "CLASS_3" } },
                    previousHazmat: null,
                    gatedAt: 1768471200000,
                    visitId: TRACE_ID,
                    checksum: "\u0001\u0002\u0003\u0004",
                    attributes: { lane: "7", weightKg: 27850, note: null },
                    lanes: [1, 2],
                  },
                },
                { name: "minimal", payload: { containerId: "TGHU8812340", gatedAt: 1768471300000, visitId: TRACE_ID, checksum: "abcd" } },
              ],
            },
            {
              name: "containerGateInTombstone",
              summary: "Compaction tombstone emitted when a gate visit is purged.",
              payload: { type: ["object", "null"], properties: { containerId: { type: ["string", "null"] } } },
              examples: [{ name: "tombstone", headers: { visitId: "VIS-88120" }, payload: null }, { name: "keyOnly", payload: { containerId: null } }],
            },
          ],
        },
      },
    },
    "harbor.cmd.yard.moves.v2": {
      description: "Yard move commands for straddle carriers.",
      servers: ["kafkaProd", "wsOps"],
      publish: {
        operationId: "publishYardMove",
        summary: "Planner orders a yard move.",
        message: {
          name: "yardMoveRequested",
          payload: {
            type: "object",
            required: ["moveId", "from", "to"],
            additionalProperties: false,
            properties: {
              moveId: { type: "string", format: "uuid" },
              from: { $ref: "#/components/schemas/YardSlot" },
              to: { $ref: "#/components/schemas/YardSlot" },
              priority: { type: "integer", minimum: 1, maximum: 5, default: 3 },
              equipment: { type: "array", items: [{ type: "string" }, { type: "integer" }], additionalItems: false },
              operator: { type: "string", format: "email" },
              instructions: { type: "string", maxLength: 280 },
            },
            if: { properties: { priority: { const: 1 } }, required: ["priority"] },
            then: { required: ["operator"] },
          },
          examples: [
            {
              name: "urgentMove",
              payload: { moveId: TRACE_ID, from: { block: "A", row: 12, tier: 2 }, to: { block: "C", row: 4, tier: 1 }, priority: 1, equipment: ["SC-07", 3], operator: "ops@harbor.example.io" },
            },
            { name: "routineMove", payload: { moveId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", from: { block: "B", row: 1, tier: 1 }, to: { block: "B", row: 2, tier: 1 }, instructions: "Move before the 14:00 vessel window." } },
          ],
        },
      },
      subscribe: {
        operationId: "receiveYardMoveStatus",
        summary: "Planner tracks move statuses.",
        message: {
          name: "yardMoveStatus",
          schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
          payload: {
            type: "object",
            required: ["moveId", "status"],
            properties: {
              moveId: { type: "string" },
              status: { type: "string", enum: ["QUEUED", "RUNNING", "DONE", "FAILED"] },
              failureReason: { type: "string", nullable: true },
              completedAt: { type: "string", format: "date-time", nullable: true },
              durationSeconds: { type: "integer", minimum: 0, exclusiveMinimum: true, nullable: true },
            },
          },
          examples: [
            { name: "done", payload: { moveId: "MV-1", status: "DONE", failureReason: null, completedAt: "2026-01-15T12:00:00Z", durationSeconds: 420 } },
            { name: "queued", payload: { moveId: "MV-2", status: "QUEUED", completedAt: null, durationSeconds: null } },
          ],
        },
      },
    },
    "harbor/cranes/{craneId}/telemetry": {
      description: "Quay crane telemetry over MQTT.",
      servers: ["mqttCranes"],
      parameters: { craneId: { description: "Quay crane identifier.", schema: { type: "string", pattern: "^QC-\\d{2}$" } } },
      publish: {
        operationId: "publishCraneTelemetry",
        summary: "Crane PLC publishes telemetry.",
        message: {
          name: "craneTelemetry",
          traits: [{ $ref: "#/components/messageTraits/plcHeaders" }, { $ref: "#/components/messageTraits/telemetryExamples" }],
          payload: {
            type: "object",
            properties: {
              loadTons: { type: "number", minimum: 0, maximum: 65 },
              spreader: { type: "string", enum: ["20FT", "40FT", "TWIN"] },
              alarms: { type: "array", uniqueItems: true, items: { type: "string", pattern: "^ALM-[0-9]{3}$" } },
            },
          },
        },
      },
      subscribe: {
        operationId: "receiveCraneCommand",
        summary: "Crane receives remote commands.",
        message: {
          name: "craneCommand",
          headers: { type: "object", required: ["operator"], properties: { operator: { type: "string" }, sequence: { type: "integer", minimum: 0 } } },
          payload: {
            oneOf: [
              { type: "object", required: ["command"], properties: { command: { const: "STOP" } } },
              { type: "object", required: ["command", "targetBay"], properties: { command: { const: "MOVE" }, targetBay: { type: "integer", minimum: 1 } } },
            ],
          },
          examples: [
            { name: "stop", headers: { operator: "op-12", sequence: 1 }, payload: { command: "STOP" } },
            { name: "move", headers: { operator: "op-12", sequence: 2 }, payload: { command: "MOVE", targetBay: 14 } },
          ],
        },
      },
    },
    "harbor.sys.customs.declarations.v1": {
      description: "Customs declarations exchanged with the broker.",
      servers: ["amqpCustoms"],
      publish: {
        operationId: "publishDeclaration",
        summary: "Broker files a declaration.",
        message: {
          name: "declarationFiled",
          schemaFormat: "application/schema+json;version=draft-07",
          payload: {
            type: "object",
            required: ["declarationId", "lines"],
            properties: {
              declarationId: { type: "string", pattern: "^[0-9]{2}[A-Z]{2}[A-Z0-9]{14}$" },
              lines: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  required: ["hsCode", "value"],
                  properties: { hsCode: { type: "string", pattern: "^[0-9]{6,10}$" }, value: { $ref: "#/components/schemas/Money" }, origin: { type: "string", minLength: 2, maxLength: 2 } },
                  dependencies: { preference: ["origin"] },
                },
              },
              attachments: { type: "object", propertyNames: { pattern: "^[a-z-]+$" }, additionalProperties: { type: "string", format: "uri" } },
            },
          },
          examples: [
            {
              name: "standard",
              payload: {
                declarationId: "26ES28040011234567",
                lines: [
                  { hsCode: "84713000", value: { amount: 1250.4, currency: "EUR" }, origin: "CN", preference: "GSP" },
                  { hsCode: "620342", value: { amount: 99.99, currency: "USD" } },
                ],
                attachments: { invoice: "https://docs.harbor.example.io/inv/77.pdf", "packing-list": "https://docs.harbor.example.io/pl/77.pdf" },
              },
            },
          ],
        },
      },
      subscribe: {
        operationId: "receiveCustomsDecision",
        summary: "Terminal receives customs decisions.",
        message: {
          name: "customsDecision",
          payload: { $ref: "#/components/schemas/CustomsDecisionAlias" },
          examples: { $ref: "#/components/x-example-sets/customsDecisions" },
        },
      },
    },
    "harbor.cdc.partners.v1": {
      description: "Events relayed from partner terminals whose schemas live elsewhere.",
      servers: ["kafkaProd"],
      publish: {
        operationId: "publishPartnerEvent",
        summary: "Partner gateway relays events.",
        message: { name: "partnerEvent", payload: { $ref: "./schemas/partner-event.json" }, examples: [{ payload: { anything: "goes" } }, { payload: { $ref: "./examples/partner.json" } }] },
      },
      subscribe: {
        operationId: "receivePartnerProto",
        summary: "Partner events in protobuf.",
        message: { name: "partnerProto", schemaFormat: "application/vnd.google.protobuf;version=3", payload: "message P { string id = 1; }", examples: [{ payload: { id: 1 } }] },
      },
    },
  },
  components: {
    channels: {
      "harbor.sys.billing.v1": {
        description: "Terminal handling charges.",
        subscribe: {
          operationId: "receiveCharge",
          summary: "Billing consumes charges.",
          message: {
            name: "chargeRaised",
            schemaFormat: "application/vnd.apache.avro+yaml;version=1.9.0",
            payload: { $ref: "#/components/schemas/AvroCharge" },
            examples: [{ payload: { chargeId: "CH-1", amount: { amount: 120.5, currency: "EUR" }, lines: [{ code: "THC", units: 2 }] } }],
          },
        },
      },
    },
    messages: {
      containerGatedIn: {
        name: "containerGatedIn",
        headers: { $ref: "#/components/schemas/TraceHeaders" },
        payload: { $ref: "#/components/schemas/ContainerEvent" },
        examples: [{ payload: { containerId: "MSCU1234565", isoType: "45R1", grossWeightKg: 27850, gate: "N3", arrivedAt: "2026-01-15T10:15:30Z" } }],
      },
      vesselBerthed: {
        name: "vesselBerthed",
        payload: {
          type: "object",
          required: ["imo", "berth"],
          properties: {
            imo: { type: "string", pattern: "^IMO[0-9]{7}$" },
            berth: { type: "string" },
            eta: { type: "string", format: "date-time" },
            agent: { anyOf: [{ type: "string", format: "email" }, { type: "object", required: ["name"], properties: { name: { type: "string" } } }] },
            draftMeters: { type: "number", exclusiveMinimum: 0, maximum: 25 },
            callSign: { type: "string", minLength: 4, maxLength: 7 },
            notes: { not: { type: "number" } },
          },
          allOf: [{ required: ["imo"] }, { properties: { berth: { pattern: "^B[0-9]+$" } } }],
        },
        examples: [
          { payload: { imo: "IMO9321483", berth: "B7", eta: "2026-02-01T06:00:00Z", agent: "agency@ports.example.io", draftMeters: 14.2, callSign: "9HA2" } },
          { payload: { imo: "IMO9811000", berth: "B12", agent: { name: "Maritime Agency" }, notes: "Pilot on board." } },
        ],
      },
      gateHeartbeat: {
        name: "gateHeartbeat",
        headers: { type: "object", required: ["gate"], properties: { gate: { type: "string" }, uptimeSeconds: { type: "integer", format: "int64" } } },
        examples: [{ headers: { gate: "N3", uptimeSeconds: 86400 } }, { headers: { gate: "S1" }, payload: "anything without a payload schema" }],
      },
      "x-legacy-edi": { name: "legacyEdi", contentType: "text/plain", payload: { type: "string", pattern: "^UNB\\+" }, examples: [{ payload: "UNB+UNOC:3+TERMINAL+CARRIER" }] },
    },
    schemas: {
      TraceHeaders: { type: "object", required: ["traceId"], properties: { traceId: { type: "string", format: "uuid" }, visitId: { type: "string", pattern: "^VIS-[0-9]+$" } } },
      ContainerEvent: {
        type: "object",
        required: ["containerId", "isoType", "grossWeightKg"],
        properties: {
          containerId: { type: "string", pattern: "^[A-Z]{4}[0-9]{7}$" },
          isoType: { type: "string", enum: ["22G1", "42G1", "45G1", "45R1"] },
          grossWeightKg: { type: "integer", minimum: 0, maximum: 40000 },
          sealNumber: { type: ["string", "null"] },
          gate: { type: "string" },
          arrivedAt: { type: "string", format: "date-time" },
          temperatureC: { type: "number", minimum: -40, maximum: 40 },
        },
      },
      YardSlot: { type: "object", required: ["block", "row", "tier"], properties: { block: { type: "string", pattern: "^[A-Z]$" }, row: { type: "integer", minimum: 1 }, tier: { type: "integer", minimum: 1, maximum: 6 } } },
      Money: { type: "object", required: ["amount", "currency"], properties: { amount: { type: "number", multipleOf: 0.01 }, currency: { type: "string", enum: ["EUR", "USD", "CNY"] } } },
      CustomsDecision: { type: "object", required: ["declarationId", "decision"], properties: { declarationId: { type: "string" }, decision: { type: "string", enum: ["RELEASED", "HELD", "INSPECT"] }, decidedAt: { type: "string", format: "date-time" } } },
      CustomsDecisionAlias: { $ref: "#/components/schemas/CustomsDecision" },
      AvroCharge: {
        type: "record",
        name: "Charge",
        namespace: "io.harbor.billing",
        fields: [
          { name: "chargeId", type: "string" },
          { name: "amount", type: { type: "record", name: "Money", fields: [{ name: "amount", type: "double" }, { name: "currency", type: "string" }] } },
          { name: "lines", type: { type: "array", items: { type: "record", name: "ChargeLine", fields: [{ name: "code", type: "string" }, { name: "units", type: "int" }] } } },
        ],
      },
    },
    messageTraits: {
      plcHeaders: { headers: { type: "object", required: ["plcId"], properties: { plcId: { type: "string" }, firmware: { type: "string" } } } },
      telemetryExamples: {
        examples: [
          { name: "lifting", headers: { plcId: "PLC-QC-04", firmware: "7.1.2" }, payload: { loadTons: 32.4, spreader: "40FT", alarms: [] } },
          { name: "alarm", headers: { plcId: "PLC-QC-04" }, payload: { loadTons: 0, spreader: "TWIN", alarms: ["ALM-101", "ALM-204"] } },
        ],
      },
    },
    "x-example-sets": {
      customsDecisions: [
        { name: "released", payload: { declarationId: "26ES28040011234567", decision: "RELEASED", decidedAt: "2026-01-16T08:00:00Z" } },
        { $ref: "#/components/x-examples/heldDecision" },
      ],
    },
    "x-examples": { heldDecision: { name: "held", payload: { declarationId: "26ES28040011234568", decision: "HELD" } } },
  },
};
