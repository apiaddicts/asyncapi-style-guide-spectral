const { linterForRule } = require("../../helpers/utils");
const {
  DEFAULT_VERSIONS,
  OPTION,
  notApproved,
  notString,
  VERSION_CASES,
  NON_STRING_VALUES,
  ABSENT_VALUES,
  NON_OBJECT_SERVERS,
  PROBE_VERSIONS,
  PARAM_CASES,
  FALLBACK_VALUES,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar085-server-protocol-version-valid-values");
const okExample = require("./AAR085/ok-example");
const failExample = require("./AAR085/fail-example");
const failSharedRef = require("./AAR085/fail-shared-ref");
const okStructuralEdges = require("./AAR085/ok-structural-edges");
const failLargeGenerated = require("./AAR085/fail-large-generated");

const RULE = "asa:AAR085";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withVersions = (value) => linterForRule(RULE, { functionOptions: { [OPTION]: value } });

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Quality Server Protocol Versions", version: "1.0.0" }, ...extra });
const single = (protocolVersion) => base({ servers: { ordersKafka: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion } } });
const matrixDoc = (versions) => base({ servers: Object.fromEntries(versions.map((protocolVersion, index) => [`case${index}`, { url: "kafka.quality.es", protocol: "kafka", protocolVersion }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.kafkaLegacy.protocolVersion", notApproved("kafkaLegacy", "2.8.0")],
  ["servers.kafkaNext.protocolVersion", notApproved("kafkaNext", "3.4.0")],
  ["servers.kafkaPatch.protocolVersion", notApproved("kafkaPatch", "3.3.1")],
  ["servers.kafkaShort.protocolVersion", notApproved("kafkaShort", "3.3")],
  ["servers.kafkaPrefixed.protocolVersion", notApproved("kafkaPrefixed", "v3.3.0")],
  ["servers.kafkaIbp.protocolVersion", notApproved("kafkaIbp", "3.3-IV3")],
  ["servers.confluentPlatform.protocolVersion", notApproved("confluentPlatform", "7.3.0-ccs")],
  ["servers.kafkaRc.protocolVersion", notApproved("kafkaRc", "3.3.0-rc1")],
  ["servers.paddedVersion.protocolVersion", notApproved("paddedVersion", "3.3.0 ")],
  ["servers.leadingSpace.protocolVersion", notApproved("leadingSpace", " 3.3.0")],
  ["servers.rangeVersion.protocolVersion", notApproved("rangeVersion", ">=3.3.0")],
  ["servers.wildcardVersion.protocolVersion", notApproved("wildcardVersion", "3.3.x")],
  ["servers.listInString.protocolVersion", notApproved("listInString", "3.3.0,3.4.0")],
  ["servers.placeholderVersion.protocolVersion", notApproved("placeholderVersion", "{version}")],
  ["servers.envPlaceholder.protocolVersion", notApproved("envPlaceholder", "${KAFKA_VERSION}")],
  ["servers.latestVersion.protocolVersion", notApproved("latestVersion", "latest")],
  ["servers.emptyVersion.protocolVersion", notApproved("emptyVersion", "")],
  ["servers.warehouseAmqp.protocolVersion", notApproved("warehouseAmqp", "0.9.1")],
  ["servers.scannersMqtt.protocolVersion", notApproved("scannersMqtt", "3.1.1")],
  ["servers.carrierWebhooks.protocolVersion", notApproved("carrierWebhooks", "2.0")],
  ["servers.numericVersion.protocolVersion", notString("numericVersion")],
  ["servers.integerVersion.protocolVersion", notString("integerVersion")],
  ["servers.booleanVersion.protocolVersion", notString("booleanVersion")],
  ["servers.arrayVersion.protocolVersion", notString("arrayVersion")],
  ["servers.refVersion.protocolVersion", notString("refVersion")],
  ["servers.x-partner.protocolVersion", notApproved("x-partner", "2.6.0")],
  ["components.servers.carrierHub.protocolVersion", notApproved("carrierHub", "2.8.1")],
  ["components.servers.legacyMq.protocolVersion", notApproved("legacyMq", "9.2")],
].sort(byPathAndMessage);

const FAIL_EXAMPLE_APPROVABLE = ["2.8.0", "3.4.0", "3.3.1", "3.3", "v3.3.0", "3.3-IV3", "7.3.0-ccs", "3.3.0-rc1", ">=3.3.0", "3.3.x", "{version}", "${KAFKA_VERSION}", "latest", "0.9.1", "3.1.1", "2.0", "2.6.0", "2.8.1", "9.2"];

const FAIL_SHARED_REF = [
  ["servers.partner.protocolVersion", notApproved("partner", "2.8.0")],
  ["components.servers.sellerHub.protocolVersion", notApproved("sellerHub", "0.9.1")],
  ["components.servers.hop2.protocolVersion", notApproved("hop2", "3.4.0")],
  ["components.servers.seller/eu~dr.protocolVersion", notApproved("seller/eu~dr", "3.3")],
  ["components.servers.latin america.protocolVersion", notApproved("latin america", "5.0")],
  ["components.servers.espa\u00f1a.protocolVersion", notApproved("espa\u00f1a", "v3.3.0")],
  ["components.x-versions.protocolVersion", notApproved("x-versions", "1.0")],
].sort(byPathAndMessage);

describe("AAR085 (AsyncAPI 2.x): every server protocolVersion must be an approved version", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped list", () => {
    test("passes a realistic payments document whose servers use 3.3.0 or no protocolVersion, ignoring extensions, variables, bindings, parameters, payloads, headers, examples, traits, x-servers and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-approved protocolVersion of servers and components.servers with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("reads the protocolVersion whatever the asyncapi value, since the field is the same in every version", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "3.0.0", "3.1.0", "v3.0.0", "", null, false, {}]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("names the server, the version and the approved versions in the message", async () => {
      const [result] = only(await linter.run(single("2.8.0")));
      expect(result.message).toBe("AAR085: Server 'ordersKafka' protocolVersion '2.8.0' must be an approved version: '3.3.0'.");
      expect(DEFAULT_VERSIONS).toEqual(["3.3.0"]);
    });

    test.each(VERSION_CASES.approved.map((version) => [version]))("accepts the version %p", async (version) => {
      expect(findingsOf(await linter.run(single(version)))).toEqual([]);
    });

    test.each(VERSION_CASES.rejected.map((version) => [version]))("rejects the version %p", async (version) => {
      expect(findingsOf(await linter.run(single(version)))).toEqual([["servers.ordersKafka.protocolVersion", notApproved("ordersKafka", version)]]);
    });

    test("checks a whole matrix and reports exactly the rejected versions", async () => {
      const versions = [...VERSION_CASES.approved, ...VERSION_CASES.rejected];
      const reported = reportedCases(await linter.run(matrixDoc(versions)));
      const rejected = new Set(VERSION_CASES.rejected);
      versions.forEach((version, index) => expect([version, reported.has(index)]).toEqual([version, rejected.has(version)]));
    });

    test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string protocolVersion %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.ordersKafka.protocolVersion", notString("ordersKafka")]]);
    });

    test.each(ABSENT_VALUES.map((value) => [value]))("does not report a %p protocolVersion, which is optional", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: { servers: { c: { url: "kafka.quality.es", protocol: "kafka", protocolVersion: value } } } })))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
    });

    test.each([[null], [[]], ["3.3.0"], [42], [true]])("skips a servers or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
    });

    test("applies the same list to every protocol", async () => {
      const doc = base({
        servers: {
          kafka: { url: "kafka.quality.es", protocol: "kafka", protocolVersion: "0.9.1" },
          amqp: { url: "rabbit.quality.es", protocol: "amqp", protocolVersion: "3.3.0" },
          mqtt: { url: "mqtt.quality.es", protocol: "mqtt", protocolVersion: "3.3.0" },
          noProtocol: { url: "broker.quality.es", protocolVersion: "2.8.0" },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.kafka.protocolVersion", notApproved("kafka", "0.9.1")],
          ["servers.noProtocol.protocolVersion", notApproved("noProtocol", "2.8.0")],
        ].sort(byPathAndMessage)
      );
    });

    test("escapes control and invisible characters so every message stays on one line and shows the hidden character", async () => {
      const versions = ["3.3.0\n", "\u00003.3.0", "3.3.0\u001b", "3.3.0\u007f", "3.3.0\t", "3.3.0\r\n", "3.3.0\u200b", "\ufeff3.3.0", "3.3\u00ad.0", "3.3.0\u2028"];
      const results = only(await linter.run(matrixDoc(versions)));
      expect(results.map((r) => r.message).sort()).toEqual(versions.map((version, index) => notApproved(`case${index}`, version)).sort());
      expect(results.map((r) => r.message).filter((m) => /[\u0000-\u001f\u007f\u00ad\u200b\u2028\ufeff]/.test(m))).toEqual([]);
      expect(results.map((r) => r.message)).toContain("AAR085: Server 'case0' protocolVersion '3.3.0\\n' must be an approved version: '3.3.0'.");
    });

    test("escapes control characters in server names too", async () => {
      const doc = base({ servers: { "orders\nkafka": { url: "kafka.quality.es", protocol: "kafka", protocolVersion: "2.8.0" } } });
      expect(findingsOf(await linter.run(doc))).toEqual([["servers.orders\nkafka.protocolVersion", notApproved("orders\nkafka", "2.8.0")]]);
      expect(only(await linter.run(doc))[0].message).toContain("Server 'orders\\nkafka'");
    });

    test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and self references, and ignores external, dangling, cyclic and malformed ones", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("follows a servers map and a components object given as local references", async () => {
      const doc = base({
        servers: { $ref: "#/components/x-servers" },
        components: {
          "x-servers": { partner: { url: "partner.example.org", protocol: "kafka", protocolVersion: "2.8.0" }, local: { url: "kafka.quality.es", protocol: "kafka", protocolVersion: "3.3.0" } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([["components.x-servers.partner.protocolVersion", notApproved("partner", "2.8.0")]]);
      const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { url: "dr.example.org", protocol: "kafka", protocolVersion: "3.4.0" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.protocolVersion", notApproved("dr", "3.4.0")]]);
      const serversMapRef = base({ components: { servers: { $ref: "#/x-server-map" } }, "x-server-map": { lab: { url: "lab.example.org", protocol: "kafka", protocolVersion: "3.3" } } });
      expect(findingsOf(await linter.run(serversMapRef))).toEqual([["x-server-map.lab.protocolVersion", notApproved("lab", "3.3")]]);
    });

    test("ignores a servers map or a components object given as an external, dangling or cyclic reference", async () => {
      const doc = base({ servers: { $ref: "./servers.yaml" }, components: { $ref: "https://specs.example.org/components.yaml" } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
      const dangling = base({ servers: { $ref: "#/components/missing" }, components: { servers: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/servers" } });
      expect(findingsOf(await linter.run(dangling))).toEqual([]);
      expect(findingsOf(await linter.run(base({ servers: { $ref: "#" }, components: { servers: { $ref: "#" } } })))).toEqual([]);
    });

    test("decodes percent-encoded pointers, treats relative file paths as external and never validates the root, also outside the servers maps", async () => {
      const doc = base({
        servers: {
          encoded: { $ref: "#/x-servers/north%20america" },
          unicode: { $ref: "#/x-servers/espa%C3%B1a" },
          relativeFile: { $ref: "./x-servers/rogue" },
          self: { $ref: "#" },
        },
        protocolVersion: "2.8.0",
        "x-servers": {
          "north america": { url: "na.example.org", protocol: "kafka", protocolVersion: "2.8.0" },
          "espa\u00f1a": { url: "es.example.org", protocol: "kafka", protocolVersion: "V3.3.0" },
          rogue: { url: "rogue.example.org", protocol: "kafka", protocolVersion: "0.10.2" },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["x-servers.north america.protocolVersion", notApproved("north america", "2.8.0")],
          ["x-servers.espa\u00f1a.protocolVersion", notApproved("espa\u00f1a", "V3.3.0")],
        ].sort(byPathAndMessage)
      );
    });

    test("validates servers whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { url: "edge.example.org", protocol: "kafka", protocolVersion: "3.4.0" } },
        components: { servers: { "x-mirror": { url: "mirror.example.org", protocol: "kafka", protocolVersion: "2.8.0" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.x-edge.protocolVersion", notApproved("x-edge", "3.4.0")],
          ["components.servers.x-mirror.protocolVersion", notApproved("x-mirror", "2.8.0")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports servers whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({
        servers: {
          "eu~1west": { url: "eu.example.org", protocol: "kafka", protocolVersion: "2.8.0" },
          "kafka~0dr": { url: "dr.example.org", protocol: "kafka", protocolVersion: "3.3" },
          "a/b~c": { url: "ab.example.org", protocol: "kafka", protocolVersion: "latest" },
        },
        components: { servers: { "mirror~1x": { url: "mirror.example.org", protocol: "kafka", protocolVersion: "3.4.0" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.eu~1west.protocolVersion", notApproved("eu~1west", "2.8.0")],
          ["servers.kafka~0dr.protocolVersion", notApproved("kafka~0dr", "3.3")],
          ["servers.a/b~c.protocolVersion", notApproved("a/b~c", "latest")],
          ["components.servers.mirror~1x.protocolVersion", notApproved("mirror~1x", "3.4.0")],
        ].sort(byPathAndMessage)
      );
    });

    test("validates servers named like Object members", async () => {
      const doc = base({
        servers: {
          constructor: { url: "a.example.org", protocol: "kafka", protocolVersion: "2.8.0" },
          toString: { url: "b.example.org", protocol: "kafka", protocolVersion: "3.3.0" },
          valueOf: { url: "c.example.org", protocol: "kafka", protocolVersion: "0.9.1" },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.constructor.protocolVersion", notApproved("constructor", "2.8.0")],
          ["servers.valueOf.protocolVersion", notApproved("valueOf", "0.9.1")],
        ].sort(byPathAndMessage)
      );
    });

    test("ignores the server variables, so a version placeholder is never substituted", async () => {
      const doc = base({ servers: { s: { url: "kafka.quality.es:{port}", protocol: "kafka", protocolVersion: "{version}", variables: { version: { enum: ["3.3.0"], default: "3.3.0" }, port: { default: "9092" } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual([["servers.s.protocolVersion", notApproved("s", "{version}")]]);
    });

    test("skips null, scalar and array nodes, missing and null versions, extensions, look-alike fields, variables, bindings, schemas, examples, traits and parameters", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", servers: { a: { url: "localhost", protocol: "kafka", protocolVersion: "2.8.0" } } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
      expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured list", () => {
    const acceptedUnder = async (value) => {
      const configured = await withVersions(value);
      const reported = reportedCases(await configured.run(matrixDoc(PROBE_VERSIONS)));
      return PROBE_VERSIONS.filter((_, index) => !reported.has(index));
    };

    test("the shipped list accepts exactly 3.3.0", async () => {
      expect(await acceptedUnder(undefined)).toEqual(DEFAULT_VERSIONS);
      expect(await acceptedUnder("3.3.0")).toEqual(DEFAULT_VERSIONS);
    });

    test.each(PARAM_CASES)("%s accepts exactly the listed versions and names the list in every message", async (_, value, accepted, versions) => {
      expect(await acceptedUnder(value)).toEqual(accepted);
      const configured = await withVersions(value);
      const results = only(await configured.run(matrixDoc(PROBE_VERSIONS)));
      results.forEach((r) => expect(r.message).toBe(notApproved(r.path[1], PROBE_VERSIONS[Number(r.path[1].slice(4))], versions)));
    });

    test("versions with surrounding spaces, commas or no characters can never be approved", async () => {
      expect(await acceptedUnder(" 3.3.0 ,,3.3.0 ,")).toEqual(["3.3.0"]);
      const configured = await withVersions(["3.3.0", "3.4.0", " ", "3.3.0,3.4.0"]);
      expect(findingsOf(await configured.run(matrixDoc(["", " 3.3.0", "3.3.0 ", "3.3.0,3.4.0", "3.4.0"])))).toEqual(
        [
          ["servers.case0.protocolVersion", notApproved("case0", "", ["3.3.0", "3.4.0"])],
          ["servers.case1.protocolVersion", notApproved("case1", " 3.3.0", ["3.3.0", "3.4.0"])],
          ["servers.case2.protocolVersion", notApproved("case2", "3.3.0 ", ["3.3.0", "3.4.0"])],
          ["servers.case3.protocolVersion", notApproved("case3", "3.3.0,3.4.0", ["3.3.0", "3.4.0"])],
        ].sort(byPathAndMessage)
      );
    });

    test("escapes control characters of the configured versions in the message", async () => {
      const configured = await withVersions(["3.3\u0007.0", "3.4\u0000.0"]);
      expect(findingsOf(await configured.run(single("3.3.0")))).toEqual([
        ["servers.ordersKafka.protocolVersion", "AAR085: Server 'ordersKafka' protocolVersion '3.3.0' must be an approved version: '3.3\\u0007.0', '3.4\\u0000.0'."],
      ]);
    });

    test("a compliant document fails once the list no longer holds its version", async () => {
      const configured = await withVersions("3.4.0");
      expect(pathsOf(await configured.run(okExample))).toEqual(
        [
          "servers.eventstreams.protocolVersion",
          "servers.kafka.protocolVersion",
          "servers.authorisationsDr.protocolVersion",
          "servers.fraudScoring.protocolVersion",
          "servers.x-mirror.protocolVersion",
          "servers.migratedTo3x.protocolVersion",
          "components.servers.regional.protocolVersion",
        ].sort()
      );
      only(await configured.run(okExample)).forEach((r) => expect(r.message).toBe(notApproved(r.path[r.path.length - 2], "3.3.0", ["3.4.0"])));
    });

    test("a failing document passes once the list holds every version it uses that can be approved", async () => {
      const configured = await withVersions(["3.3.0", ...FAIL_EXAMPLE_APPROVABLE]);
      expect(pathsOf(await configured.run(failExample))).toEqual(
        [
          "servers.paddedVersion.protocolVersion",
          "servers.leadingSpace.protocolVersion",
          "servers.listInString.protocolVersion",
          "servers.emptyVersion.protocolVersion",
          "servers.numericVersion.protocolVersion",
          "servers.integerVersion.protocolVersion",
          "servers.booleanVersion.protocolVersion",
          "servers.arrayVersion.protocolVersion",
          "servers.refVersion.protocolVersion",
        ].sort()
      );
    });

    test("a list of one version per engine lets a multi-protocol document pass, whatever protocol each version belongs to", async () => {
      const configured = await withVersions("3.3.0,0.9.1,3.1.1,2.0");
      const results = findingsOf(await configured.run(failExample)).map(([path]) => path);
      ["servers.warehouseAmqp.protocolVersion", "servers.scannersMqtt.protocolVersion", "servers.carrierWebhooks.protocolVersion"].forEach((path) => expect(results).not.toContain(path));
      const swapped = base({ servers: { kafka: { url: "kafka.quality.es", protocol: "kafka", protocolVersion: "0.9.1" }, amqp: { url: "rabbit.quality.es", protocol: "amqp", protocolVersion: "3.3.0" } } });
      expect(findingsOf(await configured.run(swapped))).toEqual([]);
    });

    test("applies the configured list to a very large document", async () => {
      const configured = await withVersions(failLargeGenerated.configuredVersions.join(","));
      expect(findingsOf(await configured.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedConfigured);
      expect(failLargeGenerated.expectedConfigured).not.toEqual(failLargeGenerated.expected);
    });

    test.each(FALLBACK_VALUES.map((value) => [value]))("falls back to the shipped list when the option is %p", async (value) => {
      const configured = await withVersions(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });

    test.each(IGNORED_OPTIONS)("ignores an option the function does not read: %s", async (_, functionOptions) => {
      const configured = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });
  });
});
