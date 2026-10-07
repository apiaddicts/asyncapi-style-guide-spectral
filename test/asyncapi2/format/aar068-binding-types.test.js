const { linterForRule, BINDING_KEY_CASES } = require("../../helpers/utils");
const okExample = require("./AAR068/ok-example");
const failExample = require("./AAR068/fail-example");
const failSharedRef = require("./AAR068/fail-shared-ref");
const failTraitsDeclarationSite = require("./AAR068/fail-traits-declaration-site");
const okStructuralEdges = require("./AAR068/ok-structural-edges");
const failLargeGenerated = require("./AAR068/fail-large-generated");

const RULE = "asa:AAR068";
const P = "channels.harborline.cmd.containers.gate-in.v2";
const T = "channels.harborline/telemetry/{craneId}";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withOptions = (value) => linterForRule(RULE, { functionOptions: { "allowed-bindings": value } });
const message = (kind, key) => `AAR068: ${kind} binding '${key}' is not an allowed protocol.`;

const FAIL_EXAMPLE_PATHS = [
  "servers.kafkaProd.bindings.confluent",
  "servers.rabbitProd.bindings.rabbitmq",
  "servers.mqttEdge.bindings.MQTT5",
  `${P}.bindings.kafka-ssl`,
  `${P}.publish.bindings.bindingVersion`,
  `${P}.publish.traits.1.bindings.kafak`,
  `${P}.publish.message.bindings.Kafka`,
  `${P}.publish.message.traits.1.bindings.websocket`,
  `${P}.publish.message.traits.2.0.bindings.amqps`,
  `${P}.subscribe.bindings.ibm-mq`,
  `${P}.subscribe.message.oneOf.1.bindings.pubsub`,
  `${P}.subscribe.message.oneOf.2.bindings.https`,
  `${T}.bindings.websockets`,
  `${T}.subscribe.bindings.mqtts`,
  "components.servers.drKafka.bindings.kafka.v2",
  "components.channels.auditTrail.bindings.kinesis",
  "components.channels.auditTrail.publish.bindings.eventbridge",
  "components.channels.auditTrail.publish.message.bindings.servicebus",
  "components.messages.containerInspected.bindings.grpc",
  "components.messages.gateEvents.oneOf.1.bindings.sse",
  "components.messageTraits.commonHeaders.bindings.X-internal",
  "components.operationTraits.kafkaProducer.bindings.confluent",
  "components.serverBindings.registry.schemaRegistryUrl",
  "components.channelBindings.compacted.kafka_ssl",
  "components.operationBindings.durable.rabbit",
  "components.messageBindings.keyed.groupId",
].sort();

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Binding Locations", version: "1.0.0" }, ...extra });
const bad = { kafka: {}, rabbitmq: {} };

const LOCATIONS = [
  ["server", "Server", "servers.prod.bindings.rabbitmq", { servers: { prod: { url: "k:9092", protocol: "kafka", bindings: bad } } }],
  ["channel", "Channel", "channels.orders.bindings.rabbitmq", { channels: { orders: { bindings: bad } } }],
  ["publish operation", "Operation", "channels.orders.publish.bindings.rabbitmq", { channels: { orders: { publish: { bindings: bad } } } }],
  ["subscribe operation", "Operation", "channels.orders.subscribe.bindings.rabbitmq", { channels: { orders: { subscribe: { bindings: bad } } } }],
  ["operation trait", "Operation", "channels.orders.publish.traits.0.bindings.rabbitmq", { channels: { orders: { publish: { traits: [{ bindings: bad }] } } } }],
  ["publish message", "Message", "channels.orders.publish.message.bindings.rabbitmq", { channels: { orders: { publish: { message: { bindings: bad } } } } }],
  ["subscribe message", "Message", "channels.orders.subscribe.message.bindings.rabbitmq", { channels: { orders: { subscribe: { message: { bindings: bad } } } } }],
  ["oneOf member", "Message", "channels.orders.publish.message.oneOf.0.bindings.rabbitmq", { channels: { orders: { publish: { message: { oneOf: [{ bindings: bad }] } } } } }],
  ["message trait", "Message", "channels.orders.publish.message.traits.0.bindings.rabbitmq", { channels: { orders: { publish: { message: { traits: [{ bindings: bad }] } } } } }],
  ["tuple message trait", "Message", "channels.orders.publish.message.traits.0.0.bindings.rabbitmq", { channels: { orders: { publish: { message: { traits: [[{ bindings: bad }, {}]] } } } } }],
  ["oneOf member trait", "Message", "channels.orders.publish.message.oneOf.0.traits.0.bindings.rabbitmq", { channels: { orders: { publish: { message: { oneOf: [{ traits: [{ bindings: bad }] }] } } } } }],
  ["components.servers", "Server", "components.servers.dr.bindings.rabbitmq", { components: { servers: { dr: { url: "k:9092", protocol: "kafka", bindings: bad } } } }],
  ["components.channels", "Channel", "components.channels.audit.bindings.rabbitmq", { components: { channels: { audit: { bindings: bad } } } }],
  ["components.channels operation", "Operation", "components.channels.audit.subscribe.bindings.rabbitmq", { components: { channels: { audit: { subscribe: { bindings: bad } } } } }],
  ["components.channels message", "Message", "components.channels.audit.subscribe.message.bindings.rabbitmq", { components: { channels: { audit: { subscribe: { message: { bindings: bad } } } } } }],
  ["components.messages", "Message", "components.messages.m.bindings.rabbitmq", { components: { messages: { m: { bindings: bad } } } }],
  ["components.messages oneOf", "Message", "components.messages.m.oneOf.0.bindings.rabbitmq", { components: { messages: { m: { oneOf: [{ bindings: bad }] } } } }],
  ["components.messages trait", "Message", "components.messages.m.traits.0.bindings.rabbitmq", { components: { messages: { m: { traits: [{ bindings: bad }] } } } }],
  ["components.messageTraits", "Message", "components.messageTraits.t.bindings.rabbitmq", { components: { messageTraits: { t: { bindings: bad } } } }],
  ["components.operationTraits", "Operation", "components.operationTraits.t.bindings.rabbitmq", { components: { operationTraits: { t: { bindings: bad } } } }],
  ["components.serverBindings", "Server", "components.serverBindings.b.rabbitmq", { components: { serverBindings: { b: bad } } }],
  ["components.channelBindings", "Channel", "components.channelBindings.b.rabbitmq", { components: { channelBindings: { b: bad } } }],
  ["components.operationBindings", "Operation", "components.operationBindings.b.rabbitmq", { components: { operationBindings: { b: bad } } }],
  ["components.messageBindings", "Message", "components.messageBindings.b.rabbitmq", { components: { messageBindings: { b: bad } } }],
];

const matrixDoc = (keys) => ({
  asyncapi: "2.6.0",
  info: { title: "Binding Key Matrix", version: "1.0.0" },
  components: { messageBindings: { matrix: Object.fromEntries(keys.map((key) => [key, {}])) } },
});

const reportedKeys = (results) => new Set(only(results).map((r) => r.path[3]));

describe("AAR068 (AsyncAPI 2.x): bindings objects may only use allowed protocol keys", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped allowed-bindings", () => {
    test("passes a realistic multi-protocol document, ignoring extensions, payloads, headers, examples, Avro fields and $ref bindings", async () => {
      expect(pathsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every key outside the list in servers, channels, operations, messages, traits and every components map", async () => {
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

    test.each(LOCATIONS)("reports a %s binding with its kind and the exact key path", async (_, kind, path, extra) => {
      const results = only(await linter.run(base(extra)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[path, message(kind, "rabbitmq")]]);
    });

    test("reports the exact message and severity of each kind of finding", async () => {
      const results = only(await linter.run(failExample));
      const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
      expect(byPath["servers.mqttEdge.bindings.MQTT5"]).toBe(message("Server", "MQTT5"));
      expect(byPath[`${P}.bindings.kafka-ssl`]).toBe(message("Channel", "kafka-ssl"));
      expect(byPath[`${P}.publish.traits.1.bindings.kafak`]).toBe(message("Operation", "kafak"));
      expect(byPath[`${P}.publish.message.traits.2.0.bindings.amqps`]).toBe(message("Message", "amqps"));
      expect(byPath["components.serverBindings.registry.schemaRegistryUrl"]).toBe(message("Server", "schemaRegistryUrl"));
      expect(byPath["components.channelBindings.compacted.kafka_ssl"]).toBe(message("Channel", "kafka_ssl"));
      expect(byPath["components.operationBindings.durable.rabbit"]).toBe(message("Operation", "rabbit"));
      expect(byPath["components.messageBindings.keyed.groupId"]).toBe(message("Message", "groupId"));
      expect(results).toHaveLength(FAIL_EXAMPLE_PATHS.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("compares keys as written: a capitalised protocol and a field that belongs inside a binding are reported", async () => {
      const results = only(await linter.run(failExample));
      const keys = results.map((r) => r.path[r.path.length - 1]);
      expect(keys).toEqual(expect.arrayContaining(["Kafka", "MQTT5", "X-internal", "bindingVersion", "schemaRegistryUrl", "groupId"]));
    });

    test.each(BINDING_KEY_CASES.allowed.map((key) => [key]))("accepts the protocol key %p", async (key) => {
      expect(pathsOf(await linter.run(matrixDoc([key])))).toEqual([]);
    });

    test.each(BINDING_KEY_CASES.notAllowed.map((key) => [key]))("rejects the key %p", async (key) => {
      const results = only(await linter.run(matrixDoc([key])));
      expect(results.map((r) => r.message)).toEqual([message("Message", key)]);
    });

    test.each(BINDING_KEY_CASES.extensions.map((key) => [key]))("ignores the specification extension %p", async (key) => {
      expect(pathsOf(await linter.run(matrixDoc([key])))).toEqual([]);
    });

    test("checks a whole matrix in one bindings object and reports exactly the rejected keys", async () => {
      const keys = [...BINDING_KEY_CASES.allowed, ...BINDING_KEY_CASES.notAllowed, ...BINDING_KEY_CASES.extensions];
      expect(new Set(keys).size).toBe(keys.length);
      const reported = reportedKeys(await linter.run(matrixDoc(keys)));
      keys.forEach((key) => expect([key, reported.has(key)]).toEqual([key, BINDING_KEY_CASES.notAllowed.includes(key)]));
    });

    test("accepts protocols added in later AsyncAPI versions in any 2.x document, such as ros2 or pulsar in 2.0.0", async () => {
      const doc = withVersion(matrixDoc(["ros2", "pulsar", "googlepubsub", "solace", "anypointmq", "ibmmq", "mercure", "mqtt5"]), "2.0.0");
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("validates a shared bindings object, message, trait, server or channel once at its definition, and ignores external, dangling and sibling-carrying refs", async () => {
      expect(pathsOf(await linter.run(failSharedRef))).toEqual(
        [
          "components.servers.mirror.bindings.kafka_mirror",
          "components.messageTraits.telemetryEnvelope.bindings.websocket",
          "components.operationTraits.tracing.bindings.opentelemetry",
          "components.serverBindings.registry.confluent",
          "components.channelBindings.telemetryTopic.kinesis",
          "components.operationBindings.producer.kafka-ssl",
          "components.messageBindings.keyed.partitionKey",
        ].sort()
      );
    });

    test("reports each key where it is declared, whatever the trait merge order, including the tuple form of a message trait", async () => {
      expect(pathsOf(await linter.run(failTraitsDeclarationSite))).toEqual(
        [
          "channels.customers/registered.subscribe.traits.0.bindings.kafkaa",
          "channels.customers/registered.subscribe.message.traits.0.bindings.mqttt",
          "channels.customers/deleted.subscribe.bindings.amqp091",
          "channels.customers/deleted.subscribe.message.bindings.http2",
          "channels.customers/merged.publish.message.traits.0.0.bindings.sqss",
          "components.messageTraits.auditTrait.bindings.audit",
          "components.operationTraits.auditTrait.bindings.auditLog",
        ].sort()
      );
    });

    test("skips null, scalar and array nodes, $ref nodes, extensions, schemas, examples, misplaced bindings and 3.x-only structures", async () => {
      expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("validates servers, channels, messages and traits whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { url: "k:9092", protocol: "kafka", bindings: { rabbitmq: {} } } },
        channels: { "x-internal": { bindings: { rabbitmq: {} }, publish: { message: { bindings: { rabbitmq: {} } } } } },
        components: {
          messages: { "x-legacy": { bindings: { rabbitmq: {} } } },
          messageTraits: { "x-trait": { bindings: { rabbitmq: {} } } },
          serverBindings: { "x-shared": { rabbitmq: {} } },
        },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        [
          "servers.x-edge.bindings.rabbitmq",
          "channels.x-internal.bindings.rabbitmq",
          "channels.x-internal.publish.message.bindings.rabbitmq",
          "components.messages.x-legacy.bindings.rabbitmq",
          "components.messageTraits.x-trait.bindings.rabbitmq",
          "components.serverBindings.x-shared.rabbitmq",
        ].sort()
      );
    });

    test("reports every invalid key of one bindings object, in declaration order, and keeps the valid ones silent", async () => {
      const doc = base({ servers: { prod: { url: "k:9092", protocol: "kafka", bindings: { zeromq: {}, kafka: {}, rocketmq: {}, "x-a": {}, activemq: {} } } } });
      expect(only(await linter.run(doc)).map((r) => r.path[3])).toEqual(["zeromq", "rocketmq", "activemq"]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(pathsOf(await linter.run("42"))).toEqual([]);
      expect(pathsOf(await linter.run([{ asyncapi: "2.6.0", servers: { a: { bindings: { rabbitmq: {} } } } }]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
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
      ["amqp, amqp1", ["amqp", "amqp1", "x-internal"]],
      ["mqtt", ["mqtt", "x-internal"]],
      ["mqtt5", ["mqtt5", "x-internal"]],
      ["http,ws", ["ws", "http", "x-internal"]],
      ["sns,sqs,googlepubsub", ["sns", "sqs", "googlepubsub", "x-internal"]],
      ["ros2,pulsar", ["pulsar", "ros2", "x-internal"]],
      ["kafka,rabbitmq,kafka-ssl", ["kafka", "rabbitmq", "kafka-ssl", "x-internal"]],
      ["confluent", ["x-internal"]],
    ])("allowed-bindings %p accepts exactly the matching probes and always the extensions", async (value, expected) => {
      expect(await allowedUnder(value)).toEqual(expected);
    });

    test("accepts an array, entries carrying commas, mixed case and spaces, and ignores unusable entries", async () => {
      const expected = ["kafka", "amqp", "x-internal"];
      expect(await allowedUnder(["kafka", "amqp"])).toEqual(expected);
      expect(await allowedUnder(["kafka,amqp"])).toEqual(expected);
      expect(await allowedUnder([1, null, " KAFKA ", { value: "mqtt" }, "Amqp"])).toEqual(expected);
      expect(await allowedUnder(" kafka , , amqp ,")).toEqual(expected);
      expect(await allowedUnder("kafka,amqp,kafka,AMQP")).toEqual(expected);
      expect(await allowedUnder("kafka streams, *, kafka*, $ref, ámqp, -mqtt, .ws, kafka, amqp")).toEqual(expected);
    });

    test("lower-cases entries, so a capitalised entry allows the lowercase key and a capitalised key is never allowed", async () => {
      expect(await allowedUnder("Kafka")).toEqual(["kafka", "x-internal"]);
      expect(await allowedUnder("KAFKA, Kafka, kafka")).toEqual(["kafka", "x-internal"]);
    });

    test("reports a key outside a configured list with the same message as under the shipped list", async () => {
      const configured = await withOptions("kafka");
      const results = only(await configured.run(matrixDoc(["kafka", "amqp", "x-amqp"])));
      expect(results.map((r) => r.message)).toEqual([message("Message", "amqp")]);
    });

    test("allows a protocol outside the AsyncAPI specification once it is configured", async () => {
      const configured = await withOptions("kafka,confluent,rabbitmq,kafka-ssl,kafka_ssl,kafka.v2");
      const results = pathsOf(await configured.run(failExample));
      ["confluent", "rabbitmq", "kafka-ssl", "kafka_ssl", "kafka.v2"].forEach((key) => {
        expect(results.filter((p) => p.endsWith(`.${key}`))).toEqual([]);
      });
      expect(results.filter((p) => p.endsWith(".kafak"))).toEqual([`${P}.publish.traits.1.bindings.kafak`]);
    });

    test("a document compliant with the shipped list fails once the list is narrowed to kafka", async () => {
      const configured = await withOptions("kafka");
      expect(pathsOf(await configured.run(okExample))).toEqual(
        [
          "servers.rabbitProd.bindings.amqp",
          "servers.rabbitProd.bindings.amqp1",
          "servers.mqttEdge.bindings.mqtt",
          "servers.mqttEdge.bindings.mqtt5",
          "servers.wsGateway.bindings.ws",
          "servers.wsGateway.bindings.http",
          "servers.natsCore.bindings.nats",
          "servers.ibmQueue.bindings.ibmmq",
          "servers.solaceCloud.bindings.solace",
          "servers.pulsarCluster.bindings.pulsar",
          "channels.harborline/telemetry/{craneId}.bindings.ws",
          "channels.harborline/telemetry/{craneId}.bindings.mqtt",
          "channels.harborline/telemetry/{craneId}.subscribe.bindings.mqtt",
          "channels.harborline/telemetry/{craneId}.subscribe.message.bindings.mqtt",
          "channels.harborline/telemetry/{craneId}.subscribe.message.traits.1.0.bindings.mqtt5",
          "channels.harborline.amqp.invoices.bindings.amqp",
          "channels.harborline.amqp.invoices.subscribe.bindings.amqp",
          "channels.harborline.amqp.invoices.subscribe.message.bindings.amqp",
          "channels.harborline.cloud.notifications.bindings.sns",
          "channels.harborline.cloud.notifications.bindings.sqs",
          "channels.harborline.cloud.notifications.bindings.googlepubsub",
          "channels.harborline.cloud.notifications.publish.bindings.sns",
          "channels.harborline.cloud.notifications.publish.bindings.sqs",
          "channels.harborline.cloud.notifications.publish.bindings.http",
          "channels.harborline.cloud.notifications.publish.bindings.anypointmq",
          "channels.harborline.cloud.notifications.publish.bindings.jms",
          "channels.harborline.cloud.notifications.publish.bindings.stomp",
          "channels.harborline.cloud.notifications.publish.bindings.redis",
          "channels.harborline.cloud.notifications.publish.bindings.mercure",
          "components.messages.notificationSent.bindings.sns",
          "components.messages.notificationSent.bindings.sqs",
          "components.messages.gateEvents.oneOf.1.bindings.amqp",
          "components.operationBindings.durableConsumer.amqp",
          "components.messageBindings.partitionKey.ros2",
        ].sort()
      );
    });

    test("a failing document passes once its lowercase keys are allowed, except the capitalised ones", async () => {
      const configured = await withOptions(
        "kafka, amqp, mqtt, ws, http, sqs, sns, confluent, rabbitmq, kafka-ssl, bindingVersion, kafak, websocket, amqps, ibm-mq, pubsub, https, websockets, mqtts, kafka.v2, kinesis, eventbridge, servicebus, grpc, sse, schemaRegistryUrl, kafka_ssl, rabbit, groupId"
      );
      expect(pathsOf(await configured.run(failExample))).toEqual(
        [
          "servers.mqttEdge.bindings.MQTT5",
          `${P}.publish.bindings.bindingVersion`,
          `${P}.publish.message.bindings.Kafka`,
          "components.messageTraits.commonHeaders.bindings.X-internal",
          "components.serverBindings.registry.schemaRegistryUrl",
          "components.messageBindings.keyed.groupId",
        ].sort()
      );
    });

    test.each([[""], ["   "], [","], [" , ;"], ["*"], ["kafka streams"], ["Ámqp"], ["-kafka"], [null], [undefined], [0], [7], [true], [false], [{}], [[]], [[""]], [[null, 3]], [{ value: "kafka" }]])(
      "falls back to the shipped list when allowed-bindings is %p",
      async (value) => {
        const configured = await withOptions(value);
        expect(pathsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
        expect(pathsOf(await configured.run(okExample))).toEqual([]);
      }
    );
  });
});
