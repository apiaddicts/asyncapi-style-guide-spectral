module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "title": "Smart Building Sensors",
    "version": "1.2.0",
    "description": "Tag names that break kebab-case in every location AsyncAPI 3.x allows.",
    "tags": [{ "name": "Building Automation" }, { "$ref": "#/components/tags/iotDevices" }]
  },
  "servers": {
    "wsGateway": { "host": "ws.building.example.com", "protocol": "wss", "tags": [{ "name": "edgeGateway" }] }
  },
  "channels": {
    "roomTemperature": {
      "address": "buildings/{buildingId}/temperature",
      "tags": [{ "name": "hvac" }, { "name": "temperature_readings" }],
      "messages": {
        "temperatureMeasured": {
          "tags": [{ "name": "Telemetry" }, { "$ref": "#/components/tags/iotDevices" }],
          "traits": [{ "$ref": "#/components/messageTraits/sensorHeaders" }, { "tags": [{ "name": "inline trait" }] }]
        },
        "doorOpened": { "$ref": "#/components/messages/doorOpened" }
      }
    },
    "accessControl": {
      "address": null,
      "messages": { "badgeScanned": { "tags": [{ "name": "badge-" }] } }
    }
  },
  "operations": {
    "publishTemperature": {
      "action": "send",
      "channel": { "$ref": "#/channels/roomTemperature" },
      "tags": [{ "name": "PUBLISHERS" }],
      "traits": [{ "$ref": "#/components/operationTraits/mqttQos" }, { "tags": [{ "name": "qos_1" }] }]
    },
    "receiveDoors": {
      "action": "receive",
      "channel": { "$ref": "#/channels/roomTemperature" },
      "tags": [{ "$ref": "#/components/tags/iotDevices" }]
    }
  },
  "components": {
    "servers": {
      "mqttBroker": { "host": "mqtt.building.example.com", "protocol": "secure-mqtt", "tags": [{ "name": "MQTT" }] }
    },
    "channels": {
      "maintenance": {
        "address": "buildings/maintenance",
        "tags": [{ "name": "Maintenance" }],
        "messages": { "ticketOpened": { "tags": [{ "name": "tickets.opened" }] } }
      }
    },
    "operations": {
      "receiveAccess": { "action": "receive", "tags": [{ "name": "accessControl" }] }
    },
    "messages": {
      "doorOpened": { "tags": [{ "name": "doors" }, { "name": "Security Events" }] }
    },
    "operationTraits": {
      "mqttQos": { "tags": [{ "name": "MqttQos" }] }
    },
    "messageTraits": {
      "sensorHeaders": { "tags": [{ "name": "sensor__headers" }] }
    },
    "tags": {
      "iotDevices": { "name": "IoT Devices" },
      "production": { "name": "production" }
    }
  }
};
