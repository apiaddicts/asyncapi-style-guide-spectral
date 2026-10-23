module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:contoso:energy:grid",
  info: {
    title: "Contoso Energy Grid Telemetry",
    version: "4.1.0",
    description: "Kafka, AMQP, MQTT and WebSocket events of the Contoso grid. Every property name is camelCase.",
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafka: {
      url: "kafka.grid.contoso.example.com:9093",
      protocol: "kafka-secure",
      variables: { cluster_id: { default: "grid-eu-1" } },
      bindings: { kafka: { schemaRegistryUrl: "https://registry.grid.contoso.example.com", bindingVersion: "0.4.0" } },
    },
    broker: { url: "amqps://broker.grid.contoso.example.com", protocol: "amqps" },
    meters: { url: "mqtts://meters.grid.contoso.example.com", protocol: "secure-mqtt" },
    dashboard: { url: "wss://live.grid.contoso.example.com", protocol: "wss" },
  },
  channels: {
    "grid.cdc.meters.readings.v2": {
      description: "Readings sent by smart meters every fifteen minutes.",
      bindings: { kafka: { topic: "grid.cdc.meters.readings.v2", partitions: 48, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishMeterReading",
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        bindings: { kafka: { clientId: { type: "object", properties: { client_id: { type: "string" } } }, bindingVersion: "0.4.0" } },
        message: {
          messageId: "meterReadingRecorded",
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          contentType: "application/vnd.apache.avro+json",
          correlationId: { location: "$message.header#/correlation_id" },
          headers: {
            type: "object",
            required: ["correlationId"],
            properties: { correlationId: { type: "string", format: "uuid" }, sourceSystem: { type: "string" } },
          },
          payload: {
            type: "record",
            name: "MeterReading",
            namespace: "com.contoso.grid.meters",
            doc: "Uses the meter_id of the device registry.",
            fields: [
              { name: "meterId", type: "string" },
              { name: "readAt", type: { type: "long", logicalType: "timestamp-millis" } },
              { name: "activeEnergyKwh", type: "double" },
              { name: "quality", type: { type: "enum", name: "Reading_Quality", symbols: ["MEASURED", "ESTIMATED_BY_RULE"] } },
              {
                name: "phaseValues",
                type: { type: "array", items: { type: "record", name: "PhaseValue", fields: [{ name: "phase", type: "string" }, { name: "voltageV", type: "double" }] } },
              },
              {
                name: "tamperAlert",
                type: ["null", { type: "record", name: "Tamper_Alert", fields: [{ name: "detectedAt", type: "long" }, { name: "sensorCode", type: "string" }] }],
                default: null,
              },
              { name: "labels", type: { type: "map", values: "string" }, default: { site_code: "MAD" } },
            ],
          },
          bindings: { kafka: { key: { type: "object", properties: { meter_id: { type: "string" } } }, bindingVersion: "0.4.0" } },
          examples: [{ name: "reading", headers: { correlation_id: "1" }, payload: { meterId: "M-1", Phase_Values: [] } }],
          traits: [{ $ref: "#/components/messageTraits/tracing" }],
        },
      },
    },
    "grid.cmd.outages.reported.v1": {
      description: "Outages reported by the field crews.",
      subscribe: {
        operationId: "receiveOutageReported",
        message: {
          oneOf: [
            { $ref: "#/components/messages/outageReported" },
            {
              messageId: "outageCleared",
              schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
              payload: {
                type: "object",
                nullable: true,
                discriminator: { propertyName: "clearance_type", mapping: { manual_clearance: "#/components/schemas/Crew" } },
                properties: {
                  outageId: { type: "string" },
                  clearedAt: { type: "string", format: "date-time", nullable: true },
                  crew: { $ref: "#/components/schemas/Crew" },
                },
              },
            },
            {
              messageId: "outageEscalated",
              schemaFormat: "application/schema+json;version=draft-07",
              payload: {
                $defs: { Escalation: { type: "object", properties: { escalatedTo: { type: "string" }, slaMinutes: { type: "integer" } } } },
                type: "object",
                properties: { escalation: { $ref: "#/components/schemas/Crew" }, notes: { type: ["string", "null"] } },
                patternProperties: { "^ext_[a-z]+$": { type: "string" } },
                additionalProperties: false,
              },
            },
          ],
        },
      },
    },
    "meters/{meterId}/commands": {
      description: "Commands pushed to a meter over MQTT.",
      parameters: { meterId: { description: "Meter identifier.", schema: { type: "string", pattern: "^M-[0-9]+$" } } },
      publish: {
        operationId: "sendMeterCommand",
        bindings: { mqtt: { qos: 2, retain: false, bindingVersion: "0.2.0" } },
        message: {
          messageId: "meterCommandIssued",
          headers: { $ref: "#/components/schemas/CommandHeaders" },
          payload: {
            type: "object",
            properties: {
              commandId: { type: "string" },
              command: { type: "string", enum: ["DISCONNECT_SUPPLY", "reconnect_supply"] },
              parameters: { type: "object", additionalProperties: { type: "string" } },
            },
            example: { commandId: "c-1", command_args: {} },
            default: { commandId: "c-0", Default_Command: true },
          },
        },
      },
    },
    "grid.sys.billing.export.v1": {
      description: "Billing exports, still described with legacy schema languages.",
      publish: {
        operationId: "publishBillingExport",
        message: {
          oneOf: [
            {
              messageId: "billingExportRaml",
              schemaFormat: "application/raml+yaml;version=1.0",
              payload: { type: "object", properties: { invoice_number: "string", "due_date?": "date-only" } },
            },
            {
              messageId: "billingExportProto",
              schemaFormat: "application/vnd.google.protobuf;version=3",
              payload: "message BillingExport { string invoice_number = 1; int64 Total_Cents = 2; }",
            },
          ],
        },
      },
    },
    "dashboard.live": {
      description: "Live dashboard feed over WebSockets.",
      bindings: {
        ws: {
          method: "GET",
          query: { type: "object", properties: { api_key: { type: "string" } } },
          headers: { type: "object", properties: { "X-Dashboard-Token": { type: "string" } } },
          bindingVersion: "0.1.0",
        },
      },
      subscribe: {
        operationId: "receiveDashboardFrame",
        message: { $ref: "#/components/messages/dashboardFrame" },
      },
    },
  },
  components: {
    schemas: {
      Crew: {
        type: "object",
        required: ["crew_id"],
        properties: { crewId: { type: "string" }, members: { type: "array", items: { $ref: "#/components/schemas/Technician" } } },
      },
      Technician: { type: "object", properties: { employeeId: { type: "string" }, displayName: { type: "string" }, certifiedUntil: { type: "string", format: "date" } } },
      CommandHeaders: { type: "object", properties: { issuedBy: { type: "string" }, expiresAt: { type: "string", format: "date-time" } } },
      Substation: {
        type: "record",
        name: "Substation",
        namespace: "com.contoso.grid.assets",
        fields: [{ name: "substationCode", type: "string" }, { name: "capacityMva", type: "double" }],
      },
    },
    messages: {
      outageReported: {
        messageId: "outageReported",
        payload: {
          type: "object",
          properties: { outageId: { type: "string" }, affectedCustomers: { type: "integer" }, location: { type: "object", properties: { latitude: {}, longitude: {} } } },
        },
        "x-legacy-payload": { type: "object", properties: { outage_id: { type: "string" } } },
      },
      dashboardFrame: {
        messageId: "dashboardFrame",
        payload: { type: "object", properties: { frameId: { type: "integer" }, loadMw: { type: "number" }, alerts: { type: "array", items: { type: "string" } } } },
      },
    },
    messageTraits: {
      tracing: { headers: { type: "object", properties: { traceParent: { type: "string" }, traceState: { type: "string" } } } },
    },
    operationTraits: {
      kafkaProducer: { bindings: { kafka: { clientId: { type: "object", properties: { producer_id: { type: "string" } } }, bindingVersion: "0.4.0" } } },
    },
    "x-legacy-schemas": { LegacyReading: { type: "object", properties: { meter_id: { type: "string" } } } },
  },
};
