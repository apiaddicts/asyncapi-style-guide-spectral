module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:orbitalfreight:fulfilment-legacy",
  info: {
    title: "Orbital Freight Legacy Fulfilment",
    version: "3.9.1",
    description: "Legacy fulfilment flows whose bindings still miss fields required by their protocol binding specifications.",
  },
  defaultContentType: "application/json",
  servers: {
    jmsPrimary: {
      url: "tcp://activemq.orbitalfreight.io:61616",
      protocol: "jms",
      bindings: {
        jms: {
          clientID: "fulfilment-legacy",
          properties: [{ name: "prefetch", value: 50 }, { value: "x" }, { name: "selector" }],
          bindingVersion: "0.0.1",
        },
      },
    },
    jmsBlank: { url: "tcp://activemq-b.orbitalfreight.io:61616", protocol: "jms", bindings: { jms: { jmsConnectionFactory: "  " } } },
    pulsarCluster: { url: "pulsar+ssl://pulsar.orbitalfreight.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "orbital" } } },
  },
  channels: {
    "fulfilment.orders.placed.v1": {
      description: "Orders accepted by the storefront.",
      bindings: {
        amqp: { is: "routingKey", bindingVersion: "0.3.0" },
        sqs: {
          queue: {
            name: "orders-placed",
            policy: {
              statements: [
                { effect: "Allow", principal: "*" },
                { principal: "*", action: "sqs:SendMessage" },
              ],
            },
          },
          deadLetterQueue: { fifoQueue: false },
        },
        sns: { ordering: { contentBasedDeduplication: true }, policy: {} },
      },
      publish: {
        operationId: "publishOrderPlaced",
        bindings: {
          sns: {
            topic: { name: "orders-placed" },
            consumers: [
              { protocol: "sqs", endpoint: { name: "orders-placed" } },
              { protocol: "lambda", endpoint: { arn: "arn:aws:lambda:eu-west-1:210987654321:function:router" }, rawMessageDelivery: false, redrivePolicy: { maxReceiveCount: 5 } },
            ],
          },
        },
        traits: [{ $ref: "#/components/operationTraits/sqsReader" }, { bindings: { ros2: { node: "/fulfilment/router" } } }],
        message: {
          name: "orderPlaced",
          bindings: { googlepubsub: { schema: { type: "avro" } } },
          traits: [{ $ref: "#/components/messageTraits/pubsubOrdering" }],
        },
      },
      subscribe: {
        operationId: "receiveOrderPlaced",
        bindings: { sqs: { queues: [] }, ros2: { role: "subscriber" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/orderPlacedAvro" },
            { name: "orderPlacedLegacy", bindings: { googlepubsub: { schema: {} } } },
            { name: "orderPlacedTuple", traits: [[{ bindings: { googlepubsub: { schema: { name: "" } } } }, { name: "ignored" }]] },
          ],
        },
      },
    },
    "fleet/{vehicleId}/telemetry": {
      description: "Yard tractor telemetry.",
      parameters: { vehicleId: { description: "Tractor identifier.", schema: { type: "string" } } },
      bindings: {
        googlepubsub: { messageRetentionDuration: "600s" },
        ibmmq: { destinationType: "queue", queue: { exclusive: true } },
        pulsar: null,
      },
      subscribe: {
        operationId: "receiveTelemetry",
        bindings: {
          sqs: {
            queues: [
              {
                name: "telemetry",
                policy: {
                  statements: [{ effect: "Deny", principal: ["*"], action: [] }, {}],
                },
              },
            ],
          },
        },
        message: { $ref: "#/components/messages/vehicleTelemetry" },
      },
    },
    "audit.trail": { $ref: "#/components/channels/auditTrail" },
    "audit.trail.replica": { $ref: "#/components/channels/auditTrail" },
    "billing.invoices": {
      description: "Invoices queued for billing.",
      bindings: { $ref: "#/components/channelBindings/sqsInvoices" },
      publish: { operationId: "publishInvoice", message: { name: "invoiceIssued", payload: { type: "object" } } },
    },
  },
  components: {
    servers: { drJms: { url: "tcp://activemq-dr.orbitalfreight.io:61616", protocol: "jms", bindings: { jms: { properties: [] } } } },
    channels: {
      auditTrail: {
        description: "Compliance audit trail.",
        bindings: { pulsar: { namespace: "audit" } },
        publish: {
          operationId: "publishAuditEntry",
          bindings: { sns: {} },
          message: { name: "auditEntry", bindings: { googlepubsub: { schema: { name: null } } } },
        },
      },
    },
    messages: {
      vehicleTelemetry: { name: "vehicleTelemetry", bindings: { googlepubsub: { schema: { name: "projects/orbital/schemas/telemetry" } } } },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        bindings: { googlepubsub: { schema: {} } },
        traits: [{ $ref: "#/components/messageTraits/pubsubSchema" }],
      },
      shipmentEvents: { oneOf: [{ name: "shipmentDispatched", bindings: { googlepubsub: { schema: {} } } }] },
    },
    messageTraits: {
      pubsubOrdering: { bindings: { googlepubsub: { orderingKey: "orderId" } } },
      pubsubSchema: { bindings: { googlepubsub: { schema: { name: "projects/orbital/schemas/order" } } } },
      pubsubPartial: { bindings: { googlepubsub: { schema: {} } } },
    },
    operationTraits: {
      sqsReader: { bindings: { sqs: { queues: [{ name: "orders-placed" }, { redrivePolicy: {} }] } } },
      rosNodeOnly: { bindings: { ros2: { node: "/unused" } } },
    },
    serverBindings: { jmsShared: { jms: { properties: [{ name: "jms.prefetchPolicy.all", value: null }] } } },
    channelBindings: { sqsInvoices: { sqs: { deadLetterQueue: { name: "invoices-dlq", fifoQueue: true } } } },
    operationBindings: {
      snsFanout: {
        sns: { consumers: [{ protocol: "email", endpoint: { email: "ops@orbitalfreight.io" }, rawMessageDelivery: true, redrivePolicy: { deadLetterQueue: {} } }] },
        ros2: {},
      },
    },
    messageBindings: { pubsubKeyed: { googlepubsub: { schema: { name: "   " } } } },
  },
};
