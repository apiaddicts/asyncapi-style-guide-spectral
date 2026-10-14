const {
  linterForRule,
  INFO_DEFAULT_FIELDS,
  INFO_V2_FIELDS,
  INFO_COMPONENTS,
  INFO_VALUE_CASES,
  INFO_OBJECT_CASES,
  INFO_PROBE,
  INFO_OPTION_CASES,
  INFO_MESSAGES: MSG,
  infoFieldsFor,
  infoProbeFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR075/ok-example");
const failExample = require("./AAR075/fail-example");
const failSharedRef = require("./AAR075/fail-shared-ref");
const okStructuralEdges = require("./AAR075/ok-structural-edges");
const failLargeGenerated = require("./AAR075/fail-large-generated");

const RULE = "asa:AAR075";
const FULL_FIELDS = ["title", "version", "description", "termsOfService", "contact", "license", "tags", "externalDocs", "x-audience", "x-api-id"];
const FULL = { "fields-to-apply": FULL_FIELDS.join(",") };
const FULL_V2 = infoFieldsFor(FULL_FIELDS, false);
const OPTIONAL_FIELDS = ["termsOfService", "contact", "license", "x-audience", "x-api-id"];
const OMIT = Symbol("omit");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const toFindings = (expected, fields = INFO_DEFAULT_FIELDS) => expected.map(([path, kind, field]) => [path, kind === "invalid" ? MSG.invalid(fields) : MSG[kind](field)]).sort(byPath);

const FAIL_DEFAULT = [
  ["info", MSG.missing("description")],
  ["info.version", MSG.empty("version")],
].sort(byPath);

const FAIL_FULL = [
  ...FAIL_DEFAULT,
  ["info.termsOfService", MSG.empty("termsOfService")],
  ["info.contact", MSG.empty("contact")],
  ["info.license", MSG.empty("license")],
  ["info.x-audience", MSG.empty("x-audience")],
].sort(byPath);

const SHARED = "components.x-shared-info.paymentsBase";
const SHARED_DEFAULT = [
  [SHARED, MSG.missing("title")],
  [`${SHARED}.description`, MSG.empty("description")],
].sort(byPath);

const SHARED_FULL = [...SHARED_DEFAULT, [`${SHARED}.termsOfService`, MSG.empty("termsOfService")], [`${SHARED}.x-audience`, MSG.empty("x-audience")]].sort(byPath);

const COMPLETE = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const CHANNELS = {
  "commerce.cdc.orders.placed.v1": {
    description: "Orders placed in the web shop.",
    publish: { operationId: "publishOrderPlaced", message: { name: "orderPlaced", title: "", payload: { type: "object", properties: { info: { type: "object" } } } } },
  },
};
const base = (info, extra = {}) => ({ asyncapi: "2.6.0", id: "urn:commerce:events", ...(info === OMIT ? {} : { info }), channels: CHANNELS, components: INFO_COMPONENTS, ...extra });

const MISSING_SETS = [["title"], ["version"], ["description"], ["title", "version"], ["title", "description"], ["version", "description"], INFO_DEFAULT_FIELDS];
const without = (fields) => Object.fromEntries(Object.entries(COMPLETE).filter(([key]) => !fields.includes(key)));

describe("AAR075 (AsyncAPI 2.x): the info object must populate its mandatory fields", () => {
  let linter;
  let full;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    full = await linterForRule(RULE, { functionOptions: FULL });
  });

  test("passes a realistic multi-protocol document whose info object populates every field", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
    expect(findingsOf(await full.run(okExample))).toEqual([]);
  });

  test("reports a missing description and a blank version at the info object and at the field", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_DEFAULT);
  });

  test("with every info field required, also reports empty, null and blank optional fields, but never the 3.x-only tags and externalDocs", async () => {
    expect(findingsOf(await full.run(failExample))).toEqual(FAIL_FULL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    expect(findingsOf(await full.run(withVersion(failExample, version)))).toEqual(FAIL_FULL);
    expect(findingsOf(await full.run(withVersion(failSharedRef, version)))).toEqual(SHARED_FULL);
    expect(findingsOf(await full.run(withVersion(okExample, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
      expect(findingsOf(await full.run(withVersion(failExample, version)))).toEqual(FAIL_FULL);
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await full.run(failExample));
    expect(results).toHaveLength(FAIL_FULL.length);
    expect(new Set(results.map((r) => r.message)).size).toBe(FAIL_FULL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  describe("field values", () => {
    const DEFAULT_FIELD_CASES = INFO_VALUE_CASES.flatMap(([label, value, populated]) => INFO_DEFAULT_FIELDS.map((field) => [field, label, value, populated]));

    test.each(DEFAULT_FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`info.${field}`, MSG.empty(field)]];
      expect(findingsOf(await linter.run(base({ ...COMPLETE, [field]: value })))).toEqual(expected);
    });

    test.each(INFO_VALUE_CASES)("termsOfService, contact, license and extensions set to %s, with every field required", async (_, value, populated) => {
      const info = { ...COMPLETE, ...Object.fromEntries(OPTIONAL_FIELDS.map((field) => [field, value])) };
      const expected = populated ? [] : OPTIONAL_FIELDS.map((field) => [`info.${field}`, MSG.empty(field)]).sort(byPath);
      expect(findingsOf(await full.run(base(info)))).toEqual(expected);
      expect(findingsOf(await linter.run(base(info)))).toEqual([]);
    });

    test.each(MISSING_SETS)("reports %s missing at the info object", async (...fields) => {
      const expected = fields.map((field) => ["info", MSG.missing(field)]).sort(byPath);
      expect(findingsOf(await linter.run(base(without(fields))))).toEqual(expected);
    });

    test("does not inspect the optional fields with the shipped options", async () => {
      expect(findingsOf(await linter.run(base({ ...COMPLETE, termsOfService: "", contact: {}, license: null, "x-audience": " " })))).toEqual([]);
    });

    test("matches field names case-sensitively in the document", async () => {
      const info = { Title: "Commerce Events", VERSION: "4.2.0", Description: "Order events.", termsofservice: "https://commerce.example.io/terms" };
      expect(findingsOf(await linter.run(base(info)))).toEqual(INFO_DEFAULT_FIELDS.map((field) => ["info", MSG.missing(field)]).sort(byPath));
      expect(findingsOf(await full.run(base({ ...COMPLETE, termsofservice: "https://commerce.example.io/terms", Contact: { name: "Ops" } })))).toEqual(
        ["termsOfService", "contact", "license", "x-audience", "x-api-id"].map((field) => ["info", MSG.missing(field)]).sort(byPath)
      );
    });

    test("ignores info.tags and info.externalDocs even when they are required, and the root tags and externalDocs never stand in for them", async () => {
      const doc = base({ ...COMPLETE, termsOfService: "https://commerce.example.io/terms", contact: { name: "Ops" }, license: { name: "MIT" }, "x-audience": "public", "x-api-id": "a1", tags: [], externalDocs: {} });
      expect(findingsOf(await full.run(doc))).toEqual([]);
      const only3x = await linterForRule(RULE, { functionOptions: { "fields-to-apply": "tags,externalDocs" } });
      expect(findingsOf(await only3x.run(base(COMPLETE, { tags: [{ name: "orders" }], externalDocs: { url: "https://commerce.example.io/docs" } })))).toEqual([]);
      expect(findingsOf(await only3x.run(base(OMIT)))).toEqual([]);
    });
  });

  describe("info object", () => {
    test.each(INFO_OBJECT_CASES)("%s", async (_, info, expected) => {
      expect(findingsOf(await linter.run(base(info)))).toEqual(toFindings(expected));
    });

    test.each(INFO_OBJECT_CASES.filter(([, , expected]) => expected.some(([, kind]) => kind === "invalid")))("%s lists every required 2.x field in the message", async (_, info) => {
      expect(findingsOf(await full.run(base(info)))).toEqual([["info", MSG.invalid(FULL_V2)]]);
    });

    test("reports a document without info once, at the document root", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([["", MSG.invalid()]]);
      expect(findingsOf(await full.run(base(OMIT)))).toEqual([["", MSG.invalid(FULL_V2)]]);
    });

    test("does not read the info object of an external file", async () => {
      expect(findingsOf(await full.run(base({ $ref: "./shared/info.yaml#/info" })))).toEqual([]);
      expect(findingsOf(await full.run(base({ $ref: "#/components/x-info/external" }, { components: { ...INFO_COMPONENTS, "x-info": { external: { $ref: "../commerce/info.json" } } } })))).toEqual([]);
    });
  });

  describe("fields-to-apply option", () => {
    test.each(INFO_OPTION_CASES)("%s", async (_, value, effective) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      expect(findingsOf(await custom.run(base(INFO_PROBE)))).toEqual(infoProbeFindings(effective, false).sort(byPath));
    });

    test.each(INFO_OPTION_CASES)("%s, on a document without info", async (_, value, effective) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      const fields = infoFieldsFor(effective, false);
      expect(findingsOf(await custom.run(base(OMIT)))).toEqual(fields.length === 0 ? [] : [["", MSG.invalid(fields)]]);
    });

    test("ships title, version and description", async () => {
      expect(findingsOf(await linter.run(base(INFO_PROBE)))).toEqual(infoProbeFindings(INFO_DEFAULT_FIELDS, false).sort(byPath));
    });

    test("a rule served without fields-to-apply requires the defaults", async () => {
      const unset = await linterForRule(RULE, { functionOptions: { "fields-to-apply": undefined } });
      expect(findingsOf(await unset.run(failExample))).toEqual(FAIL_DEFAULT);
    });

    test("requires the 2.x fixed fields in the order they are configured", async () => {
      const reversed = await linterForRule(RULE, { functionOptions: { "fields-to-apply": [...INFO_V2_FIELDS].reverse().join(",") } });
      expect(findingsOf(await reversed.run(base(OMIT)))).toEqual([["", MSG.invalid([...INFO_V2_FIELDS].reverse())]]);
    });
  });

  test("follows chained local references from info and from its fields, and skips external ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED_DEFAULT);
    expect(findingsOf(await full.run(failSharedRef))).toEqual(SHARED_FULL);
  });

  test("only inspects the root info object: info-like channels, operations, messages, schemas, payload properties, examples and extensions are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    expect(findingsOf(await full.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await full.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await full.run({ info: {} }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", info: {} }]))).toEqual([]);
  });

  test("handles a very large document with hundreds of required extensions and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expectedDefault));
    const many = await linterForRule(RULE, { functionOptions: { "fields-to-apply": failLargeGenerated.fullOption } });
    expect(findingsOf(await many.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expectedFull));
  });
});
