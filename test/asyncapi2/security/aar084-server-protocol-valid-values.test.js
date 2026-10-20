const { linterForRule } = require("../../helpers/utils");
const {
  SPEC_PROTOCOLS,
  BINDING_PROTOCOLS,
  ALLOWED_PROTOCOLS,
  OPTION,
  listOf,
  notAllowed,
  notString,
  PROTOCOL_CASES,
  NON_STRING_VALUES,
  ABSENT_VALUES,
  NON_OBJECT_SERVERS,
  IGNORED_OPTIONS,
  PROBE_PROTOCOLS,
  SHIPPED_ACCEPTED,
  PARAM_CASES,
  FALLBACK_VALUES,
} = require("../../helpers/rules/aar084-server-protocol-valid-values");
const okExample = require("./AAR084/ok-example");
const failExample = require("./AAR084/fail-example");
const failSharedRef = require("./AAR084/fail-shared-ref");
const okStructuralEdges = require("./AAR084/ok-structural-edges");
const failLargeGenerated = require("./AAR084/fail-large-generated");

const RULE = "asa:AAR084";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withProtocols = (value) => linterForRule(RULE, { functionOptions: { [OPTION]: value } });

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Quality Server Protocols", version: "1.0.0" }, ...extra });
const single = (protocol) => base({ servers: { yardBroker: { url: "broker.quality.es:9092", protocol } } });
const matrixDoc = (protocols) => base({ servers: Object.fromEntries(protocols.map((protocol, index) => [`case${index}`, { url: "broker.quality.es", protocol }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.confluentSsl.protocol", notAllowed("confluentSsl", "kafka-ssl")],
  ["servers.saslSsl.protocol", notAllowed("saslSsl", "SASL_SSL")],
  ["servers.upperCaseKafka.protocol", notAllowed("upperCaseKafka", "Kafka")],
  ["servers.paddedKafka.protocol", notAllowed("paddedKafka", " kafka")],
  ["servers.trailingSpace.protocol", notAllowed("trailingSpace", "kafka-secure ")],
  ["servers.craneMqtts.protocol", notAllowed("craneMqtts", "mqtts")],
  ["servers.gateRabbit.protocol", notAllowed("gateRabbit", "rabbitmq")],
  ["servers.gateAmqpSsl.protocol", notAllowed("gateAmqpSsl", "amqp+ssl")],
  ["servers.yardWebsocket.protocol", notAllowed("yardWebsocket", "websocket")],
  ["servers.customsGrpc.protocol", notAllowed("customsGrpc", "grpc")],
  ["servers.plcTcp.protocol", notAllowed("plcTcp", "tcp")],
  ["servers.mainframeMq.protocol", notAllowed("mainframeMq", "ibm-mq")],
  ["servers.eventHubs.protocol", notAllowed("eventHubs", "eventhubs")],
  ["servers.kinesisStream.protocol", notAllowed("kinesisStream", "kinesis")],
  ["servers.placeholderProtocol.protocol", notAllowed("placeholderProtocol", "{protocol}")],
  ["servers.emptyProtocol.protocol", notAllowed("emptyProtocol", "")],
  ["servers.numericProtocol.protocol", notString("numericProtocol")],
  ["servers.objectProtocol.protocol", notString("objectProtocol")],
  ["servers.x-partner.protocol", notAllowed("x-partner", "PLAINTEXT")],
  ["components.servers.shippingLine.protocol", notAllowed("shippingLine", "AMQPS")],
  ["components.servers.legacyStomp.protocol", notAllowed("legacyStomp", "stomp+ssl")],
].sort(byPathAndMessage);

const FAIL_SHARED_REF = [
  ["servers.partner.protocol", notAllowed("partner", "kafka-ssl")],
  ["components.servers.forwarderHub.protocol", notAllowed("forwarderHub", "rabbitmq")],
  ["components.servers.hop2.protocol", notAllowed("hop2", "kafka-tls")],
  ["components.servers.freight/eu~dr.protocol", notAllowed("freight/eu~dr", "SSL")],
  ["components.servers.latin america.protocol", notAllowed("latin america", "mqtts")],
  ["components.servers.espa\u00f1a.protocol", notAllowed("espa\u00f1a", "websockets")],
  ["components.x-protocols.protocol", notAllowed("x-protocols", "x-custom")],
].sort(byPathAndMessage);

describe("AAR084 (AsyncAPI 2.x): every server protocol must be an allowed protocol", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("allows by default exactly the 19 protocols of the 2.6 specification and the 8 of the official bindings, listed alphabetically", () => {
    expect(SPEC_PROTOCOLS).toHaveLength(19);
    expect(BINDING_PROTOCOLS).toHaveLength(8);
    expect(BINDING_PROTOCOLS).toContain("ibmmq-secure");
    expect(ALLOWED_PROTOCOLS).toHaveLength(27);
    expect(new Set(ALLOWED_PROTOCOLS).size).toBe(27);
  });

  test("passes a realistic logistics document using all 27 protocols, ignoring extensions, protocolVersion, bindings, payloads, examples, x-servers and external references", async () => {
    const used = new Set(Object.values(okExample.servers).map((server) => server.protocol));
    ALLOWED_PROTOCOLS.forEach((protocol) => expect([protocol, used.has(protocol)]).toEqual([protocol, true]));
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every non-allowed protocol of servers and components.servers with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("reads the protocol whatever the asyncapi value, since the field is the same in every version", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "3.0.0", "3.1.0", "v3.0.0", "", null, false, {}]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
    }
  });

  test("reports with the error severity", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL_EXAMPLE.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("lists every allowed protocol, in alphabetical order, in the message", async () => {
    const [result] = only(await linter.run(single("kafka-ssl")));
    expect(result.message).toBe(`AAR084: Server 'yardBroker' protocol 'kafka-ssl' must be an allowed protocol: ${ALLOWED_PROTOCOLS.map((p) => `'${p}'`).join(", ")}.`);
    expect(ALLOWED_PROTOCOLS).toEqual([...ALLOWED_PROTOCOLS].sort());
  });

  test.each(PROTOCOL_CASES.allowed.map((protocol) => [protocol]))("accepts the protocol %p", async (protocol) => {
    expect(findingsOf(await linter.run(single(protocol)))).toEqual([]);
  });

  test.each(PROTOCOL_CASES.rejected.map((protocol) => [protocol]))("rejects the protocol %p", async (protocol) => {
    expect(findingsOf(await linter.run(single(protocol)))).toEqual([["servers.yardBroker.protocol", notAllowed("yardBroker", protocol)]]);
  });

  test("checks a whole matrix and reports exactly the rejected protocols", async () => {
    const protocols = [...PROTOCOL_CASES.allowed, ...PROTOCOL_CASES.rejected];
    const reported = reportedCases(await linter.run(matrixDoc(protocols)));
    const rejected = new Set(PROTOCOL_CASES.rejected);
    protocols.forEach((protocol, index) => expect([protocol, reported.has(index)]).toEqual([protocol, rejected.has(protocol)]));
  });

  test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string protocol %p", async (value) => {
    expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.yardBroker.protocol", notString("yardBroker")]]);
  });

  test.each(ABSENT_VALUES.map((value) => [value]))("leaves a %p protocol to the AsyncAPI schema", async (value) => {
    expect(findingsOf(await linter.run(single(value)))).toEqual([]);
    expect(findingsOf(await linter.run(base({ components: { servers: { c: { url: "broker.quality.es", protocol: value } } } })))).toEqual([]);
  });

  test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
    expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
  });

  test.each([[null], [[]], ["kafka"], [42], [true]])("skips a servers or components.servers value of %p", async (value) => {
    expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
    expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
  });

  test("escapes control and invisible characters so every message stays on one line and shows the hidden character", async () => {
    const protocols = ["kafka\n", "\u0000kafka", "kafka\u001b", "kafka\u007f", "kafka\t", "mqtt\r\n", "kafka\u200b", "\ufeffkafka", "kafka\u00ad-secure", "amqp\u2028"];
    const results = only(await linter.run(matrixDoc(protocols)));
    expect(results.map((r) => r.message).sort()).toEqual(
      [
        notAllowed("case0", "kafka\n"),
        notAllowed("case1", "\u0000kafka"),
        notAllowed("case2", "kafka\u001b"),
        notAllowed("case3", "kafka\u007f"),
        notAllowed("case4", "kafka\t"),
        notAllowed("case5", "mqtt\r\n"),
        notAllowed("case6", "kafka\u200b"),
        notAllowed("case7", "\ufeffkafka"),
        notAllowed("case8", "kafka\u00ad-secure"),
        notAllowed("case9", "amqp\u2028"),
      ].sort()
    );
    expect(results.map((r) => r.message).filter((m) => /[\u0000-\u001f\u007f\u00ad\u200b\u2028\ufeff]/.test(m))).toEqual([]);
    expect(results.map((r) => r.message)).toContain(`AAR084: Server 'case0' protocol 'kafka\\n' must be an allowed protocol: ${ALLOWED_PROTOCOLS.map((p) => `'${p}'`).join(", ")}.`);
  });

  test("escapes control characters in server names too", async () => {
    const doc = base({ servers: { "yard\nbroker": { url: "broker.quality.es", protocol: "tcp" } } });
    expect(findingsOf(await linter.run(doc))).toEqual([["servers.yard\nbroker.protocol", notAllowed("yard\nbroker", "tcp")]]);
    expect(only(await linter.run(doc))[0].message).toContain("Server 'yard\\nbroker'");
  });

  test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and self references, and ignores external, dangling, cyclic and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
  });

  test("follows a servers map and a components object given as local references", async () => {
    const doc = base({
      servers: { $ref: "#/components/x-servers" },
      components: {
        "x-servers": { partner: { url: "partner.example.org", protocol: "kafka-ssl" }, local: { url: "kafka.quality.es", protocol: "kafka" } },
      },
    });
    expect(findingsOf(await linter.run(doc))).toEqual([["components.x-servers.partner.protocol", notAllowed("partner", "kafka-ssl")]]);
    const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { url: "dr.example.org", protocol: "mqtts" } } } });
    expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.protocol", notAllowed("dr", "mqtts")]]);
    const serversMapRef = base({ components: { servers: { $ref: "#/x-server-map" } }, "x-server-map": { lab: { url: "lab.example.org", protocol: "tcp" } } });
    expect(findingsOf(await linter.run(serversMapRef))).toEqual([["x-server-map.lab.protocol", notAllowed("lab", "tcp")]]);
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
      protocol: "tcp",
      "x-servers": {
        "north america": { url: "na.example.org", protocol: "mqtts" },
        "espa\u00f1a": { url: "es.example.org", protocol: "Kafka" },
        rogue: { url: "rogue.example.org", protocol: "rabbitmq" },
      },
    });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["x-servers.north america.protocol", notAllowed("north america", "mqtts")],
        ["x-servers.espa\u00f1a.protocol", notAllowed("espa\u00f1a", "Kafka")],
      ].sort(byPathAndMessage)
    );
  });

  test("validates servers whose key starts with x-, which are names and not extensions in these maps", async () => {
    const doc = base({
      servers: { "x-edge": { url: "edge.example.org", protocol: "mqtts" } },
      components: { servers: { "x-mirror": { url: "mirror.example.org", protocol: "kafka-ssl" } } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["servers.x-edge.protocol", notAllowed("x-edge", "mqtts")],
        ["components.servers.x-mirror.protocol", notAllowed("x-mirror", "kafka-ssl")],
      ].sort(byPathAndMessage)
    );
  });

  test("reports servers whose names contain ~0, ~1 or slashes at their own path", async () => {
    const doc = base({
      servers: { "eu~1west": { url: "eu.example.org", protocol: "tcp" }, "kafka~0dr": { url: "dr.example.org", protocol: "Kafka" }, "a/b~c": { url: "ab.example.org", protocol: "grpc" } },
      components: { servers: { "mirror~1x": { url: "mirror.example.org", protocol: "rabbitmq" } } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["servers.eu~1west.protocol", notAllowed("eu~1west", "tcp")],
        ["servers.kafka~0dr.protocol", notAllowed("kafka~0dr", "Kafka")],
        ["servers.a/b~c.protocol", notAllowed("a/b~c", "grpc")],
        ["components.servers.mirror~1x.protocol", notAllowed("mirror~1x", "rabbitmq")],
      ].sort(byPathAndMessage)
    );
  });

  test("validates servers named like Object members", async () => {
    const doc = base({ servers: { constructor: { url: "a.example.org", protocol: "tcp" }, toString: { url: "b.example.org", protocol: "kafka" }, valueOf: { url: "c.example.org", protocol: "udp" } } });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["servers.constructor.protocol", notAllowed("constructor", "tcp")],
        ["servers.valueOf.protocol", notAllowed("valueOf", "udp")],
      ].sort(byPathAndMessage)
    );
  });

  test("ignores the server variables, so a protocol placeholder is never substituted", async () => {
    const doc = base({ servers: { s: { url: "{protocol}://broker.quality.es", protocol: "{protocol}", variables: { protocol: { enum: ["kafka"], default: "kafka" } } } } });
    expect(findingsOf(await linter.run(doc))).toEqual([["servers.s.protocol", notAllowed("s", "{protocol}")]]);
  });

  test("skips null, scalar and array nodes, missing and null protocols, extensions, protocolVersion, bindings, schemas, examples and parameters", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", servers: { a: { url: "localhost", protocol: "tcp" } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(150);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
  });

  test.each(IGNORED_OPTIONS)("ignores options the function does not read: %s", async (_, functionOptions) => {
    const configured = await linterForRule(RULE, { functionOptions });
    expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
    expect(findingsOf(await configured.run(okExample))).toEqual([]);
  });

  describe("configured list", () => {
    const acceptedUnder = async (value, version = "2.6.0") => {
      const configured = await withProtocols(value);
      const reported = reportedCases(await configured.run(withVersion(matrixDoc(PROBE_PROTOCOLS), version)));
      return PROBE_PROTOCOLS.filter((_, index) => !reported.has(index));
    };

    test("the shipped list accepts exactly the default protocols", async () => {
      expect(await acceptedUnder(undefined)).toEqual(SHIPPED_ACCEPTED);
      expect(await acceptedUnder(ALLOWED_PROTOCOLS.join(","))).toEqual(SHIPPED_ACCEPTED);
    });

    test.each(PARAM_CASES)("%s accepts exactly the listed protocols and names the list in every message", async (_, value, accepted, protocols) => {
      expect(await acceptedUnder(value)).toEqual(accepted);
      const configured = await withProtocols(value);
      const results = only(await configured.run(matrixDoc(PROBE_PROTOCOLS)));
      expect(results).toHaveLength(PROBE_PROTOCOLS.length - accepted.length);
      results.forEach((r) => expect(r.message).toBe(notAllowed(r.path[1], PROBE_PROTOCOLS[Number(r.path[1].slice(4))], protocols)));
    });

    test.each(PARAM_CASES)("%s behaves alike on AsyncAPI 2.0.0", async (_, value, accepted) => {
      expect(await acceptedUnder(value, "2.0.0")).toEqual(accepted);
    });

    test.each(FALLBACK_VALUES.map((value) => [value]))("falls back to the shipped list when the option is %p", async (value) => {
      const configured = await withProtocols(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });

    test("protocols with surrounding spaces or no characters can never be listed", async () => {
      expect(await acceptedUnder(" kafka ,, kafka streams ")).toEqual(["kafka", "kafka streams"]);
      const configured = await withProtocols([" kafka", "", "kafka-secure "]);
      expect(findingsOf(await configured.run(matrixDoc([" kafka", "", "kafka-secure ", "kafka", "kafka-secure"])))).toEqual(
        [
          ["servers.case0.protocol", notAllowed("case0", " kafka", ["kafka", "kafka-secure"])],
          ["servers.case1.protocol", notAllowed("case1", "", ["kafka", "kafka-secure"])],
          ["servers.case2.protocol", notAllowed("case2", "kafka-secure ", ["kafka", "kafka-secure"])],
        ].sort(byPathAndMessage)
      );
    });

    test("escapes control and invisible characters of the configured protocols in the message", async () => {
      const configured = await withProtocols(["ka\u0007fka", "mq\u200btt"]);
      expect(findingsOf(await configured.run(single("kafka")))).toEqual([
        ["servers.yardBroker.protocol", "AAR084: Server 'yardBroker' protocol 'kafka' must be an allowed protocol: 'ka\\u0007fka', 'mq\\u200btt'."],
      ]);
    });

    test("a compliant document fails once the list no longer holds its protocols", async () => {
      const configured = await withProtocols("kafka,kafka-secure");
      const results = only(await configured.run(okExample));
      const reported = new Set(results.map((r) => /protocol '(.*)' must be/s.exec(r.message)[1]));
      expect([...reported].sort()).toEqual(ALLOWED_PROTOCOLS.filter((protocol) => !["kafka", "kafka-secure"].includes(protocol)));
      results.forEach((r) => expect(r.message).toMatch(/must be an allowed protocol: 'kafka', 'kafka-secure'\.$/));
    });

    test("a failing document passes once the list holds every string protocol it uses that can be listed", async () => {
      const protocols = [...ALLOWED_PROTOCOLS, "kafka-ssl", "SASL_SSL", "Kafka", "mqtts", "rabbitmq", "amqp+ssl", "websocket", "grpc", "tcp", "ibm-mq", "eventhubs", "kinesis", "{protocol}", "PLAINTEXT", "AMQPS", "stomp+ssl"];
      const configured = await withProtocols(protocols);
      expect(findingsOf(await configured.run(failExample))).toEqual(
        [
          ["servers.paddedKafka.protocol", notAllowed("paddedKafka", " kafka", protocols)],
          ["servers.trailingSpace.protocol", notAllowed("trailingSpace", "kafka-secure ", protocols)],
          ["servers.emptyProtocol.protocol", notAllowed("emptyProtocol", "", protocols)],
          ["servers.numericProtocol.protocol", notString("numericProtocol")],
          ["servers.objectProtocol.protocol", notString("objectProtocol")],
        ].sort(byPathAndMessage)
      );
    });

    test("applies the configured list to components.servers and to servers shared through references", async () => {
      const list = ["kafka-ssl", "rabbitmq", "kafka-tls", "SSL", "mqtts", "websockets", "x-custom"];
      const configured = await withProtocols(list.join(","));
      expect(findingsOf(await configured.run(failSharedRef))).toEqual([["components.servers.compliant.protocol", notAllowed("compliant", "kafka-secure", list)]]);
      expect(findingsOf(await configured.run(withVersion(failSharedRef, "2.0.0")))).toEqual([["components.servers.compliant.protocol", notAllowed("compliant", "kafka-secure", list)]]);
    });

    test("a reordered list keeps every finding of a very large document and lists the protocols in the configured order", async () => {
      const reversed = [...ALLOWED_PROTOCOLS].reverse();
      const configured = await withProtocols(reversed.join(","));
      const expected = failLargeGenerated.expected.map(([path, message]) => [path, message.replace(listOf(ALLOWED_PROTOCOLS), listOf(reversed))]).sort(byPathAndMessage);
      expect(findingsOf(await configured.run(failLargeGenerated.document))).toEqual(expected);
    });
  });
});
