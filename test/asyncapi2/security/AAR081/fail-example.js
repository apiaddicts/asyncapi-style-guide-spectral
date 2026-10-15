module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:payments",
  info: {
    title: "Quality Payments Event Backbone",
    version: "3.8.1",
    description: "Payment authorisations, settlements and fraud alerts.",
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: { url: "kafka-secure://kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant production cluster." },
    partnerKafka: { url: "kafka://kafka.payments-partner.com:9092", protocol: "kafka", description: "Acquirer cluster outside the organization." },
    localKafka: { url: "localhost:9092", protocol: "kafka", description: "Developer broker." },
    fraudMqtt: { url: "mqtt://10.20.0.15:1883", protocol: "mqtt" },
    regionalKafka: { url: "eu.kafka.quality.es:9093", protocol: "kafka-secure" },
    settlementsAmqp: { url: "AMQPS://RABBIT.QUALITY.ES:5671", protocol: "amqps" },
    cardsWs: { url: "wss://quality.es.cdn-edge.net/cards", protocol: "wss" },
    bootstrapList: { url: "broker-0.quality.es:9093,broker-1.quality.es:9093,10.0.4.21:9093", protocol: "kafka-secure" },
    hostVariable: {
      url: "{host}",
      protocol: "kafka",
      variables: { host: { enum: ["kafka.quality.es:9092", "kafka.staging.internal:9092"], default: "kafka.quality.es:9092" } },
    },
    environmentDefault: {
      url: "{environment}.quality.es:{port}",
      protocol: "kafka",
      variables: { environment: { enum: ["kafka-dev", "kafka-pro"], default: "sandbox.local" }, port: { default: "9092" } },
    },
    tenantGateway: { url: "{tenant}.quality.es", protocol: "wss", variables: { tenant: { description: "Merchant tenant." } } },
    sharedRegion: { url: "payments-{region}.quality.es", protocol: "kafka", variables: { region: { $ref: "#/components/serverVariables/region" } } },
    relativeWs: { url: "/payments/stream", protocol: "wss" },
    emptyUrl: { url: "", protocol: "kafka" },
    numericUrl: { url: 9092, protocol: "kafka" },
    trailingDot: { url: "kafka.quality.es.:9093", protocol: "kafka-secure" },
    underscoreHost: { url: "kafka_payments.quality.es:9093", protocol: "kafka-secure" },
    ipv6Broker: { url: "[fd00::12]:9092", protocol: "kafka" },
    "x-legacy": { url: "legacy-payments.example.org", protocol: "kafka", "x-url": "kafka.quality.es" },
    drKafka: { $ref: "#/components/servers/drKafka" },
    drKafkaMirror: { $ref: "#/components/servers/drKafka" },
  },
  channels: {
    "payments.cdc.authorisations.created.v3": {
      servers: ["kafkaProd", "partnerKafka"],
      subscribe: {
        operationId: "receiveAuthorisation",
        message: { name: "authorisationCreated", payload: { type: "object", properties: { url: { type: "string", default: "evil.example.org" } } } },
      },
    },
  },
  components: {
    servers: {
      drKafka: { url: "kafka-dr.payments.example.org:9093", protocol: "kafka-secure" },
      archive: { url: "archive.quality.es", protocol: "kafka" },
      sandbox: { url: "kafka://sandbox.quality.es.test:9092", protocol: "kafka" },
    },
    serverVariables: { region: { enum: ["eu", "us", "eu.west"], default: "eu" } },
  },
};
