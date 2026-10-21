const { linterForRule } = require("../../helpers/utils");
const {
  RULE,
  OPTION,
  DEFAULT_PATTERN,
  DEFAULT_SECURE_PROTOCOLS,
  NON_STRING_PROTOCOLS,
  notSecure,
  lint,
  findings,
  expectedFindings,
  withVersion,
  serversDoc,
} = require("../../helpers/rules/aar001-server-protocol-secure");
const failExample = require("./AAR001/fail-example");
const failSharedRef = require("./AAR001/fail-shared-ref");
const failLargeGenerated = require("./AAR001/fail-large-generated");
const okExample = require("./AAR001/ok-example");
const okStructuralEdges = require("./AAR001/ok-structural-edges");

const VERSIONS = ["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"];

describe("AAR001 (AsyncAPI 2.x): every root server protocol must match the secure protocol pattern", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("reports a server using plain http", async () => {
    const results = await lint(linter, serversDoc("2.6.0", { production: { url: "http://example.com", protocol: "http" } }));
    expect(findings(results)).toEqual([["servers.production.protocol", notSecure("http")]]);
  });

  test("passes a server using https", async () => {
    const results = await lint(linter, serversDoc("2.6.0", { production: { url: "https://example.com", protocol: "https" } }));
    expect(findings(results)).toEqual([]);
  });

  test.each(VERSIONS)("reports every string protocol the default pattern rejects in AsyncAPI %s", async (version) => {
    const results = await lint(linter, withVersion(failExample, version));
    expect(findings(results)).toEqual(expectedFindings());
    expect(findings(results)).toHaveLength(13);
  });

  test.each(VERSIONS)("reports a referenced server once, at its definition, in AsyncAPI %s", async (version) => {
    const results = await lint(linter, withVersion(failSharedRef, version));
    expect(findings(results)).toEqual([
      ["components.servers.kafkaPlain.protocol", notSecure("kafka")],
      ["components.servers.mqttPlain.protocol", notSecure("mqtt")],
    ]);
  });

  test.each(VERSIONS)("passes secure inline and referenced servers and ignores unreferenced components servers in AsyncAPI %s", async (version) => {
    expect(findings(await lint(linter, withVersion(okExample, version)))).toEqual([]);
  });

  test.each(VERSIONS)("skips unusable servers and protocols and never checks protocols outside the root servers in AsyncAPI %s", async (version) => {
    expect(findings(await lint(linter, withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test.each(DEFAULT_SECURE_PROTOCOLS)("passes the default secure protocol %s", async (protocol) => {
    const results = await lint(linter, serversDoc("2.6.0", { production: { url: "broker.quality.es", protocol } }));
    expect(findings(results)).toEqual([]);
  });

  test.each(NON_STRING_PROTOCOLS.map((value) => [JSON.stringify(value), value]))("leaves a %s protocol to the schema", async (_, protocol) => {
    const results = await lint(linter, serversDoc("2.6.0", { production: { url: "broker.quality.es", protocol } }));
    expect(findings(results)).toEqual([]);
  });

  test.each([
    ["no servers object", { asyncapi: "2.6.0", info: { title: "No Servers", version: "1.0.0" }, channels: {} }],
    ["an empty servers object", serversDoc("2.6.0", {})],
    ["a null servers object", serversDoc("2.6.0", null)],
  ])("reports nothing for %s", async (_, doc) => {
    expect(findings(await lint(linter, doc))).toEqual([]);
  });

  test("reports every rejected protocol of a very large document, shared servers once", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(150);
    expect(findings(await lint(linter, failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
  });
});

describe("AAR001 (AsyncAPI 2.x): pattern param", () => {
  const linterWith = (value) => linterForRule(RULE, { functionOptions: { [OPTION]: value } });

  test("the shipped option is the default pattern", async () => {
    const linter = await linterWith(DEFAULT_PATTERN);
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings());
  });

  test("an anchored pattern replaces the default, so the default protocols are reported too", async () => {
    const linter = await linterWith("^kafka$");
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings(/^kafka$/, "^kafka$"));
    expect(findings(await lint(linter, failSharedRef))).toEqual([
      ["components.servers.kafkaTls.protocol", notSecure("kafka-secure", "^kafka$")],
      ["components.servers.mqttPlain.protocol", notSecure("mqtt", "^kafka$")],
      ["servers.inline.protocol", notSecure("wss", "^kafka$")],
    ]);
  });

  test("an alternation accepts every listed protocol", async () => {
    const linter = await linterWith("^(kafka|kafka-secure|stomps)$");
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings(/^(kafka|kafka-secure|stomps)$/, "^(kafka|kafka-secure|stomps)$"));
  });

  test("an unanchored pattern matches anywhere in the protocol", async () => {
    const linter = await linterWith("kafka");
    const reported = findings(await lint(linter, failExample));
    expect(reported).toEqual(expectedFindings(/kafka/, "kafka"));
    expect(reported.map(([p]) => p)).not.toContain("servers.client-kafka-ssl.protocol");
  });

  test("a /source/flags literal is honored, and protocols are otherwise compared case included", async () => {
    const literal = await linterWith("/^(kafka|https)$/i");
    expect(findings(await lint(literal, failExample))).toEqual(expectedFindings(/^(kafka|https)$/i, "/^(kafka|https)$/i"));
    const plain = await linterWith("^(kafka|https)$");
    expect(findings(await lint(plain, failExample)).map(([p]) => p)).toContain("servers.upper-https.protocol");
  });

  test("the pattern is trimmed, but the protocol is not", async () => {
    const linter = await linterWith("  ^(https|kafka)$\t");
    const reported = findings(await lint(linter, failExample));
    expect(reported).toEqual(expectedFindings(/^(https|kafka)$/, "^(https|kafka)$"));
    expect(reported.map(([p]) => p)).toContain("servers.padded-https.protocol");
  });

  test("a comma-separated list is read as a regular expression and matches no protocol", async () => {
    const linter = await linterWith("kafka,kafka-secure");
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings(/kafka,kafka-secure/, "kafka,kafka-secure"));
  });

  test("a configured pattern applies to every server of a very large document", async () => {
    const linter = await linterWith("^(https|wss|amqps|kafka-secure|secure-mqtt|kafka|mqtt)$");
    const accepted = ["kafka", "mqtt"];
    const expected = failLargeGenerated.expected.filter(([, message]) => !accepted.some((protocol) => message.startsWith(`AAR001: Server protocol '${protocol}'`)));
    const reported = findings(await lint(linter, failLargeGenerated.document));
    expect(reported.map(([p]) => p)).toEqual(expected.map(([p]) => p));
    expect(reported.length).toBeLessThan(failLargeGenerated.expected.length);
  });

  test.each([
    ["an empty string", ""],
    ["a blank string", "   "],
    ["null", null],
    ["a number", 42],
    ["a boolean", true],
    ["an object", { [OPTION]: "^kafka$" }],
    ["an array", ["^kafka$"]],
    ["an invalid expression", "^(kafka"],
    ["an invalid literal", "/[/"],
    ["a literal with an unknown flag", "/^kafka$/z"],
  ])("%s falls back to the default pattern", async (_, value) => {
    const linter = await linterWith(value);
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings());
  });
});
