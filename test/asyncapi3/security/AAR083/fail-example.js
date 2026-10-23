module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:manufacturing:supplier-integration",
  info: {
    title: "Quality Smart Factory Supplier Integration",
    version: "1.6.0",
    description: "Purchase orders, shipping notices and quality certificates exchanged with suppliers and cloud providers.",
  },
  defaultContentType: "application/json",
  servers: {
    plantKafka: { host: "kafka.quality.es:9093", protocol: "kafka-secure", description: "Compliant production cluster." },
    confluentCloud: { host: "pkc-4nym6.eu-west-1.aws.confluent.cloud:9092", protocol: "kafka-secure" },
    amazonMsk: { host: "b-1.plants.abc123.c2.kafka.eu-west-1.amazonaws.com:9094,b-2.plants.abc123.c2.kafka.eu-west-1.amazonaws.com:9094", protocol: "kafka-secure" },
    eventHubs: { host: "suppliers.servicebus.windows.net:9093", protocol: "kafka-secure" },
    hivemqCloud: { host: "a1b2c3.s1.eu.hivemq.cloud:8883", pathname: "/plants", protocol: "secure-mqtt" },
    cloudAmqp: { host: "amqps://plants:s3cr3t@goose.rmq2.cloudamqp.com", pathname: "/plants", protocol: "amqps" },
    clusterLocal: { host: "kafka.plants.svc.cluster.local:9092", protocol: "kafka" },
    typoDomain: { host: "kafka.qualty.es:9093", protocol: "kafka-secure" },
    suffixAttack: { host: "kafka.quality.es.evil.net:9093", protocol: "kafka-secure" },
    encodedDot: { host: "kafka%2Equality.es:9093", protocol: "kafka-secure" },
    zoneIpv6: { host: "[fe80::1%25eth0]:9092", protocol: "kafka" },
    nestedSubdomain: { host: "plants.eu.quality.es:9093", protocol: "kafka-secure" },
    upperDomain: { host: "scada.Quality.Es", pathname: "/feed", protocol: "wss" },
    variableDefaultForeign: {
      host: "{env}.quality.es:9093",
      protocol: "kafka-secure",
      variables: { env: { enum: ["plants-dev", "plants-pro"], default: "plants.supplier", description: "Target environment." } },
    },
    variableRefChain: { host: "{cluster}", protocol: "kafka-secure", variables: { cluster: { $ref: "#/components/serverVariables/clusterAlias" } } },
    unresolvedPlaceholder: { host: "{tenant}.quality.es", protocol: "wss", variables: { tenant: { description: "Supplier tenant chosen at runtime." } } },
    portVariableForeignHost: { host: "kafka.supplier.example.org:{port}", protocol: "kafka", variables: { port: { enum: ["9092", "9093"], default: "9093" } } },
    listWithVariable: { host: "broker-0.quality.es:9093,{fallback}:9093", protocol: "kafka-secure", variables: { fallback: { default: "dr.supplier.example.org" } } },
    pathnameVariableOnly: { host: "mqtt.supplier.example.org", pathname: "/{line}", protocol: "mqtt", variables: { line: { enum: ["press", "paint"] } } },
    objectHost: { host: { name: "kafka.quality.es", port: 9093 }, protocol: "kafka-secure" },
    arrayHost: { host: ["kafka.quality.es:9093"], protocol: "kafka-secure" },
    emptyHost: { host: "", pathname: "/plants", protocol: "wss" },
    urnHost: { host: "urn:quality:plants:events", protocol: "kafka" },
    "x-supplier": { host: "kafka.broker-supplier.example.org:9092", protocol: "kafka" },
    supplierRef: { $ref: "#/components/servers/supplier" },
    supplierRefAgain: { $ref: "#/components/servers/supplier" },
  },
  channels: {
    purchaseOrders: {
      address: "plants.cdc.purchase-orders.created.v1",
      servers: [{ $ref: "#/servers/plantKafka" }, { $ref: "#/servers/confluentCloud" }, { $ref: "#/components/servers/supplier" }],
      messages: {
        purchaseOrderCreated: {
          name: "purchaseOrderCreated",
          payload: { type: "object", properties: { supplierUrl: { type: "string", default: "kafka://kafka.supplier.example.org:9093" } } },
          examples: [{ name: "bolts", payload: { supplierUrl: "https://supplier.example.org" } }],
        },
      },
    },
  },
  operations: {
    receivePurchaseOrder: {
      action: "receive",
      channel: { $ref: "#/channels/purchaseOrders" },
      reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/purchaseOrders" } },
    },
  },
  components: {
    servers: {
      supplier: { host: "kafka.supplier.example.org:9093", protocol: "kafka-secure", description: "Supplier cluster shared by reference." },
      legacyIp: { host: "10.10.4.20:9092", protocol: "kafka" },
      compliant: { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure" },
    },
    serverVariables: {
      cluster: { enum: ["kafka.quality.es:9093", "kafka.supplier.example.org:9093"], default: "kafka.quality.es:9093" },
      clusterAlias: { $ref: "#/components/serverVariables/cluster" },
    },
  },
};
