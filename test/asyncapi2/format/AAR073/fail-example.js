const AVRO = "application/vnd.apache.avro;version=1.9.0";
const trait = (name) => ({ $ref: `#/components/messageTraits/${name}` });

const reading = {
  type: "object",
  required: ["shipmentId", "celsius"],
  properties: { shipmentId: { type: "string", format: "uuid" }, celsius: { type: "number", minimum: -80, maximum: 60 }, probe: { type: ["string", "null"] } },
};

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:coldchain:logistics",
  info: {
    title: "Cold Chain Logistics Events",
    version: "2.9.1",
    description: "Reefer telemetry, setpoint commands and customs events of a temperature-controlled logistics network.",
    contact: { name: "Cold Chain Platform", url: "https://coldchain.example.io", email: "platform@coldchain.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  servers: {
    kafkaHub: { url: "kafka.coldchain.example.io:9093", protocol: "kafka-secure", security: [{ saslScram: [] }] },
    rabbit: { url: "amqps://rabbit.coldchain.example.io:5671/reefers", protocol: "amqps" },
    sensors: { url: "mqtts://sensors.coldchain.example.io:8883", protocol: "secure-mqtt" },
    live: { url: "wss://live.coldchain.example.io/gateways", protocol: "wss" },
  },
  channels: {
    "coldchain.cdc.shipments.temperature.v2": {
      description: "Temperature log of every shipment.",
      servers: ["kafkaHub"],
      bindings: { kafka: { topic: "coldchain.cdc.shipments.temperature.v2", partitions: 12, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishShipmentTemperature",
        summary: "Reefers publish temperature logs.",
        message: { name: "shipmentTemperatureLogged", contentType: "application/json", payload: reading },
      },
      subscribe: {
        operationId: "receiveShipmentTemperature",
        summary: "Quality assurance consumes temperature logs.",
        message: {
          oneOf: [
            { $ref: "#/components/messages/shipmentRerouted" },
            { name: "temperatureBatch", traits: [], payload: { type: "array", items: reading } },
            { name: "temperatureCorrected", traits: [trait("commonHeaders")], payload: reading },
            { name: "temperatureKeyed", traits: [trait("kafkaKey")], payload: reading },
            { oneOf: [{ name: "probeCalibrated", payload: { type: "object", properties: { probe: { type: "string" } } } }] },
          ],
        },
      },
    },
    "coldchain.cmd.reefers.setpoint.v1": {
      description: "Setpoint commands sent to reefer containers.",
      servers: ["rabbit"],
      bindings: { amqp: { is: "routingKey", exchange: { name: "reefers", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "sendSetpoint",
        summary: "Operators change a reefer setpoint.",
        message: {
          name: "setpointChangeRequested",
          traits: { headers: { type: "object", properties: { operatorId: { type: "string" } } } },
          payload: { type: "object", properties: { reeferId: { type: "string" }, celsius: { type: "number" } } },
        },
      },
      subscribe: {
        operationId: "receiveSetpointAck",
        summary: "Operators receive setpoint acknowledgements.",
        message: { name: "setpointAcknowledged", traits: [trait("blank"), {}], payload: { type: "object", properties: { reeferId: { type: "string" } } } },
      },
    },
    "coldchain/sensors/{sensorId}/readings": {
      description: "Raw readings of the door and humidity sensors.",
      servers: ["sensors"],
      parameters: { sensorId: { description: "Sensor serial.", schema: { type: "string", pattern: "^SN-[0-9]{8}$" } } },
      publish: {
        operationId: "reportSensorReading",
        summary: "Sensors report readings.",
        bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } },
        message: { name: "sensorReadingReported", traits: [trait("missing")], payload: { type: "object", properties: { humidity: { type: ["number", "null"] } } } },
      },
      subscribe: {
        operationId: "receiveSensorConfig",
        summary: "Sensors receive their sampling configuration.",
        message: { name: "sensorConfigured", traits: [[trait("commonHeaders"), {}], trait("tracing")], payload: { type: "object", properties: { everySeconds: { type: "integer", minimum: 5 } } } },
      },
    },
    "coldchain.sys.gateways.heartbeat.v1": {
      description: "Heartbeats of the yard gateways.",
      servers: ["live"],
      subscribe: {
        operationId: "streamGatewayHeartbeat",
        summary: "Dashboards stream gateway heartbeats.",
        message: { name: "gatewayHeartbeat", traits: [trait("headersAlias")], payload: { type: "object", properties: { gatewayId: { type: "string" } } } },
      },
      publish: {
        operationId: "publishGatewayCommand",
        summary: "Dashboards send gateway commands.",
        message: { name: "gatewayRebootRequested", traits: { $ref: "#/components/x-trait-lists/standard" }, payload: { type: "object" } },
      },
    },
    "x-coldchain.legacy.feed": {
      description: "Legacy EDI feed kept for one carrier.",
      publish: { operationId: "publishLegacyFeed", message: { name: "ediMessageForwarded", payload: { type: "string", maxLength: 65535 } } },
    },
  },
  components: {
    channels: {
      maintenanceWindows: {
        description: "Planned maintenance windows of the reefers.",
        subscribe: { operationId: "receiveMaintenanceWindow", message: { name: "maintenanceScheduled", traits: null, payload: { type: "object" } } },
      },
    },
    messages: {
      shipmentDelayed: { name: "shipmentDelayed", payload: { type: "object", properties: { shipmentId: { type: "string" }, minutes: { type: "integer" } } } },
      shipmentRerouted: { name: "shipmentRerouted", traits: [trait("commonHeaders"), trait("tracing")], payload: { type: "object" } },
      reeferAlarm: { name: "reeferAlarm", traits: [trait("cycleA")], payload: { type: "object" } },
      sensorCalibrated: { name: "sensorCalibrated", traits: [{ $ref: "./shared/message-traits.yaml#/components/messageTraits/tracingV2" }], payload: { type: "object" } },
      customsHold: {
        name: "customsHold",
        schemaFormat: AVRO,
        contentType: "application/vnd.apache.avro+json",
        traits: "commonHeaders",
        payload: { type: "record", name: "CustomsHold", fields: [{ name: "shipmentId", type: "string" }, { name: "reason", type: ["null", "string"], default: null }] },
      },
      podSigned: { oneOf: [{ name: "podSigned", payload: { type: "object" } }, { $ref: "#/components/messages/shipmentRerouted" }] },
      "x-legacy-manifest": { name: "legacyManifest", traits: [], payload: { type: "string" } },
      temperatureExcursion: { name: "temperatureExcursion", traits: { $ref: "#/components/x-trait-lists/headersOnly" }, payload: reading },
      driverHandover: { name: "driverHandover", traits: [{ headers: { type: "object", properties: { driverId: { type: "string" } } } }], payload: { type: "object" } },
      palletScanned: { name: "palletScanned", traits: [trait("CommonHeaders"), trait("tracing")], payload: { type: "object" } },
      customsCleared: { name: "customsCleared", traits: [trait("commonHeaders"), { $ref: "./traits/tracing.yaml" }], payload: { type: "object" } },
    },
    messageTraits: {
      commonHeaders: { headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string" }, tenantId: { type: ["string", "null"] } } } },
      tracing: { correlationId: { location: "$message.header#/traceparent" } },
      kafkaKey: { bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } } },
      CommonHeaders: { headers: { type: "object" } },
      blank: {},
      headersAlias: trait("commonHeaders"),
      cycleA: trait("cycleB"),
      cycleB: trait("cycleA"),
    },
    securitySchemes: { saslScram: { type: "scramSha512" } },
    "x-trait-lists": {
      standard: [trait("commonHeaders"), trait("tracing")],
      headersOnly: [trait("commonHeaders")],
    },
  },
};
