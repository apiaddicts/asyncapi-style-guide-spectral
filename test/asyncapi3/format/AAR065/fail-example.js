module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "title": "Fleet Telemetry Service",
    "version": "2.1.0",
    "description": "Message keys and names that break camelCase."
  },
  "channels": {
    "vehiclePositions": {
      "address": "fleet/{vehicleId}/positions",
      "messages": {
        "VehiclePositionReported": { "$ref": "#/components/messages/vehiclePositionReported" },
        "vehicle_idle": {
          "name": "vehicleIdle",
          "messageId": "Not_Evaluated_In_V3",
          "traits": [{ "$ref": "#/components/messageTraits/telemetryHeaders" }, { "name": "Vehicle Idle Trait" }]
        },
        "vehicle-stopped": { "name": "VehicleStopped" },
        "2vehicleStarted": { "name": "vehicleStarted" },
        "vehicleLowFuel": { "name": "vehicleLowFUEL", "oneOf": [{ "name": "Not_Evaluated_In_V3" }] }
      }
    },
    "engineDiagnostics": {
      "address": null,
      "messages": {
        "engineFaultDetected": {
          "name": "engine.fault.detected",
          "payload": {
            "schemaFormat": "application/vnd.apache.avro;version=1.9.0",
            "schema": { "type": "record", "name": "EngineFaultDetected", "fields": [] }
          }
        }
      }
    },
    "vehicleAlerts": {
      "address": "fleet/alerts",
      "messages": {
        "alertRaised": { "$ref": "#/components/messages/vehiclePositionReported" }
      }
    }
  },
  "operations": {
    "SendPosition": {
      "action": "send",
      "channel": { "$ref": "#/channels/vehiclePositions" },
      "messages": [{ "$ref": "#/channels/vehiclePositions/messages/VehiclePositionReported" }]
    }
  },
  "components": {
    "channels": {
      "maintenanceWindow": {
        "address": "fleet/maintenance",
        "messages": { "MAINTENANCE_SCHEDULED": { "name": "maintenanceScheduled" } }
      }
    },
    "messages": {
      "vehiclePositionReported": {
        "name": "Vehicle_Position_Reported",
        "traits": [{ "$ref": "#/components/messageTraits/telemetryHeaders" }]
      },
      "VehicleArchived": { "name": "vehicleArchived" }
    },
    "messageTraits": {
      "telemetryHeaders": { "name": "telemetry-headers", "messageId": "Not_Evaluated_In_V3" }
    }
  }
};
