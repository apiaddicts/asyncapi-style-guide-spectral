const { Document } = require("@stoplight/spectral-core");
const Parsers = require("@stoplight/spectral-parsers");
const {
  linterForRule,
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
} = require("../../helpers/utils");
const okExample = require("./AAR079/ok-example");
const failExample = require("./AAR079/fail-example");
const failSharedRef = require("./AAR079/fail-shared-ref");
const okStructuralEdges = require("./AAR079/ok-structural-edges");
const failLargeGenerated = require("./AAR079/fail-large-generated");

const RULE = "asa:AAR079";
const G = "channels.aurora.cdc.meters.readings.v3";
const S = "channels.substations/{substationId}/alarms";
const AVRO = "application/vnd.apache.avro;version=1.9.0";
const ASYNCAPI = "application/vnd.aai.asyncapi;version=2.6.0";

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = docsFindings("", [
  ["externalDocs", "missing", "description"],
  ["tags.0.externalDocs.url", "empty", "url"],
  ["components.x-docs.substations", "missing", "url"],
  ["tags.3.externalDocs", "invalid"],
  ["servers.kafkaGrid.tags.0.externalDocs.description", "empty", "description"],
  [`${G}.publish.externalDocs.description`, "empty", "description"],
  [`${G}.publish.externalDocs.url`, "empty", "url"],
  [`${G}.publish.tags.0.externalDocs`, "missing", "description"],
  [`${G}.publish.traits.1.externalDocs`, "missing", "url"],
  [`${G}.publish.traits.2.0.externalDocs`, "invalid"],
  [`${G}.publish.message.externalDocs`, "missing", "description"],
  [`${G}.publish.message.tags.0.externalDocs`, "missing", "description"],
  [`${G}.publish.message.tags.0.externalDocs`, "missing", "url"],
  [`${G}.publish.message.traits.1.0.externalDocs`, "missing", "url"],
  [`${G}.publish.message.headers.externalDocs`, "missing", "url"],
  [`${G}.publish.message.payload.properties.meterId.externalDocs`, "missing", "description"],
  [`${G}.publish.message.payload.properties.reading.externalDocs.url`, "empty", "url"],
  [`${G}.subscribe.message.oneOf.1.externalDocs`, "invalid"],
  [`${S}.parameters.substationId.schema.externalDocs.description`, "empty", "description"],
  [`${S}.subscribe.externalDocs`, "reference", "#/components/x-docs/missing"],
  ["components.parameters.region.schema.externalDocs", "missing", "description"],
  ["components.schemas.GeoPoint.externalDocs", "missing", "url"],
  ["components.schemas.Tariff.definitions.band.externalDocs", "missing", "description"],
  ["components.messages.meterAlarm.externalDocs", "missing", "url"],
  ["components.x-docs.tariffs.url", "empty", "url"],
  ["components.operationTraits.kafkaProducer.externalDocs", "missing", "url"],
  ["components.operationTraits.kafkaProducer.tags.0.externalDocs", "missing", "description"],
  ["components.messageTraits.gridHeaders.headers.properties.traceId.externalDocs", "missing", "description"],
  ["components.messageTraits.gridHeaders.headers.properties.traceId.externalDocs", "missing", "url"],
  ["components.channels.tariffs.publish.externalDocs", "missing", "description"],
  ["components.servers.kafkaDr.tags.0.externalDocs.url", "empty", "url"],
]);

const SHARED = docsFindings("", [
  ["components.x-docs.handbook", "missing", "description"],
  ["components.x-docs.baggage.url", "empty", "url"],
  ["components.x-docs.list.0.url", "empty", "url"],
  ["channels.skyport.cmd.bags.screen.v1.subscribe.externalDocs", "reference", "#/components/x-docs/cycleA"],
  ["channels.skyport.cdc.bags.loaded.v1.subscribe.externalDocs", "reference", "#/components/x-docs/cycleB"],
  ["components.x-tag-sets.platform.1.externalDocs", "missing", "url"],
  ["components.schemas.BagTag.externalDocs", "missing", "url"],
  ["components.x-message-library.bagRejected.externalDocs", "missing", "description"],
  ["components.schemas.HandlingHeaders.properties.station.externalDocs", "missing", "description"],
  ["components.schemas.HandlingHeaders.properties.station.externalDocs", "missing", "url"],
]);

const INFO = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const doc = (extra = {}, components = {}) => ({
  asyncapi: "2.6.0",
  id: "urn:commerce:events",
  info: INFO,
  channels: {},
  ...extra,
  components: { ...DOCS_COMPONENTS, "x-schemas": { clean: { type: "object" } }, ...components },
});
const D = DOCS_URL_ONLY;
const MISSING = (path) => [[path, MSG.missing("description")]];
const tag = { name: "orders", description: "Order events.", externalDocs: D };
const server = (extra) => ({ url: "kafka.commerce.example.com:9093", protocol: "kafka-secure", ...extra });
const publish = (operation) => doc({ channels: { orders: { publish: operation } } });
const publishMessage = (message) => publish({ operationId: "publishOrder", message: { name: "orderPlaced", ...message } });
const P = "channels.orders.publish";

const LOCATIONS = [
  ["the root externalDocs", () => doc({ externalDocs: D }), "externalDocs"],
  ["a root tag", () => doc({ tags: [tag] }), "tags.0.externalDocs"],
  ["a server tag", () => doc({ servers: { kafka: server({ tags: [tag] }) } }), "servers.kafka.tags.0.externalDocs"],
  ["a server whose name starts with x-", () => doc({ servers: { "x-edge": server({ tags: [tag] }) } }), "servers.x-edge.tags.0.externalDocs"],
  ["a publish operation", () => publish({ externalDocs: D }), `${P}.externalDocs`],
  ["a subscribe operation", () => doc({ channels: { orders: { subscribe: { externalDocs: D } } } }), "channels.orders.subscribe.externalDocs"],
  ["a channel whose name starts with x-", () => doc({ channels: { "x-orders": { publish: { externalDocs: D } } } }), "channels.x-orders.publish.externalDocs"],
  ["an operation tag", () => publish({ tags: [tag] }), `${P}.tags.0.externalDocs`],
  ["an inline operation trait", () => publish({ traits: [{ externalDocs: D }] }), `${P}.traits.0.externalDocs`],
  ["an operation trait in tuple form", () => publish({ traits: [[{ externalDocs: D }, { "x-override": true }]] }), `${P}.traits.0.0.externalDocs`],
  ["an operation trait tag", () => publish({ traits: [{ tags: [tag] }] }), `${P}.traits.0.tags.0.externalDocs`],
  ["an inline message", () => publishMessage({ externalDocs: D }), `${P}.message.externalDocs`],
  ["a message tag", () => publishMessage({ tags: [tag] }), `${P}.message.tags.0.externalDocs`],
  ["a oneOf member", () => doc({ channels: { orders: { subscribe: { message: { oneOf: [{ name: "a" }, { externalDocs: D }] } } } } }), "channels.orders.subscribe.message.oneOf.1.externalDocs"],
  ["an inline message trait", () => publishMessage({ traits: [{ externalDocs: D }] }), `${P}.message.traits.0.externalDocs`],
  ["a message trait in tuple form", () => publishMessage({ traits: [[{ externalDocs: D }, {}]] }), `${P}.message.traits.0.0.externalDocs`],
  ["a message trait tag", () => publishMessage({ traits: [{ tags: [tag] }] }), `${P}.message.traits.0.tags.0.externalDocs`],
  ["a trait of a oneOf member", () => doc({ channels: { orders: { subscribe: { message: { oneOf: [{ traits: [{ externalDocs: D }] }] } } } } }), "channels.orders.subscribe.message.oneOf.0.traits.0.externalDocs"],
  ["a message payload", () => publishMessage({ payload: { type: "object", externalDocs: D } }), `${P}.message.payload.externalDocs`],
  ["a message headers schema", () => publishMessage({ headers: { type: "object", externalDocs: D } }), `${P}.message.headers.externalDocs`],
  ["a message trait headers schema", () => publishMessage({ traits: [{ headers: { type: "object", externalDocs: D } }] }), `${P}.message.traits.0.headers.externalDocs`],
  ["a channel parameter schema", () => doc({ channels: { "orders/{id}": { parameters: { id: { schema: { type: "string", externalDocs: D } } } } } }), "channels.orders/{id}.parameters.id.schema.externalDocs"],
  ["components.schemas", () => doc({}, { schemas: { Order: { type: "object", externalDocs: D } } }), "components.schemas.Order.externalDocs"],
  ["components.parameters", () => doc({}, { parameters: { id: { schema: { type: "string", externalDocs: D } } } }), "components.parameters.id.schema.externalDocs"],
  ["a components.servers tag", () => doc({}, { servers: { kafka: server({ tags: [tag] }) } }), "components.servers.kafka.tags.0.externalDocs"],
  ["an operation of components.channels", () => doc({}, { channels: { orders: { subscribe: { externalDocs: D } } } }), "components.channels.orders.subscribe.externalDocs"],
  ["a message of components.channels", () => doc({}, { channels: { orders: { subscribe: { message: { externalDocs: D } } } } }), "components.channels.orders.subscribe.message.externalDocs"],
  ["a parameter of components.channels", () => doc({}, { channels: { "orders/{id}": { parameters: { id: { schema: { externalDocs: D } } } } } }), "components.channels.orders/{id}.parameters.id.schema.externalDocs"],
  ["components.messages", () => doc({}, { messages: { orderPlaced: { externalDocs: D } } }), "components.messages.orderPlaced.externalDocs"],
  ["a oneOf member in components.messages", () => doc({}, { messages: { orderEvents: { oneOf: [{ externalDocs: D }] } } }), "components.messages.orderEvents.oneOf.0.externalDocs"],
  ["a trait of a components message", () => doc({}, { messages: { orderPlaced: { traits: [{ externalDocs: D }] } } }), "components.messages.orderPlaced.traits.0.externalDocs"],
  ["components.operationTraits", () => doc({}, { operationTraits: { producer: { externalDocs: D } } }), "components.operationTraits.producer.externalDocs"],
  ["components.messageTraits", () => doc({}, { messageTraits: { headers: { externalDocs: D } } }), "components.messageTraits.headers.externalDocs"],
  ["components.messageTraits headers", () => doc({}, { messageTraits: { headers: { headers: { type: "object", externalDocs: D } } } }), "components.messageTraits.headers.headers.externalDocs"],
  [
    "a channel item reached through $ref",
    () => doc({ channels: { orders: { $ref: "#/components/x-channels/orders" } } }, { "x-channels": { orders: { publish: { externalDocs: D } } } }),
    "components.x-channels.orders.publish.externalDocs",
  ],
  ["an operation reached through $ref", () => doc({ channels: { orders: { publish: { $ref: "#/components/x-operations/publish" } } } }, { "x-operations": { publish: { externalDocs: D } } }), "components.x-operations.publish.externalDocs"],
  ["a message reached through $ref", () => doc({ channels: { orders: { publish: { message: { $ref: "#/components/messages/orderPlaced" } } } } }, { messages: { orderPlaced: { externalDocs: D } } }), "components.messages.orderPlaced.externalDocs"],
  [
    "a oneOf member reached through $ref",
    () => doc({ channels: { orders: { subscribe: { message: { oneOf: [{ $ref: "#/components/x-message-library/orderPlaced" }] } } } } }, { "x-message-library": { orderPlaced: { externalDocs: D } } }),
    "components.x-message-library.orderPlaced.externalDocs",
  ],
  [
    "an operation trait reached through a chained $ref",
    () => doc({ channels: { orders: { publish: { traits: [{ $ref: "#/components/x-traits/alias" }] } } } }, { "x-traits": { alias: { $ref: "#/components/x-traits/producer" }, producer: { externalDocs: D } } }),
    "components.x-traits.producer.externalDocs",
  ],
  [
    "a message trait reached through $ref",
    () => doc({ channels: { orders: { publish: { message: { traits: [{ $ref: "#/components/x-traits/headers" }] } } } } }, { "x-traits": { headers: { externalDocs: D } } }),
    "components.x-traits.headers.externalDocs",
  ],
  ["a server reached through $ref", () => doc({ servers: { kafka: { $ref: "#/components/x-servers/kafka" } } }, { "x-servers": { kafka: server({ tags: [tag] }) } }), "components.x-servers.kafka.tags.0.externalDocs"],
  ["a tag reached through $ref", () => doc({ tags: [{ $ref: "#/components/x-tags/orders" }] }, { "x-tags": { orders: tag } }), "components.x-tags.orders.externalDocs"],
  ["a tag list reached through $ref", () => doc({ tags: { $ref: "#/components/x-tag-lists/orders" } }, { "x-tag-lists": { orders: [tag] } }), "components.x-tag-lists.orders.0.externalDocs"],
  ["an externalDocs reached through $ref", () => doc({ externalDocs: docsTarget("urlOnly") }), "components.x-docs.urlOnly"],
  ["a payload reached through $ref", () => publishMessage({ payload: { $ref: "#/components/x-schemas/order" } }), "components.x-schemas.order.externalDocs"],
  ["headers reached through $ref", () => publishMessage({ headers: { $ref: "#/components/x-schemas/order" } }), "components.x-schemas.order.externalDocs"],
  [
    "a property schema reached through a chained $ref",
    () => publishMessage({ payload: { type: "object", properties: { customer: { $ref: "#/components/x-schemas/customerAlias" } } } }),
    "components.x-schemas.customer.externalDocs",
  ],
  ["a parameter reached through $ref", () => doc({ channels: { "orders/{id}": { parameters: { id: { $ref: "#/components/x-parameters/id" } } } } }, { "x-parameters": { id: { schema: { externalDocs: D } } } }), "components.x-parameters.id.schema.externalDocs"],
].map(([label, build, path]) => [label, () => withSchemas(build()), path]);

function withSchemas(built) {
  built.components["x-schemas"] = {
    ...built.components["x-schemas"],
    order: { type: "object", externalDocs: D },
    customer: { type: "object", externalDocs: D },
    customerAlias: { $ref: "#/components/x-schemas/customer" },
  };
  return built;
}

const IGNORED = [
  ["info.externalDocs, an AsyncAPI 3.x location", () => doc({ info: { ...INFO, externalDocs: D } })],
  ["info.tags, an AsyncAPI 3.x location", () => doc({ info: { ...INFO, tags: [tag] } })],
  ["server externalDocs, an AsyncAPI 3.x location", () => doc({ servers: { kafka: server({ externalDocs: D }) } })],
  ["channel externalDocs, an AsyncAPI 3.x location", () => doc({ channels: { orders: { externalDocs: D, publish: { externalDocs: DOCS_MINIMAL } } } })],
  ["channel messages, an AsyncAPI 3.x location", () => doc({ channels: { orders: { messages: { orderPlaced: { externalDocs: D } } } } })],
  ["root operations, an AsyncAPI 3.x location", () => doc({ operations: { sendOrder: { action: "send", externalDocs: D } } })],
  ["components.externalDocs, an AsyncAPI 3.x location", () => doc({}, { externalDocs: { orders: D, nothing: null } })],
  ["components.tags, an AsyncAPI 3.x location", () => doc({}, { tags: { orders: tag } })],
  ["components.operations and components.replies, AsyncAPI 3.x locations", () => doc({}, { operations: { receiveOrder: { action: "receive", externalDocs: D } }, replies: { orderReply: { externalDocs: D } } })],
  ["externalDocs next to a oneOf", () => doc({ channels: { orders: { publish: { message: { oneOf: [{ name: "a" }], externalDocs: D } } } } })],
  ["the siblings of a message $ref", () => doc({ channels: { orders: { publish: { message: { $ref: "#/components/messages/clean", externalDocs: D } } } } }, { messages: { clean: { name: "clean" } } })],
  ["the siblings of a channel $ref", () => doc({ channels: { orders: { $ref: "#/components/channels/clean", publish: { externalDocs: D } } } }, { channels: { clean: {} } })],
  ["the siblings of an operation $ref", () => doc({ channels: { orders: { publish: { $ref: "#/components/x-operations/clean", externalDocs: D } } } }, { "x-operations": { clean: {} } })],
  ["the siblings of a schema $ref", () => publishMessage({ payload: { $ref: "#/components/x-schemas/clean", externalDocs: D } })],
  ["an external message", () => doc({ channels: { orders: { publish: { message: { $ref: "./messages.yaml#/orderPlaced", externalDocs: D } } } } })],
  ["an external schema", () => publishMessage({ payload: { $ref: "./schemas/order.json", externalDocs: D } })],
  ["a dangling message reference", () => doc({ channels: { orders: { publish: { message: { $ref: "#/components/messages/missing" } } } } })],
  ["a traits object instead of a list", () => doc({ channels: { orders: { publish: { traits: { externalDocs: D }, message: { traits: { externalDocs: D } } } } } })],
  ["an operation trait headers, which is not an operation trait field", () => publish({ traits: [{ headers: { type: "object", externalDocs: D } }] })],
  ["a parameter externalDocs, which is not a parameter field", () => doc({ channels: { "orders/{id}": { parameters: { id: { externalDocs: D, schema: { type: "string" } } } } } })],
  ["an unreferenced extension", () => doc({ "x-docs": D, "x-externalDocs": { externalDocs: D } }, { "x-drafts": { orders: { externalDocs: D } } })],
  [
    "message examples, correlation ids and bindings, binding schemas included",
    () =>
      publishMessage({
        examples: [{ payload: { externalDocs: D }, headers: { externalDocs: {} } }],
        correlationId: { location: "$message.header#/id", externalDocs: D },
        bindings: { kafka: { key: { type: "string", externalDocs: D }, bindingVersion: "0.4.0" }, http: { headers: { type: "object", externalDocs: D } } },
      }),
  ],
  [
    "server variables, server and channel bindings and security schemes",
    () =>
      doc(
        {
          servers: { kafka: server({ variables: { port: { default: "9093", externalDocs: D } }, bindings: { kafka: { schemaRegistryUrl: "https://registry.example.io", externalDocs: D } } }) },
          channels: { orders: { bindings: { ws: { query: { type: "object", externalDocs: D } } }, publish: { bindings: { kafka: { groupId: { type: "string", externalDocs: D } } } } } },
        },
        { securitySchemes: { oauth: { type: "oauth2", externalDocs: D } } }
      ),
  ],
  [
    "an Avro payload, with JSON Schema look-alike and nullable union fields",
    () =>
      publishMessage({
        schemaFormat: AVRO,
        payload: {
          type: "record",
          name: "Order",
          externalDocs: D,
          fields: [
            { name: "externalDocs", type: ["null", { type: "record", name: "Docs", fields: [{ name: "url", type: "string" }], externalDocs: {} }], default: null },
            { name: "items", type: { type: "array", items: { type: "record", name: "Line", fields: [], externalDocs: D } } },
          ],
          properties: { lines: { externalDocs: D } },
        },
      }),
  ],
  ["a components schema used as the payload of an Avro message", () => doc({}, { schemas: { OrderAvro: { type: "record", name: "Order", fields: [], externalDocs: D } }, messages: { orderPlaced: { schemaFormat: AVRO, payload: { $ref: "#/components/schemas/OrderAvro" } } } })],
  ["a 3.x multi-format payload, which is a plain schema in 2.x", () => publishMessage({ payload: { schemaFormat: ASYNCAPI, schema: { type: "object", externalDocs: D } } })],
];

describe("AAR079 (AsyncAPI 2.x): every External Documentation object must populate description and url", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic Kafka, AMQP, MQTT and WebSocket document whose externalDocs populate both fields", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports root, tag, server tag, operation, trait, message, oneOf, schema, parameter and components objects", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null, { major: 3 }]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("reports with the error severity and one finding per missing or empty field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("words each kind of finding exactly", async () => {
    const byKey = Object.fromEntries(only(await linter.run(failExample)).map((r) => [`${r.path.join(".")}|${r.message.includes("'url'") ? "url" : "other"}`, r.message]));
    expect(byKey["externalDocs|other"]).toBe("AAR079: The 'externalDocs' object must declare the mandatory field 'description'.");
    expect(byKey["tags.0.externalDocs.url|url"]).toBe("AAR079: The mandatory 'externalDocs' field 'url' must not be empty.");
    expect(byKey["tags.3.externalDocs|url"]).toBe("AAR079: The 'externalDocs' value must be an External Documentation object with the mandatory fields 'description' and 'url'.");
    expect(byKey[`${S}.subscribe.externalDocs|url`]).toBe(
      "AAR079: The 'externalDocs' reference '#/components/x-docs/missing' must resolve to an External Documentation object with the mandatory fields 'description' and 'url'."
    );
  });

  test("reports an object shared through $ref once, at its definition, following chains through tags, tag lists, messages, traits and schemas", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
    const results = only(await linter.run(failSharedRef));
    expect(results.filter((r) => r.path.join(".") === "components.x-docs.handbook")).toHaveLength(1);
    expect(results.filter((r) => r.path.join(".") === "components.schemas.BagTag.externalDocs")).toHaveLength(1);
  });

  describe("locations", () => {
    test.each(LOCATIONS)("checks %s", async (_, build, path) => {
      expect(findingsOf(await linter.run(build()))).toEqual(MISSING(path));
    });

    test.each(IGNORED)("ignores %s", async (_, build) => {
      expect(findingsOf(await linter.run(build()))).toEqual([]);
    });

    test("skips null, scalar, external, dangling and sibling nodes, every 3.x-only location and every non-JSON schema", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });
  });

  describe("schemas", () => {
    test.each(DOCS_SCHEMA_KEYWORD_CASES)("checks %s of a payload", async (_, build, path) => {
      expect(findingsOf(await linter.run(publishMessage({ payload: build(D) })))).toEqual(MISSING(`${P}.message.payload.${path}`));
    });

    test.each(DOCS_SCHEMA_KEYWORD_CASES)("checks %s of a components schema", async (_, build, path) => {
      expect(findingsOf(await linter.run(doc({}, { schemas: { Order: build(D) } })))).toEqual(MISSING(`components.schemas.Order.${path}`));
    });

    test.each(DOCS_SCHEMA_KEYWORD_CASES)("checks %s of a headers schema and a parameter schema", async (_, build, path) => {
      expect(findingsOf(await linter.run(publishMessage({ headers: build(D) })))).toEqual(MISSING(`${P}.message.headers.${path}`));
      const built = doc({ channels: { "orders/{id}": { parameters: { id: { schema: build(D) } } } } });
      expect(findingsOf(await linter.run(built))).toEqual(MISSING(`channels.orders/{id}.parameters.id.schema.${path}`));
    });

    test.each(DOCS_SCHEMA_IGNORED_CASES)("ignores %s", async (_, payload) => {
      expect(findingsOf(await linter.run(publishMessage({ payload })))).toEqual([]);
    });

    test.each(DOCS_SCHEMA_FORMAT_CASES)("a payload with %s is walked: %s", async (_, schemaFormat, walked) => {
      const built = publishMessage({ ...(schemaFormat === undefined ? {} : { schemaFormat }), payload: { type: "object", properties: { id: { type: "string", externalDocs: D } } } });
      expect(findingsOf(await linter.run(built))).toEqual(walked ? MISSING(`${P}.message.payload.properties.id.externalDocs`) : []);
    });

    test.each(DOCS_SCHEMA_FORMAT_CASES)("the headers of a message with %s are always an AsyncAPI schema", async (_, schemaFormat) => {
      const built = publishMessage({ ...(schemaFormat === undefined ? {} : { schemaFormat }), headers: { type: "object", externalDocs: D } });
      expect(findingsOf(await linter.run(built))).toEqual(MISSING(`${P}.message.headers.externalDocs`));
    });

    test("a schemaFormat set by a trait overrides the message one, and the last trait wins", async () => {
      const payload = { type: "object", externalDocs: D };
      const path = MISSING(`${P}.message.payload.externalDocs`);
      expect(findingsOf(await linter.run(publishMessage({ schemaFormat: AVRO, traits: [{ schemaFormat: ASYNCAPI }], payload })))).toEqual(path);
      expect(findingsOf(await linter.run(publishMessage({ schemaFormat: ASYNCAPI, traits: [{ schemaFormat: AVRO }], payload })))).toEqual([]);
      const built = publishMessage({ traits: [{ schemaFormat: AVRO }, { $ref: "#/components/x-traits/json" }], payload });
      built.components["x-traits"] = { json: { schemaFormat: ASYNCAPI } };
      expect(findingsOf(await linter.run(built))).toEqual(path);
    });

    test("a schema shared by several payloads, headers and properties is reported once, at its definition", async () => {
      const ref = { $ref: "#/components/x-schemas/order" };
      const built = doc({
        channels: {
          orders: {
            publish: { message: { payload: ref, headers: ref } },
            subscribe: { message: { payload: { type: "object", properties: { a: ref, b: { type: "array", items: ref } } } } },
          },
        },
      });
      expect(findingsOf(await linter.run(withSchemas(built)))).toEqual(MISSING("components.x-schemas.order.externalDocs"));
    });

    test("a recursive schema is walked once and its externalDocs reported once", async () => {
      const node = { type: "object", externalDocs: D, properties: { parent: { $ref: "#/components/schemas/Node" }, children: { type: "array", items: { $ref: "#/components/schemas/Node" } } } };
      expect(findingsOf(await linter.run(doc({}, { schemas: { Node: node } })))).toEqual(MISSING("components.schemas.Node.externalDocs"));
    });

    test("walks inline subschemas up to 100 levels deep, which also stops a self-recursive YAML anchor", async () => {
      const nested = (levels) => {
        let schema = { type: "object", externalDocs: D };
        for (let level = levels; level >= 1; level--) schema = { type: "object", properties: { [`l${level}`]: schema } };
        return schema;
      };
      const deepPath = (levels) => `${P}.message.payload.${Array.from({ length: levels }, (_, i) => `properties.l${i + 1}`).join(".")}.externalDocs`;
      expect(findingsOf(await linter.run(publishMessage({ payload: nested(100) })))).toEqual(MISSING(deepPath(100)));
      expect(findingsOf(await linter.run(publishMessage({ payload: nested(101) })))).toEqual([]);
      const text = [
        "asyncapi: 2.6.0",
        "info: { title: Recursive Schemas, version: '1.0.0' }",
        "channels:",
        "  orders:",
        "    publish:",
        "      message:",
        "        payload: &node",
        "          type: object",
        "          externalDocs: { url: 'https://docs.example.io/node' }",
        "          properties:",
        "            child: *node",
      ].join("\n");
      const results = only(await linter.run(new Document(text, Parsers.Yaml, "recursive.yaml")));
      expect(results.map((r) => [r.path.join("."), r.message, r.range.start.line + 1]).sort(byPath)).toEqual([
        [`${P}.message.payload.externalDocs`, MSG.missing("description"), 9],
        [`${P}.message.payload.properties.child`, MSG.missing("description"), 11],
      ]);
    });

    test("a long chain of referenced schemas is followed to the end", async () => {
      const schemas = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`S${i}`, { type: "object", properties: { next: { $ref: `#/components/schemas/S${i + 1}` } } }]));
      schemas.S300 = { type: "object", externalDocs: D };
      const built = publishMessage({ payload: { $ref: "#/components/schemas/S0" } });
      built.components.schemas = schemas;
      expect(findingsOf(await linter.run(built))).toEqual(MISSING("components.schemas.S300.externalDocs"));
    });
  });

  describe("field values", () => {
    const FIELD_CASES = DOCS_VALUE_CASES.flatMap(([label, value, populated]) => DOCS_FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`externalDocs.${field}`, MSG.empty(field)]];
      expect(findingsOf(await linter.run(doc({ externalDocs: { ...DOCS_MINIMAL, [field]: value } })))).toEqual(expected);
    });

    test.each(DOCS_VALUE_CASES)("description and url both set to %s", async (_, value, populated) => {
      const expected = populated ? [] : docsFindings("externalDocs", DOCS_FIELDS.map((field) => [field, "empty", field]));
      expect(findingsOf(await linter.run(doc({ externalDocs: { description: value, url: value } })))).toEqual(expected);
    });

    test.each(DOCS_VALUE_CASES)("look-alike keys and extensions set to %s are never required", async (_, value) => {
      expect(findingsOf(await linter.run(doc({ externalDocs: { ...DOCS_MINIMAL, title: value, href: value, "x-owner": value } })))).toEqual([]);
    });

    test.each([[["description"]], [["url"]], [["description", "url"]]])("reports %j missing at the object", async (fields) => {
      const docs = Object.fromEntries(Object.entries(DOCS_MINIMAL).filter(([key]) => !fields.includes(key)));
      expect(findingsOf(await linter.run(doc({ externalDocs: docs })))).toEqual(docsFindings("externalDocs", fields.map((field) => ["", "missing", field])));
    });
  });

  describe("externalDocs values", () => {
    test.each(DOCS_OBJECT_CASES)("%s as the root externalDocs", async (_, value, expected) => {
      expect(findingsOf(await linter.run(doc({ externalDocs: value })))).toEqual(docsFindings("externalDocs", expected));
    });

    test.each(DOCS_OBJECT_CASES)("%s in a components message", async (_, value, expected) => {
      const path = "components.messages.orderPlaced.externalDocs";
      expect(findingsOf(await linter.run(doc({}, { messages: { orderPlaced: { name: "orderPlaced", externalDocs: value } } })))).toEqual(docsFindings(path, expected));
    });

    test.each(DOCS_OBJECT_CASES)("%s in a payload property", async (_, value, expected) => {
      const path = `${P}.message.payload.properties.id.externalDocs`;
      expect(findingsOf(await linter.run(publishMessage({ payload: { type: "object", properties: { id: { type: "string", externalDocs: value } } } })))).toEqual(docsFindings(path, expected));
    });
  });

  describe("trait merging", () => {
    test("checks each object where it is written: a trait object that a merge would complete is still reported, and so is the message object", async () => {
      const built = publishMessage({ externalDocs: D, traits: [{ externalDocs: { description: "From the trait." } }] });
      expect(findingsOf(await linter.run(built))).toEqual(
        docsFindings("", [
          [`${P}.message.externalDocs`, "missing", "description"],
          [`${P}.message.traits.0.externalDocs`, "missing", "url"],
        ])
      );
    });

    test("a complete trait object never completes the message object, and a complete message object never completes the trait one", async () => {
      expect(findingsOf(await linter.run(publishMessage({ externalDocs: D, traits: [{ externalDocs: DOCS_MINIMAL }] })))).toEqual(MISSING(`${P}.message.externalDocs`));
      expect(findingsOf(await linter.run(publishMessage({ externalDocs: DOCS_MINIMAL, traits: [{ externalDocs: D }] })))).toEqual(MISSING(`${P}.message.traits.0.externalDocs`));
      expect(findingsOf(await linter.run(publish({ externalDocs: D, traits: [{ externalDocs: DOCS_MINIMAL }] })))).toEqual(MISSING(`${P}.externalDocs`));
    });

    test("an operation trait shared by many operations is reported once, at the trait", async () => {
      const channels = Object.fromEntries(
        Array.from({ length: 6 }, (_, i) => [`orders.v${i}`, { publish: { traits: [{ $ref: "#/components/operationTraits/producer" }] }, subscribe: { traits: [{ $ref: "#/components/operationTraits/producer" }] } }])
      );
      expect(findingsOf(await linter.run(doc({ channels }, { operationTraits: { producer: { externalDocs: D } } })))).toEqual(MISSING("components.operationTraits.producer.externalDocs"));
    });

    test("an externalDocs referenced from the root, tags, operations, messages and schemas is reported once", async () => {
      const ref = docsTarget("urlOnly");
      const built = doc({
        externalDocs: ref,
        tags: [{ name: "orders", externalDocs: ref }],
        channels: { orders: { publish: { externalDocs: ref, traits: [{ externalDocs: ref }], message: { externalDocs: ref, payload: { type: "object", externalDocs: ref } } } } },
      });
      expect(findingsOf(await linter.run(built))).toEqual(MISSING("components.x-docs.urlOnly"));
    });
  });

  describe("functionOptions", () => {
    test.each(DOCS_IGNORED_OPTIONS)("injecting %s changes nothing: description and url stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(doc({ externalDocs: { ...DOCS_MINIMAL, title: "", "x-owner": "" } })))).toEqual([]);
      expect(findingsOf(await custom.run(doc({ externalDocs: { title: "Orders", "x-owner": "docs-team" } })))).toEqual(docsFindings("externalDocs", DOCS_FIELDS.map((field) => ["", "missing", field])));
    });
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("follows a components object given as a $ref, and ignores one that points to the document itself", async () => {
    const built = { asyncapi: "2.6.0", info: INFO, channels: {}, components: { $ref: "#/x-components" }, "x-components": { messages: { orderPlaced: { externalDocs: D } } } };
    expect(findingsOf(await linter.run(built))).toEqual(MISSING("x-components.messages.orderPlaced.externalDocs"));
    expect(findingsOf(await linter.run({ ...built, components: { $ref: "#" } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", externalDocs: {} }]))).toEqual([]);
  });

  test("handles a very large document with thousands of externalDocs and reports exactly the generated violations", async () => {
    const { document, expected, places } = failLargeGenerated;
    expect(places).toBeGreaterThan(4000);
    expect(findingsOf(await linter.run(document))).toEqual(docsFindings("", expected));
  });
});
