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
const TR = "channels.tripRequested";
const RN = "channels.riderNotifications";
const BV = "bindingVersion";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withPattern = (value) => linterForRule(RULE, { functionOptions: { pattern: value } });
const mismatch = (kind, key, value, pattern = DEFAULT) => `AAR070: ${kind} binding '${key}' bindingVersion '${value}' must match '${pattern}'.`;
const notString = (kind, key, pattern = DEFAULT) => `AAR070: ${kind} binding '${key}' bindingVersion must be a string matching '${pattern}'.`;

const FAIL_EXAMPLE_PATHS = [
  `servers.kafkaProd.bindings.kafka.${BV}`,
  `servers.driverMqtt.bindings.mqtt.${BV}`,
  `servers.riderWs.bindings.ws.${BV}`,
  `${TR}.messages.tripRequestedLegacy.bindings.kafka.${BV}`,
  `${TR}.messages.tripRequestedLegacy.traits.1.bindings.kafka.${BV}`,
  `${TR}.messages.tripRequestedLegacy.traits.2.0.bindings.kafka.${BV}`,
  `${TR}.bindings.kafka.${BV}`,
  `channels.driverLocation.messages.locationUpdated.bindings.mqtt.${BV}`,
  `channels.driverLocation.bindings.ws.${BV}`,
  `${RN}.messages.notification.bindings.ws.${BV}`,
  `${RN}.messages.receipt.bindings.http.${BV}`,
  `${RN}.bindings.ws.${BV}`,
  `operations.requestTrip.bindings.kafka.${BV}`,
  `operations.requestTrip.traits.1.bindings.kafka.${BV}`,
  `operations.receiveLocation.bindings.mqtt.${BV}`,
  `components.servers.drKafka.bindings.kafka.${BV}`,
  `components.channels.surgePricing.messages.surgeChanged.bindings.pulsar.${BV}`,
  `components.channels.surgePricing.bindings.pulsar.${BV}`,
  `components.operations.publishSurge.bindings.pulsar.${BV}`,
  `components.operations.publishSurge.traits.0.bindings.pulsar.${BV}`,
  `components.messages.tripCancelled.bindings.sns.${BV}`,
  `components.messageTraits.tripEnvelope.bindings.kafka.${BV}`,
  `components.operationTraits.kafkaProducer.bindings.ibmmq.${BV}`,
  `components.serverBindings.registry.kafka.${BV}`,
  `components.channelBindings.compacted.kafka.${BV}`,
  `components.operationBindings.durable.rabbitmq.${BV}`,
  `components.messageBindings.keyed.googlepubsub.${BV}`,
].sort();

const bad = { kafka: { bindingVersion: "0.5.0" }, amqp: { bindingVersion: "latest" } };

const LOCATIONS = [
  ["server", "Server", "servers.prod.bindings", { servers: { prod: { host: "k:9092", protocol: "kafka", bindings: bad } } }],
  ["channel", "Channel", "channels.orders.bindings", { channels: { orders: { address: "orders", bindings: bad } } }],
  ["channel with a null address", "Channel", "channels.orders.bindings", { channels: { orders: { address: null, bindings: bad } } }],
  ["channel message", "Message", "channels.orders.messages.m.bindings", { channels: { orders: { messages: { m: { bindings: bad } } } } }],
  ["message trait", "Message", "channels.orders.messages.m.traits.0.bindings", { channels: { orders: { messages: { m: { traits: [{ bindings: bad }] } } } } }],
  ["tuple message trait", "Message", "channels.orders.messages.m.traits.0.0.bindings", { channels: { orders: { messages: { m: { traits: [[{ bindings: bad }, {}]] } } } } }],
  ["send operation", "Operation", "operations.o.bindings", { operations: { o: { action: "send", bindings: bad } } }],
  ["receive operation", "Operation", "operations.o.bindings", { operations: { o: { action: "receive", bindings: bad } } }],
  ["operation trait", "Operation", "operations.o.traits.0.bindings", { operations: { o: { action: "send", traits: [{ bindings: bad }] } } }],
  ["components.servers", "Server", "components.servers.dr.bindings", { components: { servers: { dr: { host: "k:9092", protocol: "kafka", bindings: bad } } } }],
  ["components.channels", "Channel", "components.channels.audit.bindings", { components: { channels: { audit: { bindings: bad } } } }],
  ["components.channels message", "Message", "components.channels.audit.messages.m.bindings", { components: { channels: { audit: { messages: { m: { bindings: bad } } } } } }],
  ["components.operations", "Operation", "components.operations.o.bindings", { components: { operations: { o: { action: "send", bindings: bad } } } }],
  ["components.operations trait", "Operation", "components.operations.o.traits.0.bindings", { components: { operations: { o: { traits: [{ bindings: bad }] } } } }],
  ["components.messages", "Message", "components.messages.m.bindings", { components: { messages: { m: { bindings: bad } } } }],
  ["components.messages trait", "Message", "components.messages.m.traits.0.bindings", { components: { messages: { m: { traits: [{ bindings: bad }] } } } }],
  ["components.messageTraits", "Message", "components.messageTraits.t.bindings", { components: { messageTraits: { t: { bindings: bad } } } }],
  ["components.operationTraits", "Operation", "components.operationTraits.t.bindings", { components: { operationTraits: { t: { bindings: bad } } } }],
  ["components.serverBindings", "Server", "components.serverBindings.b", { components: { serverBindings: { b: bad } } }],
  ["components.channelBindings", "Channel", "components.channelBindings.b", { components: { channelBindings: { b: bad } } }],
  ["components.operationBindings", "Operation", "components.operationBindings.b", { components: { operationBindings: { b: bad } } }],
  ["components.messageBindings", "Message", "components.messageBindings.b", { components: { messageBindings: { b: bad } } }],
];

const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[2].slice(4))));

describe.each(["3.0.0", "3.1.0"])("AAR070 (AsyncAPI %s): every protocol binding bindingVersion must match the configured pattern", (version) => {
  let linter;

  const base = (extra) => ({ asyncapi: version, info: { title: "Binding Version Locations", version: "1.0.0" }, ...extra });
  const matrixDoc = (values, protocol = "kafka") =>
    base({ components: { messageBindings: Object.fromEntries(values.map((value, index) => [`case${index}`, { [protocol]: { bindingVersion: value } }])) } });
  const run = async (doc, configured = linter) => configured.run(withVersion(doc, version));

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped pattern", () => {
    test("passes a realistic multi-protocol document, ignoring extensions, multi-format payloads, headers, examples, replies, null versions and $ref bindings", async () => {
      expect(pathsOf(await run(okExample))).toEqual([]);
    });

    test("reports every invalid bindingVersion in servers, channels, channel messages, operations, traits and every components map", async () => {
      expect(pathsOf(await run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test("treats any version from 3 upwards as 3.x", async () => {
      for (const variant of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
        expect(pathsOf(await linter.run(withVersion(failExample, variant)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test.each(LOCATIONS)("reports a %s binding with its kind and the exact bindingVersion path", async (_, kind, prefix, extra) => {
      const results = only(await run(base(extra)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[`${prefix}.amqp.${BV}`, mismatch(kind, "amqp", "latest")]]);
    });

    test("reports the exact message and severity of each kind of finding", async () => {
      const results = only(await run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
      expect(byPath[`servers.kafkaProd.bindings.kafka.${BV}`]).toBe(mismatch("Server", "kafka", "latest"));
      expect(byPath[`servers.riderWs.bindings.ws.${BV}`]).toBe(notString("Server", "ws"));
      expect(byPath[`${TR}.bindings.kafka.${BV}`]).toBe(mismatch("Channel", "kafka", "0.5.0.0"));
      expect(byPath[`${TR}.messages.tripRequestedLegacy.traits.2.0.bindings.kafka.${BV}`]).toBe(mismatch("Message", "kafka", "LATEST"));
      expect(byPath[`channels.driverLocation.messages.locationUpdated.bindings.mqtt.${BV}`]).toBe(notString("Message", "mqtt"));
      expect(byPath[`${RN}.messages.notification.bindings.ws.${BV}`]).toBe(mismatch("Message", "ws", ""));
      expect(byPath[`${RN}.bindings.ws.${BV}`]).toBe(notString("Channel", "ws"));
      expect(byPath[`operations.requestTrip.traits.1.bindings.kafka.${BV}`]).toBe(mismatch("Operation", "kafka", "^0.4.0"));
      expect(byPath[`operations.receiveLocation.bindings.mqtt.${BV}`]).toBe(mismatch("Operation", "mqtt", "0.2.0\\n"));
      expect(byPath[`components.operations.publishSurge.traits.0.bindings.pulsar.${BV}`]).toBe(notString("Operation", "pulsar"));
      expect(byPath[`components.channels.surgePricing.messages.surgeChanged.bindings.pulsar.${BV}`]).toBe(mismatch("Message", "pulsar", "0.1.0+build.9"));
      expect(byPath[`components.channelBindings.compacted.kafka.${BV}`]).toBe(notString("Channel", "kafka"));
      expect(byPath[`components.messageBindings.keyed.googlepubsub.${BV}`]).toBe(mismatch("Message", "googlepubsub", "0.2.0 "));
      expect(results).toHaveLength(FAIL_EXAMPLE_PATHS.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test.each(BINDING_VERSION_CASES.valid.map((value) => [value]))("accepts the bindingVersion %p", async (value) => {
      expect(pathsOf(await run(matrixDoc([value])))).toEqual([]);
    });

    test.each(BINDING_VERSION_CASES.invalid.map((value) => [value]))("rejects the bindingVersion %p", async (value) => {
      const results = only(await run(matrixDoc([value])));
      expect(results.map((r) => r.message)).toEqual([mismatch("Message", "kafka", value.replace(/\n/g, "\\n").replace(/\t/g, "\\t"))]);
    });

    test("escapes control characters so every message stays on one line", async () => {
      const results = only(await run(matrixDoc(["0.4.0\r\n", "\u00000.4.0", "0.4.0\u001b", "0.4.0\u007f"])));
      expect(results.map((r) => r.message)).toEqual([
        mismatch("Message", "kafka", "0.4.0\\r\\n"),
        mismatch("Message", "kafka", "\\u00000.4.0"),
        mismatch("Message", "kafka", "0.4.0\\u001b"),
        mismatch("Message", "kafka", "0.4.0\\u007f"),
      ]);
    });

    test.each(BINDING_VERSION_CASES.nonString.map((value) => [value]))("rejects the non-string bindingVersion %p", async (value) => {
      const results = only(await run(matrixDoc([value])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[`components.messageBindings.case0.kafka.${BV}`, notString("Message", "kafka")]]);
    });

    test.each(BINDING_VERSION_CASES.absent.map((value) => [value]))("leaves a %p bindingVersion to AAR037", async (value) => {
      expect(pathsOf(await run(matrixDoc([value])))).toEqual([]);
    });

    test("checks a whole matrix and reports exactly the invalid and non-string versions", async () => {
      const values = [...BINDING_VERSION_CASES.valid, ...BINDING_VERSION_CASES.invalid, ...BINDING_VERSION_CASES.nonString, null];
      const reported = reportedCases(await run(matrixDoc(values)));
      const rejected = new Set([...BINDING_VERSION_CASES.invalid, ...BINDING_VERSION_CASES.nonString]);
      values.forEach((value, index) => expect([value, reported.has(index)]).toEqual([value, rejected.has(value)]));
    });

    test.each(["kafka", "amqp", "mqtt", "ws", "http", "sns", "sqs", "nats", "jms", "solace", "googlepubsub", "pulsar", "ibmmq", "ros2", "mercure", "rabbitmq", "Kafka", "X-internal"])(
      "validates the bindingVersion of a %p binding",
      async (protocol) => {
        const results = only(await run(matrixDoc(["0.4.0", "latest"], protocol)));
        expect(results.map((r) => r.message)).toEqual([mismatch("Message", protocol, "latest")]);
      }
    );

    test.each(["x-", "x-kafka", "x-internal", "x-Kafka", "x-ros2.qos"])("ignores the bindingVersion of the %p extension", async (key) => {
      expect(pathsOf(await run(matrixDoc(["latest", 0.4, ""], key)))).toEqual([]);
    });

    test("validates shared bindings, servers, channels, operations, messages and traits once at their definition, and ignores external, dangling and sibling-carrying refs", async () => {
      expect(pathsOf(await run(failSharedRef))).toEqual(
        [
          `components.servers.mirror.bindings.kafka.${BV}`,
          `components.operations.auditSession.bindings.kafka.${BV}`,
          `components.messageTraits.chargingEnvelope.bindings.ws.${BV}`,
          `components.operationTraits.tracing.bindings.kafka.${BV}`,
          `components.serverBindings.registry.kafka.${BV}`,
          `components.channelBindings.sessionsTopic.kafka.${BV}`,
          `components.operationBindings.producer.kafka.${BV}`,
          `components.messageBindings.keyed.kafka.${BV}`,
        ].sort()
      );
    });

    test("reports each version where it is declared, even when the message or operation overrides its trait, and skips a null that removes it", async () => {
      expect(pathsOf(await run(failTraitsDeclarationSite))).toEqual(
        [
          `channels.registered.messages.customerRegistered.traits.0.bindings.kafka.${BV}`,
          `channels.deleted.messages.customerDeleted.bindings.kafka.${BV}`,
          `channels.merged.messages.customerMerged.traits.0.0.bindings.kafka.${BV}`,
          `operations.onRegistered.traits.0.bindings.kafka.${BV}`,
          `operations.onDeleted.bindings.kafka.${BV}`,
          `components.messageTraits.auditTrait.bindings.kafka.${BV}`,
          `components.operationTraits.auditTrait.bindings.kafka.${BV}`,
        ].sort()
      );
    });

    test("skips null, scalar and array nodes, $ref nodes, extensions, schemas, replies, inline operation messages and 2.x leftovers", async () => {
      expect(pathsOf(await run(okStructuralEdges))).toEqual([]);
    });

    test("validates servers, channels, operations, messages and traits whose key starts with x-, which are names and not extensions in these maps", async () => {
      const latest = { kafka: { bindingVersion: "latest" } };
      const doc = base({
        servers: { "x-edge": { host: "k:9092", protocol: "kafka", bindings: latest } },
        channels: { "x-internal": { address: null, bindings: latest, messages: { "x-legacy": { bindings: latest } } } },
        operations: { "x-audit": { action: "send", bindings: latest } },
        components: { messageTraits: { "x-trait": { bindings: latest } }, operationBindings: { "x-shared": latest } },
      });
      expect(pathsOf(await run(doc))).toEqual(
        [
          `servers.x-edge.bindings.kafka.${BV}`,
          `channels.x-internal.bindings.kafka.${BV}`,
          `channels.x-internal.messages.x-legacy.bindings.kafka.${BV}`,
          `operations.x-audit.bindings.kafka.${BV}`,
          `components.messageTraits.x-trait.bindings.kafka.${BV}`,
          `components.operationBindings.x-shared.kafka.${BV}`,
        ].sort()
      );
    });

    test("ignores publish/subscribe operations and message.oneOf, which belong to 2.x", async () => {
      const latest = { kafka: { bindingVersion: "latest" } };
      const doc = base({
        channels: { orders: { address: "orders", publish: { bindings: latest, message: { bindings: latest } }, messages: { m: { oneOf: [{ bindings: latest }] } } } },
        components: { messages: { m: { oneOf: [{ bindings: latest }] } }, channels: { c: { subscribe: { bindings: latest } } } },
      });
      expect(pathsOf(await run(doc))).toEqual([]);
    });

    test("reports every invalid protocol of one bindings object, in declaration order, and keeps the valid ones silent", async () => {
      const doc = base({
        operations: {
          o: {
            action: "receive",
            bindings: { solace: { bindingVersion: "latest" }, kafka: { bindingVersion: "0.5.0" }, nats: { bindingVersion: 0.1 }, "x-a": { bindingVersion: "x" }, ros2: { bindingVersion: "0.1" } },
          },
        },
      });
      expect(only(await run(doc)).map((r) => r.path[3])).toEqual(["solace", "nats", "ros2"]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured pattern", () => {
    const probe = ["0.5.0", "0.4.0", "1.0.0", "0.4", "latest", "LATEST", "v0.4.0", "0.4.0-beta.1", "0.4.0+build.7", "0.4.0.1", " 0.4.0", "kafka-0.4.0", "", 0.4, true];
    const DEFAULT_ACCEPTED = ["0.5.0", "0.4.0", "1.0.0"];

    const acceptedUnder = async (value) => {
      const configured = await withPattern(value);
      const reported = reportedCases(await run(matrixDoc(probe), configured));
      return probe.filter((_, index) => !reported.has(index));
    };

    test.each([
      ["^(\\d+\\.\\d+\\.\\d+|latest)$", [...DEFAULT_ACCEPTED, "latest"]],
      ["/^(\\d+\\.\\d+\\.\\d+|latest)$/i", [...DEFAULT_ACCEPTED, "latest", "LATEST"]],
      ["^\\d+\\.\\d+(\\.\\d+)?$", [...DEFAULT_ACCEPTED, "0.4"]],
      ["^\\d+\\.\\d+\\.\\d+(-[0-9A-Za-z.]+)?(\\+[0-9A-Za-z.]+)?$", [...DEFAULT_ACCEPTED, "0.4.0-beta.1", "0.4.0+build.7"]],
      ["^0\\.\\d+\\.\\d+$", ["0.5.0", "0.4.0"]],
      ["^[vV]?\\d+\\.\\d+\\.\\d+$", [...DEFAULT_ACCEPTED, "v0.4.0"]],
      ["\\d+\\.\\d+\\.\\d+", [...DEFAULT_ACCEPTED, "v0.4.0", "0.4.0-beta.1", "0.4.0+build.7", "0.4.0.1", " 0.4.0", "kafka-0.4.0"]],
      ["/\\d+\\.\\d+\\.\\d+/y", [...DEFAULT_ACCEPTED, "0.4.0-beta.1", "0.4.0+build.7", "0.4.0.1"]],
      ["/^\\d+\\.\\d+\\.\\d+$/g", DEFAULT_ACCEPTED],
      [".*", probe.filter((value) => typeof value === "string")],
    ])("pattern %p accepts exactly the matching strings and never a non-string", async (value, expected) => {
      expect(await acceptedUnder(value)).toEqual(expected);
    });

    test("a failing document passes once the pattern accepts every string, except its non-string versions", async () => {
      const configured = await withPattern(".*");
      expect(pathsOf(await run(failExample, configured))).toEqual(
        [
          `servers.riderWs.bindings.ws.${BV}`,
          `channels.driverLocation.messages.locationUpdated.bindings.mqtt.${BV}`,
          `${RN}.bindings.ws.${BV}`,
          `components.operations.publishSurge.traits.0.bindings.pulsar.${BV}`,
          `components.channelBindings.compacted.kafka.${BV}`,
        ].sort()
      );
    });

    test("names the configured pattern in every message", async () => {
      const configured = await withPattern("^0\\.5\\.0$");
      const results = only(await run(okExample, configured));
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => expect(r.message).toMatch(/ '\^0\\\.5\\\.0\$'\.$/));
      expect(pathsOf(results)).toContain(`servers.driverMqtt.bindings.mqtt.${BV}`);
      expect(pathsOf(results).filter((p) => /x-|payload|examples|headers|reply|replies/.test(p))).toEqual([]);
    });

    test.each([[""], ["  "], ["["], ["*"], ["/abc/z"], [null], [42], [false], [{}], [["^\\d+$"]]])("falls back to the shipped pattern when pattern is %p", async (value) => {
      const configured = await withPattern(value);
      expect(pathsOf(await run(failExample, configured))).toEqual(FAIL_EXAMPLE_PATHS);
      expect(pathsOf(await run(okExample, configured))).toEqual([]);
    });
  });
});
