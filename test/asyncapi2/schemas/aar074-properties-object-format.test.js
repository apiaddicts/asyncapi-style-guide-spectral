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
const S = "channels.logistics.cdc.shipments.created.v1";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Property Name Locations", version: "1.0.0" }, ...extra });
const prefixed = (prefix, relatives) => relatives.map((relative) => `${prefix}.${relative}`).sort();

const BAD = { type: "object", properties: { orderId: { type: "string" }, order_id: { type: "string" } } };
const BAD_AT = (prefix) => `${prefix}.properties.order_id`;

const FAIL_EXAMPLE_PATHS = [
  `${S}.publish.message.payload.properties.origin_warehouse`,
  `${S}.publish.message.payload.properties.parcels.items.properties.WeightKg`,
  `${S}.subscribe.message.oneOf.1.payload.properties.signed-by`,
  `${S}.subscribe.message.oneOf.2.payload.fields.1.name`,
  `${S}.subscribe.message.oneOf.2.payload.fields.1.type.1.fields.1.name`,
  "components.schemas.Address.properties.postal_code",
  "components.schemas.Address.properties.geo.properties.Lng",
  "components.schemas.Dimensions.allOf.1.properties.width_cm",
  "components.schemas.CarrierEvent.fields.1.name",
  "components.parameters.region.schema.properties.Region_Name",
  "components.channels.auditTrail.publish.message.payload.properties.audit_id",
  "components.messages.shipmentDelayed.payload.properties.Reason",
].sort();

const SHARED_REF_PATHS = [
  "components.schemas.Money.properties.currency_code",
  "components.schemas.Party.properties.billing_address",
  "components.schemas.Party.properties.billing_address.properties.Line1",
  "components.schemas.Node.properties.next_node",
  "components.x-schemas.fx/rates.properties.rate~table.properties.base_currency",
  "components.x-schemas.fx quote.properties.Bid",
  "components.x-channels.refunds.publish.message.payload.properties.refund_id",
  "components.x-messages.settlementPosted.payload.properties.Net_Amount",
  "components.parameters.merchantId.schema.properties.merchant_code",
].sort();

const LOCATIONS = [
  ["publish message payload", "channels.orders.publish.message.payload", { channels: { orders: { publish: { message: { payload: BAD } } } } }],
  ["subscribe message payload", "channels.orders.subscribe.message.payload", { channels: { orders: { subscribe: { message: { payload: BAD } } } } }],
  ["oneOf member payload", "channels.orders.publish.message.oneOf.1.payload", { channels: { orders: { publish: { message: { oneOf: [{ payload: { type: "string" } }, { payload: BAD }] } } } } }],
  ["nested oneOf member payload", "channels.orders.publish.message.oneOf.0.oneOf.0.payload", { channels: { orders: { publish: { message: { oneOf: [{ oneOf: [{ payload: BAD }] }] } } } } }],
  ["channel parameter schema", "channels.orders/{orderId}.parameters.orderId.schema", { channels: { "orders/{orderId}": { parameters: { orderId: { schema: BAD } } } } }],
  ["referenced parameter schema", "components.x-parameters.orderId.schema", { channels: { "orders/{orderId}": { parameters: { orderId: { $ref: "#/components/x-parameters/orderId" } } } }, components: { "x-parameters": { orderId: { schema: BAD } } } }],
  ["components.parameters schema", "components.parameters.orderId.schema", { components: { parameters: { orderId: { schema: BAD } } } }],
  ["components.channels message payload", "components.channels.audit.subscribe.message.payload", { components: { channels: { audit: { subscribe: { message: { payload: BAD } } } } } }],
  ["components.messages payload", "components.messages.orderPlaced.payload", { components: { messages: { orderPlaced: { payload: BAD } } } }],
  ["components.messages oneOf member payload", "components.messages.orderEvents.oneOf.0.payload", { components: { messages: { orderEvents: { oneOf: [{ payload: BAD }] } } } }],
  ["components.schemas", "components.schemas.Order", { components: { schemas: { Order: BAD } } }],
  ["referenced components.schemas entry", "components.x-schemas.Order", { components: { schemas: { Order: { $ref: "#/components/x-schemas/Order" } }, "x-schemas": { Order: BAD } } }],
  ["message referenced from an extension", "components.x-messages.orderPlaced.payload", { channels: { orders: { publish: { message: { $ref: "#/components/x-messages/orderPlaced" } } } }, components: { "x-messages": { orderPlaced: { payload: BAD } } } }],
  ["channel referenced from an extension", "components.x-channels.orders.publish.message.payload", { channels: { orders: { $ref: "#/components/x-channels/orders" } }, components: { "x-channels": { orders: { publish: { message: { payload: BAD } } } } } }],
  ["payload referenced from an extension", "components.x-schemas.Order", { channels: { orders: { publish: { message: { payload: { $ref: "#/components/x-schemas/Order" } } } } }, components: { "x-schemas": { Order: BAD } } }],
  ["channel whose key starts with x-", "channels.x-legacy.publish.message.payload", { channels: { "x-legacy": { publish: { message: { payload: BAD } } } } }],
];

const IGNORED = [
  ["server bindings", { servers: { kafka: { url: "kafka:9092", protocol: "kafka", bindings: { kafka: { schemaRegistryUrl: "https://registry", x_schema: BAD } } } } }],
  ["channel bindings", { channels: { live: { bindings: { ws: { query: BAD, headers: BAD } } } } }],
  ["operation bindings", { channels: { orders: { publish: { bindings: { http: { type: "request", method: "POST", query: BAD }, kafka: { groupId: BAD, clientId: BAD } } } } } }],
  ["message bindings", { channels: { orders: { publish: { message: { bindings: { kafka: { key: BAD }, http: { headers: BAD }, anypointmq: { headers: BAD } } } } } } }],
  ["message trait bindings", { components: { messageTraits: { kafka: { bindings: { kafka: { key: BAD } } } } } }],
  ["operation traits", { components: { operationTraits: { producer: { bindings: { kafka: { clientId: BAD } } } } } }],
  ["message examples", { channels: { orders: { publish: { message: { payload: { type: "object" }, examples: [{ payload: { order_id: "1", properties: { Bad: 1 } }, headers: { trace_id: "1" } }] } } } } }],
  ["message correlationId", { channels: { orders: { publish: { message: { correlationId: { location: "$message.header#/correlation_id", properties: { order_id: {} } } } } } } }],
  ["message extensions", { channels: { orders: { publish: { message: { "x-payload": BAD, "x-headers": BAD } } } } }],
  ["unreferenced extension schemas", { components: { "x-schemas": { Order: BAD } }, "x-schemas": { Order: BAD } }],
  ["3.x operations and replies", { operations: { send: { action: "send", messages: [{ $ref: "#/components/x-messages/m" }], reply: { messages: [{ $ref: "#/components/x-messages/m" }] } } }, components: { "x-messages": { m: { payload: BAD } } } }],
  ["3.x channel messages", { channels: { orders: { address: "orders", messages: { orderPlaced: { payload: BAD } } } } }],
  ["a 3.x multi-format payload", { channels: { orders: { publish: { message: { payload: { schemaFormat: "application/schema+json;version=draft-07", schema: BAD } } } } } }],
  ["a 3.x multi-format components.schemas entry", { components: { schemas: { Order: { schemaFormat: "application/schema+json;version=draft-07", schema: BAD } } } }],
  ["a RAML payload", { channels: { orders: { publish: { message: { schemaFormat: "application/raml+yaml;version=1.0", payload: { type: "object", properties: { order_id: "string", "line_no?": "integer" } } } } } } }],
  ["a Protobuf payload", { channels: { orders: { publish: { message: { schemaFormat: "application/vnd.google.protobuf;version=3", payload: "message Order { string order_id = 1; }" } } } } }],
  ["a referenced schema behind an unknown format", { channels: { orders: { publish: { message: { schemaFormat: "application/x-custom", payload: { $ref: "#/components/x-schemas/Order" } } } } }, components: { "x-schemas": { Order: BAD } } }],
];

const H = HEADER_SCHEMA;

const HEADER_LOCATIONS = [
  ["publish message headers", { channels: { orders: { publish: { message: { headers: H, payload: { type: "object" } } } } } }],
  ["subscribe message headers", { channels: { orders: { subscribe: { message: { headers: H } } } } }],
  ["oneOf member headers", { channels: { orders: { publish: { message: { oneOf: [{ headers: H }, { headers: H, payload: { type: "string" } }] } } } } }],
  ["nested oneOf member headers", { channels: { orders: { publish: { message: { oneOf: [{ oneOf: [{ headers: H }] }] } } } } }],
  ["inline trait headers", { channels: { orders: { publish: { message: { traits: [{ headers: H }] } } } } }],
  ["tuple trait headers", { channels: { orders: { publish: { message: { traits: [[{ headers: H }, { environment: "prod" }]] } } } } }],
  ["referenced trait headers", { channels: { orders: { publish: { message: { traits: [{ $ref: "#/components/x-traits/cloudEvents" }] } } } }, components: { "x-traits": { cloudEvents: { headers: H } } } }],
  ["trait headers of a traits list behind a reference", { channels: { orders: { publish: { message: { traits: { $ref: "#/components/x-trait-lists/common" } } } } }, components: { "x-trait-lists": { common: [{ headers: H }] } } }],
  ["headers behind a reference to an extension", { channels: { orders: { publish: { message: { headers: { $ref: "#/components/x-headers/cloudEvents" } } } } }, components: { "x-headers": { cloudEvents: H } } }],
  ["headers behind a chained reference", { channels: { orders: { publish: { message: { headers: { $ref: "#/components/x-headers/alias" } } } } }, components: { "x-headers": { alias: { $ref: "#/components/x-headers/cloudEvents" }, cloudEvents: H } } }],
  ["headers under a schemaFormat that is not a schema", { channels: { orders: { publish: { message: { schemaFormat: "application/raml+yaml;version=1.0", headers: H } } } } }],
  ["components.messages headers", { components: { messages: { orderPlaced: { headers: H } } } }],
  ["components.messages oneOf member headers", { components: { messages: { orderEvents: { oneOf: [{ headers: H }] } } } }],
  ["components.channels message headers", { components: { channels: { audit: { subscribe: { message: { headers: H } } } } } }],
  ["components.messageTraits headers", { components: { messageTraits: { cloudEvents: { headers: H } } } }],
  ["referenced components.messageTraits entry", { components: { messageTraits: { cloudEvents: { $ref: "#/components/x-traits/cloudEvents" } }, "x-traits": { cloudEvents: { headers: H } } } }],
  ["headers of a message referenced from an extension", { channels: { orders: { publish: { message: { $ref: "#/components/x-messages/orderPlaced" } } } }, components: { "x-messages": { orderPlaced: { headers: H } } } }],
  ["headers of a channel referenced from an extension", { channels: { orders: { $ref: "#/components/x-channels/orders" } }, components: { "x-channels": { orders: { publish: { message: { headers: H } } } } } }],
];

describe("AAR074 (AsyncAPI 2.x): property names of message schemas must follow the configured naming-convention", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("default naming-convention (camelCase)", () => {
    test("passes a multi-protocol document whose payload, header, trait, parameter and component properties and Avro fields are camelCase", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every property and Avro field that is not camelCase in channels, oneOf members, parameters and components, never in headers", async () => {
      expect(pathsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test("treats a version that is not 3.x as 2.x", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
        expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test("reports the exact message, severity and path of each finding", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r]));
      expect(byPath[`${S}.publish.message.payload.properties.origin_warehouse`].message).toBe("AAR074: Property name 'origin_warehouse' must be camelCase.");
      expect(byPath["components.parameters.region.schema.properties.Region_Name"].message).toBe("AAR074: Property name 'Region_Name' must be camelCase.");
      expect(byPath[`${S}.subscribe.message.oneOf.2.payload.fields.1.name`].message).toBe("AAR074: Avro field name 'last_scan' must be camelCase.");
      expect(byPath["components.schemas.CarrierEvent.fields.1.name"].message).toBe("AAR074: Avro field name 'event-type' must be camelCase.");
      results.forEach((r) => expect(r.severity).toBe(1));
    });

    test.each(PROPERTY_KEYWORD_CASES)("walks %s", async (_name, schema, relatives) => {
      const doc = base({
        channels: { orders: { publish: { message: { payload: schema, headers: schema } } } },
        components: { schemas: { Probe: schema } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        [...prefixed("channels.orders.publish.message.payload", relatives), ...prefixed("components.schemas.Probe", relatives)].sort()
      );
    });

    test.each(NON_STRING_AVRO_NAMES)("reports the Avro field name %p", async (name, message) => {
      const doc = base({ components: { schemas: { Probe: { type: "record", name: "Probe", fields: [{ name: "orderId", type: "string" }, { name, type: "string" }] } } } });
      const results = only(await linter.run(doc));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.schemas.Probe.fields.1.name", `AAR074: ${message}`]]);
    });

    test.each(PROPERTY_FORMAT_CASES)("reads a payload whose schemaFormat is %p", async (schemaFormat, kind) => {
      const payload = PROPERTY_FORMAT_PAYLOADS[kind || "json"];
      const message = schemaFormat === undefined ? { payload } : { schemaFormat, payload };
      const doc = base({ channels: { orders: { publish: { message } } } });
      const expected = kind === null ? [] : prefixed("channels.orders.publish.message.payload", PROPERTY_FORMAT_FINDINGS[kind]);
      expect(pathsOf(await linter.run(doc))).toEqual(expected);
    });

    test("headers are never checked, whatever the schemaFormat of the message", async () => {
      const doc = base({
        channels: {
          orders: {
            publish: { message: { schemaFormat: "application/raml+yaml;version=1.0", headers: BAD, payload: BAD } },
            subscribe: { message: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", headers: BAD, payload: PROPERTY_FORMAT_PAYLOADS.avro } },
          },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["channels.orders.subscribe.message.payload.fields.1.name"]);
    });

    test("an Avro record is recognized by its shape whatever the schemaFormat, and JSON Schema properties under an Avro schemaFormat are still checked", async () => {
      const doc = base({
        channels: {
          orders: {
            publish: { message: { payload: PROPERTY_FORMAT_PAYLOADS.avro } },
            subscribe: { message: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: BAD } },
          },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["channels.orders.publish.message.payload.fields.1.name", BAD_AT("channels.orders.subscribe.message.payload")].sort());
    });

    test("an Avro schema written as JSON text is parsed and reported at the payload, only under an Avro schemaFormat", async () => {
      const avro = "application/vnd.apache.avro;version=1.9.0";
      const doc = base({
        channels: {
          avroText: { publish: { message: { schemaFormat: avro, payload: AVRO_TEXT_SCHEMA } } },
          jsonText: { publish: { message: { payload: JSON.stringify(BAD) } } },
          brokenText: { publish: { message: { schemaFormat: avro, payload: '{"type":"record","fields":[{"name":"order_id"' } } },
          plainText: { publish: { message: { schemaFormat: avro, payload: "com.acme.Order_Placed" } } },
        },
      });
      const results = only(await linter.run(doc));
      expect(results.map((r) => [r.path.join("."), r.message]).sort()).toEqual([
        ["channels.avroText.publish.message.payload", "AAR074: Avro field name 'Line_Count' must be camelCase."],
        ["channels.avroText.publish.message.payload", "AAR074: Avro field name 'order_id' must be camelCase."],
      ]);
    });

    test("2.x message traits override the message schemaFormat in order, as JSON Merge Patch", async () => {
      const avro = "application/vnd.apache.avro;version=1.9.0";
      const raml = "application/raml+yaml;version=1.0";
      const message = (schemaFormat, traits) => ({ ...(schemaFormat === undefined ? {} : { schemaFormat }), traits, payload: BAD });
      const doc = base({
        channels: {
          ramlTrait: { publish: { message: message(undefined, [{ $ref: "#/components/messageTraits/raml" }]) } },
          ramlThenAvro: { publish: { message: message(undefined, [{ $ref: "#/components/messageTraits/raml" }, { schemaFormat: avro }]) } },
          avroThenRaml: { publish: { message: message(avro, [{ schemaFormat: avro }, [{ schemaFormat: raml }, {}]]) } },
          traitClearsRaml: { publish: { message: message(raml, [{ schemaFormat: null }]) } },
          traitWithoutFormat: { publish: { message: message(raml, [{ contentType: "application/json" }]) } },
          unresolvedTrait: { publish: { message: message(raml, [{ $ref: "./traits.yaml#/avro" }]) } },
          listBehindRef: { publish: { message: message(undefined, { $ref: "#/components/x-trait-lists/raml" }) } },
        },
        components: { messageTraits: { raml: { schemaFormat: raml } }, "x-trait-lists": { raml: [{ schemaFormat: raml }] } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual([BAD_AT("channels.ramlThenAvro.publish.message.payload"), BAD_AT("channels.traitClearsRaml.publish.message.payload")].sort());
    });

    test.each(LOCATIONS)("checks the %s", async (_name, prefix, extra) => {
      expect(pathsOf(await linter.run(base(extra)))).toEqual([BAD_AT(prefix)]);
    });

    test.each(IGNORED)("ignores %s", async (_name, extra) => {
      expect(pathsOf(await linter.run(base(extra)))).toEqual([]);
    });

    test("reports a shared schema, parameter or message once at its definition, follows chained, escaped and encoded references, and skips cyclic, dangling, external and non-local ones", async () => {
      expect(pathsOf(await linter.run(failSharedRef))).toEqual(SHARED_REF_PATHS);
    });

    test("only the referenced subschema is checked when a reference points inside another schema", async () => {
      const doc = base({
        channels: { orders: { publish: { message: { payload: { $ref: "#/components/x-library/Order/properties/line_items" } } } } },
        components: { "x-library": { Order: { type: "object", properties: { order_id: {}, line_items: { type: "array", items: { properties: { Sku: {} } } } } } } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["components.x-library.Order.properties.line_items.items.properties.Sku"]);
    });

    test("ignores the siblings of a $ref, as the Reference Object specifies", async () => {
      const doc = base({ components: { schemas: { Order: { $ref: "#/components/schemas/Base", properties: { order_id: {} } }, Base: { properties: { baseId: {} } } } } });
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("skips null, scalar, array and $ref nodes, unusable traits and parameters, and 3.x-only structures", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("tolerates channels, components and their maps of unexpected types", async () => {
      for (const extra of [{ channels: null }, { channels: [] }, { channels: "orders" }, { components: null }, { components: [] }, { components: { schemas: [BAD], messages: [{ payload: BAD }], parameters: "x", messageTraits: 1, channels: true } }]) {
        expect(pathsOf(await linter.run(base(extra)))).toEqual([]);
      }
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...doc } = failExample;
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(pathsOf(await linter.run("42"))).toEqual([]);
      expect(pathsOf(await linter.run([{ asyncapi: "2.6.0", components: { schemas: { Order: BAD } } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("message headers", () => {
    test.each(HEADER_LOCATIONS)("never checks the %s", async (_name, extra) => {
      expect(pathsOf(await linter.run(base(extra)))).toEqual([]);
    });

    test("a components.schemas entry used only as headers is not checked as a component, also behind chained references, traits and referenced messages", async () => {
      const doc = base({
        channels: {
          orders: {
            publish: {
              message: {
                headers: { $ref: "#/components/schemas/CloudEventHeaders" },
                traits: [{ $ref: "#/components/messageTraits/tracing" }, { headers: { $ref: "#/components/schemas/RetryHeaders" } }],
                payload: BAD,
              },
            },
          },
          refunds: { $ref: "#/components/x-channels/refunds" },
        },
        components: {
          schemas: {
            CloudEventHeaders: H,
            RetryHeaders: { type: "object", properties: { retry_count: { type: "integer" } } },
            TraceHeaders: { type: "object", properties: { trace_state: { type: "string" } } },
            HeadersAlias: { $ref: "#/components/schemas/KafkaHeaders" },
            KafkaHeaders: { type: "object", properties: { kafka_offset: { type: "integer" } } },
            RefundHeaders: { type: "object", properties: { refund_reason: { type: "string" } } },
            Order: BAD,
          },
          messageTraits: { tracing: { headers: { $ref: "#/components/schemas/TraceHeaders" } } },
          messages: { orderShipped: { headers: { $ref: "#/components/schemas/HeadersAlias" } } },
          "x-channels": { refunds: { publish: { message: { $ref: "#/components/x-messages/refundIssued" } } } },
          "x-messages": { refundIssued: { headers: { $ref: "#/components/schemas/RefundHeaders" } } },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual([BAD_AT("channels.orders.publish.message.payload"), BAD_AT("components.schemas.Order")].sort());
    });

    test("a schema used as headers and also as a payload, a property of a checked schema or a parameter schema is checked once, at its definition", async () => {
      const doc = base({
        channels: {
          "orders/{orderId}": {
            parameters: { orderId: { schema: { $ref: "#/components/schemas/ParameterHeaders" } } },
            publish: { message: { headers: { $ref: "#/components/schemas/SharedHeaders" } } },
            subscribe: { message: { headers: { $ref: "#/components/schemas/PropertyHeaders" }, payload: { $ref: "#/components/schemas/SharedHeaders" } } },
          },
          late: { publish: { message: { headers: { $ref: "#/components/schemas/LateHeaders" } } } },
          lateRef: { subscribe: { message: { $ref: "#/components/x-messages/late" } } },
        },
        components: {
          schemas: {
            SharedHeaders: { type: "object", properties: { ce_id: { type: "string" } } },
            PropertyHeaders: { type: "object", properties: { trace_id: { type: "string" } } },
            ParameterHeaders: { type: "object", properties: { order_ref: { type: "string" } } },
            LateHeaders: { type: "object", properties: { late_by: { type: "integer" } } },
            Envelope: { type: "object", properties: { headers: { $ref: "#/components/schemas/PropertyHeaders" } } },
          },
          messages: { audited: { headers: { $ref: "#/components/schemas/ParameterHeaders" } } },
          "x-messages": { late: { payload: { $ref: "#/components/schemas/LateHeaders" } } },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual([
        "components.schemas.LateHeaders.properties.late_by",
        "components.schemas.ParameterHeaders.properties.order_ref",
        "components.schemas.PropertyHeaders.properties.trace_id",
        "components.schemas.SharedHeaders.properties.ce_id",
      ]);
    });

    test("only the direct target of the headers is skipped: components.schemas entries referenced from inside a header schema are still checked", async () => {
      const doc = base({
        channels: {
          orders: { publish: { message: { headers: { $ref: "#/components/schemas/CloudEventHeaders" } } } },
          shipments: { publish: { message: { headers: { type: "object", properties: { ce_type: { type: "string" }, retry: { $ref: "#/components/schemas/RetryPolicy" } } } } } },
        },
        components: {
          schemas: {
            CloudEventHeaders: {
              type: "object",
              properties: { ce_id: { type: "string" }, trace: { $ref: "#/components/schemas/TraceContext" }, extension: { $ref: "#/components/x-schemas/Extension" } },
            },
            TraceContext: { type: "object", properties: { trace_flags: { type: "string" } } },
            RetryPolicy: { type: "object", properties: { max_attempts: { type: "integer" } } },
          },
          "x-schemas": { Extension: { type: "object", properties: { ext_name: { type: "string" } } } },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["components.schemas.RetryPolicy.properties.max_attempts", "components.schemas.TraceContext.properties.trace_flags"]);
    });

    test.each(["2.0.0", "2.3.0", "2.6.0"])("reports nothing on headers in AsyncAPI %s", async (version) => {
      const doc = withVersion(base({ channels: { orders: { publish: { message: { headers: { $ref: "#/components/schemas/CloudEventHeaders" }, traits: [{ headers: H }] } } } }, components: { schemas: { CloudEventHeaders: H } } }), version);
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });
  });

  describe("configured naming-convention", () => {
    const docWith = (values) => ({
      asyncapi: "2.6.0",
      info: { title: "Casing Matrix", version: "1.0.0" },
      components: {
        schemas: {
          Json: { type: "object", properties: Object.fromEntries(values.map((value) => [value, { type: "string" }])) },
          Avro: { type: "record", name: "Matrix", fields: values.map((value) => ({ name: value, type: "string" })) },
        },
      },
    });

    test.each(CASING_TYPES)("naming-convention '%s' agrees with Spectral's core casing function on every property and Avro field", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const results = only(await configured.run(docWith(CASING_VALUES)));
      const json = new Set(results.filter((r) => r.path[2] === "Json").map((r) => r.path[4]));
      const avro = new Set(results.filter((r) => r.path[2] === "Avro").map((r) => r.path[4]));
      CASING_VALUES.forEach((value, index) => {
        const valid = isValidCasing(value, type);
        expect([value, json.has(value)]).toEqual([value, !valid]);
        expect([value, avro.has(String(index))]).toEqual([value, !valid]);
      });
    });

    test("pins the camel semantics of Spectral's casing: no consecutive uppercase letters", async () => {
      const results = only(await linter.run(docWith(["userId", "userID", "user2fa", "userSignedUpV2", "UserId"])));
      expect(results.filter((r) => r.path[2] === "Json").map((r) => r.path[4]).sort()).toEqual(["UserId", "userID"]);
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
        ["components.schemas.Avro.fields.1.name", `AAR074: Avro field name '${bad}' must be ${label}.`],
        [`components.schemas.Json.properties.${bad}`, `AAR074: Property name '${bad}' must be ${label}.`],
      ]);
    });

    test.each([
      ["snake_case", "snake"],
      ["SNAKE", "snake"],
      [" Snake-Case ", "snake"],
      ["kebab-case", "kebab"],
      ["Kebab Case", "kebab"],
      ["camelCase", "camel"],
      ["lowerCamelCase", "camel"],
      ["PascalCase", "pascal"],
      ["UpperCamelCase", "pascal"],
    ])("accepts the alias '%s' as '%s'", async (alias, type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": alias } });
      const results = only(await configured.run(docWith(CASING_VALUES)));
      expect(results.length).toBe(CASING_VALUES.filter((value) => !isValidCasing(value, type)).length * 2);
    });

    test.each([["upper"], ["macro"], ["MACRO_CASE"], ["cobol"], ["flat"], ["flatcase"], [""], ["   "], ["case"], ["camel case case"], [null], [1], [true], [["snake"]], [{ value: "snake" }]])(
      "falls back to camelCase when naming-convention is %p",
      async (type) => {
        const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
        expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await configured.run(okExample))).toEqual([]);
      }
    );

    test("a document compliant with camelCase fails once naming-convention is switched to snake_case, only on its multi-word names and never on headers", async () => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": "snake_case" } });
      const results = only(await configured.run(okExample));
      const names = results.map((r) => (r.path[r.path.length - 1] === "name" ? r.message.match(/'(.*)'/)[1] : r.path[r.path.length - 1]));
      expect(names.length).toBe(23);
      names.forEach((name) => expect(/[A-Z]/.test(name)).toBe(true));
      expect(results.filter((r) => /bindings|examples|x-legacy|billing\.export|[hH]eaders|traits/.test(r.path.join(".")))).toEqual([]);
    });

    test.each(["camelCase", "snake_case", "kebab-case", "PascalCase"])("header names are never reported under naming-convention '%s'", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const doc = base({
        channels: { orders: { publish: { message: { headers: H, traits: [{ headers: H }] } } }, refunds: { publish: { message: { headers: { $ref: "#/components/schemas/CloudEventHeaders" } } } } },
        components: { schemas: { CloudEventHeaders: H }, messageTraits: { cloudEvents: { headers: H } } },
      });
      expect(pathsOf(await configured.run(doc))).toEqual([]);
    });

    test("a snake_case document passes under snake_case and fails under every other naming-convention", async () => {
      const snakeDoc = docWith(["order_id", "line_items", "created_at", "total"]);
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": "snake_case" } });
      expect(pathsOf(await configured.run(snakeDoc))).toEqual([]);
      for (const type of ["camelCase", "kebab-case", "PascalCase"]) {
        const other = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
        const expected = type === "PascalCase" ? 8 : 6;
        expect([type, only(await other.run(snakeDoc)).length]).toEqual([type, expected]);
      }
    });
  });
});
