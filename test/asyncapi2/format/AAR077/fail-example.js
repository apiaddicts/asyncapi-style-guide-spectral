const NBSP = String.fromCharCode(0xa0);

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:hospital:patient-flow",
  info: {
    title: "Patient Flow Events",
    version: "2.8.1",
    description: "Admissions, bed assignments and discharge events of the regional hospital network.",
    contact: {
      url: "https://patient-flow.hospital.example.io/integration",
      email: `${NBSP}\t${NBSP}`,
      "x-team": "Clinical Integration",
      "x-name": "Clinical Integration",
      Name: "Clinical Integration",
    },
    "x-contact": { name: "Clinical Integration", email: "clinical-integration@hospital.example.io" },
  },
  contact: { name: "Clinical Integration", email: "clinical-integration@hospital.example.io" },
  defaultContentType: "application/json",
  servers: {
    flowKafka: {
      url: "kafka.flow.hospital.example.io:9093",
      protocol: "kafka-secure",
      description: "Patient flow backbone.",
      security: [{ mtls: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.flow.hospital.example.io", bindingVersion: "0.4.0" } },
    },
    wardAmqp: { url: "amqps://wards.hospital.example.io:5671/flow", protocol: "amqps", description: "Ward systems broker." },
  },
  channels: {
    "hospital.cdc.admissions.created.v2": {
      description: "Admissions registered at the emergency desk or scheduled by a ward.",
      servers: ["flowKafka"],
      bindings: { kafka: { topic: "hospital.cdc.admissions.created.v2", partitions: 12, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishAdmissionCreated",
        summary: "Registration publishes admissions.",
        message: { $ref: "#/components/messages/admissionCreated" },
      },
      subscribe: {
        operationId: "receiveAdmissionCreated",
        summary: "Bed management receives admissions.",
        message: {
          oneOf: [
            { $ref: "#/components/messages/admissionCreated" },
            {
              name: "admissionCreatedAvro",
              title: "Admission created in Avro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: {
                type: "record",
                name: "AdmissionCreated",
                namespace: "io.example.hospital.flow",
                fields: [
                  { name: "admissionId", type: "string" },
                  { name: "contact", type: { type: "record", name: "EmergencyContact", fields: [{ name: "name", type: "string" }, { name: "email", type: ["null", "string"], default: null }] } },
                ],
              },
            },
          ],
        },
      },
    },
    "wards/{wardId}/beds": {
      description: "Bed assignments of a ward.",
      servers: ["wardAmqp"],
      parameters: { wardId: { description: "Ward code.", schema: { type: "string" } } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "beds", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "publishBedAssigned",
        summary: "Wards publish bed assignments.",
        message: {
          name: "bedAssigned",
          title: "Bed assigned",
          payload: {
            type: "object",
            properties: {
              bedId: { type: "string" },
              admissionId: { type: "string" },
              contact: { type: "object", properties: { name: { type: "string" }, email: { type: ["string", "null"], format: "email" } } },
            },
          },
          examples: [{ name: "icuBed", payload: { bedId: "ICU-04", admissionId: "A-1029", contact: { name: "", email: "" } } }],
        },
      },
    },
  },
  components: {
    messages: {
      admissionCreated: {
        name: "admissionCreated",
        title: "Admission created",
        contentType: "application/json",
        correlationId: { location: "$message.payload#/admissionId" },
        payload: { $ref: "#/components/schemas/Admission" },
      },
    },
    schemas: {
      Admission: {
        type: "object",
        required: ["admissionId", "patientRef"],
        properties: {
          admissionId: { type: "string" },
          patientRef: { type: "string" },
          triageLevel: { type: "integer", minimum: 1, maximum: 5 },
          dischargeAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      Contact: { type: "object", required: ["name", "email"], properties: { name: { type: "string" }, email: { type: "string", format: "email" } } },
    },
    securitySchemes: { mtls: { type: "X509", description: "Mutual TLS with hospital certificates." } },
    "x-contacts": { clinical: { name: "Clinical Integration", email: "clinical-integration@hospital.example.io" } },
  },
};
