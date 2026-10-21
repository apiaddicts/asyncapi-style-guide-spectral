module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Inventory Stock Events", version: "1.0.0" },
  defaultContentType: 2.6,
  channels: {
    "inventory/stock": {
      publish: {
        operationId: "publishStockEvents",
        message: {
          oneOf: [
            { messageId: "stockAdjusted", contentType: 1001 },
            { messageId: "stockCounted", contentType: true },
            { messageId: "stockReserved", contentType: { value: "application/json" } },
            { messageId: "stockReleased", contentType: ["application/json"] },
            { messageId: "stockAudited", contentType: "" },
            { messageId: "stockArchived", contentType: null },
            { messageId: "stockMoved", contentType: false },
            { messageId: "stockFrozen", contentType: [] },
          ],
        },
      },
    },
  },
  components: {
    messageTraits: {
      numericTrait: { contentType: 0 },
      nullTrait: { contentType: null },
    },
  },
};
