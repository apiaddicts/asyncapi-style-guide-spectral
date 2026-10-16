module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:contoso:charging:network",
  info: {
    title: "Contoso Charging Network",
    version: "2.4.0",
    description: "MQTT, AMQP, Kafka and WebSocket events of the Contoso EV charging network. Every property name is camelCase.",
    tags: [{ name: "charging" }],
  },
  defaultContentType: "application/json",
  servers: {
    mqtt: { host: "mqtt.charging.contoso.example.com:8883", protocol: "secure-mqtt", variables: { site_code: { default: "mad" } } },
    amqp: { host: "broker.charging.contoso.example.com", protocol: "amqps", pathname: "/vhost-charging" },
    kafka: { host: "kafka.charging.contoso.example.com:9093", protocol: "kafka-secure" },
    live: { host: "live.charging.contoso.example.com", pathname: "/feed", protocol: "wss" },
  },
  channels: {
    chargePointStatus: {
      address: "chargepoints/{chargePointId}/status",
      description: "Status notifications sent by every charge point.",
      parameters: { chargePointId: { description: "Charge point identifier.", examples: ["CP-0001"] } },
      messages: {
        statusNotified: {
          name: "statusNotified",
          headers: { $ref: "#/components/schemas/OcppHeaders" },
          payload: {
            type: "object",
            required: ["connectorId", "status"],
            properties: {
              connectorId: { type: "integer", minimum: 0 },
              status: { type: "string", enum: ["Available", "Charging", "SUSPENDED_EV"] },
              errorCode: { type: ["string", "null"] },
              meterValues: { type: "array", items: { $ref: "#/components/schemas/MeterValue" } },
            },
            examples: [{ connectorId: 1, status: "Available", error_code: null }],
          },
          bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } },
          examples: [{ name: "available", payload: { connectorId: 1, status: "Available", Meter_Values: [] } }],
          traits: [{ $ref: "#/components/messageTraits/ocppEnvelope" }, [{ $ref: "#/components/messageTraits/tracing" }, { environment: "prod" }]],
        },
      },
    },
    chargingSessions: {
      address: "charging.cdc.sessions.v1",
      description: "Charging sessions encoded with Avro.",
      bindings: { kafka: { topic: "charging.cdc.sessions.v1", partitions: 24, bindingVersion: "0.5.0" } },
      messages: {
        sessionStarted: {
          name: "sessionStarted",
          payload: {
            schemaFormat: "application/vnd.apache.avro+json;version=1.9.0",
            schema: {
              type: "record",
              name: "SessionStarted",
              namespace: "com.contoso.charging.Sessions_V1",
              fields: [
                { name: "sessionId", type: "string" },
                { name: "startedAt", type: { type: "long", logicalType: "timestamp-millis" } },
                { name: "tariff", type: ["null", { type: "record", name: "Tariff_Plan", fields: [{ name: "tariffCode", type: "string" }, { name: "pricePerKwh", type: "double" }] }], default: null },
                { name: "connectorType", type: { type: "enum", name: "ConnectorType", symbols: ["CCS_2", "CHADEMO", "type2"] } },
                { name: "readings", type: { type: "array", items: { type: "record", name: "Reading", fields: [{ name: "energyWh", type: "long" }] } } },
              ],
            },
          },
          bindings: { kafka: { key: { type: "object", properties: { session_id: { type: "string" } } }, bindingVersion: "0.5.0" } },
        },
        sessionStopped: { $ref: "#/components/messages/sessionStopped" },
      },
    },
    driverNotifications: {
      address: null,
      description: "Notifications pushed to the driver application; the address is negotiated at runtime.",
      bindings: { ws: { headers: { type: "object", properties: { "X-Driver-Token": { type: "string" } } }, query: { type: "object", properties: { app_version: { type: "string" } } }, bindingVersion: "0.1.0" } },
      messages: {
        chargingCompleted: {
          name: "chargingCompleted",
          payload: {
            schemaFormat: "application/vnd.oai.openapi+json;version=3.0.0",
            schema: { type: "object", nullable: true, discriminator: { propertyName: "notification_type" }, properties: { sessionId: { type: "string" }, energyKwh: { type: "number", nullable: true } } },
          },
        },
        legacyReceipt: {
          name: "legacyReceipt",
          payload: { schemaFormat: "application/raml+yaml;version=1.0", schema: { type: "object", properties: { receipt_number: "string", "vat_amount?": "number" } } },
        },
        protoReceipt: {
          name: "protoReceipt",
          payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "message Receipt { string receipt_number = 1; }" },
        },
      },
    },
    fleetCommands: { $ref: "#/components/channels/fleetCommands" },
  },
  operations: {
    receiveStatus: {
      action: "receive",
      channel: { $ref: "#/channels/chargePointStatus" },
      messages: [{ $ref: "#/channels/chargePointStatus/messages/statusNotified" }],
      bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } },
    },
    publishSessions: {
      action: "send",
      channel: { $ref: "#/channels/chargingSessions" },
      messages: [{ $ref: "#/channels/chargingSessions/messages/sessionStarted" }, { $ref: "#/channels/chargingSessions/messages/sessionStopped" }],
      reply: { $ref: "#/components/replies/sessionAck" },
    },
    notifyDriver: { action: "send", channel: { $ref: "#/channels/driverNotifications" }, messages: [{ $ref: "#/channels/driverNotifications/messages/chargingCompleted" }] },
  },
  components: {
    schemas: {
      OcppHeaders: { type: "object", properties: { messageTypeId: { type: "integer" }, uniqueId: { type: "string" } } },
      MeterValue: {
        schemaFormat: "application/schema+yaml;version=draft-07",
        schema: { type: "object", properties: { timestamp: { type: "string", format: "date-time" }, sampledValue: { type: "number" } }, additionalProperties: false },
      },
      Ack: { type: "object", properties: { accepted: { type: "boolean" }, reasonCode: { type: "string" } } },
    },
    channels: {
      fleetCommands: {
        address: "fleet.cmd.chargepoints.v1",
        messages: { resetRequested: { name: "resetRequested", payload: { type: "object", properties: { resetType: { type: "string", enum: ["SOFT", "HARD_RESET"] } } } } },
      },
      sessionAcks: { address: "charging.sys.session-acks.v1", messages: { sessionAcked: { name: "sessionAcked", payload: { $ref: "#/components/schemas/Ack" } } } },
    },
    messages: {
      sessionStopped: {
        name: "sessionStopped",
        payload: { type: "object", properties: { sessionId: { type: "string" }, stoppedAt: { type: "string" }, stopReason: { type: "string" } } },
        correlationId: { location: "$message.header#/correlation_id" },
      },
    },
    messageTraits: {
      ocppEnvelope: { headers: { type: "object", properties: { ocppVersion: { type: "string" }, chargeBoxSerial: { type: "string" } } } },
      tracing: { headers: { schemaFormat: "application/vnd.aai.asyncapi+yaml;version=3.0.0", schema: { type: "object", properties: { traceParent: { type: "string" } } } } },
    },
    replies: { sessionAck: { channel: { $ref: "#/components/channels/sessionAcks" }, messages: [{ $ref: "#/components/channels/sessionAcks/messages/sessionAcked" }] } },
    parameters: { siteCode: { description: "Site code.", enum: ["mad_01", "BCN-02"] } },
    "x-legacy-schemas": { LegacyStatus: { type: "object", properties: { charge_point_id: { type: "string" } } } },
  },
};
