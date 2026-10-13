module.exports = {
  asyncapi: "3.0.0",
  id: "urn:io:aurora:ride-hailing",
  info: {
    title: "Aurora Ride Hailing Realtime",
    version: "5.1.0",
    description: "Trip lifecycle, driver locations, surge pricing and rider notifications.",
    contact: { name: "Mobility Platform", email: "mobility@aurora.io" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      host: "kafka.aurora.io:9093",
      protocol: "kafka-secure",
      bindings: {
        kafka: { schemaRegistryUrl: "https://registry.aurora.io", schemaRegistryVendor: "apicurio", bindingVersion: "0.5.0" },
        "x-cluster": { bindingVersion: "latest" },
      },
    },
    driverMqtt: {
      host: "mqtt.aurora.io:8883",
      protocol: "secure-mqtt",
      bindings: { mqtt: { clientId: "driver-gateway", cleanSession: true, bindingVersion: "0.2.0" }, mqtt5: { bindingVersion: "0.2.0" } },
    },
    riderWs: {
      host: "realtime.aurora.io",
      pathname: "/riders",
      protocol: "wss",
      bindings: { ws: { bindingVersion: "0.1.0" }, http: { bindingVersion: "0.3.0" } },
    },
    pricingPulsar: { host: "pulsar.aurora.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "pricing", bindingVersion: "0.1.0" } } },
    fleetRos: { host: "ros.aurora.io", protocol: "ros2", bindings: { ros2: { rmwImplementation: "rmw_fastrtps_cpp", domainId: 7, bindingVersion: "0.1.0" } } },
    nullVersion: { host: "nats.aurora.io:4222", protocol: "nats", bindings: { nats: { bindingVersion: null } } },
    sharedRegistry: { host: "kafka-dr.aurora.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    partnerKafka: { host: "kafka.partner.io:9093", protocol: "kafka-secure", bindings: { $ref: "./shared/partner-bindings.yaml#/serverBindings/partner" } },
    drKafka: { $ref: "#/components/servers/drKafka" },
  },
  channels: {
    tripRequested: {
      address: "aurora.cdc.trips.requested.v5",
      description: "Trip requests, keyed by rider.",
      servers: [{ $ref: "#/servers/kafkaProd" }],
      messages: {
        tripRequested: { $ref: "#/components/messages/tripRequested" },
        tripRequestedLegacy: {
          name: "tripRequestedLegacy",
          contentType: "application/vnd.apache.avro+json",
          bindings: { kafka: { key: { type: "string" }, schemaIdLocation: "header", schemaIdPayloadEncoding: "4", bindingVersion: "0.5.0" } },
          traits: [{ $ref: "#/components/messageTraits/tripEnvelope" }, { bindings: { kafka: { bindingVersion: "0.4.0" } } }],
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "TripRequested",
              namespace: "io.aurora.trips",
              fields: [
                { name: "tripId", type: "string" },
                { name: "bindingVersion", type: ["null", "string"], default: null },
              ],
            },
          },
        },
      },
      bindings: { kafka: { topic: "aurora.cdc.trips.requested.v5", partitions: 64, replicas: 3, bindingVersion: "0.5.0" }, "x-retention": { bindingVersion: "forever" } },
    },
    driverLocation: {
      address: "drivers/{driverId}/location",
      parameters: { driverId: { description: "Driver identifier.", examples: ["DRV-0042"] } },
      messages: {
        locationUpdated: {
          name: "locationUpdated",
          bindings: { mqtt: { payloadFormatIndicator: 1, contentType: "application/json", bindingVersion: "0.2.0" } },
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: {
              type: "object",
              properties: {
                lat: { type: "number", format: "double" },
                heading: { type: ["number", "null"] },
                bindings: { type: "object", properties: { bindingVersion: { type: "string", const: "latest" } } },
              },
            },
          },
          examples: [{ name: "downtown", payload: { lat: 40.4, bindings: { mqtt: { bindingVersion: "latest" } } } }],
        },
      },
      bindings: { mqtt: { bindingVersion: "0.2.0" }, ws: { method: "GET", bindingVersion: "0.1.0" } },
    },
    riderNotifications: {
      address: null,
      messages: {
        notification: {
          name: "riderNotification",
          bindings: { ws: { bindingVersion: "0.1.0" }, http: { headers: { type: "object" }, bindingVersion: "0.3.0" } },
          headers: { type: "object", properties: { bindingVersion: { type: "string", examples: ["latest"] } } },
        },
      },
      bindings: { ws: { query: { type: "object" }, bindingVersion: "0.1.0" } },
    },
    surgePricing: { $ref: "#/components/channels/surgePricing" },
  },
  operations: {
    requestTrip: {
      action: "send",
      channel: { $ref: "#/channels/tripRequested" },
      messages: [{ $ref: "#/channels/tripRequested/messages/tripRequested" }],
      bindings: { kafka: { groupId: { type: "string" }, clientId: { type: "string" }, bindingVersion: "0.5.0" } },
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { bindings: { kafka: { bindingVersion: "0.4.0" } } }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/riderNotifications" },
        messages: [{ $ref: "#/channels/riderNotifications/messages/notification" }],
      },
    },
    receiveLocation: {
      action: "receive",
      channel: { $ref: "#/channels/driverLocation" },
      bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" }, "x-sampling": { bindingVersion: "every-5s" } },
    },
    publishSurge: { $ref: "#/components/operations/publishSurge" },
  },
  components: {
    servers: { drKafka: { host: "kafka-dr.aurora.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "0.4.0" } } } },
    channels: {
      surgePricing: {
        address: "aurora.sys.pricing.surge.v1",
        messages: { surgeChanged: { name: "surgeChanged", bindings: { pulsar: { bindingVersion: "0.1.0" } } } },
        bindings: { pulsar: { namespace: "pricing", persistence: "persistent", bindingVersion: "0.1.0" } },
      },
    },
    operations: {
      publishSurge: {
        action: "send",
        channel: { $ref: "#/components/channels/surgePricing" },
        bindings: { pulsar: { bindingVersion: "0.1.0" } },
        traits: [{ bindings: { pulsar: { bindingVersion: "0.1.0" } } }],
      },
    },
    schemas: {
      BindingDescriptor: { type: "object", properties: { bindingVersion: { type: "string", default: "latest" } } },
      AvroDescriptor: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Descriptor", fields: [{ name: "bindingVersion", type: "string" }] } },
    },
    messages: {
      tripRequested: {
        name: "tripRequested",
        bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" } },
        traits: [{ $ref: "#/components/messageTraits/tripEnvelope" }],
        payload: { $ref: "#/components/schemas/BindingDescriptor" },
      },
    },
    messageTraits: { tripEnvelope: { bindings: { kafka: { bindingVersion: "0.5.0" } }, headers: { type: "object" } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } } } },
    replies: { riderAck: { address: { location: "$message.header#/replyTo" }, messages: [{ $ref: "#/components/messages/tripRequested" }] } },
    replyAddresses: { riderReply: { location: "$message.header#/replyTo", description: "Rider reply inbox." } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.aurora.io", bindingVersion: "0.5.0" } } },
    channelBindings: { compacted: { kafka: { topicConfiguration: { "cleanup.policy": ["compact"] }, bindingVersion: "0.5.0" } } },
    operationBindings: { consumer: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" }, "x-lag-alert": { bindingVersion: "n/a" } } },
    messageBindings: { keyed: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" }, googlepubsub: { orderingKey: "tripId", bindingVersion: "0.2.0" } } },
  },
};
