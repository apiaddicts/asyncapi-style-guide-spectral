const {
  linterForRule,
  SPDX_URL,
  SPDX_MINIMAL,
  SPDX_INFO,
  SPDX_VALID_IDS,
  SPDX_DEPRECATED_IDS,
  SPDX_COMPONENTS,
  SPDX_NAME_CASES,
  SPDX_EMPTY_NAMES,
  SPDX_LICENSE_CASES,
  SPDX_INFO_CASES,
  SPDX_IGNORED_OPTIONS,
  spdxFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR080/ok-example");
const failExample = require("./AAR080/fail-example");
const failSharedRef = require("./AAR080/fail-shared-ref");
const okStructuralEdges = require("./AAR080/ok-structural-edges");
const failLargeGenerated = require("./AAR080/fail-large-generated");

const RULE = "asa:AAR080";
const OMIT = Symbol("omit");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = spdxFindings([["info.license.name", "invalid", "Apache License, Version 2.0"]]);
const SHARED = spdxFindings([["components.x-licenses.openData.name", "suggest", "odbl 1.0", "ODbL-1.0"]]);

const CHANNELS = {
  "commerce.cdc.orders.placed.v1": {
    description: "Orders placed in the web shop.",
    publish: {
      operationId: "publishOrderPlaced",
      message: { name: "orderPlaced", payload: { type: "object", properties: { license: { type: "object", properties: { name: { type: "string", enum: ["Apache 2.0"] } } } } } },
    },
  },
};
const base = (info, extra = {}) => ({ asyncapi: "2.6.0", id: "urn:commerce:events", ...(info === OMIT ? {} : { info }), channels: CHANNELS, components: SPDX_COMPONENTS, ...extra });
const withLicense = (license) => base({ ...SPDX_INFO, license });
const withName = (name) => withLicense({ name, url: SPDX_URL });

describe("AAR080 (AsyncAPI 2.x): the info license name must be an SPDX License List identifier", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic Kafka, AMQP, MQTT and WebSocket document whose license name is an SPDX identifier", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports a descriptive license name at the name field, whatever the identifier, the look-alike keys and the licenses outside info hold", async () => {
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

  test("reports once with the error severity", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe(0);
  });

  describe("license names", () => {
    test.each(SPDX_VALID_IDS)("accepts the SPDX identifier %s", async (id) => {
      expect(findingsOf(await linter.run(withName(id)))).toEqual([]);
    });

    test.each(SPDX_DEPRECATED_IDS)("accepts the deprecated SPDX identifier %s", async (id) => {
      expect(findingsOf(await linter.run(withName(id)))).toEqual([]);
    });

    test.each(SPDX_NAME_CASES)("a name set to %s", async (_, name, expected) => {
      expect(findingsOf(await linter.run(withName(name)))).toEqual(expected === null ? [] : spdxFindings([["info.license.name", ...expected]]));
    });

    test.each(SPDX_EMPTY_NAMES)("a name set to %s is left to AAR078", async (_, name) => {
      expect(findingsOf(await linter.run(withName(name)))).toEqual([]);
    });

    test("a license without name is left to AAR078, whatever its identifier, extensions and look-alike keys hold", async () => {
      expect(findingsOf(await linter.run(withLicense({ url: SPDX_URL, identifier: "Apache License 2.0", "x-name": "Proprietary", Name: "Apache 2.0", NAME: "MIT License", title: "GPL" })))).toEqual([]);
    });

    test("only the name is checked: the url, the identifier and the extensions never change the finding", async () => {
      const expected = spdxFindings([["info.license.name", "suggest", "apache 2.0", "Apache-2.0"]]);
      expect(findingsOf(await linter.run(withLicense({ name: "apache 2.0", url: "Apache-2.0", identifier: "Apache-2.0", "x-spdx-id": "Apache-2.0" })))).toEqual(expected);
      expect(findingsOf(await linter.run(withLicense({ name: "Apache-2.0", url: "Apache License 2.0", identifier: "Apache License 2.0", "x-spdx-id": "Proprietary" })))).toEqual([]);
    });

    test("does not inspect the other info fields", async () => {
      expect(findingsOf(await linter.run(base({ title: "Apache 2.0", version: "Apache License 2.0", description: "MIT License", termsOfService: "Proprietary", contact: { name: "Apache 2.0" }, license: SPDX_MINIMAL })))).toEqual([]);
    });
  });

  describe("license object", () => {
    test.each(SPDX_LICENSE_CASES)("%s", async (_, license, expected) => {
      expect(findingsOf(await linter.run(withLicense(license)))).toEqual(spdxFindings(expected));
    });
  });

  describe("info object", () => {
    test.each(SPDX_INFO_CASES)("%s", async (_, info, expected) => {
      expect(findingsOf(await linter.run(base(info)))).toEqual(spdxFindings(expected));
    });

    test("a document without info is left to AAR078", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run(base(OMIT, { license: { name: "Apache 2.0" } })))).toEqual([]);
    });

    test("licenses outside the info object are never checked", async () => {
      const doc = base(SPDX_INFO, { license: { name: "Apache 2.0" }, "x-license": { name: "Proprietary" }, components: { ...SPDX_COMPONENTS, license: { name: "MIT License" } } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });
  });

  describe("functionOptions", () => {
    test.each(SPDX_IGNORED_OPTIONS)("injecting %s changes nothing: the SPDX License List stays the only allowed values", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withName("GPL-3.0")))).toEqual([]);
      expect(findingsOf(await custom.run(withName("Proprietary")))).toEqual(spdxFindings([["info.license.name", "invalid", "Proprietary"]]));
      expect(findingsOf(await custom.run(withName("apache-2.0")))).toEqual(spdxFindings([["info.license.name", "suggest", "apache-2.0", "Apache-2.0"]]));
      expect(findingsOf(await custom.run(withName("MIT OR Apache-2.0")))).toEqual(spdxFindings([["info.license.name", "invalid", "MIT OR Apache-2.0"]]));
    });
  });

  test("follows chained local references from info, from license and from its name, and reports where the license is defined", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects info.license.name: license-like servers, channels, parameters, operations, messages, traits, Avro and JSON schemas, examples, bindings, tags and extensions are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ info: { license: { name: "Apache 2.0" } } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", info: { license: { name: "Apache 2.0" } } }]))).toEqual([]);
  });

  test("handles a very large document with a huge license name and reports it once, truncated", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(spdxFindings(failLargeGenerated.expected));
    expect(findingsOf(await linter.run(failLargeGenerated.withSpdxName))).toEqual([]);
    expect(findingsOf(await linter.run(failLargeGenerated.withLowerCaseName))).toEqual(spdxFindings(failLargeGenerated.expectedLowerCase));
  });
});
