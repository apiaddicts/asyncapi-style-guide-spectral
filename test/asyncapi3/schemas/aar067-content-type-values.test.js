const { linterForRule, CONTENT_TYPE_CASES, NON_STRING_CONTENT_TYPES } = require("../../helpers/utils");
const okExample = require("./AAR067/ok-example");
const failExample = require("./AAR067/fail-example");
const failNonString = require("./AAR067/fail-non-string");
const failSharedRef = require("./AAR067/fail-shared-ref");
const okStructuralEdges = require("./AAR067/ok-structural-edges");
const failLargeGenerated = require("./AAR067/fail-large-generated");

const RULE = "asa:AAR067";
const V = "channels.vehiclePositions.messages.positionCorrected";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withOptions = (value) => linterForRule(RULE, { functionOptions: { "allowed-content-types": value } });

const FAIL_EXAMPLE_PATHS = [
  "defaultContentType",
  `${V}.contentType`,
  `${V}.traits.1.contentType`,
  `${V}.traits.2.0.contentType`,
  "channels.serviceAlerts.messages.alertRaised.contentType",
  "channels.serviceAlerts.messages.alertCleared.contentType",
  "components.channels.auditTrail.messages.auditLine.contentType",
  "components.messages.positionReported.contentType",
  "components.messages.depotReport.contentType",
  "components.messageTraits.legacyTrait.contentType",
].sort();

describe.each(["3.0.0", "3.1.0"])("AAR067 (AsyncAPI %s): contentType values must be allowed MIME types", (version) => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  const run = async (doc, configured = linter) => pathsOf(await configured.run(withVersion(doc, version)));

  const matrixDoc = (values) => ({
    asyncapi: version,
    info: { title: "Content Type Matrix", version: "1.0.0" },
    channels: {
      matrix: {
        address: null,
        messages: Object.fromEntries(values.map((value, index) => [`m${index}`, { name: `m${index}`, contentType: value }])),
      },
    },
  });

  const reportedIndexes = (results) => new Set(only(results).map((r) => Number(r.path[3].slice(1))));

  describe("shipped allowed-content-types", () => {
    test("passes when every contentType is allowed, ignoring payloads, headers, examples, bindings, extensions, multi-format schemas and null values", async () => {
      expect(await run(okExample)).toEqual([]);
    });

    test("reports the defaultContentType and every channel message, trait, tuple trait and component contentType that is not allowed", async () => {
      expect(await run(failExample)).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test("reports a channel whose address is null like any other channel", async () => {
      const paths = await run(failExample);
      expect(paths.filter((p) => p.startsWith("channels.serviceAlerts"))).toEqual([
        "channels.serviceAlerts.messages.alertCleared.contentType",
        "channels.serviceAlerts.messages.alertRaised.contentType",
      ]);
    });

    test("reports the exact message, severity and path of each kind of finding", async () => {
      const results = only(await linter.run(withVersion(failExample, version)));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r]));
      expect(byPath.defaultContentType.message).toBe(
        `AAR067: defaultContentType 'text/json' is not an allowed MIME type.`
      );
      expect(byPath[`${V}.traits.2.0.contentType`].message).toBe(
        `AAR067: Message trait contentType 'image/png' is not an allowed MIME type.`
      );
      expect(byPath["channels.serviceAlerts.messages.alertCleared.contentType"].message).toBe(
        "AAR067: contentType '*/*' is not a valid MIME type."
      );
      expect(byPath["components.messages.depotReport.contentType"].message).toBe(
        "AAR067: contentType ' application/xml' is not a valid MIME type."
      );
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("ignores the second element of a tuple trait and a tuple whose trait is a $ref", async () => {
      const paths = await run(failExample);
      expect(paths.filter((p) => p.includes(".traits.2.1") || p.includes(".traits.3."))).toEqual([]);
    });

    test("validates a message shared by channels, operations and replies once, at components.messages", async () => {
      const results = only(await linter.run(withVersion(failExample, version)));
      expect(results.filter((r) => r.message.includes("'multipart/mixed'")).map((r) => r.path.join("."))).toEqual([
        "components.messages.positionReported.contentType",
      ]);
      expect(results.filter((r) => r.path[0] === "operations")).toEqual([]);
    });

    test.each(CONTENT_TYPE_CASES.allowed.map((value) => [value]))("accepts %p", async (value) => {
      expect(await run(matrixDoc([value]))).toEqual([]);
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

    test.each(NON_STRING_CONTENT_TYPES.map((value) => [value]))("rejects the non-string contentType %p", async (value) => {
      const results = only(await linter.run(matrixDoc([value])));
      expect(results.map((r) => r.message)).toEqual([`AAR067: contentType ${JSON.stringify(value)} is not a valid MIME type.`]);
    });

    test("reports non-string and empty values in messages, traits, tuple traits and defaultContentType, and skips null ones", async () => {
      const e = "channels.vehicleEvents.messages";
      const results = only(await linter.run(withVersion(failNonString, version)));
      expect(pathsOf(results)).toEqual(
        [
          "defaultContentType",
          `${e}.arrayType.contentType`,
          `${e}.booleanType.contentType`,
          `${e}.emptyType.contentType`,
          `${e}.falseType.contentType`,
          `${e}.numericType.contentType`,
          `${e}.objectType.contentType`,
          `${e}.traitType.traits.0.contentType`,
          `${e}.traitType.traits.1.0.contentType`,
        ].sort()
      );
      const messages = results.map((r) => r.message);
      expect(messages).toContain("AAR067: defaultContentType 3.1 is not a valid MIME type.");
      expect(messages).toContain("AAR067: contentType {\"mediaType\":\"application/json\"} is not a valid MIME type.");
      expect(messages).toContain("AAR067: Message trait contentType [] is not a valid MIME type.");
    });

    test("validates shared messages, traits and channels once at their definition, and ignores external and dangling refs", async () => {
      expect(await run(failSharedRef)).toEqual(
        [
          "components.channels.imaging.messages.studyCompleted.contentType",
          "components.messageTraits.hl7Envelope.contentType",
          "components.messages.labOrderPlaced.contentType",
        ].sort()
      );
    });

    test("skips null, scalar, array and $ref nodes, message-level oneOf, inline operation and reply messages and 2.x-only structures", async () => {
      expect(await run(okStructuralEdges)).toEqual([]);
    });

    test("checks the message's own contentType but not the members of a message-level oneOf, which 3.x does not define", async () => {
      const doc = {
        asyncapi: version,
        info: { title: "OneOf Leftover", version: "1.0.0" },
        components: {
          messages: { mixed: { contentType: "text/json", oneOf: [{ contentType: "image/png" }, { contentType: "text/html" }] } },
        },
      };
      expect(await run(doc)).toEqual(["components.messages.mixed.contentType"]);
    });

    test("validates channel and message keys starting with x-, which are identifiers in these maps", async () => {
      const doc = {
        asyncapi: version,
        info: { title: "Extension-like Keys", version: "1.0.0" },
        channels: { "x-internal": { address: "internal", messages: { "x-legacy": { contentType: "text/json" } } } },
      };
      expect(await run(doc)).toEqual(["channels.x-internal.messages.x-legacy.contentType"]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(await run(failLargeGenerated.document)).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured allowed-content-types", () => {
    test("a document compliant with the shipped list fails once the list is narrowed to application/json", async () => {
      const configured = await withOptions("application/json");
      expect(await run(okExample, configured)).toEqual(
        [
          `${V}.contentType`,
          `${V}.traits.3.0.contentType`,
          "channels.serviceAlerts.messages.alertRaised.contentType",
          "channels.fareTransactions.messages.fareCharged.contentType",
          "channels.fareTransactions.messages.fareRefunded.contentType",
          "channels.rawFrames.messages.rawFrame.contentType",
          "components.channels.auditTrail.messages.auditLine.contentType",
          "components.messages.stopArrivals.contentType",
          "components.messages.timetable.contentType",
          "components.messages.sensorFrame.contentType",
          "components.messages.gtfsFeed.contentType",
          "components.messages.depotReport.contentType",
          "components.messageTraits.protobufTrait.contentType",
        ].sort()
      );
    });

    test("a failing document keeps only the malformed values and the media types left out of the configured list", async () => {
      const configured = await withOptions(["text/*", "application/jsn", "application/x-ndjson", "image/png", "application/vnd.apache.avro", "multipart/*", "application/json", "application/*+json", "application/yaml"]);
      expect(await run(failExample, configured)).toEqual(
        [
          "channels.serviceAlerts.messages.alertCleared.contentType",
          "components.messageTraits.legacyTrait.contentType",
          "components.messages.depotReport.contentType",
        ].sort()
      );
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

    test.each([
      ["application/vnd.metro.*", ["application/vnd.metro.position.v2+json", "application/vnd.metro.fare.v1+avro"]],
      ["application/*+json , application/*+avro", ["application/cloudevents+json", "application/vnd.metro.position.v2+json", "application/vnd.metro.fare.v1+avro"]],
      ["TEXT/PLAIN;charset=utf-8", ["text/plain; charset=us-ascii"]],
    ])("allowed-content-types %p accepts exactly the matching values", async (value, expected) => {
      const probe = [
        "application/json",
        "application/cloudevents+json",
        "application/vnd.metro.position.v2+json",
        "application/vnd.metro.fare.v1+avro",
        "text/plain; charset=us-ascii",
        "text/json",
      ];
      const configured = await withOptions(value);
      const reported = reportedIndexes(await configured.run(matrixDoc(probe)));
      expect(probe.filter((_, index) => !reported.has(index))).toEqual(expected);
    });

    test.each([[""], [" , "], ["*"], ["application"], [null], [false], [42], [[]], [[7]], [{ "allowed-content-types": "text/json" }]])(
      "falls back to the shipped list when allowed-content-types is %p",
      async (value) => {
        const configured = await withOptions(value);
        expect(await run(failExample, configured)).toEqual(FAIL_EXAMPLE_PATHS);
        expect(await run(okExample, configured)).toEqual([]);
      }
    );
  });
});

describe("AAR067 (AsyncAPI 3.x): version detection", () => {
  test.each([3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"])("treats %p as 3.x", async (version) => {
    const linter = await linterForRule(RULE);
    expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
  });

  test("a 3.x document declared as 2.x is read with the 2.x structure, so its channel messages maps are not visited", async () => {
    const linter = await linterForRule(RULE);
    expect(pathsOf(await linter.run(withVersion(failExample, "2.6.0")))).toEqual(
      [
        "defaultContentType",
        "components.messages.positionReported.contentType",
        "components.messages.depotReport.contentType",
        "components.messageTraits.legacyTrait.contentType",
      ].sort()
    );
  });
});
