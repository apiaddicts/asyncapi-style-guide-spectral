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

const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Quality Server Protocol Versions", version: "1.0.0" }, ...extra });
const single = (protocolVersion) => base({ servers: { fleetKafka: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion } } });
const matrixDoc = (versions) => base({ servers: Object.fromEntries(versions.map((protocolVersion, index) => [`case${index}`, { host: "kafka.quality.es", protocol: "kafka", protocolVersion }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.kafkaLegacy.protocolVersion", notApproved("kafkaLegacy", "2.8.0")],
  ["servers.kafkaNext.protocolVersion", notApproved("kafkaNext", "3.7.0")],
  ["servers.kafkaPatch.protocolVersion", notApproved("kafkaPatch", "3.3.2")],
  ["servers.kafkaShort.protocolVersion", notApproved("kafkaShort", "3")],
  ["servers.kafkaPrefixed.protocolVersion", notApproved("kafkaPrefixed", "V3.3.0")],
  ["servers.kafkaIbp.protocolVersion", notApproved("kafkaIbp", "3.3-IV0")],
  ["servers.mskVersion.protocolVersion", notApproved("mskVersion", "3.3.0.0")],
  ["servers.kafkaSnapshot.protocolVersion", notApproved("kafkaSnapshot", "3.3.0-SNAPSHOT")],
  ["servers.tabbedVersion.protocolVersion", notApproved("tabbedVersion", "3.3.0\t")],
  ["servers.caretRange.protocolVersion", notApproved("caretRange", "^3.3.0")],
  ["servers.starVersion.protocolVersion", notApproved("starVersion", "3.*")],
  ["servers.semicolonList.protocolVersion", notApproved("semicolonList", "3.3.0;3.4.0")],
  ["servers.placeholderVersion.protocolVersion", notApproved("placeholderVersion", "{protocolVersion}")],
  ["servers.blankVersion.protocolVersion", notApproved("blankVersion", "   ")],
  ["servers.chargersAmqp.protocolVersion", notApproved("chargersAmqp", "0-9-1")],
  ["servers.carsMqtt5.protocolVersion", notApproved("carsMqtt5", "5.0")],
  ["servers.dashboardWss.protocolVersion", notApproved("dashboardWss", "13")],
  ["servers.numericVersion.protocolVersion", notString("numericVersion")],
  ["servers.zeroVersion.protocolVersion", notString("zeroVersion")],
  ["servers.falseVersion.protocolVersion", notString("falseVersion")],
  ["servers.objectVersion.protocolVersion", notString("objectVersion")],
  ["servers.refVersion.protocolVersion", notString("refVersion")],
  ["servers.x-oem.protocolVersion", notApproved("x-oem", "2.7.1")],
  ["components.servers.oemHub.protocolVersion", notApproved("oemHub", "3.2.3")],
  ["components.servers.legacyMq.protocolVersion", notApproved("legacyMq", "9.3.0.0")],
].sort(byPathAndMessage);

const FAIL_EXAMPLE_APPROVABLE = [
  "2.8.0",
  "3.7.0",
  "3.3.2",
  "3",
  "V3.3.0",
  "3.3-IV0",
  "3.3.0.0",
  "3.3.0-SNAPSHOT",
  "^3.3.0",
  "3.*",
  "3.3.0;3.4.0",
  "{protocolVersion}",
  "0-9-1",
  "5.0",
  "13",
  "2.7.1",
  "3.2.3",
  "9.3.0.0",
];

const FAIL_SHARED_REF = [
  ["servers.partner.protocolVersion", notApproved("partner", "2.8.0")],
  ["components.servers.carrierHub.protocolVersion", notApproved("carrierHub", "1.0")],
  ["components.servers.hop2.protocolVersion", notApproved("hop2", "3.5.1")],
  ["components.servers.carrier/eu~dr.protocolVersion", notApproved("carrier/eu~dr", "3.3.0-cp1")],
  ["components.servers.north america.protocolVersion", notApproved("north america", "3.1.1")],
  ["components.servers.recepci\u00f3n.protocolVersion", notApproved("recepci\u00f3n", "kafka-3.3.0")],
].sort(byPathAndMessage);

describe("AAR085 (AsyncAPI 3.x): every server protocolVersion must be an approved version", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped list", () => {
    test("passes a realistic claims document whose servers use 3.3.0 or no protocolVersion, ignoring extensions, variables, bindings, parameters, multi-format payloads, replies, traits, x-servers and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-approved protocolVersion of servers and components.servers with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("reads the protocolVersion whatever the asyncapi value, since the field is the same in every version", async () => {
      for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "2.6.0", "v3.0.0", "", null, false, {}]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("names the server, the version and the approved versions in the message", async () => {
      const [result] = only(await linter.run(single("3.7.0")));
      expect(result.message).toBe("AAR085: Server 'fleetKafka' protocolVersion '3.7.0' must be an approved version: '3.3.0'.");
    });

    test.each(VERSION_CASES.approved.map((version) => [version]))("accepts the version %p", async (version) => {
      expect(findingsOf(await linter.run(single(version)))).toEqual([]);
    });

    test.each(VERSION_CASES.rejected.map((version) => [version]))("rejects the version %p", async (version) => {
      expect(findingsOf(await linter.run(single(version)))).toEqual([["servers.fleetKafka.protocolVersion", notApproved("fleetKafka", version)]]);
    });

    test("checks a whole matrix and reports exactly the rejected versions", async () => {
      const versions = [...VERSION_CASES.approved, ...VERSION_CASES.rejected];
      const reported = reportedCases(await linter.run(matrixDoc(versions)));
      const rejected = new Set(VERSION_CASES.rejected);
      versions.forEach((version, index) => expect([version, reported.has(index)]).toEqual([version, rejected.has(version)]));
    });

    test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string protocolVersion %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.fleetKafka.protocolVersion", notString("fleetKafka")]]);
    });

    test.each(ABSENT_VALUES.map((value) => [value]))("does not report a %p protocolVersion, which is optional", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: { servers: { c: { host: "kafka.quality.es", protocol: "kafka", protocolVersion: value } } } })))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
    });

    test.each([[null], [[]], ["3.3.0"], [42], [true]])("skips a servers or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
    });

    test("escapes control and invisible characters in versions and server names", async () => {
      const doc = base({
        servers: { "fleet\tbroker": { host: "kafka.quality.es", protocol: "kafka", protocolVersion: "3.3.0\r" }, zw: { host: "kafka.quality.es", protocol: "kafka", protocolVersion: "\u20603.3.0" } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.fleet\tbroker.protocolVersion", notApproved("fleet\tbroker", "3.3.0\r")],
          ["servers.zw.protocolVersion", notApproved("zw", "\u20603.3.0")],
        ].sort(byPathAndMessage)
      );
      const messages = only(await linter.run(doc)).map((r) => r.message);
      expect(messages).toContain("AAR085: Server 'fleet\\tbroker' protocolVersion '3.3.0\\r' must be an approved version: '3.3.0'.");
      expect(messages).toContain("AAR085: Server 'zw' protocolVersion '\\u20603.3.0' must be an approved version: '3.3.0'.");
    });

    test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and self references, and ignores external, dangling, cyclic, malformed and non-server targets", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("never validates a server through the channel servers list, the operations or the replies", async () => {
      const doc = base({
        servers: { main: { host: "kafka.quality.es", protocol: "kafka", protocolVersion: "3.3.0" } },
        channels: {
          orders: {
            address: null,
            servers: [{ $ref: "#/servers/main" }, { $ref: "#/x-servers/rogue" }, { host: "inline.example.org", protocol: "kafka", protocolVersion: "2.8.0" }],
          },
        },
        operations: {
          sendOrder: {
            action: "send",
            channel: { $ref: "#/channels/orders" },
            protocolVersion: "2.8.0",
            reply: { channel: { $ref: "#/channels/orders" }, address: { location: "$message.header#/replyTo" } },
          },
        },
        "x-servers": { rogue: { host: "rogue.example.org", protocol: "kafka", protocolVersion: "0.10.2" } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("ignores server variables, including those given as references to components.serverVariables", async () => {
      const doc = base({
        servers: {
          s: { host: "kafka.quality.es:{port}", protocol: "kafka", protocolVersion: "{protocolVersion}", variables: { protocolVersion: { $ref: "#/components/serverVariables/version" }, port: { default: "9092" } } },
        },
        components: { serverVariables: { version: { enum: ["3.3.0"], default: "3.3.0" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([["servers.s.protocolVersion", notApproved("s", "{protocolVersion}")]]);
    });

    test("follows a servers map and a components object given as local references", async () => {
      const doc = base({
        servers: { $ref: "#/components/x-servers" },
        components: {
          "x-servers": { partner: { host: "partner.example.org", protocol: "kafka", protocolVersion: "2.8.0" }, local: { host: "kafka.quality.es", protocol: "kafka", protocolVersion: "3.3.0" } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([["components.x-servers.partner.protocolVersion", notApproved("partner", "2.8.0")]]);
      const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { host: "dr.example.org", protocol: "kafka", protocolVersion: "3.4.0" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.protocolVersion", notApproved("dr", "3.4.0")]]);
    });

    test("ignores a servers map or a components object given as an external, dangling or cyclic reference", async () => {
      const doc = base({ servers: { $ref: "./servers.yaml" }, components: { $ref: "https://specs.example.org/components.yaml" } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
      const dangling = base({ servers: { $ref: "#/components/missing" }, components: { servers: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/servers" } });
      expect(findingsOf(await linter.run(dangling))).toEqual([]);
    });

    test("decodes percent-encoded pointers, treats relative file paths as external and never validates the root, also outside the servers maps", async () => {
      const doc = base({
        servers: {
          encoded: { $ref: "#/x-servers/south%20europe" },
          unicode: { $ref: "#/x-servers/recepci%C3%B3n" },
          relativeFile: { $ref: "./x-servers/rogue" },
          self: { $ref: "#" },
        },
        protocolVersion: "2.8.0",
        "x-servers": {
          "south europe": { host: "se.example.org", protocol: "kafka", protocolVersion: "3.4.0" },
          "recepci\u00f3n": { host: "rx.example.org", protocol: "kafka", protocolVersion: "3.3" },
          rogue: { host: "rogue.example.org", protocol: "kafka", protocolVersion: "0.10.2" },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["x-servers.south europe.protocolVersion", notApproved("south europe", "3.4.0")],
          ["x-servers.recepci\u00f3n.protocolVersion", notApproved("recepci\u00f3n", "3.3")],
        ].sort(byPathAndMessage)
      );
    });

    test("validates servers whose key starts with x- and names with ~0, ~1 or slashes at their own path", async () => {
      const doc = base({
        servers: {
          "x-edge": { host: "edge.example.org", protocol: "kafka", protocolVersion: "3.4.0" },
          "eu~1west": { host: "eu.example.org", protocol: "kafka", protocolVersion: "2.8.0" },
          "a/b~c": { host: "ab.example.org", protocol: "kafka", protocolVersion: "latest" },
        },
        components: { servers: { "x-mirror": { host: "mirror.example.org", protocol: "kafka", protocolVersion: "3.3" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.x-edge.protocolVersion", notApproved("x-edge", "3.4.0")],
          ["servers.eu~1west.protocolVersion", notApproved("eu~1west", "2.8.0")],
          ["servers.a/b~c.protocolVersion", notApproved("a/b~c", "latest")],
          ["components.servers.x-mirror.protocolVersion", notApproved("x-mirror", "3.3")],
        ].sort(byPathAndMessage)
      );
    });

    test("skips null, scalar and array nodes, missing and null versions, extensions, look-alike fields, pathnames, variables, bindings, operations, replies and schemas", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", servers: { a: { host: "localhost", protocol: "kafka", protocolVersion: "2.8.0" } } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
      expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
      expect(findingsOf(await linter.run(withVersion(failLargeGenerated.document, "3.1.0")))).toEqual(failLargeGenerated.expected);
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

    test("a compliant document fails once the list no longer holds its version", async () => {
      const configured = await withVersions("3.4.0");
      expect(pathsOf(await configured.run(okExample))).toEqual(
        [
          "servers.eventstreams.protocolVersion",
          "servers.kafka.protocolVersion",
          "servers.claimsDr.protocolVersion",
          "servers.fraudSignals.protocolVersion",
          "servers.x-mirror.protocolVersion",
          "components.servers.regional.protocolVersion",
        ].sort()
      );
      only(await configured.run(okExample)).forEach((r) => expect(r.message).toBe(notApproved(r.path[r.path.length - 2], "3.3.0", ["3.4.0"])));
    });

    test("a failing document passes once the list holds every version it uses that can be approved", async () => {
      const configured = await withVersions(["3.3.0", ...FAIL_EXAMPLE_APPROVABLE].join(","));
      expect(pathsOf(await configured.run(failExample))).toEqual(
        [
          "servers.tabbedVersion.protocolVersion",
          "servers.blankVersion.protocolVersion",
          "servers.numericVersion.protocolVersion",
          "servers.zeroVersion.protocolVersion",
          "servers.falseVersion.protocolVersion",
          "servers.objectVersion.protocolVersion",
          "servers.refVersion.protocolVersion",
        ].sort()
      );
    });

    test("the configured list also applies to servers reached through references", async () => {
      const configured = await withVersions("2.8.0,1.0,3.5.1");
      expect(findingsOf(await configured.run(failSharedRef))).toEqual(
        [
          ["components.servers.carrier/eu~dr.protocolVersion", notApproved("carrier/eu~dr", "3.3.0-cp1", ["2.8.0", "1.0", "3.5.1"])],
          ["components.servers.compliant.protocolVersion", notApproved("compliant", "3.3.0", ["2.8.0", "1.0", "3.5.1"])],
          ["components.servers.north america.protocolVersion", notApproved("north america", "3.1.1", ["2.8.0", "1.0", "3.5.1"])],
          ["components.servers.recepci\u00f3n.protocolVersion", notApproved("recepci\u00f3n", "kafka-3.3.0", ["2.8.0", "1.0", "3.5.1"])],
        ].sort(byPathAndMessage)
      );
    });

    test("applies the configured list to a very large document", async () => {
      const configured = await withVersions(failLargeGenerated.configuredVersions);
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
