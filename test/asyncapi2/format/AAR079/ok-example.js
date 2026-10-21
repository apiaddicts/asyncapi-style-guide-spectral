const docs = (topic) => ({ description: `Runbook for ${topic}.`, url: `https://docs.northwind.example.com/runbooks/${topic}` });
const incomplete = { url: "https://docs.northwind.example.com/not-checked" };

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:northwind:grocery-fulfilment",
  info: {
    title: "Northwind Grocery Fulfilment",
    version: "7.4.0",
    description: "Picking, packing and delivery events of the Northwind grocery fulfilment centres.",
    externalDocs: incomplete,
    tags: [{ name: "not-a-2x-location", externalDocs: incomplete }],
  },
  externalDocs: { description: "Fulfilment platform handbook.", url: "https://docs.northwind.example.com/fulfilment", "x-owner": "fulfilment-platform" },
  tags: [
    { name: "picking", description: "Picking events.", externalDocs: docs("picking") },
    { name: "delivery", description: "Delivery events.", externalDocs: { $ref: "#/components/x-docs/delivery" } },
    { name: "packing", description: "Packing events." },
  ],
  servers: {
    kafkaFulfilment: {
      url: "kafka.northwind.example.com:9093",
      protocol: "kafka-secure",
      description: "Fulfilment Kafka cluster.",
      externalDocs: incomplete,
      tags: [{ name: "production", description: "Production cluster.", externalDocs: docs("kafka-production") }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.northwind.example.com", bindingVersion: "0.4.0" } },
    },
    rabbitStores: { url: "amqps://rabbit.northwind.example.com:5671", protocol: "amqps", description: "Store dispatch broker." },
    mqttVans: { url: "mqtts://mqtt.northwind.example.com:8883", protocol: "mqtt", description: "Delivery van telemetry broker.", tags: [{ name: "telemetry", description: "Van telemetry." }] },
    wsTracking: { url: "wss://tracking.northwind.example.com/live", protocol: "wss", description: "Customer delivery tracking." },
  },
  channels: {
    "northwind.cdc.orders.picked.v1": {
      description: "Orders whose items have all been picked.",
      externalDocs: incomplete,
      parameters: {},
      publish: {
        operationId: "publishOrderPicked",
        summary: "An order finished picking.",
        externalDocs: docs("order-picked"),
        tags: [{ name: "picking", description: "Picking events.", externalDocs: { $ref: "#/externalDocs" } }],
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, [{ externalDocs: docs("tuple-trait") }, { "x-override": true }]],
        bindings: { kafka: { clientId: { type: "string", externalDocs: incomplete }, bindingVersion: "0.4.0" } },
        message: { $ref: "#/components/messages/orderPicked" },
      },
      subscribe: {
        operationId: "receivePickingCorrections",
        externalDocs: { $ref: "#/components/x-docs/corrections" },
        message: {
          oneOf: [{ $ref: "#/components/messages/orderPicked" }, { $ref: "#/components/messages/pickingCorrected" }],
          externalDocs: incomplete,
        },
      },
    },
    "stores/{storeId}/dispatch": {
      description: "Dispatch commands sent to each store.",
      parameters: {
        storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^ST[0-9]{4}$", externalDocs: docs("store-ids") } },
        region: { $ref: "#/components/parameters/region" },
      },
      subscribe: {
        operationId: "receiveDispatch",
        externalDocs: docs("dispatch"),
        bindings: { amqp: { expiration: 60000, bindingVersion: "0.3.0" } },
        message: {
          name: "dispatchRequested",
          title: "Dispatch requested",
          contentType: "application/json",
          externalDocs: docs("dispatch-requested"),
          correlationId: { location: "$message.header#/correlationId", description: "Dispatch correlation." },
          headers: {
            type: "object",
            externalDocs: docs("dispatch-headers"),
            properties: { correlationId: { type: "string", format: "uuid" }, priority: { type: ["integer", "null"], minimum: 0, maximum: 9 } },
          },
          payload: {
            type: "object",
            externalDocs: docs("dispatch-payload"),
            required: ["dispatchId", "externalDocs"],
            properties: {
              dispatchId: { type: "string", format: "uuid" },
              externalDocs: { type: "object", description: "Links attached to the dispatch.", properties: { url: { type: "string", format: "uri" }, description: { type: ["string", "null"] } } },
              lines: { type: "array", items: { $ref: "#/components/schemas/DispatchLine" } },
              window: { oneOf: [{ $ref: "#/components/schemas/DeliveryWindow" }, { type: "null" }] },
            },
            examples: [{ dispatchId: "8d1f3c4e-0a8b-4b52-9d6e-2b9f1c1e5a77", externalDocs: { url: "https://docs.northwind.example.com/not-checked" } }],
            default: { externalDocs: {} },
          },
          examples: [{ name: "dispatch", payload: { dispatchId: "8d1f3c4e-0a8b-4b52-9d6e-2b9f1c1e5a77", externalDocs: incomplete } }],
          traits: [{ $ref: "#/components/messageTraits/storeHeaders" }],
        },
      },
    },
    "vans/{vanId}/telemetry": {
      description: "Telemetry published by the delivery vans.",
      parameters: { vanId: { description: "Van plate.", schema: { type: "string", externalDocs: { $ref: "#/components/x-docs/vans" } } } },
      publish: {
        operationId: "publishVanTelemetry",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } },
        message: {
          name: "vanTelemetry",
          title: "Van telemetry",
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          contentType: "application/vnd.apache.avro+json",
          externalDocs: docs("van-telemetry"),
          payload: {
            type: "record",
            name: "VanTelemetry",
            namespace: "com.northwind.vans",
            externalDocs: incomplete,
            fields: [
              { name: "vanId", type: "string", externalDocs: {} },
              { name: "temperature", type: ["null", "double"], default: null },
              { name: "door", type: ["null", { type: "record", name: "Door", fields: [{ name: "open", type: "boolean" }], externalDocs: incomplete }], default: null },
            ],
          },
        },
      },
    },
    "tracking/{orderId}": {
      description: "Live delivery tracking pushed to customers.",
      parameters: { orderId: { description: "Order identifier.", schema: { type: "string" } } },
      subscribe: {
        operationId: "receiveTrackingUpdate",
        externalDocs: docs("tracking"),
        message: {
          name: "trackingUpdated",
          title: "Tracking updated",
          schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
          externalDocs: docs("tracking-updated"),
          payload: {
            type: "object",
            nullable: true,
            externalDocs: docs("tracking-payload"),
            properties: { eta: { type: "string", format: "date-time", nullable: true, externalDocs: docs("eta") } },
          },
        },
      },
    },
    "x-legacy/returns": {
      description: "Returns feed kept for the legacy warehouse system.",
      publish: {
        operationId: "publishLegacyReturn",
        externalDocs: docs("legacy-returns"),
        message: { name: "legacyReturn", schemaFormat: "application/raml+yaml;version=1.0", payload: { type: "object", externalDocs: incomplete } },
      },
    },
  },
  components: {
    externalDocs: { notA2xLocation: incomplete },
    tags: { notA2xLocation: { name: "not-a-2x-location", externalDocs: incomplete } },
    schemas: {
      DispatchLine: {
        type: "object",
        externalDocs: docs("dispatch-line"),
        properties: {
          sku: { type: "string", externalDocs: docs("sku") },
          quantity: { type: "integer", minimum: 1 },
          substitutes: { type: ["array", "null"], items: { type: "string", externalDocs: docs("substitutes") } },
        },
        allOf: [{ $ref: "#/components/schemas/Audit" }],
      },
      DeliveryWindow: { type: "object", externalDocs: { $ref: "#/components/x-docs/windows" }, properties: { from: { type: "string", format: "date-time" }, to: { type: "string", format: "date-time" } } },
      Audit: { type: "object", $defs: { actor: { type: "string", externalDocs: docs("audit-actor") } }, properties: { actor: { $ref: "#/components/schemas/Audit/$defs/actor" } } },
      PickedPayload: { type: "object", externalDocs: docs("picked-payload"), properties: { orderId: { type: "string" }, pickedAt: { type: "string", format: "date-time" } } },
      VanTelemetryAvro: {
        type: "record",
        name: "VanTelemetryV2",
        externalDocs: incomplete,
        fields: [{ name: "vanId", type: "string" }],
      },
    },
    parameters: { region: { description: "Region code.", schema: { type: "string", enum: ["north", "south"], externalDocs: docs("regions") } } },
    messages: {
      orderPicked: {
        name: "orderPicked",
        title: "Order picked",
        contentType: "application/json",
        externalDocs: docs("order-picked-message"),
        tags: [{ name: "picking", description: "Picking events.", externalDocs: docs("picking") }],
        payload: { $ref: "#/components/schemas/PickedPayload" },
      },
      pickingCorrected: {
        name: "pickingCorrected",
        title: "Picking corrected",
        externalDocs: { $ref: "#/components/x-docs/corrections" },
        payload: { type: "object", properties: { orderId: { type: "string" } } },
      },
      vanTelemetryV2: {
        name: "vanTelemetryV2",
        schemaFormat: "application/vnd.apache.avro+json;version=1.9.0",
        payload: { $ref: "#/components/schemas/VanTelemetryAvro" },
      },
    },
    operationTraits: {
      kafkaProducer: {
        externalDocs: docs("kafka-producer"),
        tags: [{ name: "producers", description: "Kafka producers.", externalDocs: docs("producers") }],
        bindings: { kafka: { groupId: { type: "string", externalDocs: incomplete }, bindingVersion: "0.4.0" } },
      },
    },
    messageTraits: {
      storeHeaders: {
        externalDocs: docs("store-headers"),
        headers: { type: "object", externalDocs: docs("store-header-schema"), properties: { storeId: { type: "string" } } },
      },
    },
    "x-docs": {
      delivery: docs("delivery"),
      corrections: { $ref: "#/components/x-docs/correctionsTarget" },
      correctionsTarget: docs("corrections"),
      vans: docs("vans"),
      windows: docs("delivery-windows"),
      unreferenced: incomplete,
    },
  },
};
