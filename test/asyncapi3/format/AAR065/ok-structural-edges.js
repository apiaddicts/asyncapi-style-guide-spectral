module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "title": "Fleet Telemetry Service",
    "version": "2.1.0",
    "description": "Degenerate structures around messages; nothing here is a message key or name to validate."
  },
  "channels": {
    "nullChannel": null,
    "scalarChannel": "notAChannel",
    "arrayChannel": [{ "messages": { "Not_Evaluated": {} } }],
    "refChannel": { "$ref": "#/components/channels/missing", "messages": { "Not_Evaluated": {} } },
    "x-internal": { "messages": { "Not_Evaluated": {} } },
    "nullMessages": { "address": null, "messages": null },
    "arrayMessages": { "address": "fleet/array", "messages": [{ "name": "Not_Evaluated" }] },
    "scalarMessages": { "address": "fleet/scalar", "messages": "notAMap" },
    "emptyMessages": { "address": "fleet/empty", "messages": {} },
    "degenerateMessages": {
      "address": "fleet/degenerate",
      "messages": {
        "Null_Message": null,
        "Scalar_Message": "notAMessage",
        "Array_Message": [{ "name": "Not_Evaluated" }],
        "x-extension-message": { "name": "Not_Evaluated" },
        "validMessage": {
          "payload": { "type": "object", "properties": { "name": { "type": "string" } } },
          "traits": [null, "notATrait", { "$ref": "#/components/messageTraits/missing", "name": "Not_Evaluated" }]
        },
        "traitsNotArray": { "traits": { "name": "Not_An_Array" } }
      }
    },
    "v2Shape": {
      "address": "fleet/v2-shape",
      "publish": { "message": { "messageId": "Not_Evaluated", "name": "Not_Evaluated" } },
      "subscribe": { "message": { "oneOf": [{ "messageId": "Not_Evaluated" }] } }
    }
  },
  "operations": {
    "sendInline": {
      "action": "send",
      "channel": { "$ref": "#/channels/degenerateMessages" },
      "messages": [{ "name": "Not_Evaluated_Inline_In_Operation" }],
      "reply": { "messages": [{ "name": "Not_Evaluated_Inline_In_Reply" }] }
    }
  },
  "components": {
    "channels": { "nullChannel": null, "refChannel": { "$ref": "./channels.yaml#/fleet" } },
    "messages": {
      "Null_Component": null,
      "x-extension": { "name": "Not_Evaluated" },
      "externalMessage": { "$ref": "./messages.yaml#/Vehicle_Event" }
    },
    "messageTraits": {
      "nullTrait": null,
      "scalarTrait": "notATrait",
      "refTrait": { "$ref": "#/components/messageTraits/nullTrait", "name": "Not_Evaluated" }
    },
    "replies": { "ack": { "messages": [{ "name": "Not_Evaluated_Inline_In_Component_Reply" }] } }
  }
};
