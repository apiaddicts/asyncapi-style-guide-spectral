module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "title": "Smart Building Sensors",
    "version": "1.2.0",
    "description": "WebSocket and MQTT events of the smart building platform, every tag name in kebab-case.",
    "tags": [
      { "name": "building-automation" },
      { "$ref": "#/components/tags/iotDevices" }
    ]
  },
  "tags": [{ "name": "Not_Evaluated_In_V3" }],
  "servers": {
    "wsGateway": {
      "host": "ws.building.example.com",
      "pathname": "/sensors",
      "protocol": "wss",
      "tags": [{ "name": "edge-gateway" }, { "$ref": "#/components/tags/production" }]
    },
    "mqttBroker": { "$ref": "#/components/servers/mqttBroker" }
  },
  "channels": {
    "roomTemperature": {
      "address": "buildings/{buildingId}/rooms/{roomId}/temperature",
      "parameters": { "buildingId": { "description": "Building identifier." }, "roomId": { "enum": ["Room_A", "room-b"] } },
      "tags": [{ "name": "hvac" }, { "name": "temperature-readings" }],
      "messages": {
        "temperatureMeasured": {
          "name": "temperatureMeasured",
          "tags": [{ "name": "telemetry" }, { "$ref": "#/components/tags/iotDevices" }],
          "payload": {
            "type": "object",
            "properties": {
              "tags": { "type": ["array", "null"], "items": { "type": "string", "enum": ["Indoor Sensor"] } },
              "celsius": { "type": "number", "format": "float" }
            }
          },
          "examples": [{ "name": "Hot_Room", "payload": { "tags": ["Indoor Sensor"], "celsius": 31.5 } }],
          "traits": [{ "$ref": "#/components/messageTraits/sensorHeaders" }, { "tags": [{ "name": "inline-trait" }] }]
        },
        "doorOpened": { "$ref": "#/components/messages/doorOpened" }
      },
      "bindings": { "ws": { "method": "GET", "bindingVersion": "0.1.0" } }
    },
    "accessControl": {
      "address": null,
      "messages": {
        "badgeScanned": {
          "payload": {
            "schemaFormat": "application/vnd.apache.avro;version=1.9.0",
            "schema": { "type": "record", "name": "BadgeScanned", "fields": [{ "name": "Badge_Id", "type": ["null", "string"] }] }
          }
        }
      }
    }
  },
  "operations": {
    "publishTemperature": {
      "action": "send",
      "channel": { "$ref": "#/channels/roomTemperature" },
      "tags": [{ "name": "publishers" }, { "$ref": "#/components/tags/production" }],
      "traits": [{ "$ref": "#/components/operationTraits/mqttQos" }, { "tags": [{ "name": "qos-1" }] }],
      "messages": [{ "$ref": "#/channels/roomTemperature/messages/temperatureMeasured" }],
      "reply": { "channel": { "$ref": "#/channels/accessControl" } }
    },
    "sharedOperation": { "$ref": "#/components/operations/receiveAccess" }
  },
  "components": {
    "servers": {
      "mqttBroker": { "host": "mqtt.building.example.com:8883", "protocol": "secure-mqtt", "tags": [{ "name": "mqtt" }] }
    },
    "channels": {
      "maintenance": {
        "address": "buildings/maintenance",
        "tags": [{ "name": "maintenance" }],
        "messages": { "ticketOpened": { "tags": [{ "name": "tickets" }] } }
      }
    },
    "operations": {
      "receiveAccess": {
        "action": "receive",
        "channel": { "$ref": "#/channels/accessControl" },
        "tags": [{ "name": "access-control" }]
      }
    },
    "messages": {
      "doorOpened": { "name": "doorOpened", "tags": [{ "name": "doors" }, { "name": "security-events" }] }
    },
    "operationTraits": {
      "mqttQos": { "tags": [{ "name": "mqtt-qos" }], "bindings": { "mqtt": { "qos": 1, "bindingVersion": "0.2.0" } } }
    },
    "messageTraits": {
      "sensorHeaders": { "tags": [{ "name": "sensor-headers" }] }
    },
    "tags": {
      "iotDevices": { "name": "iot-devices", "description": "Connected devices." },
      "production": { "name": "production" },
      "Not_A_Tag_Name_Key": { "name": "component-key-is-not-a-name" }
    }
  }
};
