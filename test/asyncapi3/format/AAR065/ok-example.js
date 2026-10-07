module.exports = {
  "asyncapi": "3.0.0",
  "id": "urn:com:logistics:fleet-telemetry",
  "info": {
    "title": "Fleet Telemetry Service",
    "version": "2.1.0",
    "description": "MQTT and Kafka events of the fleet telemetry service, every message key and name in camelCase.",
    "tags": [{ "name": "Fleet_Management" }]
  },
  "defaultContentType": "application/json",
  "servers": {
    "mqttBroker": { "host": "mqtt.fleet.example.com:8883", "pathname": "/telemetry", "protocol": "secure-mqtt" }
  },
  "channels": {
    "vehiclePositions": {
      "address": "fleet/{vehicleId}/positions",
      "parameters": { "vehicleId": { "description": "Vehicle identifier.", "enum": ["truck-1", "Van_2"] } },
      "messages": {
        "vehiclePositionReported": { "$ref": "#/components/messages/vehiclePositionReported" },
        "vehicleIdle": {
          "name": "vehicleIdle",
          "title": "Vehicle Idle",
          "contentType": "application/json",
          "correlationId": { "location": "$message.header#/correlationId" },
          "headers": {
            "type": "object",
            "properties": { "name": { "type": "string", "const": "Vehicle_Idle_Header" } }
          },
          "payload": {
            "type": "object",
            "properties": {
              "name": { "type": ["string", "null"] },
              "idleSeconds": { "type": "integer", "format": "int32" }
            }
          },
          "examples": [{ "name": "Vehicle_Idle_Example", "payload": { "name": "Truck One", "idleSeconds": 30 } }],
          "traits": [{ "$ref": "#/components/messageTraits/telemetryHeaders" }, { "name": "vehicleIdleV2" }],
          "bindings": { "mqtt": { "bindingVersion": "0.2.0" } }
        }
      }
    },
    "engineDiagnostics": {
      "address": null,
      "messages": {
        "engineFaultDetected": {
          "name": "engineFaultDetected",
          "contentType": "application/vnd.apache.avro+json",
          "payload": {
            "schemaFormat": "application/vnd.apache.avro;version=1.9.0",
            "schema": {
              "type": "record",
              "name": "EngineFaultDetected",
              "namespace": "org.madrid.fleet.cdc.engine",
              "fields": [
                { "name": "fault_code", "type": "string" },
                { "name": "Severity_Level", "type": ["null", "int"], "default": null }
              ]
            }
          }
        },
        "engine2fa": { "name": "engine" }
      }
    },
    "sharedChannel": { "$ref": "#/components/channels/maintenanceWindow" }
  },
  "operations": {
    "reportPosition": {
      "action": "send",
      "channel": { "$ref": "#/channels/vehiclePositions" },
      "messages": [{ "$ref": "#/channels/vehiclePositions/messages/vehiclePositionReported" }],
      "reply": {
        "address": { "location": "$message.header#/replyTo" },
        "channel": { "$ref": "#/channels/engineDiagnostics" },
        "messages": [{ "$ref": "#/channels/engineDiagnostics/messages/engineFaultDetected" }]
      }
    },
    "receiveDiagnostics": {
      "action": "receive",
      "channel": { "$ref": "#/channels/engineDiagnostics" }
    }
  },
  "components": {
    "channels": {
      "maintenanceWindow": {
        "address": "fleet/maintenance",
        "messages": { "maintenanceScheduled": { "name": "maintenanceScheduled" } }
      }
    },
    "messages": {
      "vehiclePositionReported": {
        "name": "vehiclePositionReported",
        "payload": { "$ref": "#/components/schemas/Position" },
        "traits": [{ "$ref": "#/components/messageTraits/telemetryHeaders" }]
      }
    },
    "schemas": {
      "Position": {
        "type": "object",
        "properties": { "name": { "type": "string" }, "latitude": { "type": "number", "format": "double" } }
      }
    },
    "messageTraits": {
      "telemetryHeaders": {
        "name": "telemetryHeaders",
        "headers": { "type": "object", "properties": { "name": { "type": "string" } } }
      }
    },
    "replies": {
      "positionAck": { "messages": [{ "$ref": "#/components/messages/vehiclePositionReported" }] }
    }
  }
};
