module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Customer Identity Events", version: "1.3.0" },
  channels: {
    "customers/registered": {
      subscribe: {
        operationId: "consumeCustomerRegistered",
        message: {
          messageId: "customerRegistered",
          contentType: "application/json",
          traits: [{ contentType: "text/json" }, { $ref: "#/components/messageTraits/auditTrait" }],
        },
      },
    },
    "customers/deleted": {
      subscribe: {
        operationId: "consumeCustomerDeleted",
        message: {
          messageId: "customerDeleted",
          contentType: "application/jsn",
          traits: [{ contentType: "application/json" }],
        },
      },
    },
    "customers/merged": {
      publish: {
        operationId: "publishCustomerMerged",
        message: {
          messageId: "customerMerged",
          traits: [
            [{ contentType: "application/x-json" }, { reason: "tuple form" }],
            [{ $ref: "#/components/messageTraits/auditTrait" }, { contentType: "image/png" }],
            [null, { contentType: "image/png" }],
            [],
            null,
            42,
            "application/jsn",
            { contentType: "application/cloudevents+json" },
          ],
        },
      },
    },
  },
  components: {
    messageTraits: {
      auditTrait: { contentType: "application/vnd.audit" },
    },
  },
};
