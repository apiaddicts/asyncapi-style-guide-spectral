const { linterForRule } = require("../../helpers/utils");
const {
  DEFAULT_PATTERN,
  NEVER,
  mismatch,
  NAME_CASES,
  PROBE_NAMES,
  DEFAULT_ACCEPTED,
  PATTERN_CASES,
  FALLBACK_PATTERNS,
  NON_OBJECT_SERVER_MAPS,
  ENTRY_VALUES,
  MAP_REF_CASES,
  mapRefDocument,
} = require("../../helpers/rules/aar081-server-name-pattern");
const okExample = require("./AAR081/ok-example");
const failExample = require("./AAR081/fail-example");
const failSharedRef = require("./AAR081/fail-shared-ref");
const okStructuralEdges = require("./AAR081/ok-structural-edges");
const failLargeGenerated = require("./AAR081/fail-large-generated");

const RULE = "asa:AAR081";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withPattern = (value) => linterForRule(RULE, { functionOptions: { pattern: value } });

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Quality Server Names", version: "1.0.0" }, ...extra });
const single = (name, value = { url: "kafka.quality.es:9092", protocol: "kafka" }) => base({ servers: { [name]: value } });
const matrixDoc = (names) => base({ servers: Object.fromEntries(names.map((name) => [name, { url: "kafka.quality.es:9092", protocol: "kafka" }])) });

const FAIL_EXAMPLE_NAMES = [
  "kafka.quality.es",
  "kafka prod",
  "market/omie",
  "grid~ree",
  "mqtt:1883",
  "kafka,eventstreams",
  "{environment}",
  "españa",
  "kafka ",
  "",
  "x-legacy.eu",
  "settlements@bank",
  "1.5",
  "dr.kafka",
  "null server",
  "scalar server",
];
const FAIL_EXAMPLE = FAIL_EXAMPLE_NAMES.map((name) => [`servers.${name}`, mismatch(name)]).sort(byPathAndMessage);

const FAIL_SHARED_REF = ["kafka.prod", "grid operator", "x-dr/eu", "cyclic~loop"]
  .map((name) => [`components.x-server-catalog.eu/west~primary.${name}`, mismatch(name)])
  .sort(byPathAndMessage);

describe("AAR081 (AsyncAPI 2.x): every server name must match the organization's naming pattern", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped pattern", () => {
    test("passes a realistic document whose server names use letters, digits, hyphens and underscores, whatever their hosts and the names used elsewhere", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every other name of the root servers map with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("reads the root servers keys whatever the asyncapi value", async () => {
      for (const version of [2, "2", " 2.6.0 ", "2.7.0", "1.2.0", "3.0.0", "latest", null, true, ""]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(NAME_CASES.valid.map((name) => [name]))("accepts the server name %p", async (name) => {
      expect(findingsOf(await linter.run(single(name)))).toEqual([]);
    });

    test.each(NAME_CASES.invalid.map((name) => [name]))("rejects the server name %p", async (name) => {
      expect(findingsOf(await linter.run(single(name)))).toEqual([[`servers.${name}`, mismatch(name)]]);
    });

    test("checks a whole matrix and reports exactly the names outside the pattern", async () => {
      const names = [...NAME_CASES.valid, ...NAME_CASES.invalid];
      expect(pathsOf(await linter.run(matrixDoc(names)))).toEqual(NAME_CASES.invalid.map((name) => `servers.${name}`).sort());
    });

    test("escapes control characters so every message stays on one line", async () => {
      const results = only(await linter.run(matrixDoc(["kafka\n", "\tkafka", "kafka\u0000", "\r\nkafka", "kafka\u001b", "kafka\u007f"])));
      expect(results.map((r) => r.message).sort()).toEqual(
        [
          "AAR081: Server name 'kafka\\n' must match '^[A-Za-z0-9_-]+$'.",
          "AAR081: Server name '\\tkafka' must match '^[A-Za-z0-9_-]+$'.",
          "AAR081: Server name 'kafka\\u0000' must match '^[A-Za-z0-9_-]+$'.",
          "AAR081: Server name '\\r\\nkafka' must match '^[A-Za-z0-9_-]+$'.",
          "AAR081: Server name 'kafka\\u001b' must match '^[A-Za-z0-9_-]+$'.",
          "AAR081: Server name 'kafka\\u007f' must match '^[A-Za-z0-9_-]+$'.",
        ].sort()
      );
      results.forEach((r) => expect(r.message).not.toMatch(/[\x00-\x1f\x7f]/));
    });

    test.each(ENTRY_VALUES.map((value) => [value]))("checks the name whatever the server value, here %p", async (value) => {
      expect(findingsOf(await linter.run(single("kafka.prod", value)))).toEqual([["servers.kafka.prod", mismatch("kafka.prod")]]);
      expect(findingsOf(await linter.run(single("kafka-prod", value)))).toEqual([]);
    });

    test("validates names that start with x-, which are server names and not extensions in this map", async () => {
      expect(findingsOf(await linter.run(matrixDoc(["x-kafka", "x-", "x-kafka.eu", "x-kafka eu"])))).toEqual(
        [
          ["servers.x-kafka.eu", mismatch("x-kafka.eu")],
          ["servers.x-kafka eu", mismatch("x-kafka eu")],
        ].sort(byPathAndMessage)
      );
    });

    test("never checks hosts, components.servers, channel server lists, extensions or names inside other objects", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVER_MAPS.map((value) => [value]))("skips a root servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: { "kafka.prod": {} } } })))).toEqual([]);
    });

    test("skips a document without servers or with an empty servers map", async () => {
      expect(findingsOf(await linter.run(base({ channels: {} })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ servers: {} })))).toEqual([]);
    });

    test("follows a root servers map given as a chained, escaped local reference and reports the names where they are written", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test.each(MAP_REF_CASES)("a root servers map given as %s", async (_, ref, expected) => {
      expect(pathsOf(await linter.run(mapRefDocument(base, ref)))).toEqual([...expected].sort());
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", servers: { "kafka.prod": {} } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated names", async () => {
      expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured pattern", () => {
    const acceptedUnder = async (value) => {
      const configured = await withPattern(value);
      const reported = new Set(pathsOf(await configured.run(matrixDoc(PROBE_NAMES))));
      return PROBE_NAMES.filter((name) => !reported.has(`servers.${name}`));
    };

    test("the shipped pattern accepts letters, digits, hyphens and underscores only", async () => {
      expect(await acceptedUnder(undefined)).toEqual(DEFAULT_ACCEPTED);
      expect(await acceptedUnder(DEFAULT_PATTERN)).toEqual(DEFAULT_ACCEPTED);
    });

    test.each(PATTERN_CASES)("pattern %p accepts exactly the matching names", async (value, expected) => {
      expect((await acceptedUnder(value)).sort()).toEqual([...expected].sort());
    });

    test("keeps the same answer for every name under global and sticky flags", async () => {
      expect(await acceptedUnder(`/${DEFAULT_PATTERN}/g`)).toEqual(DEFAULT_ACCEPTED);
      expect(await acceptedUnder(`/${DEFAULT_PATTERN}/gy`)).toEqual(DEFAULT_ACCEPTED);
    });

    test("trims the configured pattern and names it, as written, in every message", async () => {
      expect(await acceptedUnder("\n ^kafka$ ")).toEqual(["kafka"]);
      const configured = await withPattern("\t/^[a-z]+$/i  ");
      expect(findingsOf(await configured.run(single("kafka-prod")))).toEqual([["servers.kafka-prod", mismatch("kafka-prod", "/^[a-z]+$/i")]]);
    });

    test("escapes control characters of the configured pattern in the message", async () => {
      const configured = await withPattern("^kafka\u0007$");
      expect(findingsOf(await configured.run(single("kafka")))).toEqual([["servers.kafka", "AAR081: Server name 'kafka' must match '^kafka\\u0007$'."]]);
    });

    test("a compliant document fails once the pattern is narrowed to kebab-case", async () => {
      const configured = await withPattern("^[a-z][a-z0-9-]*$");
      expect(pathsOf(await configured.run(okExample))).toEqual(
        ["servers.kafkaProd", "servers.mqtt_meters", "servers.AMQP_SETTLEMENTS", "servers.-", "servers._", "servers.01", "servers.drKafka", "servers.partnerKafka"].sort()
      );
    });

    test("a failing document passes once the pattern accepts every name", async () => {
      const configured = await withPattern(".*");
      expect(findingsOf(await configured.run(failExample))).toEqual([]);
    });

    test.each(FALLBACK_PATTERNS.map((value) => [value]))("falls back to the shipped pattern when pattern is %p", async (value) => {
      const configured = await withPattern(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });

    test("ignores options the function does not read", async () => {
      const configured = await linterForRule(RULE, { functionOptions: { match: ".*", "allowed-server-types": "kafka", "naming-convention": "camelCase" } });
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test("never reports a host, even when the pattern rejects every name", async () => {
      const configured = await withPattern(NEVER);
      const results = only(await configured.run(okExample));
      expect(results.map((r) => r.path.length)).toEqual(results.map(() => 2));
      expect(results).toHaveLength(Object.keys(okExample.servers).length);
    });
  });
});
