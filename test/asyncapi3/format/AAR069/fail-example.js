module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:aurorapharma:cold-chain-legacy",
  info: {
    title: "Aurora Pharma Legacy Cold Chain",
    version: "1.9.4",
    description: "Legacy cold chain flows whose bindings still miss fields required by their protocol binding specifications.",
  },
  defaultContentType: "application/json",
  servers: {
    jmsPrimary: {
      host: "activemq.aurorapharma.io:61616",
      protocol: "jms",
      bindings: { jms: { clientID: "cold-chain-legacy", properties: [{ name: "prefetch", value: 50 }, { value: "x" }, { name: "selector" }], bindingVersion: "0.0.1" } },
    },
    jmsBlank: { host: "activemq-b.aurorapharma.io:61616", protocol: "jms", bindings: { jms: { jmsConnectionFactory: "  " } } },
    pulsarTelemetry: { host: "pulsar.aurorapharma.io:6651", protocol: "pulsar+ssl", bindings: { pulsar: { tenant: "aurora" } } },
  },
  channels: {
    shipmentDispatched: {
      address: "coldchain.shipments.dispatched.v1",
      bindings: {
        amqp: { is: "routingKey", bindingVersion: "0.3.0" },
        sqs: {
          queue: {
            name: "shipments-dispatched",
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
      messages: {
        shipmentDispatched: { $ref: "#/components/messages/shipmentDispatchedAvro" },
        shipmentDispatchedLegacy: {
          name: "shipmentDispatchedLegacy",
          bindings: { googlepubsub: { schema: { type: "avro" } } },
          traits: [{ $ref: "#/components/messageTraits/pubsubOrdering" }],
        },
        shipmentDispatchedTuple: { name: "shipmentDispatchedTuple", traits: [[{ bindings: { googlepubsub: { schema: { name: "" } } } }, { name: "ignored" }]] },
      },
    },
    temperatureReadings: {
      address: null,
      description: "Temperature readings; the address is resolved per shipment at runtime.",
      bindings: {
        googlepubsub: { messageRetentionDuration: "600s" },
        ibmmq: { destinationType: "queue", queue: { exclusive: true } },
        pulsar: null,
      },
      messages: { temperatureReading: { $ref: "#/components/messages/temperatureReading" } },
    },
    auditTrail: { $ref: "#/components/channels/auditTrail" },
    auditTrailReplica: { $ref: "#/components/channels/auditTrail" },
    invoices: { address: "billing.invoices", bindings: { $ref: "#/components/channelBindings/sqsInvoices" } },
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
            { protocol: "sqs", endpoint: { name: "shipments-dispatched" } },
            { protocol: "lambda", endpoint: { arn: "arn:aws:lambda:eu-west-1:345678901234:function:router" }, rawMessageDelivery: false, redrivePolicy: { maxReceiveCount: 5 } },
          ],
        },
      },
      traits: [{ $ref: "#/components/operationTraits/sqsReader" }, { bindings: { ros2: { node: "/coldchain/router" } } }],
    },
    receiveShipmentDispatched: {
      action: "receive",
      channel: { $ref: "#/channels/shipmentDispatched" },
      bindings: { sqs: { queues: [] }, ros2: { role: "subscriber" } },
      reply: { channel: { $ref: "#/channels/temperatureReadings" }, messages: [{ $ref: "#/channels/temperatureReadings/messages/temperatureReading" }] },
    },
    receiveTemperature: {
      action: "receive",
      channel: { $ref: "#/channels/temperatureReadings" },
      bindings: {
        sqs: {
          queues: [
            {
              name: "temperature",
              policy: { statements: [{ effect: "Deny", principal: ["*"], action: [] }, {}] },
            },
          ],
        },
      },
    },
    publishAudit: { $ref: "#/components/operations/publishAudit" },
  },
  components: {
    servers: { drJms: { host: "activemq-dr.aurorapharma.io:61616", protocol: "jms", bindings: { jms: { properties: [] } } } },
    channels: {
      auditTrail: {
        address: "coldchain.audit",
        bindings: { pulsar: { namespace: "audit" } },
        messages: { auditEntry: { name: "auditEntry", bindings: { googlepubsub: { schema: { name: null } } } } },
      },
    },
    operations: {
      publishAudit: { action: "send", channel: { $ref: "#/components/channels/auditTrail" }, bindings: { sns: {} } },
    },
    messages: {
      temperatureReading: { name: "temperatureReading", bindings: { googlepubsub: { schema: { name: "projects/aurora/schemas/temperature" } } } },
      shipmentDispatchedAvro: {
        name: "shipmentDispatchedAvro",
        bindings: { googlepubsub: { schema: {} } },
        traits: [{ $ref: "#/components/messageTraits/pubsubSchema" }],
      },
      shipmentEvents: { name: "shipmentEvents", bindings: { googlepubsub: { schema: {} } } },
    },
    messageTraits: {
      pubsubOrdering: { bindings: { googlepubsub: { orderingKey: "shipmentId" } } },
      pubsubSchema: { bindings: { googlepubsub: { schema: { name: "projects/aurora/schemas/shipment" } } } },
      pubsubPartial: { bindings: { googlepubsub: { schema: {} } } },
    },
    operationTraits: {
      sqsReader: { bindings: { sqs: { queues: [{ name: "shipments-dispatched" }, { redrivePolicy: {} }] } } },
      rosNodeOnly: { bindings: { ros2: { node: "/unused" } } },
    },
    serverBindings: { jmsShared: { jms: { properties: [{ name: "jms.prefetchPolicy.all", value: null }] } } },
    channelBindings: { sqsInvoices: { sqs: { deadLetterQueue: { name: "invoices-dlq", fifoQueue: true } } } },
    operationBindings: {
      snsFanout: {
        sns: { consumers: [{ protocol: "email", endpoint: { email: "ops@aurorapharma.io" }, rawMessageDelivery: true, redrivePolicy: { deadLetterQueue: {} } }] },
        ros2: {},
      },
    },
    messageBindings: { pubsubKeyed: { googlepubsub: { schema: { name: "   " } } } },
  },
};
