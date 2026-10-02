module.exports = {
  "asyncapi": "2.5.0",
  "info": {
    "title": "Payments Gateway Events",
    "version": "4.0.0",
    "description": "Degenerate structures around tags; nothing here is a tag name to validate."
  },
  "servers": {
    "nullServer": null,
    "scalarServer": "notAServer",
    "refServer": { "$ref": "#/components/servers/missing", "tags": [{ "name": "Not_Evaluated" }] },
    "nullTags": { "url": "kafka:9092", "protocol": "kafka", "tags": null },
    "objectTags": { "url": "kafka:9092", "protocol": "kafka", "tags": { "name": "Not_An_Array" } },
    "x-extension": { "tags": [{ "name": "Not_Evaluated" }] }
  },
  "tags": [{ "$ref": "#/components/tags/missing" }, { "$ref": "./tags.yaml#/Payments_Tag" }],
  "channels": {
    "nullChannel": null,
    "refChannel": { "$ref": "#/components/channels/missing" },
    "nullOperations": { "publish": null, "subscribe": "notAnOperation" },
    "refOperation": { "publish": { "$ref": "#/components/operations/missing", "tags": [{ "name": "Not_Evaluated" }] } },
    "degenerate": {
      "publish": {
        "tags": "notAList",
        "traits": [null, "notATrait", { "$ref": "#/components/operationTraits/missing", "tags": [{ "name": "Not_Evaluated" }] }],
        "message": {
          "tags": [],
          "traits": { "tags": [{ "name": "Not_An_Array_Of_Traits" }] }
        }
      },
      "subscribe": {
        "message": {
          "oneOf": [null, "notAMessage", { "$ref": "#/components/messages/missing" }],
          "tags": [{ "name": "Not_Evaluated_Next_To_OneOf" }]
        }
      }
    },
    "arrayMessage": { "publish": { "message": [{ "tags": [{ "name": "Not_Evaluated" }] }] } }
  },
  "components": {
    "servers": null,
    "channels": { "nullChannel": null },
    "messages": { "nullMessage": null, "refMessage": { "$ref": "./messages.yaml#/Payment_Message" } },
    "operationTraits": { "nullTrait": null, "noTags": { "description": "No tags." } },
    "messageTraits": { "refTrait": { "$ref": "#/components/messageTraits/missing", "tags": [{ "name": "Not_Evaluated" }] } }
  }
};
