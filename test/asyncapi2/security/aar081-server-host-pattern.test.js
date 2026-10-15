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

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Quality Server Hosts", version: "1.0.0" }, ...extra });
const single = (url, variables) =>
  base({
    servers: { kafkaOrders: { url, protocol: "kafka", ...(variables === undefined ? {} : { variables }) } },
    components: { serverVariables: SHARED_VARIABLES },
  });
const matrixDoc = (urls) => base({ servers: Object.fromEntries(urls.map((url, index) => [`case${index}`, { url, protocol: "kafka" }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.partnerKafka.url", mismatch("partnerKafka", "kafka.payments-partner.com")],
  ["servers.localKafka.url", mismatch("localKafka", "localhost")],
  ["servers.fraudMqtt.url", mismatch("fraudMqtt", "10.20.0.15")],
  ["servers.regionalKafka.url", mismatch("regionalKafka", "eu.kafka.quality.es")],
  ["servers.settlementsAmqp.url", mismatch("settlementsAmqp", "RABBIT.QUALITY.ES")],
  ["servers.cardsWs.url", mismatch("cardsWs", "quality.es.cdn-edge.net")],
  ["servers.bootstrapList.url", mismatch("bootstrapList", "10.0.4.21")],
  ["servers.hostVariable.url", mismatch("hostVariable", "kafka.staging.internal")],
  ["servers.environmentDefault.url", mismatch("environmentDefault", "sandbox.local.quality.es")],
  ["servers.tenantGateway.url", mismatch("tenantGateway", "{tenant}.quality.es")],
  ["servers.sharedRegion.url", mismatch("sharedRegion", "payments-eu.west.quality.es")],
  ["servers.relativeWs.url", mismatch("relativeWs", "")],
  ["servers.emptyUrl.url", mismatch("emptyUrl", "")],
  ["servers.numericUrl.url", notString("numericUrl", "url")],
  ["servers.trailingDot.url", mismatch("trailingDot", "kafka.quality.es.")],
  ["servers.underscoreHost.url", mismatch("underscoreHost", "kafka_payments.quality.es")],
  ["servers.ipv6Broker.url", mismatch("ipv6Broker", "[fd00::12]")],
  ["servers.x-legacy.url", mismatch("x-legacy", "legacy-payments.example.org")],
  ["components.servers.drKafka.url", mismatch("drKafka", "kafka-dr.payments.example.org")],
  ["components.servers.sandbox.url", mismatch("sandbox", "sandbox.quality.es.test")],
].sort(byPathAndMessage);

const FAIL_SHARED_REF = [
  ["servers.primary.url", mismatch("primary", "kafka.charging-partner.io")],
  ["components.servers.shared.url", mismatch("shared", "kafka-shared.charging.io")],
  ["components.servers.target.url", mismatch("target", "mqtt.charging.io")],
  ["components.servers.eu/west~primary.url", mismatch("eu/west~primary", "eu-west.charging.io")],
  ["components.servers.north america.url", mismatch("north america", "na.charging.io")],
].sort(byPathAndMessage);

describe("AAR081 (AsyncAPI 2.x): every server host must match the configured pattern", () => {
  let linter;
  let never;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    never = await withPattern(NEVER);
  });

  describe("shipped pattern", () => {
    test("passes a realistic multi-protocol document, ignoring hosts outside Server objects, extensions, the 3.x host field and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-compliant host of servers and components.servers with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test("treats a version that is not 3.x as 2.x and reads the url, never the host", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null, true]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
      const results = only(await linter.run(single("kafka.quality.es")));
      expect(results).toEqual([]);
      const hostOnly = base({ servers: { s: { host: "localhost", url: "kafka.quality.es", protocol: "kafka" } } });
      expect(findingsOf(await linter.run(hostOnly))).toEqual([]);
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(HOST_CASES.valid.map((host) => [host]))("accepts the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([]);
      expect(findingsOf(await linter.run(single(`kafka://${host}:9092/events`)))).toEqual([]);
    });

    test.each(HOST_CASES.invalid.map((host) => [host]))("rejects the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([["servers.kafkaOrders.url", mismatch("kafkaOrders", host)]]);
      expect(findingsOf(await linter.run(single(`kafka://svc@${host}:9092/events`)))).toEqual([["servers.kafkaOrders.url", mismatch("kafkaOrders", host)]]);
    });

    test("checks a whole matrix and reports exactly the invalid hosts", async () => {
      const hosts = [...HOST_CASES.valid, ...HOST_CASES.invalid];
      const reported = reportedCases(await linter.run(matrixDoc(hosts)));
      const invalid = new Set(HOST_CASES.invalid);
      hosts.forEach((host, index) => expect([host, reported.has(index)]).toEqual([host, invalid.has(host)]));
    });

    test.each(ADDRESS_CASES)("reads the host of a url with %s", async (_, url, hosts) => {
      expect(hostsOf(await never.run(single(url)))).toEqual(hosts);
    });

    test.each(VARIABLE_CASES)("substitutes server variables: %s", async (_, url, variables, produced, rejected) => {
      expect(hostsOf(await never.run(single(url, variables)))).toEqual(produced);
      const results = only(await linter.run(single(url, variables)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual(rejected.map((host) => ["servers.kafkaOrders.url", mismatch("kafkaOrders", host)]));
    });

    test(`evaluates at most ${VARIABLE_SUBSTITUTION_LIMIT} substitutions per server, in declaration order`, async () => {
      const url = "{a}-{b}-{c}-{d}.quality.es";
      const all = hostsOf(await never.run(single(url, capVariables(false))));
      expect(all).toHaveLength(VARIABLE_SUBSTITUTION_LIMIT);
      expect(all[0]).toBe("a0-b0-c0-d0.quality.es");
      expect(all[VARIABLE_SUBSTITUTION_LIMIT - 1]).toBe("a0-b9-c9-d9.quality.es");
      expect(findingsOf(await linter.run(single(url, capVariables(false))))).toEqual([]);
      expect(hostsOf(await linter.run(single(url, capVariables(true))))).toHaveLength(VARIABLE_SUBSTITUTION_LIMIT);
    });

    test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string url %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.kafkaOrders.url", notString("kafkaOrders", "url")]]);
    });

    test.each(ABSENT_VALUES.map((value) => [value]))("leaves a %p url to the AsyncAPI schema", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { kafkaOrders: { url: value, protocol: "kafka" } } })))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
    });

    test.each([[null], [[]], ["localhost"], [42]])("skips a servers or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
    });

    test("escapes control characters so every message stays on one line", async () => {
      const urls = ["kafka.quality.es\n", "\u0000broker.quality.es", "broker\u001b.quality.es", "broker.quality.es\u007f", "kafka\t.quality.es", "kafka.quality.es\r\n"];
      const results = only(await linter.run(matrixDoc(urls)));
      expect(results.map((r) => r.message).sort()).toEqual(
        [
          mismatch("case0", "kafka.quality.es\\n"),
          mismatch("case1", "\\u0000broker.quality.es"),
          mismatch("case2", "broker\\u001b.quality.es"),
          mismatch("case3", "broker.quality.es\\u007f"),
          mismatch("case4", "kafka\\t.quality.es"),
          mismatch("case5", "kafka.quality.es\\r\\n"),
        ].sort()
      );
    });

    test("validates a shared server once at its definition, follows chained and escaped pointers, and ignores external, dangling and cyclic references", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("follows a servers map, a components object and a variables map given as local references", async () => {
      const doc = base({
        servers: { $ref: "#/components/x-servers" },
        components: {
          "x-servers": { partner: { url: "kafka.partner.example.org", protocol: "kafka" }, local: { url: "{host}", protocol: "kafka", variables: { $ref: "#/components/x-vars" } } },
          "x-vars": { host: { default: "localhost:9092" } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["components.x-servers.partner.url", mismatch("partner", "kafka.partner.example.org")],
          ["components.x-servers.local.url", mismatch("local", "localhost")],
        ].sort(byPathAndMessage)
      );
      const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { url: "dr.example.org", protocol: "kafka" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.url", mismatch("dr", "dr.example.org")]]);
    });

    test("validates servers whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { url: "edge.example.org", protocol: "kafka" } },
        components: { servers: { "x-mirror": { url: "mirror.example.org", protocol: "kafka" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.x-edge.url", mismatch("x-edge", "edge.example.org")],
          ["components.servers.x-mirror.url", mismatch("x-mirror", "mirror.example.org")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports every non-compliant host of one url, in order, and keeps the compliant ones silent", async () => {
      const url = "kafka://b1.quality.es:9092,localhost:9092,b2.quality.es:9092,10.0.0.7:9092,localhost:9093";
      expect(hostsOf(await linter.run(single(url)))).toEqual(["localhost", "10.0.0.7"]);
    });

    test("skips null, scalar and array nodes, missing and null urls, extensions, schemas, examples, bindings and 3.x-only structures", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", servers: { a: { url: "localhost", protocol: "kafka" } } }]))).toEqual([]);
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
        expect(findingsOf(await configured.run(matrixDoc(Array(12).fill("kafka.quality.es"))))).toEqual([]);
      }
    });

    test("trims the configured pattern and names it, as written, in every message", async () => {
      expect((await acceptedUnder("  ^quality\\.es$\t")).sort()).toEqual(["quality.es"]);
      const configured = await withPattern(" /^([a-z0-9-]+\\.)?quality\\.es$/i ");
      expect(findingsOf(await configured.run(single("localhost")))).toEqual([
        ["servers.kafkaOrders.url", mismatch("kafkaOrders", "localhost", "/^([a-z0-9-]+\\.)?quality\\.es$/i")],
      ]);
      expect(findingsOf(await configured.run(single(42)))).toEqual([["servers.kafkaOrders.url", notString("kafkaOrders", "url")]]);
    });

    test("applies the configured pattern to hosts built from server variables", async () => {
      const configured = await withPattern("^kafka-(dev|pre)\\.quality\\.es$");
      const url = "{environment}.quality.es:{port}";
      const variables = { environment: { enum: ["kafka-dev", "kafka-pre", "kafka-pro"], default: "kafka-pro" }, port: { default: "9092" } };
      expect(hostsOf(await configured.run(single(url, variables)))).toEqual(["kafka-pro.quality.es"]);
    });

    test("a compliant document fails once the pattern is narrowed to Kafka hosts", async () => {
      const configured = await withPattern("^kafka[a-z0-9-]*\\.quality\\.es$");
      const paths = findingsOf(await configured.run(okExample)).map(([p]) => p);
      expect(paths).toContain("servers.mqttTelemetry.url");
      expect(paths).toContain("servers.kafkaBrokers.url");
      expect(paths).toContain("components.servers.unusedMirror.url");
      expect(paths).not.toContain("servers.kafkaProd.url");
      expect(paths).not.toContain("servers.kafkaByEnvironment.url");
      expect(paths).not.toContain("components.servers.drKafka.url");
      expect(paths.filter((p) => !/^(servers|components\.servers)\.[^.]+\.url$/.test(p))).toEqual([]);
    });

    test("a failing document passes once the pattern accepts every host, except its non-string url", async () => {
      const configured = await withPattern(".*");
      expect(findingsOf(await configured.run(failExample))).toEqual([["servers.numericUrl.url", notString("numericUrl", "url")]]);
    });

    test.each(FALLBACK_PATTERNS.map((value) => [value]))("falls back to the shipped pattern when pattern is %p", async (value) => {
      const configured = await withPattern(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
      expect(findingsOf(await configured.run(single("localhost")))).toEqual([["servers.kafkaOrders.url", mismatch("kafkaOrders", "localhost")]]);
    });
  });
});
