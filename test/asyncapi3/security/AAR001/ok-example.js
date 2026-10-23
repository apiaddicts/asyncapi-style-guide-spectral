module.exports = {
  asyncapi: "3.0.0",
  info: {
    title: "Payments Events",
    version: "4.0.0",
    description: "Payment lifecycle events, every server over a secure transport.",
  },
  servers: {
    "gateway-https": { host: "payments.quality.es", pathname: "/events", protocol: "https" },
    "dashboard-wss": { host: "payments.quality.es", pathname: "/live", protocol: "wss" },
    "ledger-amqps": { host: "rabbit.quality.es:5671", protocol: "amqps" },
    "payments-kafka": {
      host: "broker.quality.es:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", bindingVersion: "0.5.0" } },
    },
    "terminals-mqtt": { host: "mqtt.quality.es:8883", protocol: "secure-mqtt" },
    "shared-kafka": { $ref: "#/components/servers/sharedKafka" },
    "unset-protocol": { host: "unset.quality.es", protocol: null },
  },
  channels: {
    paymentSettled: {
      address: "payments.payment-settled.v1",
      "x-protocol": "http",
      messages: {
        paymentSettled: {
          name: "paymentSettled",
          payload: { type: "object", properties: { amount: { type: "number" }, protocol: { type: "string" } } },
        },
      },
      bindings: { amqp: { is: "routingKey", exchange: { name: "payments", type: "topic" } } },
    },
  },
  operations: {
    onPaymentSettled: {
      action: "receive",
      channel: { $ref: "#/channels/paymentSettled" },
      messages: [{ $ref: "#/channels/paymentSettled/messages/paymentSettled" }],
    },
  },
  components: {
    servers: {
      sharedKafka: { host: "broker-dr.quality.es:9093", protocol: "kafka-secure" },
      notReferencedHttp: { host: "internal.quality.es", protocol: "http" },
      notReferencedKafka: { host: "broker-internal.quality.es:9092", protocol: "kafka" },
    },
  },
};
