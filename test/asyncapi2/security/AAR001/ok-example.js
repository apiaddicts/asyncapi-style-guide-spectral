module.exports = {
  asyncapi: "2.6.0",
  info: {
    title: "Payments Events",
    version: "3.0.0",
    description: "Payment lifecycle events, every server over a secure transport.",
  },
  servers: {
    "gateway-https": { url: "https://payments.quality.es/events", protocol: "https" },
    "dashboard-wss": { url: "wss://payments.quality.es/live", protocol: "wss" },
    "ledger-amqps": { url: "rabbit.quality.es:5671", protocol: "amqps" },
    "payments-kafka": {
      url: "broker.quality.es:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", bindingVersion: "0.4.0" } },
    },
    "terminals-mqtt": { url: "mqtt.quality.es:8883", protocol: "secure-mqtt" },
    "shared-kafka": { $ref: "#/components/servers/sharedKafka" },
    "unset-protocol": { url: "https://unset.quality.es", protocol: null },
  },
  channels: {
    "payments.payment-settled.v1": {
      description: "A payment was settled.",
      "x-protocol": "http",
      bindings: { amqp: { is: "routingKey", exchange: { name: "payments", type: "topic" } } },
      subscribe: {
        operationId: "onPaymentSettled",
        message: {
          name: "paymentSettled",
          payload: { type: "object", properties: { amount: { type: "number" }, protocol: { type: "string" } } },
        },
      },
    },
  },
  components: {
    servers: {
      sharedKafka: { url: "broker-dr.quality.es:9093", protocol: "kafka-secure" },
      notReferencedHttp: { url: "http://internal.quality.es", protocol: "http" },
      notReferencedKafka: { url: "broker-internal.quality.es:9092", protocol: "kafka" },
    },
  },
};
