const { linterForRule } = require("../../helpers/utils");
const {
  RULE,
  OPTION,
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

const VERSIONS = ["3.0.0", "3.1.0"];

describe("AAR001 (AsyncAPI 3.x): every root server protocol must match the secure protocol pattern", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("reports the server of the reported issue, a plain kafka broker", async () => {
    const results = await lint(linter, serversDoc("3.0.0", { production: { host: "localhost:9092", protocol: "kafka" } }));
    expect(findings(results)).toEqual([["servers.production.protocol", notSecure("kafka")]]);
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
    const results = await lint(linter, serversDoc("3.1.0", { production: { host: "broker.quality.es", protocol } }));
    expect(findings(results)).toEqual([]);
  });

  test.each(NON_STRING_PROTOCOLS.map((value) => [JSON.stringify(value), value]))("leaves a %s protocol to the schema", async (_, protocol) => {
    const results = await lint(linter, serversDoc("3.0.0", { production: { host: "broker.quality.es", protocol } }));
    expect(findings(results)).toEqual([]);
  });

  test.each([
    ["no servers object", { asyncapi: "3.0.0", info: { title: "No Servers", version: "1.0.0" } }],
    ["an empty servers object", serversDoc("3.0.0", {})],
    ["a null servers object", serversDoc("3.0.0", null)],
  ])("reports nothing for %s", async (_, doc) => {
    expect(findings(await lint(linter, doc))).toEqual([]);
  });

  test("a protocol given through a $ref is checked where it is written", async () => {
    const doc = serversDoc("3.0.0", { production: { host: "broker.quality.es", protocol: { $ref: "#/components/x-protocols/legacy" } } }, { components: { "x-protocols": { legacy: "http" } } });
    expect(findings(await lint(linter, doc))).toEqual([["components.x-protocols.legacy", notSecure("http")]]);
  });

  test.each(VERSIONS)("reports every rejected protocol of a very large document, shared servers once, in AsyncAPI %s", async (version) => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(150);
    expect(findings(await lint(linter, withVersion(failLargeGenerated.document, version)))).toEqual(failLargeGenerated.expected);
  });
});

describe("AAR001 (AsyncAPI 3.x): pattern param", () => {
  const linterWith = (value) => linterForRule(RULE, { functionOptions: { [OPTION]: value } });

  test("an organization that accepts plain kafka passes the server of the reported issue", async () => {
    const linter = await linterWith("^(kafka|kafka-secure)$");
    expect(findings(await lint(linter, serversDoc("3.0.0", { production: { host: "localhost:9092", protocol: "kafka" } })))).toEqual([]);
  });

  test.each(VERSIONS)("an anchored pattern replaces the default in AsyncAPI %s", async (version) => {
    const linter = await linterWith("^kafka$");
    expect(findings(await lint(linter, withVersion(failExample, version)))).toEqual(expectedFindings(/^kafka$/, "^kafka$"));
    expect(findings(await lint(linter, withVersion(failSharedRef, version)))).toEqual([
      ["components.servers.kafkaTls.protocol", notSecure("kafka-secure", "^kafka$")],
      ["components.servers.mqttPlain.protocol", notSecure("mqtt", "^kafka$")],
      ["servers.inline.protocol", notSecure("wss", "^kafka$")],
    ]);
    expect(findings(await lint(linter, withVersion(okExample, version)))).toEqual([
      ["components.servers.sharedKafka.protocol", notSecure("kafka-secure", "^kafka$")],
      ["servers.dashboard-wss.protocol", notSecure("wss", "^kafka$")],
      ["servers.gateway-https.protocol", notSecure("https", "^kafka$")],
      ["servers.ledger-amqps.protocol", notSecure("amqps", "^kafka$")],
      ["servers.payments-kafka.protocol", notSecure("kafka-secure", "^kafka$")],
      ["servers.terminals-mqtt.protocol", notSecure("secure-mqtt", "^kafka$")],
    ]);
  });

  test("a configured pattern never makes the structural edges reportable", async () => {
    const linter = await linterWith("^coap$");
    expect(findings(await lint(linter, okStructuralEdges)).map(([p]) => p)).toEqual([
      "components.servers.secureShared.protocol",
      "servers.bindingsAndVariables.protocol",
      "servers.capitalizedField.protocol",
      "servers.extensionProtocolOnly.protocol",
    ]);
  });

  test("a prefix pattern accepts every protocol starting with it", async () => {
    const linter = await linterWith("^kafka");
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings(/^kafka/, "^kafka"));
  });

  test("a /source/flags literal is honored", async () => {
    const linter = await linterWith("/^(KAFKA|https)$/i");
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings(/^(KAFKA|https)$/i, "/^(KAFKA|https)$/i"));
  });

  test.each([
    ["an empty string", ""],
    ["a blank string", "   "],
    ["null", null],
    ["a number", 42],
    ["an object", { [OPTION]: "^kafka$" }],
    ["an invalid expression", "^(kafka"],
    ["a literal with an unknown flag", "/^kafka$/z"],
  ])("%s falls back to the default pattern", async (_, value) => {
    const linter = await linterWith(value);
    expect(findings(await lint(linter, failExample))).toEqual(expectedFindings());
  });
});
