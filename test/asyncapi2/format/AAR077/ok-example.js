const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:logistics:fleet-telemetry",
  info: {
    title: "Fleet Telemetry Events",
    version: "5.3.0",
    description: "Vehicle positions, cold-chain temperatures and delivery milestones of the logistics fleet.",
    termsOfService: "https://fleet.logistics.example.io/terms",
    contact: {
      name: "Fleet Integration Team",
      url: "https://fleet.logistics.example.io/integration",
      email: "fleet-integration@logistics.example.io",
      "x-slack": "#fleet-integration",
      "x-on-call": "https://oncall.logistics.example.io/fleet",
    },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    "x-audience": "company-internal",
  },
  defaultContentType: "application/json",
  tags: [
    { name: "telemetry", description: "Vehicle telemetry streams." },
    { name: "deliveries", description: "Delivery lifecycle events." },
  ],
  externalDocs: { description: "Fleet platform handbook.", url: "https://fleet.logistics.example.io/handbook" },
  servers: {
    telemetryKafka: {
      url: "kafka-{region}.fleet.logistics.example.io:9093",
      protocol: "kafka-secure",
      description: "Telemetry backbone.",
      variables: { region: { enum: ["eu-west-1", "eu-central-1"], default: "eu-west-1" } },
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.fleet.logistics.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    depotAmqp: { url: "amqps://depots.logistics.example.io:5671/fleet", protocol: "amqps", description: "Depot dispatch broker.", security: [{ depotCert: [] }] },
    vehicleMqtt: { url: "mqtts://vehicles.logistics.example.io:8883", protocol: "secure-mqtt", description: "Vehicle gateways.", bindings: { mqtt: { clientId: "fleet-ingest", cleanSession: false, keepAlive: 30, bindingVersion: "0.2.0" } } },
    dispatcherWs: { url: "wss://dispatch.logistics.example.io/live", protocol: "wss", description: "Live dispatcher console." },
  },
  channels: {
    "fleet.cdc.vehicles.position.v5": {
      description: "Vehicle positions sampled every ten seconds.",
      servers: ["telemetryKafka"],
      bindings: { kafka: { topic: "fleet.cdc.vehicles.position.v5", partitions: 48, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishVehiclePosition",
        summary: "Vehicle gateways publish positions.",
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        message: { $ref: "#/components/messages/vehiclePosition" },
      },
      subscribe: {
        operationId: "receiveVehiclePosition",
        summary: "Route planning receives positions.",
        bindings: { kafka: { groupId: { type: "string", enum: ["route-planning"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/vehiclePosition" },
            {
              name: "vehiclePositionAvro",
              title: "Vehicle position in Avro",
              schemaFormat: AVRO,
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "VehiclePosition",
                namespace: "io.example.logistics.fleet",
                fields: [
                  { name: "vehicleId", type: "string" },
                  { name: "lat", type: "double" },
                  { name: "lon", type: "double" },
                  { name: "driverContact", type: ["null", { type: "record", name: "DriverContact", fields: [{ name: "name", type: ["null", "string"], default: null }, { name: "email", type: ["null", "string"], default: null }] }], default: null },
                ],
              },
            },
          ],
        },
      },
    },
    "depots/{depotId}/dispatch": {
      description: "Dispatch orders sent to a depot.",
      servers: ["depotAmqp"],
      parameters: { depotId: { $ref: "#/components/parameters/depotId" } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "dispatch", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "publishDispatchOrder",
        summary: "Planning publishes dispatch orders.",
        message: {
          name: "dispatchOrder",
          title: "Dispatch order",
          traits: [{ $ref: "#/components/messageTraits/traced" }],
          correlationId: { $ref: "#/components/correlationIds/orderId" },
          payload: {
            type: "object",
            required: ["orderId", "consignee"],
            properties: {
              orderId: { type: "string", format: "uuid" },
              consignee: { $ref: "#/components/schemas/Contact" },
              notes: { type: ["string", "null"] },
            },
          },
          examples: [{ name: "standardDispatch", payload: { orderId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", consignee: { name: "Harbour Retail", email: "goods-in@harbour-retail.example.io" }, notes: null } }],
        },
      },
    },
    "vehicles/{vehicleId}/cold-chain": {
      description: "Reefer temperatures reported by the vehicle gateway.",
      servers: ["vehicleMqtt"],
      parameters: { vehicleId: { description: "Fleet vehicle identifier.", schema: { type: "string", pattern: "^VH-[0-9]{6}$" } } },
      subscribe: {
        operationId: "receiveColdChainReading",
        summary: "The cold-chain monitor receives reefer temperatures.",
        message: { $ref: "#/components/messages/coldChainReading" },
      },
    },
    "dispatch/live": {
      description: "Live delivery milestones pushed to the dispatcher console.",
      servers: ["dispatcherWs"],
      subscribe: {
        operationId: "receiveDeliveryMilestone",
        summary: "Dispatchers receive delivery milestones.",
        bindings: { ws: { query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" } },
        message: { $ref: "#/components/messages/deliveryMilestone" },
      },
    },
  },
  components: {
    messages: {
      vehiclePosition: {
        name: "vehiclePosition",
        title: "Vehicle position",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/traced" }],
        payload: { $ref: "#/components/schemas/VehiclePosition" },
      },
      coldChainReading: {
        name: "coldChainReading",
        title: "Cold-chain reading",
        headers: { type: "object", properties: { gatewayId: { type: "string" } } },
        payload: { type: "object", properties: { celsius: { type: "number", minimum: -40, maximum: 30 }, setpoint: { type: ["number", "null"] } } },
      },
      deliveryMilestone: {
        name: "deliveryMilestone",
        title: "Delivery milestone",
        payload: {
          type: "object",
          properties: {
            deliveryId: { type: "string" },
            milestone: { type: "string", enum: ["loaded", "departed", "arrived", "delivered", "failed"] },
            recipient: { $ref: "#/components/schemas/Contact" },
          },
        },
      },
    },
    schemas: {
      VehiclePosition: {
        type: "object",
        required: ["vehicleId", "lat", "lon"],
        properties: {
          vehicleId: { type: "string" },
          lat: { type: "number", minimum: -90, maximum: 90 },
          lon: { type: "number", minimum: -180, maximum: 180 },
          speedKmh: { type: ["number", "null"], minimum: 0 },
        },
      },
      Contact: { type: "object", properties: { name: { type: "string", maxLength: 120 }, email: { type: "string", format: "email" }, phone: { type: ["string", "null"] } } },
    },
    parameters: { depotId: { description: "Depot code.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{2}$" } } },
    correlationIds: { orderId: { description: "Dispatch order id.", location: "$message.payload#/orderId" } },
    messageTraits: { traced: { headers: { type: "object", properties: { traceparent: { type: "string" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["fleet-gateway"] }, bindingVersion: "0.4.0" } } } },
    securitySchemes: {
      saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials per service." },
      depotCert: { type: "X509", description: "Depot client certificates." },
    },
  },
};
