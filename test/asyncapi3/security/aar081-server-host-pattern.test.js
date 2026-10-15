const { linterForRule } = require("../../helpers/utils");
const {
  DEFAULT_PATTERN,
  NEVER,
  mismatch,
  notString,
  HOST_CASES,
  ADDRESS_CASES,
  SHARED_VARIABLES,
  VARIABLE_CASES,
  VARIABLE_SUBSTITUTION_LIMIT,
  capVariables,
  PROBE_HOSTS,
  DEFAULT_ACCEPTED,
  PATTERN_CASES,
  FALLBACK_PATTERNS,
  NON_STRING_VALUES,
  ABSENT_VALUES,
  NON_OBJECT_SERVERS,
} = require("../../helpers/rules/aar081-server-host-pattern");
const okExample = require("./AAR081/ok-example");
const failExample = require("./AAR081/fail-example");
const failSharedRef = require("./AAR081/fail-shared-ref");
const okStructuralEdges = require("./AAR081/ok-structural-edges");
const failLargeGenerated = require("./AAR081/fail-large-generated");

const RULE = "asa:AAR081";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const hostsOf = (results) => only(results).map((r) => /host '(.*)' must match/s.exec(r.message)[1]);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withPattern = (value) => linterForRule(RULE, { functionOptions: { pattern: value } });

const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Quality Server Hosts", version: "1.0.0" }, ...extra });
const single = (host, variables, extra = {}) =>
  base({
    servers: { kafkaOrders: { host, protocol: "kafka", ...extra, ...(variables === undefined ? {} : { variables }) } },
    components: { serverVariables: SHARED_VARIABLES },
  });
const matrixDoc = (hosts) => base({ servers: Object.fromEntries(hosts.map((host, index) => [`case${index}`, { host, protocol: "kafka" }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.partnerKafka.host", mismatch("partnerKafka", "kafka.grid-partner.com")],
  ["servers.localKafka.host", mismatch("localKafka", "localhost")],
  ["servers.substationMqtt.host", mismatch("substationMqtt", "10.20.0.15")],
  ["servers.regionalKafka.host", mismatch("regionalKafka", "eu.kafka.quality.es")],
  ["servers.dispatchAmqp.host", mismatch("dispatchAmqp", "RABBIT.QUALITY.ES")],
  ["servers.controlRoomWs.host", mismatch("controlRoomWs", "quality.es.cdn-edge.net")],
  ["servers.bootstrapList.host", mismatch("bootstrapList", "10.0.4.21")],
  ["servers.schemeInHost.host", mismatch("schemeInHost", "mqtt.grid-partner.com")],
  ["servers.hostVariable.host", mismatch("hostVariable", "kafka.staging.internal")],
  ["servers.environmentDefault.host", mismatch("environmentDefault", "sandbox.local.quality.es")],
  ["servers.tenantGateway.host", mismatch("tenantGateway", "{tenant}.quality.es")],
  ["servers.sharedRegion.host", mismatch("sharedRegion", "grid-eu.west.quality.es")],
  ["servers.emptyHost.host", mismatch("emptyHost", "")],
  ["servers.numericHost.host", notString("numericHost", "host")],
  ["servers.trailingDot.host", mismatch("trailingDot", "kafka.quality.es.")],
  ["servers.underscoreHost.host", mismatch("underscoreHost", "kafka_grid.quality.es")],
  ["servers.ipv6Broker.host", mismatch("ipv6Broker", "[fd00::12]")],
  ["servers.x-legacy.host", mismatch("x-legacy", "legacy-grid.example.org")],
  ["components.servers.drKafka.host", mismatch("drKafka", "kafka-dr.grid.example.org")],
  ["components.servers.sandbox.host", mismatch("sandbox", "sandbox.quality.es.test")],
].sort(byPathAndMessage);

const FAIL_SHARED_REF = [
  ["servers.primary.host", mismatch("primary", "kafka.charging-partner.io")],
  ["components.servers.shared.host", mismatch("shared", "kafka-shared.charging.io")],
  ["components.servers.target.host", mismatch("target", "mqtt.charging.io")],
  ["components.servers.eu/west~primary.host", mismatch("eu/west~primary", "eu-west.charging.io")],
  ["components.servers.north america.host", mismatch("north america", "na.charging.io")],
].sort(byPathAndMessage);

describe("AAR081 (AsyncAPI 3.x): every server host must match the configured pattern", () => {
  let linter;
  let never;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    never = await withPattern(NEVER);
  });

  describe("shipped pattern", () => {
    test("passes a realistic multi-protocol document, ignoring pathname, url, hosts outside Server objects, channel server references, replies and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-compliant host of servers and components.servers with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test("treats any version from 3 upwards as 3.x and reads the host, never the url", async () => {
      for (const version of [3, "3", "3.0", "3.1", " 3.1.0 ", "3.2.0", "4.0.0", 10]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
      expect(findingsOf(await linter.run(single("kafka.quality.es", undefined, { url: "localhost" })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ servers: { s: { url: "kafka.quality.es", host: "localhost", protocol: "kafka" } } })))).toEqual([
        ["servers.s.host", mismatch("s", "localhost")],
      ]);
    });

    test("ignores the pathname, even when it looks like a host", async () => {
      for (const pathname of ["/localhost", "//evil.example.org/stream", "/{env}", "evil.example.org"]) {
        expect(findingsOf(await linter.run(single("kafka.quality.es", { env: { default: "localhost" } }, { pathname })))).toEqual([]);
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(HOST_CASES.valid.map((host) => [host]))("accepts the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([]);
      expect(findingsOf(await linter.run(single(`${host}:9093`)))).toEqual([]);
    });

    test.each(HOST_CASES.invalid.map((host) => [host]))("rejects the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([["servers.kafkaOrders.host", mismatch("kafkaOrders", host)]]);
      expect(findingsOf(await linter.run(single(`${host}:9093`)))).toEqual([["servers.kafkaOrders.host", mismatch("kafkaOrders", host)]]);
    });

    test("checks a whole matrix and reports exactly the invalid hosts", async () => {
      const hosts = [...HOST_CASES.valid, ...HOST_CASES.invalid];
      const reported = reportedCases(await linter.run(matrixDoc(hosts)));
      const invalid = new Set(HOST_CASES.invalid);
      hosts.forEach((host, index) => expect([host, reported.has(index)]).toEqual([host, invalid.has(host)]));
    });

    test.each(ADDRESS_CASES)("reads the host of a host field with %s", async (_, host, hosts) => {
      expect(hostsOf(await never.run(single(host)))).toEqual(hosts);
    });

    test.each(VARIABLE_CASES)("substitutes server variables: %s", async (_, host, variables, produced, rejected) => {
      expect(hostsOf(await never.run(single(host, variables)))).toEqual(produced);
      const results = only(await linter.run(single(host, variables)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual(rejected.map((value) => ["servers.kafkaOrders.host", mismatch("kafkaOrders", value)]));
    });

    test(`evaluates at most ${VARIABLE_SUBSTITUTION_LIMIT} substitutions per server, in declaration order`, async () => {
      const host = "{a}-{b}-{c}-{d}.quality.es:{port}";
      const variables = (badFirst) => ({ ...capVariables(badFirst), port: { enum: ["9092", "9093"] } });
      const all = hostsOf(await never.run(single(host, variables(false))));
      expect(all).toHaveLength(VARIABLE_SUBSTITUTION_LIMIT / 2);
      expect(all[0]).toBe("a0-b0-c0-d0.quality.es");
      expect(findingsOf(await linter.run(single(host, variables(false))))).toEqual([]);
      expect(hostsOf(await linter.run(single(host, variables(true))))).toHaveLength(VARIABLE_SUBSTITUTION_LIMIT / 2);
    });

    test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string host %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.kafkaOrders.host", notString("kafkaOrders", "host")]]);
    });

    test.each(ABSENT_VALUES.map((value) => [value]))("leaves a %p host to the AsyncAPI schema", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { kafkaOrders: { host: value, protocol: "kafka" } } })))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
    });

    test.each([[null], [[]], ["localhost"], [42]])("skips a servers or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
    });

    test("escapes control characters so every message stays on one line", async () => {
      const hosts = ["kafka.quality.es\n", "\u0000broker.quality.es", "broker\u001b.quality.es", "broker.quality.es\u007f", "kafka\t.quality.es"];
      const results = only(await linter.run(matrixDoc(hosts)));
      expect(results.map((r) => r.message).sort()).toEqual(
        [
          mismatch("case0", "kafka.quality.es\\n"),
          mismatch("case1", "\\u0000broker.quality.es"),
          mismatch("case2", "broker\\u001b.quality.es"),
          mismatch("case3", "broker.quality.es\\u007f"),
          mismatch("case4", "kafka\\t.quality.es"),
        ].sort()
      );
    });

    test("validates a shared server once at its definition, follows chained and escaped pointers, and ignores external, dangling and cyclic references", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("a server referenced from channels is validated at its definition only", async () => {
      const doc = base({
        servers: { partner: { host: "kafka.partner.example.org", protocol: "kafka" } },
        channels: { orders: { address: "orders", servers: [{ $ref: "#/servers/partner" }, { $ref: "#/components/servers/dr" }] } },
        components: { servers: { dr: { host: "dr.example.org", protocol: "kafka" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.partner.host", mismatch("partner", "kafka.partner.example.org")],
          ["components.servers.dr.host", mismatch("dr", "dr.example.org")],
        ].sort(byPathAndMessage)
      );
    });

    test("follows a servers map, a components object and a variables map given as local references", async () => {
      const doc = base({
        servers: { $ref: "#/components/x-servers" },
        components: {
          "x-servers": { partner: { host: "kafka.partner.example.org", protocol: "kafka" }, local: { host: "{host}", protocol: "kafka", variables: { $ref: "#/components/x-vars" } } },
          "x-vars": { host: { default: "localhost:9092" } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["components.x-servers.partner.host", mismatch("partner", "kafka.partner.example.org")],
          ["components.x-servers.local.host", mismatch("local", "localhost")],
        ].sort(byPathAndMessage)
      );
      const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { host: "dr.example.org", protocol: "kafka" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.host", mismatch("dr", "dr.example.org")]]);
    });

    test("validates servers whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { host: "edge.example.org", protocol: "kafka" } },
        components: { servers: { "x-mirror": { host: "mirror.example.org", protocol: "kafka" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.x-edge.host", mismatch("x-edge", "edge.example.org")],
          ["components.servers.x-mirror.host", mismatch("x-mirror", "mirror.example.org")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports every non-compliant host of one host field, in order, and keeps the compliant ones silent", async () => {
      const host = "b1.quality.es:9092,localhost:9092,b2.quality.es:9092,10.0.0.7:9092,localhost:9093";
      expect(hostsOf(await linter.run(single(host)))).toEqual(["localhost", "10.0.0.7"]);
    });

    test("skips null, scalar and array nodes, missing and null hosts, 2.x urls, pathnames, extensions, schemas, examples, bindings, replies and operations", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", servers: { a: { host: "localhost", protocol: "kafka" } } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured pattern", () => {
    const acceptedUnder = async (value) => {
      const configured = await withPattern(value);
      const reported = reportedCases(await configured.run(matrixDoc(PROBE_HOSTS)));
      return PROBE_HOSTS.filter((_, index) => !reported.has(index));
    };

    test("the shipped pattern accepts the organization domain and one subdomain level", async () => {
      expect(await acceptedUnder(undefined)).toEqual(DEFAULT_ACCEPTED);
      expect(await acceptedUnder(DEFAULT_PATTERN)).toEqual(DEFAULT_ACCEPTED);
    });

    test.each(PATTERN_CASES)("pattern %p accepts exactly the matching hosts", async (value, expected) => {
      expect((await acceptedUnder(value)).sort()).toEqual([...expected].sort());
    });

    test("keeps the same answer for every host under global and sticky flags", async () => {
      expect(await acceptedUnder("/^([a-zA-Z0-9-]+\\.)?quality\\.es$/g")).toEqual(DEFAULT_ACCEPTED);
      for (const value of ["/^([a-zA-Z0-9-]+\\.)?quality\\.es$/g", "/[a-z]+\\.quality\\.es$/y"]) {
        const configured = await withPattern(value);
        expect(findingsOf(await configured.run(matrixDoc(Array(12).fill("kafka.quality.es:9093"))))).toEqual([]);
      }
    });

    test("trims the configured pattern and names it, as written, in every message", async () => {
      expect((await acceptedUnder("  ^quality\\.es$\t")).sort()).toEqual(["quality.es"]);
      const configured = await withPattern(" /^([a-z0-9-]+\\.)?quality\\.es$/i ");
      expect(findingsOf(await configured.run(single("localhost:9092")))).toEqual([
        ["servers.kafkaOrders.host", mismatch("kafkaOrders", "localhost", "/^([a-z0-9-]+\\.)?quality\\.es$/i")],
      ]);
      expect(findingsOf(await configured.run(single(42)))).toEqual([["servers.kafkaOrders.host", notString("kafkaOrders", "host")]]);
    });

    test("applies the configured pattern to hosts built from server variables", async () => {
      const configured = await withPattern("^kafka-(dev|pre)\\.quality\\.es$");
      const variables = { environment: { enum: ["kafka-dev", "kafka-pre", "kafka-pro"], default: "kafka-pro" }, port: { default: "9092" } };
      expect(hostsOf(await configured.run(single("{environment}.quality.es:{port}", variables)))).toEqual(["kafka-pro.quality.es"]);
    });

    test("a compliant document fails once the pattern is narrowed to Kafka hosts", async () => {
      const configured = await withPattern("^kafka[a-z0-9-]*\\.quality\\.es$");
      const paths = findingsOf(await configured.run(okExample)).map(([p]) => p);
      expect(paths).toContain("servers.driverMqtt.host");
      expect(paths).toContain("servers.kafkaBrokers.host");
      expect(paths).toContain("components.servers.unusedMirror.host");
      expect(paths).not.toContain("servers.kafkaProd.host");
      expect(paths).not.toContain("servers.schemeInHost.host");
      expect(paths).not.toContain("components.servers.drKafka.host");
      expect(paths.filter((p) => !/^(servers|components\.servers)\.[^.]+\.host$/.test(p))).toEqual([]);
    });

    test("a failing document passes once the pattern accepts every host, except its non-string host", async () => {
      const configured = await withPattern(".*");
      expect(findingsOf(await configured.run(failExample))).toEqual([["servers.numericHost.host", notString("numericHost", "host")]]);
    });

    test.each(FALLBACK_PATTERNS.map((value) => [value]))("falls back to the shipped pattern when pattern is %p", async (value) => {
      const configured = await withPattern(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
      expect(findingsOf(await configured.run(single("localhost:9092")))).toEqual([["servers.kafkaOrders.host", mismatch("kafkaOrders", "localhost")]]);
    });
  });
});
