module.exports = {
  asyncapi: "2.6.0",
  id: "urn:software:entitlements",
  info: {
    title: "Software Entitlement Events",
    version: "1.0.0",
    license: { $ref: "#/components/x-licenses/current" },
    License: { name: "Apache 2.0" },
    licence: { name: "Proprietary" },
    licenses: [{ name: "MIT License" }],
    contact: { name: "MIT License", url: "https://software.example.io/legal" },
    "x-license": { name: "GNU GPL v3" },
  },
  license: { name: "Commercial" },
  "x-license": { name: "Apache License 2.0", url: "" },
  tags: [{ name: "Apache 2.0", description: "License tag." }],
  servers: {
    license: {
      url: "licensing.software.example.io:9093",
      protocol: "kafka-secure",
      description: "Apache License 2.0",
      variables: { license: { enum: ["Apache 2.0", "MIT License"], default: "Apache 2.0" } },
      bindings: { kafka: { schemaRegistryUrl: "https://registry.software.example.io", bindingVersion: "0.4.0", "x-license": { name: "BSD" } } },
    },
  },
  channels: {
    license: {
      description: "Licence changes.",
      parameters: { license: { description: "Licence name.", schema: { type: "string", enum: ["Apache 2.0", "Proprietary"] } } },
      publish: {
        operationId: "license",
        summary: "Apache 2.0",
        tags: [{ name: "license", description: "Proprietary" }],
        message: {
          name: "license",
          title: "Apache 2.0",
          payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string", default: "Apache 2.0" } } } } },
          examples: [{ name: "license", payload: { license: { name: "Apache License 2.0", url: "" } }, headers: { license: "MIT License" } }],
        },
      },
      subscribe: {
        operationId: "receiveLicense",
        message: {
          oneOf: [
            { $ref: "#/components/messages/license" },
            {
              name: "licenseAvro",
              schemaFormat: "application/vnd.apache.avro;version=1.9.0",
              payload: { type: "record", name: "License", fields: [{ name: "name", type: { type: "enum", name: "LicenseName", symbols: ["APACHE_2", "MIT_LICENSE"] }, default: "APACHE_2" }] },
            },
          ],
        },
      },
    },
  },
  components: {
    messages: {
      license: {
        name: "license",
        title: "Licence",
        traits: [{ $ref: "#/components/messageTraits/license" }],
        payload: { $ref: "#/components/schemas/License" },
        bindings: { kafka: { key: { type: "string", enum: ["Apache 2.0"] }, bindingVersion: "0.4.0" } },
      },
    },
    schemas: {
      License: { type: "object", title: "License", required: ["name"], properties: { name: { type: "string", enum: ["Apache License 2.0", 42, null] }, url: { type: ["string", "null"] } } },
    },
    messageTraits: { license: { headers: { type: "object", properties: { license: { type: "string", default: "Proprietary" } } }, examples: [{ headers: { license: "Apache 2.0" } }] } },
    operationTraits: { license: { summary: "Apache 2.0", tags: [{ name: "Apache 2.0" }] } },
    "x-licenses": { current: { name: "MPL-2.0", url: "https://www.mozilla.org/en-US/MPL/2.0/" }, legacy: { name: "Mozilla Public License 2.0" }, broken: { name: 42 }, list: [{ name: "Apache 2.0" }] },
  },
};
