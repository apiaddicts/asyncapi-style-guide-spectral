const AVRO = "application/vnd.apache.avro;version=1.9.0";
const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const SHARED = "./shared/pharma-traits.yaml#/components/messageTraits";

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:pharmacy:supply-chain",
  info: {
    title: "Pharmacy Supply Chain Events",
    version: "3.4.0",
    description: "Prescriptions, cold chain shipments and dispensing events exchanged between wholesalers, pharmacies and couriers.",
    contact: { name: "Supply Chain Integration", url: "https://pharma.example.io/integration", email: "integration@pharma.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  tags: [{ name: "supply-chain" }, { name: "dispensing" }],
  servers: {
    kafkaProd: {
      url: "kafka-{region}.pharma.example.io:9093",
      protocol: "kafka-secure",
      variables: { region: { enum: ["eu-west", "eu-south"], default: "eu-west" } },
      security: [{ saslScram: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.pharma.example.io", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    amqpBroker: { url: "amqps://mq.pharma.example.io:5671/dispensing", protocol: "amqps", security: [{ brokerCert: [] }] },
    mqttEdge: { url: "mqtts://edge.pharma.example.io:8883", protocol: "secure-mqtt", bindings: { mqtt: { clientId: "fridge-gateway", cleanSession: false, bindingVersion: "0.2.0" } } },
    wsGateway: { url: "wss://live.pharma.example.io/v3", protocol: "wss" },
  },
  channels: {
    "pharma.cdc.prescriptions.validated.v2": {
      description: "Prescriptions validated by the clinical rules engine.",
      servers: ["kafkaProd"],
      bindings: { kafka: { topic: "pharma.cdc.prescriptions.validated.v2", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishPrescriptionValidated",
        summary: "Clinical engine publishes validated prescriptions.",
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
        message: {
          name: "prescriptionValidated",
          title: "Prescription validated",
          contentType: "application/json",
          traits: [trait("commonHeaders"), trait("tracing"), trait("kafkaKey")],
          correlationId: { $ref: "#/components/correlationIds/prescriptionId" },
          payload: { $ref: "#/components/schemas/Prescription" },
        },
      },
      subscribe: {
        operationId: "receivePrescriptionValidated",
        summary: "Pharmacies receive validated prescriptions.",
        bindings: { kafka: { groupId: { type: "string", enum: ["pharmacy-dispensing"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/prescriptionValidated" },
            {
              name: "prescriptionValidatedAvro",
              schemaFormat: AVRO,
              contentType: "application/vnd.apache.avro+json",
              traits: [[trait("commonHeaders"), { environment: "prod" }], [trait("tracing"), {}]],
              payload: {
                type: "record",
                name: "PrescriptionValidated",
                namespace: "io.pharma.clinical",
                fields: [
                  { name: "prescriptionId", type: "string" },
                  { name: "renewalOf", type: ["null", "string"], default: null },
                  { name: "dosage", type: ["null", { type: "record", name: "Dosage", fields: [{ name: "mg", type: "int" }] }], default: null },
                ],
              },
            },
            { oneOf: [{ name: "prescriptionRenewed", traits: [trait("platformDefaults"), trait("tracing")], payload: { type: "object", properties: { prescriptionId: { type: "string" }, renewalOf: { type: ["string", "null"] } } } }] },
          ],
        },
      },
    },
    "pharma.cmd.shipments.dispatch.v1": {
      description: "Commands that dispatch cold chain shipments to couriers.",
      servers: ["amqpBroker"],
      bindings: { amqp: { is: "queue", queue: { name: "shipments.dispatch", durable: true, exclusive: false, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "dispatchShipment",
        summary: "Wholesaler dispatches a shipment.",
        message: {
          name: "shipmentDispatchRequested",
          traits: { $ref: "#/components/x-trait-lists/standard" },
          payload: { type: "object", required: ["shipmentId"], properties: { shipmentId: { type: "string", format: "uuid" }, priority: { type: "integer", minimum: 1, maximum: 5 } } },
          bindings: { amqp: { contentEncoding: "gzip", messageType: "shipment.dispatch", bindingVersion: "0.3.0" } },
        },
      },
      subscribe: {
        operationId: "receiveDispatchAck",
        summary: "Wholesaler receives dispatch acknowledgements.",
        message: { $ref: "#/components/messages/dispatchAcknowledged" },
      },
    },
    "pharma/fridges/{fridgeId}/temperature": {
      description: "Temperature readings of pharmacy fridges.",
      servers: ["mqttEdge"],
      parameters: { fridgeId: { description: "Fridge serial number.", schema: { type: "string", pattern: "^FR-[0-9]{6}$" } } },
      publish: {
        operationId: "reportFridgeTemperature",
        summary: "Fridge gateways report readings.",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } },
        message: {
          name: "fridgeTemperatureReported",
          traits: [trait("headersAlias"), { $ref: `${SHARED}/tracing` }],
          payload: { type: "object", properties: { celsius: { type: "number", minimum: -40, maximum: 40 }, door: { type: ["string", "null"], enum: ["open", "closed", null] } } },
        },
      },
      subscribe: {
        operationId: "receiveFridgeAlarm",
        summary: "Gateways receive alarm thresholds.",
        message: {
          name: "fridgeThresholdChanged",
          traits: [trait("sharedTracing"), trait("commonHeaders"), { headers: { type: "object", properties: { site: { type: "string" } } } }],
          payload: { type: "object", properties: { maxCelsius: { type: "number" } } },
        },
      },
    },
    "pharma.sys.dispensing.live.v1": {
      description: "Live dispensing feed for the pharmacy dashboards.",
      servers: ["wsGateway"],
      subscribe: {
        operationId: "streamDispensing",
        summary: "Dashboards stream dispensing events.",
        message: {
          oneOf: [
            {
              name: "medicineDispensed",
              traits: [
                { $ref: "./traits/common.yaml#/components/messageTraits/commonHeaders" },
                { $ref: "https://schemas.pharma.example.io/asyncapi/traits.json#/components/messageTraits/tracing" },
              ],
              payload: { type: "object" },
            },
            { name: "dispensingPaused", traits: { $ref: "#/components/x-trait-lists/chained" }, payload: { type: "string", enum: ["stockout", "audit"] } },
            { $ref: "./shared/pharma-messages.yaml#/components/messages/dispensingResumed" },
          ],
        },
      },
    },
    "x-pharma.legacy.recalls.v1": {
      description: "Legacy recall notices kept for the regulator gateway.",
      publish: { operationId: "publishLegacyRecall", message: { name: "recallNoticed", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } } },
    },
    "pharma.cdc.stock.levels.v1": { $ref: "#/components/channels/stockLevels" },
  },
  components: {
    channels: {
      stockLevels: {
        description: "Stock levels of every pharmacy.",
        subscribe: {
          operationId: "receiveStockLevel",
          message: { name: "stockLevelChanged", traits: { $ref: "./shared/pharma-traits.yaml#/lists/standard" }, payload: { type: "object", properties: { sku: { type: "string" }, units: { type: ["integer", "null"] } } } },
        },
      },
    },
    messages: {
      prescriptionValidated: {
        name: "prescriptionValidated",
        traits: [trait("commonHeaders"), trait("tracing")],
        payload: { $ref: "#/components/schemas/Prescription" },
      },
      dispatchAcknowledged: {
        name: "dispatchAcknowledged",
        traits: [trait("platformDefaults"), [trait("tracing"), { broker: "amqp" }]],
        payload: { type: "object", properties: { shipmentId: { type: "string" }, courier: { type: "string" } } },
      },
      "x-recall-legacy": { name: "recallLegacy", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } },
      courierAssigned: {
        oneOf: [
          { name: "courierAssigned", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } },
          { $ref: "#/components/messages/dispatchAcknowledged" },
        ],
      },
    },
    messageTraits: {
      commonHeaders: {
        headers: {
          type: "object",
          required: ["traceId", "tenantId"],
          properties: { traceId: { type: "string", format: "uuid" }, tenantId: { type: "string" }, region: { type: ["string", "null"] } },
        },
      },
      tracing: { correlationId: { description: "W3C trace context.", location: "$message.header#/traceparent" } },
      kafkaKey: { bindings: { kafka: { key: { type: "string", maxLength: 64 }, bindingVersion: "0.4.0" } } },
      headersAlias: trait("commonHeaders"),
      platformDefaults: trait("headersAlias"),
      sharedTracing: { $ref: `${SHARED}/tracing` },
    },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.4.0" } } } },
    correlationIds: { prescriptionId: { location: "$message.payload#/prescriptionId" } },
    schemas: {
      Prescription: {
        type: "object",
        required: ["prescriptionId", "patientRef"],
        properties: { prescriptionId: { type: "string" }, patientRef: { type: "string" }, notes: { type: ["string", "null"], maxLength: 500 } },
      },
    },
    securitySchemes: { saslScram: { type: "scramSha512" }, brokerCert: { type: "X509" } },
    "x-trait-lists": {
      standard: [trait("commonHeaders"), trait("tracing")],
      chained: { $ref: "#/components/x-trait-lists/standard" },
    },
  },
};
