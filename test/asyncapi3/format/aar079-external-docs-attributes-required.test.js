const { linterForRule } = require("../../helpers/utils");
const {
  DOCS_FIELDS,
  DOCS_MINIMAL,
  DOCS_URL_ONLY,
  DOCS_COMPONENTS,
  DOCS_VALUE_CASES,
  DOCS_OBJECT_CASES,
  DOCS_SCHEMA_KEYWORD_CASES,
  DOCS_SCHEMA_IGNORED_CASES,
  DOCS_SCHEMA_FORMAT_CASES,
  DOCS_IGNORED_OPTIONS,
  DOCS_MESSAGES: MSG,
  docsTarget,
  docsFindings,
} = require("../../helpers/rules/aar079-external-docs-attributes-required");
const okExample = require("./AAR079/ok-example");
const failExample = require("./AAR079/fail-example");
const failSharedRef = require("./AAR079/fail-shared-ref");
const okStructuralEdges = require("./AAR079/ok-structural-edges");
const failLargeGenerated = require("./AAR079/fail-large-generated");

const RULE = "asa:AAR079";
const PS = "channels.playbackEvents.messages.playbackStarted";
const AVRO = "application/vnd.apache.avro;version=1.9.0";
const ASYNCAPI = "application/vnd.aai.asyncapi;version=3.0.0";

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = docsFindings("", [
  ["info.externalDocs", "missing", "description"],
  ["info.tags.0.externalDocs.url", "empty", "url"],
  ["components.tags.catalog.externalDocs", "missing", "url"],
  ["servers.kafkaEdge.externalDocs.description", "empty", "description"],
  ["servers.kafkaEdge.tags.0.externalDocs", "invalid"],
  ["servers.wsPlayers.externalDocs", "reference", "#/components/externalDocs/missing"],
  ["channels.playbackEvents.externalDocs", "missing", "description"],
  ["channels.playbackEvents.tags.0.externalDocs", "missing", "description"],
  ["channels.playbackEvents.tags.0.externalDocs", "missing", "url"],
  [`${PS}.externalDocs`, "missing", "url"],
  [`${PS}.tags.0.externalDocs.url`, "empty", "url"],
  [`${PS}.traits.1.0.externalDocs`, "missing", "description"],
  [`${PS}.headers.schema.externalDocs`, "missing", "url"],
  [`${PS}.payload.properties.sessionId.externalDocs`, "missing", "description"],
  [`${PS}.payload.properties.bitrate.externalDocs.url`, "empty", "url"],
  ["channels.playbackEvents.messages.playbackStopped.externalDocs", "invalid"],
  ["channels.sessionReplies.externalDocs.url", "empty", "url"],
  ["operations.sendPlayback.externalDocs", "missing", "description"],
  ["operations.sendPlayback.tags.0.externalDocs", "missing", "url"],
  ["operations.sendPlayback.traits.1.externalDocs", "invalid"],
  ["components.externalDocs.sessions", "missing", "description"],
  ["components.externalDocs.unreferenced", "missing", "url"],
  ["components.externalDocs.nothing", "invalid"],
  ["components.tags.billing.externalDocs.url", "empty", "url"],
  ["components.schemas.Device.externalDocs", "missing", "url"],
  ["components.schemas.Session.$defs.token.externalDocs", "missing", "description"],
  ["components.schemas.Quality.schema.externalDocs", "missing", "description"],
  ["components.schemas.Quality.schema.externalDocs", "missing", "url"],
  ["components.operationTraits.kafkaProducer.externalDocs.url", "empty", "url"],
  ["components.messageTraits.deviceHeaders.externalDocs", "missing", "description"],
  ["components.messageTraits.deviceHeaders.headers.properties.deviceId.externalDocs", "missing", "description"],
  ["components.messageTraits.deviceHeaders.headers.properties.deviceId.externalDocs", "missing", "url"],
  ["components.servers.kafkaDr.externalDocs", "missing", "description"],
  ["components.servers.kafkaDr.externalDocs", "missing", "url"],
  ["components.channels.audit.externalDocs", "missing", "description"],
  ["components.operations.receiveAudit.externalDocs", "missing", "url"],
  ["components.messages.auditRecord.externalDocs", "reference", "#/components/externalDocs/nothing"],
]);

const SHARED = docsFindings("", [
  ["components.externalDocs.handbook", "missing", "description"],
  ["components.externalDocs.cycleA", "reference", "#/components/externalDocs/cycleB"],
  ["components.externalDocs.cycleB", "reference", "#/components/externalDocs/cycleA"],
  ["operations.receiveTelemetry.externalDocs", "reference", "#/components/externalDocs/cycleA"],
  ["components.x-docs.antenna.url", "empty", "url"],
  ["components.channels.downlink.externalDocs", "missing", "url"],
  ["components.messages.telemetryFrame.externalDocs", "missing", "description"],
  ["components.schemas.TelemetryBody.properties.frameId.externalDocs", "missing", "description"],
  ["components.schemas.TelemetryBody.properties.frameId.externalDocs", "missing", "url"],
  ["components.schemas.GroundHeaders.externalDocs", "missing", "url"],
]);

const INFO = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const D = DOCS_URL_ONLY;
const SCHEMAS = {
  clean: { type: "object" },
  order: { type: "object", externalDocs: D },
  customer: { type: "object", externalDocs: D },
  customerAlias: { $ref: "#/components/x-schemas/customer" },
};
const doc = (extra = {}, components = {}) => ({
  asyncapi: "3.0.0",
  id: "urn:commerce:events",
  info: INFO,
  channels: {},
  operations: {},
  ...extra,
  components: { ...DOCS_COMPONENTS, "x-schemas": SCHEMAS, ...components },
});
const MISSING = (path) => [[path, MSG.missing("description")]];
const tag = { name: "orders", description: "Order events.", externalDocs: D };
const server = (extra) => ({ host: "kafka.commerce.example.com:9093", protocol: "kafka-secure", ...extra });
const channelWith = (channel, components) => doc({ channels: { orders: { address: "commerce.orders.v1", ...channel } } }, components);
const messageWith = (message, components) => channelWith({ messages: { orderPlaced: { name: "orderPlaced", ...message } } }, components);
const operationWith = (operation, components) =>
  doc({ channels: { orders: { address: "commerce.orders.v1" } }, operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, ...operation } } }, components);
const M = "channels.orders.messages.orderPlaced";
const O = "operations.sendOrder";
const multi = (schema, schemaFormat = ASYNCAPI) => ({ schemaFormat, schema });

const LOCATIONS = [
  ["info.externalDocs", () => doc({ info: { ...INFO, externalDocs: D } }), "info.externalDocs"],
  ["an info tag", () => doc({ info: { ...INFO, tags: [tag] } }), "info.tags.0.externalDocs"],
  ["an info object reached through $ref", () => doc({ info: { $ref: "#/components/x-info/withDocs" } }, { "x-info": { withDocs: { ...INFO, externalDocs: D } } }), "components.x-info.withDocs.externalDocs"],
  ["a server", () => doc({ servers: { kafka: server({ externalDocs: D }) } }), "servers.kafka.externalDocs"],
  ["a server whose name starts with x-", () => doc({ servers: { "x-edge": server({ externalDocs: D }) } }), "servers.x-edge.externalDocs"],
  ["a server tag", () => doc({ servers: { kafka: server({ tags: [tag] }) } }), "servers.kafka.tags.0.externalDocs"],
  ["a channel", () => channelWith({ externalDocs: D }), "channels.orders.externalDocs"],
  ["a channel with a null address", () => channelWith({ address: null, externalDocs: D }), "channels.orders.externalDocs"],
  ["a channel without address", () => doc({ channels: { orders: { externalDocs: D } } }), "channels.orders.externalDocs"],
  ["a channel whose name starts with x-", () => doc({ channels: { "x-orders": { address: "x", externalDocs: D } } }), "channels.x-orders.externalDocs"],
  ["a channel tag", () => channelWith({ tags: [tag] }), "channels.orders.tags.0.externalDocs"],
  ["a channel message", () => messageWith({ externalDocs: D }), `${M}.externalDocs`],
  ["a message whose key starts with x-", () => channelWith({ messages: { "x-legacy": { externalDocs: D } } }), "channels.orders.messages.x-legacy.externalDocs"],
  ["a message tag", () => messageWith({ tags: [tag] }), `${M}.tags.0.externalDocs`],
  ["an inline message trait", () => messageWith({ traits: [{ externalDocs: D }] }), `${M}.traits.0.externalDocs`],
  ["a message trait in tuple form", () => messageWith({ traits: [[{ externalDocs: D }, {}]] }), `${M}.traits.0.0.externalDocs`],
  ["a message trait tag", () => messageWith({ traits: [{ tags: [tag] }] }), `${M}.traits.0.tags.0.externalDocs`],
  ["a message trait headers schema", () => messageWith({ traits: [{ headers: { type: "object", externalDocs: D } }] }), `${M}.traits.0.headers.externalDocs`],
  ["a multi-format message trait headers schema", () => messageWith({ traits: [{ headers: multi({ type: "object", externalDocs: D }) }] }), `${M}.traits.0.headers.schema.externalDocs`],
  ["a payload schema", () => messageWith({ payload: { type: "object", externalDocs: D } }), `${M}.payload.externalDocs`],
  ["a multi-format payload schema", () => messageWith({ payload: multi({ type: "object", externalDocs: D }) }), `${M}.payload.schema.externalDocs`],
  ["a headers schema", () => messageWith({ headers: { type: "object", externalDocs: D } }), `${M}.headers.externalDocs`],
  ["a multi-format headers schema", () => messageWith({ headers: multi({ type: "object", externalDocs: D }) }), `${M}.headers.schema.externalDocs`],
  ["an operation", () => operationWith({ externalDocs: D }), `${O}.externalDocs`],
  ["an operation without channel", () => doc({ operations: { sendOrder: { action: "send", externalDocs: D } } }), `${O}.externalDocs`],
  ["an operation tag", () => operationWith({ tags: [tag] }), `${O}.tags.0.externalDocs`],
  ["an inline operation trait", () => operationWith({ traits: [{ externalDocs: D }] }), `${O}.traits.0.externalDocs`],
  ["an operation trait in tuple form", () => operationWith({ traits: [[{ externalDocs: D }, { "x-override": true }]] }), `${O}.traits.0.0.externalDocs`],
  ["an operation trait tag", () => operationWith({ traits: [{ tags: [tag] }] }), `${O}.traits.0.tags.0.externalDocs`],
  ["a message reached from an operation", () => operationWith({ messages: [{ $ref: "#/components/x-messages/orderPlaced" }] }, { "x-messages": { orderPlaced: { externalDocs: D } } }), "components.x-messages.orderPlaced.externalDocs"],
  ["a channel reached from an operation", () => doc({ operations: { sendOrder: { action: "send", channel: { $ref: "#/components/x-channels/orders" } } } }, { "x-channels": { orders: { externalDocs: D } } }), "components.x-channels.orders.externalDocs"],
  ["an inline reply channel", () => operationWith({ reply: { channel: { address: null, externalDocs: D } } }), `${O}.reply.channel.externalDocs`],
  ["a reply channel reached through $ref", () => operationWith({ reply: { channel: { $ref: "#/components/x-channels/replies" } } }, { "x-channels": { replies: { externalDocs: D } } }), "components.x-channels.replies.externalDocs"],
  ["a reply message", () => operationWith({ reply: { messages: [{ $ref: "#/components/x-messages/accepted" }] } }, { "x-messages": { accepted: { externalDocs: D } } }), "components.x-messages.accepted.externalDocs"],
  ["a reply reached through $ref", () => operationWith({ reply: { $ref: "#/components/x-replies/ack" } }, { "x-replies": { ack: { channel: { externalDocs: D } } } }), "components.x-replies.ack.channel.externalDocs"],
  ["a server reached from a channel", () => channelWith({ servers: [{ $ref: "#/components/x-servers/kafka" }] }, { "x-servers": { kafka: server({ externalDocs: D }) } }), "components.x-servers.kafka.externalDocs"],
  ["a components.externalDocs entry nobody references", () => doc({}, { externalDocs: { orders: D } }), "components.externalDocs.orders"],
  ["a components.tags entry", () => doc({}, { tags: { orders: tag } }), "components.tags.orders.externalDocs"],
  ["components.servers", () => doc({}, { servers: { kafka: server({ externalDocs: D }) } }), "components.servers.kafka.externalDocs"],
  ["components.channels", () => doc({}, { channels: { orders: { externalDocs: D } } }), "components.channels.orders.externalDocs"],
  ["a message of components.channels", () => doc({}, { channels: { orders: { messages: { orderPlaced: { externalDocs: D } } } } }), "components.channels.orders.messages.orderPlaced.externalDocs"],
  ["components.operations", () => doc({}, { operations: { receiveOrder: { action: "receive", externalDocs: D } } }), "components.operations.receiveOrder.externalDocs"],
  ["components.messages", () => doc({}, { messages: { orderPlaced: { externalDocs: D } } }), "components.messages.orderPlaced.externalDocs"],
  ["components.replies", () => doc({}, { replies: { ack: { channel: { address: null, externalDocs: D } } } }), "components.replies.ack.channel.externalDocs"],
  ["components.operationTraits", () => doc({}, { operationTraits: { producer: { externalDocs: D } } }), "components.operationTraits.producer.externalDocs"],
  ["components.messageTraits", () => doc({}, { messageTraits: { headers: { externalDocs: D } } }), "components.messageTraits.headers.externalDocs"],
  ["components.messageTraits headers", () => doc({}, { messageTraits: { headers: { headers: multi({ type: "object", externalDocs: D }) } } }), "components.messageTraits.headers.headers.schema.externalDocs"],
  ["components.schemas", () => doc({}, { schemas: { Order: { type: "object", externalDocs: D } } }), "components.schemas.Order.externalDocs"],
  ["a multi-format components schema", () => doc({}, { schemas: { Order: multi({ type: "object", externalDocs: D }) } }), "components.schemas.Order.schema.externalDocs"],
  ["an operation reached through $ref", () => doc({ operations: { sendOrder: { $ref: "#/components/x-operations/send" } } }, { "x-operations": { send: { action: "send", externalDocs: D } } }), "components.x-operations.send.externalDocs"],
  ["a channel reached through $ref", () => doc({ channels: { orders: { $ref: "#/components/x-channels/orders" } } }, { "x-channels": { orders: { externalDocs: D } } }), "components.x-channels.orders.externalDocs"],
  ["a channel message reached through $ref", () => channelWith({ messages: { orderPlaced: { $ref: "#/components/x-messages/orderPlaced" } } }, { "x-messages": { orderPlaced: { externalDocs: D } } }), "components.x-messages.orderPlaced.externalDocs"],
  [
    "an operation trait reached through a chained $ref",
    () => operationWith({ traits: [{ $ref: "#/components/x-traits/alias" }] }, { "x-traits": { alias: { $ref: "#/components/x-traits/producer" }, producer: { externalDocs: D } } }),
    "components.x-traits.producer.externalDocs",
  ],
  ["a message trait reached through $ref", () => messageWith({ traits: [{ $ref: "#/components/x-traits/headers" }] }, { "x-traits": { headers: { externalDocs: D } } }), "components.x-traits.headers.externalDocs"],
  ["a tag reached through $ref", () => doc({ info: { ...INFO, tags: [{ $ref: "#/components/x-tags/orders" }] } }, { "x-tags": { orders: tag } }), "components.x-tags.orders.externalDocs"],
  ["a tag list reached through $ref", () => channelWith({ tags: { $ref: "#/components/x-tag-lists/orders" } }, { "x-tag-lists": { orders: [tag] } }), "components.x-tag-lists.orders.0.externalDocs"],
  ["an externalDocs reached through $ref", () => doc({ info: { ...INFO, externalDocs: docsTarget("urlOnly") } }), "components.x-docs.urlOnly"],
  ["a payload reached through $ref", () => messageWith({ payload: { $ref: "#/components/x-schemas/order" } }), "components.x-schemas.order.externalDocs"],
  ["a multi-format schema given as a $ref", () => messageWith({ payload: multi({ $ref: "#/components/x-schemas/order" }) }), "components.x-schemas.order.externalDocs"],
  ["a multi-format object reached through $ref", () => messageWith({ payload: { $ref: "#/components/x-formats/json" } }, { "x-formats": { json: multi({ externalDocs: D }) } }), "components.x-formats.json.schema.externalDocs"],
  ["a property schema reached through a chained $ref", () => messageWith({ payload: { type: "object", properties: { customer: { $ref: "#/components/x-schemas/customerAlias" } } } }), "components.x-schemas.customer.externalDocs"],
];

const IGNORED = [
  ["the root externalDocs, an AsyncAPI 2.x location", () => doc({ externalDocs: D })],
  ["root tags, an AsyncAPI 2.x location", () => doc({ tags: [tag] })],
  ["channel publish and subscribe operations, AsyncAPI 2.x constructs", () => channelWith({ publish: { externalDocs: D, message: { externalDocs: D } }, subscribe: { traits: [{ externalDocs: D }] } })],
  ["message oneOf members, an AsyncAPI 2.x construct", () => messageWith({ oneOf: [{ externalDocs: D }, { traits: [{ externalDocs: D }] }] })],
  ["channel and components parameter schemas, which 3.x parameters do not have", () => channelWith({ parameters: { id: { schema: { type: "string", externalDocs: D } } } }, { parameters: { id: { schema: { externalDocs: D } } } })],
  ["reply externalDocs and reply addresses, which are not Reply object fields", () => operationWith({ reply: { externalDocs: D, address: { location: "$message.header#/replyTo", externalDocs: D } } })],
  ["the siblings of a message $ref", () => channelWith({ messages: { orderPlaced: { $ref: "#/components/messages/clean", externalDocs: D } } }, { messages: { clean: { name: "clean" } } })],
  ["the siblings of a channel $ref", () => doc({ channels: { orders: { $ref: "#/components/channels/clean", externalDocs: D } } }, { channels: { clean: {} } })],
  ["the siblings of an operation $ref", () => doc({ operations: { sendOrder: { $ref: "#/components/operations/clean", externalDocs: D } } }, { operations: { clean: { action: "send" } } })],
  ["the siblings of a schema $ref", () => messageWith({ payload: multi({ $ref: "#/components/x-schemas/clean", externalDocs: D }) })],
  ["an external message and an external schema", () => channelWith({ messages: { orderPlaced: { $ref: "./messages.yaml#/orderPlaced", externalDocs: D }, refund: { payload: { $ref: "./schemas/refund.json", externalDocs: D } } } })],
  ["an external externalDocs", () => doc({ info: { ...INFO, externalDocs: { $ref: "./docs.yaml#/handbook" } } }, { externalDocs: { external: { $ref: "https://specs.example.io/docs.yaml" } } })],
  [
    "a traits object instead of a list",
    () => doc({ channels: { orders: { address: "orders", messages: { orderPlaced: { traits: { externalDocs: D } } } } }, operations: { sendOrder: { action: "send", traits: { externalDocs: D } } } }),
  ],
  ["an operation trait headers, which is not an operation trait field", () => operationWith({ traits: [{ headers: { type: "object", externalDocs: D } }] })],
  ["an unreferenced extension", () => doc({ "x-docs": D }, { "x-drafts": { orders: { externalDocs: D } } })],
  [
    "message examples, correlation ids and bindings, binding schemas included",
    () =>
      messageWith({
        examples: [{ payload: { externalDocs: D }, headers: { externalDocs: {} } }],
        correlationId: { location: "$message.header#/id", externalDocs: D },
        bindings: { kafka: { key: { type: "string", externalDocs: D }, bindingVersion: "0.5.0" }, http: { headers: { type: "object", externalDocs: D } } },
      }),
  ],
  [
    "server variables, server, channel and operation bindings and security schemes",
    () =>
      doc(
        {
          servers: { kafka: server({ variables: { port: { default: "9093", externalDocs: D } }, bindings: { kafka: { externalDocs: D } } }) },
          channels: { orders: { address: "orders", bindings: { ws: { query: { type: "object", externalDocs: D } } } } },
          operations: { sendOrder: { action: "send", bindings: { kafka: { groupId: { type: "string", externalDocs: D } } } } },
        },
        { securitySchemes: { oauth: { type: "oauth2", externalDocs: D } }, serverVariables: { port: { externalDocs: D } } }
      ),
  ],
  [
    "an Avro payload, with JSON Schema look-alike and nullable union fields",
    () =>
      messageWith({
        payload: multi(
          {
            type: "record",
            name: "Order",
            externalDocs: D,
            fields: [
              { name: "externalDocs", type: ["null", { type: "record", name: "Docs", fields: [{ name: "url", type: "string" }], externalDocs: {} }], default: null },
              { name: "items", type: { type: "array", items: { type: "record", name: "Line", fields: [], externalDocs: D } } },
            ],
            properties: { lines: { externalDocs: D } },
          },
          AVRO
        ),
      }),
  ],
  ["Avro headers", () => messageWith({ headers: multi({ type: "record", name: "Headers", fields: [], externalDocs: D }, AVRO) })],
  ["a components schema used as an Avro payload", () => messageWith({ payload: multi({ $ref: "#/components/schemas/OrderAvro" }, AVRO) }, { schemas: { OrderAvro: { type: "record", name: "Order", fields: [], externalDocs: D } } })],
  [
    "a components schema targeted by an Avro components entry listed after it",
    () => doc({}, { schemas: { OrderAvro: { type: "record", name: "Order", fields: [], externalDocs: D }, OrderEnvelope: multi({ $ref: "#/components/schemas/OrderAvro" }, AVRO) } }),
  ],
  [
    "a components schema targeted by an Avro components entry listed before it",
    () => doc({}, { schemas: { OrderEnvelope: multi({ $ref: "#/components/schemas/OrderAvro" }, AVRO), OrderAvro: { type: "record", name: "Order", fields: [], externalDocs: D } } }),
  ],
  ["a multi-format object without schema", () => messageWith({ payload: { schemaFormat: ASYNCAPI }, headers: { schemaFormat: ASYNCAPI, schema: null } })],
  ["the schema keyword of an object without schemaFormat, which is a plain schema", () => messageWith({ payload: { schema: { type: "object", externalDocs: D } } })],
];

describe("AAR079 (AsyncAPI 3.x): every External Documentation object must populate description and url", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic Kafka, MQTT and WebSocket document with operations, replies and multi-format payloads whose externalDocs populate both fields", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports info, tag, server, channel, message, trait, operation, schema and every components map", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("treats every version from 3 up as 3.x", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0", "3.2.0", "4.0.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("read as AsyncAPI 2.6, the 3.x locations are ignored and the 2.x root externalDocs and tags are checked", async () => {
    const results = findingsOf(await linter.run(withVersion(failExample, "2.6.0")));
    expect(results.filter(([path]) => /^(info|servers\.\w+\.externalDocs|channels\.\w+\.externalDocs|operations|components\.(externalDocs|tags|operations|replies))/.test(path))).toEqual([]);
    expect(results).toEqual(expect.arrayContaining([["externalDocs", MSG.missing("description")], ["tags.0.externalDocs", MSG.missing("url")]]));
  });

  test("reports with the error severity and one finding per missing or empty field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("reports an object shared through $ref once, at its definition, and every components.externalDocs entry once", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
    const results = only(await linter.run(failSharedRef));
    expect(results.filter((r) => r.path.join(".") === "components.externalDocs.handbook")).toHaveLength(1);
    expect(results.filter((r) => r.path.join(".").startsWith("components.externalDocs.handbookAlias"))).toEqual([]);
  });

  describe("locations", () => {
    test.each(LOCATIONS)("checks %s", async (_, build, path) => {
      expect(findingsOf(await linter.run(build()))).toEqual(MISSING(path));
    });

    test.each(IGNORED)("ignores %s", async (_, build) => {
      expect(findingsOf(await linter.run(build()))).toEqual([]);
    });

    test("skips null, scalar, external, dangling and sibling nodes, every 2.x leftover and every non-JSON schema", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test.each([
      ["null", null],
      ["a string", "Commerce Events"],
      ["a list", [INFO]],
      ["an external reference", { $ref: "./info.yaml#/info" }],
      ["a dangling reference", { $ref: "#/components/x-info/missing" }],
      ["a reference to the document root", { $ref: "#" }],
    ])("an info object given as %s is skipped without a finding", async (_, info) => {
      expect(findingsOf(await linter.run(doc({ info, channels: { orders: { address: "orders", externalDocs: D } } })))).toEqual(MISSING("channels.orders.externalDocs"));
    });
  });

  describe("schemas", () => {
    test.each(DOCS_SCHEMA_KEYWORD_CASES)("checks %s of a payload, plain and multi-format", async (_, build, path) => {
      expect(findingsOf(await linter.run(messageWith({ payload: build(D) })))).toEqual(MISSING(`${M}.payload.${path}`));
      expect(findingsOf(await linter.run(messageWith({ payload: multi(build(D)) })))).toEqual(MISSING(`${M}.payload.schema.${path}`));
    });

    test.each(DOCS_SCHEMA_KEYWORD_CASES)("checks %s of a components schema, plain and multi-format", async (_, build, path) => {
      expect(findingsOf(await linter.run(doc({}, { schemas: { Order: build(D) } })))).toEqual(MISSING(`components.schemas.Order.${path}`));
      expect(findingsOf(await linter.run(doc({}, { schemas: { Order: multi(build(D), "application/schema+json;version=draft-07") } })))).toEqual(MISSING(`components.schemas.Order.schema.${path}`));
    });

    test.each(DOCS_SCHEMA_KEYWORD_CASES)("checks %s of message and trait headers", async (_, build, path) => {
      expect(findingsOf(await linter.run(messageWith({ headers: build(D) })))).toEqual(MISSING(`${M}.headers.${path}`));
      expect(findingsOf(await linter.run(messageWith({ traits: [{ headers: multi(build(D)) }] })))).toEqual(MISSING(`${M}.traits.0.headers.schema.${path}`));
    });

    test.each(DOCS_SCHEMA_IGNORED_CASES)("ignores %s", async (_, payload) => {
      expect(findingsOf(await linter.run(messageWith({ payload })))).toEqual([]);
      expect(findingsOf(await linter.run(messageWith({ payload: multi(payload) })))).toEqual([]);
    });

    test.each(DOCS_SCHEMA_FORMAT_CASES)("a payload with %s is walked: %s", async (_, schemaFormat, walked) => {
      const body = { type: "object", properties: { id: { type: "string", externalDocs: D } } };
      const plain = schemaFormat === undefined;
      const built = messageWith({ payload: plain ? body : { schemaFormat, schema: body } });
      expect(findingsOf(await linter.run(built))).toEqual(walked ? MISSING(`${M}.payload${plain ? "" : ".schema"}.properties.id.externalDocs`) : []);
    });

    test.each(DOCS_SCHEMA_FORMAT_CASES)("headers and components schemas with %s follow their own schemaFormat: walked %s", async (_, schemaFormat, walked) => {
      const body = { type: "object", externalDocs: D };
      const plain = schemaFormat === undefined;
      const wrap = plain ? body : { schemaFormat, schema: body };
      const suffix = plain ? "" : ".schema";
      expect(findingsOf(await linter.run(messageWith({ headers: wrap })))).toEqual(walked ? MISSING(`${M}.headers${suffix}.externalDocs`) : []);
      expect(findingsOf(await linter.run(doc({}, { schemas: { Order: wrap } })))).toEqual(walked ? MISSING(`components.schemas.Order${suffix}.externalDocs`) : []);
    });

    test("a schema shared by several payloads, headers and properties is reported once, at its definition", async () => {
      const ref = { $ref: "#/components/x-schemas/order" };
      const built = channelWith({
        messages: {
          a: { payload: ref, headers: multi(ref) },
          b: { payload: multi({ type: "object", properties: { a: ref, b: { type: "array", items: ref } } }, "application/vnd.oai.openapi;version=3.0.0") },
        },
      });
      expect(findingsOf(await linter.run(built))).toEqual(MISSING("components.x-schemas.order.externalDocs"));
    });

    test("a schema used both as an Avro and as a JSON payload is treated as Avro whatever the order", async () => {
      const avro = { schemaFormat: AVRO, schema: { $ref: "#/components/schemas/Shared" } };
      const json = { $ref: "#/components/schemas/Shared" };
      for (const messages of [{ a: { payload: avro }, b: { payload: json } }, { a: { payload: json }, b: { payload: avro } }]) {
        expect(findingsOf(await linter.run(channelWith({ messages }, { schemas: { Shared: { type: "record", name: "Shared", fields: [], externalDocs: D } } })))).toEqual([]);
      }
    });

    test("a recursive schema is walked once and a long chain of referenced schemas is followed to the end", async () => {
      const node = { type: "object", externalDocs: D, properties: { parent: { $ref: "#/components/schemas/Node" }, children: { type: "array", items: { $ref: "#/components/schemas/Node" } } } };
      expect(findingsOf(await linter.run(doc({}, { schemas: { Node: node } })))).toEqual(MISSING("components.schemas.Node.externalDocs"));
      const schemas = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`S${i}`, multi({ type: "object", properties: { next: { $ref: `#/components/schemas/S${i + 1}` } } })]));
      schemas.S300 = { type: "object", externalDocs: D };
      expect(findingsOf(await linter.run(doc({}, { schemas })))).toEqual(MISSING("components.schemas.S300.externalDocs"));
    });
  });

  describe("field values", () => {
    const FIELD_CASES = DOCS_VALUE_CASES.flatMap(([label, value, populated]) => DOCS_FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`info.externalDocs.${field}`, MSG.empty(field)]];
      expect(findingsOf(await linter.run(doc({ info: { ...INFO, externalDocs: { ...DOCS_MINIMAL, [field]: value } } })))).toEqual(expected);
    });

    test.each(DOCS_VALUE_CASES)("description and url of a components.externalDocs entry both set to %s", async (_, value, populated) => {
      const expected = populated ? [] : docsFindings("components.externalDocs.orders", DOCS_FIELDS.map((field) => [field, "empty", field]));
      expect(findingsOf(await linter.run(doc({}, { externalDocs: { orders: { description: value, url: value } } })))).toEqual(expected);
    });

    test.each(DOCS_VALUE_CASES)("look-alike keys and extensions set to %s are never required", async (_, value) => {
      expect(findingsOf(await linter.run(channelWith({ externalDocs: { ...DOCS_MINIMAL, title: value, href: value, "x-owner": value } })))).toEqual([]);
    });

    test.each([[["description"]], [["url"]], [["description", "url"]]])("reports %j missing at the object", async (fields) => {
      const docs = Object.fromEntries(Object.entries(DOCS_MINIMAL).filter(([key]) => !fields.includes(key)));
      expect(findingsOf(await linter.run(operationWith({ externalDocs: docs })))).toEqual(docsFindings(`${O}.externalDocs`, fields.map((field) => ["", "missing", field])));
    });
  });

  describe("externalDocs values", () => {
    test.each(DOCS_OBJECT_CASES)("%s as info.externalDocs", async (_, value, expected) => {
      expect(findingsOf(await linter.run(doc({ info: { ...INFO, externalDocs: value } })))).toEqual(docsFindings("info.externalDocs", expected));
    });

    test.each(DOCS_OBJECT_CASES)("%s as a components.externalDocs entry", async (_, value, expected) => {
      expect(findingsOf(await linter.run(doc({}, { externalDocs: { orders: value } })))).toEqual(docsFindings("components.externalDocs.orders", expected));
    });

    test.each(DOCS_OBJECT_CASES)("%s in a multi-format payload property", async (_, value, expected) => {
      const path = `${M}.payload.schema.properties.id.externalDocs`;
      expect(findingsOf(await linter.run(messageWith({ payload: multi({ type: "object", properties: { id: { type: ["string", "null"], externalDocs: value } } }) })))).toEqual(docsFindings(path, expected));
    });
  });

  describe("trait merging", () => {
    test("checks each object where it is written: the message wins in a 3.x merge, but neither object completes the other", async () => {
      const built = messageWith({ externalDocs: D, traits: [{ externalDocs: { description: "From the trait." } }] });
      expect(findingsOf(await linter.run(built))).toEqual(
        docsFindings("", [
          [`${M}.externalDocs`, "missing", "description"],
          [`${M}.traits.0.externalDocs`, "missing", "url"],
        ])
      );
      expect(findingsOf(await linter.run(messageWith({ externalDocs: DOCS_MINIMAL, traits: [{ externalDocs: D }] })))).toEqual(MISSING(`${M}.traits.0.externalDocs`));
      expect(findingsOf(await linter.run(operationWith({ externalDocs: D, traits: [{ externalDocs: DOCS_MINIMAL }] })))).toEqual(MISSING(`${O}.externalDocs`));
    });

    test("an operation trait shared by many operations is reported once, at the trait", async () => {
      const operations = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`op${i}`, { action: i % 2 ? "send" : "receive", traits: [{ $ref: "#/components/operationTraits/producer" }] }]));
      expect(findingsOf(await linter.run(doc({ operations }, { operationTraits: { producer: { externalDocs: D } } })))).toEqual(MISSING("components.operationTraits.producer.externalDocs"));
    });

    test("a components.externalDocs entry referenced from info, tags, servers, channels, operations, messages and schemas is reported once", async () => {
      const ref = { $ref: "#/components/externalDocs/orders" };
      const built = doc(
        {
          info: { ...INFO, externalDocs: ref, tags: [{ name: "orders", externalDocs: ref }] },
          servers: { kafka: server({ externalDocs: ref }) },
          channels: { orders: { address: "orders", externalDocs: ref, messages: { placed: { externalDocs: ref, payload: { type: "object", externalDocs: ref } } } } },
          operations: { sendOrder: { action: "send", externalDocs: ref, traits: [{ externalDocs: ref }] } },
        },
        { externalDocs: { orders: D } }
      );
      expect(findingsOf(await linter.run(built))).toEqual(MISSING("components.externalDocs.orders"));
    });
  });

  describe("functionOptions", () => {
    test.each(DOCS_IGNORED_OPTIONS)("injecting %s changes nothing: description and url stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(doc({}, { externalDocs: { orders: { ...DOCS_MINIMAL, title: "", "x-owner": "" } } })))).toEqual([]);
      expect(findingsOf(await custom.run(doc({}, { externalDocs: { orders: { title: "Orders", "x-owner": "docs-team" } } })))).toEqual(
        docsFindings("components.externalDocs.orders", DOCS_FIELDS.map((field) => ["", "missing", field]))
      );
    });
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("follows a components object given as a $ref, and ignores one that points to the document itself", async () => {
    const built = { asyncapi: "3.0.0", info: INFO, components: { $ref: "#/x-components" }, "x-components": { externalDocs: { orders: D } } };
    expect(findingsOf(await linter.run(built))).toEqual(MISSING("x-components.externalDocs.orders"));
    expect(findingsOf(await linter.run({ ...built, components: { $ref: "#" } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", info: { externalDocs: {} } }]))).toEqual([]);
  });

  test("handles a very large document with thousands of externalDocs and reports exactly the generated violations", async () => {
    const { document, expected, places } = failLargeGenerated;
    expect(places).toBeGreaterThan(4000);
    expect(findingsOf(await linter.run(document))).toEqual(docsFindings("", expected));
  });
});
