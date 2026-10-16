module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:harborline:terminal-events",
  info: {
    title: "Harborline Terminal Event Mesh",
    version: "3.2.0",
    description: "Container terminal events published over Kafka, RabbitMQ, MQTT, WebSockets and cloud queues.",
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      url: "kafka.harborline.io:9093",
      protocol: "kafka-secure",
      security: [{ saslScram: [] }],
      bindings: {
        kafka: { schemaRegistryUrl: "https://registry.harborline.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" },
        "x-cluster": { id: "lkc-81x2", region: "eu-west-1" },
      },
    },
    rabbitProd: { url: "amqps://rabbit.harborline.io:5671/terminal", protocol: "amqps", bindings: { amqp: {}, amqp1: {} } },
    mqttEdge: {
      url: "mqtts://edge.harborline.io:8883",
      protocol: "secure-mqtt",
      bindings: {
        mqtt: { clientId: "crane-gateway", cleanSession: false, keepAlive: 60, bindingVersion: "0.1.0" },
        mqtt5: { sessionExpiryInterval: 3600, bindingVersion: "0.2.0" },
      },
    },
    wsGateway: { url: "wss://stream.harborline.io/terminal", protocol: "wss", bindings: { ws: {}, http: {} } },
    natsCore: { url: "nats://nats.harborline.io:4222", protocol: "nats", bindings: { nats: {} } },
    ibmQueue: { url: "ibmmq://mq.harborline.io:1414/QM1", protocol: "ibmmq", bindings: { ibmmq: { groupId: "PRODCLSTR1", bindingVersion: "0.1.0" } } },
    solaceCloud: { url: "smfs://solace.harborline.io:55443", protocol: "secure-smf", bindings: { solace: { msgVpn: "terminal", bindingVersion: "0.3.0" } } },
    pulsarCluster: { url: "pulsar+ssl://pulsar.harborline.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "harborline", bindingVersion: "0.1.0" } } },
    registryMirror: { url: "kafka-dr.harborline.io:9093", protocol: "kafka-secure", bindings: { $ref: "#/components/serverBindings/registry" } },
  },
  channels: {
    "harborline.cmd.shipments.created.v1": {
      description: "Shipment creation commands.",
      bindings: {
        kafka: { topic: "harborline.cmd.shipments.created.v1", partitions: 12, replicas: 3, bindingVersion: "0.4.0" },
        "x-retention": { ms: 604800000 },
      },
      publish: {
        operationId: "publishShipmentCreated",
        bindings: { kafka: { groupId: { type: "string", enum: ["shipments-writer"] }, clientId: { type: "string" }, bindingVersion: "0.4.0" } },
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { bindings: { kafka: { clientId: { type: "string", const: "shipments-api" } } } }],
        message: { $ref: "#/components/messages/shipmentCreated" },
      },
      subscribe: {
        operationId: "receiveShipmentCreated",
        bindings: { $ref: "#/components/operationBindings/durableConsumer" },
        message: {
          oneOf: [
            { $ref: "#/components/messages/shipmentCreated" },
            {
              name: "shipmentAmended",
              contentType: "application/json",
              bindings: { kafka: { key: { type: "string", format: "uuid" }, bindingVersion: "0.4.0" }, "x-partitioner": "murmur2" },
              payload: {
                type: ["object", "null"],
                properties: {
                  bindings: { type: ["object", "null"], properties: { kafak: { type: "string" }, rabbit: { type: "string" } } },
                  shipmentId: { type: "string", format: "uuid" },
                },
              },
            },
          ],
        },
      },
    },
    "harborline/telemetry/{craneId}": {
      description: "Crane telemetry over MQTT and WebSockets.",
      parameters: { craneId: { description: "Crane identifier.", schema: { type: "string", pattern: "^CR-[0-9]{4}$" } } },
      bindings: { ws: { method: "GET", query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" }, mqtt: {} },
      subscribe: {
        operationId: "receiveCraneTelemetry",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.1.0" } },
        message: {
          name: "craneTelemetry",
          contentType: "application/json",
          bindings: { mqtt: { bindingVersion: "0.1.0" } },
          headers: { type: "object", properties: { bindings: { type: "string", enum: ["mqtt", "websocket"] } } },
          traits: [
            { $ref: "#/components/messageTraits/commonHeaders" },
            [{ bindings: { mqtt5: { payloadFormatIndicator: 1 } } }, { "x-trait-meta": { owner: "telemetry" } }],
          ],
          examples: [{ name: "boom", payload: { bindings: { websocket: true, kafak: 1 } } }],
        },
      },
    },
    "harborline.amqp.invoices": {
      description: "Invoice events routed through a topic exchange.",
      bindings: {
        amqp: { is: "routingKey", exchange: { name: "invoices", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.2.0" },
      },
      subscribe: {
        operationId: "receiveInvoiceIssued",
        bindings: { amqp: { ack: true, deliveryMode: 2, mandatory: true, bindingVersion: "0.2.0" } },
        message: {
          name: "invoiceIssued",
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          bindings: { amqp: { contentEncoding: "gzip", messageType: "invoice.issued", bindingVersion: "0.2.0" } },
          payload: {
            type: "record",
            name: "InvoiceIssued",
            namespace: "com.harborline.billing",
            fields: [
              { name: "invoiceId", type: "string" },
              { name: "bindings", type: ["null", { type: "record", name: "Bindings", fields: [{ name: "kafak", type: "string" }] }] },
            ],
          },
        },
      },
    },
    "harborline.cloud.notifications": {
      description: "Customer notifications fanned out to cloud queues.",
      bindings: { sns: { name: "terminal-notifications" }, sqs: { queue: { name: "terminal-notifications" } }, googlepubsub: { labels: { team: "notify" } } },
      publish: {
        operationId: "publishNotification",
        bindings: { sns: { consumers: [] }, sqs: { queues: [] }, http: { type: "request", method: "POST" }, anypointmq: {}, jms: {}, stomp: {}, redis: {}, mercure: {} },
        message: { $ref: "#/components/messages/notificationSent" },
      },
    },
  },
  components: {
    servers: {
      drKafka: { url: "kafka-dr.harborline.io:9093", protocol: "kafka-secure", bindings: { kafka: { bindingVersion: "0.4.0" } } },
    },
    channels: {
      auditTrail: {
        bindings: { kafka: { topic: "harborline.sys.audit.v1", bindingVersion: "0.4.0" } },
        publish: { bindings: { kafka: { clientId: { type: "string" } } }, message: { name: "auditLine", bindings: { kafka: {} } } },
      },
    },
    messages: {
      shipmentCreated: {
        name: "shipmentCreated",
        contentType: "application/json",
        bindings: { $ref: "#/components/messageBindings/partitionKey" },
        traits: [{ $ref: "#/components/messageTraits/commonHeaders" }],
        payload: { $ref: "#/components/schemas/Shipment" },
      },
      notificationSent: { name: "notificationSent", contentType: "application/json", bindings: { sns: {}, sqs: {} } },
      gateEvents: {
        oneOf: [
          { name: "gateIn", bindings: { kafka: {} } },
          { name: "gateOut", bindings: { kafka: {}, amqp: {} } },
        ],
      },
    },
    messageTraits: {
      commonHeaders: {
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
        bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" }, "x-legacy-key": { deprecated: true } },
      },
    },
    operationTraits: {
      kafkaProducer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.4.0" } } },
    },
    serverBindings: {
      registry: { kafka: { schemaRegistryUrl: "https://registry-dr.harborline.io", bindingVersion: "0.4.0" } },
    },
    channelBindings: {
      compactedTopic: { kafka: { partitions: 6, replicas: 3 }, "x-cleanup-policy": "compact" },
    },
    operationBindings: {
      durableConsumer: { kafka: { groupId: { type: "string", enum: ["shipments-reader"] } }, amqp: { ack: true } },
    },
    messageBindings: {
      partitionKey: { kafka: { key: { type: "string" } }, ros2: {} },
    },
    schemas: {
      Shipment: {
        type: "object",
        properties: {
          shipmentId: { type: "string", format: "uuid" },
          bindings: { type: "object", additionalProperties: { type: "string" } },
          websocket: { type: ["string", "null"] },
        },
      },
    },
  },
  "x-bindings": { rabbit: {}, websocket: {} },
};
