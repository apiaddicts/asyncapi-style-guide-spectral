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

const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Quality Server Hosts", version: "1.0.0" }, ...extra });
const single = (host, variables, extra = {}) =>
  base({
    servers: { plantKafka: { host, protocol: "kafka", ...extra, ...(variables === undefined ? {} : { variables }) } },
    components: { serverVariables: SHARED_VARIABLES },
  });
const matrixDoc = (hosts) => base({ servers: Object.fromEntries(hosts.map((host, index) => [`case${index}`, { host, protocol: "kafka" }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.confluentCloud.host", mismatch("confluentCloud", "pkc-4nym6.eu-west-1.aws.confluent.cloud")],
  ["servers.amazonMsk.host", mismatch("amazonMsk", "b-1.plants.abc123.c2.kafka.eu-west-1.amazonaws.com")],
  ["servers.amazonMsk.host", mismatch("amazonMsk", "b-2.plants.abc123.c2.kafka.eu-west-1.amazonaws.com")],
  ["servers.eventHubs.host", mismatch("eventHubs", "suppliers.servicebus.windows.net")],
  ["servers.hivemqCloud.host", mismatch("hivemqCloud", "a1b2c3.s1.eu.hivemq.cloud")],
  ["servers.cloudAmqp.host", mismatch("cloudAmqp", "goose.rmq2.cloudamqp.com")],
  ["servers.clusterLocal.host", mismatch("clusterLocal", "kafka.plants.svc.cluster.local")],
  ["servers.typoDomain.host", mismatch("typoDomain", "kafka.qualty.es")],
  ["servers.suffixAttack.host", mismatch("suffixAttack", "kafka.quality.es.evil.net")],
  ["servers.encodedDot.host", mismatch("encodedDot", "kafka%2Equality.es")],
  ["servers.zoneIpv6.host", mismatch("zoneIpv6", "[fe80::1%25eth0]")],
  ["servers.nestedSubdomain.host", mismatch("nestedSubdomain", "plants.eu.quality.es")],
  ["servers.upperDomain.host", mismatch("upperDomain", "scada.Quality.Es")],
  ["servers.variableDefaultForeign.host", mismatch("variableDefaultForeign", "plants.supplier.quality.es")],
  ["servers.variableRefChain.host", mismatch("variableRefChain", "kafka.supplier.example.org")],
  ["servers.unresolvedPlaceholder.host", mismatch("unresolvedPlaceholder", "{tenant}.quality.es")],
  ["servers.portVariableForeignHost.host", mismatch("portVariableForeignHost", "kafka.supplier.example.org")],
  ["servers.listWithVariable.host", mismatch("listWithVariable", "dr.supplier.example.org")],
  ["servers.pathnameVariableOnly.host", mismatch("pathnameVariableOnly", "mqtt.supplier.example.org")],
  ["servers.objectHost.host", notString("objectHost", "host")],
  ["servers.arrayHost.host", notString("arrayHost", "host")],
  ["servers.emptyHost.host", mismatch("emptyHost", "")],
  ["servers.urnHost.host", mismatch("urnHost", "urn")],
  ["servers.x-supplier.host", mismatch("x-supplier", "kafka.broker-supplier.example.org")],
  ["components.servers.supplier.host", mismatch("supplier", "kafka.supplier.example.org")],
  ["components.servers.legacyIp.host", mismatch("legacyIp", "10.10.4.20")],
].sort(byPathAndMessage);

const FAIL_SHARED_REF = [
  ["servers.partner.host", mismatch("partner", "kafka.contract-partner.example.org")],
  ["components.servers.assemblyHub.host", mismatch("assemblyHub", "assembly-hub.contract-partner.example.org")],
  ["components.servers.hop2.host", mismatch("hop2", "final.contract-partner.example.org")],
  ["components.servers.plants/eu~dr.host", mismatch("plants/eu~dr", "dr-eu.contract-partner.example.org")],
  ["components.servers.latin america.host", mismatch("latin america", "latam.contract-partner.example.org")],
  ["components.servers.españa.host", mismatch("españa", "es.contract-partner.example.org")],
].sort(byPathAndMessage);

describe("AAR083 (AsyncAPI 3.x): every server host must match the enterprise host pattern", () => {
  let linter;
  let never;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    never = await withPattern(NEVER);
  });

  describe("shipped pattern", () => {
    test("passes a realistic manufacturing document across ten protocols, ignoring pathnames, 2.x urls, OAuth, OpenID, registry and documentation URLs, replies, parameters and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-compliant host of servers and components.servers with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("treats any version from 3 upwards as 3.x and reads the host, never the url", async () => {
      for (const version of [3, "3", "3.0", "3.1", " 3.1.0 ", "3.0.0-rc1", "3.2.0", "4.0.0", 10]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
      expect(findingsOf(await linter.run(single("kafka.quality.es", undefined, { url: "localhost" })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ servers: { s: { url: "kafka.quality.es", host: "pkc-1.confluent.cloud", protocol: "kafka" } } })))).toEqual([
        ["servers.s.host", mismatch("s", "pkc-1.confluent.cloud")],
      ]);
    });

    test("ignores the pathname and its variables, even when they look like hosts", async () => {
      for (const pathname of ["/localhost", "//evil.example.org/stream", "/{env}", "evil.example.org", "/{env}.example.org:9092"]) {
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
      expect(findingsOf(await linter.run(single(`${host}:8883`, undefined, { pathname: "/lines" })))).toEqual([]);
    });

    test.each(HOST_CASES.invalid.map((host) => [host]))("rejects the host %p", async (host) => {
      expect(findingsOf(await linter.run(single(host)))).toEqual([["servers.plantKafka.host", mismatch("plantKafka", host)]]);
      expect(findingsOf(await linter.run(single(`${host}:8883`, undefined, { pathname: "/lines" })))).toEqual([["servers.plantKafka.host", mismatch("plantKafka", host)]]);
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
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual(rejected.map((value) => ["servers.plantKafka.host", mismatch("plantKafka", value)]));
    });

    test(`evaluates at most ${VARIABLE_SUBSTITUTION_LIMIT} substitutions per server, in declaration order`, async () => {
      const host = "{a}-{b}-{c}-{d}.quality.es";
      const all = hostsOf(await never.run(single(host, capVariables(false))));
      expect(all).toHaveLength(VARIABLE_SUBSTITUTION_LIMIT);
      expect(all[0]).toBe("a0-b0-c0-d0.quality.es");
      expect(all[VARIABLE_SUBSTITUTION_LIMIT - 1]).toBe("a0-b9-c9-d9.quality.es");
      expect(findingsOf(await linter.run(single(host, capVariables(false))))).toEqual([]);
      expect(hostsOf(await linter.run(single(host, capVariables(true))))).toHaveLength(VARIABLE_SUBSTITUTION_LIMIT);
    });

    test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string host %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.plantKafka.host", notString("plantKafka", "host")]]);
    });

    test.each(ABSENT_VALUES.map((value) => [value]))("leaves a %p host to the AsyncAPI schema", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { plantKafka: { host: value, pathname: "/x", protocol: "kafka" } } })))).toEqual([]);
    });

    test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
    });

    test.each([[null], [[]], ["localhost"], [42], [true]])("skips a servers or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
    });

    test("escapes control characters so every message stays on one line", async () => {
      const hosts = ["plant.quality.es\n", "\u0000plant.quality.es", "plant\u001b.quality.es", "plant.quality.es\u007f", "plant\t.quality.es"];
      const results = only(await linter.run(matrixDoc(hosts)));
      expect(results.map((r) => r.message).sort()).toEqual(
        [
          mismatch("case0", "plant.quality.es\\n"),
          mismatch("case1", "\\u0000plant.quality.es"),
          mismatch("case2", "plant\\u001b.quality.es"),
          mismatch("case3", "plant.quality.es\\u007f"),
          mismatch("case4", "plant\\t.quality.es"),
        ].sort()
      );
    });

    test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and self references, ignores external, dangling, cyclic and malformed ones, and objects without a host", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("a server referenced from channels and operations is validated at its definition only", async () => {
      const doc = base({
        servers: { partner: { host: "kafka.partner.example.org", protocol: "kafka" } },
        channels: {
          orders: { address: "orders", servers: [{ $ref: "#/servers/partner" }, { $ref: "#/components/servers/dr" }] },
          replies: { address: null, servers: [{ $ref: "#/servers/partner" }] },
        },
        operations: { receiveOrder: { action: "receive", channel: { $ref: "#/channels/orders" }, reply: { channel: { $ref: "#/channels/replies" } } } },
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
          "x-servers": { supplier: { host: "kafka.supplier.example.org", protocol: "kafka" }, lab: { host: "{host}", protocol: "kafka", variables: { $ref: "#/components/x-vars" } } },
          "x-vars": { host: { enum: ["plant.quality.es:9092", "localhost:9092"] } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["components.x-servers.supplier.host", mismatch("supplier", "kafka.supplier.example.org")],
          ["components.x-servers.lab.host", mismatch("lab", "localhost")],
        ].sort(byPathAndMessage)
      );
      const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { host: "dr.example.org", protocol: "kafka" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.host", mismatch("dr", "dr.example.org")]]);
    });

    test("ignores a servers map or a components object given as an external reference", async () => {
      const doc = base({ servers: { $ref: "./servers.yaml" }, components: { $ref: "https://specs.example.org/components.yaml" } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
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

    test("reports servers whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({
        servers: { "eu~1west": { host: "eu.example.org", protocol: "kafka" }, "kafka~0dr": { host: "dr.example.org", protocol: "kafka" }, "a/b~c": { host: "ab.example.org", protocol: "kafka" } },
        components: { servers: { "mirror~1x": { host: "mirror.example.org", protocol: "kafka" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.eu~1west.host", mismatch("eu~1west", "eu.example.org")],
          ["servers.kafka~0dr.host", mismatch("kafka~0dr", "dr.example.org")],
          ["servers.a/b~c.host", mismatch("a/b~c", "ab.example.org")],
          ["components.servers.mirror~1x.host", mismatch("mirror~1x", "mirror.example.org")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports every non-compliant host of one host field, in order, once each, and keeps the compliant ones silent", async () => {
      const host = "b1.quality.es:9092,pkc-1.confluent.cloud:9092,b2.quality.es:9092,10.0.0.7:9092,pkc-1.confluent.cloud:9093";
      expect(hostsOf(await linter.run(single(host)))).toEqual(["pkc-1.confluent.cloud", "10.0.0.7"]);
    });

    test("skips null, scalar and array nodes, missing and null hosts, 2.x urls, pathnames, extensions, schemas, examples, bindings, security, replies and operations", async () => {
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
        expect(findingsOf(await configured.run(matrixDoc(Array(12).fill("plant.quality.es:8883"))))).toEqual([]);
      }
    });

    test("trims the configured pattern and names it, as written, in every message", async () => {
      expect((await acceptedUnder("\n ^quality\\.es$ ")).sort()).toEqual(["quality.es"]);
      const configured = await withPattern("\t/^([a-z0-9-]+\\.)?quality\\.es$/i  ");
      expect(findingsOf(await configured.run(single("pkc-1.confluent.cloud:9092")))).toEqual([
        ["servers.plantKafka.host", mismatch("plantKafka", "pkc-1.confluent.cloud", "/^([a-z0-9-]+\\.)?quality\\.es$/i")],
      ]);
      expect(findingsOf(await configured.run(single(9093)))).toEqual([["servers.plantKafka.host", notString("plantKafka", "host")]]);
    });

    test("applies the configured pattern to hosts built from server variables", async () => {
      const configured = await withPattern("^plant-(dev|pre)\\.quality\\.es$");
      const variables = { environment: { enum: ["plant-dev", "plant-pre", "plant-pro"], default: "plant-pro" }, port: { default: "9092" } };
      expect(hostsOf(await configured.run(single("{environment}.quality.es:{port}", variables, { pathname: "/{environment}" })))).toEqual(["plant-pro.quality.es"]);
    });

    test("a compliant document fails once the pattern is narrowed to Kafka hosts", async () => {
      const configured = await withPattern("^kafka[a-z0-9-]*\\.quality\\.es$");
      const paths = findingsOf(await configured.run(okExample)).map(([p]) => p);
      expect(paths).toContain("servers.opcGatewayMqtt.host");
      expect(paths).toContain("servers.natsCluster.host");
      expect(paths).toContain("servers.historianHttps.host");
      expect(paths).toContain("components.servers.unusedMirror.host");
      expect(paths).not.toContain("servers.plantKafka.host");
      expect(paths).not.toContain("servers.x-dr.host");
      expect(paths).not.toContain("servers.leftover2x.host");
      expect(paths).not.toContain("components.servers.regional.host");
      expect(paths.filter((p) => !/^(servers|components\.servers)\.[^.]+\.host$/.test(p))).toEqual([]);
    });

    test("a failing document passes once the pattern accepts every host, except its non-string hosts", async () => {
      const configured = await withPattern(".*");
      expect(findingsOf(await configured.run(failExample))).toEqual(
        [
          ["servers.objectHost.host", notString("objectHost", "host")],
          ["servers.arrayHost.host", notString("arrayHost", "host")],
        ].sort(byPathAndMessage)
      );
    });

    test.each(FALLBACK_PATTERNS.map((value) => [value]))("falls back to the shipped pattern when pattern is %p", async (value) => {
      const configured = await withPattern(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
      expect(findingsOf(await configured.run(single("localhost:9092")))).toEqual([["servers.plantKafka.host", mismatch("plantKafka", "localhost")]]);
    });
  });
});
