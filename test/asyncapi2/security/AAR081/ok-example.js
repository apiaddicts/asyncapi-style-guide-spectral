module.exports = {
  asyncapi: "2.6.0",
  id: "urn:es:quality:logistics",
  info: {
    title: "Quality Logistics Event Platform",
    version: "4.2.0",
    description: "Shipment tracking, warehouse telemetry and dispatch events for the logistics domain.",
    contact: { name: "Logistics Platform", email: "logistics@quality.es", url: "https://quality.es/logistics" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      url: "kafka-secure://kafka.quality.es:9093",
      protocol: "kafka-secure",
      description: "Production Kafka cluster.",
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.confluent.example.org", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    kafkaBrokers: {
      url: "broker-0.quality.es:9093,broker-1.quality.es:9093,broker-2.quality.es:9093",
      protocol: "kafka-secure",
      description: "Bootstrap broker list.",
    },
    kafkaByEnvironment: {
      url: "{environment}.quality.es:{port}",
      protocol: "kafka",
      description: "Kafka clusters per environment.",
      variables: {
        environment: { enum: ["kafka-dev", "kafka-pre", "kafka-pro"], default: "kafka-pro", description: "Target environment." },
        port: { enum: ["9092", "9093"], default: "9093", description: "Plain or TLS listener." },
      },
    },
    mqttTelemetry: { url: "mqtts://gateway@mqtt.quality.es:8883", protocol: "secure-mqtt", description: "Warehouse sensors broker." },
    amqpDispatch: { url: "amqps://rabbit.quality.es:5671/%2Fdispatch", protocol: "amqps", description: "Dispatch work queues." },
    wsTracking: { url: "wss://tracking.quality.es/v2/{stream}", protocol: "wss", variables: { stream: { enum: ["shipments", "vehicles"], default: "shipments" } } },
    httpsWebhooks: { url: "https://quality.es/webhooks?source=asyncapi#delivery", protocol: "https" },
    natsFleet: { url: "nats://{cluster}.quality.es:4222", protocol: "nats", variables: { cluster: { $ref: "#/components/serverVariables/cluster" } } },
    regionalGateway: { url: "{scheme}://gateway-{region}.quality.es", protocol: "wss", variables: { scheme: { enum: ["ws", "wss"] }, region: { $ref: "#/components/serverVariables/region" } } },
    "x-edge": { url: "edge.quality.es", protocol: "kafka", "x-url": "edge.example.org", "x-mirror": { url: "mirror.example.org" } },
    drKafka: { $ref: "#/components/servers/drKafka" },
    drKafkaAgain: { $ref: "#/components/servers/drKafka" },
    partnerKafka: { $ref: "./partner-servers.yaml#/servers/partnerKafka" },
    tenantGateway: { url: "{tenant}.example.org", protocol: "wss", variables: { tenant: { $ref: "./shared/server-variables.yaml#/tenant" } } },
    legacyKafka: { url: "legacy.quality.es", host: "legacy.example.org", pathname: "/v1", protocol: "kafka" },
  },
  channels: {
    "logistics.cdc.shipments.tracking.v2": {
      description: "Shipment position updates.",
      servers: ["kafkaProd", "kafkaBrokers", "kafkaByEnvironment"],
      bindings: { kafka: { topic: "logistics.cdc.shipments.tracking.v2", partitions: 12, bindingVersion: "0.4.0" } },
      subscribe: {
        operationId: "receiveShipmentPosition",
        summary: "Receive shipment positions.",
        message: {
          name: "shipmentPosition",
          contentType: "application/json",
          headers: { type: "object", properties: { origin: { type: "string", format: "uri", default: "https://origin.example.org" } } },
          payload: {
            type: "object",
            properties: {
              shipmentId: { type: "string", format: "uuid" },
              url: { type: "string", default: "kafka://other.example.org:9092" },
              host: { type: ["string", "null"], examples: ["tracker.example.org"] },
              server: { type: "object", properties: { url: { type: "string", const: "localhost" } } },
            },
          },
          examples: [{ name: "inTransit", payload: { shipmentId: "6f0a1e0e-1d2c-4c41-9d4b-3a3f5a0e2c11", url: "kafka://other.example.org:9092", host: null } }],
        },
      },
    },
    "warehouse/{warehouseId}/telemetry": {
      parameters: { warehouseId: { description: "Warehouse code.", schema: { type: "string", default: "localhost" } } },
      servers: ["mqttTelemetry"],
      publish: {
        operationId: "publishTelemetry",
        bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } },
        message: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          payload: {
            type: "record",
            name: "Telemetry",
            namespace: "es.quality.warehouse",
            fields: [
              { name: "host", type: ["null", "string"], default: null },
              { name: "url", type: "string", default: "mqtt://sensor.example.org" },
            ],
          },
        },
      },
    },
    "dispatch.cmd.routes.assign.v1": {
      servers: ["amqpDispatch"],
      bindings: { amqp: { is: "queue", queue: { name: "routes.assign" }, bindingVersion: "0.3.0" } },
      publish: { operationId: "assignRoute", message: { $ref: "#/components/messages/routeAssigned" } },
    },
  },
  components: {
    servers: {
      drKafka: { url: "kafka-dr.quality.es:9093", protocol: "kafka-secure", description: "Disaster recovery cluster." },
      unusedMirror: { url: "kafka://mirror.quality.es", protocol: "kafka" },
    },
    serverVariables: {
      cluster: { enum: ["fleet-eu", "fleet-us"], default: "fleet-eu" },
      region: { enum: ["eu", "us", "latam"], default: "eu" },
    },
    schemas: {
      Endpoint: { type: "object", properties: { url: { type: "string", default: "localhost:9092" }, host: { type: "string", enum: ["10.0.0.1"] } } },
    },
    messages: {
      routeAssigned: {
        name: "routeAssigned",
        payload: { $ref: "#/components/schemas/Endpoint" },
        examples: [{ name: "assigned", payload: { url: "amqp://other.example.org", host: "10.0.0.1" } }],
      },
    },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials." } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.example.org", bindingVersion: "0.4.0" } } },
  },
};
