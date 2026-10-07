const { linterForRule, CONTENT_TYPE_CASES, NON_STRING_CONTENT_TYPES } = require("../../helpers/utils");
const okExample = require("./AAR067/ok-example");
const failExample = require("./AAR067/fail-example");
const failNonString = require("./AAR067/fail-non-string");
const failSharedRef = require("./AAR067/fail-shared-ref");
const failTraitsDeclarationSite = require("./AAR067/fail-traits-declaration-site");
const okStructuralEdges = require("./AAR067/ok-structural-edges");
const failLargeGenerated = require("./AAR067/fail-large-generated");

const RULE = "asa:AAR067";
const P = "channels.retail.cmd.orders.placed.v1";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withOptions = (value) => linterForRule(RULE, { functionOptions: { "allowed-content-types": value } });

const FAIL_EXAMPLE_PATHS = [
  "defaultContentType",
  `${P}.publish.message.contentType`,
  `${P}.publish.message.traits.1.contentType`,
  `${P}.subscribe.message.oneOf.0.contentType`,
  `${P}.subscribe.message.oneOf.2.contentType`,
  "channels.retail.cdc.payments.captured.v1.subscribe.message.contentType",
  "components.channels.auditTrail.publish.message.contentType",
  "components.messages.orderShipped.contentType",
  "components.messages.paymentEvents.oneOf.1.contentType",
  "components.messageTraits.legacyFormTrait.contentType",
].sort();

const matrixDoc = (values) => ({
  asyncapi: "2.6.0",
  info: { title: "Content Type Matrix", version: "1.0.0" },
  components: {
    messages: Object.fromEntries(values.map((value, index) => [`m${index}`, { messageId: `m${index}`, contentType: value }])),
  },
});

const reportedIndexes = (results) => new Set(only(results).map((r) => Number(r.path[2].slice(1))));

describe("AAR067 (AsyncAPI 2.x): contentType values must be allowed MIME types", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped allowed-content-types", () => {
    test("passes when every contentType is allowed, ignoring payload, header, example, binding, extension, schemaFormat and null values", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports the defaultContentType and every message, oneOf member, trait and component contentType that is not allowed", async () => {
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

    test("reports the exact message, severity and path of each kind of finding", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r]));
      expect(byPath.defaultContentType.message).toBe(
        `AAR067: defaultContentType 'application/jsn' is not an allowed MIME type.`
      );
      expect(byPath[`${P}.publish.message.contentType`].message).toBe(
        `AAR067: contentType 'text/json' is not an allowed MIME type.`
      );
      expect(byPath[`${P}.publish.message.traits.1.contentType`].message).toBe(
        `AAR067: Message trait contentType 'application/x-ndjson' is not an allowed MIME type.`
      );
      expect(byPath[`${P}.subscribe.message.oneOf.2.contentType`].message).toBe(
        "AAR067: contentType 'application json' is not a valid MIME type."
      );
      expect(byPath["components.messages.orderShipped.contentType"].message).toBe(
        "AAR067: contentType 'application/*' is not a valid MIME type."
      );
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("compares the media type without its parameters: the schemaFormat value used as contentType is still not allowed", async () => {
      const results = only(await linter.run(failExample));
      expect(results.find((r) => r.path.join(".") === `${P}.subscribe.message.oneOf.0.contentType`).message).toBe(
        `AAR067: contentType 'application/vnd.apache.avro;version=1.9.0' is not an allowed MIME type.`
      );
    });

    test.each(CONTENT_TYPE_CASES.allowed.map((value) => [value]))("accepts %p", async (value) => {
      expect(pathsOf(await linter.run(matrixDoc([value])))).toEqual([]);
    });

    test.each(CONTENT_TYPE_CASES.notAllowed.map((value) => [value]))("rejects the well-formed but not allowed %p", async (value) => {
      const results = only(await linter.run(matrixDoc([value])));
      expect(results.map((r) => r.message)).toEqual([
        `AAR067: contentType '${value}' is not an allowed MIME type.`,
      ]);
    });

    test.each(CONTENT_TYPE_CASES.malformed.map((value) => [value]))("rejects the malformed %p as not a valid MIME type", async (value) => {
      const results = only(await linter.run(matrixDoc([value])));
      expect(results.map((r) => r.message)).toEqual([`AAR067: contentType '${value}' is not a valid MIME type.`]);
    });

    test("checks a whole matrix in one document and reports exactly the rejected entries", async () => {
      const values = [...CONTENT_TYPE_CASES.allowed, ...CONTENT_TYPE_CASES.notAllowed, ...CONTENT_TYPE_CASES.malformed];
      const reported = reportedIndexes(await linter.run(matrixDoc(values)));
      values.forEach((value, index) => {
        expect([value, reported.has(index)]).toEqual([value, !CONTENT_TYPE_CASES.allowed.includes(value)]);
      });
    });

    test.each(NON_STRING_CONTENT_TYPES.map((value) => [value]))("rejects the non-string contentType %p", async (value) => {
      const results = only(await linter.run(matrixDoc([value])));
      expect(results.map((r) => r.message)).toEqual([`AAR067: contentType ${JSON.stringify(value)} is not a valid MIME type.`]);
    });

    test("reports non-string and empty values in oneOf members, traits and defaultContentType, and skips null ones", async () => {
      const base = "channels.inventory/stock.publish.message.oneOf";
      const results = only(await linter.run(failNonString));
      expect(pathsOf(results)).toEqual(
        [
          "defaultContentType",
          `${base}.0.contentType`,
          `${base}.1.contentType`,
          `${base}.2.contentType`,
          `${base}.3.contentType`,
          `${base}.4.contentType`,
          `${base}.6.contentType`,
          `${base}.7.contentType`,
          "components.messageTraits.numericTrait.contentType",
        ].sort()
      );
      const messages = results.map((r) => r.message);
      expect(messages).toContain("AAR067: defaultContentType 2.6 is not a valid MIME type.");
      expect(messages).toContain("AAR067: contentType {\"value\":\"application/json\"} is not a valid MIME type.");
      expect(messages).toContain("AAR067: contentType [\"application/json\"] is not a valid MIME type.");
      expect(messages).toContain("AAR067: Message trait contentType 0 is not a valid MIME type.");
    });

    test("validates a shared message, trait or channel once at its definition, and ignores external and dangling refs", async () => {
      const results = only(await linter.run(failSharedRef));
      expect(pathsOf(results)).toEqual(
        [
          "components.channels.diagnostics.publish.message.contentType",
          "components.messageTraits.legacyEncoding.contentType",
          "components.messages.vehiclePosition.contentType",
        ].sort()
      );
    });

    test("reports each value where it is declared, whatever the trait merge order, including the tuple form of a trait", async () => {
      expect(pathsOf(await linter.run(failTraitsDeclarationSite))).toEqual(
        [
          "channels.customers/registered.subscribe.message.traits.0.contentType",
          "channels.customers/deleted.subscribe.message.contentType",
          "channels.customers/merged.publish.message.traits.0.0.contentType",
          "components.messageTraits.auditTrait.contentType",
        ].sort()
      );
    });

    test("skips null, scalar, array and $ref nodes, bindings, extensions, examples and 3.x-only structures", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("validates channels and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = {
        asyncapi: "2.6.0",
        info: { title: "Extension-like Keys", version: "1.0.0" },
        channels: { "x-internal": { publish: { message: { contentType: "text/json" } } } },
        components: { messages: { "x-legacy": { contentType: "text/json" } }, messageTraits: { "x-trait": { contentType: "text/json" } } },
      };
      expect(pathsOf(await linter.run(doc))).toEqual(
        [
          "channels.x-internal.publish.message.contentType",
          "components.messageTraits.x-trait.contentType",
          "components.messages.x-legacy.contentType",
        ].sort()
      );
    });

    test("validates the defaultContentType on its own, and treats an absent or null one as not declared", async () => {
      const base = { asyncapi: "2.6.0", info: { title: "Defaults Only", version: "1.0.0" } };
      expect(pathsOf(await linter.run({ ...base, defaultContentType: "text/json" }))).toEqual(["defaultContentType"]);
      expect(pathsOf(await linter.run({ ...base, defaultContentType: "application/avro" }))).toEqual([]);
      expect(pathsOf(await linter.run({ ...base, defaultContentType: null }))).toEqual([]);
      expect(pathsOf(await linter.run(base))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(pathsOf(await linter.run("42"))).toEqual([]);
      expect(pathsOf(await linter.run([{ asyncapi: "2.6.0", defaultContentType: "text/json" }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured allowed-content-types", () => {
    const probe = [
      "application/json",
      "APPLICATION/JSON; charset=utf-8",
      "application/cloudevents+json",
      "application/vnd.acme.orders.v1+json",
      "application/vnd.acme.payment.v1+avro",
      "application/avro",
      "application/x-json",
      "application/json-seq",
      "text/plain",
      "text/json",
      "text/html",
      "application/xml",
      "image/png",
      "application/vnd-acme-orders",
      "application/vndXacme.orders",
      "application/x$y",
      "application/xy",
      "application/a^b",
    ];

    const allowedUnder = async (value) => {
      const configured = await withOptions(value);
      const reported = reportedIndexes(await configured.run(matrixDoc(probe)));
      return probe.filter((_, index) => !reported.has(index));
    };

    test.each([
      ["application/json", ["application/json", "APPLICATION/JSON; charset=utf-8"]],
      [
        "application/json, application/*+json",
        ["application/json", "APPLICATION/JSON; charset=utf-8", "application/cloudevents+json", "application/vnd.acme.orders.v1+json"],
      ],
      ["application/*+json", ["application/cloudevents+json", "application/vnd.acme.orders.v1+json"]],
      [
        "application/*json",
        ["application/json", "APPLICATION/JSON; charset=utf-8", "application/cloudevents+json", "application/vnd.acme.orders.v1+json", "application/x-json"],
      ],
      ["application/json*", ["application/json", "APPLICATION/JSON; charset=utf-8", "application/json-seq"]],
      ["*/json", ["application/json", "APPLICATION/JSON; charset=utf-8", "text/json"]],
      ["text/*", ["text/plain", "text/json", "text/html"]],
      ["application/vnd.*", ["application/vnd.acme.orders.v1+json", "application/vnd.acme.payment.v1+avro"]],
      ["application/vnd.acme.*", ["application/vnd.acme.orders.v1+json", "application/vnd.acme.payment.v1+avro"]],
      ["application/*+avro, application/avro", ["application/vnd.acme.payment.v1+avro", "application/avro"]],
      ["application/x$y, application/a^b", ["application/x$y", "application/a^b"]],
      ["*/*", probe],
      ["application/*", probe.filter((value) => !/^(text|image)\//.test(value))],
    ])("allowed-content-types %p accepts exactly the matching probes", async (value, expected) => {
      expect(await allowedUnder(value)).toEqual(expected);
    });

    test("accepts an array, entries carrying commas, parameters and mixed case, and ignores unusable entries", async () => {
      const expected = ["application/json", "APPLICATION/JSON; charset=utf-8", "text/plain"];
      expect(await allowedUnder(["application/json", "text/plain"])).toEqual(expected);
      expect(await allowedUnder(["application/json,text/plain"])).toEqual(expected);
      expect(await allowedUnder([1, null, "Application/JSON; charset=utf-8", { value: "text/html" }, " TEXT/Plain "])).toEqual(expected);
      expect(await allowedUnder(" application/json , , text/plain ,")).toEqual(expected);
      expect(await allowedUnder("Application/JSON; charset=utf-8,TEXT/PLAIN;q=0.9")).toEqual(expected);
      expect(await allowedUnder("json, application/, /xml, application json, text/plain, application/json")).toEqual(expected);
    });

    test("reports a value outside a configured list with the same message as under the shipped list", async () => {
      const configured = await withOptions(" Application/JSON; charset=utf-8, application/json, json, TEXT/*");
      const results = only(await configured.run(matrixDoc(["image/png", "text/html", "application/json; charset=utf-8"])));
      expect(results.map((r) => r.message)).toEqual(["AAR067: contentType 'image/png' is not an allowed MIME type."]);
    });

    test("keeps reporting malformed and non-string values even when every media type is allowed", async () => {
      const configured = await withOptions("*/*");
      const values = [...CONTENT_TYPE_CASES.allowed, ...CONTENT_TYPE_CASES.notAllowed, ...CONTENT_TYPE_CASES.malformed, ...NON_STRING_CONTENT_TYPES];
      const reported = reportedIndexes(await configured.run(matrixDoc(values)));
      values.forEach((value, index) => {
        const malformed = CONTENT_TYPE_CASES.malformed.includes(value) || NON_STRING_CONTENT_TYPES.includes(value);
        expect([value, reported.has(index)]).toEqual([value, malformed]);
      });
    });

    test("a document compliant with the shipped list fails once the list is narrowed to application/json", async () => {
      const configured = await withOptions("application/json");
      expect(pathsOf(await configured.run(okExample))).toEqual(
        [
          "channels.harborline.cmd.shipments.created.v1.publish.message.contentType",
          "channels.harborline/telemetry/{deviceId}.publish.message.contentType",
          "channels.harborline/sensors/{sensorId}/raw.publish.message.contentType",
          "channels.harborline.cmd.invoices.issued.v1.subscribe.message.contentType",
          "components.channels.auditTrail.publish.message.contentType",
          "components.messages.shipmentDelayed.contentType",
          "components.messages.containerWeighed.contentType",
          "components.messages.manifestExported.contentType",
          "components.messages.berthPlan.contentType",
          "components.messages.reeferAlarm.contentType",
          "components.messages.gateEvents.oneOf.0.contentType",
          "components.messages.gateEvents.oneOf.1.contentType",
          "components.messageTraits.protobufEnvelope.contentType",
        ].sort()
      );
    });

    test("a failing document passes once its media types are allowed, except the malformed ones", async () => {
      const configured = await withOptions(
        "application/jsn, text/json, application/x-ndjson, application/vnd.apache.avro, multipart/*, text/html, image/*, application/x-www-form-urlencoded, application/json, application/*+json, application/avro"
      );
      expect(pathsOf(await configured.run(failExample))).toEqual(
        [`${P}.subscribe.message.oneOf.2.contentType`, "components.messages.orderShipped.contentType"].sort()
      );
    });

    test.each([[""], ["   "], [","], [" , ;"], ["json"], ["application/"], ["/json"], ["application json"], [null], [undefined], [0], [7], [true], [false], [{}], [[]], [[""]], [[null, 3]], [{ value: "text/json" }]])(
      "falls back to the shipped list when allowed-content-types is %p",
      async (value) => {
        const configured = await withOptions(value);
        expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await configured.run(okExample))).toEqual([]);
        const results = only(await configured.run(matrixDoc(["text/json"])));
        expect(results.map((r) => r.message)).toEqual([
          `AAR067: contentType 'text/json' is not an allowed MIME type.`,
        ]);
      }
    );
  });
});
