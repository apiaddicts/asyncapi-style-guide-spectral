module.exports = {
  asyncapi: "2.6.0",
  id: "urn:payments:card-acquiring",
  info: { $ref: "#/components/x-shared-info/paymentsPlatform" },
  defaultContentType: "application/json",
  servers: {
    acquiringKafka: {
      url: "kafka.acquiring.example.io:9093",
      protocol: "kafka-secure",
      description: "Card acquiring backbone.",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.acquiring.example.io", bindingVersion: "0.4.0" } },
    },
  },
  channels: {
    "payments.cmd.authorizations.requested.v2": {
      description: "Authorization requests sent to the card networks.",
      publish: {
        operationId: "publishAuthorizationRequested",
        summary: "The gateway publishes authorization requests.",
        message: { $ref: "#/components/messages/authorizationRequested" },
      },
      subscribe: {
        operationId: "receiveAuthorizationRequested",
        summary: "The network adapter receives authorization requests.",
        message: { $ref: "#/components/messages/authorizationRequested" },
      },
    },
    "payments.cdc.captures.settled.v1": {
      description: "Captures settled by the acquirer.",
      subscribe: {
        operationId: "receiveCaptureSettled",
        summary: "Finance receives settled captures.",
        message: {
          name: "captureSettled",
          title: "Capture settled",
          payload: { type: "object", properties: { captureId: { type: "string" }, amount: { type: "integer", format: "int64" }, currency: { type: "string" } } },
        },
      },
    },
  },
  components: {
    messages: {
      authorizationRequested: {
        name: "authorizationRequested",
        title: "Authorization requested",
        correlationId: { location: "$message.payload#/authorizationId" },
        payload: {
          type: "object",
          required: ["authorizationId", "amount"],
          properties: {
            authorizationId: { type: "string", format: "uuid" },
            amount: { type: "integer", format: "int64", minimum: 1 },
            cardToken: { type: "string" },
            threeDs: { type: ["object", "null"], properties: { version: { type: "string" } } },
          },
        },
      },
    },
    "x-shared-info": {
      paymentsPlatform: { $ref: "#/components/x-shared-info/paymentsBase" },
      paymentsBase: {
        version: { $ref: "#/components/x-texts/currentVersion" },
        description: { $ref: "#/components/x-texts/emptyDescription" },
        termsOfService: { $ref: "#/components/x-texts/termsUrl" },
        contact: { $ref: "#/components/x-contacts/payments" },
        license: { $ref: "./shared/licenses.yaml#/apache" },
        "x-audience": { $ref: "#/components/x-texts/cycleA" },
        "x-api-id": { $ref: "#/components/x-texts/apiId" },
      },
      unused: { title: "", version: "", description: "" },
    },
    "x-texts": {
      currentVersion: { $ref: "#/components/x-texts/releasedVersion" },
      releasedVersion: "2.1.0",
      emptyDescription: "",
      cycleA: { $ref: "#/components/x-texts/cycleB" },
      cycleB: { $ref: "#/components/x-texts/cycleA" },
      apiId: "0b8f0f5e-1d6e-4a4c-8c43-41f3f2b6c9d2",
    },
    "x-contacts": { payments: { name: "Payments Integration", email: "payments@acquiring.example.io" } },
  },
};
