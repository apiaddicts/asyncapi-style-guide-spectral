module.exports = {
  "asyncapi": "2.4.0",
  "info": {
    "title": "Inventory Events",
    "version": "2.0.0",
    "description": "messageId and name values that are not strings or are empty."
  },
  "channels": {
    "inventory/stock": {
      "publish": {
        "message": {
          "oneOf": [
            { "messageId": 1001, "name": true },
            { "messageId": "", "name": "   " },
            { "messageId": { "value": "stockAdjusted" }, "name": ["stockAdjusted"] },
            { "messageId": null, "name": null },
            { "messageId": 12.5 }
          ]
        }
      }
    }
  }
};
