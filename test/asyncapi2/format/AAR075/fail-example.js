const AVRO = "application/vnd.apache.avro;version=1.9.0";
const NBSP = String.fromCharCode(0xa0);

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:airline:operations",
  info: {
    title: "Airline Operations Events",
    version: "   ",
    termsOfService: "",
    contact: {},
    license: null,
    "x-audience": `${NBSP}${NBSP}`,
    "x-api-id": "c1d7a5e2-8b4f-4f0e-9d3a-2b6c7e8f9a01",
    tags: [],
    externalDocs: {},
  },
  defaultContentType: "application/json",
  tags: [
    { name: "flight-ops", description: "Flight status and turnaround events." },
    { name: "crew", description: "Crew rostering events." },
  ],
  externalDocs: { description: "Operations control centre handbook.", url: "https://ops.airline.example.io/handbook" },
  servers: {
    opsKafka: {
      url: "kafka.ops.airline.example.io:9093",
      protocol: "kafka-secure",
      description: "Operations control event backbone.",
      security: [{ mtls: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.ops.airline.example.io", bindingVersion: "0.4.0" } },
    },
    groundAmqp: { url: "amqps://ground.airline.example.io:5671/turnaround", protocol: "amqps", description: "Ground handling partners." },
    gateMqtt: { url: "mqtts://gates.airline.example.io:8883", protocol: "secure-mqtt", description: "Gate displays." },
  },
  channels: {
    "ops.cdc.flights.status.v4": {
      description: "Flight status changes captured from the operations control system.",
      servers: ["opsKafka"],
      bindings: { kafka: { topic: "ops.cdc.flights.status.v4", partitions: 32, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishFlightStatus",
        summary: "Operations control publishes flight status changes.",
        message: { $ref: "#/components/messages/flightStatusChanged" },
      },
      subscribe: {
        operationId: "receiveFlightStatus",
        summary: "Downstream systems receive flight status changes.",
        message: {
          oneOf: [
            { $ref: "#/components/messages/flightStatusChanged" },
            {
              name: "flightDiverted",
              title: "",
              description: "",
              schemaFormat: AVRO,
              payload: {
                type: "record",
                name: "FlightDiverted",
                namespace: "io.example.airline.ops",
                fields: [
                  { name: "flightId", type: "string" },
                  { name: "diversionAirport", type: "string" },
                  { name: "reason", type: ["null", "string"], default: null },
                ],
              },
            },
          ],
        },
      },
    },
    "ground/{station}/turnaround": {
      description: "Turnaround milestones reported by ground handlers.",
      servers: ["groundAmqp"],
      parameters: { station: { description: "IATA station code.", schema: { type: "string", pattern: "^[A-Z]{3}$" } } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "turnaround", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "publishTurnaroundMilestone",
        summary: "Ground handlers publish turnaround milestones.",
        message: {
          name: "turnaroundMilestone",
          title: "Turnaround milestone",
          payload: {
            type: "object",
            properties: {
              flightId: { type: "string" },
              milestone: { type: "string", enum: ["onBlock", "doorsOpen", "cleaningDone", "boardingStarted", "offBlock"] },
              info: { type: "object", description: "", properties: { title: { type: "string" }, version: { type: ["string", "null"] } } },
            },
          },
        },
      },
    },
    "gates/{gate}/display": {
      description: "Gate display content.",
      servers: ["gateMqtt"],
      parameters: { gate: { schema: { type: "string" } } },
      subscribe: {
        operationId: "receiveGateDisplay",
        summary: "Gate displays receive the content to show.",
        message: { name: "gateDisplay", title: "Gate display", payload: { type: "object", properties: { lines: { type: "array", items: { type: "string" } } } } },
      },
    },
  },
  components: {
    messages: {
      flightStatusChanged: {
        name: "flightStatusChanged",
        title: "Flight status changed",
        contentType: "application/json",
        correlationId: { location: "$message.payload#/flightId" },
        payload: { $ref: "#/components/schemas/FlightStatus" },
      },
    },
    schemas: {
      FlightStatus: {
        type: "object",
        description: "Flight status snapshot.",
        properties: {
          flightId: { type: "string" },
          status: { type: "string", enum: ["scheduled", "boarding", "departed", "landed", "cancelled", "diverted"] },
          estimatedDeparture: { type: ["string", "null"], format: "date-time" },
        },
      },
      Info: { type: "object", description: "", properties: { title: { type: "string" }, version: { type: "string" }, description: { type: "string" } } },
    },
    securitySchemes: { mtls: { type: "X509", description: "Mutual TLS with operations certificates." } },
    "x-info": { title: "", version: "", description: "" },
  },
};
