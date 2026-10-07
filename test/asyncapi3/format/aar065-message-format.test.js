const { linterForRule, CASING_TYPES, CASING_VALUES, isValidCasing } = require("../../helpers/utils");
const okExample = require("./AAR065/ok-example");
const failExample = require("./AAR065/fail-example");
const failNonString = require("./AAR065/fail-non-string");
const okStructuralEdges = require("./AAR065/ok-structural-edges");
const failLargeGenerated = require("./AAR065/fail-large-generated");

const RULE = "asa:AAR065";
const V = "channels.vehiclePositions.messages";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL_EXAMPLE_PATHS = [
  `${V}.2vehicleStarted`,
  `${V}.VehiclePositionReported`,
  `${V}.vehicle-stopped`,
  `${V}.vehicle-stopped.name`,
  `${V}.vehicleLowFuel.name`,
  `${V}.vehicle_idle`,
  `${V}.vehicle_idle.traits.1.name`,
  "channels.engineDiagnostics.messages.engineFaultDetected.name",
  "components.channels.maintenanceWindow.messages.MAINTENANCE_SCHEDULED",
  "components.messageTraits.telemetryHeaders.name",
  "components.messages.VehicleArchived",
  "components.messages.vehiclePositionReported.name",
].sort();

describe.each(["3.0.0", "3.1.0"])("AAR065 (AsyncAPI %s): message key and name must follow the configured casing", (version) => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  const run = async (doc) => pathsOf(await linter.run(withVersion(doc, version)));

  describe("default type (camel)", () => {
    test("passes when every message key and name is camelCase, ignoring payload, header, example, Avro and parameter names", async () => {
      expect(await run(okExample)).toEqual([]);
    });

    test("reports message keys of channels, components.channels and components.messages, plus every name", async () => {
      expect(await run(failExample)).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test("ignores the messageId field and message-level oneOf, which AsyncAPI 3.x does not define", async () => {
      const paths = await run(failExample);
      expect(paths.filter((p) => p.endsWith("messageId") || p.includes("oneOf"))).toEqual([]);
    });

    test("reports a key that points to a $ref at the key, and the referenced name once at its definition", async () => {
      const results = only(await linter.run(withVersion(failExample, version)));
      const keyFinding = results.find((r) => r.path.join(".") === `${V}.VehiclePositionReported`);
      expect(keyFinding.message).toBe(
        "AAR065: Message key 'VehiclePositionReported' must be camelCase."
      );
      expect(results.filter((r) => r.path.join(".") === "components.messages.vehiclePositionReported.name")).toHaveLength(1);
      expect(results.filter((r) => r.path[0] === "operations")).toEqual([]);
    });

    test("reports the exact messages of name and trait name findings", async () => {
      const results = only(await linter.run(withVersion(failExample, version)));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
      expect(byPath[`${V}.vehicle-stopped.name`]).toBe(
        "AAR065: Message name 'VehicleStopped' must be camelCase."
      );
      expect(byPath[`${V}.vehicle_idle.traits.1.name`]).toBe(
        "AAR065: Message trait name 'Vehicle Idle Trait' must be camelCase."
      );
    });

    test("reports non-string and empty names and an empty key, and skips a null name", async () => {
      const e = "channels.vehicleEvents.messages";
      const results = only(await linter.run(withVersion(failNonString, version)));
      expect(pathsOf(results)).toEqual(
        [`${e}.`, `${e}.booleanName.name`, `${e}.emptyName.name`, `${e}.numericName.name`, `${e}.objectName.name`].sort()
      );
      expect(results.map((r) => r.message)).toContain(
        "AAR065: Message name {\"en\":\"vehicleEvent\"} must be camelCase."
      );
    });

    test("skips null, scalar, array, $ref and extension nodes, inline operation and reply messages and 2.x-only structures", async () => {
      expect(await run(okStructuralEdges)).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(await run(failLargeGenerated.document)).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured naming-convention", () => {
    const docWith = (values) => ({
      asyncapi: version,
      info: { title: "Casing Matrix", version: "1.0.0" },
      channels: {
        matrix: {
          address: "matrix",
          messages: Object.fromEntries(values.map((value) => [value, { name: value }])),
        },
      },
    });

    test.each(CASING_TYPES)("naming-convention '%s' agrees with Spectral's core casing function on keys and names", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const reported = new Set(pathsOf(await configured.run(docWith(CASING_VALUES))));
      CASING_VALUES.forEach((value) => {
        const valid = isValidCasing(value, type);
        expect([value, reported.has(`channels.matrix.messages.${value}`)]).toEqual([value, !valid]);
        expect([value, reported.has(`channels.matrix.messages.${value}.name`)]).toEqual([value, !valid]);
      });
    });

    test.each([
      ["snake", "vehicle_idle", "vehicleIdle"],
      ["kebab", "vehicle-idle", "vehicle_idle"],
      ["pascal", "VehicleIdle", "vehicleIdle"],
    ])("naming-convention '%s' accepts %s and rejects %s as key and name", async (type, good, bad) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      expect(pathsOf(await configured.run(docWith([good, bad])))).toEqual([
        `channels.matrix.messages.${bad}`,
        `channels.matrix.messages.${bad}.name`,
      ]);
    });

    test.each([
      ["kebab-case", "kebab"],
      ["Snake_Case", "snake"],
      ["UpperCamelCase", "pascal"],
    ])("normalizes the alias '%s' to '%s'", async (alias, type) => {
      const aliased = await linterForRule(RULE, { functionOptions: { "naming-convention": alias } });
      const canonical = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const aliasedPaths = pathsOf(await aliased.run(docWith(CASING_VALUES)));
      expect(aliasedPaths).toEqual(pathsOf(await canonical.run(docWith(CASING_VALUES))));
      expect(aliasedPaths.length).toBe(CASING_VALUES.filter((value) => !isValidCasing(value, type)).length * 2);
    });

    test.each([["unknown"], ["macro"], ["cobol"], ["flat"], [""], [null], [3], [["kebab"]]])("falls back to camelCase when naming-convention is %p", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      expect(pathsOf(await configured.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await configured.run(withVersion(okExample, version)))).toEqual([]);
    });
  });
});

describe("AAR065 (AsyncAPI 3.x): version detection", () => {
  test.each([3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"])("treats %p as 3.x", async (version) => {
    const linter = await linterForRule(RULE);
    expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
  });
});
