const {
  linterForRule,
  LICENSE_FIELDS,
  LICENSE_COMPLETE,
  LICENSE_MINIMAL,
  LICENSE_COMPONENTS,
  LICENSE_VALUE_CASES,
  LICENSE_OBJECT_CASES,
  LICENSE_INFO_CASES,
  LICENSE_IGNORED_OPTIONS,
  LICENSE_MESSAGES: MSG,
  licenseFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR078/ok-example");
const failExample = require("./AAR078/fail-example");
const failSharedRef = require("./AAR078/fail-shared-ref");
const okStructuralEdges = require("./AAR078/ok-structural-edges");
const failLargeGenerated = require("./AAR078/fail-large-generated");

const RULE = "asa:AAR078";
const OMIT = Symbol("omit");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = licenseFindings([
  ["info.license", "missing", "url"],
  ["info.license.name", "empty", "name"],
]);

const SHARED = licenseFindings([
  ["components.x-licenses.openData", "missing", "url"],
  ["components.x-licenses.openData.name", "empty", "name"],
]);

const INFO = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const CHANNELS = {
  "commerce.cdc.orders.placed.v1": {
    description: "Orders placed in the web shop.",
    publish: {
      operationId: "publishOrderPlaced",
      message: { name: "orderPlaced", title: "", payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string" }, url: { type: "string" } } } } } },
    },
  },
};
const base = (info, extra = {}) => ({ asyncapi: "2.6.0", id: "urn:commerce:events", ...(info === OMIT ? {} : { info }), channels: CHANNELS, components: LICENSE_COMPONENTS, ...extra });
const withLicense = (license) => base({ ...INFO, license });

describe("AAR078 (AsyncAPI 2.x): the info license object must populate name and url", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose license populates name and url", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports a missing url at the license object and a blank name at the field, whatever the look-alike keys and the licenses outside info hold", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("does not depend on the asyncapi version: version-like values and 3.x versions give the same findings", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null, "3.0.0", "3.1.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => r.message)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  describe("field values", () => {
    const FIELD_CASES = LICENSE_VALUE_CASES.flatMap(([label, value, populated]) => LICENSE_FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`info.license.${field}`, MSG.empty(field)]];
      expect(findingsOf(await linter.run(withLicense({ ...LICENSE_MINIMAL, [field]: value })))).toEqual(expected);
    });

    test.each(LICENSE_VALUE_CASES)("name and url both set to %s", async (_, value, populated) => {
      const expected = populated ? [] : licenseFindings(LICENSE_FIELDS.map((field) => [`info.license.${field}`, "empty", field]));
      expect(findingsOf(await linter.run(withLicense({ name: value, url: value })))).toEqual(expected);
    });

    test.each(LICENSE_VALUE_CASES)("an identifier and extensions set to %s are never required", async (_, value) => {
      expect(findingsOf(await linter.run(withLicense({ ...LICENSE_MINIMAL, identifier: value, "x-spdx-id": value, "x-legal-review": value })))).toEqual([]);
    });

    test.each([[["name"]], [["url"]], [["name", "url"]]])("reports %j missing at the license object", async (fields) => {
      const license = Object.fromEntries(Object.entries(LICENSE_COMPLETE).filter(([key]) => !fields.includes(key)));
      expect(findingsOf(await linter.run(withLicense(license)))).toEqual(licenseFindings(fields.map((field) => ["info.license", "missing", field])));
    });

    test("does not inspect the other info fields", async () => {
      expect(findingsOf(await linter.run(base({ title: "", version: null, description: " ", termsOfService: "", contact: {}, license: LICENSE_MINIMAL })))).toEqual([]);
    });
  });

  describe("license object", () => {
    test.each(LICENSE_OBJECT_CASES)("%s", async (_, license, expected) => {
      expect(findingsOf(await linter.run(withLicense(license)))).toEqual(licenseFindings(expected));
    });
  });

  describe("info object", () => {
    test.each(LICENSE_INFO_CASES)("%s", async (_, info, expected) => {
      expect(findingsOf(await linter.run(base(info)))).toEqual(licenseFindings(expected));
    });

    test("reports a document without info once, at the document root", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([["", MSG.noInfo()]]);
      expect(findingsOf(await linter.run(base(OMIT, { license: LICENSE_COMPLETE })))).toEqual([["", MSG.noInfo()]]);
    });

    test("licenses outside the info object never stand in for it", async () => {
      const doc = base(INFO, { license: LICENSE_COMPLETE, "x-license": LICENSE_COMPLETE, components: { ...LICENSE_COMPONENTS, license: LICENSE_COMPLETE } });
      expect(findingsOf(await linter.run(doc))).toEqual([["info", MSG.noLicense()]]);
    });

    test("does not read the info or license objects of an external file", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./shared/info.yaml#/info" })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/x-info/external" }, { components: { ...LICENSE_COMPONENTS, "x-info": { external: { $ref: "../commerce/info.json" } } } })))).toEqual([]);
      expect(findingsOf(await linter.run(withLicense({ $ref: "../legal/licenses.json#/apache" })))).toEqual([]);
    });
  });

  describe("functionOptions", () => {
    test.each(LICENSE_IGNORED_OPTIONS)("injecting %s changes nothing: name and url stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(withLicense({ ...LICENSE_MINIMAL, identifier: "", "x-spdx-id": "" })))).toEqual([]);
      expect(findingsOf(await custom.run(withLicense({ identifier: "Apache-2.0", "x-spdx-id": "Apache-2.0" })))).toEqual(
        licenseFindings(LICENSE_FIELDS.map((field) => ["info.license", "missing", field]))
      );
      expect(findingsOf(await custom.run(base(OMIT)))).toEqual([["", MSG.noInfo()]]);
    });
  });

  test("follows chained local references from info, from license and from its fields, and skips external ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects info.license: license-like servers, channels, operations, messages, traits, schemas, examples, tags and extensions are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ info: { license: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", info: { license: {} } }]))).toEqual([]);
  });

  test("handles a very large document with a huge license object and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(licenseFindings(failLargeGenerated.expected));
    expect(findingsOf(await linter.run(failLargeGenerated.withoutLicense))).toEqual(licenseFindings(failLargeGenerated.expectedWithoutLicense));
  });
});
