module.exports = {
  asyncapi: "2.6.0",
  id: "urn:io:northwind:grid-operations",
  info: {
    title: "Northwind Grid Operations",
    version: "4.3.0",
    description: "Substation telemetry, outage dispatch and meter readings of a regional power grid.",
  },
  servers: {
    kafkaProd: {
      url: "kafka.northwind.io:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.northwind.io", bindingVersion: "latest" }, "x-cluster": { bindingVersion: "latest" } },
    },
    substationMqtt: {
      url: "mqtt.northwind.io:8883",
      protocol: "secure-mqtt",
      bindings: { mqtt: { clientId: "grid-bridge", bindingVersion: "0.2" }, mqtt5: { bindingVersion: "0.2.0" } },
    },
    dispatchAmqp: { url: "amqp.northwind.io:5671", protocol: "amqps", bindings: { amqp: { bindingVersion: 0.3 } } },
    controlRoomWs: { url: "control.northwind.io", protocol: "wss", bindings: { ws: { bindingVersion: "v0.1.0" }, http: { bindingVersion: "0.3.0" } } },
  },
  channels: {
    "northwind.cdc.substations.telemetry.v4": {
      bindings: { kafka: { topic: "northwind.cdc.substations.telemetry.v4", partitions: 48, bindingVersion: "0.5.0-beta" } },
      publish: {
        operationId: "publishSubstationTelemetry",
        bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5" } },
        traits: [{ bindings: { kafka: { bindingVersion: "0.4.0" } } }, { bindings: { kafka: { bindingVersion: "^0.4.0" } } }],
        message: {
          name: "substationReading",
          bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0.1" } },
          traits: [{ bindings: { kafka: { bindingVersion: "0.4.0" } } }, { bindings: { kafka: { bindingVersion: "LATEST" } } }, [{ bindings: { mqtt: { bindingVersion: "0.2.x" } } }, { bindings: { mqtt: { bindingVersion: "skipped" } } }]],
        },
      },
      subscribe: {
        operationId: "receiveSubstationTelemetry",
        bindings: { kafka: { groupId: { type: "string" }, bindingVersion: true } },
        message: {
          oneOf: [
            { name: "substationReading", bindings: { kafka: { bindingVersion: "0.5.0" } } },
            { name: "substationReadingCorrected", bindings: { kafka: { bindingVersion: " 0.5.0" } } },
            { name: "substationReadingReplayed", bindings: { kafka: { bindingVersion: "" } } },
          ],
        },
      },
    },
    "northwind/substations/{substationId}/alarms": {
      bindings: { mqtt: { bindingVersion: "0.2.0" }, ws: { bindingVersion: "1" } },
      subscribe: { operationId: "receiveSubstationAlarm", bindings: { mqtt: { qos: 1, bindingVersion: ["0.2.0"] } } },
    },
  },
  components: {
    servers: { drKafka: { url: "kafka-dr.northwind.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "0.4.0\n" } } } },
    channels: {
      auditTrail: {
        bindings: { kafka: { bindingVersion: "0,5,0" } },
        publish: { bindings: { kafka: { bindingVersion: "~0.5.0" } }, message: { bindings: { kafka: { bindingVersion: "0.5.0+build.3" } } } },
      },
    },
    messages: {
      meterReading: { bindings: { sqs: { bindingVersion: "0.2.0" }, sns: { bindingVersion: "0.1" } } },
      gateEvents: { oneOf: [{ bindings: { amqp: { bindingVersion: "0.3.0" } } }, { bindings: { amqp: { bindingVersion: { major: 0, minor: 3 } } } }] },
    },
    messageTraits: { commonHeaders: { bindings: { kafka: { bindingVersion: "latest" } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { bindingVersion: "0.5.0" }, ibmmq: { bindingVersion: "0.1.0-SNAPSHOT" } } } },
    serverBindings: { registry: { kafka: { bindingVersion: "5" } } },
    channelBindings: { compacted: { kafka: { bindingVersion: 1 } } },
    operationBindings: { durable: { amqp: { bindingVersion: "0.3.0" }, rabbitmq: { bindingVersion: "3.12" } } },
    messageBindings: { keyed: { googlepubsub: { bindingVersion: "0.2.0 " } } },
  },
};
