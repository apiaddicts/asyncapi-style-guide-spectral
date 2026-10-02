const { linterForRule, CASING_TYPES, CASING_VALUES, isValidCasing } = require("../../helpers/utils");
const okExample = require("./AAR066/ok-example");
const failExample = require("./AAR066/fail-example");
const okStructuralEdges = require("./AAR066/ok-structural-edges");
const failLargeGenerated = require("./AAR066/fail-large-generated");

const RULE = "asa:AAR066";
const R = "channels.roomTemperature";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL_EXAMPLE_PATHS = [
  "info.tags.0.name",
  "servers.wsGateway.tags.0.name",
  `${R}.tags.1.name`,
  `${R}.messages.temperatureMeasured.tags.0.name`,
  `${R}.messages.temperatureMeasured.traits.1.tags.0.name`,
  "channels.accessControl.messages.badgeScanned.tags.0.name",
  "operations.publishTemperature.tags.0.name",
  "operations.publishTemperature.traits.1.tags.0.name",
  "components.servers.mqttBroker.tags.0.name",
  "components.channels.maintenance.tags.0.name",
  "components.channels.maintenance.messages.ticketOpened.tags.0.name",
  "components.operations.receiveAccess.tags.0.name",
  "components.messages.doorOpened.tags.1.name",
  "components.operationTraits.mqttQos.tags.0.name",
  "components.messageTraits.sensorHeaders.tags.0.name",
  "components.tags.iotDevices.name",
].sort();

describe.each(["3.0.0", "3.1.0"])("AAR066 (AsyncAPI %s): tag names must follow the configured casing", (version) => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  const run = async (doc) => pathsOf(await linter.run(withVersion(doc, version)));

  describe("default type (kebab)", () => {
    test("passes when every tag name is kebab-case, ignoring payload, example, parameter, Avro and component-key names", async () => {
      expect(await run(okExample)).toEqual([]);
    });

    test("reports info, server, channel, message, operation, trait and components tags", async () => {
      expect(await run(failExample)).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test("reports a tag shared through $ref once, at its components.tags definition", async () => {
      const results = only(await linter.run(withVersion(failExample, version)));
      const shared = results.filter((r) => r.path.join(".") === "components.tags.iotDevices.name");
      expect(shared).toHaveLength(1);
      expect(shared[0].message).toBe(
        "AAR066: Tag name 'IoT Devices' must be kebab-case."
      );
      expect(results.filter((r) => r.path.includes("receiveDoors"))).toEqual([]);
    });

    test("ignores root tags, channel-level publish/subscribe and message oneOf, which AsyncAPI 3.x does not define", async () => {
      expect(await run(okStructuralEdges)).toEqual([]);
      expect(await run({ ...okExample, tags: [{ name: "Bad Root Tag" }] })).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(await run(failLargeGenerated.document)).toEqual(failLargeGenerated.expectedPaths);
    });

    test("still validates the rest of the document when info is missing or not an object", async () => {
      const expected = FAIL_EXAMPLE_PATHS.filter((p) => !p.startsWith("info."));
      const { info, ...withoutInfo } = failExample;
      expect(info.tags).toHaveLength(2);
      expect(await run(withoutInfo)).toEqual(expected);
      expect(await run({ ...failExample, info: "notAnObject" })).toEqual(expected);
    });
  });

  describe("configured naming-convention", () => {
    const docWith = (values) => ({
      asyncapi: version,
      info: { title: "Casing Matrix", version: "1.0.0", tags: values.map((name) => ({ name })) },
      components: { tags: Object.fromEntries(values.map((name, index) => [`t${index}`, { name }])) },
    });

    test.each(CASING_TYPES)("naming-convention '%s' agrees with Spectral's core casing function on info.tags and components.tags", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      const reported = new Set(pathsOf(await configured.run(docWith(CASING_VALUES))));
      CASING_VALUES.forEach((value, index) => {
        const invalid = !isValidCasing(value, type);
        expect([value, reported.has(`info.tags.${index}.name`)]).toEqual([value, invalid]);
        expect([value, reported.has(`components.tags.t${index}.name`)]).toEqual([value, invalid]);
      });
    });

    test.each([
      ["camel", "buildingAutomation", "building-automation"],
      ["snake", "building_automation", "building-automation"],
      ["pascal", "BuildingAutomation", "buildingAutomation"],
    ])("naming-convention '%s' accepts %s and rejects %s", async (type, good, bad) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      expect(pathsOf(await configured.run(docWith([good, bad])))).toEqual(["components.tags.t1.name", "info.tags.1.name"]);
    });

    test.each([
      ["snake_case", "snake"],
      ["camelCase", "camel"],
      ["Upper-Camel-Case", "pascal"],
    ])("normalizes the alias '%s' to '%s'", async (alias, type) => {
      const aliased = await linterForRule(RULE, { functionOptions: { "naming-convention": alias } });
      const canonical = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      expect(pathsOf(await aliased.run(docWith(CASING_VALUES)))).toEqual(pathsOf(await canonical.run(docWith(CASING_VALUES))));
    });

    test.each([["unknown"], ["macro"], ["cobol"], ["flat"], [""], [null], [7], [["snake"]]])("falls back to kebab-case when naming-convention is %p", async (type) => {
      const configured = await linterForRule(RULE, { functionOptions: { "naming-convention": type } });
      expect(pathsOf(await configured.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await configured.run(withVersion(okExample, version)))).toEqual([]);
    });
  });
});

describe("AAR066 (AsyncAPI 3.x): version detection", () => {
  test.each([3, "3", "3.0", " 3.1.0 ", "3.2.0"])("treats %p as 3.x", async (version) => {
    const linter = await linterForRule(RULE);
    expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
  });

  test("a 3.x document read as 2.x would miss info, channel and operations tags", async () => {
    const linter = await linterForRule(RULE);
    const paths = pathsOf(await linter.run(withVersion(failExample, "2.6.0")));
    expect(paths.some((p) => p.startsWith("info.") || p.startsWith("operations.") || p === `${R}.tags.1.name`)).toBe(false);
  });
});
