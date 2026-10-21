const message = (name) => ({ $ref: `#/components/messages/${name}` });
const channel = (name) => ({ $ref: `#/channels/${name}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const orders = channel("orderPlaced");

module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Quality Retail Order Events", version: "4.2.0", description: "Order lifecycle events of the retail platform." },
  servers: {
    production: { host: "kafka.retail.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" },
    stores: { host: "mqtt.retail.quality.es:8883", protocol: "secure-mqtt", protocolVersion: "5.0" },
  },
  channels: {
    orderPlaced: { address: "retail.cdc.orders.placed.v1", description: "Orders placed.", messages: { orderPlaced: message("orderPlaced") } },
    storeTelemetry: { address: "stores/{storeId}/telemetry", description: "Store telemetry.", parameters: { storeId: {} }, messages: { telemetry: message("telemetry") } },
    pickReplies: { address: null, description: "Pick replies.", messages: { pickAccepted: message("telemetry") } },
    draft: {},
  },
  operations: {
    noAction: { channel: orders, summary: "Publish orders." },
    nullAction: { action: null, channel: orders, summary: "Publish orders." },
    blankAction: { action: "  ", channel: orders, summary: "Publish orders." },
    noChannel: { action: "send", summary: "Publish orders." },
    danglingChannel: { action: "send", channel: channel("retired"), summary: "Publish orders." },
    emptyChannelRef: { action: "receive", channel: channel("draft"), summary: "Receive drafts." },
    cyclicChannel: { action: "receive", channel: { $ref: "#/components/x-channels/loopA" }, summary: "Receive loops." },
    noSummary: { action: "receive", channel: channel("storeTelemetry") },
    emptySummary: { action: "receive", channel: channel("storeTelemetry"), summary: "" },
    zeroWidthSummary: { action: "receive", channel: channel("storeTelemetry"), summary: "\u200b\ufeff" },
    emptyOperation: {},
    v2Style: { operationId: "publishOrder", summary: "Publish orders.", message: message("orderPlaced") },
    lookAlikes: { operationId: "publishOrder", type: "send", title: "Orders", description: "Orders.", message: message("orderPlaced") },
    upperCase: { Action: "send", Channel: orders, Summary: "Publish orders." },
    extensionsOnly: { "x-action": "send", "x-channel": orders, "x-summary": "Publish orders." },
    summaryInDescription: { action: "send", channel: orders, description: "Publish orders." },
    ownBlankOverTrait: { action: "send", channel: orders, summary: "", traits: [trait("fulfilment")] },
    traitBlank: { action: "receive", channel: orders, traits: [trait("blankSummary")] },
    traitsLastBlank: { action: "receive", channel: orders, traits: [trait("fulfilment"), { summary: " " }] },
    traitActionOnly: { summary: "Publish orders.", traits: [{ action: "send", channel: orders }] },
    replyOnly: { action: "send", summary: "Request picks.", reply: { channel: channel("pickReplies") } },
    nullOperation: null,
    stringOperation: "publishOrderPlaced",
    listOperation: [{ action: "send", channel: orders, summary: "Publish orders." }],
    "x-partnerSync": { action: "receive", channel: orders },
  },
  components: {
    operations: {
      sharedHub: { action: "send", summary: "Shared hub without channel." },
      legacyReplay: { action: "", channel: {}, summary: null },
      nullShared: null,
      compliant: { action: "send", channel: orders, summary: "Compliant shared operation." },
    },
    operationTraits: {
      fulfilment: { summary: "Fulfil orders." },
      blankSummary: { summary: "" },
    },
    messages: {
      orderPlaced: { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } } },
      telemetry: { name: "telemetry", payload: { type: "object" } },
    },
    "x-channels": { loopA: { $ref: "#/components/x-channels/loopB" }, loopB: { $ref: "#/components/x-channels/loopA" } },
  },
};
