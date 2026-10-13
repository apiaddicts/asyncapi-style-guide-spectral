module.exports = {
  asyncapi: "2.6.0",
  id: "urn:io:northwind:grid-operations",
  info: {
    title: "Northwind Grid Operations",
    version: "4.3.0",
    description: "Substation telemetry, outage dispatch and meter readings of a regional power grid.",
    contact: { name: "Grid Integration", email: "grid-integration@northwind.io" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      url: "kafka.northwind.io:9093",
      protocol: "kafka-secure",
      bindings: {
        kafka: { schemaRegistryUrl: "https://registry.northwind.io", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" },
        "x-cluster": { tier: "dedicated", bindingVersion: "latest" },
      },
    },
    substationMqtt: {
      url: "mqtt.northwind.io:8883",
      protocol: "secure-mqtt",
      bindings: {
        mqtt: { clientId: "grid-bridge", cleanSession: false, keepAlive: 60, bindingVersion: "0.2.0" },
        mqtt5: { sessionExpiryInterval: 3600, bindingVersion: "0.2.0" },
      },
    },
    dispatchAmqp: {
      url: "amqp.northwind.io:5671",
      protocol: "amqps",
      bindings: { amqp: { bindingVersion: "0.3.0" }, amqp1: {} },
    },
    controlRoomWs: {
      url: "control.northwind.io",
      protocol: "wss",
      bindings: { ws: { bindingVersion: "0.1.0" }, http: { bindingVersion: "0.3.0" } },
    },
    meteringMq: {
      url: "mq.northwind.io:1414",
      protocol: "ibmmq",
      bindings: { ibmmq: { groupId: "PRODCLSTR1", ccdtQueueManagerName: "*", cipherSpec: "ANY_TLS12_OR_HIGHER", bindingVersion: "0.1.0" } },
    },
    legacyJms: {
      url: "jms.northwind.io:61616",
      protocol: "jms",
      bindings: { jms: { jmsConnectionFactory: "org.apache.activemq.ActiveMQConnectionFactory", bindingVersion: "0.0.1" } },
    },
    natsEdge: { url: "nats.northwind.io:4222", protocol: "nats", bindings: { nats: { bindingVersion: null } } },
    solaceCloud: { url: "solace.northwind.io:55443", protocol: "secure-smf", bindings: { solace: { msgVpn: "grid", bindingVersion: "0.4.0" } } },
    pulsarCluster: { url: "pulsar.northwind.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "grid", bindingVersion: "0.1.0" } } },
    sharedRegistry: { url: "kafka-dr.northwind.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    partnerKafka: { url: "kafka.partner.io:9093", protocol: "kafka-secure", bindings: { $ref: "./shared/partner-bindings.yaml#/serverBindings/partner" } },
  },
  channels: {
    "northwind.cdc.substations.telemetry.v4": {
      description: "Substation telemetry, one partition per feeder.",
      bindings: {
        kafka: {
          topic: "northwind.cdc.substations.telemetry.v4",
          partitions: 48,
          replicas: 3,
          topicConfiguration: { "cleanup.policy": ["delete"], "retention.ms": 604800000 },
          bindingVersion: "0.5.0",
        },
        "x-retention": { bindingVersion: "forever" },
      },
      publish: {
        operationId: "publishSubstationTelemetry",
        bindings: { kafka: { groupId: { type: "string", enum: ["grid-telemetry"] }, clientId: { type: "string" }, bindingVersion: "0.5.0" } },
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { bindings: { kafka: { bindingVersion: "0.4.0" } } }],
        message: { $ref: "#/components/messages/substationReading" },
      },
      subscribe: {
        operationId: "receiveSubstationTelemetry",
        bindings: { $ref: "#/components/operationBindings/telemetryConsumer" },
        message: {
          oneOf: [
            { $ref: "#/components/messages/substationReading" },
            {
              name: "substationReadingCorrected",
              contentType: "application/json",
              bindings: { kafka: { key: { type: "string", format: "uuid" }, bindingVersion: "0.5.0" } },
              traits: [[{ bindings: { kafka: { bindingVersion: "0.4.0" } } }, { bindings: { kafka: { bindingVersion: "ignored" } } }]],
              payload: { type: "object", properties: { readingId: { type: "string", format: "uuid" } } },
            },
          ],
        },
      },
    },
    "northwind/substations/{substationId}/alarms": {
      parameters: { substationId: { description: "Substation identifier.", schema: { type: "string", pattern: "^SS-[0-9]{4}$" } } },
      bindings: { mqtt: { bindingVersion: "0.2.0" }, ws: { method: "GET", bindingVersion: "0.1.0" } },
      subscribe: {
        operationId: "receiveSubstationAlarm",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } },
        message: {
          name: "substationAlarm",
          contentType: "application/json",
          bindings: { mqtt: { payloadFormatIndicator: 1, bindingVersion: "0.2.0" } },
          headers: { type: "object", properties: { bindingVersion: { type: "string", examples: ["latest"] } } },
          payload: {
            type: "object",
            properties: {
              severity: { type: ["string", "null"], enum: ["minor", "major", "critical", null] },
              bindings: { type: "object", properties: { bindingVersion: { type: "string", const: "latest" } } },
            },
          },
          examples: [{ name: "breakerTrip", payload: { severity: "critical", bindings: { kafka: { bindingVersion: "latest" } } } }],
        },
      },
    },
    "northwind.cmd.outages.dispatch.v1": {
      bindings: { amqp: { is: "routingKey", exchange: { name: "outages", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "dispatchCrew",
        bindings: { amqp: { expiration: 100000, deliveryMode: 2, mandatory: true, bindingVersion: "0.3.0" } },
        message: {
          name: "crewDispatched",
          bindings: { amqp: { contentEncoding: "gzip", messageType: "crew.dispatched", bindingVersion: "0.3.0" } },
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          payload: {
            type: "record",
            name: "CrewDispatched",
            namespace: "io.northwind.outages",
            fields: [
              { name: "crewId", type: "string" },
              { name: "bindingVersion", type: ["null", "string"], default: null },
              { name: "bindings", type: { type: "map", values: "string" } },
            ],
          },
        },
      },
    },
    "northwind.sys.meters.readings.v2": {
      bindings: {
        sqs: { queue: { name: "meter-readings", fifoQueue: false }, bindingVersion: "0.2.0" },
        sns: { name: "meter-readings", bindingVersion: "0.1.0" },
        googlepubsub: { messageRetentionDuration: "86400s", bindingVersion: "0.2.0" },
      },
      subscribe: {
        operationId: "receiveMeterReading",
        bindings: { sqs: { queues: [{ name: "meter-readings" }], bindingVersion: "0.2.0" }, http: { method: "POST", bindingVersion: "0.3.0" } },
        message: { $ref: "./shared/meter-messages.yaml#/components/messages/meterReading" },
      },
    },
    "northwind.diagnostics": { $ref: "#/components/channels/diagnostics" },
  },
  components: {
    servers: {
      drKafka: { url: "kafka-dr.northwind.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "0.4.0" } } },
    },
    channels: {
      diagnostics: {
        bindings: { kafka: { partitions: 6, bindingVersion: "0.5.0" } },
        publish: { message: { name: "diagnosticCode", bindings: { kafka: { bindingVersion: "0.5.0" } } } },
      },
    },
    schemas: {
      BindingDescriptor: {
        type: "object",
        properties: { bindingVersion: { type: "string", default: "latest" }, bindings: { type: ["object", "null"] } },
      },
    },
    messages: {
      substationReading: {
        name: "substationReading",
        contentType: "application/json",
        bindings: { kafka: { key: { type: "string" }, schemaIdLocation: "payload", bindingVersion: "0.5.0" } },
        traits: [{ $ref: "#/components/messageTraits/gridEnvelope" }],
        payload: { $ref: "#/components/schemas/BindingDescriptor" },
      },
    },
    messageTraits: { gridEnvelope: { bindings: { kafka: { bindingVersion: "0.4.0" } }, headers: { type: "object" } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.northwind.io", bindingVersion: "0.5.0" } } },
    channelBindings: { compacted: { kafka: { topicConfiguration: { "cleanup.policy": ["compact"] }, bindingVersion: "0.5.0" } } },
    operationBindings: { telemetryConsumer: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" }, "x-lag-alert": { bindingVersion: "n/a" } } },
    messageBindings: { keyed: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" }, googlepubsub: { orderingKey: "meterId", bindingVersion: "0.2.0" } } },
  },
};
