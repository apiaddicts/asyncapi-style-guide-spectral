const { linterForRule } = require("../../helpers/utils");
const { CASING_TYPES, CASING_VALUES, isValidCasing } = require("../../helpers/casing");
const {
  PROPERTY_KEYWORD_CASES,
  NON_STRING_AVRO_NAMES,
  PROPERTY_FORMAT_CASES,
  PROPERTY_FORMAT_PAYLOADS,
  PROPERTY_FORMAT_FINDINGS,
  AVRO_TEXT_SCHEMA,
  HEADER_SCHEMA,
} = require("../../helpers/rules/aar074-properties-object-format");
const okExample = require("./AAR074/ok-example");
const failExample = require("./AAR074/fail-example");
const failSharedRef = require("./AAR074/fail-shared-ref");
const okStructuralEdges = require("./AAR074/ok-structural-edges");
const failLargeGenerated = require("./AAR074/fail-large-generated");

const RULE = "asa:AAR074";
const O = "channels.orderSubmissions.messages.orderSubmitted";
const E = "channels.executionReports.messages.executionReported";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Property Name Locations", version: "1.0.0" }, ...extra });
const prefixed = (prefix, relatives) => relatives.map((relative) => `${prefix}.${relative}`).sort();
const channel = (messages) => ({ address: "orders.v1", messages });

const BAD = { type: "object", properties: { orderId: { type: "string" }, order_id: { type: "string" } } };
const BAD_AT = (prefix) => `${prefix}.properties.order_id`;
const multiFormat = (schemaFormat, schema) => ({ schemaFormat, schema });

const FAIL_EXAMPLE_PATHS = [
  `${O}.payload.properties.client_order_id`,
  `${O}.payload.properties.legs.items.properties.Side`,
  `${E}.payload.schema.fields.1.name`,
  `${E}.payload.schema.fields.2.type.1.fields.0.name`,
  "channels.marketData.messages.quoteSnapshot.payload.schema.properties.ask_price",
  "components.schemas.Price.properties.Currency",
  "components.schemas.LimitBreach.schema.properties.breach_pct",
  "components.schemas.Instrument.schema.fields.1.name",
  "components.channels.settlementInstructions.messages.settlementInstructed.payload.properties.ssi_ref",
  "components.messages.orderAmended.payload.properties.new_quantity",
].sort();

const SHARED_REF_PATHS = [
  "components.schemas.Money.properties.currency_code",
  "components.schemas.Party.properties.postal_address",
  "components.schemas.Party.properties.postal_address.properties.Line1",
  "components.schemas.Node.properties.next_node",
  "components.x-avro.LedgerEntry.fields.0.name",
  "components.x-schemas.fx/rates.properties.rate~table.properties.base_currency",
  "components.x-schemas.fx quote.properties.Bid",
  "components.x-messages.statementIssued.payload.properties.Closing_Balance",
  "components.x-messages.ackOnly.payload.properties.ack_code",
  "components.x-messages.auditOnly.payload.properties.audit_ref",
  "components.channels.paymentsMirror.messages.mirrorOnly.payload.properties.mirror_lag_ms",
].sort();

const LOCATIONS = [
  ["channel message payload", "channels.orders.messages.orderPlaced.payload", { channels: { orders: channel({ orderPlaced: { payload: BAD } }) } }],
  ["message of a channel with a null address", "channels.live.messages.frame.payload", { channels: { live: { address: null, messages: { frame: { payload: BAD } } } } }],
  ["multi-format payload", "channels.orders.messages.orderPlaced.payload.schema", { channels: { orders: channel({ orderPlaced: { payload: multiFormat("application/schema+json;version=draft-07", BAD) } }) } }],
  ["components.channels message payload", "components.channels.audit.messages.auditRecorded.payload", { components: { channels: { audit: channel({ auditRecorded: { payload: BAD } }) } } }],
  ["components.messages payload", "components.messages.orderPlaced.payload", { components: { messages: { orderPlaced: { payload: BAD } } } }],
  ["components.schemas", "components.schemas.Order", { components: { schemas: { Order: BAD } } }],
  ["multi-format components.schemas entry", "components.schemas.Order.schema", { components: { schemas: { Order: multiFormat("application/vnd.oai.openapi;version=3.0.0", BAD) } } }],
  ["referenced components.schemas entry", "components.x-schemas.Order", { components: { schemas: { Order: { $ref: "#/components/x-schemas/Order" } }, "x-schemas": { Order: BAD } } }],
  ["payload referenced to a multi-format component", "components.schemas.Order.schema", { channels: { orders: channel({ orderPlaced: { payload: { $ref: "#/components/schemas/Order" } } }) }, components: { schemas: { Order: multiFormat("application/schema+json;version=draft-07", BAD) } } }],
  ["payload referenced to a multi-format extension", "components.x-schemas.Order.schema", { channels: { orders: channel({ orderPlaced: { payload: { $ref: "#/components/x-schemas/Order" } } }) }, components: { "x-schemas": { Order: multiFormat("application/schema+json;version=draft-07", BAD) } } }],
  ["multi-format schema behind a reference", "components.x-schemas.Order", { channels: { orders: channel({ orderPlaced: { payload: multiFormat("application/schema+json;version=draft-07", { $ref: "#/components/x-schemas/Order" }) } }) }, components: { "x-schemas": { Order: BAD } } }],
  ["channel message referenced from an extension", "components.x-messages.orderPlaced.payload", { channels: { orders: channel({ orderPlaced: { $ref: "#/components/x-messages/orderPlaced" } }) }, components: { "x-messages": { orderPlaced: { payload: BAD } } } }],
  ["channel referenced from components.channels", "components.channels.orders.messages.orderPlaced.payload", { channels: { orders: { $ref: "#/components/channels/orders" } }, components: { channels: { orders: channel({ orderPlaced: { payload: BAD } }) } } }],
  ["channel referenced from an extension", "components.x-channels.orders.messages.orderPlaced.payload", { channels: { orders: { $ref: "#/components/x-channels/orders" } }, components: { "x-channels": { orders: channel({ orderPlaced: { payload: BAD } }) } } }],
  ["operation message referenced from an extension", "components.x-messages.orderPlaced.payload", { operations: { send: { action: "send", messages: [{ $ref: "#/components/x-messages/orderPlaced" }] } }, components: { "x-messages": { orderPlaced: { payload: BAD } } } }],
  ["reply message referenced from an extension", "components.x-messages.orderAck.payload", { operations: { send: { action: "send", reply: { messages: [{ $ref: "#/components/x-messages/orderAck" }] } } }, components: { "x-messages": { orderAck: { payload: BAD } } } }],
  ["reply referenced from components.replies", "components.x-messages.orderAck.payload", { operations: { send: { action: "send", reply: { $ref: "#/components/replies/ack" } } }, components: { replies: { ack: { messages: [{ $ref: "#/components/x-messages/orderAck" }] } }, "x-messages": { orderAck: { payload: BAD } } } }],
  ["components.replies message", "components.x-messages.orderAck.payload", { components: { replies: { ack: { messages: [{ $ref: "#/components/x-messages/orderAck" }] } }, "x-messages": { orderAck: { payload: BAD } } } }],
  ["components.operations message", "components.x-messages.orderPlaced.payload", { components: { operations: { send: { action: "send", messages: [{ $ref: "#/components/x-messages/orderPlaced" }] } }, "x-messages": { orderPlaced: { payload: BAD } } } }],
  ["operation referenced from components.operations", "components.x-messages.orderPlaced.payload", { operations: { send: { $ref: "#/components/x-operations/send" } }, components: { "x-operations": { send: { action: "send", messages: [{ $ref: "#/components/x-messages/orderPlaced" }] } }, "x-messages": { orderPlaced: { payload: BAD } } } }],
  ["channel and message whose keys start with x-", "channels.x-legacy.messages.x-orderPlaced.payload", { channels: { "x-legacy": channel({ "x-orderPlaced": { payload: BAD } }) } }],
  ["payload of a message with a leftover 2.x schemaFormat", "channels.orders.messages.orderPlaced.payload", { channels: { orders: channel({ orderPlaced: { schemaFormat: "application/raml+yaml;version=1.0", payload: BAD } }) } }],
];

const IGNORED = [
  ["server bindings", { servers: { kafka: { host: "kafka:9092", protocol: "kafka", bindings: { kafka: { schemaRegistryUrl: "https://registry", x_schema: BAD } } } } }],
  ["channel bindings", { channels: { live: { address: "live", bindings: { ws: { query: BAD, headers: BAD } } } } }],
  ["operation bindings", { operations: { send: { action: "send", bindings: { http: { method: "POST", query: BAD }, kafka: { groupId: BAD, clientId: BAD } } } } }],
  ["message bindings", { channels: { orders: channel({ orderPlaced: { bindings: { kafka: { key: BAD }, http: { headers: BAD }, anypointmq: { headers: BAD } } } }) } }],
  ["message trait bindings", { components: { messageTraits: { kafka: { bindings: { kafka: { key: BAD } } } } } }],
  ["operation traits", { components: { operationTraits: { producer: { bindings: { kafka: { clientId: BAD } } } } } }],
  ["message examples", { channels: { orders: channel({ orderPlaced: { payload: { type: "object" }, examples: [{ payload: { order_id: "1", properties: { Bad: 1 } }, headers: { trace_id: "1" } }] } }) } }],
  ["message correlationId", { components: { correlationIds: { order: { location: "$message.header#/correlation_id", properties: { order_id: {} } } } } }],
  ["message extensions", { channels: { orders: channel({ orderPlaced: { "x-payload": BAD, "x-headers": BAD } }) } }],
  ["unreferenced extension schemas", { components: { "x-schemas": { Order: BAD } }, "x-schemas": { Order: BAD } }],
  ["parameters, which have no schema in 3.x", { channels: { orders: { address: "orders.{orderId}", parameters: { orderId: { schema: BAD } } } }, components: { parameters: { orderId: { schema: BAD } } } }],
  ["2.x publish and subscribe operations", { channels: { orders: { address: "orders", publish: { message: { payload: BAD } }, subscribe: { message: { headers: BAD } } } } }],
  ["2.x message oneOf", { channels: { orders: channel({ variants: { oneOf: [{ payload: BAD }, { headers: BAD }] } }) } }],
  ["a RAML multi-format payload", { channels: { orders: channel({ orderPlaced: { payload: multiFormat("application/raml+yaml;version=1.0", { type: "object", properties: { order_id: "string", "line_no?": "integer" } }) } }) } }],
  ["a Protobuf multi-format payload", { channels: { orders: channel({ orderPlaced: { payload: multiFormat("application/vnd.google.protobuf;version=3", "message Order { string order_id = 1; }") } }) } }],
  ["a referenced schema behind an unknown multi-format", { channels: { orders: channel({ orderPlaced: { payload: multiFormat("application/x-custom", { $ref: "#/components/x-schemas/Order" }) } }) }, components: { "x-schemas": { Order: BAD } } }],
  ["a multi-format object without schema", { channels: { orders: channel({ orderPlaced: { payload: { schemaFormat: "application/schema+json;version=draft-07", properties: { order_id: {} } } } }) } }],
];

const H = HEADER_SCHEMA;
const JSON_SCHEMA = "application/schema+json;version=draft-07";
const ASYNCAPI_SCHEMA = "application/vnd.aai.asyncapi+json;version=3.0.0";

const HEADER_LOCATIONS = [
  ["channel message headers", { channels: { orders: channel({ orderPlaced: { headers: H, payload: { type: "object" } } }) } }],
  ["multi-format headers", { channels: { orders: channel({ orderPlaced: { headers: multiFormat(ASYNCAPI_SCHEMA, H) } }) } }],
  ["multi-format headers under every schema format", { channels: { orders: channel(Object.fromEntries(PROPERTY_FORMAT_CASES.map(([schemaFormat], index) => [`m${index}`, { headers: multiFormat(schemaFormat, H) }]))) } }],
  ["inline trait headers", { channels: { orders: channel({ orderPlaced: { traits: [{ headers: H }] } }) } }],
  ["tuple trait headers", { channels: { orders: channel({ orderPlaced: { traits: [[{ headers: H }, {}]] } }) } }],
  ["multi-format trait headers", { channels: { orders: channel({ orderPlaced: { traits: [{ headers: multiFormat("application/schema+yaml;version=draft-07", H) }] } }) } }],
  ["referenced trait headers", { channels: { orders: channel({ orderPlaced: { traits: [{ $ref: "#/components/x-traits/cloudEvents" }] } }) }, components: { "x-traits": { cloudEvents: { headers: H } } } }],
  ["trait headers of a traits list behind a reference", { channels: { orders: channel({ orderPlaced: { traits: { $ref: "#/components/x-trait-lists/common" } } }) }, components: { "x-trait-lists": { common: [{ headers: H }] } } }],
  ["headers behind a reference to an extension", { channels: { orders: channel({ orderPlaced: { headers: { $ref: "#/components/x-headers/cloudEvents" } } }) }, components: { "x-headers": { cloudEvents: H } } }],
  ["headers behind a reference to a multi-format extension", { channels: { orders: channel({ orderPlaced: { headers: { $ref: "#/components/x-headers/cloudEvents" } } }) }, components: { "x-headers": { cloudEvents: multiFormat(JSON_SCHEMA, H) } } }],
  ["multi-format headers whose schema is a reference to an extension", { channels: { orders: channel({ orderPlaced: { headers: multiFormat(JSON_SCHEMA, { $ref: "#/components/x-headers/cloudEvents" }) } }) }, components: { "x-headers": { cloudEvents: H } } }],
  ["headers behind a chained reference", { channels: { orders: channel({ orderPlaced: { headers: { $ref: "#/components/x-headers/alias" } } }) }, components: { "x-headers": { alias: { $ref: "#/components/x-headers/cloudEvents" }, cloudEvents: H } } }],
  ["components.messages headers", { components: { messages: { orderPlaced: { headers: H } } } }],
  ["components.channels message headers", { components: { channels: { audit: channel({ auditRecorded: { headers: multiFormat(JSON_SCHEMA, H) } }) } } }],
  ["components.messageTraits headers", { components: { messageTraits: { cloudEvents: { headers: H } } } }],
  ["referenced components.messageTraits entry", { components: { messageTraits: { cloudEvents: { $ref: "#/components/x-traits/cloudEvents" } }, "x-traits": { cloudEvents: { headers: multiFormat(ASYNCAPI_SCHEMA, H) } } } }],
  ["headers of a channel message referenced from an extension", { channels: { orders: channel({ orderPlaced: { $ref: "#/components/x-messages/orderPlaced" } }) }, components: { "x-messages": { orderPlaced: { headers: H } } } }],
  ["headers of a channel referenced from an extension", { channels: { orders: { $ref: "#/components/x-channels/orders" } }, components: { "x-channels": { orders: channel({ orderPlaced: { headers: H } }) } } }],
  ["headers of an operation message", { operations: { send: { action: "send", messages: [{ $ref: "#/components/x-messages/orderPlaced" }] } }, components: { "x-messages": { orderPlaced: { headers: H } } } }],
  ["headers of a reply message", { operations: { send: { action: "send", reply: { messages: [{ $ref: "#/components/x-messages/orderAck" }] } } }, components: { "x-messages": { orderAck: { headers: H } } } }],
  ["headers of a components.replies message", { components: { replies: { ack: { messages: [{ $ref: "#/components/x-messages/orderAck" }] } }, "x-messages": { orderAck: { headers: H } } } }],
  ["headers of a components.operations message", { components: { operations: { send: { action: "send", messages: [{ $ref: "#/components/x-messages/orderPlaced" }] } }, "x-messages": { orderPlaced: { headers: H } } } }],
];

describe("AAR074 (AsyncAPI 3.x): property names of message schemas must follow the configured naming-convention", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("default naming-convention (camelCase)", () => {
    test("passes a multi-protocol document whose payload, header, trait, component and multi-format properties and Avro fields are camelCase", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every property and Avro field that is not camelCase in channels, multi-format payloads and components, never in headers", async () => {
      expect(pathsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test("treats any version from 3 onward as 3.x", async () => {
      for (const version of [3, "3", "3.1", " 3.1.0 ", "3.2.0", "4.0.0"]) {
        expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test("reports the exact message, severity and path of each finding", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r]));
      expect(byPath[`${O}.payload.properties.client_order_id`].message).toBe("AAR074: Property name 'client_order_id' must be camelCase.");
      expect(byPath["components.schemas.LimitBreach.schema.properties.breach_pct"].message).toBe("AAR074: Property name 'breach_pct' must be camelCase.");
      expect(byPath[`${E}.payload.schema.fields.2.type.1.fields.0.name`].message).toBe("AAR074: Avro field name 'MIC' must be camelCase.");
      results.forEach((r) => expect(r.severity).toBe(1));
    });

    test.each(PROPERTY_KEYWORD_CASES)("walks %s", async (_name, schema, relatives) => {
      const doc = base({
        channels: { orders: channel({ orderPlaced: { payload: schema, headers: multiFormat("application/schema+json;version=draft-07", schema) } }) },
        components: { schemas: { Probe: schema } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        [...prefixed("channels.orders.messages.orderPlaced.payload", relatives), ...prefixed("components.schemas.Probe", relatives)].sort()
      );
    });

    test.each(NON_STRING_AVRO_NAMES)("reports the Avro field name %p", async (name, message) => {
      const schema = { type: "record", name: "Probe", fields: [{ name: "orderId", type: "string" }, { name, type: "string" }] };
      const doc = base({ components: { schemas: { Probe: multiFormat("application/vnd.apache.avro;version=1.9.0", schema) } } });
      const results = only(await linter.run(doc));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.schemas.Probe.schema.fields.1.name", `AAR074: ${message}`]]);
    });

    test.each(PROPERTY_FORMAT_CASES.filter(([schemaFormat]) => schemaFormat !== undefined))("reads a multi-format payload and component, never headers, whose schemaFormat is %p", async (schemaFormat, kind) => {
      const schema = PROPERTY_FORMAT_PAYLOADS[kind || "json"];
      const doc = base({
        channels: { orders: channel({ orderPlaced: { payload: multiFormat(schemaFormat, schema), headers: multiFormat(schemaFormat, schema) } }) },
        components: { schemas: { Probe: multiFormat(schemaFormat, schema) } },
      });
      const expected =
        kind === null
          ? []
          : [
              ...prefixed("channels.orders.messages.orderPlaced.payload.schema", PROPERTY_FORMAT_FINDINGS[kind]),
              ...prefixed("components.schemas.Probe.schema", PROPERTY_FORMAT_FINDINGS[kind]),
            ].sort();
      expect(pathsOf(await linter.run(doc))).toEqual(expected);
    });

    test("an object with a schema but no schemaFormat is a plain Schema Object, whose schema key is not a keyword", async () => {
      const doc = base({ channels: { orders: channel({ orderPlaced: { payload: { schema: BAD }, headers: { schema: BAD } } }) }, components: { schemas: { Probe: { schema: BAD } } } });
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("an Avro record is recognized by its shape without a multi-format object, and JSON Schema properties under an Avro schemaFormat are still checked", async () => {
      const doc = base({
        channels: {
          orders: channel({
            avroShaped: { payload: PROPERTY_FORMAT_PAYLOADS.avro },
            jsonUnderAvro: { payload: multiFormat("application/vnd.apache.avro;version=1.9.0", BAD) },
          }),
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["channels.orders.messages.avroShaped.payload.fields.1.name", BAD_AT("channels.orders.messages.jsonUnderAvro.payload.schema")].sort());
    });

    test("an Avro schema written as JSON text is parsed and reported at the schema, only under an Avro schemaFormat", async () => {
      const avro = "application/vnd.apache.avro;version=1.9.0";
      const doc = base({
        channels: {
          orders: channel({
            avroText: { payload: multiFormat(avro, AVRO_TEXT_SCHEMA) },
            jsonText: { payload: multiFormat("application/schema+json;version=draft-07", JSON.stringify(BAD)) },
            brokenText: { payload: multiFormat(avro, '{"type":"record","fields":[{"name":"order_id"') },
            plainText: { payload: multiFormat(avro, "com.acme.Order_Placed") },
          }),
        },
      });
      const results = only(await linter.run(doc));
      expect(results.map((r) => [r.path.join("."), r.message]).sort()).toEqual([
        ["channels.orders.messages.avroText.payload.schema", "AAR074: Avro field name 'Line_Count' must be camelCase."],
        ["channels.orders.messages.avroText.payload.schema", "AAR074: Avro field name 'order_id' must be camelCase."],
      ]);
    });

    test("message traits never change how the payload is read in 3.x", async () => {
      const doc = base({
        channels: { orders: channel({ orderPlaced: { traits: [{ schemaFormat: "application/raml+yaml;version=1.0" }], payload: BAD } }) },
      });
      expect(pathsOf(await linter.run(doc))).toEqual([BAD_AT("channels.orders.messages.orderPlaced.payload")]);
    });

    test.each(LOCATIONS)("checks the %s", async (_name, prefix, extra) => {
      expect(pathsOf(await linter.run(base(extra)))).toEqual([BAD_AT(prefix)]);
    });

    test.each(IGNORED)("ignores %s", async (_name, extra) => {
      expect(pathsOf(await linter.run(base(extra)))).toEqual([]);
    });

    test("reports a shared schema, channel, message or reply once at its definition, follows chained, escaped and encoded references, and skips cyclic, dangling, external and non-local ones", async () => {
      expect(pathsOf(await linter.run(failSharedRef))).toEqual(SHARED_REF_PATHS);
    });

    test("only the referenced subschema is checked when a reference points inside another schema", async () => {
      const doc = base({
        channels: { orders: channel({ orderPlaced: { payload: { $ref: "#/components/x-library/Order/properties/line_items" } } }) },
        components: { "x-library": { Order: { type: "object", properties: { order_id: {}, line_items: { type: "array", items: { properties: { Sku: {} } } } } } } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["components.x-library.Order.properties.line_items.items.properties.Sku"]);
    });

    test("ignores the siblings of a $ref, as the Reference Object specifies", async () => {
      const doc = base({ components: { schemas: { Order: { $ref: "#/components/schemas/Base", properties: { order_id: {} } }, Base: { properties: { baseId: {} } } } } });
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("skips null, scalar, array and $ref nodes, unusable multi-format objects, traits, operations and replies, and 2.x-only structures", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("tolerates channels, operations, components and their maps of unexpected types", async () => {
      for (const extra of [{ channels: null }, { channels: [] }, { operations: "send" }, { operations: [] }, { components: null }, { components: { schemas: [BAD], messages: [{ payload: BAD }], replies: "x", operations: 1, messageTraits: true } }]) {
        expect(pathsOf(await linter.run(base(extra)))).toEqual([]);
      }
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...doc } = failExample;
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
      expect(pathsOf(await linter.run(withVersion(failLargeGenerated.document, "3.1.0")))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("message headers", () => {
    test.each(HEADER_LOCATIONS)("never checks the %s", async (_name, extra) => {
      expect(pathsOf(await linter.run(base(extra)))).toEqual([]);
      expect(pathsOf(await linter.run(withVersion(base(extra), "3.1.0")))).toEqual([]);
    });

    test("a components.schemas entry used only as headers is not checked as a component, also behind chained references, multi-format objects, traits, operations and replies", async () => {
      const doc = base({
        channels: {
          orders: channel({
            orderPlaced: {
              headers: { $ref: "#/components/schemas/CloudEventHeaders" },
              traits: [{ $ref: "#/components/messageTraits/tracing" }, { headers: multiFormat(JSON_SCHEMA, { $ref: "#/components/schemas/RetryHeaders" }) }],
              payload: BAD,
            },
            orderShipped: { headers: { $ref: "#/components/schemas/HeadersAlias" }, traits: { $ref: "#/components/x-trait-lists/common" } },
          }),
          refunds: { $ref: "#/components/x-channels/refunds" },
        },
        operations: { ack: { action: "send", reply: { $ref: "#/components/replies/ack" } } },
        components: {
          schemas: {
            CloudEventHeaders: H,
            RetryHeaders: { type: "object", properties: { retry_count: { type: "integer" } } },
            TraceHeaders: multiFormat(ASYNCAPI_SCHEMA, { type: "object", properties: { trace_state: { type: "string" } } }),
            HeadersAlias: { $ref: "#/components/schemas/KafkaHeaders" },
            KafkaHeaders: { type: "object", properties: { kafka_offset: { type: "integer" } } },
            ListHeaders: { type: "object", properties: { list_id: { type: "string" } } },
            WrappedHeaders: multiFormat(JSON_SCHEMA, { $ref: "#/components/schemas/InnerHeaders" }),
            InnerHeaders: { type: "object", properties: { inner_id: { type: "string" } } },
            RefundHeaders: { type: "object", properties: { refund_reason: { type: "string" } } },
            AckHeaders: { type: "object", properties: { ack_code: { type: "string" } } },
            Order: BAD,
          },
          messageTraits: { tracing: { headers: { $ref: "#/components/schemas/TraceHeaders" } } },
          messages: { orderAudited: { headers: { $ref: "#/components/schemas/WrappedHeaders" } } },
          replies: { ack: { messages: [{ $ref: "#/components/x-messages/acknowledged" }] } },
          "x-trait-lists": { common: [{ headers: { $ref: "#/components/schemas/ListHeaders" } }] },
          "x-channels": { refunds: channel({ refundIssued: { $ref: "#/components/x-messages/refundIssued" } }) },
          "x-messages": { refundIssued: { headers: { $ref: "#/components/schemas/RefundHeaders" } }, acknowledged: { headers: { $ref: "#/components/schemas/AckHeaders" } } },
        },
      });
      const expected = [BAD_AT("channels.orders.messages.orderPlaced.payload"), BAD_AT("components.schemas.Order")].sort();
      expect(pathsOf(await linter.run(doc))).toEqual(expected);
      expect(pathsOf(await linter.run(withVersion(doc, "3.1.0")))).toEqual(expected);
    });

    test("a schema used as headers and also as a payload, a multi-format payload or a property of a checked schema is checked once, at its definition", async () => {
      const doc = base({
        channels: {
          orders: channel({
            orderPlaced: { headers: { $ref: "#/components/schemas/SharedHeaders" } },
            orderShipped: { headers: multiFormat(JSON_SCHEMA, { $ref: "#/components/schemas/PropertyHeaders" }), payload: { $ref: "#/components/schemas/SharedHeaders" } },
            orderAudited: { headers: { $ref: "#/components/schemas/WrappedHeaders" }, payload: multiFormat(JSON_SCHEMA, { $ref: "#/components/schemas/MultiFormatHeaders" }) },
            orderReturned: { headers: { $ref: "#/components/schemas/MultiFormatHeaders" }, payload: { $ref: "#/components/schemas/WrappedHeaders" } },
          }),
        },
        operations: { receive: { action: "receive", messages: [{ $ref: "#/components/x-messages/late" }] } },
        components: {
          schemas: {
            SharedHeaders: { type: "object", properties: { ce_id: { type: "string" } } },
            PropertyHeaders: { type: "object", properties: { trace_id: { type: "string" } } },
            WrappedHeaders: multiFormat(JSON_SCHEMA, { type: "object", properties: { wrapped_id: { type: "string" } } }),
            MultiFormatHeaders: { type: "object", properties: { mf_id: { type: "string" } } },
            LateHeaders: { type: "object", properties: { late_by: { type: "integer" } } },
            Envelope: { type: "object", properties: { headers: { $ref: "#/components/schemas/PropertyHeaders" } } },
          },
          messages: { lateHeaders: { headers: { $ref: "#/components/schemas/LateHeaders" } } },
          "x-messages": { late: { payload: { $ref: "#/components/schemas/LateHeaders" } } },
        },
      });
      const expected = [
        "components.schemas.LateHeaders.properties.late_by",
        "components.schemas.MultiFormatHeaders.properties.mf_id",
        "components.schemas.PropertyHeaders.properties.trace_id",
        "components.schemas.SharedHeaders.properties.ce_id",
        "components.schemas.WrappedHeaders.schema.properties.wrapped_id",
      ];
      expect(pathsOf(await linter.run(doc))).toEqual(expected);
      expect(pathsOf(await linter.run(withVersion(doc, "3.1.0")))).toEqual(expected);
    });

    test("only the direct target of the headers is skipped: components.schemas entries referenced from inside a header schema are still checked", async () => {
      const doc = base({
        channels: {
          orders: channel({
            orderPlaced: { headers: { $ref: "#/components/schemas/CloudEventHeaders" } },
            orderShipped: { headers: multiFormat(ASYNCAPI_SCHEMA, { type: "object", properties: { ce_type: { type: "string" }, retry: { $ref: "#/components/schemas/RetryPolicy" } } }) },
          }),
        },
        components: {
          schemas: {
            CloudEventHeaders: multiFormat(JSON_SCHEMA, {
              type: "object",
              properties: { ce_id: { type: "string" }, trace: { $ref: "#/components/schemas/TraceContext" }, extension: { $ref: "#/components/x-schemas/Extension" } },
            }),
            TraceContext: { type: "object", properties: { trace_flags: { type: "string" } } },
            RetryPolicy: multiFormat(JSON_SCHEMA, { type: "object", properties: { max_attempts: { type: "integer" } } }),
          },
          "x-schemas": { Extension: { type: "object", properties: { ext_name: { type: "string" } } } },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["components.schemas.RetryPolicy.schema.properties.max_attempts", "components.schemas.TraceContext.properties.trace_flags"]);
    });
  });

  describe("configured naming-convention", () => {
    const docWith = (values) => ({
      asyncapi: "3.1.0",
      info: { title: "Casing Matrix", version: "1.0.0" },
      components: {
        schemas: {
          Json: { type: "object", properties: Object.fromEntries(values.map((value) => [value, { type: "string" }])) },
          Avro: multiFormat("application/vnd.apache.avro;version=1.9.0", { type: "record", name: "Matrix", fields: values.map((value) => ({ name: value, type: "string" })) }),
        },
      },
    });

    test.each(CASING_TYPES)("naming-convention '%s' agrees with Spectral's core casing function on every property and Avro field", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const results = only(await configured.run(docWith(CASING_VALUES)));
      const json = new Set(results.filter((r) => r.path[2] === "Json").map((r) => r.path[4]));
      const avro = new Set(results.filter((r) => r.path[2] === "Avro").map((r) => r.path[5]));
      CASING_VALUES.forEach((value, index) => {
        const valid = isValidCasing(value, type);
        expect([value, json.has(value)]).toEqual([value, !valid]);
        expect([value, avro.has(String(index))]).toEqual([value, !valid]);
      });
    });

    test.each([
      ["snake", "order_placed", "orderPlaced", "snake_case"],
      ["kebab", "order-placed", "order_placed", "kebab-case"],
      ["pascal", "OrderPlaced", "orderPlaced", "PascalCase"],
      ["camel", "orderPlaced", "OrderPlaced", "camelCase"],
    ])("naming-convention '%s' accepts %s, rejects %s and names the casing in the message", async (type, good, bad, label) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const results = only(await configured.run(docWith([good, bad])));
      expect(results.map((r) => [r.path.join("."), r.message]).sort()).toEqual([
        ["components.schemas.Avro.schema.fields.1.name", `AAR074: Avro field name '${bad}' must be ${label}.`],
        [`components.schemas.Json.properties.${bad}`, `AAR074: Property name '${bad}' must be ${label}.`],
      ]);
    });

    test.each([
      ["snake_case", "snake"],
      ["kebab-case", "kebab"],
      ["camelCase", "camel"],
      ["PascalCase", "pascal"],
      ["UpperCamelCase", "pascal"],
      ["lower-camel-case", "camel"],
    ])("accepts the alias '%s' as '%s'", async (alias, type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": alias } });
      const results = only(await configured.run(docWith(CASING_VALUES)));
      expect(results.length).toBe(CASING_VALUES.filter((value) => !isValidCasing(value, type)).length * 2);
    });

    test.each([["unknown"], ["macro"], [""], [null], [3], [["kebab"]], [{ value: "kebab" }]])("falls back to camelCase when naming-convention is %p", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await configured.run(okExample))).toEqual([]);
    });

    test.each(["camelCase", "snake_case", "kebab-case", "PascalCase"])("header names are never reported under naming-convention '%s'", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const doc = base({
        channels: {
          orders: channel({ orderPlaced: { headers: H, traits: [{ headers: multiFormat(ASYNCAPI_SCHEMA, H) }] }, orderShipped: { headers: { $ref: "#/components/schemas/CloudEventHeaders" } } }),
        },
        components: { schemas: { CloudEventHeaders: multiFormat(JSON_SCHEMA, H) }, messageTraits: { cloudEvents: { headers: H } } },
      });
      expect(pathsOf(await configured.run(doc))).toEqual([]);
      expect(pathsOf(await configured.run(withVersion(doc, "3.1.0")))).toEqual([]);
    });

    test("a document compliant with camelCase fails under kebab-case only on its multi-word names, never on bindings, examples, headers or ignored formats", async () => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": "kebab-case" } });
      const results = only(await configured.run(okExample));
      const names = results.map((r) => (r.path[r.path.length - 1] === "name" ? r.message.match(/'(.*)'/)[1] : r.path[r.path.length - 1]));
      expect(names.length).toBe(17);
      names.forEach((name) => expect(/[A-Z]/.test(name)).toBe(true));
      expect(results.filter((r) => /bindings|examples|legacyReceipt|protoReceipt|x-legacy|[hH]eaders|traits/.test(r.path.join(".")))).toEqual([]);
    });
  });
});
