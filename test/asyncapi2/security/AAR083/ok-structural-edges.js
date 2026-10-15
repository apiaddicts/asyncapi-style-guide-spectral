module.exports = {
  asyncapi: "2.6.0",
  info: { title: "Quality Claims Structural Edges", version: "1.0.0", description: "Nodes the rule must skip.", "x-host": "localhost", "x-url": "kafka://evil.example.org" },
  "x-servers": { rogue: { url: "rogue.example.org", protocol: "kafka" } },
  servers: {
    nullServer: null,
    scalarServer: "kafka://evil.example.org:9092",
    numberServer: 9093,
    booleanServer: false,
    arrayServer: [{ url: "evil.example.org", protocol: "kafka" }, "localhost"],
    emptyServer: {},
    missingUrl: { protocol: "kafka", description: "No url at all." },
    nullUrl: { url: null, protocol: "kafka" },
    extensionUrlOnly: { protocol: "kafka", "x-url": "evil.example.org", "x-host": "localhost" },
    threeXFields: { host: "evil.example.org:9092", pathname: "/localhost", protocol: "kafka" },
    unusedVariables: {
      url: "kafka-claims.quality.es:9093",
      protocol: "kafka-secure",
      variables: { host: { enum: ["evil.example.org"] }, port: { default: "localhost" }, "x-region": { default: "10.0.0.1" } },
    },
    bindingsAndSecurity: {
      url: "mqtt.quality.es",
      protocol: "mqtt",
      security: [{ "https://evil.example.org": [] }, { localhost: ["evil.example.org"] }],
      bindings: {
        mqtt: { clientId: "localhost", lastWill: { topic: "evil.example.org/status" }, bindingVersion: "0.1.0" },
        kafka: { schemaRegistryUrl: "http://10.0.0.1:8081", bindingVersion: "0.4.0" },
        ibmmq: { groupId: "evil.example.org", ccdtQueueManagerName: "localhost", bindingVersion: "0.1.0" },
      },
      tags: [{ name: "localhost", externalDocs: { url: "https://evil.example.org/docs" } }],
      "x-url": { url: "evil.example.org" },
    },
  },
  channels: {
    "claims/{claimId}/status": {
      servers: ["nullServer", "evil.example.org", "localhost:9092"],
      parameters: { claimId: { schema: { type: "string", default: "localhost", enum: ["evil.example.org", "10.0.0.1"] }, location: "$message.header#/url" } },
      bindings: { ws: { headers: { type: "object", properties: { host: { type: "string", const: "evil.example.org" } } }, bindingVersion: "0.1.0" } },
      subscribe: {
        operationId: "receiveClaimStatus",
        message: {
          oneOf: [
            { name: "statusChanged", headers: { type: "object", properties: { url: { type: "string", default: "kafka://evil.example.org" } } }, payload: { type: "object" } },
            { name: "statusAvro", schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: { type: "record", name: "Status", fields: [{ name: "host", type: ["null", "string"], default: null }] } },
          ],
        },
      },
    },
    "claims.cdc.servers.v1": { servers: [], publish: { message: { payload: { type: "object", properties: { servers: { type: "object", properties: { evil: { type: "object", properties: { url: { const: "evil.example.org" } } } } } } } } } },
  },
  operations: { sendClaim: { action: "send", host: "evil.example.org", url: "kafka://evil.example.org" } },
  components: {
    servers: { nullServer: null, scalar: "localhost", list: ["localhost"], noUrl: { protocol: "kafka" }, nullUrl: { url: null, protocol: "kafka" }, threeX: { host: "localhost", protocol: "kafka" } },
    serverVariables: { host: { enum: ["localhost", "evil.example.org"], default: "10.0.0.1" } },
    channels: { mirror: { servers: ["evil.example.org"], publish: { message: { payload: { type: "string", default: "localhost" } } } } },
    schemas: { Server: { type: "object", properties: { url: { type: "string", default: "localhost" }, host: { type: "string", default: "10.0.0.1" } } } },
    messages: { serverMoved: { payload: { type: "object", properties: { url: { type: "string", examples: ["evil.example.org"] } } }, examples: [{ payload: { url: "localhost" } }] } },
    "x-servers": { rogue: { url: "evil.example.org", protocol: "kafka" } },
    securitySchemes: { oauth: { type: "oauth2", flows: { clientCredentials: { tokenUrl: "https://evil.example.org/token", scopes: {} } } } },
  },
};
