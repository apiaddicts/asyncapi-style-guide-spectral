const docs = (topic) => ({ description: `${topic} handbook.`, url: `https://docs.northwind.example.com/${topic}` });
const tag = (name, description, owner = "fleet-platform") => ({ name, description, externalDocs: docs(name), "x-owner": owner });

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:com:northwind:logistics:fleet-events",
  info: {
    title: "Northwind Fleet Events",
    version: "3.4.0",
    description: "Vehicle telematics, depot parcel handling and dispatch events of the Northwind delivery fleet.",
    contact: { name: "Fleet Platform Team", url: "https://developer.northwind.example.com", email: "fleet-platform@northwind.example.com" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  },
  defaultContentType: "application/json",
  tags: [
    tag("fleet", "Vehicles, drivers and telematics of the delivery fleet."),
    tag("parcels", "Parcel intake, sorting and hand-over at the depots.", "depot-operations"),
    tag("realtime", "Low-latency streams consumed by the dispatch console."),
  ],
  servers: {
    kafkaProduction: {
      url: "kafka.northwind.example.com:9093",
      protocol: "kafka-secure",
      description: "Primary Kafka cluster for telematics and parcel events.",
      tags: [{ $ref: "#/tags/0" }, tag("production", "Production environment.")],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.northwind.example.com", schemaRegistryVendor: "confluent", bindingVersion: "0.4.0" } },
    },
    rabbitDepot: {
      url: "amqps://rabbit.northwind.example.com:5671",
      protocol: "amqps",
      description: "Depot automation broker.",
      tags: [tag("depot-automation", "Sorters and scanners connected to the depots.", "depot-operations")],
    },
    mqttTelematics: {
      url: "mqtts://mqtt.northwind.example.com:8883",
      protocol: "secure-mqtt",
      description: "On-board units publish engine and position data here.",
      tags: [tag("on-board-units", "Telematics boxes installed in the vehicles.")],
      bindings: { mqtt: { clientId: "fleet-ingest", cleanSession: true, keepAlive: 60, bindingVersion: "0.2.0" } },
    },
    wsDispatch: {
      url: "wss://dispatch.northwind.example.com/ws",
      protocol: "wss",
      description: "Dispatch console push channel.",
      tags: [{ $ref: "#/tags/2" }],
    },
    disasterRecovery: { $ref: "#/components/servers/kafkaDr" },
  },
  channels: {
    "northwind.cdc.fleet.vehicle-position.v1": {
      description: "Vehicle positions sampled every five seconds.",
      publish: {
        operationId: "publishVehiclePosition",
        summary: "Publish a vehicle position.",
        tags: [{ $ref: "#/tags/0" }, tag("positions", "GPS fixes of the vehicles.")],
        traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { tags: [tag("telematics-ingest", "Ingest pipeline of the telematics data.")] }],
        message: { $ref: "#/components/messages/vehiclePosition" },
      },
      subscribe: {
        operationId: "receiveVehiclePosition",
        summary: "Receive vehicle positions and offline notices.",
        tags: [{ $ref: "#/tags/2" }],
        message: {
          oneOf: [
            { $ref: "#/components/messages/vehiclePosition" },
            {
              name: "vehicleOffline",
              title: "Vehicle offline",
              tags: [tag("connectivity", "Connectivity of the on-board units.")],
              payload: {
                type: "object",
                properties: {
                  vehicleId: { type: "string", maxLength: 12 },
                  lastSeenAt: { type: "string", format: "date-time" },
                  tags: { type: ["array", "null"], items: { type: "object", properties: { name: { type: "string" } } } },
                },
              },
              examples: [{ name: "lostSignal", payload: { vehicleId: "NW-2041", lastSeenAt: "2026-03-02T08:15:00Z", tags: [{ name: "Unlabelled" }] } }],
            },
          ],
        },
      },
      bindings: { kafka: { topic: "northwind.cdc.fleet.vehicle-position.v1", partitions: 24, replicas: 3, bindingVersion: "0.4.0" } },
    },
    "depot/{depotId}/parcels": {
      description: "Parcels scanned at a depot.",
      parameters: { depotId: { description: "Depot code.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{2}$" } } },
      publish: {
        operationId: "publishParcelScanned",
        tags: [{ $ref: "#/tags/1" }],
        traits: [[{ tags: [tag("amqp-publisher", "Publishes on the depot exchange.", "depot-operations")] }, { "x-legacy-override": true }]],
        message: {
          name: "parcelScanned",
          title: "Parcel scanned",
          contentType: "application/json",
          tags: [tag("scans", "Barcode scans of parcels.", "depot-operations")],
          traits: [{ $ref: "#/components/messageTraits/depotHeaders" }, [{ tags: [tag("tuple-trait", "Trait applied in tuple form.", "depot-operations")] }, {}]],
          payload: {
            type: "object",
            required: ["parcelId"],
            properties: {
              parcelId: { type: "string", maxLength: 20 },
              tags: { type: "array", items: { type: "string", enum: ["fragile", "oversize"] } },
            },
          },
          examples: [{ name: "fragileParcel", payload: { parcelId: "PCL-000123", tags: ["fragile"] } }],
        },
      },
      bindings: { amqp: { is: "routingKey", exchange: { name: "depot.parcels", type: "topic", durable: true, vhost: "/" }, bindingVersion: "0.3.0" } },
    },
    "telematics/{vehicleId}/engine": {
      description: "Engine diagnostics of a vehicle.",
      parameters: { vehicleId: { description: "Fleet number.", schema: { type: "string" } } },
      subscribe: {
        operationId: "receiveEngineDiagnostics",
        tags: [tag("diagnostics", "Engine fault codes and readings.")],
        message: {
          name: "engineDiagnostics",
          title: "Engine diagnostics",
          contentType: "application/vnd.apache.avro+json",
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          tags: [tag("avro", "Avro encoded payloads.")],
          payload: {
            type: "record",
            name: "EngineDiagnostics",
            namespace: "com.northwind.fleet",
            fields: [
              { name: "vehicleId", type: "string" },
              { name: "tags", type: ["null", { type: "array", items: { type: "record", name: "Tag", fields: [{ name: "name", type: "string" }, { name: "description", type: ["null", "string"], default: null }] } }], default: null },
            ],
          },
        },
      },
      bindings: { mqtt: { qos: 1, retain: false, bindingVersion: "0.2.0" } },
    },
    "/dispatch": {
      description: "Dispatch console stream.",
      subscribe: {
        operationId: "receiveDispatchUpdate",
        tags: [tag("dispatch", "Route assignments pushed to dispatchers.")],
        message: { $ref: "#/components/messages/dispatchUpdate" },
      },
      bindings: { ws: { method: "GET", bindingVersion: "0.1.0" } },
    },
    "northwind.cmd.fleet.route-retry.v1": { $ref: "#/components/channels/routeRetry" },
  },
  components: {
    servers: {
      kafkaDr: { url: "kafka-dr.northwind.example.com:9093", protocol: "kafka-secure", tags: [tag("disaster-recovery", "Standby cluster in the secondary region.")] },
    },
    channels: {
      routeRetry: {
        description: "Retries of failed route assignments.",
        publish: {
          operationId: "publishRouteRetry",
          tags: [tag("retries", "Retried route assignments.")],
          message: { name: "routeRetry", title: "Route retry", tags: [{ $ref: "#/tags/2" }], payload: { type: "object", properties: { routeId: { type: "string" } } } },
        },
      },
    },
    messages: {
      vehiclePosition: {
        name: "vehiclePosition",
        title: "Vehicle position",
        contentType: "application/json",
        tags: [tag("gps", "Satellite positioning fixes.")],
        traits: [{ $ref: "#/components/messageTraits/telematicsHeaders" }],
        payload: { $ref: "#/components/schemas/VehiclePosition" },
      },
      dispatchUpdate: {
        name: "dispatchUpdate",
        title: "Dispatch update",
        tags: [{ $ref: "#/tags/2" }, tag("routes", "Route plans.")],
        payload: { type: "object", properties: { routeId: { type: "string" }, tags: { $ref: "#/components/schemas/TagList" } } },
      },
    },
    schemas: {
      VehiclePosition: {
        type: "object",
        properties: {
          vehicleId: { type: "string" },
          latitude: { type: "number", format: "double", minimum: -90, maximum: 90 },
          longitude: { type: "number", format: "double", minimum: -180, maximum: 180 },
          tags: { type: ["array", "null"], items: { $ref: "#/components/schemas/Tag" } },
        },
      },
      Tag: { type: "object", properties: { name: { type: "string" }, description: { type: ["string", "null"] } } },
      TagList: { type: "array", items: { $ref: "#/components/schemas/Tag" }, examples: [[{ name: "Not A Tag Object" }]] },
    },
    operationTraits: {
      kafkaProducer: { tags: [tag("producers", "Kafka producers of the fleet platform.")], bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.4.0" } } },
    },
    messageTraits: {
      telematicsHeaders: { headers: { type: "object", properties: { traceId: { type: "string" } } }, tags: [tag("tracing", "Distributed tracing headers.")] },
      depotHeaders: { headers: { type: "object", properties: { depotId: { type: "string" } } }, tags: [tag("depot-headers", "Headers set by the depot gateways.", "depot-operations")] },
    },
    "x-unreferenced-tags": [{ name: "draft" }, "not-a-tag", null],
  },
};
