const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:space:imagery-marketplace",
  info: {
    title: "Satellite Imagery Marketplace Events",
    version: "2.7.0",
    description: "Tasking orders, scene captures and delivery notices of the satellite imagery marketplace.",
    termsOfService: "https://imagery.space.example.io/terms",
    contact: { name: "Marketplace Operations", url: "https://imagery.space.example.io/ops", email: "ops@imagery.space.example.io" },
    license: {
      name: "Creative Commons Attribution 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      "x-spdx-id": "CC-BY-4.0",
    },
    tags: [{ name: "tasking", description: "Satellite tasking events." }],
    externalDocs: { description: "Marketplace handbook.", url: "https://imagery.space.example.io/handbook" },
  },
  defaultContentType: "application/json",
  servers: {
    imageryKafka: {
      host: "kafka-{region}.imagery.space.example.io:9093",
      protocol: "kafka-secure",
      description: "Marketplace event backbone.",
      variables: { region: { enum: ["eu-central", "us-west"], default: "eu-central" } },
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.imagery.space.example.io", bindingVersion: "0.5.0" } },
    },
    groundMqtt: { host: "ground.space.example.io:8883", protocol: "secure-mqtt", description: "Ground station gateway.", bindings: { mqtt: { clientId: "imagery-ingest", cleanSession: false, keepAlive: 30, bindingVersion: "0.2.0" } } },
    buyerWs: { host: "live.imagery.space.example.io", pathname: "/ws/orders", protocol: "wss", title: "Live order tracking", description: "Buyer portal live channel." },
  },
  channels: {
    taskingOrdered: {
      address: "imagery.cmd.tasking.ordered.v2",
      title: "Tasking orders",
      description: "Tasking orders placed by buyers.",
      servers: [{ $ref: "#/servers/imageryKafka" }],
      bindings: { kafka: { topic: "imagery.cmd.tasking.ordered.v2", partitions: 12, bindingVersion: "0.5.0" } },
      messages: {
        taskingOrdered: { $ref: "#/components/messages/taskingOrdered" },
        taskingOrderedAvro: {
          name: "taskingOrderedAvro",
          title: "Tasking ordered in Avro",
          payload: {
            schemaFormat: AVRO,
            schema: {
              type: "record",
              name: "TaskingOrdered",
              namespace: "io.example.space.imagery",
              fields: [
                { name: "orderId", type: "string" },
                { name: "aoi", type: "string" },
                { name: "license", type: ["null", { type: "record", name: "ImageryLicense", fields: [{ name: "name", type: ["null", "string"], default: null }, { name: "url", type: ["null", "string"], default: null }] }], default: null },
              ],
            },
          },
        },
      },
    },
    sceneCaptured: {
      address: "satellites/{satelliteId}/scenes",
      title: "Captured scenes",
      description: "Scenes downlinked by a satellite.",
      servers: [{ $ref: "#/servers/groundMqtt" }],
      parameters: { satelliteId: { description: "Satellite identifier.", examples: ["sat-07"] } },
      messages: { sceneCaptured: { $ref: "#/components/messages/sceneCaptured" } },
    },
    orderUpdates: {
      address: null,
      title: "Order updates",
      description: "Replies addressed through the replyTo header.",
      servers: [{ $ref: "#/servers/buyerWs" }],
      messages: { orderUpdated: { $ref: "#/components/messages/orderUpdated" } },
    },
  },
  operations: {
    orderTasking: {
      action: "send",
      title: "Order tasking",
      summary: "The buyer portal orders satellite tasking.",
      channel: { $ref: "#/channels/taskingOrdered" },
      messages: [{ $ref: "#/channels/taskingOrdered/messages/taskingOrdered" }, { $ref: "#/channels/taskingOrdered/messages/taskingOrderedAvro" }],
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
      reply: {
        address: { location: "$message.header#/replyTo" },
        channel: { $ref: "#/channels/orderUpdates" },
        messages: [{ $ref: "#/channels/orderUpdates/messages/orderUpdated" }],
      },
    },
    planTasking: {
      action: "receive",
      title: "Plan tasking",
      summary: "Mission planning receives tasking orders.",
      channel: { $ref: "#/channels/taskingOrdered" },
      bindings: { kafka: { groupId: { type: "string", enum: ["mission-planning"] }, bindingVersion: "0.5.0" } },
    },
    receiveScene: {
      action: "receive",
      title: "Receive scenes",
      channel: { $ref: "#/channels/sceneCaptured" },
      messages: [{ $ref: "#/channels/sceneCaptured/messages/sceneCaptured" }],
    },
  },
  components: {
    messages: {
      taskingOrdered: {
        name: "taskingOrdered",
        title: "Tasking ordered",
        contentType: "application/json",
        traits: [{ $ref: "#/components/messageTraits/traced" }],
        correlationId: { $ref: "#/components/correlationIds/orderId" },
        payload: { $ref: "#/components/schemas/TaskingOrder" },
      },
      sceneCaptured: {
        name: "sceneCaptured",
        title: "Scene captured",
        payload: { type: "object", required: ["sceneId"], properties: { sceneId: { type: "string" }, cloudCover: { type: ["number", "null"], minimum: 0, maximum: 100 } } },
      },
      orderUpdated: {
        name: "orderUpdated",
        title: "Order updated",
        payload: {
          schemaFormat: "application/schema+json;version=draft-07",
          schema: { type: "object", properties: { orderId: { type: "string" }, license: { $ref: "#/components/schemas/ImageryLicense" }, etaHours: { type: ["integer", "null"] } } },
        },
      },
    },
    schemas: {
      TaskingOrder: {
        type: "object",
        required: ["orderId", "aoi"],
        properties: {
          orderId: { type: "string", format: "uuid" },
          aoi: { type: "string" },
          maxCloudCover: { type: ["number", "null"] },
          license: { $ref: "#/components/schemas/ImageryLicense" },
        },
      },
      ImageryLicense: { type: "object", properties: { name: { type: "string" }, url: { type: "string", format: "uri" } } },
    },
    correlationIds: { orderId: { description: "Tasking order identifier.", location: "$message.payload#/orderId" } },
    messageTraits: { traced: { headers: { type: "object", properties: { traceparent: { type: "string" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["buyer-portal"] }, bindingVersion: "0.5.0" } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials per service." } },
  },
};
