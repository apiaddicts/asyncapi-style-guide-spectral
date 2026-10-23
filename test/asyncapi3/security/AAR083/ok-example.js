module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:manufacturing:plant-events",
  info: {
    title: "Quality Smart Factory Events",
    version: "4.0.0",
    description: "Machine telemetry, work orders, quality alerts and SCADA feeds of the manufacturing plants.",
    termsOfService: "https://supplier.example.org/terms",
    contact: { name: "Plant Integration", email: "plant-integration@quality.es", url: "https://plants.example.org/support" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ name: "manufacturing", externalDocs: { url: "https://wiki.example.org/plants" } }],
    externalDocs: { url: "https://docs.example.org/plant-events" },
  },
  defaultContentType: "application/json",
  servers: {
    plantKafka: {
      host: "kafka-plant.quality.es:{port}",
      protocol: "kafka-secure",
      title: "Plant Kafka",
      summary: "Production cluster of the plants.",
      variables: { port: { enum: ["9092", "9093"], default: "9093", examples: ["localhost"] } },
      security: [{ $ref: "#/components/securitySchemes/plantOauth" }, { $ref: "#/components/securitySchemes/saslScram" }],
      tags: [{ name: "kafka", externalDocs: { url: "https://kafka.example.org/docs" } }],
      externalDocs: { url: "https://confluent.example.org/runbook" },
      bindings: { kafka: { schemaRegistryUrl: "https://psrc-77.eu-west-1.aws.confluent.cloud", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    opcGatewayMqtt: {
      host: "mqtt-plant.quality.es:8883",
      pathname: "/lines/{line}",
      protocol: "secure-mqtt",
      variables: { line: { enum: ["press", "paint", "assembly"], default: "press" } },
      bindings: { mqtt: { clientId: "opc-gateway", cleanSession: false, keepAlive: 30, lastWill: { topic: "gateways/localhost/status", qos: 1, message: "offline", retain: true }, bindingVersion: "0.2.0" } },
    },
    mesAmqp: { host: "rabbit-mes.quality.es:5671", pathname: "/%2Fmes", protocol: "amqps" },
    scadaWs: { host: "scada.quality.es", pathname: "/realtime", protocol: "wss" },
    historianHttps: { host: "quality.es", pathname: "/historian/webhooks", protocol: "https" },
    qualityIbmmq: {
      host: "qm-quality.quality.es:1414",
      protocol: "ibmmq",
      bindings: { ibmmq: { groupId: "QualityQMGroup", ccdtQueueManagerName: "QM.QUALITY", cipherSpec: "ANY_TLS12_OR_HIGHER", bindingVersion: "0.1.0" } },
    },
    edgePulsar: { host: "pulsar+ssl://pulsar-edge.quality.es:6651", protocol: "pulsar", description: "Host written with its scheme.", bindings: { pulsar: { tenant: "plants", bindingVersion: "0.1.0" } } },
    natsCluster: { host: "nats-0.quality.es:4222,nats-1.quality.es:4222,NATS-2.quality.es:4222", protocol: "nats" },
    solaceEdge: { host: "solace.quality.es:55443", protocol: "secure-solace", bindings: { solace: { msgVpn: "plants", bindingVersion: "0.4.0" } } },
    perSite: { host: "{site}-kafka.quality.es:9093", protocol: "kafka-secure", variables: { site: { $ref: "#/components/serverVariables/site" } } },
    deviceCredentials: { host: "{user}:{password}@mqtt-devices.quality.es:8883", protocol: "secure-mqtt", variables: { user: { default: "device" }, password: { default: "replace-me" } } },
    regionalRef: { $ref: "#/components/servers/regional" },
    regionalRefAgain: { $ref: "#/components/servers/regional" },
    externalSupplier: { $ref: "./supplier-servers.yaml#/components/servers/kafka" },
    externalTenant: { host: "{tenant}.supplier.example.org", protocol: "wss", variables: { tenant: { $ref: "https://specs.example.org/variables.yaml#/tenant" } } },
    "x-dr": { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure", "x-failover-host": "kafka.failover.example.org:9093" },
    leftover2x: { host: "kafka-legacy.quality.es:9092", url: "kafka://kafka.partner.example.org:9092", pathname: "//evil.example.org/x", protocol: "kafka" },
  },
  channels: {
    machineTelemetry: {
      address: "plant/{lineId}/machines/{machineId}/telemetry",
      title: "Machine telemetry",
      parameters: {
        lineId: { enum: ["press", "paint", "assembly"], default: "press", description: "Production line.", location: "$message.payload#/lineId" },
        machineId: { description: "Machine serial.", examples: ["localhost", "10.0.0.7"] },
      },
      servers: [{ $ref: "#/servers/opcGatewayMqtt" }, { $ref: "#/servers/edgePulsar" }],
      bindings: { mqtt: { bindingVersion: "0.2.0" } },
      messages: {
        reading: { $ref: "#/components/messages/machineReading" },
        heartbeat: {
          name: "heartbeat",
          payload: {
            schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
            schema: { type: "object", properties: { gatewayHost: { type: ["string", "null"], default: "mqtt.supplier.example.org" } } },
          },
        },
      },
    },
    workOrders: {
      address: "mes.cmd.workorders.create.v1",
      servers: [{ $ref: "#/servers/mesAmqp" }],
      bindings: { amqp: { is: "queue", queue: { name: "workorders.create", durable: true, exclusive: false, autoDelete: false, vhost: "/mes" }, bindingVersion: "0.3.0" } },
      messages: { workOrderCreated: { $ref: "#/components/messages/workOrderCreated" } },
    },
    qualityAlerts: {
      address: null,
      servers: [{ $ref: "#/servers/perSite" }, { $ref: "#/servers/regionalRef" }, { $ref: "#/components/servers/regional" }],
      messages: {
        alertAvro: {
          name: "qualityAlert",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "QualityAlert",
              namespace: "es.quality.manufacturing",
              fields: [
                { name: "inspectorHost", type: ["null", "string"], default: null },
                { name: "imageUrl", type: "string", default: "https://images.supplier.example.org" },
              ],
            },
          },
        },
        alertProtobuf: {
          name: "qualityAlertProtobuf",
          payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "syntax = \"proto3\"; message Alert { string host = 1; string url = 2; }" },
        },
      },
    },
    scadaFeed: {
      address: "scada/feed",
      servers: [{ $ref: "#/servers/scadaWs" }],
      bindings: { ws: { method: "GET", query: { type: "object", properties: { host: { type: "string", default: "evil.example.org" } } }, bindingVersion: "0.1.0" } },
      messages: { frame: { name: "scadaFrame", payload: { type: "object", properties: { url: { type: "string", const: "wss://other.example.org" } } } } },
    },
  },
  operations: {
    publishTelemetry: {
      action: "send",
      channel: { $ref: "#/channels/machineTelemetry" },
      messages: [{ $ref: "#/channels/machineTelemetry/messages/reading" }, { $ref: "#/channels/machineTelemetry/messages/heartbeat" }],
      traits: [{ $ref: "#/components/operationTraits/mqttQos" }],
      security: [{ $ref: "#/components/securitySchemes/plantOauth" }],
    },
    receiveWorkOrder: {
      action: "receive",
      channel: { $ref: "#/channels/workOrders" },
      reply: {
        address: { location: "$message.header#/replyTo", description: "Reply queue chosen by localhost clients." },
        channel: { $ref: "#/channels/workOrders" },
        messages: [{ $ref: "#/channels/workOrders/messages/workOrderCreated" }],
      },
    },
    requestInspection: { action: "send", channel: { $ref: "#/channels/qualityAlerts" }, reply: { $ref: "#/components/replies/inspectionReply" } },
    receiveScada: { action: "receive", channel: { $ref: "#/channels/scadaFeed" }, bindings: { ws: { bindingVersion: "0.1.0" } } },
  },
  components: {
    servers: {
      regional: { host: "kafka-{region}.quality.es:9093", protocol: "kafka-secure", variables: { region: { $ref: "#/components/serverVariables/region" } } },
      unusedMirror: { host: "mirror.quality.es", pathname: "/mirror", protocol: "kafka" },
    },
    serverVariables: {
      site: { enum: ["zaragoza", "valencia", "vigo"], default: "zaragoza" },
      region: { enum: ["eu", "us"], default: "eu" },
    },
    channels: { archive: { address: "plant.cdc.archive.v1", servers: [{ $ref: "#/components/servers/unusedMirror" }] } },
    messages: {
      machineReading: {
        name: "machineReading",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/machine" },
        traits: [{ $ref: "#/components/messageTraits/plantHeaders" }],
        headers: { type: "object", properties: { replyTo: { type: "string", default: "plant/localhost/replies" } } },
        payload: { $ref: "#/components/schemas/Reading" },
        examples: [{ name: "press", payload: { lineId: "press", sourceHost: "10.20.0.15", vibration: 0.42 } }],
      },
      workOrderCreated: { name: "workOrderCreated", payload: { type: "object", properties: { callbackUrl: { type: "string", format: "uri", default: "https://erp.supplier.example.org/callbacks" } } } },
    },
    schemas: {
      Reading: {
        type: "object",
        properties: {
          lineId: { type: "string" },
          sourceHost: { type: ["string", "null"], default: "localhost" },
          vibration: { type: "number", format: "float" },
        },
      },
    },
    securitySchemes: {
      plantOauth: {
        type: "oauth2",
        flows: { clientCredentials: { tokenUrl: "https://login.microsoftonline.com/tenant/oauth2/v2.0/token", availableScopes: { "plant:write": "Publish telemetry." } } },
        scopes: ["plant:write"],
      },
      saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials." },
      oidc: { type: "openIdConnect", openIdConnectUrl: "https://idp.supplier.example.org/.well-known/openid-configuration" },
    },
    correlationIds: { machine: { location: "$message.header#/machineHost", description: "localhost" } },
    messageTraits: { plantHeaders: { headers: { type: "object", properties: { machineHost: { type: "string", default: "plc-07.supplier.example.org" } } } } },
    operationTraits: { mqttQos: { bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } } } },
    replies: { inspectionReply: { address: { $ref: "#/components/replyAddresses/inspector" }, channel: { $ref: "#/channels/qualityAlerts" } } },
    replyAddresses: { inspector: { location: "$message.header#/inspectorHost", description: "evil.example.org" } },
    parameters: { plant: { enum: ["zaragoza", "localhost"], default: "zaragoza" } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "http://localhost:8081", bindingVersion: "0.5.0" } } },
    externalDocs: { plants: { url: "https://evil.example.org/docs" } },
    tags: { plants: { name: "plants", externalDocs: { url: "https://evil.example.org/tags" } } },
  },
};
