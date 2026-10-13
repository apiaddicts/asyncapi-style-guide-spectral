module.exports = {
  asyncapi: "3.0.0",
  id: "urn:io:aurora:ride-hailing",
  info: { title: "Aurora Ride Hailing Realtime", version: "5.1.0", description: "Trip lifecycle, driver locations, surge pricing and rider notifications." },
  servers: {
    kafkaProd: { host: "kafka.aurora.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "latest" }, "x-cluster": { bindingVersion: "latest" } } },
    driverMqtt: { host: "mqtt.aurora.io:8883", protocol: "secure-mqtt", bindings: { mqtt: { bindingVersion: "0.2" }, mqtt5: { bindingVersion: "0.2.0" } } },
    riderWs: { host: "realtime.aurora.io", pathname: "/riders", protocol: "wss", bindings: { ws: { bindingVersion: 0.1 } } },
  },
  channels: {
    tripRequested: {
      address: "aurora.cdc.trips.requested.v5",
      messages: {
        tripRequested: { name: "tripRequested", bindings: { kafka: { bindingVersion: "0.5.0" } } },
        tripRequestedLegacy: {
          name: "tripRequestedLegacy",
          bindings: { kafka: { key: { type: "string" }, bindingVersion: "v0.5.0" } },
          traits: [{ bindings: { kafka: { bindingVersion: "0.4.0" } } }, { bindings: { kafka: { bindingVersion: "0.4.0-SNAPSHOT" } } }, [{ bindings: { kafka: { bindingVersion: "LATEST" } } }, { bindings: { kafka: { bindingVersion: "skipped" } } }]],
        },
      },
      bindings: { kafka: { topic: "aurora.cdc.trips.requested.v5", bindingVersion: "0.5.0.0" } },
    },
    driverLocation: {
      address: "drivers/{driverId}/location",
      messages: { locationUpdated: { bindings: { mqtt: { bindingVersion: true } } } },
      bindings: { mqtt: { bindingVersion: "0.2.0" }, ws: { bindingVersion: "1" } },
    },
    riderNotifications: {
      address: null,
      messages: { notification: { bindings: { ws: { bindingVersion: "" } } }, receipt: { bindings: { http: { bindingVersion: " 0.3.0" } } } },
      bindings: { ws: { bindingVersion: ["0.1.0"] } },
    },
  },
  operations: {
    requestTrip: {
      action: "send",
      channel: { $ref: "#/channels/tripRequested" },
      messages: [{ $ref: "#/channels/tripRequested/messages/tripRequested" }],
      bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5" } },
      traits: [{ bindings: { kafka: { bindingVersion: "0.4.0" } } }, { bindings: { kafka: { bindingVersion: "^0.4.0" } } }],
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/riderNotifications" } },
    },
    receiveLocation: { action: "receive", channel: { $ref: "#/channels/driverLocation" }, bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0\n" } } },
  },
  components: {
    servers: { drKafka: { host: "kafka-dr.aurora.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "0,4,0" } } } },
    channels: {
      surgePricing: {
        address: "aurora.sys.pricing.surge.v1",
        messages: { surgeChanged: { bindings: { pulsar: { bindingVersion: "0.1.0+build.9" } } } },
        bindings: { pulsar: { bindingVersion: "~0.1.0" } },
      },
    },
    operations: {
      publishSurge: {
        action: "send",
        channel: { $ref: "#/components/channels/surgePricing" },
        bindings: { pulsar: { bindingVersion: "0.1" } },
        traits: [{ bindings: { pulsar: { bindingVersion: { major: 0 } } } }],
      },
    },
    messages: { tripCancelled: { bindings: { kafka: { bindingVersion: "0.5.0" }, sns: { bindingVersion: "0.1" } } } },
    messageTraits: { tripEnvelope: { bindings: { kafka: { bindingVersion: "latest" } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { bindingVersion: "0.5.0" }, ibmmq: { bindingVersion: "0.1.0-SNAPSHOT" } } } },
    serverBindings: { registry: { kafka: { bindingVersion: "5" } } },
    channelBindings: { compacted: { kafka: { bindingVersion: 1 } } },
    operationBindings: { durable: { amqp: { bindingVersion: "0.3.0" }, rabbitmq: { bindingVersion: "3.12" } } },
    messageBindings: { keyed: { googlepubsub: { bindingVersion: "0.2.0 " } } },
  },
};
