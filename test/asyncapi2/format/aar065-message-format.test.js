const { linterForRule, CASING_TYPES, CASING_VALUES, isValidCasing } = require("../../helpers/utils");
const okExample = require("./AAR065/ok-example");
const failExample = require("./AAR065/fail-example");
const failNonString = require("./AAR065/fail-non-string");
const failTraitsDeclarationSite = require("./AAR065/fail-traits-declaration-site");
const okStructuralEdges = require("./AAR065/ok-structural-edges");
const okNoAsyncapi = require("./AAR065/ok-no-asyncapi");
const failLargeGenerated = require("./AAR065/fail-large-generated");

const RULE = "asa:AAR065";
const P = "channels.retail.cmd.orders.placed.v1";
const C = "channels.retail.cdc.payments.captured.v1";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL_EXAMPLE_PATHS = [
  `${C}.subscribe.message.messageId`,
  `${C}.subscribe.message.name`,
  `${P}.publish.message.messageId`,
  `${P}.publish.message.name`,
  `${P}.publish.message.traits.1.messageId`,
  `${P}.publish.message.traits.1.name`,
  `${P}.subscribe.message.oneOf.1.messageId`,
  `${P}.subscribe.message.oneOf.2.name`,
  "components.channels.auditChannel.publish.message.messageId",
  "components.messageTraits.commonHeaders.messageId",
  "components.messageTraits.commonHeaders.name",
  "components.messages.orderShipped.name",
].sort();

describe("AAR065 (AsyncAPI 2.x): messageId and message name must follow the configured casing", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("default type (camel)", () => {
    test("passes when every messageId and name is camelCase, ignoring payload, header, example, binding and extension names", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("does not validate components.messages keys in 2.x, where messageId is a field", async () => {
      const results = await linter.run(okExample);
      expect(pathsOf(results).filter((p) => p.includes("OrderShipped"))).toEqual([]);
    });

    test("reports every messageId and name that is not camelCase, in channels, oneOf, traits and components", async () => {
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
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
        expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test("reports the exact message, severity and path of each finding", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r]));
      expect(byPath[`${P}.publish.message.messageId`].message).toBe(
        "AAR065: messageId 'OrderPlaced' must be camelCase."
      );
      expect(byPath[`${P}.publish.message.name`].message).toBe(
        "AAR065: Message name 'order_placed' must be camelCase."
      );
      expect(byPath[`${P}.publish.message.traits.1.messageId`].message).toBe(
        "AAR065: Message trait messageId 'order-placed-trait' must be camelCase."
      );
      expect(byPath["components.messageTraits.commonHeaders.name"].message).toBe(
        "AAR065: Message trait name 'Common Headers' must be camelCase."
      );
      results.forEach((r) => expect(r.severity).toBe(1));
    });

    test("reports non-string and empty values, and skips null ones", async () => {
      const base = "channels.inventory/stock.publish.message.oneOf";
      const results = only(await linter.run(failNonString));
      expect(pathsOf(results)).toEqual(
        [
          `${base}.0.messageId`,
          `${base}.0.name`,
          `${base}.1.messageId`,
          `${base}.1.name`,
          `${base}.2.messageId`,
          `${base}.2.name`,
          `${base}.4.messageId`,
        ].sort()
      );
      const messages = results.map((r) => r.message);
      expect(messages).toContain("AAR065: messageId 1001 must be camelCase.");
      expect(messages).toContain("AAR065: Message name true must be camelCase.");
      expect(messages).toContain("AAR065: messageId '' must be camelCase.");
      expect(messages).toContain(
        "AAR065: messageId {\"value\":\"stockAdjusted\"} must be camelCase."
      );
      expect(messages).toContain(
        "AAR065: Message name [\"stockAdjusted\"] must be camelCase."
      );
    });

    test("reports each value where it is declared, whatever the trait merge order, and a shared trait only once", async () => {
      expect(pathsOf(await linter.run(failTraitsDeclarationSite))).toEqual(
        [
          "channels.customers/deleted.subscribe.message.messageId",
          "channels.customers/registered.subscribe.message.traits.0.name",
          "components.messageTraits.auditTrait.messageId",
        ].sort()
      );
    });

    test("validates components.messageTraits even when components.messages is absent or not a map", async () => {
      for (const messages of [undefined, null, "notAMap", [{ messageId: "Not_Evaluated" }]]) {
        const doc = {
          asyncapi: "2.6.0",
          info: { title: "Traits Only", version: "1.0.0" },
          components: { messages, messageTraits: { kafkaKey: { messageId: "Kafka_Key", name: "kafkaKey" } } },
        };
        expect(pathsOf(await linter.run(doc))).toEqual(["components.messageTraits.kafkaKey.messageId"]);
      }
    });

    test("skips null, scalar, array, $ref and extension nodes, nested oneOf wrappers and 3.x-only structures", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      expect(pathsOf(await linter.run(okNoAsyncapi))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(pathsOf(await linter.run("42"))).toEqual([]);
      expect(pathsOf(await linter.run([{ asyncapi: "2.6.0" }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured naming-convention", () => {
    const docWith = (values) => ({
      asyncapi: "2.6.0",
      info: { title: "Casing Matrix", version: "1.0.0" },
      components: {
        messages: Object.fromEntries(values.map((value, index) => [`m${index}`, { messageId: value, name: value }])),
      },
    });

    test.each(CASING_TYPES)("naming-convention '%s' agrees with Spectral's core casing function on every value", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const reported = new Set(
        only(await configured.run(docWith(CASING_VALUES))).map((r) => `${r.path[2]}.${r.path[3]}`)
      );
      CASING_VALUES.forEach((value, index) => {
        const valid = isValidCasing(value, type);
        expect([value, reported.has(`m${index}.messageId`)]).toEqual([value, !valid]);
        expect([value, reported.has(`m${index}.name`)]).toEqual([value, !valid]);
      });
    });

    test("pins the camel semantics of Spectral's casing: no consecutive uppercase letters", async () => {
      const results = only(await linter.run(docWith(["userId", "userID", "user2fa", "userSignedUpV2", "UserId"])));
      expect(results.map((r) => r.path.slice(2).join(".")).sort()).toEqual([
        "m1.messageId",
        "m1.name",
        "m4.messageId",
        "m4.name",
      ]);
    });

    test.each([
      ["snake", "order_placed", "orderPlaced", "snake_case"],
      ["kebab", "order-placed", "order_placed", "kebab-case"],
      ["pascal", "OrderPlaced", "orderPlaced", "PascalCase"],
    ])("naming-convention '%s' accepts %s, rejects %s and names the casing in the message", async (type, good, bad, label) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const results = only(await configured.run(docWith([good, bad])));
      expect(results.map((r) => r.path.slice(2).join(".")).sort()).toEqual(["m1.messageId", "m1.name"]);
      expect(results[0].message).toBe(`AAR065: messageId '${bad}' must be ${label}.`);
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
      const expected = CASING_VALUES.filter((value) => !isValidCasing(value, type)).length * 2;
      expect(results.length).toBe(expected);
    });

    test.each([["upper"], ["macro"], ["MACRO_CASE"], ["cobol"], ["flat"], ["flatcase"], [""], ["   "], ["case"], ["camel case case"], [null], [1], [true], [["snake"]], [{ value: "snake" }]])(
      "falls back to camelCase when naming-convention is %p",
      async (type) => {
        const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
        expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await configured.run(okExample))).toEqual([]);
      }
    );

    test("a document compliant with camel fails once naming-convention is switched to snake", async () => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": "snake" } });
      const paths = pathsOf(await configured.run(okExample));
      expect(paths).toEqual(
        [
          `${P}.publish.message.messageId`,
          `${P}.publish.message.name`,
          `${P}.publish.message.traits.1.messageId`,
          `${P}.publish.message.traits.1.name`,
          `${P}.subscribe.message.oneOf.1.messageId`,
          `${P}.subscribe.message.oneOf.1.name`,
          `${C}.subscribe.message.messageId`,
          `${C}.subscribe.message.name`,
          "components.channels.auditChannel.publish.message.messageId",
          "components.channels.auditChannel.publish.message.name",
          "components.messageTraits.commonHeaders.messageId",
          "components.messageTraits.commonHeaders.name",
          "components.messages.OrderShipped.messageId",
          "components.messages.OrderShipped.name",
          "components.messages.orderShipped.messageId",
          "components.messages.orderShipped.name",
        ].sort()
      );
    });
  });
});
