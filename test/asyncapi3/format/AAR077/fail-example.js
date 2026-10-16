module.exports = {
  asyncapi: "3.0.0",
  id: "urn:energy:grid-balancing",
  info: {
    title: "Grid Balancing Events",
    version: "2.3.0",
    description: "Frequency deviations, reserve activations and settlement events of the grid operator.",
    contact: {
      name: null,
      url: "https://balancing.grid.example.io/integration",
      "x-email": "balancing@grid.example.io",
      Email: "balancing@grid.example.io",
    },
    tags: [{ name: "balancing", description: "Balancing market events." }],
  },
  contact: { name: "Balancing Desk", email: "balancing@grid.example.io" },
  servers: {
    gridKafka: {
      host: "kafka.balancing.grid.example.io:9093",
      protocol: "kafka-secure",
      description: "Balancing backbone.",
      security: [{ $ref: "#/components/securitySchemes/mtls" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.grid.example.io", bindingVersion: "0.5.0" } },
    },
  },
  channels: {
    frequencyDeviation: {
      address: "grid.sys.frequency.deviation.v1",
      title: "Frequency deviations",
      servers: [{ $ref: "#/servers/gridKafka" }],
      messages: {
        frequencyDeviation: {
          name: "frequencyDeviation",
          title: "Frequency deviation",
          payload: {
            type: "object",
            properties: {
              hertz: { type: "number" },
              operator: { type: "object", properties: { name: { type: "string" }, email: { type: ["string", "null"] } } },
            },
          },
          examples: [{ name: "underFrequency", payload: { hertz: 49.8, operator: { name: "", email: null } } }],
        },
      },
    },
    reserveActivation: {
      address: "grid/reserves/{reserveId}/activation",
      title: "Reserve activations",
      parameters: { reserveId: { description: "Reserve unit identifier." } },
      messages: { reserveActivated: { $ref: "#/components/messages/reserveActivated" } },
    },
  },
  operations: {
    publishFrequencyDeviation: { action: "send", channel: { $ref: "#/channels/frequencyDeviation" } },
    activateReserve: {
      action: "receive",
      channel: { $ref: "#/channels/reserveActivation" },
      messages: [{ $ref: "#/channels/reserveActivation/messages/reserveActivated" }],
    },
  },
  components: {
    messages: {
      reserveActivated: {
        name: "reserveActivated",
        title: "Reserve activated",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: {
            type: "record",
            name: "ReserveActivated",
            fields: [
              { name: "reserveId", type: "string" },
              { name: "contact", type: ["null", { type: "record", name: "Dispatcher", fields: [{ name: "name", type: "string" }, { name: "email", type: "string" }] }], default: null },
            ],
          },
        },
      },
    },
    schemas: { Contact: { type: "object", required: ["name", "email"], properties: { name: { type: "string" }, email: { type: "string" } } } },
    securitySchemes: { mtls: { type: "X509", description: "Mutual TLS with grid certificates." } },
    "x-contacts": { desk: { name: "Balancing Desk", email: "balancing@grid.example.io" } },
  },
};
