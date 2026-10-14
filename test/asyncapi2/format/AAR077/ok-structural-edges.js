module.exports = {
  asyncapi: "2.6.0",
  id: "urn:retail:store-events",
  info: {
    title: "Store Events",
    version: "1.0.0",
    contact: {
      name: { $ref: "#/components/x-texts/teamAlias" },
      url: "",
      email: { $ref: "./shared/contacts.yaml#/stores/email" },
      "x-slack": "",
      "x-owner": null,
    },
    "x-contact": {},
    "x-contacts": [{ name: "", email: "" }],
  },
  contact: {},
  "x-contact": { name: "", email: "" },
  tags: [{ name: "contact", description: "" }],
  servers: {
    contact: { url: "mqtts://stores.retail.example.io:8883", protocol: "secure-mqtt", description: "" },
  },
  channels: {
    contact: {
      description: "",
      publish: {
        operationId: "contact",
        summary: "",
        message: {
          name: "contact",
          title: "",
          payload: {
            type: "object",
            properties: {
              contact: { type: "object", properties: { name: { type: "string", description: "" }, email: { type: ["string", "null"] } } },
              name: { type: "string" },
              email: { type: "string" },
            },
          },
          examples: [{ name: "", payload: { contact: { name: "", email: "" }, name: "", email: "" } }],
        },
      },
    },
    "stores/{storeId}/contact": {
      parameters: { storeId: { description: "", schema: { type: "string" } } },
      subscribe: { operationId: "receiveStoreContact", message: { $ref: "#/components/messages/contact" } },
    },
  },
  components: {
    messages: {
      contact: { name: "contact", title: "", traits: [{ $ref: "#/components/messageTraits/contact" }], payload: { $ref: "#/components/schemas/Contact" } },
    },
    schemas: {
      Contact: { type: "object", title: "", required: ["name", "email"], properties: { name: { type: "string" }, email: { type: "string" } } },
      contact: { type: "null" },
    },
    messageTraits: { contact: { headers: { type: "object", properties: { contact: { type: "string" } } } } },
    "x-contacts": { empty: {}, blank: { name: "", email: " " } },
    "x-texts": { teamAlias: { $ref: "#/components/x-texts/team" }, team: "Store Platform" },
    contact: { name: "", email: "" },
  },
};
