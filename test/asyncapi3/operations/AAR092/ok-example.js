const message = (name) => ({ $ref: `#/components/messages/${name}` });
const channel = (name) => ({ $ref: `#/channels/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:es:quality:retail:order-platform",
  info: {
    title: "Quality Retail Order Platform",
    version: "6.1.0",
    description: "Orders, store telemetry, warehouse commands and customer chat of the retail platform.",
    contact: { name: "Retail Integration", email: "retail@quality.es" },
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    production: { host: "kafka.retail.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", security: [{ $ref: "#/components/securitySchemes/saslScram" }] },
    stores: { host: "mqtt.retail.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
    warehouse: { host: "rabbit.retail.quality.es:5671", pathname: "/retail", protocol: "amqps", protocolVersion: "0.9.1" },
    chat: { host: "chat.retail.quality.es", pathname: "/ws", protocol: "wss" },
  },
  channels: {
    orderPlaced: {
      address: "retail.cdc.orders.placed.v1",
      description: "Orders placed in any sales channel.",
      messages: { orderPlaced: message("orderPlaced"), orderPlacedAvro: message("orderPlacedAvro") },
      bindings: { kafka: { topic: "retail.cdc.orders.placed.v1", partitions: 12, bindingVersion: "0.5.0" } },
    },
    storeTelemetry: {
      address: "stores/{storeId}/sensors/{sensorId}/telemetry",
      description: "Store sensor telemetry.",
      parameters: { storeId: { description: "Store code.", enum: ["MAD001", "BCN002"], default: "MAD001" }, sensorId: { description: "Sensor identifier.", location: "$message.payload#/sensorId" } },
      messages: { telemetry: message("telemetry") },
    },
    pickCommands: { address: "warehouse.cmd.pick", description: "Pick commands for the warehouse.", messages: { pickRequested: message("pickRequested") } },
    pickReplies: { address: null, description: "Dynamic replies to pick commands.", messages: { pickAccepted: message("pickAccepted") } },
    chat: { address: "/support/{sessionId}", description: "Customer support chat.", parameters: { sessionId: {} }, messages: { chatMessage: message("chatMessage") } },
    partnerFeed: { $ref: "./partners/feed-channels.yaml#/partnerFeed" },
    "x-legacy": { address: "retail.cdc.legacy.v1", description: "Legacy feed.", messages: { orderPlaced: message("orderPlaced") } },
  },
  operations: {
    publishOrderPlaced: {
      action: "send",
      channel: channel("orderPlaced"),
      title: "Publish order placed",
      summary: "Publish an order placed in any sales channel.",
      description: "Published once the payment is authorised.",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      tags: [{ name: "orders" }],
      messages: [{ $ref: "#/channels/orderPlaced/messages/orderPlaced" }, { $ref: "#/channels/orderPlaced/messages/orderPlacedAvro" }],
      bindings: { kafka: { clientId: { type: "string", enum: ["orders-service"] }, bindingVersion: "0.5.0" } },
    },
    receiveOrderPlaced: {
      action: "receive",
      channel: channel("orderPlaced"),
      traits: [trait("fulfilment")],
      messages: [{ $ref: "#/channels/orderPlaced/messages/orderPlaced" }],
    },
    receiveTelemetry: { action: "receive", channel: channel("storeTelemetry"), summary: "Receive store telemetry.", traits: [trait("blankSummary")] },
    requestPick: {
      action: "send",
      channel: channel("pickCommands"),
      summary: "Request a pick in the warehouse.",
      reply: { address: { location: "$message.header#/replyTo" }, channel: channel("pickReplies"), messages: [{ $ref: "#/channels/pickReplies/messages/pickAccepted" }] },
    },
    chatWithCustomer: { $ref: "#/components/operations/chatWithCustomer" },
    receivePartnerFeed: { action: "receive", channel: channel("partnerFeed"), summary: "Receive the partner feed." },
    remoteOperation: { $ref: "./partners/operations.yaml#/receiveFeed" },
    "x-replayLegacy": { action: "send", channel: channel("x-legacy"), summary: 1 },
    sendExternalChannel: { action: "send", channel: { $ref: "https://specs.example.io/channels/orders.yaml" }, summary: "Send to an external channel." },
    summaryFromTextRef: { action: "send", channel: channel("orderPlaced"), summary: { $ref: "#/components/x-texts/summary" } },
    summaryFromExternalTrait: { action: "receive", channel: channel("orderPlaced"), traits: [{ $ref: "./partners/traits.yaml#/orders" }] },
  },
  components: {
    operations: {
      chatWithCustomer: { action: "send", channel: channel("chat"), summary: "Chat with a customer.", traits: [trait("chat")] },
      replayOrders: { action: "send", channel: channel("orderPlaced"), traits: [trait("fulfilment"), trait("replay")] },
    },
    operationTraits: {
      fulfilment: { summary: "Fulfil orders.", bindings: { kafka: { groupId: { type: "string", enum: ["fulfilment"] }, bindingVersion: "0.5.0" } } },
      blankSummary: { summary: "" },
      chat: { description: "Chat trait without summary." },
      replay: { summary: "Replay orders." },
    },
    messages: {
      orderPlaced: {
        name: "orderPlaced",
        contentType: "application/json",
        correlationId: { location: "$message.header#/correlationId" },
        headers: { type: "object", properties: { correlationId: { type: "string" } } },
        payload: { type: "object", properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
      },
      orderPlacedAvro: {
        name: "orderPlacedAvro",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "OrderPlaced", namespace: "es.quality.retail", fields: [{ name: "orderId", type: "string" }, { name: "couponCode", type: ["null", "string"], default: null }] },
        },
      },
      telemetry: { name: "telemetry", payload: { type: "object", properties: { sensorId: { type: "string" }, value: { type: ["number", "null"] } } } },
      pickRequested: { name: "pickRequested", payload: { type: "object", properties: { pickId: { type: "string" } } } },
      pickAccepted: { name: "pickAccepted", payload: { type: "object" } },
      chatMessage: { name: "chatMessage", payload: { type: "string" } },
    },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    "x-texts": { summary: "Send an order placed." },
  },
};
