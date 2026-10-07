const { linterForRule, CASING_TYPES, CASING_VALUES, isValidCasing } = require("../../helpers/utils");
const okExample = require("./AAR066/ok-example");
const failExample = require("./AAR066/fail-example");
const failNonString = require("./AAR066/fail-non-string");
const okStructuralEdges = require("./AAR066/ok-structural-edges");
const failLargeGenerated = require("./AAR066/fail-large-generated");

const RULE = "asa:AAR066";
const A = "channels.payments.authorized";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL_EXAMPLE_PATHS = [
  "servers.rabbitProduction.tags.1.name",
  "tags.0.name",
  "tags.1.name",
  `${A}.publish.tags.0.name`,
  `${A}.publish.traits.1.tags.0.name`,
  `${A}.publish.message.tags.0.name`,
  `${A}.publish.message.traits.1.tags.0.name`,
  `${A}.subscribe.message.oneOf.1.tags.1.name`,
  "components.servers.kafkaProduction.tags.0.name",
  "components.channels.refunds.subscribe.tags.0.name",
  "components.channels.refunds.subscribe.message.tags.0.name",
  "components.messages.paymentDeclined.tags.0.name",
  "components.operationTraits.amqpPublisher.tags.0.name",
  "components.messageTraits.auditable.tags.0.name",
].sort();

describe("AAR066 (AsyncAPI 2.x): tag names must follow the configured casing", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("default type (kebab)", () => {
    test("passes when every tag name is kebab-case, ignoring payload, example, binding, extension and 3.x-only tags", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports root, server, operation, operation trait, message, message trait, oneOf and components tags", async () => {
      expect(pathsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])(
      "reports the same findings on AsyncAPI %s",
      async (version) => {
        expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      }
    );

    test("treats a version that is not 3.x as 2.x", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null, { major: 3 }]) {
        expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test("reports the exact message and severity", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r]));
      expect(byPath["tags.0.name"].message).toBe(
        "AAR066: Tag name 'Payments' must be kebab-case."
      );
      expect(byPath["components.messageTraits.auditable.tags.0.name"].message).toBe(
        "AAR066: Tag name 'audit trail' must be kebab-case."
      );
      results.forEach((r) => expect(r.severity).toBe(1));
    });

    test("reports non-string and empty names and plain-string tags, and skips null, missing and non-tag items", async () => {
      const results = only(await linter.run(failNonString));
      expect(pathsOf(results)).toEqual(
        ["tags.0.name", "tags.1.name", "tags.2.name", "tags.3.name", "tags.4.name", "tags.7"].sort()
      );
      const messages = results.map((r) => r.message);
      expect(messages).toContain("AAR066: Tag name 2024 must be kebab-case.");
      expect(messages).toContain(
        "AAR066: Tag name 'Plain String Tag' must be kebab-case."
      );
    });

    test("skips null, scalar, $ref and extension nodes, non-array tags and traits, and tags next to a oneOf", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(pathsOf(await linter.run("42"))).toEqual([]);
      expect(pathsOf(await linter.run([{ asyncapi: "2.6.0", tags: [{ name: "Bad Tag" }] }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured naming-convention", () => {
    const docWith = (values) => ({
      asyncapi: "2.6.0",
      info: { title: "Casing Matrix", version: "1.0.0" },
      tags: values.map((name) => ({ name })),
    });

    test.each(CASING_TYPES)("naming-convention '%s' agrees with Spectral's core casing function on every value", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const reported = new Set(pathsOf(await configured.run(docWith(CASING_VALUES))));
      CASING_VALUES.forEach((value, index) => {
        expect([value, reported.has(`tags.${index}.name`)]).toEqual([value, !isValidCasing(value, type)]);
      });
    });

    test.each([
      ["camel", "customerAccounts", "customer-accounts", "camelCase"],
      ["snake", "customer_accounts", "customer-accounts", "snake_case"],
      ["pascal", "CustomerAccounts", "customerAccounts", "PascalCase"],
    ])("naming-convention '%s' accepts %s, rejects %s and names the casing in the message", async (type, good, bad, label) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const results = only(await configured.run(docWith([good, bad])));
      expect(pathsOf(results)).toEqual(["tags.1.name"]);
      expect(results[0].message).toBe(`AAR066: Tag name '${bad}' must be ${label}.`);
    });

    test.each([
      ["camelCase", "camel"],
      ["Camel", "camel"],
      ["snake_case", "snake"],
      ["kebab-case", "kebab"],
      [" KEBAB ", "kebab"],
      ["PascalCase", "pascal"],
      ["UpperCamelCase", "pascal"],
      ["lowerCamelCase", "camel"],
    ])("accepts the alias '%s' as '%s'", async (alias, type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": alias } });
      const expected = CASING_VALUES.map((value, index) => (isValidCasing(value, type) ? null : `tags.${index}.name`))
        .filter((p) => p !== null)
        .sort();
      expect(pathsOf(await configured.run(docWith(CASING_VALUES)))).toEqual(expected);
    });

    test.each([["upper"], ["macro"], ["COBOL-CASE"], ["cobol"], ["flat"], ["flat_case"], [""], ["   "], ["train-case"], [null], [0], [false], [["camel"]], [{}]])(
      "falls back to kebab-case when naming-convention is %p",
      async (type) => {
        const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
        expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await configured.run(okExample))).toEqual([]);
      }
    );

    test("a document compliant with kebab reports only its multi-word tags once naming-convention is switched to camel", async () => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": "camel" } });
      expect(pathsOf(await configured.run(okExample))).toEqual(
        [
          "servers.rabbitProduction.tags.1.name",
          "tags.1.name",
          "tags.2.name",
          `${A}.publish.tags.1.name`,
          `${A}.publish.message.tags.0.name`,
          `${A}.publish.message.traits.1.tags.0.name`,
          "components.channels.refunds.subscribe.message.tags.0.name",
          "components.messageTraits.auditable.tags.0.name",
        ].sort()
      );
    });
  });
});
