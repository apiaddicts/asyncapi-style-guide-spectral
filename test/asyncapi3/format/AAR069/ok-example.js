const statement = (action, principal = "arn:aws:iam::345678901234:role/cold-chain") => ({ effect: "Allow", principal, action });

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:aurorapharma:cold-chain",
  info: {
    title: "Aurora Pharma Cold Chain",
    version: "2.4.0",
    description: "Temperature-controlled shipments tracked over AWS SNS and SQS, Google Pub/Sub, Pulsar, IBM MQ, JMS, AMQP and ROS 2.",
  },
  defaultContentType: "application/json",
  servers: {
    jmsErp: {
      host: "activemq.aurorapharma.io:61616",
      protocol: "jms",
      bindings: {
        jms: {
          jmsConnectionFactory: "org.apache.activemq.ActiveMQConnectionFactory",
          properties: [
            { name: "disableTimeStampsByDefault", value: false },
            { name: "redeliveryPolicy.maximumRedeliveries", value: 0 },
          ],
          clientID: "cold-chain-erp",
          bindingVersion: "0.0.1",
        },
        "x-jms": {},
      },
    },
    jmsMirror: { host: "activemq-dr.aurorapharma.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/jmsShared" } },
    kafkaProd: {
      host: "kafka.aurorapharma.io:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.aurorapharma.io", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    rabbitNotify: { host: "rabbit.aurorapharma.io:5671", pathname: "/notify", protocol: "amqps", bindings: { amqp: {}, amqp1: {} } },
    pulsarTelemetry: { host: "pulsar.aurorapharma.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "aurora", bindingVersion: "0.1.0" } } },
    ibmErp: { host: "mq.aurorapharma.io:1414", pathname: "/QM1", protocol: "ibmmq", bindings: { ibmmq: { groupId: "PRODCLSTR1", ccdtQueueManagerName: "QM1" } } },
    warehouseRobots: { host: "ros.aurorapharma.io", protocol: "ros2", bindings: { ros2: { rmwImplementation: "rmw_cyclonedds_cpp", domainId: 7 } } },
    partnerJms: { host: "partner.example.com:61616", protocol: "jms", bindings: { $ref: "./partner-bindings.yaml#/serverBindings/jms" } },
  },
  channels: {
    shipmentDispatched: {
      address: "coldchain.shipments.dispatched.v1",
      title: "Shipment dispatched",
      bindings: {
        amqp: {
          is: "routingKey",
          exchange: { name: "coldchain.shipments", type: "topic", durable: true, autoDelete: false, vhost: "/" },
          bindingVersion: "0.3.0",
        },
        sqs: {
          queue: {
            name: "shipments-dispatched.fifo",
            fifoQueue: true,
            deduplicationScope: "messageGroup",
            redrivePolicy: { deadLetterQueue: { name: "shipments-dispatched-dlq.fifo" }, maxReceiveCount: 4 },
            policy: { statements: [statement("sqs:SendMessage"), statement(["sqs:ReceiveMessage"], ["arn:aws:iam::345678901234:role/carrier"])] },
          },
          deadLetterQueue: { name: "shipments-dispatched-dlq.fifo", fifoQueue: true, messageRetentionPeriod: 1209600 },
          bindingVersion: "0.2.0",
        },
        sns: { name: "shipments-dispatched", ordering: { type: "FIFO", contentBasedDeduplication: true }, policy: { statements: [statement("sns:Publish", "*")] } },
        "x-sqs": {},
      },
      messages: {
        shipmentDispatched: { $ref: "#/components/messages/shipmentDispatched" },
        shipmentDispatchedReplay: {
          name: "shipmentDispatchedReplay",
          contentType: "application/json",
          bindings: { googlepubsub: { orderingKey: "shipmentId" } },
          traits: [[{ $ref: "#/components/messageTraits/pubsubSchema" }, { name: "replayExample" }]],
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: { type: ["object", "null"], properties: { shipmentId: { type: "string", format: "uuid" }, schema: { type: ["string", "null"] } } },
          },
        },
      },
    },
    temperatureReadings: {
      address: "coldchain/{shipmentId}/temperature",
      parameters: { shipmentId: { description: "Shipment identifier.", examples: ["SHP-20261006-0042"] } },
      bindings: {
        googlepubsub: {
          schemaSettings: { encoding: "json", name: "projects/aurora/schemas/temperature-reading", lastRevisionId: "3" },
          messageRetentionDuration: "604800s",
          bindingVersion: "0.2.0",
        },
        pulsar: { namespace: "telemetry", persistence: "persistent", compaction: 0, "geo-replication": ["eu-west", "eu-central"], deduplication: false },
        kafka: { topic: "coldchain.temperature", partitions: 24, replicas: 3, topicConfiguration: { "retention.ms": 2592000000, "cleanup.policy": ["delete"] } },
      },
      messages: {
        temperatureReading: {
          name: "temperatureReading",
          contentType: "application/vnd.apache.avro+json",
          bindings: { googlepubsub: { attributes: { unit: "celsius" } }, kafka: { key: { type: "string" } } },
          traits: [{ $ref: "#/components/messageTraits/pubsubSchema" }],
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "TemperatureReading",
              namespace: "io.aurorapharma.coldchain",
              fields: [
                { name: "celsius", type: "double" },
                { name: "schemaSettings", type: ["null", { type: "record", name: "SchemaSettings", fields: [{ name: "name", type: ["null", "string"] }] }] },
              ],
            },
          },
        },
      },
    },
    erpOrders: {
      address: "ERP.ORDERS.IN",
      bindings: { ibmmq: { destinationType: "queue", queue: { objectName: "ERP.ORDERS.IN", isPartitioned: false, exclusive: true }, maxMsgLength: 4194304 } },
      messages: { erpOrder: { $ref: "#/components/messages/erpOrder" } },
    },
    erpAudit: {
      address: "erp/audit",
      bindings: { ibmmq: { destinationType: "topic", topic: { string: "erp/audit", durablePermitted: true } } },
      messages: { erpOrder: { $ref: "#/components/messages/erpOrder" } },
    },
    robotCommands: {
      address: null,
      description: "Commands for warehouse robots; the ROS 2 topic is resolved at runtime.",
      messages: {
        robotCommand: {
          name: "robotCommand",
          bindings: { googlepubsub: { orderingKey: "robotId" } },
          payload: { type: "object", properties: { command: { type: "string", enum: ["PICK", "PARK"] }, jmsConnectionFactory: { type: ["string", "null"] } } },
        },
        robotAck: { name: "robotAck", payload: { type: "object", properties: { accepted: { type: "boolean" } } } },
      },
    },
    invoices: { address: "billing.invoices", bindings: { $ref: "#/components/channelBindings/sqsInvoices" }, messages: { invoiceIssued: { $ref: "#/components/messages/invoiceIssued" } } },
    auditTrail: { $ref: "#/components/channels/auditTrail" },
    partnerNotifications: {
      address: "partners.notifications",
      messages: { partnerNotification: { name: "partnerNotification", bindings: { googlepubsub: { schema: {} } }, traits: [{ $ref: "./partner-traits.yaml#/messageTraits/pubsub" }] } },
    },
  },
  operations: {
    publishShipmentDispatched: {
      action: "send",
      channel: { $ref: "#/channels/shipmentDispatched" },
      messages: [{ $ref: "#/channels/shipmentDispatched/messages/shipmentDispatched" }],
      bindings: {
        sns: {
          topic: { name: "shipments-dispatched" },
          consumers: [
            {
              protocol: "sqs",
              endpoint: { arn: "arn:aws:sqs:eu-west-1:345678901234:shipments-dispatched.fifo" },
              rawMessageDelivery: false,
              filterPolicy: { temperatureClass: ["2-8C", "frozen"] },
              redrivePolicy: { deadLetterQueue: { name: "shipments-dispatched-dlq.fifo" } },
            },
            { protocol: "https", endpoint: { url: "https://hooks.carrier.example.com/dispatch" }, rawMessageDelivery: true },
          ],
          bindingVersion: "0.1.0",
        },
      },
      traits: [{ $ref: "#/components/operationTraits/snsDelivery" }],
    },
    receiveShipmentDispatched: {
      action: "receive",
      channel: { $ref: "#/channels/shipmentDispatched" },
      bindings: {
        sqs: {
          queues: [{ name: "shipments-dispatched.fifo", fifoQueue: true, policy: { statements: [statement("sqs:ReceiveMessage")] } }, { $ref: "#/components/schemas/QueueReference" }],
          bindingVersion: "0.2.0",
        },
      },
      traits: [{ bindings: { sqs: { bindingVersion: "0.2.0" } } }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/erpOrders" },
        messages: [{ $ref: "#/channels/erpOrders/messages/erpOrder" }],
      },
    },
    sendRobotCommand: {
      action: "send",
      channel: { $ref: "#/channels/robotCommands" },
      bindings: { ros2: { role: "publisher", qosPolicies: { reliability: "best_effort", history: "keep_last" } } },
      traits: [{ $ref: "#/components/operationTraits/rosNode" }],
    },
    receiveRobotAck: {
      action: "receive",
      channel: { $ref: "#/channels/robotCommands" },
      bindings: { ros2: { role: "subscriber", node: "/warehouse/ack_listener" } },
    },
    receiveTemperature: {
      action: "receive",
      channel: { $ref: "#/channels/temperatureReadings" },
      bindings: { kafka: { groupId: { type: "string", enum: ["cold-chain-monitor"] } }, sqs: { queues: [] } },
    },
    publishInvoice: { $ref: "#/components/operations/publishInvoice" },
    notifyPartners: {
      action: "send",
      channel: { $ref: "#/channels/partnerNotifications" },
      bindings: { sns: { topic: { name: "partner-notifications" } } },
      traits: [{ $ref: "./partner-traits.yaml#/operationTraits/snsConsumers" }],
    },
  },
  components: {
    servers: {
      drJms: { host: "activemq-dr2.aurorapharma.io:61616", protocol: "jms", bindings: { jms: { jmsConnectionFactory: "com.ibm.mq.jms.MQConnectionFactory", properties: [] } } },
    },
    channels: {
      auditTrail: {
        address: "coldchain.audit",
        bindings: { pulsar: { namespace: "audit", persistence: "persistent", retention: { time: 30, size: 0 } } },
        messages: { auditEntry: { name: "auditEntry", bindings: { googlepubsub: { schema: { name: "projects/aurora/schemas/audit-entry" } } } } },
      },
    },
    operations: {
      publishInvoice: {
        action: "send",
        channel: { $ref: "#/channels/invoices" },
        bindings: { $ref: "#/components/operationBindings/snsFanout" },
      },
      receiveAudit: {
        action: "receive",
        channel: { $ref: "#/components/channels/auditTrail" },
        bindings: { sns: { consumers: [{ protocol: "firehose", endpoint: { arn: "arn:aws:firehose:eu-west-1:345678901234:audit" }, rawMessageDelivery: true }] } },
      },
    },
    schemas: {
      QueueReference: { type: "object", properties: { name: { type: "string" } } },
      Shipment: { type: "object", properties: { shipmentId: { type: "string", format: "uuid" }, temperatureClass: { type: ["string", "null"] } } },
    },
    messages: {
      shipmentDispatched: {
        name: "shipmentDispatched",
        contentType: "application/json",
        bindings: {
          googlepubsub: { schema: { name: "projects/aurora/schemas/shipment-dispatched" }, orderingKey: "shipmentId", bindingVersion: "0.2.0" },
          kafka: { key: { $ref: "#/components/schemas/Shipment" } },
        },
        payload: { $ref: "#/components/schemas/Shipment" },
      },
      erpOrder: {
        name: "erpOrder",
        bindings: { ibmmq: { type: "jms", expiry: 0 }, googlepubsub: { attributes: { system: "sap" } } },
        traits: [{ $ref: "#/components/messageTraits/pubsubSchema" }],
        payload: { schemaFormat: "application/xml", schema: "<schema/>" },
      },
      invoiceIssued: {
        name: "invoiceIssued",
        bindings: { $ref: "#/components/messageBindings/pubsubKeyed" },
        examples: [{ name: "invoice", payload: { schema: { name: "" } } }],
      },
    },
    messageTraits: {
      pubsubSchema: { bindings: { googlepubsub: { schema: { name: "projects/aurora/schemas/shared" } } } },
      pubsubPartial: { bindings: { googlepubsub: { schema: {} } } },
    },
    operationTraits: {
      snsDelivery: { bindings: { sns: { deliveryPolicy: { numRetries: 3, backoffFunction: "linear" } } } },
      rosNode: { bindings: { ros2: { node: "/warehouse/dispatcher" } } },
      sqsPartial: { bindings: { sqs: { queues: [{}] } } },
    },
    replies: { erpReply: { channel: { $ref: "#/channels/erpOrders" }, messages: [{ $ref: "#/channels/erpOrders/messages/erpOrder" }] } },
    replyAddresses: { erpReplyAddress: { location: "$message.header#/replyTo" } },
    serverBindings: {
      jmsShared: { jms: { jmsConnectionFactory: "org.apache.qpid.jms.JmsConnectionFactory", properties: [{ name: "jms.prefetchPolicy.all", value: 0 }, { name: "jms.forceAsyncSend", value: false }] } },
    },
    channelBindings: {
      sqsInvoices: {
        sqs: {
          queue: { name: "invoices.fifo", fifoQueue: true, fifoThroughputLimit: "perMessageGroupId" },
          deadLetterQueue: { name: "invoices-dlq.fifo", fifoQueue: true, redrivePolicy: { deadLetterQueue: { name: "invoices-parking.fifo" } } },
        },
        SQS: {},
      },
    },
    operationBindings: {
      snsFanout: {
        sns: { consumers: [{ protocol: "email", endpoint: { email: "billing@aurorapharma.io" }, rawMessageDelivery: false, redrivePolicy: { deadLetterQueue: {} } }] },
        ros2: { role: "service_client", node: "/billing/notifier" },
      },
    },
    messageBindings: { pubsubKeyed: { googlepubsub: { schema: { name: "projects/aurora/schemas/invoice" }, orderingKey: "invoiceId" } } },
  },
};
