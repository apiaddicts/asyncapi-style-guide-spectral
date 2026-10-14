const {
  linterForRule,
  INFO_DEFAULT_FIELDS,
  INFO_COMPONENTS,
  INFO_VALUE_CASES,
  INFO_OBJECT_CASES,
  INFO_PROBE,
  INFO_OPTION_CASES,
  INFO_MESSAGES: MSG,
  infoProbeFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR075/ok-example");
const failExample = require("./AAR075/fail-example");
const failSharedRef = require("./AAR075/fail-shared-ref");
const okStructuralEdges = require("./AAR075/ok-structural-edges");
const failLargeGenerated = require("./AAR075/fail-large-generated");

const RULE = "asa:AAR075";
const FULL = { "fields-to-apply": "title,version,description,termsOfService,contact,license,tags,externalDocs,x-audience,x-api-id" };
const OPTIONAL_FIELDS = ["termsOfService", "contact", "license", "tags", "externalDocs", "x-audience", "x-api-id"];
const NO_INFO = "AAR075: The document must declare an 'info' object with the mandatory fields 'title', 'version' and 'description'.";
const OMIT = Symbol("omit");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const toFindings = (expected) => expected.map(([path, kind, field]) => [path, MSG[kind](field)]).sort(byPath);

const FAIL_DEFAULT = [
  ["info", MSG.missing("version")],
  ["info.description", MSG.empty("description")],
].sort(byPath);

const SHARED = "components.x-shared-info.instantPaymentsBase";
const SHARED_DEFAULT = [[SHARED, MSG.missing("version")]];

const UNRELATED_OPTIONS = [
  ["an empty object", {}],
  ["a camelCase fields-to-apply key", { fieldsToApply: "tags,externalDocs" }],
  ["a properties list", { properties: ["contact", "license"] }],
  ["a required-fields list", { "required-fields": "tags" }],
  ["a field option", { field: "externalDocs" }],
  ["a pattern", { pattern: "^x-" }],
  ["null and non-string values", { properties: null, pattern: 42, field: true }],
];

const COMPLETE = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const CHANNELS = {
  orderPlaced: { address: "commerce.cdc.orders.placed.v1", title: "", messages: { orderPlaced: { name: "orderPlaced", title: "", payload: { type: "object", properties: { info: { type: "object" } } } } } },
};
const OPERATIONS = { publishOrderPlaced: { action: "send", title: "", channel: { $ref: "#/channels/orderPlaced" } } };
const base = (info, extra = {}) => ({
  asyncapi: "3.0.0",
  id: "urn:commerce:events",
  ...(info === OMIT ? {} : { info }),
  channels: CHANNELS,
  operations: OPERATIONS,
  components: INFO_COMPONENTS,
  ...extra,
});

const MISSING_SETS = [["title"], ["version"], ["description"], ["title", "version"], ["title", "description"], ["version", "description"], INFO_DEFAULT_FIELDS];
const without = (fields) => Object.fromEntries(Object.entries(COMPLETE).filter(([key]) => !fields.includes(key)));

describe("AAR075 (AsyncAPI 3.x): the info object must populate its mandatory fields", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic WebSocket and Kafka document whose info object populates every field, tags and externalDocs included", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports a missing version and a whitespace-only description at the info object and at the field", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_DEFAULT);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED_DEFAULT);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
  });

  test("reports the same findings whatever the asyncapi value, the same document read as AsyncAPI 2.6 included", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0", "3.2.0", "4.0.0", "2.6.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL_DEFAULT.length);
    expect(new Set(results.map((r) => r.message)).size).toBe(FAIL_DEFAULT.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  describe("field values", () => {
    const DEFAULT_FIELD_CASES = INFO_VALUE_CASES.flatMap(([label, value, populated]) => INFO_DEFAULT_FIELDS.map((field) => [field, label, value, populated]));

    test.each(DEFAULT_FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`info.${field}`, MSG.empty(field)]];
      expect(findingsOf(await linter.run(base({ ...COMPLETE, [field]: value })))).toEqual(expected);
    });

    test.each(INFO_VALUE_CASES)("never inspects termsOfService, contact, license, tags, externalDocs and extensions set to %s", async (_, value) => {
      const info = { ...COMPLETE, ...Object.fromEntries(OPTIONAL_FIELDS.map((field) => [field, value])) };
      expect(findingsOf(await linter.run(base(info)))).toEqual([]);
    });

    test.each(MISSING_SETS)("reports %s missing at the info object", async (...fields) => {
      const expected = fields.map((field) => ["info", MSG.missing(field)]).sort(byPath);
      expect(findingsOf(await linter.run(base(without(fields))))).toEqual(expected);
    });

    test("does not inspect the optional fields", async () => {
      expect(findingsOf(await linter.run(base({ ...COMPLETE, termsOfService: "", contact: {}, license: null, tags: [], externalDocs: {}, "x-audience": " " })))).toEqual([]);
    });

    test("matches field names case-sensitively in the document", async () => {
      const info = { Title: "Commerce Events", VERSION: "4.2.0", Description: "Order events.", Tags: [{ name: "orders" }], externaldocs: { url: "https://commerce.example.io/docs" } };
      expect(findingsOf(await linter.run(base(info)))).toEqual(INFO_DEFAULT_FIELDS.map((field) => ["info", MSG.missing(field)]).sort(byPath));
    });
  });

  describe("info object", () => {
    test.each(INFO_OBJECT_CASES)("%s", async (_, info, expected) => {
      expect(findingsOf(await linter.run(base(info)))).toEqual(toFindings(expected));
    });

    test("reports a document without info once, at the document root", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([["", NO_INFO]]);
    });

    test("does not read the info object of an external file", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./shared/info.yaml#/info" })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/x-info/external" }, { components: { ...INFO_COMPONENTS, "x-info": { external: { $ref: "../commerce/info.json" } } } })))).toEqual([]);
    });
  });

  describe("functionOptions", () => {
    test("requires title, version and description", async () => {
      expect(findingsOf(await linter.run(base(INFO_PROBE)))).toEqual(infoProbeFindings().sort(byPath));
    });

    test.each(INFO_OPTION_CASES)("an injected fields-to-apply %s changes nothing", async (_, value) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      expect(findingsOf(await custom.run(base(INFO_PROBE)))).toEqual(infoProbeFindings().sort(byPath));
    });

    test.each(INFO_OPTION_CASES)("an injected fields-to-apply %s changes nothing on a document without info", async (_, value) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      expect(findingsOf(await custom.run(base(OMIT)))).toEqual([["", NO_INFO]]);
    });

    test("an injected fields-to-apply listing every info field changes nothing on the realistic, shared and structural documents", async () => {
      const custom = await linterForRule(RULE, { functionOptions: FULL });
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL_DEFAULT);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED_DEFAULT);
      expect(findingsOf(await custom.run(okStructuralEdges))).toEqual([]);
    });

    test.each(UNRELATED_OPTIONS)("ignores options unrelated to the rule: %s", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL_DEFAULT);
    });
  });

  test("follows chained local references from info and from its fields, and skips external ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED_DEFAULT);
  });

  test("only inspects the root info object: info-like servers, channels, operations, replies, messages, schemas, tags, externalDocs and extensions are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", info: {} }]))).toEqual([]);
  });

  test("handles a very large document with a huge tags list and hundreds of extensions it ignores and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expected));
  });
});
