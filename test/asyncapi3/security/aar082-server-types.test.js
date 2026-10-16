const { linterForRule } = require("../../helpers/utils");
const {
  DEFAULT_TYPES,
  OPTION,
  notApproved,
  NAME_CASES,
  PROBE_NAMES,
  PARAM_CASES,
  FALLBACK_VALUES,
  NON_OBJECT_SERVER_MAPS,
  ENTRY_VALUES,
  MAP_REF_CASES,
  mapRefDocument,
} = require("../../helpers/rules/aar082-server-types");
const okExample = require("./AAR082/ok-example");
const failExample = require("./AAR082/fail-example");
const failSharedRef = require("./AAR082/fail-shared-ref");
const okStructuralEdges = require("./AAR082/ok-structural-edges");
const failLargeGenerated = require("./AAR082/fail-large-generated");

const RULE = "asa:AAR082";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withTypes = (value) => linterForRule(RULE, { functionOptions: { [OPTION]: value } });

const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Quality Server Types", version: "1.0.0" }, ...extra });
const single = (name, value = { host: "kafka.quality.es:9092", protocol: "kafka" }) => base({ servers: { [name]: value } });
const matrixDoc = (names) => base({ servers: Object.fromEntries(names.map((name) => [name, { host: "kafka.quality.es:9092", protocol: "kafka" }])) });
const COMPONENT_SERVERS = { drKafka: { host: "kafka-dr.quality.es:9092", protocol: "kafka" }, archive: { host: "archive.quality.es:9092", protocol: "kafka" } };

const FAIL_EXAMPLE_NAMES = [
  "production",
  "staging",
  "Kafka",
  "EventStreams",
  "event-streams",
  "kafka-secure",
  "kafka-dev",
  "mqttTelemetry",
  "rabbitmq",
  "x-legacy",
  "",
  "kafka ",
  "dr kafka",
  "nullServer",
  "2",
];
const FAIL_EXAMPLE = FAIL_EXAMPLE_NAMES.map((name) => [`servers.${name}`, notApproved(name)]).sort(byPathAndMessage);

const FAIL_SHARED_REF = ["production", "x-dr", "partner", "cyclic", "Kafka"]
  .map((name) => [`components.x-server-catalog.eu/west~primary.${name}`, notApproved(name)])
  .sort(byPathAndMessage);

describe("AAR082 (AsyncAPI 3.x): every server name must be an approved server type", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped list", () => {
    test("passes a realistic document whose servers are named eventstreams and kafka, whatever the names used elsewhere", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every other name of the root servers map once, at the key, never at the channels that reference it", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("reads the root servers keys whatever the asyncapi value", async () => {
      for (const version of [3, "3", " 3.0.0 ", "3.2.0", "4.0.0", "2.6.0", null, false]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(NAME_CASES.approved.map((name) => [name]))("accepts the server name %p", async (name) => {
      expect(findingsOf(await linter.run(single(name)))).toEqual([]);
    });

    test.each(NAME_CASES.rejected.map((name) => [name]))("rejects the server name %p", async (name) => {
      expect(findingsOf(await linter.run(single(name)))).toEqual([[`servers.${name}`, notApproved(name)]]);
    });

    test("checks a whole matrix and reports exactly the names outside the list", async () => {
      const names = [...NAME_CASES.approved, ...NAME_CASES.rejected];
      expect(pathsOf(await linter.run(matrixDoc(names)))).toEqual(NAME_CASES.rejected.map((name) => `servers.${name}`).sort());
    });

    test.each(ENTRY_VALUES.map((value) => [value]))("checks the name whatever the server value, here %p", async (value) => {
      expect(findingsOf(await linter.run(single("production", value)))).toEqual([["servers.production", notApproved("production")]]);
      expect(findingsOf(await linter.run(single("kafka", value)))).toEqual([]);
    });

    test("checks the names of servers whose host is a variable, a pathname-only or a null address", async () => {
      const doc = base({
        servers: {
          kafka: { host: "{brokers}", protocol: "kafka", variables: { brokers: { default: "kafka.quality.es:9092" } } },
          production: { host: "{brokers}", protocol: "kafka", variables: { brokers: { default: "kafka.quality.es:9092" } } },
          eventstreams: { host: "es.quality.es", pathname: "/v1", protocol: "kafka-secure" },
          relative: { host: null, pathname: "/events", protocol: "ws" },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(["servers.production", "servers.relative"]);
    });

    test("validates names that start with x-, which are server names and not extensions in this map", async () => {
      expect(findingsOf(await linter.run(matrixDoc(["x-kafka", "x-eventstreams", "x-", "kafka"])))).toEqual(
        [
          ["servers.x-", notApproved("x-")],
          ["servers.x-eventstreams", notApproved("x-eventstreams")],
          ["servers.x-kafka", notApproved("x-kafka")],
        ].sort(byPathAndMessage)
      );
    });

    test("never checks components.servers, channel and operation server references, replies, extensions or names inside other objects", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVER_MAPS.map((value) => [value]))("skips a root servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: { production: {} } } })))).toEqual([]);
    });

    test("skips a document without servers or with an empty servers map", async () => {
      expect(findingsOf(await linter.run(base({ channels: {}, operations: {} })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ servers: {} })))).toEqual([]);
    });

    test("follows a root servers map given as a chained, escaped local reference and reports the names where they are written", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test.each(MAP_REF_CASES)("a root servers map given as %s", async (_, ref, expected) => {
      const doc = mapRefDocument(base, ref, COMPONENT_SERVERS);
      expect(pathsOf(await linter.run(doc))).toEqual([...expected].sort());
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", servers: { production: {} } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated names", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured list", () => {
    const acceptedUnder = async (value) => {
      const configured = await withTypes(value);
      const reported = new Set(pathsOf(await configured.run(matrixDoc(PROBE_NAMES))));
      return PROBE_NAMES.filter((name) => !reported.has(`servers.${name}`));
    };

    test("the shipped list accepts exactly eventstreams and kafka", async () => {
      expect(await acceptedUnder(undefined)).toEqual(DEFAULT_TYPES);
      expect(await acceptedUnder("eventstreams,kafka")).toEqual(DEFAULT_TYPES);
    });

    test.each(PARAM_CASES)("%s accepts exactly the listed names and names the list in every message", async (_, value, accepted, types) => {
      expect(await acceptedUnder(value)).toEqual(accepted);
      const configured = await withTypes(value);
      const results = only(await configured.run(matrixDoc(PROBE_NAMES)));
      results.forEach((r) => expect(r.message).toBe(notApproved(r.path[1], types)));
    });

    test("a compliant document fails once the list no longer holds its names", async () => {
      const configured = await withTypes("eventstreams");
      expect(findingsOf(await configured.run(okExample))).toEqual([["servers.kafka", notApproved("kafka", ["eventstreams"])]]);
    });

    test("a failing document passes once the list holds every name it uses that can be approved", async () => {
      const configured = await withTypes(["eventstreams", "kafka", ...FAIL_EXAMPLE_NAMES].join(","));
      expect(pathsOf(await configured.run(failExample))).toEqual(["servers.", "servers.kafka "]);
    });

    test("a list of environment names approves the servers a multi-environment document declares", async () => {
      const configured = await withTypes("production,staging,development");
      const doc = base({
        servers: {
          production: { host: "kafka-pro.quality.es:9093", protocol: "kafka-secure" },
          staging: { host: "kafka-pre.quality.es:9093", protocol: "kafka-secure" },
          development: { host: "kafka-dev.quality.es:9092", protocol: "kafka" },
          kafka: { host: "kafka.quality.es:9092", protocol: "kafka" },
        },
      });
      expect(findingsOf(await configured.run(doc))).toEqual([["servers.kafka", notApproved("kafka", ["production", "staging", "development"])]]);
    });

    test("applies the configured list to a very large document and a very long list", async () => {
      const configured = await withTypes(failLargeGenerated.configuredTypes);
      expect(pathsOf(await configured.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedConfigured);
    });

    test.each(FALLBACK_VALUES.map((value) => [value]))("falls back to the shipped list when the option is %p", async (value) => {
      const configured = await withTypes(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });

    test("ignores options the function does not read", async () => {
      const configured = await linterForRule(RULE, { functionOptions: { values: ["production"], pattern: ".*", "fields-to-apply": "production", allowedServerTypes: "production" } });
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
    });
  });
});
