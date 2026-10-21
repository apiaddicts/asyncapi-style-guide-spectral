module.exports = {
  asyncapi: "3.0.0",
  id: "urn:org:metro:transit-events",
  info: {
    title: "Metro Transit Realtime Backbone",
    version: "5.1.0",
    description: "Vehicle positions, service alerts and ticketing over Kafka, MQTT, AMQP, WebSockets, Pulsar and ROS 2.",
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      host: "kafka.metro.io:9093",
      protocol: "kafka-secure",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: {
        kafka: { schemaRegistryUrl: "https://registry.metro.io", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" },
        "x-cluster": { id: "lkc-71ab" },
      },
    },
    mqttEdge: {
      host: "edge.metro.io:8883",
      protocol: "secure-mqtt",
      bindings: { mqtt: { clientId: "vehicle-gateway", cleanSession: false, keepAlive: 30, sessionExpiryInterval: 600, bindingVersion: "0.2.0" } },
    },
    rabbit: { host: "rabbit.metro.io:5671", pathname: "/transit", protocol: "amqps", bindings: { amqp: {}, amqp1: {} } },
    wsGateway: { host: "stream.metro.io", pathname: "/v1/realtime", protocol: "wss", bindings: { ws: {}, http: {} } },
    pulsarCluster: { host: "pulsar.metro.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "metro", bindingVersion: "0.1.0" } } },
    robotFleet: { host: "dds.metro.io", protocol: "ros2", bindings: { ros2: { rmwImplementation: "rmw_fastrtps_cpp", domainId: 7, bindingVersion: "0.1.0" } } },
    sharedRegistry: { host: "kafka-dr.metro.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
    referenced: { $ref: "#/components/servers/drKafka" },
  },
  channels: {
    vehiclePositions: {
      address: "metro.cdc.vehicles.positions.v1",
      messages: {
        positionReported: { $ref: "#/components/messages/positionReported" },
        positionCorrected: {
          name: "positionCorrected",
          contentType: "application/json",
          bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.5.0" }, "x-partitioner": "murmur2" },
          traits: [
            { $ref: "#/components/messageTraits/commonHeaders" },
            { bindings: { kafka: { schemaIdLocation: "header" } } },
            [{ bindings: { kafka: {} } }, { "x-trait-meta": { owner: "positions" } }],
          ],
          payload: {
            type: ["object", "null"],
            properties: {
              bindings: { type: ["object", "null"], properties: { kafak: { type: "string" }, rabbit: { type: "string" } } },
              vehicleId: { type: "string" },
            },
          },
        },
      },
      bindings: { kafka: { topic: "metro.cdc.vehicles.positions.v1", partitions: 24, replicas: 3, bindingVersion: "0.5.0" }, "x-retention": "7d" },
    },
    vehicleTelemetry: {
      address: "metro/vehicles/{vehicleId}/telemetry",
      parameters: { vehicleId: { description: "Vehicle identifier.", examples: ["BUS-1042"] } },
      messages: {
        telemetry: {
          name: "telemetry",
          bindings: { mqtt: { payloadFormatIndicator: 1, contentType: "application/json", bindingVersion: "0.2.0" } },
          headers: { type: "object", properties: { bindings: { type: "string", enum: ["mqtt", "websocket"] } } },
          examples: [{ name: "bus", payload: { bindings: { websocket: true, kafak: 1 } } }],
        },
      },
      bindings: { ws: { method: "GET", bindingVersion: "0.1.0" }, mqtt: {} },
    },
    serviceAlerts: {
      address: null,
      messages: {
        alertRaised: {
          name: "alertRaised",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "AlertRaised",
              namespace: "org.metro.alerts",
              fields: [
                { name: "alertId", type: "string" },
                { name: "bindings", type: ["null", { type: "record", name: "Bindings", fields: [{ name: "rabbit", type: "string" }] }] },
              ],
            },
          },
          bindings: { amqp: { contentEncoding: "gzip", messageType: "alert.raised", bindingVersion: "0.3.0" } },
        },
      },
      bindings: { amqp: { is: "routingKey", exchange: { name: "alerts", type: "topic" }, bindingVersion: "0.3.0" } },
    },
    notifications: {
      address: "metro-notifications",
      messages: { notificationSent: { $ref: "#/components/messages/notificationSent" } },
      bindings: { sns: { name: "metro-notifications" }, sqs: { queue: { name: "metro-notifications" } }, googlepubsub: {}, pulsar: { namespace: "transit" } },
    },
    ticketSales: { $ref: "#/components/channels/ticketSales" },
  },
  operations: {
    publishPosition: {
      action: "send",
      channel: { $ref: "#/channels/vehiclePositions" },
      messages: [{ $ref: "#/channels/vehiclePositions/messages/positionReported" }, { $ref: "#/channels/vehiclePositions/messages/positionCorrected" }],
      bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } },
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { bindings: { kafka: { clientId: { type: "string", const: "positions-api" } } } }],
    },
    receiveTelemetry: {
      action: "receive",
      channel: { $ref: "#/channels/vehicleTelemetry" },
      bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" }, ros2: { role: "subscriber", node: "/telemetry", bindingVersion: "0.1.0" } },
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/serviceAlerts" },
        messages: [{ $ref: "#/channels/serviceAlerts/messages/alertRaised" }],
      },
    },
    receiveAlert: {
      action: "receive",
      channel: { $ref: "#/channels/serviceAlerts" },
      bindings: { $ref: "#/components/operationBindings/durableConsumer" },
    },
    notify: {
      action: "send",
      channel: { $ref: "#/channels/notifications" },
      bindings: { sns: { consumers: [] }, sqs: { queues: [] }, http: { method: "POST" }, anypointmq: {}, jms: {}, stomp: {}, redis: {}, nats: {}, solace: {}, ibmmq: {}, mercure: {} },
    },
    sellTicket: { $ref: "#/components/operations/sellTicket" },
  },
  components: {
    servers: { drKafka: { host: "kafka-dr.metro.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "0.5.0" } } } },
    channels: {
      ticketSales: {
        address: "metro.cmd.tickets.sold.v1",
        messages: { ticketSold: { name: "ticketSold", bindings: { kafka: {} } } },
        bindings: { kafka: { partitions: 6 } },
      },
    },
    operations: {
      sellTicket: {
        action: "send",
        channel: { $ref: "#/components/channels/ticketSales" },
        bindings: { kafka: {} },
        traits: [{ bindings: { kafka: { clientId: { type: "string" } } } }],
      },
    },
    messages: {
      positionReported: {
        name: "positionReported",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/tripId" },
        bindings: { $ref: "#/components/messageBindings/partitionKey" },
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }],
        payload: { $ref: "#/components/schemas/Position" },
      },
      notificationSent: { name: "notificationSent", bindings: { sns: {}, sqs: {}, googlepubsub: { orderingKey: "route" } } },
    },
    messageTraits: {
      commonHeaders: {
        headers: { type: "object", properties: { traceparent: { type: "string" } } },
        bindings: { kafka: { key: { type: "string" } }, "x-legacy-key": { deprecated: true } },
      },
    },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" } } } } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry-dr.metro.io" }, mqtt5: {} } },
    channelBindings: { compactedTopic: { kafka: { partitions: 6 }, "x-cleanup-policy": "compact" } },
    operationBindings: { durableConsumer: { amqp: { ack: true }, kafka: { groupId: { type: "string" } } } },
    messageBindings: { partitionKey: { kafka: { key: { type: "string" } } } },
    correlationIds: { tripId: { location: "$message.payload#/tripId", "x-bindings": { rabbit: {} } } },
    replies: { alertReply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/serviceAlerts" } } },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    schemas: {
      Position: {
        type: "object",
        properties: { bindings: { type: "object", additionalProperties: { type: "string" } }, websocket: { type: ["string", "null"] } },
      },
    },
  },
  "x-bindings": { rabbit: {}, websocket: {} },
};
