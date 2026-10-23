module.exports = {
  "asyncapi": "2.5.0",
  "info": {
    "title": "Customer Events",
    "version": "3.2.0",
    "description": "Traits are merged into the message, but each value is reported where it is declared."
  },
  "channels": {
    "customers/registered": {
      "subscribe": {
        "message": {
          "messageId": "customerRegistered",
          "name": "customerRegistered",
          "traits": [
            { "name": "Customer_Registered_Trait" },
            { "$ref": "#/components/messageTraits/auditTrait" }
          ]
        }
      }
    },
    "customers/deleted": {
      "subscribe": {
        "message": {
          "messageId": "Customer_Deleted",
          "traits": [{ "messageId": "customerDeleted", "name": "customerDeleted" }]
        }
      }
    },
    "customers/updated": {
      "subscribe": { "message": { "$ref": "#/components/messages/customerUpdated" } }
    },
    "customers/merged": {
      "subscribe": { "message": { "$ref": "#/components/messages/customerUpdated" } }
    }
  },
  "components": {
    "messages": {
      "customerUpdated": {
        "messageId": "customerUpdated",
        "traits": [{ "$ref": "#/components/messageTraits/auditTrait" }]
      }
    },
    "messageTraits": {
      "auditTrait": { "messageId": "AuditTrait", "name": "auditTrait" }
    }
  }
};
