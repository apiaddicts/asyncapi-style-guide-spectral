module.exports = {
  "asyncapi": "2.3.0",
  "info": {
    "title": "Inventory Events",
    "version": "2.0.0",
    "description": "Degenerate structures around messages, none of which declares a messageId or name to validate."
  },
  "channels": {
    "inventory/null-channel": null,
    "inventory/scalar-channel": "notAChannel",
    "inventory/array-channel": [{ "publish": { "message": { "messageId": "Not_Evaluated" } } }],
    "inventory/ref-channel": { "$ref": "#/components/channels/missing" },
    "x-internal-channel": { "publish": { "message": { "messageId": "Not_Evaluated" } } },
    "inventory/null-operations": { "publish": null, "subscribe": "notAnOperation" },
    "inventory/ref-operation": { "publish": { "$ref": "#/components/operations/missing", "message": { "messageId": "Not_Evaluated" } } },
    "inventory/messages": {
      "publish": { "message": null },
      "subscribe": { "message": "notAMessage" }
    },
    "inventory/array-message": {
      "publish": { "message": [{ "messageId": "Not_Evaluated" }] },
      "subscribe": { "message": { "$ref": "#/components/messages/missing", "messageId": "Not_Evaluated" } }
    },
    "inventory/one-of": {
      "publish": {
        "message": {
          "oneOf": [null, "notAMessage", { "$ref": "#/components/messages/missing" }, [{ "messageId": "Not_Evaluated" }]]
        }
      },
      "subscribe": {
        "message": {
          "oneOf": [{ "oneOf": [{ "payload": { "type": "object" } }] }],
          "messageId": "Not_Evaluated_Next_To_OneOf"
        }
      }
    },
    "inventory/traits": {
      "publish": {
        "message": {
          "payload": { "type": "object", "properties": { "name": { "type": "string" } } },
          "traits": [null, "notATrait", { "$ref": "#/components/messageTraits/missing", "name": "Not_Evaluated" }]
        }
      },
      "subscribe": {
        "message": { "traits": { "name": "Not_An_Array" } }
      }
    },
    "inventory/v3-shape": {
      "address": "inventory/v3-shape",
      "messages": { "Stock_Adjusted": { "name": "Stock_Adjusted" } }
    }
  },
  "operations": {
    "Send_Stock": { "action": "send", "messages": [{ "name": "Not_Evaluated" }] }
  },
  "components": {
    "channels": null,
    "messages": {
      "Stock_Adjusted_Component": { "$ref": "./inventory-messages.yaml#/StockAdjusted" },
      "nullMessage": null,
      "scalarMessage": "notAMessage"
    },
    "messageTraits": {
      "nullTrait": null,
      "refTrait": { "$ref": "#/components/messageTraits/nullTrait" },
      "x-extension-trait": "Not_A_Trait"
    },
    "schemas": {
      "Stock": {
        "type": "record",
        "name": "Stock_Record",
        "fields": [{ "name": "Warehouse_Code", "type": "string" }]
      }
    }
  }
};
