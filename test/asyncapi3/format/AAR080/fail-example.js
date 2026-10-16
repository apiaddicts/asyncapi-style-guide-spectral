module.exports = {
  asyncapi: "3.0.0",
  id: "urn:agri:irrigation",
  info: {
    title: "Irrigation Control Events",
    version: "1.9.0",
    description: "Soil moisture readings and valve commands of the irrigation network.",
    contact: { name: "Field Automation", email: "field-automation@agri.example.io" },
    license: {
      name: "GNU General Public License v3.0 or later",
      url: "https://www.gnu.org/licenses/gpl-3.0.html",
      identifier: "GPL-3.0-or-later",
      spdx: "GPL-3.0-or-later",
      NAME: "GPL-3.0-or-later",
      "x-spdx-id": "GPL-3.0-or-later",
    },
    tags: [{ name: "GPL-3.0-or-later", description: "Licence tag." }],
    "x-license": { name: "GPL-3.0-or-later" },
  },
  license: { name: "GPL-3.0-or-later" },
  defaultContentType: "application/json",
  servers: {
    fieldMqtt: { host: "field.agri.example.io:8883", protocol: "secure-mqtt", description: "Field sensors broker." },
    controlKafka: {
      host: "kafka.agri.example.io:9093",
      protocol: "kafka-secure",
      description: "Control backbone.",
      security: [{ $ref: "#/components/securitySchemes/saslScram" }],
      bindings: { kafka: { schemaRegistryUrl: "https://registry.agri.example.io", bindingVersion: "0.5.0" } },
    },
  },
  channels: {
    moisture: {
      address: "fields/{fieldId}/moisture",
      servers: [{ $ref: "#/servers/fieldMqtt" }],
      parameters: { fieldId: { description: "Field code." } },
      messages: {
        moistureRead: {
          name: "moistureRead",
          payload: { type: "object", properties: { percent: { type: "number", minimum: 0, maximum: 100 }, license: { type: "object", properties: { name: { type: "string", const: "GPL-3.0-or-later" } } } } },
          examples: [{ name: "dry", payload: { percent: 12, license: { name: "GPL-3.0-or-later" } } }],
        },
      },
    },
    valveCommands: {
      address: "irrigation.cmd.valves.open.v1",
      servers: [{ $ref: "#/servers/controlKafka" }],
      messages: { valveOpen: { $ref: "#/components/messages/valveOpen" } },
    },
    valveAcks: { address: null, messages: { valveAck: { name: "valveAck", payload: { type: "object" } } } },
  },
  operations: {
    receiveMoisture: { action: "receive", channel: { $ref: "#/channels/moisture" }, messages: [{ $ref: "#/channels/moisture/messages/moistureRead" }] },
    openValve: {
      action: "send",
      channel: { $ref: "#/channels/valveCommands" },
      messages: [{ $ref: "#/channels/valveCommands/messages/valveOpen" }],
      reply: { channel: { $ref: "#/channels/valveAcks" }, messages: [{ $ref: "#/channels/valveAcks/messages/valveAck" }] },
    },
  },
  components: {
    messages: {
      valveOpen: {
        name: "valveOpen",
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "ValveOpen", fields: [{ name: "valveId", type: "string" }, { name: "license", type: ["null", "string"], default: null }] },
        },
        traits: [{ $ref: "#/components/messageTraits/fieldHeaders" }],
      },
    },
    messageTraits: { fieldHeaders: { headers: { type: "object", properties: { license: { type: "string", const: "GPL-3.0-or-later" } } } } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL/SCRAM credentials." } },
    "x-licenses": { valid: { name: "GPL-3.0-or-later" } },
  },
};
