module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:mobility",
  info: {
    title: "Quality Mobility Realtime",
    version: "5.1.0",
    description: "Trip lifecycle, driver locations, surge pricing and rider notifications.",
    contact: { name: "Mobility Platform", email: "mobility@quality.es", url: "https://quality.es/mobility" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaProd: {
      host: "kafka.quality.es:9093",
      protocol: "kafka-secure",
      description: "Production Kafka cluster.",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.confluent.example.org", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" } },
    },
    kafkaBrokers: { host: "broker-0.quality.es:9093,broker-1.quality.es:9093,broker-2.quality.es:9093", protocol: "kafka-secure" },
    kafkaByEnvironment: {
      host: "{environment}.quality.es:{port}",
      protocol: "kafka",
      variables: {
        environment: { enum: ["kafka-dev", "kafka-pre", "kafka-pro"], default: "kafka-pro", description: "Target environment." },
        port: { enum: ["9092", "9093"], default: "9093" },
      },
    },
    driverMqtt: { host: "mqtt.quality.es:8883", protocol: "secure-mqtt", pathname: "/drivers", title: "Driver gateway" },
    riderWs: { host: "realtime.quality.es", pathname: "/riders/{stream}", protocol: "wss", variables: { stream: { enum: ["trips", "eta"], default: "trips" } } },
    dispatchAmqp: { host: "rabbit.quality.es:5671", pathname: "/dispatch", protocol: "amqps" },
    pricingPulsar: { host: "{cluster}.quality.es:6651", protocol: "pulsar+ssl", variables: { cluster: { $ref: "#/components/serverVariables/cluster" } } },
    apex: { host: "quality.es", protocol: "https", pathname: "/webhooks" },
    schemeInHost: { host: "kafka-secure://kafka-legacy.quality.es:9093", protocol: "kafka-secure", description: "Host written with its scheme." },
    regionalGateway: { host: "gateway-{region}.quality.es", protocol: "wss", variables: { region: { $ref: "#/components/serverVariables/region" } } },
    "x-edge": { host: "edge.quality.es", protocol: "kafka", "x-host": "edge.example.org", "x-url": "localhost" },
    drKafka: { $ref: "#/components/servers/drKafka" },
    drKafkaAgain: { $ref: "#/components/servers/drKafka" },
    partnerKafka: { $ref: "./partner-servers.yaml#/components/servers/partnerKafka" },
    tenantGateway: { host: "{tenant}.example.org", protocol: "wss", variables: { tenant: { $ref: "./shared/server-variables.yaml#/tenant" } } },
    migrated: { host: "migrated.quality.es", url: "kafka://legacy.example.org:9092", pathname: "/localhost", protocol: "kafka" },
  },
  channels: {
    tripRequested: {
      address: "mobility.cdc.trips.requested.v1",
      servers: [{ $ref: "#/servers/kafkaProd" }, { $ref: "#/servers/kafkaBrokers" }, { $ref: "#/servers/drKafka" }],
      messages: {
        tripRequested: {
          name: "tripRequested",
          payload: {
            schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
            schema: {
              type: "object",
              properties: {
                tripId: { type: "string", format: "uuid" },
                host: { type: ["string", "null"], default: "localhost" },
                url: { type: "string", examples: ["kafka://other.example.org:9092"] },
              },
            },
          },
          examples: [{ name: "requested", payload: { tripId: "1f9b2a4e-8f7c-4d3e-9a1b-2c3d4e5f6a7b", host: null, url: "kafka://other.example.org:9092" } }],
        },
      },
    },
    driverLocation: {
      address: "drivers/{driverId}/location",
      parameters: { driverId: { description: "Driver identifier.", examples: ["localhost"] } },
      servers: [{ $ref: "#/servers/driverMqtt" }],
      messages: {
        locationUpdated: {
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: { type: "record", name: "Location", namespace: "es.quality.mobility", fields: [{ name: "host", type: ["null", "string"], default: null }] },
          },
        },
      },
    },
    surge: { address: null, servers: [{ $ref: "#/servers/pricingPulsar" }], messages: { surgeChanged: { $ref: "#/components/messages/surgeChanged" } } },
  },
  operations: {
    requestTrip: {
      action: "send",
      channel: { $ref: "#/channels/tripRequested" },
      messages: [{ $ref: "#/channels/tripRequested/messages/tripRequested" }],
      reply: { address: { location: "$message.header#/replyTo", description: "localhost" }, channel: { $ref: "#/channels/driverLocation" } },
    },
    receiveLocation: { action: "receive", channel: { $ref: "#/channels/driverLocation" }, bindings: { mqtt: { qos: 1, bindingVersion: "0.2.0" } } },
  },
  components: {
    servers: {
      drKafka: { host: "kafka-dr.quality.es:9093", protocol: "kafka-secure", description: "Disaster recovery cluster." },
      unusedMirror: { host: "mirror.quality.es", protocol: "kafka" },
    },
    serverVariables: {
      cluster: { enum: ["pulsar-eu", "pulsar-us"], default: "pulsar-eu" },
      region: { enum: ["eu", "us", "latam"], default: "eu" },
    },
    messages: {
      surgeChanged: { name: "surgeChanged", payload: { type: "object", properties: { host: { type: "string", const: "10.0.0.1" } } } },
    },
    replyAddresses: { replyTo: { location: "$message.header#/replyTo", description: "evil.example.org" } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials." } },
    serverBindings: { registry: { kafka: { schemaRegistryUrl: "https://registry.example.org", bindingVersion: "0.5.0" } } },
  },
};
