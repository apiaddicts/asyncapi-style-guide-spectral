module.exports = {
  asyncapi: "2.6.0",
  id: "urn:railfreight:operations",
  info: {
    title: "Rail Freight Operations",
    version: "3.8.1",
    description: "Wagon, train, signal and crew events of a rail freight operator.",
    contact: { name: "Rail Ops Platform", url: "https://railfreight.example.io", email: "ops-platform@railfreight.example.io" },
  },
  servers: {
    kafkaProd: { url: "kafka.railfreight.example.io:9093", protocol: "kafka-secure", bindings: { kafka: { schemaRegistryUrl: "https://sr.railfreight.example.io", bindingVersion: "0.4.0" } } },
    rabbit: { url: "amqps://mq.railfreight.example.io:5671/ops", protocol: "amqps" },
    signalsMqtt: { url: "mqtts://signals.railfreight.example.io:8883", protocol: "secure-mqtt" },
    crewWs: { url: "wss://crew.railfreight.example.io/live", protocol: "wss" },
  },
  channels: {
    "railfreight.cdc.wagons.loaded.v3": {
      description: "Wagons loaded at a terminal.",
      bindings: { kafka: { topic: "railfreight.cdc.wagons.loaded.v3", partitions: 12, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishWagonLoaded",
        message: {
          name: "wagonLoadedLegacy",
          contentType: "application/json",
          payload: {
            type: "object",
            properties: { wagonId: { type: "string" }, loadKg: { type: "integer", format: "int32" }, hazmatClass: { type: ["string", "null"] } },
            examples: [{ wagonId: "WAG-3381", loadKg: 52000, hazmatClass: null }],
          },
          "x-examples": [{ payload: { wagonId: "WAG-3381" } }],
        },
      },
      subscribe: {
        operationId: "receiveWagonLoaded",
        bindings: { kafka: { groupId: { type: "string", enum: ["terminal-planner"] }, bindingVersion: "0.4.0" } },
        message: {
          oneOf: [
            { $ref: "#/components/messages/wagonCoupled" },
            {
              name: "wagonLoadedAvro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              contentType: "application/vnd.apache.avro+json",
              payload: {
                type: "record",
                name: "WagonLoaded",
                namespace: "io.railfreight.wagons",
                fields: [
                  { name: "wagonId", type: "string" },
                  { name: "seal", type: ["null", "string"], default: null },
                  { name: "examples", type: ["null", { type: "array", items: "string" }], default: null },
                ],
              },
            },
            { name: "wagonLoadedV2", payload: { type: "object", properties: { wagonId: { type: "string" } } }, examples: [] },
            { name: "wagonLoadedV3", payload: { type: "object", properties: { wagonId: { type: "string" } } }, examples: [{ payload: { wagonId: "WAG-1100" } }] },
          ],
        },
      },
    },
    "railfreight.cmd.trains.dispatch.v1": {
      description: "Dispatch commands sent to the yard.",
      servers: ["rabbit"],
      publish: {
        operationId: "requestDispatch",
        message: {
          name: "dispatchRequested",
          payload: { type: "object", properties: { trainId: { type: "string" }, departure: { type: "string", format: "date-time" } } },
          examples: [{ name: "morningDeparture", summary: "Train leaving at 06:00." }, {}],
        },
      },
      subscribe: {
        operationId: "receiveDispatch",
        message: {
          name: "dispatchAcknowledged",
          headers: { type: "object", properties: { correlationId: { type: "string" } } },
          payload: { type: "object", properties: { trainId: { type: "string" }, accepted: { type: "boolean" } } },
          examples: [{ name: "headersOnly", headers: { correlationId: "c0ffee" } }],
        },
      },
    },
    "railfreight/signals/{signalId}/state": {
      description: "Signal aspects reported by trackside units.",
      servers: ["signalsMqtt"],
      parameters: { signalId: { description: "Signal identifier.", schema: { type: "string" } } },
      publish: {
        operationId: "publishSignalState",
        message: { name: "signalStateChanged", payload: { type: "object", properties: { aspect: { type: "string", enum: ["red", "yellow", "green"] } } }, examples: null },
      },
      subscribe: {
        operationId: "receiveSignalCommand",
        message: { name: "signalCommanded", payload: { type: "object", properties: { aspect: { type: "string" } } }, examples: { payload: { aspect: "red" } } },
      },
    },
    "railfreight.sys.crews.roster.v1": {
      description: "Crew roster changes streamed to drivers.",
      servers: ["crewWs"],
      subscribe: {
        operationId: "streamRoster",
        message: {
          name: "rosterChanged",
          payload: { type: "object", properties: { crewId: { type: "string" } } },
          examples: [{ payload: { crewId: "CRW-77" } }],
          traits: [{ $ref: "#/components/messageTraits/kafkaEnvelope" }, { $ref: "#/components/messageTraits/emptyExamples" }],
        },
      },
      publish: {
        operationId: "publishCrewPing",
        message: { name: "crewPing", headers: { type: "object", properties: { deviceId: { type: "string" } } } },
      },
    },
    "railfreight.cdc.tracks.closures.v1": {
      description: "Track closures announced by infrastructure.",
      publish: { operationId: "publishCoupling", message: { $ref: "#/components/messages/wagonCoupled" } },
      subscribe: { operationId: "receiveClosure", message: { $ref: "#/components/messages/trackClosure" } },
    },
    "railfreight.cdc.audit.v1": { $ref: "#/components/channels/maintenanceWindows" },
  },
  components: {
    channels: {
      maintenanceWindows: {
        description: "Planned maintenance windows.",
        subscribe: { operationId: "receiveMaintenanceWindow", message: { name: "maintenanceScheduled", payload: { type: "object", properties: { section: { type: "string" } } } } },
      },
    },
    messages: {
      wagonCoupled: { name: "wagonCoupled", payload: { type: "object", properties: { wagonId: { type: "string" }, trainId: { type: "string" } } } },
      wagonInspected: { name: "wagonInspected", payload: { type: "object" }, examples: [null, "sample", [], 42] },
      trainDispatched: {
        oneOf: [
          { name: "trainDispatchedV1", payload: { type: "object" }, examples: [{ payload: { trainId: "TR-200" } }] },
          { name: "trainDispatchedV2", payload: { type: "object", properties: { trainId: { type: "string" }, platform: { type: ["integer", "null"] } } } },
        ],
      },
      signalHeartbeat: {
        name: "signalHeartbeat",
        headers: { type: "object", properties: { unitId: { type: "string" } } },
        examples: [{ name: "noHeaders", headers: {} }, { name: "label only" }],
      },
      signalReset: { name: "signalReset", payload: null, headers: { type: "object", properties: { unitId: { type: "string" } } } },
      trackClosure: { name: "trackClosure", payload: { type: "object" }, examples: { $ref: "#/components/x-example-sets/missing" } },
      "x-legacy-manifest": { name: "legacyManifest", payload: { type: "object", properties: { manifestId: { type: "string" } } } },
      crewAssigned: {
        name: "crewAssigned",
        payload: { type: "object", properties: { crewId: { type: "string" } } },
        examples: [{ payload: { crewId: "CRW-12" } }],
        traits: [{ $ref: "#/components/messageTraits/headerSamples" }],
      },
      etaPredicted: { name: "etaPredicted", payload: { type: "object" }, examples: [{ $ref: "#/components/x-examples/blank" }] },
    },
    messageTraits: {
      kafkaEnvelope: { headers: { type: "object", properties: { traceId: { type: "string" } } }, bindings: { kafka: { key: { type: "string" }, bindingVersion: "0.4.0" } } },
      emptyExamples: { examples: [] },
      headerSamples: { examples: [{ headers: { traceId: "4bf92f35" } }] },
    },
    "x-examples": { blank: {} },
  },
};
