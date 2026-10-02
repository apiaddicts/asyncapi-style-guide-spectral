module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "title": "Smart Building Sensors",
    "version": "1.2.0",
    "description": "Degenerate structures around tags; nothing here is a tag name to validate.",
    "tags": null
  },
  "tags": [{ "name": "Not_Evaluated_In_V3" }],
  "servers": {
    "nullServer": null,
    "refServer": { "$ref": "#/components/servers/missing", "tags": [{ "name": "Not_Evaluated" }] },
    "objectTags": { "host": "ws.example.com", "protocol": "wss", "tags": { "name": "Not_An_Array" } }
  },
  "channels": {
    "nullChannel": null,
    "refChannel": { "$ref": "#/components/channels/missing", "tags": [{ "name": "Not_Evaluated" }] },
    "x-extension": { "tags": [{ "name": "Not_Evaluated" }] },
    "degenerate": {
      "address": null,
      "tags": [null, { "$ref": "./tags.yaml#/External_Tag" }, { "description": "No name." }, { "name": null }],
      "messages": {
        "nullMessage": null,
        "refMessage": { "$ref": "#/components/messages/missing", "tags": [{ "name": "Not_Evaluated" }] },
        "noTags": { "payload": { "type": "object" } },
        "oneOfMessage": { "oneOf": [{ "tags": [{ "name": "Not_Evaluated_In_V3" }] }] },
        "badTraits": { "traits": [null, { "$ref": "#/components/messageTraits/missing", "tags": [{ "name": "Not_Evaluated" }] }] }
      },
      "publish": { "tags": [{ "name": "Not_Evaluated_In_V3" }], "message": { "tags": [{ "name": "Not_Evaluated_In_V3" }] } }
    }
  },
  "operations": {
    "nullOperation": null,
    "refOperation": { "$ref": "#/components/operations/missing", "tags": [{ "name": "Not_Evaluated" }] },
    "noTags": { "action": "send", "channel": { "$ref": "#/channels/degenerate" }, "traits": { "tags": [{ "name": "Not_An_Array" }] } }
  },
  "components": {
    "operations": null,
    "messages": { "external": { "$ref": "./messages.yaml#/Building_Message" } },
    "tags": {
      "nullTag": null,
      "refTag": { "$ref": "#/components/tags/nullTag" },
      "scalarTag": "Not_A_Tag_Object",
      "x-extension": { "name": "Not_Evaluated" }
    }
  }
};
