const docs = (topic) => ({ description: `${topic} runbook.`, url: `https://docs.voltgrid.example.com/${topic}` });
const tag = (name, description, owner = "grid-platform") => ({ name, description, externalDocs: docs(name), "x-owner": owner });
const ref = (name) => ({ $ref: `#/components/tags/${name}` });

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:voltgrid:charging-network",
  info: {
    title: "VoltGrid Charging Network",
    version: "2.3.0",
    description: "Charge point telemetry, session billing and operator alerts of the VoltGrid public charging network.",
    contact: { name: "Charging Platform", url: "https://developer.voltgrid.example.com", email: "charging@voltgrid.example.com" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [ref("charging"), tag("e-mobility", "Public electric vehicle charging."), ref("realtime")],
    externalDocs: { url: "https://docs.voltgrid.example.com" },
  },
  defaultContentType: "application/json",
  servers: {
    mqttChargePoints: {
      host: "mqtt.voltgrid.example.com:8883",
      protocol: "secure-mqtt",
      description: "Charge points publish OCPP-like telemetry here.",
      tags: [tag("charge-points", "Field devices of the charging network."), ref("production")],
      security: [{ $ref: "#/components/securitySchemes/chargePointCertificate" }],
      bindings: { mqtt: { clientId: "voltgrid-ingest", cleanSession: false, keepAlive: 120, bindingVersion: "0.2.0" } },
    },
    kafkaBilling: {
      host: "kafka.voltgrid.example.com:9093",
      protocol: "kafka-secure",
      tags: [ref("production"), tag("billing-backbone", "Kafka cluster of the billing domain.", "billing")],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.voltgrid.example.com", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    amqpRoaming: { host: "rabbit.voltgrid.example.com:5671", protocol: "amqps", tags: [tag("roaming", "Roaming hubs of partner operators.")] },
    wsOperators: { $ref: "#/components/servers/wsOperators" },
  },
  channels: {
    connectorStatus: {
      address: "chargepoints/{chargePointId}/connectors/{connectorId}/status",
      title: "Connector status",
      parameters: {
        chargePointId: { description: "Charge point identifier.", location: "$message.payload#/chargePointId" },
        connectorId: { enum: ["1", "2", "3"], default: "1", description: "Connector number." },
      },
      tags: [ref("realtime"), tag("connectors", "Plug status of each connector.")],
      messages: {
        statusChanged: {
          name: "statusChanged",
          title: "Status changed",
          tags: [tag("status", "Connector availability changes.")],
          traits: [{ $ref: "#/components/messageTraits/chargePointHeaders" }, { tags: [tag("inline-message-trait", "Trait declared next to the message.")] }],
          payload: {
            type: "object",
            properties: {
              chargePointId: { type: "string" },
              status: { type: "string", enum: ["Available", "Charging", "Faulted"] },
              tags: { type: ["array", "null"], items: { type: "string" }, examples: [["Not A Tag"]] },
            },
          },
          correlationId: { description: "Status request correlation.", location: "$message.header#/correlationId" },
          examples: [{ name: "charging", payload: { chargePointId: "VG-MAD-0042", status: "Charging", tags: ["fast"] } }],
        },
        meterValues: { $ref: "#/components/messages/meterValues" },
      },
      servers: [{ $ref: "#/servers/mqttChargePoints" }],
      bindings: { mqtt: { bindingVersion: "0.2.0" } },
    },
    sessionBilling: {
      address: "voltgrid.cdc.billing.session-closed.v1",
      title: "Session billing",
      tags: [tag("billing", "Charging session invoicing.", "billing")],
      messages: {
        sessionClosed: {
          name: "sessionClosed",
          title: "Session closed",
          contentType: "application/vnd.apache.avro+json",
          tags: [ref("charging"), tag("avro", "Avro encoded payloads.", "billing")],
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "SessionClosed",
              namespace: "com.voltgrid.billing",
              fields: [
                { name: "sessionId", type: "string" },
                { name: "energyKwh", type: "double" },
                { name: "tags", type: ["null", { type: "array", items: { type: "record", name: "Tag", fields: [{ name: "name", type: "string" }, { name: "description", type: ["null", "string"], default: null }] } }], default: null },
              ],
            },
          },
        },
      },
      servers: [{ $ref: "#/servers/kafkaBilling" }],
      bindings: { kafka: { topic: "voltgrid.cdc.billing.session-closed.v1", partitions: 12, replicas: 3, bindingVersion: "0.5.0" } },
    },
    operatorAlerts: {
      address: null,
      title: "Operator alerts",
      description: "Dynamic per-operator alert stream.",
      tags: [ref("realtime")],
      messages: { alertRaised: { $ref: "#/components/messages/alertRaised" } },
      servers: [{ $ref: "#/servers/wsOperators" }],
    },
    roamingAuthorizations: { $ref: "#/components/channels/roamingAuthorizations" },
  },
  operations: {
    publishStatus: {
      action: "send",
      title: "Publish connector status",
      channel: { $ref: "#/channels/connectorStatus" },
      messages: [{ $ref: "#/channels/connectorStatus/messages/statusChanged" }, { $ref: "#/channels/connectorStatus/messages/meterValues" }],
      tags: [ref("charging"), tag("producers", "Charge point producers.")],
      traits: [{ $ref: "#/components/operationTraits/mqttAtLeastOnce" }, { tags: [tag("inline-operation-trait", "Trait declared next to the operation.")] }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/operatorAlerts" },
        messages: [{ $ref: "#/channels/operatorAlerts/messages/alertRaised" }],
      },
    },
    receiveSessionClosed: {
      action: "receive",
      channel: { $ref: "#/channels/sessionBilling" },
      messages: [{ $ref: "#/channels/sessionBilling/messages/sessionClosed" }],
      tags: [tag("consumers", "Billing consumers.", "billing")],
      bindings: { kafka: { groupId: { type: "string", enum: ["billing-service"] }, bindingVersion: "0.5.0" } },
    },
    authorizeRoaming: { $ref: "#/components/operations/authorizeRoaming" },
  },
  components: {
    servers: {
      wsOperators: { host: "ws.voltgrid.example.com", pathname: "/operators", protocol: "wss", tags: [tag("operator-console", "Operator console push gateway.")] },
    },
    channels: {
      roamingAuthorizations: {
        address: "roaming.authorizations",
        tags: [tag("authorizations", "Roaming authorization requests.")],
        messages: { authorizationRequested: { name: "authorizationRequested", tags: [ref("realtime")], payload: { type: "object", properties: { tokenUid: { type: "string" } } } } },
        bindings: { amqp: { is: "routingKey", exchange: { name: "roaming", type: "topic" }, bindingVersion: "0.3.0" } },
      },
    },
    operations: {
      authorizeRoaming: {
        action: "send",
        channel: { $ref: "#/components/channels/roamingAuthorizations" },
        tags: [tag("roaming-authorizer", "Sends roaming authorizations.")],
        reply: { $ref: "#/components/replies/authorizationReply" },
      },
    },
    replies: {
      authorizationReply: { channel: { $ref: "#/channels/operatorAlerts" }, messages: [{ $ref: "#/channels/operatorAlerts/messages/alertRaised" }] },
    },
    messages: {
      meterValues: {
        name: "meterValues",
        title: "Meter values",
        tags: [tag("metering", "Energy meter samples.")],
        traits: [{ $ref: "#/components/messageTraits/chargePointHeaders" }],
        payload: { $ref: "#/components/schemas/MeterValues" },
      },
      alertRaised: { name: "alertRaised", title: "Alert raised", tags: [ref("realtime"), tag("alerts", "Operator alerts.")], payload: { type: "object", properties: { severity: { type: "string" } } } },
    },
    schemas: {
      MeterValues: {
        type: "object",
        properties: {
          energyWh: { type: "integer", format: "int64", minimum: 0 },
          tags: { type: ["array", "null"], items: { $ref: "#/components/schemas/Tag" } },
        },
      },
      Tag: { type: "object", properties: { name: { type: "string" }, description: { type: ["string", "null"] } } },
    },
    operationTraits: {
      mqttAtLeastOnce: { tags: [tag("qos-1", "At least once delivery.")], bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } } },
    },
    messageTraits: {
      chargePointHeaders: { headers: { type: "object", properties: { correlationId: { type: "string" } } }, tags: [tag("headers", "Headers set by the charge points.")] },
    },
    tags: {
      charging: tag("charging", "Charging sessions and connectors."),
      realtime: tag("realtime", "Low-latency streams."),
      production: tag("production", "Production environment."),
      productionAlias: ref("production"),
    },
    securitySchemes: { chargePointCertificate: { type: "X509", description: "Client certificate of the charge point." } },
    "x-unreferenced-tags": [{ name: "draft" }, "not-a-tag", null],
  },
};
