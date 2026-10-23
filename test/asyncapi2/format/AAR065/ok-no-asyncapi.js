module.exports = {
  "info": {
    "title": "Not An AsyncAPI Document",
    "version": "1.0.0",
    "description": "Without the asyncapi field the document is not inspected."
  },
  "channels": {
    "inventory/stock": {
      "publish": { "message": { "messageId": "Stock_Adjusted", "name": "Stock Adjusted" } }
    }
  },
  "components": {
    "messages": {
      "stockAdjusted": { "messageId": "STOCK-ADJUSTED" }
    }
  }
};
