const { linterForRule } = require("../../helpers/utils");
const {
  ALLOWED_PROTOCOLS,
  notAllowed,
  notString,
  PROTOCOL_CASES,
  NON_STRING_VALUES,
  ABSENT_VALUES,
  NON_OBJECT_SERVERS,
  INJECTED_OPTIONS,
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

const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Quality Server Protocols", version: "1.0.0" }, ...extra });
const single = (protocol) => base({ servers: { plantBroker: { host: "broker.quality.es:9092", protocol } } });
const matrixDoc = (protocols) => base({ servers: Object.fromEntries(protocols.map((protocol, index) => [`case${index}`, { host: "broker.quality.es", protocol }])) });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[1].slice(4))));

const FAIL_EXAMPLE = [
  ["servers.confluentSsl.protocol", notAllowed("confluentSsl", "kafka-ssl")],
  ["servers.saslSsl.protocol", notAllowed("saslSsl", "SASL_SSL")],
  ["servers.upperCaseKafka.protocol", notAllowed("upperCaseKafka", "KAFKA")],
  ["servers.paddedMqtt.protocol", notAllowed("paddedMqtt", "mqtt\t")],
  ["servers.machineMqtts.protocol", notAllowed("machineMqtts", "mqtts")],
  ["servers.mqttV5.protocol", notAllowed("mqttV5", "mqtt-5")],
  ["servers.mesRabbit.protocol", notAllowed("mesRabbit", "rabbitmq")],
  ["servers.hmiSocketIo.protocol", notAllowed("hmiSocketIo", "socket.io")],
  ["servers.inspectionGrpc.protocol", notAllowed("inspectionGrpc", "grpc")],
  ["servers.plcModbus.protocol", notAllowed("plcModbus", "modbus-tcp")],
  ["servers.opcUa.protocol", notAllowed("opcUa", "opc.tcp")],
  ["servers.erpMq.protocol", notAllowed("erpMq", "ibm_mq")],
  ["servers.eventGrid.protocol", notAllowed("eventGrid", "eventgrid")],
  ["servers.redisTls.protocol", notAllowed("redisTls", "rediss")],
  ["servers.natsJetStream.protocol", notAllowed("natsJetStream", "jetstream")],
  ["servers.placeholderProtocol.protocol", notAllowed("placeholderProtocol", "${PROTOCOL}")],
  ["servers.blankProtocol.protocol", notAllowed("blankProtocol", "   ")],
  ["servers.booleanProtocol.protocol", notString("booleanProtocol")],
  ["servers.arrayProtocol.protocol", notString("arrayProtocol")],
  ["servers.refProtocol.protocol", notString("refProtocol")],
  ["servers.x-supplier.protocol", notAllowed("x-supplier", "PLAINTEXT")],
  ["components.servers.supplier.protocol", notAllowed("supplier", "Kafka-Secure")],
  ["components.servers.legacyAmqp.protocol", notAllowed("legacyAmqp", "amqp091")],
].sort(byPathAndMessage);

const FAIL_SHARED_REF = [
  ["servers.partner.protocol", notAllowed("partner", "kafka-ssl")],
  ["components.servers.supplierHub.protocol", notAllowed("supplierHub", "rabbitmq")],
  ["components.servers.hop2.protocol", notAllowed("hop2", "kafka-tls")],
  ["components.servers.supply/eu~dr.protocol", notAllowed("supply/eu~dr", "SSL")],
  ["components.servers.north america.protocol", notAllowed("north america", "mqtts")],
  ["components.servers.recepci\u00f3n.protocol", notAllowed("recepci\u00f3n", "websockets")],
].sort(byPathAndMessage);

describe("AAR084 (AsyncAPI 3.x): every server protocol must be an AsyncAPI transport protocol", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic smart grid document using all 26 protocols, ignoring extensions, protocolVersion, bindings, multi-format payloads, replies, x-servers and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every non-allowed protocol of servers and components.servers with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("reads the protocol whatever the asyncapi value, since the field is the same in every version", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "2.6.0", "v3.0.0", "", null, false, {}]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
    }
  });

  test("reports with the error severity", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL_EXAMPLE.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("lists every allowed protocol, in alphabetical order, in the message", async () => {
    const [result] = only(await linter.run(single("mqtts")));
    expect(result.message).toBe(`AAR084: Server 'plantBroker' protocol 'mqtts' must be an allowed protocol: ${ALLOWED_PROTOCOLS.map((p) => `'${p}'`).join(", ")}.`);
  });

  test.each(PROTOCOL_CASES.allowed.map((protocol) => [protocol]))("accepts the protocol %p", async (protocol) => {
    expect(findingsOf(await linter.run(single(protocol)))).toEqual([]);
  });

  test.each(PROTOCOL_CASES.rejected.map((protocol) => [protocol]))("rejects the protocol %p", async (protocol) => {
    expect(findingsOf(await linter.run(single(protocol)))).toEqual([["servers.plantBroker.protocol", notAllowed("plantBroker", protocol)]]);
  });

  test("checks a whole matrix and reports exactly the rejected protocols", async () => {
    const protocols = [...PROTOCOL_CASES.allowed, ...PROTOCOL_CASES.rejected];
    const reported = reportedCases(await linter.run(matrixDoc(protocols)));
    const rejected = new Set(PROTOCOL_CASES.rejected);
    protocols.forEach((protocol, index) => expect([protocol, reported.has(index)]).toEqual([protocol, rejected.has(protocol)]));
  });

  test.each(NON_STRING_VALUES.map((value) => [value]))("rejects the non-string protocol %p", async (value) => {
    expect(findingsOf(await linter.run(single(value)))).toEqual([["servers.plantBroker.protocol", notString("plantBroker")]]);
  });

  test.each(ABSENT_VALUES.map((value) => [value]))("leaves a %p protocol to the AsyncAPI schema", async (value) => {
    expect(findingsOf(await linter.run(single(value)))).toEqual([]);
    expect(findingsOf(await linter.run(base({ components: { servers: { c: { host: "broker.quality.es", protocol: value } } } })))).toEqual([]);
  });

  test.each(NON_OBJECT_SERVERS.map((value) => [value]))("skips the non-object server %p in servers and components.servers", async (value) => {
    expect(findingsOf(await linter.run(base({ servers: { s: value }, components: { servers: { c: value } } })))).toEqual([]);
  });

  test.each([[null], [[]], ["kafka"], [42], [true]])("skips a servers or components.servers value of %p", async (value) => {
    expect(findingsOf(await linter.run(base({ servers: value, components: { servers: value } })))).toEqual([]);
    expect(findingsOf(await linter.run(base({ components: value })))).toEqual([]);
  });

  test("escapes control and invisible characters in protocols and server names", async () => {
    const doc = base({ servers: { "plant\tbroker": { host: "broker.quality.es", protocol: "kafka\r" }, zw: { host: "broker.quality.es", protocol: "\u2060mqtt" } } });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["servers.plant\tbroker.protocol", notAllowed("plant\tbroker", "kafka\r")],
        ["servers.zw.protocol", notAllowed("zw", "\u2060mqtt")],
      ].sort(byPathAndMessage)
    );
    const messages = only(await linter.run(doc)).map((r) => r.message);
    expect(messages.some((m) => m.startsWith("AAR084: Server 'plant\\tbroker' protocol 'kafka\\r'"))).toBe(true);
    expect(messages.some((m) => m.startsWith("AAR084: Server 'zw' protocol '\\u2060mqtt'"))).toBe(true);
  });

  test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and self references, and ignores external, dangling, cyclic, malformed and non-server targets", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
  });

  test("never validates a server through the channel servers list, the operations or the replies", async () => {
    const doc = base({
      servers: { main: { host: "kafka.quality.es", protocol: "kafka" } },
      channels: {
        orders: { address: null, servers: [{ $ref: "#/servers/main" }, { $ref: "#/x-servers/rogue" }, { host: "inline.example.org", protocol: "tcp" }] },
      },
      operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, reply: { channel: { $ref: "#/channels/orders" }, address: { location: "$message.header#/replyTo" } } } },
      "x-servers": { rogue: { host: "rogue.example.org", protocol: "rabbitmq" } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual([]);
  });

  test("follows a servers map and a components object given as local references", async () => {
    const doc = base({
      servers: { $ref: "#/components/x-servers" },
      components: { "x-servers": { partner: { host: "partner.example.org", protocol: "kafka-ssl" }, local: { host: "kafka.quality.es", protocol: "kafka" } } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual([["components.x-servers.partner.protocol", notAllowed("partner", "kafka-ssl")]]);
    const viaComponents = base({ components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { host: "dr.example.org", protocol: "mqtts" } } } });
    expect(findingsOf(await linter.run(viaComponents))).toEqual([["x-components.servers.dr.protocol", notAllowed("dr", "mqtts")]]);
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
      protocol: "tcp",
      "x-servers": {
        "south europe": { host: "se.example.org", protocol: "mqtts" },
        "recepci\u00f3n": { host: "rx.example.org", protocol: "Kafka" },
        rogue: { host: "rogue.example.org", protocol: "rabbitmq" },
      },
    });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["x-servers.south europe.protocol", notAllowed("south europe", "mqtts")],
        ["x-servers.recepci\u00f3n.protocol", notAllowed("recepci\u00f3n", "Kafka")],
      ].sort(byPathAndMessage)
    );
  });

  test("validates servers whose key starts with x- and names with ~0, ~1 or slashes at their own path", async () => {
    const doc = base({
      servers: { "x-edge": { host: "edge.example.org", protocol: "mqtts" }, "eu~1west": { host: "eu.example.org", protocol: "tcp" }, "a/b~c": { host: "ab.example.org", protocol: "grpc" } },
      components: { servers: { "x-mirror": { host: "mirror.example.org", protocol: "kafka-ssl" } } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["servers.x-edge.protocol", notAllowed("x-edge", "mqtts")],
        ["servers.eu~1west.protocol", notAllowed("eu~1west", "tcp")],
        ["servers.a/b~c.protocol", notAllowed("a/b~c", "grpc")],
        ["components.servers.x-mirror.protocol", notAllowed("x-mirror", "kafka-ssl")],
      ].sort(byPathAndMessage)
    );
  });

  test("skips null, scalar and array nodes, missing and null protocols, extensions, protocolVersion, pathnames, bindings, operations, replies and schemas", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", servers: { a: { host: "localhost", protocol: "tcp" } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(150);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    expect(findingsOf(await linter.run(withVersion(failLargeGenerated.document, "3.1.0")))).toEqual(failLargeGenerated.expected);
  });

  test.each(INJECTED_OPTIONS)("ignores injected functionOptions: %s", async (_, functionOptions) => {
    const configured = await linterForRule(RULE, { functionOptions });
    expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
    expect(findingsOf(await configured.run(okExample))).toEqual([]);
  });
});
