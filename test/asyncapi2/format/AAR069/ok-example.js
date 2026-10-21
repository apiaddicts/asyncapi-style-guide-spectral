const statement = (action, principal = "arn:aws:iam::210987654321:role/fulfilment") => ({ effect: "Allow", principal, action });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:orbitalfreight:fulfilment",
  info: {
    title: "Orbital Freight Fulfilment Mesh",
    version: "4.3.0",
    description: "Order fulfilment events exchanged over JMS, AMQP, AWS SNS and SQS, Google Pub/Sub, Pulsar, IBM MQ and ROS 2.",
  },
  defaultContentType: "application/json",
  servers: {
    jmsPrimary: {
      url: "tcp://activemq.orbitalfreight.io:61616",
      protocol: "jms",
      bindings: {
        jms: {
          jmsConnectionFactory: "org.apache.activemq.ActiveMQConnectionFactory",
          properties: [
            { name: "disableTimeStampsByDefault", value: false },
            { name: "prefetchPolicy.queuePrefetch", value: 0 },
            { name: "brokerURL", value: "failover:(tcp://a:61616,tcp://b:61616)" },
          ],
          clientID: "fulfilment-gateway",
          bindingVersion: "0.0.1",
        },
        "x-jms": {},
      },
    },
    jmsMirror: { url: "tcp://activemq-dr.orbitalfreight.io:61616", protocol: "jms", bindings: { $ref: "#/components/serverBindings/jmsShared" } },
    kafkaProd: {
      url: "kafka.orbitalfreight.io:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.orbitalfreight.io", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    rabbitProd: { url: "amqps://rabbit.orbitalfreight.io:5671/fulfilment", protocol: "amqps", bindings: { amqp: {}, amqp1: {} } },
    pulsarCluster: { url: "pulsar+ssl://pulsar.orbitalfreight.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "orbital", bindingVersion: "0.1.0" } } },
    ibmQueue: { url: "ibmmq://mq.orbitalfreight.io:1414/QM1", protocol: "ibmmq", bindings: { ibmmq: { groupId: "PRODCLSTR1", cipherSpec: "ANY_TLS12_OR_HIGHER" } } },
    edgeRobots: { url: "ros2://fleet.orbitalfreight.io", protocol: "ros2", bindings: { ros2: { rmwImplementation: "rmw_fastrtps_cpp", domainId: 12 } } },
    partnerJms: { url: "tcp://partner.example.com:61616", protocol: "jms", bindings: { $ref: "./partner-bindings.yaml#/serverBindings/jms" } },
  },
  channels: {
    "fulfilment.orders.placed.v1": {
      description: "Orders accepted by the storefront and routed to the warehouses.",
      bindings: {
        amqp: {
          is: "queue",
          queue: { name: "fulfilment.orders.placed", durable: true, exclusive: false, autoDelete: false, vhost: "/fulfilment" },
          bindingVersion: "0.3.0",
        },
        sqs: {
          queue: {
            name: "orders-placed",
            fifoQueue: false,
            deliveryDelay: 0,
            visibilityTimeout: 30,
            redrivePolicy: { deadLetterQueue: { arn: "arn:aws:sqs:eu-west-1:210987654321:orders-placed-dlq" }, maxReceiveCount: 5 },
            policy: { statements: [statement("sqs:SendMessage"), statement(["sqs:ReceiveMessage", "sqs:DeleteMessage"], ["arn:aws:iam::210987654321:role/picker"])] },
            tags: { owner: "fulfilment" },
          },
          deadLetterQueue: { name: "orders-placed-dlq", fifoQueue: false, messageRetentionPeriod: 1209600 },
          bindingVersion: "0.2.0",
        },
        sns: {
          name: "orders-placed",
          ordering: { type: "standard", contentBasedDeduplication: false },
          policy: { statements: [statement("sns:Publish", "*")] },
          tags: { domain: "orders" },
        },
        "x-sqs": {},
      },
      publish: {
        operationId: "publishOrderPlaced",
        summary: "Fan the accepted order out to every warehouse.",
        bindings: {
          sns: {
            topic: { name: "orders-placed" },
            consumers: [
              {
                protocol: "sqs",
                endpoint: { arn: "arn:aws:sqs:eu-west-1:210987654321:orders-placed" },
                rawMessageDelivery: false,
                filterPolicy: { warehouse: ["MAD-1", "BCN-2"] },
                redrivePolicy: { deadLetterQueue: { name: "orders-placed-dlq" }, maxReceiveCount: 10 },
              },
              { protocol: "https", endpoint: { url: "https://hooks.partner.example.com/orders" }, rawMessageDelivery: true, displayName: "Partner webhook" },
            ],
            deliveryPolicy: { minDelayTarget: 1, maxDelayTarget: 120, numRetries: 5, backoffFunction: "exponential" },
            bindingVersion: "0.1.0",
          },
        },
        traits: [{ $ref: "#/components/operationTraits/snsDelivery" }],
        message: { $ref: "#/components/messages/orderPlaced" },
      },
      subscribe: {
        operationId: "receiveOrderPlaced",
        summary: "Warehouses pull accepted orders from SQS.",
        bindings: {
          sqs: {
            queues: [
              { name: "orders-placed", fifoQueue: false, policy: { statements: [statement("sqs:ReceiveMessage")] } },
              { $ref: "#/components/schemas/QueueReference" },
            ],
            bindingVersion: "0.2.0",
          },
        },
        traits: [{ bindings: { sqs: { bindingVersion: "0.2.0" } } }],
        message: {
          oneOf: [
            { $ref: "#/components/messages/orderPlaced" },
            {
              name: "orderPlacedReplay",
              contentType: "application/json",
              bindings: { googlepubsub: { orderingKey: "orderId" } },
              traits: [[{ $ref: "#/components/messageTraits/pubsubSchema" }, { name: "replayExample" }]],
              payload: { type: "object", properties: { orderId: { type: "string", format: "uuid" } } },
            },
          ],
        },
      },
    },
    "fleet/{vehicleId}/commands": {
      description: "Dispatch commands sent to autonomous yard tractors over ROS 2.",
      parameters: { vehicleId: { description: "Tractor identifier.", schema: { type: "string", pattern: "^YT-[0-9]{3}$" } } },
      subscribe: {
        operationId: "receiveDispatchCommand",
        bindings: { ros2: { role: "subscriber", qosPolicies: { reliability: "best_effort", history: "keep_last" } } },
        traits: [{ $ref: "#/components/operationTraits/rosNode" }],
        message: {
          name: "dispatchCommand",
          contentType: "application/json",
          bindings: { googlepubsub: { orderingKey: "vehicleId", attributes: { source: "dispatcher" } } },
          traits: [{ $ref: "#/components/messageTraits/pubsubSchema" }],
          payload: {
            type: "object",
            properties: {
              command: { type: "string", enum: ["MOVE", "PARK", "CHARGE"] },
              jmsConnectionFactory: { type: ["string", "null"] },
              bindings: { type: ["object", "null"], properties: { ros2: { type: "string" } } },
            },
          },
        },
      },
      publish: {
        operationId: "publishDispatchAck",
        bindings: { ros2: { role: "publisher", node: "/fleet/dispatcher" } },
        message: { name: "dispatchAck", payload: { type: "object", properties: { accepted: { type: "boolean" } } } },
      },
    },
    "inventory.adjusted": {
      description: "Stock adjustments mirrored to Google Pub/Sub, Pulsar and IBM MQ.",
      bindings: {
        googlepubsub: {
          schemaSettings: { encoding: "binary", name: "projects/orbital/schemas/inventory-adjusted", firstRevisionId: "1" },
          messageRetentionDuration: "86400s",
          bindingVersion: "0.2.0",
        },
        pulsar: { namespace: "inventory", persistence: "non-persistent", compaction: 0, "geo-replication": [], ttl: 0, deduplication: false },
        ibmmq: { destinationType: "queue", queue: { objectName: "INVENTORY.ADJUSTED", isPartitioned: false }, maxMsgLength: 4194304 },
        kafka: { topic: "inventory.adjusted", partitions: 6, topicConfiguration: { "cleanup.policy": ["compact"], "retention.ms": -1 } },
      },
      subscribe: {
        operationId: "receiveInventoryAdjusted",
        bindings: { kafka: { groupId: { type: "string" } }, sqs: { queues: [] } },
        message: { $ref: "#/components/messages/inventoryAdjusted" },
      },
    },
    "inventory.audit": {
      description: "IBM MQ topic for audit subscribers.",
      bindings: { ibmmq: { destinationType: "topic", topic: { string: "inventory/audit", durablePermitted: true } } },
      subscribe: { operationId: "receiveInventoryAudit", message: { $ref: "#/components/messages/inventoryAdjusted" } },
    },
    "billing.invoices": {
      description: "Invoices queued for the billing service.",
      bindings: { $ref: "#/components/channelBindings/sqsInvoices" },
      publish: {
        operationId: "publishInvoice",
        bindings: { $ref: "#/components/operationBindings/snsFanout" },
        message: { $ref: "#/components/messages/invoiceIssued" },
      },
    },
    "audit.trail": { $ref: "#/components/channels/auditTrail" },
    "audit.trail.replica": { $ref: "#/components/channels/auditTrail" },
    "partners.notifications": {
      description: "Partner notifications whose traits live in a shared file.",
      publish: {
        operationId: "publishPartnerNotification",
        bindings: { sns: { topic: { name: "partner-notifications" } } },
        traits: [{ $ref: "./partner-traits.yaml#/operationTraits/snsConsumers" }],
        message: { name: "partnerNotification", bindings: { googlepubsub: { schema: {} } }, traits: [{ $ref: "./partner-traits.yaml#/messageTraits/pubsub" }] },
      },
    },
  },
  components: {
    servers: {
      drJms: {
        url: "tcp://activemq-dr2.orbitalfreight.io:61616",
        protocol: "jms",
        bindings: { jms: { jmsConnectionFactory: "com.ibm.mq.jms.MQConnectionFactory", properties: [] } },
      },
    },
    channels: {
      auditTrail: {
        description: "Compliance audit trail stored in Pulsar.",
        bindings: { pulsar: { namespace: "audit", persistence: "persistent", retention: { time: 30, size: 0 } } },
        publish: {
          operationId: "publishAuditEntry",
          bindings: { sns: { consumers: [{ protocol: "firehose", endpoint: { arn: "arn:aws:firehose:eu-west-1:210987654321:audit" }, rawMessageDelivery: true }] } },
          message: { name: "auditEntry", bindings: { googlepubsub: { schema: { name: "projects/orbital/schemas/audit-entry" } } } },
        },
      },
    },
    schemas: {
      QueueReference: { type: "object", properties: { name: { type: "string" } } },
      Order: { type: "object", properties: { orderId: { type: "string", format: "uuid" }, total: { type: "number", minimum: 0 } } },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        contentType: "application/json",
        bindings: {
          googlepubsub: { schema: { name: "projects/orbital/schemas/order-placed" }, orderingKey: "orderId", bindingVersion: "0.2.0" },
          kafka: { key: { $ref: "#/components/schemas/Order" } },
        },
        payload: { $ref: "#/components/schemas/Order" },
      },
      inventoryAdjusted: {
        name: "inventoryAdjusted",
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        bindings: { googlepubsub: { attributes: { region: "eu" } } },
        traits: [{ $ref: "#/components/messageTraits/pubsubSchema" }],
        payload: {
          type: "record",
          name: "InventoryAdjusted",
          namespace: "io.orbitalfreight.inventory",
          fields: [
            { name: "sku", type: "string" },
            { name: "schema", type: ["null", { type: "record", name: "SchemaRef", fields: [{ name: "name", type: ["null", "string"] }] }] },
          ],
        },
      },
      invoiceIssued: {
        name: "invoiceIssued",
        bindings: { $ref: "#/components/messageBindings/pubsubKeyed" },
        examples: [{ name: "invoice", payload: { schema: { name: "" } } }],
      },
      shipmentEvents: {
        oneOf: [
          { name: "shipmentDispatched", bindings: { googlepubsub: { schema: { name: "projects/orbital/schemas/shipment-dispatched" } } } },
          { $ref: "#/components/messages/orderPlaced" },
        ],
      },
    },
    messageTraits: {
      pubsubSchema: { bindings: { googlepubsub: { schema: { name: "projects/orbital/schemas/shared" } } } },
      pubsubPartial: { bindings: { googlepubsub: { schema: {} } } },
    },
    operationTraits: {
      snsDelivery: { bindings: { sns: { deliveryPolicy: { numRetries: 3 } } } },
      rosNode: { bindings: { ros2: { node: "/fleet/yard_tractor" } } },
      sqsPartial: { bindings: { sqs: { queues: [{}] } } },
    },
    serverBindings: {
      jmsShared: { jms: { jmsConnectionFactory: "org.apache.qpid.jms.JmsConnectionFactory", properties: [{ name: "jms.prefetchPolicy.all", value: 0 }, { name: "jms.forceAsyncSend", value: false }] } },
    },
    channelBindings: {
      sqsInvoices: {
        sqs: {
          queue: { name: "invoices.fifo", fifoQueue: true, deduplicationScope: "messageGroup", fifoThroughputLimit: "perMessageGroupId" },
          deadLetterQueue: { name: "invoices-dlq.fifo", fifoQueue: true, redrivePolicy: { deadLetterQueue: { name: "invoices-parking.fifo" } } },
        },
        SQS: {},
      },
    },
    operationBindings: {
      snsFanout: {
        sns: { consumers: [{ protocol: "email", endpoint: { email: "billing@orbitalfreight.io" }, rawMessageDelivery: false, redrivePolicy: { deadLetterQueue: {} } }] },
        ros2: { role: "service_client", node: "/billing/notifier" },
      },
    },
    messageBindings: { pubsubKeyed: { googlepubsub: { schema: { name: "projects/orbital/schemas/invoice" }, orderingKey: "invoiceId" } } },
  },
};
