const { linterForRule, BINDING_KEY_CASES } = require("../../helpers/utils");
const okExample = require("./AAR068/ok-example");
const failExample = require("./AAR068/fail-example");
const failSharedRef = require("./AAR068/fail-shared-ref");
const failTraitsDeclarationSite = require("./AAR068/fail-traits-declaration-site");
const okStructuralEdges = require("./AAR068/ok-structural-edges");
const failLargeGenerated = require("./AAR068/fail-large-generated");

const RULE = "asa:AAR068";
const V = "channels.vehiclePositions";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withOptions = (value) => linterForRule(RULE, { functionOptions: { "allowed-bindings": value } });
const message = (kind, key) => `AAR068: ${kind} binding '${key}' is not an allowed protocol.`;

const FAIL_EXAMPLE_PATHS = [
  "servers.kafkaProd.bindings.confluent",
  "servers.mqttEdge.bindings.MQTT",
  "servers.robotFleet.bindings.dds",
  `${V}.bindings.kafka-ssl`,
  `${V}.messages.positionCorrected.bindings.bindingVersion`,
  `${V}.messages.positionCorrected.traits.1.bindings.kafak`,
  `${V}.messages.positionCorrected.traits.2.0.bindings.websocket`,
  "channels.serviceAlerts.bindings.rabbitmq",
  "channels.serviceAlerts.messages.alertRaised.bindings.amqps",
  "channels.serviceAlerts.messages.alertCleared.bindings.Amqp",
  "channels.vehicleTelemetry.bindings.websockets",
  "channels.vehicleTelemetry.messages.telemetry.bindings.mqtts",
  "operations.publishPosition.bindings.groupId",
  "operations.publishPosition.traits.1.bindings.ibm-mq",
  "operations.receiveTelemetry.bindings.ros",
  "components.servers.drKafka.bindings.kafka.v2",
  "components.channels.auditTrail.bindings.kinesis",
  "components.channels.auditTrail.messages.auditLine.bindings.servicebus",
  "components.operations.writeAudit.bindings.eventbridge",
  "components.operations.writeAudit.traits.0.bindings.pubsub",
  "components.messages.positionReported.bindings.grpc",
  "components.messageTraits.commonHeaders.bindings.X-internal",
  "components.operationTraits.kafkaProducer.bindings.confluent",
  "components.serverBindings.registry.schemaRegistryUrl",
  "components.channelBindings.compacted.kafka_ssl",
  "components.operationBindings.durable.rabbit",
  "components.messageBindings.keyed.key",
].sort();

const bad = { kafka: {}, rabbitmq: {} };

const LOCATIONS = [
  ["server", "Server", "servers.prod.bindings.rabbitmq", { servers: { prod: { host: "k:9092", protocol: "kafka", bindings: bad } } }],
  ["channel", "Channel", "channels.orders.bindings.rabbitmq", { channels: { orders: { address: "orders", bindings: bad } } }],
  ["channel with a null address", "Channel", "channels.orders.bindings.rabbitmq", { channels: { orders: { address: null, bindings: bad } } }],
  ["channel message", "Message", "channels.orders.messages.m.bindings.rabbitmq", { channels: { orders: { messages: { m: { bindings: bad } } } } }],
  ["message trait", "Message", "channels.orders.messages.m.traits.0.bindings.rabbitmq", { channels: { orders: { messages: { m: { traits: [{ bindings: bad }] } } } } }],
  ["tuple message trait", "Message", "channels.orders.messages.m.traits.0.0.bindings.rabbitmq", { channels: { orders: { messages: { m: { traits: [[{ bindings: bad }, {}]] } } } } }],
  ["send operation", "Operation", "operations.o.bindings.rabbitmq", { operations: { o: { action: "send", bindings: bad } } }],
  ["receive operation", "Operation", "operations.o.bindings.rabbitmq", { operations: { o: { action: "receive", bindings: bad } } }],
  ["operation trait", "Operation", "operations.o.traits.0.bindings.rabbitmq", { operations: { o: { action: "send", traits: [{ bindings: bad }] } } }],
  ["components.servers", "Server", "components.servers.dr.bindings.rabbitmq", { components: { servers: { dr: { host: "k:9092", protocol: "kafka", bindings: bad } } } }],
  ["components.channels", "Channel", "components.channels.audit.bindings.rabbitmq", { components: { channels: { audit: { bindings: bad } } } }],
  ["components.channels message", "Message", "components.channels.audit.messages.m.bindings.rabbitmq", { components: { channels: { audit: { messages: { m: { bindings: bad } } } } } }],
  ["components.operations", "Operation", "components.operations.o.bindings.rabbitmq", { components: { operations: { o: { action: "send", bindings: bad } } } }],
  ["components.operations trait", "Operation", "components.operations.o.traits.0.bindings.rabbitmq", { components: { operations: { o: { traits: [{ bindings: bad }] } } } }],
  ["components.messages", "Message", "components.messages.m.bindings.rabbitmq", { components: { messages: { m: { bindings: bad } } } }],
  ["components.messages trait", "Message", "components.messages.m.traits.0.bindings.rabbitmq", { components: { messages: { m: { traits: [{ bindings: bad }] } } } }],
  ["components.messageTraits", "Message", "components.messageTraits.t.bindings.rabbitmq", { components: { messageTraits: { t: { bindings: bad } } } }],
  ["components.operationTraits", "Operation", "components.operationTraits.t.bindings.rabbitmq", { components: { operationTraits: { t: { bindings: bad } } } }],
  ["components.serverBindings", "Server", "components.serverBindings.b.rabbitmq", { components: { serverBindings: { b: bad } } }],
  ["components.channelBindings", "Channel", "components.channelBindings.b.rabbitmq", { components: { channelBindings: { b: bad } } }],
  ["components.operationBindings", "Operation", "components.operationBindings.b.rabbitmq", { components: { operationBindings: { b: bad } } }],
  ["components.messageBindings", "Message", "components.messageBindings.b.rabbitmq", { components: { messageBindings: { b: bad } } }],
];

describe.each(["3.0.0", "3.1.0"])("AAR068 (AsyncAPI %s): bindings objects may only use allowed protocol keys", (version) => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  const run = async (doc, configured = linter) => pathsOf(await configured.run(withVersion(doc, version)));
  const base = (extra) => ({ asyncapi: version, info: { title: "Binding Locations", version: "1.0.0" }, ...extra });

  const matrixDoc = (keys) => ({
    asyncapi: version,
    info: { title: "Binding Key Matrix", version: "1.0.0" },
    operations: { matrix: { action: "send", bindings: Object.fromEntries(keys.map((key) => [key, {}])) } },
  });

  const reportedKeys = (results) => new Set(only(results).map((r) => r.path[3]));

  describe("shipped allowed-bindings", () => {
    test("passes a realistic multi-protocol document, ignoring extensions, payloads, multi-format schemas, headers, examples and $ref bindings", async () => {
      expect(await run(okExample)).toEqual([]);
    });

    test("reports every key outside the list in servers, channels, channel messages, operations, traits and every components map", async () => {
      expect(await run(failExample)).toEqual(FAIL_EXAMPLE_PATHS);
    });

    test("treats any version from 3 upwards as 3.x", async () => {
      for (const other of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
        expect(pathsOf(await linter.run(withVersion(failExample, other)))).toEqual(FAIL_EXAMPLE_PATHS);
      }
    });

    test.each(LOCATIONS)("reports a %s binding with its kind and the exact key path", async (_, kind, path, extra) => {
      const results = only(await linter.run(base(extra)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[path, message(kind, "rabbitmq")]]);
    });

    test("reports the exact message and severity of each kind of finding", async () => {
      const results = only(await linter.run(withVersion(failExample, version)));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
      expect(byPath["servers.robotFleet.bindings.dds"]).toBe(message("Server", "dds"));
      expect(byPath["channels.serviceAlerts.bindings.rabbitmq"]).toBe(message("Channel", "rabbitmq"));
      expect(byPath[`${V}.messages.positionCorrected.traits.2.0.bindings.websocket`]).toBe(message("Message", "websocket"));
      expect(byPath["operations.publishPosition.traits.1.bindings.ibm-mq"]).toBe(message("Operation", "ibm-mq"));
      expect(byPath["components.operations.writeAudit.traits.0.bindings.pubsub"]).toBe(message("Operation", "pubsub"));
      expect(byPath["components.serverBindings.registry.schemaRegistryUrl"]).toBe(message("Server", "schemaRegistryUrl"));
      expect(byPath["components.channelBindings.compacted.kafka_ssl"]).toBe(message("Channel", "kafka_ssl"));
      expect(byPath["components.operationBindings.durable.rabbit"]).toBe(message("Operation", "rabbit"));
      expect(byPath["components.messageBindings.keyed.key"]).toBe(message("Message", "key"));
      expect(results).toHaveLength(FAIL_EXAMPLE_PATHS.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("reports a channel whose address is null like any other channel", async () => {
      const paths = await run(failExample);
      expect(paths.filter((p) => p.startsWith("channels.serviceAlerts"))).toEqual([
        "channels.serviceAlerts.bindings.rabbitmq",
        "channels.serviceAlerts.messages.alertCleared.bindings.Amqp",
        "channels.serviceAlerts.messages.alertRaised.bindings.amqps",
      ]);
    });

    test("ignores the second element of a tuple trait and a tuple whose trait is a $ref", async () => {
      const paths = await run(failExample);
      expect(paths.filter((p) => /\.traits\.2\.1|\.traits\.3\./.test(p))).toEqual([]);
    });

    test("reports operations only on their own bindings and traits, never on replies or referenced messages", async () => {
      const paths = (await run(failExample)).filter((p) => p.startsWith("operations."));
      expect(paths).toHaveLength(3);
      paths.forEach((p) => expect(p).toMatch(/^operations\.[^.]+\.(traits\.\d+\.)?bindings\.[^.]+$/));
    });

    test.each(BINDING_KEY_CASES.allowed.map((key) => [key]))("accepts the protocol key %p", async (key) => {
      expect(await run(matrixDoc([key]))).toEqual([]);
    });

    test.each(BINDING_KEY_CASES.notAllowed.map((key) => [key]))("rejects the key %p", async (key) => {
      const results = only(await linter.run(matrixDoc([key])));
      expect(results.map((r) => r.message)).toEqual([message("Operation", key)]);
    });

    test.each(BINDING_KEY_CASES.extensions.map((key) => [key]))("ignores the specification extension %p", async (key) => {
      expect(await run(matrixDoc([key]))).toEqual([]);
    });

    test("checks a whole matrix in one bindings object and reports exactly the rejected keys", async () => {
      const keys = [...BINDING_KEY_CASES.allowed, ...BINDING_KEY_CASES.notAllowed, ...BINDING_KEY_CASES.extensions];
      const reported = reportedKeys(await linter.run(matrixDoc(keys)));
      keys.forEach((key) => expect([key, reported.has(key)]).toEqual([key, BINDING_KEY_CASES.notAllowed.includes(key)]));
    });

    test("accepts protocols the 3.x schemas do not list for every kind, such as mqtt5, mercure, pulsar on messages or ros2 on channels", async () => {
      const doc = base({
        servers: { s: { host: "h", protocol: "mqtt", bindings: { mqtt5: {}, mercure: {} } } },
        channels: { c: { address: "c", bindings: { ros2: {}, mqtt5: {} }, messages: { m: { bindings: { pulsar: {}, ros2: {} } } } } },
        operations: { o: { action: "send", bindings: { pulsar: {}, mercure: {} } } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("validates shared bindings objects, messages, traits, operations, servers and channels once at their definition, and ignores external, dangling and sibling-carrying refs", async () => {
      expect(await run(failSharedRef)).toEqual(
        [
          "components.servers.mirror.bindings.kafka_mirror",
          "components.operations.receiveImaging.bindings.dicom",
          "components.messageTraits.hl7Envelope.bindings.hl7",
          "components.operationTraits.tracing.bindings.opentelemetry",
          "components.serverBindings.registry.confluent",
          "components.channelBindings.ordersTopic.kinesis",
          "components.operationBindings.producer.kafka-ssl",
          "components.messageBindings.keyed.partitionKey",
        ].sort()
      );
    });

    test("reports each key where it is declared, whatever the trait merge order, including the tuple form of a message trait", async () => {
      expect(await run(failTraitsDeclarationSite)).toEqual(
        [
          "channels.customers.messages.registered.traits.0.bindings.mqttt",
          "channels.customers.messages.deleted.bindings.http2",
          "channels.customers.messages.merged.traits.0.0.bindings.sqss",
          "operations.onRegistered.traits.0.bindings.kafkaa",
          "operations.onDeleted.bindings.amqp091",
          "components.messageTraits.auditTrait.bindings.audit",
          "components.operationTraits.auditTrait.bindings.auditLog",
        ].sort()
      );
    });

    test("skips null, scalar and array nodes, $ref nodes, extensions, schemas, examples, replies, inline operation messages, oneOf and 2.x-only structures", async () => {
      expect(await run(okStructuralEdges)).toEqual([]);
    });

    test("validates servers, channels, operations, messages and traits whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { host: "k:9092", protocol: "kafka", bindings: { rabbitmq: {} } } },
        channels: { "x-internal": { bindings: { rabbitmq: {} }, messages: { "x-legacy": { bindings: { rabbitmq: {} } } } } },
        operations: { "x-op": { action: "send", bindings: { rabbitmq: {} } } },
        components: { messageTraits: { "x-trait": { bindings: { rabbitmq: {} } } }, operationBindings: { "x-shared": { rabbitmq: {} } } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        [
          "servers.x-edge.bindings.rabbitmq",
          "channels.x-internal.bindings.rabbitmq",
          "channels.x-internal.messages.x-legacy.bindings.rabbitmq",
          "operations.x-op.bindings.rabbitmq",
          "components.messageTraits.x-trait.bindings.rabbitmq",
          "components.operationBindings.x-shared.rabbitmq",
        ].sort()
      );
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(await run(failLargeGenerated.document)).toEqual(failLargeGenerated.expectedPaths);
    });
  });

  describe("configured allowed-bindings", () => {
    const probe = ["kafka", "amqp", "amqp1", "mqtt", "mqtt5", "ws", "http", "sns", "sqs", "googlepubsub", "pulsar", "ros2", "rabbitmq", "kafka-ssl", "Kafka", "x-internal"];

    const allowedUnder = async (value) => {
      const configured = await withOptions(value);
      const reported = reportedKeys(await configured.run(matrixDoc(probe)));
      return probe.filter((key) => !reported.has(key));
    };

    test.each([
      ["kafka", ["kafka", "x-internal"]],
      ["kafka,amqp,mqtt,ws", ["kafka", "amqp", "mqtt", "ws", "x-internal"]],
      ["mqtt, mqtt5", ["mqtt", "mqtt5", "x-internal"]],
      ["http,ws", ["ws", "http", "x-internal"]],
      ["ros2", ["ros2", "x-internal"]],
      ["kafka,rabbitmq,kafka-ssl", ["kafka", "rabbitmq", "kafka-ssl", "x-internal"]],
      [["sns", "sqs", "googlepubsub", "pulsar"], ["sns", "sqs", "googlepubsub", "pulsar", "x-internal"]],
    ])("allowed-bindings %p accepts exactly the matching probes and always the extensions", async (value, expected) => {
      expect(await allowedUnder(value)).toEqual(expected);
    });

    test("normalises case and whitespace of entries, ignores unusable ones, and never allows a capitalised key", async () => {
      expect(await allowedUnder(" KAFKA , Amqp ,, kafka streams, *")).toEqual(["kafka", "amqp", "x-internal"]);
    });

    test("a document compliant with the shipped list fails once the list is narrowed to kafka", async () => {
      expect(await run(okExample, await withOptions("kafka"))).toEqual(
        [
          "servers.mqttEdge.bindings.mqtt",
          "servers.rabbit.bindings.amqp",
          "servers.rabbit.bindings.amqp1",
          "servers.wsGateway.bindings.ws",
          "servers.wsGateway.bindings.http",
          "servers.pulsarCluster.bindings.pulsar",
          "servers.robotFleet.bindings.ros2",
          "channels.vehicleTelemetry.bindings.ws",
          "channels.vehicleTelemetry.bindings.mqtt",
          "channels.vehicleTelemetry.messages.telemetry.bindings.mqtt",
          "channels.serviceAlerts.bindings.amqp",
          "channels.serviceAlerts.messages.alertRaised.bindings.amqp",
          "channels.notifications.bindings.sns",
          "channels.notifications.bindings.sqs",
          "channels.notifications.bindings.googlepubsub",
          "channels.notifications.bindings.pulsar",
          "operations.receiveTelemetry.bindings.mqtt",
          "operations.receiveTelemetry.bindings.ros2",
          ...["sns", "sqs", "http", "anypointmq", "jms", "stomp", "redis", "nats", "solace", "ibmmq", "mercure"].map((key) => `operations.notify.bindings.${key}`),
          "components.messages.notificationSent.bindings.sns",
          "components.messages.notificationSent.bindings.sqs",
          "components.messages.notificationSent.bindings.googlepubsub",
          "components.serverBindings.registry.mqtt5",
          "components.operationBindings.durableConsumer.amqp",
        ].sort()
      );
    });

    test("a failing document passes once its lowercase keys are allowed, except the capitalised ones", async () => {
      const configured = await withOptions(
        "kafka, amqp, mqtt, ws, sns, sqs, ros2, confluent, dds, kafka-ssl, kafak, websocket, rabbitmq, amqps, websockets, mqtts, ibm-mq, ros, kafka.v2, kinesis, servicebus, eventbridge, pubsub, grpc, kafka_ssl, rabbit, key"
      );
      expect(await run(failExample, configured)).toEqual(
        [
          "servers.mqttEdge.bindings.MQTT",
          `${V}.messages.positionCorrected.bindings.bindingVersion`,
          "channels.serviceAlerts.messages.alertCleared.bindings.Amqp",
          "operations.publishPosition.bindings.groupId",
          "components.messageTraits.commonHeaders.bindings.X-internal",
          "components.serverBindings.registry.schemaRegistryUrl",
        ].sort()
      );
    });

    test.each([[""], [" , "], ["*"], ["Ámqp"], [null], [0], [true], [{}], [[]], [[null, 3]]])("falls back to the shipped list when allowed-bindings is %p", async (value) => {
      const configured = await withOptions(value);
      expect(await run(failExample, configured)).toEqual(FAIL_EXAMPLE_PATHS);
      expect(await run(okExample, configured)).toEqual([]);
    });
  });
});
