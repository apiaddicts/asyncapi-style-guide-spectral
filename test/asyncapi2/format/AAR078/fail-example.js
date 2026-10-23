const NBSP = String.fromCharCode(0xa0);

module.exports = {
  asyncapi: "2.6.0",
  id: "urn:pharma:clinical-trials",
  info: {
    title: "Clinical Trial Data Exchange",
    version: "3.4.0",
    description: "Enrolment, adverse event and site monitoring events shared with trial sponsors.",
    contact: { name: "Trial Data Office", email: "trial-data@pharma.example.io" },
    license: {
      name: `${NBSP}\t${NBSP}`,
      identifier: "CC-BY-4.0",
      URL: "https://creativecommons.org/licenses/by/4.0/",
      Url: "https://creativecommons.org/licenses/by/4.0/",
      href: "https://creativecommons.org/licenses/by/4.0/",
      "x-url": "https://creativecommons.org/licenses/by/4.0/",
    },
    "x-license": { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  },
  license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  defaultContentType: "application/json",
  servers: {
    trialsKafka: {
      url: "kafka.trials.pharma.example.io:9093",
      protocol: "kafka-secure",
      description: "Trial data backbone.",
      security: [{ mtls: [] }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.trials.pharma.example.io", bindingVersion: "0.4.0" } },
    },
    sitesAmqp: { url: "amqps://sites.pharma.example.io:5671/monitoring", protocol: "amqps", description: "Site monitoring broker." },
  },
  channels: {
    "trials.cdc.subjects.enrolled.v3": {
      description: "Subjects enrolled at a trial site.",
      servers: ["trialsKafka"],
      bindings: { kafka: { topic: "trials.cdc.subjects.enrolled.v3", partitions: 12, replicas: 3, bindingVersion: "0.4.0" } },
      publish: {
        operationId: "publishSubjectEnrolled",
        summary: "Sites publish enrolments.",
        message: { $ref: "#/components/messages/subjectEnrolled" },
      },
      subscribe: {
        operationId: "receiveSubjectEnrolled",
        summary: "The sponsor receives enrolments.",
        message: {
          oneOf: [
            { $ref: "#/components/messages/subjectEnrolled" },
            {
              name: "subjectEnrolledAvro",
              title: "Subject enrolled in Avro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: {
                type: "record",
                name: "SubjectEnrolled",
                namespace: "io.example.pharma.trials",
                fields: [
                  { name: "subjectId", type: "string" },
                  { name: "license", type: { type: "record", name: "DataLicense", fields: [{ name: "name", type: "string" }, { name: "url", type: ["null", "string"], default: null }] } },
                ],
              },
            },
          ],
        },
      },
    },
    "sites/{siteId}/adverse-events": {
      description: "Adverse events reported by a site.",
      servers: ["sitesAmqp"],
      parameters: { siteId: { description: "Site code.", schema: { type: "string" } } },
      bindings: { amqp: { is: "routingKey", exchange: { name: "adverse-events", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" } },
      publish: {
        operationId: "publishAdverseEvent",
        summary: "Sites publish adverse events.",
        message: {
          name: "adverseEventReported",
          title: "Adverse event reported",
          payload: {
            type: "object",
            properties: {
              eventId: { type: "string" },
              severity: { type: "string", enum: ["mild", "moderate", "severe"] },
              license: { type: "object", properties: { name: { type: "string" }, url: { type: ["string", "null"], format: "uri" } } },
            },
          },
          examples: [{ name: "headache", payload: { eventId: "AE-2207", severity: "mild", license: { name: "", url: "" } } }],
        },
      },
    },
  },
  components: {
    messages: {
      subjectEnrolled: {
        name: "subjectEnrolled",
        title: "Subject enrolled",
        contentType: "application/json",
        correlationId: { location: "$message.payload#/subjectId" },
        payload: { $ref: "#/components/schemas/Enrolment" },
      },
    },
    schemas: {
      Enrolment: {
        type: "object",
        required: ["subjectId", "siteId"],
        properties: {
          subjectId: { type: "string" },
          siteId: { type: "string" },
          arm: { type: "string", enum: ["placebo", "treatment"] },
          withdrawnAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      License: { type: "object", required: ["name", "url"], properties: { name: { type: "string" }, url: { type: "string", format: "uri" } } },
    },
    securitySchemes: { mtls: { type: "X509", description: "Mutual TLS with sponsor certificates." } },
    "x-licenses": { open: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" } },
  },
};
