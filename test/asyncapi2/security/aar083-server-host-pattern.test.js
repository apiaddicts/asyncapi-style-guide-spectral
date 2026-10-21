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
} = require("../../helpers/rules/aar083-server-host-pattern");
const okExample = require("./AAR083/ok-example");
const failExample = require("./AAR083/fail-example");
const failSharedRef = require("./AAR083/fail-shared-ref");
const okStructuralEdges = require("./AAR083/ok-structural-edges");
const failLargeGenerated = require("./AAR083/fail-large-generated");

const RULE = "asa:AAR083";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const hostsOf = (results) => only(results).map((r) => /host '(.*)' must match/s.exec(r.message)[1]);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withPattern = (value) => linterForRule(RULE, { functionOptions: { pattern: value } });

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Quality Server Hosts", version: "1.0.0" }, ...extra });
const single = (url, variables) =>
  base({
    servers: { claimsKafka: { url, protocol: "kafka", ...(variables === undefined ? {} : { variables }) } },
    components: { serverVariables: SHARED_VARIABLES },
  });
const matrixDoc = (urls) => base({ servers: Object.fromEntries(urls.map((url, index) => [`case${index}`, { url, protocol: "kafka" }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.confluentCloud.url", mismatch("confluentCloud", "pkc-4nym6.eu-west-1.aws.confluent.cloud")],
  ["servers.amazonMsk.url", mismatch("amazonMsk", "b-1.claims.abc123.c2.kafka.eu-west-1.amazonaws.com")],
  ["servers.amazonMsk.url", mismatch("amazonMsk", "b-2.claims.abc123.c2.kafka.eu-west-1.amazonaws.com")],
  ["servers.eventHubs.url", mismatch("eventHubs", "orders.servicebus.windows.net")],
  ["servers.hivemqCloud.url", mismatch("hivemqCloud", "a1b2c3.s1.eu.hivemq.cloud")],
  ["servers.cloudAmqp.url", mismatch("cloudAmqp", "goose.rmq2.cloudamqp.com")],
  ["servers.clusterLocal.url", mismatch("clusterLocal", "kafka.events.svc.cluster.local")],
  ["servers.typoDomain.url", mismatch("typoDomain", "kafka.qualty.es")],
  ["servers.suffixAttack.url", mismatch("suffixAttack", "kafka.quality.es.evil.net")],
  ["servers.encodedDot.url", mismatch("encodedDot", "kafka%2Equality.es")],
  ["servers.zoneIpv6.url", mismatch("zoneIpv6", "[fe80::1%25eth0]")],
  ["servers.nestedSubdomain.url", mismatch("nestedSubdomain", "claims.eu.quality.es")],
  ["servers.upperDomain.url", mismatch("upperDomain", "adjusters.Quality.Es")],
  ["servers.variableDefaultForeign.url", mismatch("variableDefaultForeign", "claims.partner.quality.es")],
  ["servers.variableRefChain.url", mismatch("variableRefChain", "kafka.reinsurer.example.org")],
  ["servers.unresolvedPlaceholder.url", mismatch("unresolvedPlaceholder", "{tenant}.quality.es")],
  ["servers.portVariableForeignHost.url", mismatch("portVariableForeignHost", "kafka.reinsurer.example.org")],
  ["servers.listWithVariable.url", mismatch("listWithVariable", "dr.reinsurer.example.org")],
  ["servers.objectUrl.url", notString("objectUrl", "url")],
  ["servers.arrayUrl.url", notString("arrayUrl", "url")],
  ["servers.emptyAfterScheme.url", mismatch("emptyAfterScheme", "")],
  ["servers.urnUrl.url", mismatch("urnUrl", "urn")],
  ["servers.x-partner.url", mismatch("x-partner", "kafka.broker-partner.example.org")],
  ["components.servers.reinsurer.url", mismatch("reinsurer", "kafka.reinsurer.example.org")],
  ["components.servers.legacyIp.url", mismatch("legacyIp", "10.10.4.20")],
].sort(byPathAndMessage);

const FAIL_SHARED_REF = [
  ["servers.partner.url", mismatch("partner", "kafka.treaty-partner.example.org")],
  ["components.servers.claimsHub.url", mismatch("claimsHub", "claims-hub.treaty-partner.example.org")],
  ["components.servers.hop2.url", mismatch("hop2", "final.treaty-partner.example.org")],
  ["components.servers.claims/eu~dr.url", mismatch("claims/eu~dr", "dr-eu.treaty-partner.example.org")],
  ["components.servers.latin america.url", mismatch("latin america", "latam.treaty-partner.example.org")],
  ["components.servers.españa.url", mismatch("españa", "es.treaty-partner.example.org")],
  ["info.contact.url", mismatch("contact", "treaties.example.org")],
].sort(byPathAndMessage);

describe("AAR083 (AsyncAPI 2.x): every server host must match the enterprise host pattern", () => {
  let linter;
  let never;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    never = await withPattern(NEVER);
  });

  describe("shipped pattern", () => {
    test("passes a realistic insurance document across ten protocols, ignoring OAuth, OpenID, registry and documentation URLs, bindings, payloads, the 3.x host field and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-compliant host of servers and components.servers with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("treats a version that is not 3.x as 2.x and reads the url, never the host", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "0.9.0", "v3.0.0", "", null, false, {}]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
      const hostOnly = base({ servers: { s: { host: "localhost", pathname: "/x", url: "kafka.quality.es", protocol: "kafka" } } });
      expect(findingsOf(await linter.run(hostOnly))).toEqual([]);
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(HOST_CASES.valid.map((host) => [host]))("accepts the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([]);
      expect(findingsOf(await linter.run(single(`amqps://svc:pw@${host}:5671/%2Fclaims?heartbeat=30`)))).toEqual([]);
    });

    test.each(HOST_CASES.invalid.map((host) => [host]))("rejects the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([["servers.claimsKafka.url", mismatch("claimsKafka", host)]]);
      expect(findingsOf(await linter.run(single(`mqtts://${host}:8883/claims`)))).toEqual([["servers.claimsKafka.url", mismatch("claimsKafka", host)]]);
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
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual(rejected.map((host) => ["servers.claimsKafka.url", mismatch("claimsKafka", host)]));
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
      expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.claimsKafka.url", notString("claimsKafka", "url")]]);
    });

    test.each(ABSENT_VALUES.map((value) => [value]))("leaves a %p url to the AsyncAPI schema", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { claimsKafka: { url: value, protocol: "kafka" } } })))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
    });

    test.each([[null], [[]], ["localhost"], [42], [true]])("skips a servers or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
    });

    test("escapes control characters so every message stays on one line", async () => {
      const urls = ["claims.quality.es\n", "\u0000claims.quality.es", "claims\u001b.quality.es", "claims.quality.es\u007f", "claims\t.quality.es", "claims.quality.es\r\n"];
      const results = only(await linter.run(matrixDoc(urls)));
      expect(results.map((r) => r.message).sort()).toEqual(
        [
          mismatch("case0", "claims.quality.es\\n"),
          mismatch("case1", "\\u0000claims.quality.es"),
          mismatch("case2", "claims\\u001b.quality.es"),
          mismatch("case3", "claims.quality.es\\u007f"),
          mismatch("case4", "claims\\t.quality.es"),
          mismatch("case5", "claims.quality.es\\r\\n"),
        ].sort()
      );
    });

    test("escapes control characters in server names too", async () => {
      const doc = base({ servers: { "claims\nkafka": { url: "localhost", protocol: "kafka" } } });
      expect(findingsOf(await linter.run(doc))).toEqual([["servers.claims\nkafka.url", mismatch("claims\\nkafka", "localhost")]]);
    });

    test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and self references, and ignores external, dangling, cyclic and malformed ones", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("follows a servers map, a components object and a variables map given as local references", async () => {
      const doc = base({
        servers: { $ref: "#/components/x-servers" },
        components: {
          "x-servers": { reinsurer: { url: "kafka.reinsurer.example.org", protocol: "kafka" }, lab: { url: "{host}", protocol: "kafka", variables: { $ref: "#/components/x-vars" } } },
          "x-vars": { host: { enum: ["claims.quality.es:9092", "localhost:9092"] } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["components.x-servers.reinsurer.url", mismatch("reinsurer", "kafka.reinsurer.example.org")],
          ["components.x-servers.lab.url", mismatch("lab", "localhost")],
        ].sort(byPathAndMessage)
      );
      const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { url: "dr.example.org", protocol: "kafka" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.url", mismatch("dr", "dr.example.org")]]);
    });

    test("ignores a servers map or a components object given as an external reference", async () => {
      const doc = base({ servers: { $ref: "./servers.yaml" }, components: { $ref: "https://specs.example.org/components.yaml" } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
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

    test("reports servers whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({
        servers: { "eu~1west": { url: "eu.example.org", protocol: "kafka" }, "kafka~0dr": { url: "dr.example.org", protocol: "kafka" }, "a/b~c": { url: "ab.example.org", protocol: "kafka" } },
        components: { servers: { "mirror~1x": { url: "mirror.example.org", protocol: "kafka" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.eu~1west.url", mismatch("eu~1west", "eu.example.org")],
          ["servers.kafka~0dr.url", mismatch("kafka~0dr", "dr.example.org")],
          ["servers.a/b~c.url", mismatch("a/b~c", "ab.example.org")],
          ["components.servers.mirror~1x.url", mismatch("mirror~1x", "mirror.example.org")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports every non-compliant host of one url, in order, once each, and keeps the compliant ones silent", async () => {
      const url = "kafka://b1.quality.es:9092,pkc-1.confluent.cloud:9092,b2.quality.es:9092,10.0.0.7:9092,pkc-1.confluent.cloud:9093";
      expect(hostsOf(await linter.run(single(url)))).toEqual(["pkc-1.confluent.cloud", "10.0.0.7"]);
    });

    test("skips null, scalar and array nodes, missing and null urls, extensions, schemas, examples, bindings, security and 3.x-only structures", async () => {
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
      expect(failLargeGenerated.expected.length).toBeGreaterThan(150);
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
      for (const value of ["/^([a-zA-Z0-9-]+\\.)?quality\\.es$/g", "/[a-z]+\\.quality\\.es$/y", "/^([a-z0-9-]+\\.)?quality\\.es$/gy"]) {
        const configured = await withPattern(value);
        expect(findingsOf(await configured.run(matrixDoc(Array(12).fill("mqtts://claims.quality.es:8883"))))).toEqual([]);
      }
    });

    test("trims the configured pattern and names it, as written, in every message", async () => {
      expect((await acceptedUnder("\n ^quality\\.es$ ")).sort()).toEqual(["quality.es"]);
      const configured = await withPattern("\t/^([a-z0-9-]+\\.)?quality\\.es$/i  ");
      expect(findingsOf(await configured.run(single("kafka://pkc-1.confluent.cloud:9092")))).toEqual([
        ["servers.claimsKafka.url", mismatch("claimsKafka", "pkc-1.confluent.cloud", "/^([a-z0-9-]+\\.)?quality\\.es$/i")],
      ]);
      expect(findingsOf(await configured.run(single(9093)))).toEqual([["servers.claimsKafka.url", notString("claimsKafka", "url")]]);
    });

    test("applies the configured pattern to hosts built from server variables", async () => {
      const configured = await withPattern("^claims-(dev|pre)\\.quality\\.es$");
      const url = "{scheme}://{environment}.quality.es:{port}";
      const variables = { scheme: { enum: ["kafka", "kafka-secure"] }, environment: { enum: ["claims-dev", "claims-pre", "claims-pro"], default: "claims-pro" }, port: { default: "9092" } };
      expect(hostsOf(await configured.run(single(url, variables)))).toEqual(["claims-pro.quality.es"]);
    });

    test("a compliant document fails once the pattern is narrowed to Kafka hosts", async () => {
      const configured = await withPattern("^kafka[a-z0-9-]*\\.quality\\.es$");
      const paths = findingsOf(await configured.run(okExample)).map(([p]) => p);
      expect(paths).toContain("servers.telematicsMqtt.url");
      expect(paths).toContain("servers.policyMainframe.url");
      expect(paths).toContain("servers.httpsCallbacks.url");
      expect(paths).toContain("components.servers.sandbox.url");
      expect(paths).not.toContain("servers.claimsKafka.url");
      expect(paths).not.toContain("servers.x-dr.url");
      expect(paths).not.toContain("servers.migratedTo3x.url");
      expect(paths).not.toContain("components.servers.regional.url");
      expect(paths.filter((p) => !/^(servers|components\.servers)\.[^.]+\.url$/.test(p))).toEqual([]);
    });

    test("a failing document passes once the pattern accepts every host, except its non-string urls", async () => {
      const configured = await withPattern(".*");
      expect(findingsOf(await configured.run(failExample))).toEqual(
        [
          ["servers.objectUrl.url", notString("objectUrl", "url")],
          ["servers.arrayUrl.url", notString("arrayUrl", "url")],
        ].sort(byPathAndMessage)
      );
    });

    test.each(FALLBACK_PATTERNS.map((value) => [value]))("falls back to the shipped pattern when pattern is %p", async (value) => {
      const configured = await withPattern(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
      expect(findingsOf(await configured.run(single("localhost")))).toEqual([["servers.claimsKafka.url", mismatch("claimsKafka", "localhost")]]);
    });
  });
});
