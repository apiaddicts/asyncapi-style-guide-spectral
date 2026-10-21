module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:insurance:partner-exchange",
  info: {
    title: "Quality Insurance Partner Exchange",
    version: "2.7.0",
    description: "Claims, reinsurance cessions and broker quotes exchanged with partners and cloud providers.",
  },
  defaultContentType: "application/json",
  servers: {
    claimsKafka: { url: "kafka-secure://kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant production cluster." },
    confluentCloud: { url: "SASL_SSL://pkc-4nym6.eu-west-1.aws.confluent.cloud:9092", protocol: "kafka-secure", description: "Managed cluster outside the organization." },
    amazonMsk: {
      url: "b-1.claims.abc123.c2.kafka.eu-west-1.amazonaws.com:9094,b-2.claims.abc123.c2.kafka.eu-west-1.amazonaws.com:9094",
      protocol: "kafka-secure",
    },
    eventHubs: { url: "orders.servicebus.windows.net:9093", protocol: "kafka-secure" },
    hivemqCloud: { url: "mqtts://a1b2c3.s1.eu.hivemq.cloud:8883", protocol: "secure-mqtt" },
    cloudAmqp: { url: "amqps://claims:s3cr3t@goose.rmq2.cloudamqp.com/claims", protocol: "amqps" },
    clusterLocal: { url: "kafka.events.svc.cluster.local:9092", protocol: "kafka" },
    typoDomain: { url: "kafka.qualty.es:9093", protocol: "kafka-secure" },
    suffixAttack: { url: "kafka.quality.es.evil.net:9093", protocol: "kafka-secure" },
    encodedDot: { url: "kafka%2Equality.es:9093", protocol: "kafka-secure" },
    zoneIpv6: { url: "kafka://[fe80::1%25eth0]:9092", protocol: "kafka" },
    nestedSubdomain: { url: "claims.eu.quality.es:9093", protocol: "kafka-secure" },
    upperDomain: { url: "wss://adjusters.Quality.Es/feed", protocol: "wss" },
    variableDefaultForeign: {
      url: "{env}.quality.es:9093",
      protocol: "kafka-secure",
      variables: { env: { enum: ["claims-dev", "claims-pro"], default: "claims.partner", description: "Target environment." } },
    },
    variableRefChain: { url: "{cluster}", protocol: "kafka-secure", variables: { cluster: { $ref: "#/components/serverVariables/clusterAlias" } } },
    unresolvedPlaceholder: { url: "{tenant}.quality.es", protocol: "wss", variables: { tenant: { description: "Broker tenant chosen at runtime." } } },
    portVariableForeignHost: { url: "kafka.reinsurer.example.org:{port}", protocol: "kafka", variables: { port: { enum: ["9092", "9093"], default: "9093" } } },
    listWithVariable: { url: "broker-0.quality.es:9093,{fallback}:9093", protocol: "kafka-secure", variables: { fallback: { default: "dr.reinsurer.example.org" } } },
    objectUrl: { url: { host: "kafka.quality.es", port: 9093 }, protocol: "kafka-secure" },
    arrayUrl: { url: ["kafka.quality.es:9093"], protocol: "kafka-secure" },
    emptyAfterScheme: { url: "kafka://", protocol: "kafka" },
    urnUrl: { url: "urn:quality:claims:events", protocol: "kafka" },
    "x-partner": { url: "kafka.broker-partner.example.org:9092", protocol: "kafka" },
    reinsurerRef: { $ref: "#/components/servers/reinsurer" },
    reinsurerRefAgain: { $ref: "#/components/servers/reinsurer" },
  },
  channels: {
    "insurance.cdc.cessions.created.v1": {
      servers: ["claimsKafka", "confluentCloud", "reinsurerRef"],
      subscribe: {
        operationId: "receiveCession",
        message: {
          name: "cessionCreated",
          payload: { type: "object", properties: { reinsurerUrl: { type: "string", default: "kafka://kafka.reinsurer.example.org:9093" } } },
          examples: [{ name: "quotaShare", payload: { reinsurerUrl: "https://reinsurer.example.org" } }],
        },
      },
    },
  },
  components: {
    servers: {
      reinsurer: { url: "kafka.reinsurer.example.org:9093", protocol: "kafka-secure", description: "Reinsurer cluster shared by reference." },
      legacyIp: { url: "10.10.4.20:9092", protocol: "kafka" },
      compliant: { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure" },
    },
    serverVariables: {
      cluster: { enum: ["kafka.quality.es:9093", "kafka.reinsurer.example.org:9093"], default: "kafka.quality.es:9093" },
      clusterAlias: { $ref: "#/components/serverVariables/cluster" },
    },
  },
};
