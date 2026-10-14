module.exports = {
  asyncapi: "3.0.0",
  id: "urn:retail:store-events",
  info: {
    title: "",
    version: "1.0.0",
    contact: {
      name: 0,
      url: "",
      email: { $ref: "#/components/x-texts/emailAlias" },
      "x-slack": null,
    },
    tags: [{ name: "contact", description: "" }],
    "x-contact": {},
  },
  contact: {},
  "x-contact": { name: "", email: "" },
  servers: {
    contact: { host: "stores.retail.example.io", pathname: "/contact", protocol: "wss", title: "", summary: "" },
  },
  channels: {
    contact: {
      address: null,
      title: "",
      messages: {
        contact: {
          name: "contact",
          title: "",
          payload: {
            schemaFormat: "application/schema+json;version=draft-07",
            schema: { type: "object", properties: { contact: { type: "object", properties: { name: { type: "string" }, email: { type: ["string", "null"] } } } } },
          },
          examples: [{ name: "", payload: { contact: { name: "", email: "" } } }],
        },
      },
    },
    storeContact: {
      address: "stores/{storeId}/contact",
      parameters: { storeId: { description: "" } },
      messages: { contactChanged: { $ref: "#/components/messages/contact" } },
    },
  },
  operations: {
    contact: { action: "send", title: "", channel: { $ref: "#/channels/contact" }, reply: { channel: { $ref: "#/channels/storeContact" } } },
    receiveStoreContact: { action: "receive", channel: { $ref: "#/channels/storeContact" }, messages: [{ $ref: "#/channels/storeContact/messages/contactChanged" }] },
  },
  components: {
    messages: {
      contact: { name: "contact", title: "", traits: [{ $ref: "#/components/messageTraits/contact" }], payload: { $ref: "#/components/schemas/Contact" } },
    },
    schemas: {
      Contact: { type: "object", title: "", required: ["name", "email"], properties: { name: { type: "string" }, email: { type: "string" } } },
    },
    messageTraits: { contact: { headers: { type: "object", properties: { contact: { type: "string" } } } } },
    operationTraits: { contact: { title: "", summary: "" } },
    replies: { contact: { channel: { $ref: "#/channels/contact" } } },
    tags: { contact: { name: "contact", description: "" } },
    "x-contacts": { empty: {}, blank: { name: "", email: " " } },
    "x-texts": { emailAlias: { $ref: "#/components/x-texts/email" }, email: "stores@retail.example.io" },
    contact: { name: "", email: "" },
  },
};
