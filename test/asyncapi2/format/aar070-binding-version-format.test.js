const { linterForRule } = require("../../helpers/utils");
const { BINDING_VERSION_CASES } = require("../../helpers/rules/aar070-binding-version-format");
const okExample = require("./AAR070/ok-example");
const failExample = require("./AAR070/fail-example");
const failSharedRef = require("./AAR070/fail-shared-ref");
const failTraitsDeclarationSite = require("./AAR070/fail-traits-declaration-site");
const okStructuralEdges = require("./AAR070/ok-structural-edges");
const failLargeGenerated = require("./AAR070/fail-large-generated");

const RULE = "asa:AAR070";
const DEFAULT = "^\\d+\\.\\d+\\.\\d+$";
const P = "channels.northwind.cdc.substations.telemetry.v4";
const T = "channels.northwind/substations/{substationId}/alarms";
const BV = "bindingVersion";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withPattern = (value) => linterForRule(RULE, { functionOptions: { pattern: value } });
const mismatch = (kind, key, value, pattern = DEFAULT) => `AAR070: ${kind} binding '${key}' bindingVersion '${value}' must match '${pattern}'.`;
const notString = (kind, key, pattern = DEFAULT) => `AAR070: ${kind} binding '${key}' bindingVersion must be a string matching '${pattern}'.`;

const FAIL_EXAMPLE_PATHS = [
  `servers.kafkaProd.bindings.kafka.${BV}`,
  `servers.substationMqtt.bindings.mqtt.${BV}`,
  `servers.dispatchAmqp.bindings.amqp.${BV}`,
  `servers.controlRoomWs.bindings.ws.${BV}`,
  `${P}.bindings.kafka.${BV}`,
  `${P}.publish.bindings.kafka.${BV}`,
  `${P}.publish.traits.1.bindings.kafka.${BV}`,
  `${P}.publish.message.bindings.kafka.${BV}`,
  `${P}.publish.message.traits.1.bindings.kafka.${BV}`,
  `${P}.publish.message.traits.2.0.bindings.mqtt.${BV}`,
  `${P}.subscribe.bindings.kafka.${BV}`,
  `${P}.subscribe.message.oneOf.1.bindings.kafka.${BV}`,
  `${P}.subscribe.message.oneOf.2.bindings.kafka.${BV}`,
  `${T}.bindings.ws.${BV}`,
  `${T}.subscribe.bindings.mqtt.${BV}`,
  `components.servers.drKafka.bindings.kafka.${BV}`,
  `components.channels.auditTrail.bindings.kafka.${BV}`,
  `components.channels.auditTrail.publish.bindings.kafka.${BV}`,
  `components.channels.auditTrail.publish.message.bindings.kafka.${BV}`,
  `components.messages.meterReading.bindings.sns.${BV}`,
  `components.messages.gateEvents.oneOf.1.bindings.amqp.${BV}`,
  `components.messageTraits.commonHeaders.bindings.kafka.${BV}`,
  `components.operationTraits.kafkaProducer.bindings.ibmmq.${BV}`,
  `components.serverBindings.registry.kafka.${BV}`,
  `components.channelBindings.compacted.kafka.${BV}`,
  `components.operationBindings.durable.rabbitmq.${BV}`,
  `components.messageBindings.keyed.googlepubsub.${BV}`,
].sort();

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Binding Version Locations", version: "1.0.0" }, ...extra });
const bad = { kafka: { bindingVersion: "0.5.0" }, amqp: { bindingVersion: "latest" } };

const LOCATIONS = [
  ["server", "Server", "servers.prod.bindings", { servers: { prod: { url: "k:9092", protocol: "kafka", bindings: bad } } }],
  ["channel", "Channel", "channels.orders.bindings", { channels: { orders: { bindings: bad } } }],
  ["publish operation", "Operation", "channels.orders.publish.bindings", { channels: { orders: { publish: { bindings: bad } } } }],
  ["subscribe operation", "Operation", "channels.orders.subscribe.bindings", { channels: { orders: { subscribe: { bindings: bad } } } }],
  ["operation trait", "Operation", "channels.orders.publish.traits.0.bindings", { channels: { orders: { publish: { traits: [{ bindings: bad }] } } } }],
  ["publish message", "Message", "channels.orders.publish.message.bindings", { channels: { orders: { publish: { message: { bindings: bad } } } } }],
  ["subscribe message", "Message", "channels.orders.subscribe.message.bindings", { channels: { orders: { subscribe: { message: { bindings: bad } } } } }],
  ["oneOf member", "Message", "channels.orders.publish.message.oneOf.0.bindings", { channels: { orders: { publish: { message: { oneOf: [{ bindings: bad }] } } } } }],
  ["message trait", "Message", "channels.orders.publish.message.traits.0.bindings", { channels: { orders: { publish: { message: { traits: [{ bindings: bad }] } } } } }],
  ["tuple message trait", "Message", "channels.orders.publish.message.traits.0.0.bindings", { channels: { orders: { publish: { message: { traits: [[{ bindings: bad }, {}]] } } } } }],
  ["oneOf member trait", "Message", "channels.orders.publish.message.oneOf.0.traits.0.bindings", { channels: { orders: { publish: { message: { oneOf: [{ traits: [{ bindings: bad }] }] } } } } }],
  ["components.servers", "Server", "components.servers.dr.bindings", { components: { servers: { dr: { url: "k:9092", protocol: "kafka", bindings: bad } } } }],
  ["components.channels", "Channel", "components.channels.audit.bindings", { components: { channels: { audit: { bindings: bad } } } }],
  ["components.channels operation", "Operation", "components.channels.audit.subscribe.bindings", { components: { channels: { audit: { subscribe: { bindings: bad } } } } }],
  ["components.channels message", "Message", "components.channels.audit.subscribe.message.bindings", { components: { channels: { audit: { subscribe: { message: { bindings: bad } } } } } }],
  ["components.messages", "Message", "components.messages.m.bindings", { components: { messages: { m: { bindings: bad } } } }],
  ["components.messages oneOf", "Message", "components.messages.m.oneOf.0.bindings", { components: { messages: { m: { oneOf: [{ bindings: bad }] } } } }],
  ["components.messages trait", "Message", "components.messages.m.traits.0.bindings", { components: { messages: { m: { traits: [{ bindings: bad }] } } } }],
  ["components.messageTraits", "Message", "components.messageTraits.t.bindings", { components: { messageTraits: { t: { bindings: bad } } } }],
  ["components.operationTraits", "Operation", "components.operationTraits.t.bindings", { components: { operationTraits: { t: { bindings: bad } } } }],
  ["components.serverBindings", "Server", "components.serverBindings.b", { components: { serverBindings: { b: bad } } }],
  ["components.channelBindings", "Channel", "components.channelBindings.b", { components: { channelBindings: { b: bad } } }],
  ["components.operationBindings", "Operation", "components.operationBindings.b", { components: { operationBindings: { b: bad } } }],
  ["components.messageBindings", "Message", "components.messageBindings.b", { components: { messageBindings: { b: bad } } }],
];

const matrixDoc = (values, protocol = "kafka") => ({
  asyncapi: "2.6.0",
  info: { title: "Binding Version Matrix", version: "1.0.0" },
  components: { messageBindings: Object.fromEntries(values.map((value, index) => [`case${index}`, { [protocol]: { bindingVersion: value } }])) },
});

const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[2].slice(4))));

describe("AAR070 (AsyncAPI 2.x): every protocol binding bindingVersion must match the configured pattern", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped pattern", () => {
    test("passes a realistic multi-protocol document, ignoring extensions, payloads, headers, examples, Avro fields, null versions and $ref bindings", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every invalid bindingVersion in servers, channels, operations, messages, traits and every components map", async () => {
      expect(pathsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test("treats a version that is not 3.x as 2.x", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
        expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test.each(LOCATIONS)("reports a %s binding with its kind and the exact bindingVersion path", async (_, kind, prefix, extra) => {
      const results = only(await linter.run(base(extra)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[`${prefix}.amqp.${BV}`, mismatch(kind, "amqp", "latest")]]);
    });

    test("reports the exact message and severity of each kind of finding", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
      expect(byPath[`servers.kafkaProd.bindings.kafka.${BV}`]).toBe(mismatch("Server", "kafka", "latest"));
      expect(byPath[`servers.dispatchAmqp.bindings.amqp.${BV}`]).toBe(notString("Server", "amqp"));
      expect(byPath[`${P}.bindings.kafka.${BV}`]).toBe(mismatch("Channel", "kafka", "0.5.0-beta"));
      expect(byPath[`${P}.publish.traits.1.bindings.kafka.${BV}`]).toBe(mismatch("Operation", "kafka", "^0.4.0"));
      expect(byPath[`${P}.subscribe.bindings.kafka.${BV}`]).toBe(notString("Operation", "kafka"));
      expect(byPath[`${P}.publish.message.traits.2.0.bindings.mqtt.${BV}`]).toBe(mismatch("Message", "mqtt", "0.2.x"));
      expect(byPath[`${P}.subscribe.message.oneOf.1.bindings.kafka.${BV}`]).toBe(mismatch("Message", "kafka", " 0.5.0"));
      expect(byPath[`${P}.subscribe.message.oneOf.2.bindings.kafka.${BV}`]).toBe(mismatch("Message", "kafka", ""));
      expect(byPath[`${T}.subscribe.bindings.mqtt.${BV}`]).toBe(notString("Operation", "mqtt"));
      expect(byPath[`components.servers.drKafka.bindings.kafka.${BV}`]).toBe(mismatch("Server", "kafka", "0.4.0\\n"));
      expect(byPath[`components.messages.gateEvents.oneOf.1.bindings.amqp.${BV}`]).toBe(notString("Message", "amqp"));
      expect(byPath[`components.serverBindings.registry.kafka.${BV}`]).toBe(mismatch("Server", "kafka", "5"));
      expect(byPath[`components.channelBindings.compacted.kafka.${BV}`]).toBe(notString("Channel", "kafka"));
      expect(byPath[`components.operationBindings.durable.rabbitmq.${BV}`]).toBe(mismatch("Operation", "rabbitmq", "3.12"));
      expect(byPath[`components.messageBindings.keyed.googlepubsub.${BV}`]).toBe(mismatch("Message", "googlepubsub", "0.2.0 "));
      expect(results).toHaveLength(FAIL_EXAMPLE_PATHS.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(BINDING_VERSION_CASES.valid.map((value) => [value]))("accepts the bindingVersion %p", async (value) => {
      expect(pathsOf(await linter.run(matrixDoc([value])))).toEqual([]);
    });

    test.each(BINDING_VERSION_CASES.invalid.map((value) => [value]))("rejects the bindingVersion %p", async (value) => {
      const results = only(await linter.run(matrixDoc([value])));
      expect(results.map((r) => r.message)).toEqual([mismatch("Message", "kafka", value.replace(/\n/g, "\\n").replace(/\t/g, "\\t"))]);
    });

    test("escapes control characters so every message stays on one line", async () => {
      const results = only(await linter.run(matrixDoc(["0.4.0\r\n", "\u00000.4.0", "0.4.0\u001b", "0.4.0\u007f", "0.4.0 "])));
      expect(results.map((r) => r.message)).toEqual([
        mismatch("Message", "kafka", "0.4.0\\r\\n"),
        mismatch("Message", "kafka", "\\u00000.4.0"),
        mismatch("Message", "kafka", "0.4.0\\u001b"),
        mismatch("Message", "kafka", "0.4.0\\u007f"),
        mismatch("Message", "kafka", "0.4.0 "),
      ]);
    });

    test.each(BINDING_VERSION_CASES.nonString.map((value) => [value]))("rejects the non-string bindingVersion %p", async (value) => {
      const results = only(await linter.run(matrixDoc([value])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[`components.messageBindings.case0.kafka.${BV}`, notString("Message", "kafka")]]);
    });

    test.each(BINDING_VERSION_CASES.absent.map((value) => [value]))("leaves a %p bindingVersion to AAR037", async (value) => {
      expect(pathsOf(await linter.run(matrixDoc([value])))).toEqual([]);
    });

    test("checks a whole matrix and reports exactly the invalid and non-string versions", async () => {
      const values = [...BINDING_VERSION_CASES.valid, ...BINDING_VERSION_CASES.invalid, ...BINDING_VERSION_CASES.nonString, null];
      const reported = reportedCases(await linter.run(matrixDoc(values)));
      const rejected = new Set([...BINDING_VERSION_CASES.invalid, ...BINDING_VERSION_CASES.nonString]);
      values.forEach((value, index) => expect([value, reported.has(index)]).toEqual([value, rejected.has(value)]));
    });

    test.each(["kafka", "amqp", "amqp1", "mqtt", "mqtt5", "ws", "http", "sns", "sqs", "nats", "jms", "solace", "googlepubsub", "pulsar", "ibmmq", "redis", "stomp", "mercure", "anypointmq", "ros2", "rabbitmq", "Kafka", "kafka-ssl", "X-internal"])(
      "validates the bindingVersion of a %p binding",
      async (protocol) => {
        const results = only(await linter.run(matrixDoc(["0.4.0", "latest"], protocol)));
        expect(results.map((r) => r.message)).toEqual([mismatch("Message", protocol, "latest")]);
      }
    );

    test.each(["x-", "x-kafka", "x-internal", "x-Kafka", "x-amqp.exchange"])("ignores the bindingVersion of the %p extension", async (key) => {
      expect(pathsOf(await linter.run(matrixDoc(["latest", 0.4, ""], key)))).toEqual([]);
    });

    test("validates a shared bindings object, message, trait, server or channel once at its definition, and ignores external, dangling and sibling-carrying refs", async () => {
      expect(pathsOf(await linter.run(failSharedRef))).toEqual(
        [
          `components.servers.mirror.bindings.kafka.${BV}`,
          `components.messageTraits.chargingEnvelope.bindings.ws.${BV}`,
          `components.operationTraits.tracing.bindings.kafka.${BV}`,
          `components.serverBindings.registry.kafka.${BV}`,
          `components.channelBindings.sessionsTopic.kafka.${BV}`,
          `components.operationBindings.producer.kafka.${BV}`,
          `components.messageBindings.keyed.kafka.${BV}`,
        ].sort()
      );
    });

    test("reports each version where it is declared, whatever the trait merge order, and skips a trait that removes it with null", async () => {
      expect(pathsOf(await linter.run(failTraitsDeclarationSite))).toEqual(
        [
          `channels.customers/registered.subscribe.traits.0.bindings.kafka.${BV}`,
          `channels.customers/registered.subscribe.message.traits.0.bindings.kafka.${BV}`,
          `channels.customers/deleted.subscribe.bindings.kafka.${BV}`,
          `channels.customers/deleted.subscribe.message.bindings.kafka.${BV}`,
          `channels.customers/merged.publish.message.traits.0.0.bindings.kafka.${BV}`,
          `components.messageTraits.auditTrait.bindings.kafka.${BV}`,
          `components.operationTraits.auditTrait.bindings.kafka.${BV}`,
        ].sort()
      );
    });

    test("skips null, scalar and array nodes, $ref nodes, extensions, schemas, examples, misplaced bindings and 3.x-only structures", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("validates servers, channels, messages and traits whose key starts with x-, which are names and not extensions in these maps", async () => {
      const latest = { kafka: { bindingVersion: "latest" } };
      const doc = base({
        servers: { "x-edge": { url: "k:9092", protocol: "kafka", bindings: latest } },
        channels: { "x-internal": { bindings: latest, publish: { message: { bindings: latest } } } },
        components: {
          messages: { "x-legacy": { bindings: latest } },
          messageTraits: { "x-trait": { bindings: latest } },
          serverBindings: { "x-shared": latest },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        [
          `servers.x-edge.bindings.kafka.${BV}`,
          `channels.x-internal.bindings.kafka.${BV}`,
          `channels.x-internal.publish.message.bindings.kafka.${BV}`,
          `components.messages.x-legacy.bindings.kafka.${BV}`,
          `components.messageTraits.x-trait.bindings.kafka.${BV}`,
          `components.serverBindings.x-shared.kafka.${BV}`,
        ].sort()
      );
    });

    test("reports every invalid protocol of one bindings object, in declaration order, and keeps the valid ones silent", async () => {
      const doc = base({
        servers: {
          prod: {
            url: "k:9092",
            protocol: "kafka",
            bindings: { solace: { bindingVersion: "latest" }, kafka: { bindingVersion: "0.5.0" }, nats: { bindingVersion: 0.1 }, "x-a": { bindingVersion: "x" }, jms: { bindingVersion: "0.0.1-SNAPSHOT" } },
          },
        },
      });
      expect(only(await linter.run(doc)).map((r) => r.path[3])).toEqual(["solace", "nats", "jms"]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(pathsOf(await linter.run("42"))).toEqual([]);
      expect(pathsOf(await linter.run([{ asyncapi: "2.6.0", servers: { a: { bindings: { kafka: { bindingVersion: "latest" } } } } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured pattern", () => {
    const probe = ["0.5.0", "0.4.0", "1.0.0", "0.4", "latest", "LATEST", "v0.4.0", "0.4.0-beta.1", "0.4.0+build.7", "0.4.0.1", " 0.4.0", "kafka-0.4.0", "", 0.4, true];

    const acceptedUnder = async (value) => {
      const configured = await withPattern(value);
      const reported = reportedCases(await configured.run(matrixDoc(probe)));
      return probe.filter((_, index) => !reported.has(index));
    };

    const DEFAULT_ACCEPTED = ["0.5.0", "0.4.0", "1.0.0"];

    test.each([
      ["^(\\d+\\.\\d+\\.\\d+|latest)$", [...DEFAULT_ACCEPTED, "latest"]],
      ["/^(\\d+\\.\\d+\\.\\d+|latest)$/i", [...DEFAULT_ACCEPTED, "latest", "LATEST"]],
      ["^\\d+\\.\\d+(\\.\\d+)?$", [...DEFAULT_ACCEPTED, "0.4"]],
      ["^\\d+\\.\\d+\\.\\d+(-[0-9A-Za-z.]+)?(\\+[0-9A-Za-z.]+)?$", [...DEFAULT_ACCEPTED, "0.4.0-beta.1", "0.4.0+build.7"]],
      ["^0\\.\\d+\\.\\d+$", ["0.5.0", "0.4.0"]],
      ["^0\\.[3-5]\\.0$", ["0.5.0", "0.4.0"]],
      ["^[vV]?\\d+\\.\\d+\\.\\d+$", [...DEFAULT_ACCEPTED, "v0.4.0"]],
      ["\\d+\\.\\d+\\.\\d+", [...DEFAULT_ACCEPTED, "v0.4.0", "0.4.0-beta.1", "0.4.0+build.7", "0.4.0.1", " 0.4.0", "kafka-0.4.0"]],
      ["/\\d+\\.\\d+\\.\\d+/y", [...DEFAULT_ACCEPTED, "0.4.0-beta.1", "0.4.0+build.7", "0.4.0.1"]],
      [".*", probe.filter((value) => typeof value === "string")],
      ["^$", [""]],
      ["^latest$", ["latest"]],
    ])("pattern %p accepts exactly the matching strings and never a non-string", async (value, expected) => {
      expect(await acceptedUnder(value)).toEqual(expected);
    });

    test("keeps the same answer for every value under a global flag", async () => {
      expect(await acceptedUnder("/^\\d+\\.\\d+\\.\\d+$/g")).toEqual(DEFAULT_ACCEPTED);
      const configured = await withPattern("/^\\d+\\.\\d+\\.\\d+$/g");
      expect(pathsOf(await configured.run(matrixDoc(Array(12).fill("0.5.0"))))).toEqual([]);
    });

    test("trims the configured pattern and names it, as written, in every message", async () => {
      expect(await acceptedUnder("  ^\\d+\\.\\d+$\t")).toEqual(["0.4"]);
      const configured = await withPattern(" /^(\\d+\\.\\d+\\.\\d+|latest)$/i ");
      const results = only(await configured.run(matrixDoc(["0.4", 0.4])));
      expect(results.map((r) => r.message)).toEqual([
        mismatch("Message", "kafka", "0.4", "/^(\\d+\\.\\d+\\.\\d+|latest)$/i"),
        notString("Message", "kafka", "/^(\\d+\\.\\d+\\.\\d+|latest)$/i"),
      ]);
    });

    test("a document compliant with the shipped pattern fails once the pattern is narrowed to the Kafka 0.5.0 binding", async () => {
      const configured = await withPattern("^0\\.5\\.0$");
      const results = pathsOf(await configured.run(okExample));
      expect(results).toContain(`servers.substationMqtt.bindings.mqtt.${BV}`);
      expect(results).toContain(`components.messageTraits.gridEnvelope.bindings.kafka.${BV}`);
      expect(results).not.toContain(`servers.kafkaProd.bindings.kafka.${BV}`);
      expect(results.filter((p) => /x-|payload|examples|headers/.test(p))).toEqual([]);
    });

    test("a failing document passes once the pattern accepts every string, except its non-string versions", async () => {
      const configured = await withPattern(".*");
      expect(pathsOf(await configured.run(failExample))).toEqual(
        [
          `servers.dispatchAmqp.bindings.amqp.${BV}`,
          `${P}.subscribe.bindings.kafka.${BV}`,
          `${T}.subscribe.bindings.mqtt.${BV}`,
          `components.messages.gateEvents.oneOf.1.bindings.amqp.${BV}`,
          `components.channelBindings.compacted.kafka.${BV}`,
        ].sort()
      );
    });

    test.each([[""], ["   "], ["\t\n"], ["["], ["("], ["*"], ["^(\\d+$"], ["/abc/z"], ["/[/"], [null], [undefined], [0], [42], [true], [{}], [[]], [["^\\d+$"]], [{ match: "^latest$" }]])(
      "falls back to the shipped pattern when pattern is %p",
      async (value) => {
        const configured = await withPattern(value);
        expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await configured.run(okExample))).toEqual([]);
        const results = only(await configured.run(matrixDoc(["latest"])));
        expect(results.map((r) => r.message)).toEqual([mismatch("Message", "kafka", "latest")]);
      }
    );
  });
});
