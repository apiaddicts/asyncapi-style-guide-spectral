const { Spectral } = require("@stoplight/spectral-core");
const { casing } = require("@stoplight/spectral-functions");
const { migrateRuleset } = require("@stoplight/spectral-ruleset-migrator");
const fs = require("fs");
const path = require("path");

const AsyncFunction = (async () => {}).constructor;
const rulesetFile = path.resolve(__dirname, "../../asa-spectral.yaml");

/**
 * Creates a Spectral linter instance configured for a single rule.
 *
 * @param {string} rule - The rule name (e.g., 'asa:AAR001')
 * @param {object} [opts] - Optional overrides
 * @returns {Promise<Spectral>} Configured Spectral linter
 */
async function linterForRule(rule, opts = {}) {
  const linter = new Spectral();

  const m = {};
  const paths = [path.dirname(rulesetFile), __dirname, path.resolve(__dirname, "../..")];

  await AsyncFunction(
    "module, require",
    await migrateRuleset(rulesetFile, {
      format: "commonjs",
      fs,
    })
  )(m, (text) => require(require.resolve(text, { paths })));

  const ruleset = m.exports;
  delete ruleset.extends;

  // Keep only the specified rule
  Object.keys(ruleset.rules).forEach((key) => {
    if (key !== rule) {
      delete ruleset.rules[key];
    }
  });

  // Apply option overrides if provided
  if (opts.functionOptions && ruleset.rules[rule] && ruleset.rules[rule].then) {
    ruleset.rules[rule].then.functionOptions = {
      ...ruleset.rules[rule].then.functionOptions,
      ...opts.functionOptions,
    };
  }

  linter.setRuleset(ruleset);
  return linter;
}

const CASING_TYPES = ["camel", "pascal", "kebab", "snake"];

const CASING_VALUES = [
  "a",
  "A",
  "user",
  "User",
  "USER",
  "usersignedup",
  "userSignedUp",
  "userSignedUpV2",
  "userId",
  "userID",
  "user2fa",
  "user2Fa",
  "user2FA",
  "UserSignedUp",
  "User2Fa",
  "UserID",
  "user-signed-up",
  "user-2fa",
  "user2-fa",
  "user--signed",
  "user-Signed",
  "user_signed_up",
  "user_2fa",
  "user__signed",
  "USER_SIGNED_UP",
  "USER_2FA",
  "USER-SIGNED-UP",
  "USER-2FA",
  "User_Signed_Up",
  "User-Signed-Up",
  "user_signed-up",
  "-user",
  "user-",
  "_user",
  "user_",
  "2user",
  "user signed up",
  " user",
  "user ",
  "user.signed.up",
  "user/signed",
  "user:signed",
  "usér",
  "ÜserSigned",
  "user$",
  "",
];

/**
 * @param {string} value - The value to check
 * @param {string} type - The casing type (e.g., 'camel')
 * @returns {boolean} Whether the value follows the casing type
 */
const isValidCasing = (value, type) => value !== "" && casing(value, { type }, {}) === undefined;

const LONGEST_SUBTYPE = `${"a".repeat(122)}+json`;

const CONTENT_TYPE_CASES = {
  allowed: [
    "application/json",
    "APPLICATION/JSON",
    "Application/Json",
    "application/json; charset=utf-8",
    "application/json;charset=UTF-8",
    "application/json ; charset=utf-8",
    "application/json\t;\tcharset=utf-8",
    "application/json;",
    "application/json;;",
    'application/json; charset="utf-8"',
    'application/json; profile="https://schemas.acme.io/orders; v=1"',
    'application/json; profile="a\\"b"',
    "application/json; charset=utf-8; version=2",
    "application/cloudevents+json",
    "application/cloudevents-batch+json",
    "application/vnd.api+json",
    "application/problem+json",
    "application/schema+json",
    "application/vnd.acme.orders.v1+json",
    "application/vnd.aai.asyncapi+json;version=2.6.0",
    "application/xml",
    "application/atom+xml",
    "application/soap+xml; charset=utf-8",
    "text/xml",
    "text/plain",
    "text/plain; charset=us-ascii",
    "text/csv",
    "Text/CSV; header=present",
    "application/octet-stream",
    "application/avro",
    "application/vnd.apache.avro+json",
    "application/vnd.acme.payment.v1+avro",
    "application/json+avro",
    "application/protobuf",
    "application/x-protobuf",
    "application/cbor",
    "application/yaml",
    `application/${LONGEST_SUBTYPE}`,
  ],
  notAllowed: [
    "text/json",
    "application/jsn",
    "application/x-json",
    "application/json-seq",
    "application/jsonl",
    "application/x-ndjson",
    "application/vnd.apache.avro",
    "application/vnd.apache.avro;version=1.9.0",
    "application/x-www-form-urlencoded",
    "multipart/form-data; boundary=xyz",
    "text/html",
    "image/png",
    "application/pdf",
    "avro/binary",
    "application/avro+binary",
    "application/xml-dtd",
    "application/yml",
    "x-application/json",
    "json/application",
    "application/vnd.google.protobuf",
    "application/x-msgpack",
  ],
  malformed: [
    "",
    " ",
    "json",
    "application",
    "application/",
    "/json",
    "application//json",
    "application/json/extra",
    "application json",
    " application/json",
    "application/json ",
    "application/json\n",
    "application/*",
    "*/*",
    "application/*+json",
    "application/+json",
    "application/.json",
    "-application/json",
    "application/js on",
    "application/{json}",
    "application/json,text/plain",
    "application/json; charset",
    "application/json; charset=",
    "application/json; =utf-8",
    'application/json; charset="utf-8',
    "application/json; charset=utf 8",
    "aplicación/json",
    "application/jsön",
    `application/a${LONGEST_SUBTYPE}`,
    `${"a".repeat(128)}/json`,
  ],
};

const NON_STRING_CONTENT_TYPES = [0, 12, 1.5, true, false, {}, { type: "application/json" }, [], ["application/json"]];

const BINDING_KEY_CASES = {
  allowed: [
    "http",
    "ws",
    "kafka",
    "anypointmq",
    "amqp",
    "amqp1",
    "mqtt",
    "mqtt5",
    "nats",
    "jms",
    "sns",
    "solace",
    "sqs",
    "stomp",
    "redis",
    "mercure",
    "ibmmq",
    "googlepubsub",
    "pulsar",
    "ros2",
  ],
  notAllowed: [
    "Kafka",
    "KAFKA",
    "Http",
    "WS",
    "kafak",
    "kafka-ssl",
    "kafka_ssl",
    "kafka-secure",
    "kafka.v2",
    "confluent",
    "rabbitmq",
    "amqps",
    "amqp091",
    "amqp-1.0",
    "amqp10",
    "mqtts",
    "mqtt311",
    "secure-mqtt",
    "websocket",
    "websockets",
    "wss",
    "https",
    "http2",
    "grpc",
    "sse",
    "pubsub",
    "google-pubsub",
    "gcp-pubsub",
    "kinesis",
    "eventbridge",
    "eventhubs",
    "servicebus",
    "activemq",
    "artemis",
    "ibm-mq",
    "solace-pubsub",
    "jetstream",
    "redis-streams",
    "zeromq",
    "rocketmq",
    "bindingVersion",
    "schemaRegistryUrl",
    "groupId",
    "is",
    "queue",
    "exchange",
    "X-internal",
    "x_internal",
    "ext-kafka",
    " kafka",
    "kafka ",
    "ka fka",
    "kafka\n",
    "",
    "0",
    "2",
    "ámqp",
  ],
  extensions: ["x-", "x-internal", "x-kafka", "x-Kafka", "x-confluent-cloud", "x-amqp.exchange", "x-team_owner", "x- spaced"],
};

const awsStatement = (action) => ({ effect: "Allow", principal: "arn:aws:iam::123456789012:root", action });

const REQUIRED_BINDING_CASES = {
  complete: {
    server: {
      jms: {
        jmsConnectionFactory: "org.apache.activemq.ActiveMQConnectionFactory",
        properties: [{ name: "disableTimeStampsByDefault", value: false }],
        clientID: "orders-gateway",
        bindingVersion: "0.0.1",
      },
    },
    channel: {
      amqp: { is: "routingKey", exchange: { name: "orders", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" },
      googlepubsub: { schemaSettings: { encoding: "json", name: "projects/acme/schemas/order-created" }, messageRetentionDuration: "86400s", bindingVersion: "0.2.0" },
      ibmmq: { destinationType: "queue", queue: { objectName: "ORDERS.IN", exclusive: false }, bindingVersion: "0.1.0" },
      pulsar: { namespace: "orders", persistence: "persistent", compaction: 0, bindingVersion: "0.1.0" },
      sns: { name: "orders-events", ordering: { type: "FIFO", contentBasedDeduplication: false }, policy: { statements: [awsStatement("SNS:Publish")] } },
      sqs: {
        queue: {
          name: "orders",
          fifoQueue: false,
          redrivePolicy: { deadLetterQueue: { name: "orders-dlq" }, maxReceiveCount: 3 },
          policy: { statements: [awsStatement("SQS:SendMessage")] },
        },
        deadLetterQueue: {
          name: "orders-dlq",
          fifoQueue: false,
          redrivePolicy: { deadLetterQueue: { arn: "arn:aws:sqs:eu-west-1:123456789012:orders-parking" } },
          policy: { statements: [awsStatement("SQS:ReceiveMessage")] },
        },
        bindingVersion: "0.2.0",
      },
    },
    operation: {
      ros2: { role: "publisher", node: "/fleet/dispatcher", bindingVersion: "0.1.0" },
      sns: {
        consumers: [
          {
            protocol: "sqs",
            endpoint: { name: "orders" },
            rawMessageDelivery: false,
            redrivePolicy: { deadLetterQueue: { arn: "arn:aws:sqs:eu-west-1:123456789012:orders-dlq" } },
          },
        ],
        bindingVersion: "0.1.0",
      },
      sqs: {
        queues: [{ name: "orders", redrivePolicy: { deadLetterQueue: { name: "orders-dlq" } }, policy: { statements: [awsStatement("SQS:ReceiveMessage")] } }],
        bindingVersion: "0.2.0",
      },
    },
    message: {
      googlepubsub: { schema: { name: "projects/acme/schemas/order-created" }, orderingKey: "orderId", bindingVersion: "0.2.0" },
    },
  },
  defaults: [
    ["server", "jms", ["jmsConnectionFactory"]],
    ["server", "jms", ["properties", 0, "name"]],
    ["server", "jms", ["properties", 0, "value"]],
    ["channel", "amqp", ["exchange"], ["exchange", "queue"]],
    ["channel", "googlepubsub", ["schemaSettings"]],
    ["channel", "googlepubsub", ["schemaSettings", "encoding"]],
    ["channel", "googlepubsub", ["schemaSettings", "name"]],
    ["channel", "ibmmq", ["queue", "objectName"]],
    ["channel", "pulsar", ["namespace"]],
    ["channel", "pulsar", ["persistence"]],
    ["channel", "sns", ["name"]],
    ["channel", "sns", ["ordering", "type"]],
    ["channel", "sns", ["policy", "statements"]],
    ["channel", "sns", ["policy", "statements", 0, "effect"]],
    ["channel", "sns", ["policy", "statements", 0, "principal"]],
    ["channel", "sns", ["policy", "statements", 0, "action"]],
    ["channel", "sqs", ["queue"]],
    ["channel", "sqs", ["queue", "name"]],
    ["channel", "sqs", ["queue", "fifoQueue"]],
    ["channel", "sqs", ["queue", "redrivePolicy", "deadLetterQueue"]],
    ["channel", "sqs", ["queue", "policy", "statements"]],
    ["channel", "sqs", ["queue", "policy", "statements", 0, "effect"]],
    ["channel", "sqs", ["queue", "policy", "statements", 0, "principal"]],
    ["channel", "sqs", ["queue", "policy", "statements", 0, "action"]],
    ["channel", "sqs", ["deadLetterQueue", "name"]],
    ["channel", "sqs", ["deadLetterQueue", "fifoQueue"]],
    ["channel", "sqs", ["deadLetterQueue", "redrivePolicy", "deadLetterQueue"]],
    ["channel", "sqs", ["deadLetterQueue", "policy", "statements"]],
    ["channel", "sqs", ["deadLetterQueue", "policy", "statements", 0, "effect"]],
    ["channel", "sqs", ["deadLetterQueue", "policy", "statements", 0, "principal"]],
    ["channel", "sqs", ["deadLetterQueue", "policy", "statements", 0, "action"]],
    ["operation", "ros2", ["role"]],
    ["operation", "ros2", ["node"]],
    ["operation", "sns", ["consumers"]],
    ["operation", "sns", ["consumers", 0, "protocol"]],
    ["operation", "sns", ["consumers", 0, "endpoint"]],
    ["operation", "sns", ["consumers", 0, "rawMessageDelivery"]],
    ["operation", "sns", ["consumers", 0, "redrivePolicy", "deadLetterQueue"]],
    ["operation", "sqs", ["queues"]],
    ["operation", "sqs", ["queues", 0, "name"]],
    ["operation", "sqs", ["queues", 0, "redrivePolicy", "deadLetterQueue"]],
    ["operation", "sqs", ["queues", 0, "policy", "statements"]],
    ["operation", "sqs", ["queues", 0, "policy", "statements", 0, "effect"]],
    ["operation", "sqs", ["queues", 0, "policy", "statements", 0, "principal"]],
    ["operation", "sqs", ["queues", 0, "policy", "statements", 0, "action"]],
    ["message", "googlepubsub", ["schema", "name"]],
  ],
  optionalParents: [
    ["server", "jms", ["properties"]],
    ["channel", "ibmmq", ["queue"]],
    ["channel", "sns", ["ordering"]],
    ["channel", "sns", ["policy"]],
    ["channel", "sqs", ["queue", "redrivePolicy"]],
    ["channel", "sqs", ["queue", "policy"]],
    ["channel", "sqs", ["deadLetterQueue"]],
    ["operation", "sns", ["consumers", 0, "redrivePolicy"]],
    ["operation", "sqs", ["queues", 0, "redrivePolicy"]],
    ["operation", "sqs", ["queues", 0, "policy"]],
    ["message", "googlepubsub", ["schema"]],
  ],
  presentValues: [false, true, 0, -1, 2.5, "x", " padded ", "null", "false", "0", [], [""], [null], {}, { $ref: "#/components/schemas/Anything" }, { $ref: "./shared.yaml#/x" }],
  missingValues: [null, "", " ", "   ", "\t", "\n", " \t\n "],
  probe: {
    topic: "orders.cdc.v1",
    partitions: 12,
    topicConfiguration: { "retention.ms": 604800000, "cleanup.policy": ["delete"], "x-owner": "platform" },
    bindingVersion: "0.5.0",
  },
  usableMissing: [
    ["channel.kafka.replicas", "'replicas'"],
    ["  channel.kafka.replicas  ", "'replicas'"],
    ["CHANNEL.KAFKA.replicas", "'replicas'"],
    ["Channel.Kafka.replicas", "'replicas'"],
    ["channel . kafka . replicas", "'replicas'"],
    ["*.kafka.replicas", "'replicas'"],
    ["channel.*.replicas", "'replicas'"],
    ["*.*.replicas", "'replicas'"],
    ["[channel].[kafka].replicas", "'replicas'"],
    ["channel.kafka.[replicas]", "'replicas'"],
    ["channel.kafka[replicas]", "'replicas'"],
    ["channel.kafka.topicConfiguration[max.message.bytes]", "'topicConfiguration[max.message.bytes]'"],
    ["channel.kafka.topicConfiguration.[max.message.bytes]", "'topicConfiguration[max.message.bytes]'"],
    ["channel.kafka.topicConfiguration. [max.message.bytes] ", "'topicConfiguration[max.message.bytes]'"],
    ["channel.kafka.[topicConfiguration][ max.message.bytes ]", "'topicConfiguration[max.message.bytes]'"],
    ["channel.kafka.topicConfiguration.segment", "'topicConfiguration.segment'"],
    ["channel.kafka.replicas|clusterId", "'replicas' or 'clusterId'"],
    ["channel.kafka.replicas|replicas", "'replicas'"],
    ["channel.kafka.replicas|clusterId|tier", "'replicas', 'clusterId' or 'tier'"],
    ["channel.kafka.topicConfiguration[max.message.bytes]|[delete.retention.ms]", "'topicConfiguration[max.message.bytes]' or 'topicConfiguration[delete.retention.ms]'"],
    ["channel.kafka.topicConfiguration.[segment.ms]|segment", "'topicConfiguration[segment.ms]' or 'topicConfiguration.segment'"],
    ["channel.kafka.Topic", "'Topic'"],
    ["channel.kafka.TOPIC", "'TOPIC'"],
    ["channel.kafka.x-owner", "'x-owner'"],
    ["channel.kafka.0", "'0'"],
  ],
  usableSatisfied: [
    "channel.kafka.topic",
    "channel.kafka.partitions",
    "channel.kafka.bindingVersion",
    "channel.kafka.topicConfiguration",
    "channel.kafka.topicConfiguration[retention.ms]",
    "channel.kafka.topicConfiguration.[cleanup.policy]",
    "channel.kafka.topicConfiguration.x-owner",
    "channel.kafka.replicas|partitions",
    "channel.kafka.topicConfiguration[max.message.bytes]|[retention.ms]",
    "channel.kafka.topicConfiguration.retention.ms",
    "channel.kafka.topicConfiguration.cleanup.policy",
    "channel.kafka.schemaSettings.name",
    "channel.kafka.topic.name",
    "channel.kafka.partitions.count",
    "channel.kafka.topicConfiguration[cleanup.policy].mode",
    "channel.amqp.exchange",
    "server.kafka.replicas",
    "operation.kafka.replicas",
    "message.kafka.replicas",
    "channel.kafka-ssl.replicas",
    "channel.[kafka.v2].replicas",
  ],
  unusable: [
    "",
    " ",
    "kafka",
    "replicas",
    "channel.kafka",
    "channel.kafka.",
    ".channel.kafka.replicas",
    "channel..kafka.replicas",
    "channel.kafka..replicas",
    "channels.kafka.replicas",
    "binding.kafka.replicas",
    "schema.kafka.replicas",
    "servers.kafka.replicas",
    "channel.x-kafka.replicas",
    "channel.X-kafka.replicas",
    "channel.-kafka.replicas",
    "channel.ka*fka.replicas",
    "channel.ámqp.replicas",
    "channel.kafka streams.replicas",
    "channel.kafka.topic name",
    "channel.kafka.[replicas",
    "channel.kafka.replicas]",
    "channel.kafka.[]",
    "channel.kafka.[ ]",
    "channel.kafka.[a b]",
    "channel.kafka.[a]b",
    "channel.kafka.[a[b]]",
    "channel.kafka.replicas|",
    "channel.kafka.|replicas",
    "channel.kafka.replicas||clusterId",
    "channel.kafka.topicConfiguration|replicas.segment",
    "channel|server.kafka.replicas",
    "channel.kafka|amqp.replicas",
    "*channel.kafka.replicas",
    "**.kafka.replicas",
    "channel.**.replicas",
    "channel.kafka.$ref",
    "channel.kafka.topicConfiguration.$ref",
    "channel.kafka.replicas|$ref",
  ],
  fallbackValues: [
    undefined,
    null,
    "",
    "   ",
    ",",
    " , , ",
    "kafka",
    "channel.kafka",
    "channels.kafka.replicas",
    "channel.x-kafka.replicas",
    "channel.kafka.[replicas",
    0,
    7,
    true,
    false,
    {},
    [],
    [""],
    [null, 3],
    ["channel.kafka"],
    { value: "channel.kafka.replicas" },
  ],
};

const BINDING_VERSION_CASES = {
  valid: ["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0", "0.0.1", "0.0.0", "1.0.0", "2.11.4", "10.20.30", "00.04.00", "2026.10.12", "999999999.0.1"],
  invalid: [
    "latest",
    "LATEST",
    "Latest",
    "0.4",
    "0",
    "1",
    "1.0",
    "v0.4.0",
    "V1.0.0",
    "0.4.0-beta",
    "0.4.0-rc.1",
    "0.4.0+build.7",
    "0.4.0.1",
    "1.0.0.0",
    "0.4.x",
    "0.4.*",
    "x.y.z",
    "~0.4.0",
    "^0.4.0",
    ">=0.4.0",
    "0.4.0 ",
    " 0.4.0",
    "0. 4.0",
    "0.4.0\n",
    "\t0.4.0",
    "0,4,0",
    "0-4-0",
    "0_4_0",
    "0..4",
    ".4.0",
    "0.4.",
    "-1.0.0",
    "+1.0.0",
    "0x1.0.0",
    "1e3.0.0",
    "٠.٤.٠",
    "０.４.０",
    "kafka-0.4.0",
    "0.4.0/kafka",
    "2026-01-15",
    "null",
    "true",
    "",
    " ",
  ],
  nonString: [0.4, 1, 0, -1, 1.5, true, false, [], ["0.4.0"], {}, { major: 0, minor: 4, patch: 0 }, { $ref: "#/components/x-versions/kafka" }],
  absent: [undefined, null],
};

const MESSAGE_EXAMPLE_CASES = {
  payloadSamples: [
    { payload: { orderId: "ord-1042", total: 129.9 } },
    { name: "orderPlaced", summary: "A paid order.", headers: { traceId: "4bf92f35" }, payload: { orderId: "ord-1042" } },
    { payload: null },
    { name: "tombstone", payload: null },
    { payload: {} },
    { payload: [] },
    { payload: [{ sku: "SKU-1", quantity: 2 }] },
    { payload: "" },
    { payload: "ord-1042" },
    { payload: "2026-01-15" },
    { payload: 0 },
    { payload: 42.5 },
    { payload: false },
    { payload: { $ref: "#/components/schemas/Order" } },
    { headers: null, payload: { orderId: "ord-1042" } },
    { headers: {}, payload: { orderId: "ord-1042" } },
    { "x-source": "replay", payload: { orderId: "ord-1042" } },
  ],
  headerSamples: [
    { headers: { traceId: "4bf92f35" } },
    { name: "heartbeat", summary: "Liveness probe.", headers: { "x-node": "edge-7", sequence: 42 } },
    { headers: { traceId: null } },
    { headers: { $ref: "#/components/schemas/TraceHeaders" } },
  ],
  nonSamples: [
    null,
    0,
    1,
    "",
    "orderPlaced",
    true,
    false,
    [],
    [{ payload: { orderId: "ord-1042" } }],
    {},
    { name: "orderPlaced" },
    { summary: "A paid order." },
    { name: "orderPlaced", summary: "A paid order." },
    { headers: {} },
    { headers: null },
    { headers: [] },
    { headers: [{ traceId: "4bf92f35" }] },
    { headers: "traceId=4bf92f35" },
    { headers: 42 },
    { Payload: { orderId: "ord-1042" } },
    { PAYLOAD: { orderId: "ord-1042" } },
    { payloads: [{ orderId: "ord-1042" }] },
    { "x-payload": { orderId: "ord-1042" } },
    { value: { orderId: "ord-1042" } },
    { data: { orderId: "ord-1042" } },
    { body: { orderId: "ord-1042" } },
    { example: { orderId: "ord-1042" } },
  ],
  emptyValues: [null, []],
  notArrayValues: [{}, { payload: { orderId: "ord-1042" } }, { 0: { payload: {} } }, "orderPlaced", "", 0, 1, true, false],
};

const exampleTrait = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const EXTERNAL_TRAIT = { $ref: "./shared/message-traits.yaml#/components/messageTraits/kafkaEnvelope" };
const SAMPLE_EXAMPLES = [{ name: "orderPlaced", payload: { orderId: "ord-1042" } }];
const HEADER_EXAMPLES = [{ headers: { traceId: "4bf92f35" } }];

const EXAMPLE_TRAIT_COMPONENTS = {
  messageTraits: {
    withExamples: { examples: [{ name: "fromTrait", payload: { orderId: "ord-7" } }] },
    emptyExamples: { examples: [] },
    nullExamples: { examples: null },
    headerExamples: { examples: HEADER_EXAMPLES },
    noExamples: { contentType: "application/json", headers: { type: "object", properties: { traceId: { type: "string" } } } },
    chained: exampleTrait("withExamples"),
    chainedTwice: exampleTrait("chained"),
    refExamples: { examples: { $ref: "#/components/x-example-sets/orders" } },
    refItems: { examples: [{ $ref: "#/components/x-examples/order" }] },
    cycleA: exampleTrait("cycleB"),
    cycleB: exampleTrait("cycleA"),
    external: EXTERNAL_TRAIT,
  },
  "x-example-sets": { orders: SAMPLE_EXAMPLES, empty: [], headers: HEADER_EXAMPLES },
  "x-examples": { order: { payload: { orderId: "ord-9" } }, header: { headers: { traceId: "4bf92f35" } }, blank: {} },
  "x-trait-lists": { withExamples: [exampleTrait("withExamples")], emptyExamples: [exampleTrait("emptyExamples")] },
};

const EXAMPLE_TRAIT_MERGE_CASES = [
  ["no examples and no traits", {}, ["", "missing"], ["", "missing"]],
  ["own examples only", { examples: SAMPLE_EXAMPLES }, null, null],
  ["an empty traits list", { traits: [] }, ["", "missing"], ["", "missing"]],
  ["a trait with examples", { traits: [exampleTrait("withExamples")] }, null, null],
  ["a trait without examples", { traits: [exampleTrait("noExamples")] }, ["", "missing"], ["", "missing"]],
  ["a trait with an empty examples array", { traits: [exampleTrait("emptyExamples")] }, ["traits.0", "empty"], ["traits.0", "empty"]],
  ["a trait with null examples", { traits: [exampleTrait("nullExamples")] }, ["traits.0", "empty"], ["traits.0", "empty"]],
  ["a trait with header-only examples", { traits: [exampleTrait("headerExamples")] }, ["traits.0", "noSample"], ["traits.0", "noSample"]],
  ["own examples and a trait with an empty array", { examples: SAMPLE_EXAMPLES, traits: [exampleTrait("emptyExamples")] }, ["traits.0", "empty"], null],
  ["own examples and a trait with null examples", { examples: SAMPLE_EXAMPLES, traits: [exampleTrait("nullExamples")] }, ["traits.0", "empty"], null],
  ["own examples and a trait with header-only examples", { examples: SAMPLE_EXAMPLES, traits: [exampleTrait("headerExamples")] }, ["traits.0", "noSample"], null],
  ["own examples and a trait without examples", { examples: SAMPLE_EXAMPLES, traits: [exampleTrait("noExamples")] }, null, null],
  ["an own empty array and a trait with examples", { examples: [], traits: [exampleTrait("withExamples")] }, null, ["examples", "empty"]],
  ["own null examples and a trait with examples", { examples: null, traits: [exampleTrait("withExamples")] }, null, ["examples", "empty"]],
  ["own header-only examples and a trait with examples", { examples: HEADER_EXAMPLES, traits: [exampleTrait("withExamples")] }, null, ["examples", "noSample"]],
  ["an own non-array value and a trait with examples", { examples: { payload: { orderId: "ord-1" } }, traits: [exampleTrait("withExamples")] }, null, ["examples", "notArray"]],
  ["two traits, the last one empty", { traits: [exampleTrait("withExamples"), exampleTrait("emptyExamples")] }, ["traits.1", "empty"], ["traits.1", "empty"]],
  ["two traits, the last one with examples", { traits: [exampleTrait("emptyExamples"), exampleTrait("withExamples")] }, null, null],
  ["two traits, the last one null", { traits: [exampleTrait("withExamples"), exampleTrait("nullExamples")] }, ["traits.1", "empty"], ["traits.1", "empty"]],
  ["two traits, the last one without examples", { traits: [exampleTrait("emptyExamples"), exampleTrait("noExamples")] }, ["traits.0", "empty"], ["traits.0", "empty"]],
  ["an inline trait with examples", { traits: [{ examples: SAMPLE_EXAMPLES }] }, null, null],
  ["an inline trait with a non-array value", { traits: [{ examples: { payload: { orderId: "ord-1" } } }] }, ["traits.0", "notArray"], ["traits.0", "notArray"]],
  ["a tuple trait with examples", { traits: [[exampleTrait("withExamples"), { environment: "prod" }]] }, null, null],
  ["a tuple trait with an empty array", { traits: [[{ examples: [] }, {}]] }, ["traits.0", "empty"], ["traits.0", "empty"]],
  ["a chained trait reference", { traits: [exampleTrait("chainedTwice")] }, null, null],
  ["a trait whose examples are a local reference", { traits: [exampleTrait("refExamples")] }, null, null],
  ["a trait whose example items are local references", { traits: [exampleTrait("refItems")] }, null, null],
  ["a dangling trait reference", { traits: [exampleTrait("missing")] }, ["", "missing"], ["", "missing"]],
  ["a dangling and a valid trait reference", { traits: [exampleTrait("missing"), exampleTrait("withExamples")] }, null, null],
  ["a cyclic trait reference", { traits: [exampleTrait("cycleA")] }, ["", "missing"], ["", "missing"]],
  ["non-object trait entries", { traits: [null, 42, "kafkaEnvelope", [], [null]] }, ["", "missing"], ["", "missing"]],
  ["a non-array traits value", { traits: exampleTrait("withExamples") }, ["", "missing"], ["", "missing"]],
  ["a traits list behind a local reference", { traits: { $ref: "#/components/x-trait-lists/withExamples" } }, null, null],
  ["a traits list behind a local reference that empties the examples", { traits: { $ref: "#/components/x-trait-lists/emptyExamples" } }, ["traits", "empty", 0], ["traits", "empty", 0]],
  ["an external trait", { traits: [EXTERNAL_TRAIT] }, null, null],
  ["a local trait that points to an external one", { traits: [exampleTrait("external")] }, null, null],
  ["own examples and an external trait", { examples: SAMPLE_EXAMPLES, traits: [EXTERNAL_TRAIT] }, null, null],
  ["an own empty array and an external trait", { examples: [], traits: [EXTERNAL_TRAIT] }, null, ["examples", "empty"]],
  ["an external trait followed by a trait with examples", { traits: [EXTERNAL_TRAIT, exampleTrait("withExamples")] }, null, null],
  ["an external trait followed by an empty trait", { traits: [EXTERNAL_TRAIT, exampleTrait("emptyExamples")] }, ["traits.1", "empty"], ["traits.1", "empty"]],
  ["an empty trait followed by an external trait", { traits: [exampleTrait("emptyExamples"), EXTERNAL_TRAIT] }, null, null],
  ["an external traits list", { traits: { $ref: "./shared/message-traits.yaml#/lists/kafka" } }, null, null],
  ["an own empty array and an external traits list", { examples: [], traits: { $ref: "./shared/message-traits.yaml#/lists/kafka" } }, null, ["examples", "empty"]],
];

const root = (text) => [[], text];
const at = (path, text) => [path, text];
const fail = (value, ...findings) => [value, findings];

const EXAMPLE_SCHEMA_COMPONENTS = {
  schemas: {
    Money: {
      type: "object",
      required: ["amount", "currency"],
      properties: { amount: { type: "number" }, currency: { type: "string", pattern: "^[A-Z]{3}$" } },
    },
    MoneyAlias: { $ref: "#/components/schemas/Money" },
    "money/v2": { type: "object", properties: { amount: { type: "number" } } },
    "Money Legacy": { type: "object", required: ["value"] },
    "tilde~name": { type: "boolean" },
    Tagged: { allOf: [{ type: "object", required: ["tag"] }] },
    Address: { type: "object", required: ["street", "city"], properties: { street: { type: "string" }, city: { type: "string" } } },
    Category: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" }, children: { type: "array", items: { $ref: "#/components/schemas/Category" } } },
    },
    CycleA: { $ref: "#/components/schemas/CycleB" },
    CycleB: { $ref: "#/components/schemas/CycleA" },
    LoopAllOf: { allOf: [{ $ref: "#/components/schemas/LoopAllOf" }] },
    AvroMoney: { type: "record", name: "Money", namespace: "io.acme.billing", fields: [{ name: "amount", type: "double" }, { name: "currency", type: "string" }] },
    AvroStatus: { type: "enum", name: "Status", symbols: ["OPEN", "CLOSED"] },
    AvroAlias: { $ref: "#/components/schemas/AvroMoney" },
  },
};

const EXAMPLE_JSON_SCHEMA_CASES = [
  ["type string", { type: "string" }, ["ord-1042", "", "2026-01-15"], [fail(42, root("must be string")), fail(null, root("must be string")), fail(true, root("must be string")), fail({ id: 1 }, root("must be string")), fail(["a"], root("must be string"))]],
  ["type integer", { type: "integer" }, [0, -3, 1.0, 9007199254740991], [fail(1.5, root("must be integer")), fail("1", root("must be integer")), fail(null, root("must be integer"))]],
  ["type number", { type: "number" }, [1.5, 0, -2, 1e21], [fail("1.5", root("must be number")), fail(true, root("must be number")), fail([1], root("must be number"))]],
  ["type boolean", { type: "boolean" }, [true, false], [fail("true", root("must be boolean")), fail(0, root("must be boolean"))]],
  ["type null", { type: "null" }, [null], [fail(0, root("must be null")), fail("null", root("must be null")), fail("", root("must be null")), fail({}, root("must be null"))]],
  ["type object", { type: "object" }, [{}, { id: "x" }], [fail([], root("must be object")), fail("{}", root("must be object")), fail(null, root("must be object"))]],
  ["type array", { type: "array" }, [[], [1, "a"]], [fail({}, root("must be array")), fail("[]", root("must be array"))]],
  ["nullable array-form type", { type: ["string", "null"] }, ["EUR", null], [fail(42, root("must be string or null")), fail({}, root("must be string or null"))]],
  ["nullable array-form type with null first", { type: ["null", "object"], required: ["id"] }, [null, { id: 1 }], [fail("x", root("must be null or object")), fail({}, root("must have required property 'id'"))]],
  ["nullable array-form property", { type: "object", properties: { couponCode: { type: ["string", "null"], maxLength: 8 } } }, [{ couponCode: null }, { couponCode: "SPRING" }], [fail({ couponCode: 10 }, at(["couponCode"], "must be string or null")), fail({ couponCode: "SPRING2026" }, at(["couponCode"], "must not have more than 8 characters"))]],
  ["multiple types", { type: ["integer", "string"] }, [1, "a"], [fail(1.5, root("must be integer or string")), fail(false, root("must be integer or string"))]],
  ["unknown type name", { type: "record", fields: [] }, [1, "x", null, {}], []],
  ["type list with an unknown name", { type: ["string", "date"] }, [1, null], []],
  ["non-string type", { type: 42 }, [1, "x"], []],
  ["empty type list", { type: [] }, [1, "x"], []],
  ["keywords of other types", { minLength: 3, minimum: 10, minItems: 2, required: ["id"] }, ["abc", 10, [1, 2], { id: 1 }, true, null], [fail("ab", root("must not have fewer than 3 characters")), fail(5, root("must be >= 10")), fail([1], root("must not have fewer than 2 items")), fail({}, root("must have required property 'id'"))]],
  ["nullable keyword outside OpenAPI", { type: "string", nullable: true }, ["x"], [fail(null, root("must be string"))]],
  ["enum", { enum: ["PLACED", "PAID"] }, ["PLACED", "PAID"], [fail("SHIPPED", root('must be one of: "PLACED", "PAID"')), fail(null, root('must be one of: "PLACED", "PAID"'))]],
  ["enum with null", { type: ["string", "null"], enum: ["EUR", "USD", null] }, ["EUR", null], [fail("GBP", root('must be one of: "EUR", "USD", null'))]],
  ["enum of objects and arrays", { enum: [{ code: 1, label: "a" }, [1, 2]] }, [{ label: "a", code: 1 }, [1, 2]], [fail({ code: 1 }, root('must be one of: {"code":1,"label":"a"}, [1,2]')), fail([2, 1], root('must be one of: {"code":1,"label":"a"}, [1,2]'))]],
  ["enum with more than ten values", { enum: ["AT", "BE", "DE", "DK", "ES", "FI", "FR", "IE", "IT", "NL", "PT", "SE"] }, ["ES", "SE"], [fail("GB", root('must be one of: "AT", "BE", "DE", "DK", "ES", "FI", "FR", "IE", "IT", "NL" and 2 more'))]],
  ["non-array enum", { enum: "PLACED" }, ["SHIPPED"], []],
  ["const", { const: "v1" }, ["v1"], [fail("v2", root('must equal "v1"')), fail(null, root('must equal "v1"'))]],
  ["const null", { const: null }, [null], [fail(0, root("must equal null")), fail("", root("must equal null"))]],
  ["const object", { const: { region: "eu", zones: [1, 2] } }, [{ zones: [1, 2], region: "eu" }], [fail({ region: "eu", zones: [2, 1] }, root('must equal {"region":"eu","zones":[1,2]}')), fail({ region: "eu" }, root('must equal {"region":"eu","zones":[1,2]}'))]],
  ["const with a long value", { const: "x".repeat(80) }, ["x".repeat(80)], [fail("y", root(`must equal "${"x".repeat(56)}...`))]],
  ["minimum", { type: "number", minimum: 0 }, [0, 0.5], [fail(-1, root("must be >= 0")), fail(-0.01, root("must be >= 0"))]],
  ["maximum", { type: "integer", maximum: 10 }, [10, -5], [fail(11, root("must be <= 10"))]],
  ["exclusiveMinimum number", { type: "number", exclusiveMinimum: 0 }, [0.01], [fail(0, root("must be > 0")), fail(-1, root("must be > 0"))]],
  ["exclusiveMaximum number", { type: "number", exclusiveMaximum: 100 }, [99.99], [fail(100, root("must be < 100"))]],
  ["draft-04 exclusiveMinimum flag", { type: "number", minimum: 0, exclusiveMinimum: true }, [0.5], [fail(0, root("must be > 0"))]],
  ["draft-04 exclusiveMaximum flag", { type: "number", maximum: 1, exclusiveMaximum: true }, [0.99], [fail(1, root("must be < 1"))]],
  ["draft-04 flags set to false", { type: "number", minimum: 0, maximum: 1, exclusiveMinimum: false, exclusiveMaximum: false }, [0, 1], [fail(1.5, root("must be <= 1")), fail(-1, root("must be >= 0"))]],
  ["multipleOf decimal", { type: "number", multipleOf: 0.01 }, [19.99, 0.3, 100, 0, -4.2], [fail(19.999, root("must be multiple of 0.01"))]],
  ["multipleOf integer", { type: "integer", multipleOf: 5 }, [0, 15, -10], [fail(7, root("must be multiple of 5"))]],
  ["number keywords with non-number values", { minimum: "0", maximum: null, multipleOf: 0, exclusiveMinimum: "1" }, [-5, 3.3], []],
  ["minLength", { type: "string", minLength: 2 }, ["ab", "ñu"], [fail("a", root("must not have fewer than 2 characters")), fail("", root("must not have fewer than 2 characters"))]],
  ["maxLength counting code points", { type: "string", maxLength: 3 }, ["EUR", "ñoñ", "😀😀😀"], [fail("EURO", root("must not have more than 3 characters")), fail("😀😀😀😀", root("must not have more than 3 characters"))]],
  ["pattern", { type: "string", pattern: "^[A-Z]{3}$" }, ["EUR"], [fail("eur", root('must match pattern "^[A-Z]{3}$"')), fail("EURO", root('must match pattern "^[A-Z]{3}$"'))]],
  ["unanchored pattern", { type: "string", pattern: "[0-9]" }, ["abc1"], [fail("abc", root('must match pattern "[0-9]"'))]],
  ["unicode property pattern", { type: "string", pattern: "^\\p{Lu}+$" }, ["ÁÉ", "ABC"], [fail("ab", root('must match pattern "^\\\\p{Lu}+$"'))]],
  ["pattern only valid without the unicode flag", { type: "string", pattern: "^[a-z0-9\\_]+$" }, ["order_1"], [fail("order-1", root('must match pattern "^[a-z0-9\\\\_]+$"'))]],
  ["invalid pattern", { type: "string", pattern: "([a-z" }, ["anything", ""], []],
  ["string keywords with non-number values", { maxLength: "3", minLength: null, pattern: 42 }, ["too long"], []],
  ["minItems", { type: "array", minItems: 1 }, [[1]], [fail([], root("must not have fewer than 1 items"))]],
  ["maxItems", { type: "array", maxItems: 2 }, [[1, 2]], [fail([1, 2, 3], root("must not have more than 2 items"))]],
  ["uniqueItems", { type: "array", uniqueItems: true }, [[1, "1", true], [{ a: 1 }, { a: 2 }], []], [fail([1, 2, 1], root("must not have duplicate items: items 0 and 2 are identical")), fail([{ a: 1, b: 2 }, { b: 2, a: 1 }], root("must not have duplicate items: items 0 and 1 are identical"))]],
  ["uniqueItems false", { type: "array", uniqueItems: false }, [[1, 1]], []],
  ["items schema", { type: "array", items: { type: "integer" } }, [[], [1, 2]], [fail([1, "2", 3.5], at([1], "must be integer"), at([2], "must be integer"))]],
  ["tuple items with additionalItems false", { type: "array", items: [{ type: "string" }, { type: "integer" }], additionalItems: false }, [["EUR", 100], ["EUR"], []], [fail(["EUR", 100, true], root("must not have more than 2 items")), fail([100, "EUR"], at([0], "must be string"), at([1], "must be integer"))]],
  ["tuple items with an additionalItems schema", { type: "array", items: [{ type: "string" }], additionalItems: { type: "number" } }, [["a", 1, 2.5]], [fail(["a", 1, "b"], at([2], "must be number"))]],
  ["tuple items without additionalItems", { items: [{ type: "string" }] }, [["a", 1, {}]], [fail([1], at([0], "must be string"))]],
  ["prefixItems with items false", { type: "array", prefixItems: [{ type: "string" }, { type: "number" }], items: false }, [["lat", 40.4]], [fail(["lat", 40.4, 3], root("must not have more than 2 items")), fail([1], at([0], "must be string"))]],
  ["prefixItems with an items schema", { prefixItems: [{ const: "point" }], items: { type: "number" } }, [["point", 1, 2]], [fail(["point", "x"], at([1], "must be number")), fail(["line"], at([0], 'must equal "point"'))]],
  ["items false", { type: "array", items: false }, [[]], [fail([1], root("must not have more than 0 items"))]],
  ["contains", { type: "array", contains: { type: "integer" } }, [["a", 1]], [fail(["a"], root("must contain at least 1 valid item")), fail([], root("must contain at least 1 valid item"))]],
  ["minContains and maxContains", { type: "array", contains: { const: "x" }, minContains: 2, maxContains: 3 }, [["x", "x"], ["x", "y", "x", "x"]], [fail(["x"], root("must contain at least 2 valid items")), fail(["x", "x", "x", "x"], root("must contain at most 3 valid items"))]],
  ["minContains zero", { contains: { const: "x" }, minContains: 0 }, [[], ["y"]], []],
  ["maxContains one", { contains: { type: "string" }, maxContains: 1 }, [["a", 1]], [fail(["a", "b"], root("must contain at most 1 valid item"))]],
  ["required", { type: "object", required: ["orderId", "total"] }, [{ orderId: "o", total: 1 }], [fail({}, root("must have required property 'orderId'"), root("must have required property 'total'")), fail({ orderId: "o", Total: 1 }, root("must have required property 'total'"))]],
  ["required property present with a null value", { required: ["couponCode"] }, [{ couponCode: null }], []],
  ["non-array required", { type: "object", required: true, properties: { a: { required: true } } }, [{}, { a: {} }], []],
  ["properties", { type: "object", properties: { total: { type: "number" }, currency: { type: "string", minLength: 3 } } }, [{ total: 1, currency: "EUR" }, {}, { other: true }], [fail({ total: "1", currency: "EU" }, at(["total"], "must be number"), at(["currency"], "must not have fewer than 3 characters"))]],
  ["nested properties in arrays of objects", { type: "object", properties: { lines: { type: "array", items: { type: "object", required: ["sku"], properties: { sku: { type: "string" }, qty: { type: "integer", minimum: 1 } } } } } }, [{ lines: [{ sku: "A", qty: 1 }] }], [fail({ lines: [{ sku: "A", qty: 1 }, { sku: 2, qty: 0 }, {}] }, at(["lines", 1, "sku"], "must be string"), at(["lines", 1, "qty"], "must be >= 1"), at(["lines", 2], "must have required property 'sku'"))]],
  ["additionalProperties false", { type: "object", properties: { id: { type: "string" } }, additionalProperties: false }, [{ id: "a" }, {}], [fail({ id: "a", extra: 1 }, at(["extra"], "is not allowed by additionalProperties"))]],
  ["additionalProperties schema", { type: "object", additionalProperties: { type: "integer" } }, [{ a: 1 }], [fail({ a: 1, b: "2" }, at(["b"], "must be integer"))]],
  ["additionalProperties true", { additionalProperties: true, properties: { a: { type: "string" } } }, [{ a: "x", b: 1 }], [fail({ a: 1 }, at(["a"], "must be string"))]],
  ["patternProperties with additionalProperties false", { type: "object", properties: { id: {} }, patternProperties: { "^x-": { type: "string" } }, additionalProperties: false }, [{ id: 1, "x-tenant": "eu" }], [fail({ "x-tenant": 7 }, at(["x-tenant"], "must be string")), fail({ tenant: "eu" }, at(["tenant"], "is not allowed by additionalProperties"))]],
  ["invalid patternProperties regex", { patternProperties: { "([": { type: "string" } } }, [{ "([": 1 }], []],
  ["property names that are not identifiers", { type: "object", properties: { "order.id": { type: "string" }, "line item": { type: "integer" }, 0: { type: "boolean" }, "": { type: "null" } } }, [{ "order.id": "o" }], [fail({ "order.id": 1, "line item": "x", 0: "no", "": 0 }, at(["order.id"], "must be string"), at(["line item"], "must be integer"), at(["0"], "must be boolean"), at([""], "must be null"))]],
  ["propertyNames pattern", { type: "object", propertyNames: { pattern: "^[a-z][a-zA-Z0-9]*$" } }, [{ orderId: 1 }], [fail({ OrderId: 1, "order-id": 2 }, at(["OrderId"], `is not a valid property name: must match pattern "^[a-z][a-zA-Z0-9]*$"`), at(["order-id"], `is not a valid property name: must match pattern "^[a-z][a-zA-Z0-9]*$"`))]],
  ["propertyNames maxLength", { propertyNames: { maxLength: 3 } }, [{ abc: 1 }], [fail({ abcd: 1 }, at(["abcd"], "is not a valid property name: must not have more than 3 characters"))]],
  ["minProperties and maxProperties", { type: "object", minProperties: 1, maxProperties: 2 }, [{ a: 1 }, { a: 1, b: 2 }], [fail({}, root("must not have fewer than 1 properties")), fail({ a: 1, b: 2, c: 3 }, root("must not have more than 2 properties"))]],
  ["dependencies array", { type: "object", dependencies: { cardNumber: ["cvv", "expiry"] } }, [{}, { cardNumber: "4111", cvv: "123", expiry: "12/30" }], [fail({ cardNumber: "4111" }, root("must have property 'cvv' when property 'cardNumber' is present"), root("must have property 'expiry' when property 'cardNumber' is present"))]],
  ["dependencies schema", { dependencies: { refund: { required: ["refundReason"] } } }, [{ refund: true, refundReason: "x" }, { other: 1 }], [fail({ refund: true }, root("must have required property 'refundReason'"))]],
  ["dependentRequired", { dependentRequired: { shippingAddress: ["shippingMethod"] } }, [{ shippingAddress: {}, shippingMethod: "express" }, {}], [fail({ shippingAddress: {} }, root("must have property 'shippingMethod' when property 'shippingAddress' is present"))]],
  ["dependentSchemas", { dependentSchemas: { discount: { properties: { discount: { maximum: 50 } } } } }, [{ discount: 10 }, { other: 99 }], [fail({ discount: 80 }, at(["discount"], "must be <= 50"))]],
  ["allOf", { allOf: [{ type: "object", required: ["id"] }, { properties: { id: { type: "string" } } }, { required: ["version"] }] }, [{ id: "a", version: 1 }], [fail({ id: 1 }, at(["id"], "must be string"), root("must have required property 'version'"))]],
  ["anyOf without a single plausible branch", { anyOf: [{ type: "string" }, { type: "integer" }] }, ["a", 1], [fail(true, root("must match a schema in anyOf")), fail(1.5, root("must match a schema in anyOf"))]],
  ["anyOf reporting the only plausible branch", { anyOf: [{ type: "object", required: ["iban"], properties: { iban: { type: "string" } } }, { type: "string", format: "email" }] }, [{ iban: "ES12" }, "ops@acme.io"], [fail({ iban: 12 }, at(["iban"], "must be string")), fail("nope", root('must match format "email"')), fail(7, root("must match a schema in anyOf"))]],
  ["oneOf matching two branches", { oneOf: [{ type: "number" }, { type: "integer" }] }, [1.5], [fail(2, root("must match exactly one schema in oneOf, but matches oneOf[0] and oneOf[1]"))]],
  ["oneOf matching no branch", { oneOf: [{ const: "card" }, { const: "transfer" }] }, ["card", "transfer"], [fail("cash", root("must match exactly one schema in oneOf"))]],
  ["oneOf nullable reference reporting the object branch", { oneOf: [{ type: "null" }, { $ref: "#/components/schemas/Address" }] }, [null, { street: "Gran Via 1", city: "Madrid" }], [fail({ street: 1, city: "Madrid" }, at(["street"], "must be string")), fail("Madrid", root("must match exactly one schema in oneOf"))]],
  ["oneOf with a const discriminator reporting the discriminated branch", { oneOf: [{ type: "object", required: ["kind", "card"], properties: { kind: { const: "card" }, card: { type: "object", required: ["last4"], properties: { last4: { type: "string", pattern: "^[0-9]{4}$" } } } } }, { type: "object", required: ["kind", "iban"], properties: { kind: { const: "sepa" }, iban: { type: "string" } } }] }, [{ kind: "card", card: { last4: "4242" } }, { kind: "sepa", iban: "ES12" }], [fail({ kind: "card", card: { last4: "42" } }, at(["card", "last4"], 'must match pattern "^[0-9]{4}$"')), fail({ kind: "sepa" }, root("must have required property 'iban'")), fail({ kind: "cash" }, root("must match exactly one schema in oneOf"))]],
  ["not", { not: { type: "string" } }, [1, null], [fail("x", root("must not match the 'not' schema"))]],
  ["if then else", { type: "object", if: { properties: { method: { const: "card" } }, required: ["method"] }, then: { required: ["cardToken"] }, else: { required: ["iban"] } }, [{ method: "card", cardToken: "tok" }, { method: "transfer", iban: "ES12" }, { iban: "x" }], [fail({ method: "card" }, root("must have required property 'cardToken'")), fail({ method: "transfer" }, root("must have required property 'iban'"))]],
  ["if without then and else", { if: { type: "string" } }, [1, "a"], []],
  ["then and else without if", { then: { type: "string" }, else: { type: "string" } }, [1], []],
  ["true schema", true, [1, null, {}], []],
  ["false schema", false, [], [fail(1, root("is not allowed")), fail(null, root("is not allowed"))]],
  ["false property schema", { type: "object", properties: { legacyId: false } }, [{ id: 1 }], [fail({ legacyId: 1 }, at(["legacyId"], "is not allowed"))]],
  ["empty schema", {}, [1, "x", null, [], {}], []],
  ["local $ref", { $ref: "#/components/schemas/Money" }, [{ amount: 1, currency: "EUR" }], [fail({ amount: "1", currency: "EUR" }, at(["amount"], "must be number")), fail({ amount: 1 }, root("must have required property 'currency'"))]],
  ["chained $ref", { $ref: "#/components/schemas/MoneyAlias" }, [{ amount: 1, currency: "EUR" }], [fail({ amount: 1, currency: "eur" }, at(["currency"], 'must match pattern "^[A-Z]{3}$"'))]],
  ["$ref with sibling keywords", { $ref: "#/components/schemas/Money", required: ["note"], description: "Charged amount." }, [{ amount: 1, currency: "EUR", note: "x" }], [fail({ amount: 1, currency: "EUR" }, root("must have required property 'note'"))]],
  ["escaped JSON pointer", { $ref: "#/components/schemas/money~1v2/properties/amount" }, [1], [fail("1", root("must be number"))]],
  ["tilde-escaped JSON pointer", { $ref: "#/components/schemas/tilde~0name" }, [true], [fail("true", root("must be boolean"))]],
  ["percent-encoded JSON pointer", { $ref: "#/components/schemas/Money%20Legacy" }, [{ value: 1 }], [fail({}, root("must have required property 'value'"))]],
  ["pointer into an array item", { $ref: "#/components/schemas/Tagged/allOf/0" }, [{ tag: "a" }], [fail({}, root("must have required property 'tag'"))]],
  ["recursive schema", { $ref: "#/components/schemas/Category" }, [{ name: "root", children: [{ name: "leaf", children: [] }] }], [fail({ name: "root", children: [{ name: "leaf", children: [{ name: 3 }] }] }, at(["children", 0, "children", 0, "name"], "must be string"))]],
  ["$ref cycle", { $ref: "#/components/schemas/CycleA" }, [1, "x"], []],
  ["allOf cycle", { $ref: "#/components/schemas/LoopAllOf" }, [1], []],
  ["dangling $ref", { $ref: "#/components/schemas/Missing" }, [1], []],
  ["malformed pointer", { $ref: "#components/schemas/Money" }, [1], []],
  ["invalid percent-encoding", { $ref: "#/components/schemas/%E0%A4%A" }, [1], []],
  ["external $ref", { $ref: "./schemas/money.json" }, [1], []],
  ["external $ref with siblings", { $ref: "../shared/money.json#/Money", type: "object" }, [{}], [fail(1, root("must be object"))]],
  ["non-string $ref", { $ref: 42, type: "string" }, ["x"], [fail(1, root("must be string"))]],
  ["$ref to the document root", { $ref: "#" }, [1, "x"], []],
];

const EXAMPLE_OPENAPI_SCHEMA_CASES = [
  ["nullable string", { type: "string", nullable: true }, [null, "x"], [fail(1, root("must be string"))]],
  ["nullable false", { type: "string", nullable: false }, ["x"], [fail(null, root("must be string"))]],
  ["nullable object with required", { type: "object", nullable: true, required: ["id"] }, [null, { id: 1 }], [fail({}, root("must have required property 'id'"))]],
  ["nullable property", { type: "object", properties: { note: { type: "string", nullable: true } } }, [{ note: null }, { note: "x" }], [fail({ note: 1 }, at(["note"], "must be string"))]],
  ["nullable enum", { type: "string", nullable: true, enum: ["A", "B"] }, [null, "A"], [fail("C", root('must be one of: "A", "B"'))]],
  ["nullable $ref", { $ref: "#/components/schemas/Money", nullable: true }, [null, { amount: 1, currency: "EUR" }], [fail({}, root("must have required property 'amount'"), root("must have required property 'currency'"))]],
  ["boolean exclusive bounds", { type: "integer", minimum: 1, maximum: 10, exclusiveMinimum: true, exclusiveMaximum: true }, [2, 9], [fail(1, root("must be > 1")), fail(10, root("must be < 10"))]],
  ["int32 format", { type: "integer", format: "int32" }, [2147483647, -2147483648], [fail(2147483648, root('must match format "int32"'))]],
];

const EXAMPLE_FORMAT_CASES = [
  ["date", ["2026-01-15", "2024-02-29", "2000-02-29"], ["2026-02-29", "1900-02-29", "2026-13-01", "2026-04-31", "2026-00-10", "15/01/2026", "2026-1-5", "2026-01-15T10:00:00Z"]],
  ["time", ["10:15:30", "23:59:60", "10:15:30.123Z", "10:15:30+02:00", "10:15:30-0530"], ["24:00:00", "10:15", "10:60:00", "23:58:60", "10:15:30 Z"]],
  ["date-time", ["2026-01-15T10:15:30Z", "2026-01-15t10:15:30.5+01:00", "2026-01-15 10:15:30z", "2024-02-29T23:59:60Z"], ["2026-01-15T10:15:30", "2026-01-15", "2026-02-30T10:00:00Z", "2026-01-15T25:00:00Z", "2026-01-15T10:15:30Z extra"]],
  ["duration", ["P1D", "PT15M", "P1W", "P1Y2M3DT4H5M6S"], ["P", "1D", "PT", "P1DT", "PT1.5S"]],
  ["uri", ["https://example.io/a?b=c#d", "urn:isbn:0451450523", "mailto:ops@example.io"], ["example.io/path", "/relative", "https://exa mple.io"]],
  ["uri-reference", ["/relative/path", "#fragment", "https://example.io", ""], ["https://exa mple.io", "\\\\server\\share"]],
  ["uri-template", ["/orders/{orderId}", "https://example.io/{+path}{?q,limit}"], ["/orders/{order id}", "/orders/{orderId"]],
  ["url", ["https://example.io/x", "ftp://files.example.io/a.csv"], ["ftp//x", "https://localhost/x", "mailto:ops@example.io"]],
  ["email", ["ops@harbor.example.io", "first.last+tag@example.io"], ["ops@", "ops.example.io", "ops@example", "ops @example.io"]],
  ["hostname", ["kafka-1.example.io", "localhost", "example.io."], ["-bad.example.io", "a..b", "under_score.io", `${"a".repeat(64)}.io`]],
  ["ipv4", ["10.0.0.1", "255.255.255.255"], ["256.0.0.1", "10.0.0", "10.0.0.1.2", "::1"]],
  ["ipv6", ["::1", "2001:db8::8a2e:370:7334", "::ffff:192.168.1.1"], ["2001:::1", "12345::", "10.0.0.1"]],
  ["regex", ["^[a-z]+$", "\\d{3}"], ["[a-", "^abc\\Z"]],
  ["uuid", ["4bf92f35-77b3-4da6-a3ce-929d0e0e4736", "urn:uuid:4BF92F35-77B3-4DA6-A3CE-929D0E0E4736"], ["4bf92f35", "4bf92f35-77b3-4da6-a3ce-929d0e0e473", "zbf92f35-77b3-4da6-a3ce-929d0e0e4736"]],
  ["json-pointer", ["", "/a/b~1c", "/0"], ["a/b", "/a~2"]],
  ["json-pointer-uri-fragment", ["#/a/b", "#"], ["/a/b", "#/a b"]],
  ["relative-json-pointer", ["0/a", "1#", "0"], ["/a", "-1/a"]],
  ["byte", ["aGVsbG8=", "", "aGk="], ["aGVsbG8", "not base64!", "aGVsbG8=="]],
];

const EXAMPLE_NUMBER_FORMAT_CASES = [
  ["int32", [0, 2147483647, -2147483648], [2147483648, -2147483649, 1.5]],
  ["int64", [0, 9007199254740991, -9007199254740991], [1.5, 0.1]],
];

const EXAMPLE_IGNORED_FORMATS = ["float", "double", "password", "binary", "iban", "idn-email", "iri", "Date", "DATE-TIME", ""];

const EXAMPLE_AVRO_SCHEMA_CASES = [
  ["null", "null", [null], [fail(0, root("must be null")), fail("null", root("must be null"))]],
  ["boolean", "boolean", [true, false], [fail("true", root("must be boolean")), fail(1, root("must be boolean"))]],
  ["int", "int", [0, -2147483648, 2147483647], [fail(2147483648, root("must be an int between -2147483648 and 2147483647")), fail(1.5, root("must be an int")), fail("1", root("must be an int"))]],
  ["long", "long", [0, 9007199254740991, -9007199254740991], [fail(1.5, root("must be a long")), fail("1736899200000", root("must be a long"))]],
  ["float", "float", [1.5, 0, -3], [fail("1.5", root("must be a float"))]],
  ["double in a type object", { type: "double" }, [1e-7, 42], [fail(null, root("must be a double"))]],
  ["bytes", "bytes", ["", "\u0000\u00ff", "abc"], [fail(12, root("must be a string of bytes")), fail("€", root("must only contain characters \\u0000-\\u00ff"))]],
  ["string", "string", ["", "x"], [fail(1, root("must be a string")), fail(null, root("must be a string"))]],
  ["uuid logical type", { type: "string", logicalType: "uuid" }, ["4bf92f35-77b3-4da6-a3ce-929d0e0e4736"], [fail("4bf92f35", root("must be a UUID string")), fail(1, root("must be a string"))]],
  ["date logical type", { type: "int", logicalType: "date" }, [20468], [fail("2026-01-15", root("must be an int"))]],
  ["timestamp-millis logical type", { type: "long", logicalType: "timestamp-millis" }, [1768471200000], [fail("2026-01-15T10:00:00Z", root("must be a long"))]],
  ["decimal logical type on bytes", { type: "bytes", logicalType: "decimal", precision: 9, scale: 2 }, ["\u0000\u0004\u00d2"], [fail(12.34, root("must be a string of bytes"))]],
  ["enum", { type: "enum", name: "OrderStatus", symbols: ["PLACED", "PAID", "SHIPPED"] }, ["PAID"], [fail("LOST", root("must be a symbol of enum 'OrderStatus': PLACED, PAID, SHIPPED")), fail(1, root("must be a symbol of enum 'OrderStatus': PLACED, PAID, SHIPPED"))]],
  ["enum without symbols", { type: "enum", name: "Loose" }, ["ANY"], [fail(1, root("must be a symbol of enum 'Loose'"))]],
  ["enum without a name", { type: "enum", symbols: ["A"] }, ["A"], [fail("B", root("must be a symbol of enum: A"))]],
  ["array", { type: "array", items: "int" }, [[], [1, 2]], [fail({}, root("must be an array")), fail([1, "2"], at([1], "must be an int"))]],
  ["array without items", { type: "array" }, [[1, "a"]], [fail("x", root("must be an array"))]],
  ["map", { type: "map", values: "long" }, [{}, { a: 1 }], [fail([], root("must be an object (map)")), fail({ a: "1" }, at(["a"], "must be a long"))]],
  ["map without values", { type: "map" }, [{ a: [] }], [fail(1, root("must be an object (map)"))]],
  ["fixed", { type: "fixed", name: "Md5", size: 4 }, ["abcd", "\u0000\u0001\u0002\u0003"], [fail("abc", root("must be a string of exactly 4 bytes for fixed 'Md5'")), fail("ab€d", root("must be a string of exactly 4 bytes for fixed 'Md5'")), fail(1234, root("must be a string of exactly 4 bytes for fixed 'Md5'"))]],
  ["fixed without size", { type: "fixed", name: "Raw" }, ["anything"], [fail(1, root("must be a string of bytes for fixed 'Raw'"))]],
  ["record", { type: "record", name: "Order", fields: [{ name: "orderId", type: "string" }, { name: "total", type: "double" }] }, [{ orderId: "o", total: 1 }], [fail({ orderId: "o" }, root("must have field 'total' of record 'Order'")), fail({ orderId: "o", total: 1, channel: "web" }, at(["channel"], "is not a field of record 'Order'")), fail([], root("must be an object (record 'Order')")), fail(null, root("must be an object (record 'Order')"))]],
  ["record field defaults and nullable unions", { type: "record", name: "Shipment", fields: [{ name: "carrier", type: "string", default: "dhl" }, { name: "note", type: ["null", "string"] }, { name: "tracking", type: ["string", "null"] }, { name: "eta", type: [{ type: "null" }, "long"] }, { name: "priority", type: "int", default: null }, { name: "weight", type: "double" }] }, [{ weight: 1.5 }, { weight: 2, note: null, tracking: "T1", eta: 1768471200000 }], [fail({}, root("must have field 'weight' of record 'Shipment'"))]],
  ["error type", { type: "error", name: "PaymentFailed", fields: [{ name: "code", type: "string" }] }, [{ code: "E1" }], [fail({}, root("must have field 'code' of record 'PaymentFailed'"))]],
  ["record without fields", { type: "record", name: "Opaque" }, [{ any: 1 }], [fail("x", root("must be an object (record 'Opaque')"))]],
  ["malformed record fields", { type: "record", name: "Loose", fields: [null, "x", { type: "string" }, { name: "id", type: "string" }] }, [{ id: "a" }], [fail({ id: "a", other: 1 }, at(["other"], "is not a field of record 'Loose'"))]],
  ["nested record and named references", { type: "record", name: "Order", namespace: "io.acme.orders", fields: [{ name: "billing", type: { type: "record", name: "Address", fields: [{ name: "city", type: "string" }] } }, { name: "shipping", type: "Address" }, { name: "pickup", type: "io.acme.orders.Address" }] }, [{ billing: { city: "a" }, shipping: { city: "b" }, pickup: { city: "c" } }], [fail({ billing: { city: 1 }, shipping: {}, pickup: { city: "c", zip: "1" } }, at(["billing", "city"], "must be a string"), at(["shipping"], "must have field 'city' of record 'Address'"), at(["pickup", "zip"], "is not a field of record 'Address'"))]],
  ["named type defined after its use", { type: "record", name: "Envelope", fields: [{ name: "first", type: ["null", "Item"] }, { name: "second", type: { type: "record", name: "Item", fields: [{ name: "sku", type: "string" }] } }] }, [{ first: null, second: { sku: "a" } }, { first: { sku: "b" }, second: { sku: "c" } }], [fail({ first: { sku: 1 }, second: { sku: "c" } }, at(["first", "sku"], "must be a string"))]],
  ["namespaced name in a dotted record name", { type: "record", name: "io.acme.Parcel", fields: [{ name: "inner", type: ["null", { type: "record", name: "Label", fields: [{ name: "text", type: "string" }] }] }, { name: "again", type: ["null", "io.acme.Label"] }] }, [{ inner: null, again: { text: "x" } }], [fail({ inner: null, again: { text: 1 } }, at(["again", "text"], "must be a string"))]],
  ["recursive record", { type: "record", name: "Node", fields: [{ name: "value", type: "int" }, { name: "next", type: ["null", "Node"] }] }, [{ value: 1, next: { value: 2, next: null } }], [fail({ value: 1, next: { value: 2, next: { value: "3", next: null } } }, at(["next", "next", "value"], "must be an int"))]],
  ["unknown named type", { type: "record", name: "Wrapper", fields: [{ name: "payload", type: "com.other.Unknown" }] }, [{ payload: 1 }, { payload: { any: true } }], [fail({}, root("must have field 'payload' of record 'Wrapper'"))]],
  ["union", ["null", "string"], [null, "x", { string: "x" }], [fail(5, root("must match one of the union types null, string")), fail({ string: 5 }, at(["string"], "must be a string"))]],
  ["union of int and long", ["int", "long"], [1, 3000000000], [fail(1.5, root("must match one of the union types int, long"))]],
  ["union reporting the plausible record branch", ["null", { type: "record", name: "Coupon", namespace: "io.acme", fields: [{ name: "code", type: "string" }] }], [null, { code: "X" }, { Coupon: { code: "X" } }, { "io.acme.Coupon": { code: "Y" } }], [fail({ code: 1 }, at(["code"], "must be a string")), fail("X", root("must match one of the union types null, Coupon")), fail({ "io.acme.Coupon": { code: 1 } }, at(["io.acme.Coupon", "code"], "must be a string"))]],
  ["union with wrapped complex branches", ["null", "long", { type: "array", items: "string" }, { type: "map", values: "int" }], [{ long: 5 }, { array: ["a"] }, { map: { a: 1 } }, ["a"], 5, { a: 1 }], [fail({ long: "5" }, at(["long"], "must be a long")), fail({ array: [1] }, at(["array", 0], "must be a string"))]],
  ["empty union", [], [1, "x"], []],
  ["top-level union with a record", ["null", { type: "record", name: "Tombstoneable", fields: [{ name: "id", type: "string" }] }], [null, { id: "a" }], [fail({}, root("must have field 'id' of record 'Tombstoneable'"))]],
  ["nested type object", { type: { type: "array", items: "int" } }, [[1]], [fail(["1"], at([0], "must be an int"))]],
  ["union in a type object", { type: ["null", "int"] }, [null, 1], [fail("1", root("must match one of the union types null, int"))]],
  ["named reference in a type object", { type: "record", name: "Holder", fields: [{ name: "status", type: { type: "enum", name: "Flag", symbols: ["ON", "OFF"] } }, { name: "previous", type: { type: "Flag" } }] }, [{ status: "ON", previous: "OFF" }], [fail({ status: "ON", previous: "MAYBE" }, at(["previous"], "must be a symbol of enum 'Flag': ON, OFF"))]],
  ["unknown type name", "com.acme.Missing", [1, {}], []],
  ["invalid schema node", 42, [1], []],
  ["Avro schema behind a local $ref", { $ref: "#/components/schemas/AvroMoney" }, [{ amount: 1.5, currency: "EUR" }], [fail({ amount: "1", currency: "EUR" }, at(["amount"], "must be a double"))]],
  ["Avro schema behind a chained $ref", { $ref: "#/components/schemas/AvroAlias" }, [{ amount: 2, currency: "USD" }], [fail({ amount: 2 }, root("must have field 'currency' of record 'Money'"))]],
  ["Avro field type behind a local $ref", { type: "record", name: "Line", fields: [{ name: "status", type: { $ref: "#/components/schemas/AvroStatus" } }] }, [{ status: "OPEN" }], [fail({ status: "LOST" }, at(["status"], "must be a symbol of enum 'Status': OPEN, CLOSED"))]],
  ["Avro schema behind an external $ref", { $ref: "./avro/order.avsc" }, [1], []],
  ["Avro schema behind a dangling $ref", { $ref: "#/components/schemas/NoSuchAvro" }, [1], []],
  ["Avro schema as a JSON string", '{"type":"record","name":"Ping","fields":[{"name":"at","type":"long"}]}', [{ at: 1 }], [fail({ at: "1" }, at(["at"], "must be a long"))]],
  ["Avro union as a JSON string", '["null","int"]', [null, 1], [fail("x", root("must match one of the union types null, int"))]],
  ["Avro schema as an invalid JSON string", '{"type": "record", ', [1], []],
];

const HYBRID_PROBE_SCHEMA = {
  type: "record",
  name: "Probe",
  fields: [{ name: "id", type: "string" }],
  required: ["id"],
  properties: { id: { type: "string", nullable: true } },
};
const HYBRID_PROBE_EXAMPLES = [{ payload: {} }, { payload: { id: null } }];
const HYBRID_PROBE_FINDINGS = {
  json: [
    [0, "payload", "must have required property 'id'"],
    [1, "payload.id", "must be string"],
  ],
  openapi: [[0, "payload", "must have required property 'id'"]],
  avro: [
    [0, "payload", "must have field 'id' of record 'Probe'"],
    [1, "payload.id", "must be a string"],
  ],
};

const EXAMPLE_SCHEMA_FORMAT_CASES = [
  [undefined, "json"],
  [null, "json"],
  ["application/vnd.aai.asyncapi;version=2.6.0", "json"],
  ["application/vnd.aai.asyncapi+json;version=2.0.0", "json"],
  ["application/vnd.aai.asyncapi+yaml;version=3.0.0", "json"],
  ["application/vnd.aai.asyncapi", "json"],
  ["APPLICATION/VND.AAI.ASYNCAPI+JSON; VERSION=3.1.0", "json"],
  ["application/schema+json;version=draft-07", "json"],
  ["application/schema+yaml;version=draft-04", "json"],
  ["application/schema+json;version=2020-12", "json"],
  [" application/schema+json ; version=draft-07 ", "json"],
  ["application/vnd.oai.openapi;version=3.0.0", "openapi"],
  ["application/vnd.oai.openapi+json;version=3.0.3", "openapi"],
  ["application/vnd.oai.openapi+yaml;version=3.0.0", "openapi"],
  ["application/vnd.oai.openapi", "openapi"],
  ['application/vnd.oai.openapi;version="3.0.1"', "openapi"],
  ["application/vnd.oai.openapi;charset=utf-8", "openapi"],
  ["application/vnd.oai.openapi;version=3.1.0", "json"],
  ["application/vnd.oai.openapi+json;version=2.0", "json"],
  ["application/vnd.apache.avro;version=1.9.0", "avro"],
  ["application/vnd.apache.avro+json;version=1.9.0", "avro"],
  ["application/vnd.apache.avro+yaml;version=1.8.2", "avro"],
  ["application/vnd.apache.avro", "avro"],
  ["Application/Vnd.Apache.Avro;Version=1.11.1", "avro"],
  ["application/vnd.google.protobuf;version=3", null],
  ["application/raml+yaml;version=1.0", null],
  ["application/xml", null],
  ["application/vnd.apache.avro+binary", null],
  ["application/avro", null],
  ["application/json", null],
  ["application/vnd.aai.asyncapi+xml;version=2.6.0", null],
  ["", null],
  [42, null],
  [true, null],
  [{ type: "avro" }, null],
];

const traitRef = (name) => ({ $ref: `#/components/messageTraits/${name}` });
const TRAIT_BASE_MESSAGE = {
  name: "orderPlaced",
  payload: { type: "object", required: ["orderId"], properties: { orderId: { type: "string" } } },
  headers: { type: "object", properties: { partitionKey: { type: "string" } } },
};

const EXAMPLE_SCHEMA_TRAIT_COMPONENTS = {
  messageTraits: {
    traceHeaders: { headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string", format: "uuid" } } } },
    integerKey: { headers: { properties: { partitionKey: { type: "integer" } } } },
    booleanKey: { headers: { properties: { partitionKey: { type: "boolean" } } } },
    dropRequired: { headers: { required: null } },
    nullHeaders: { headers: null },
    avroFormat: { schemaFormat: "application/vnd.apache.avro;version=1.9.0" },
    traitExamples: { examples: [{ payload: { orderId: 7 } }] },
    traitPayload: { payload: { properties: { orderId: { type: "integer" } } } },
    chained: traitRef("integerKey"),
    external: { $ref: "./shared/message-traits.yaml#/components/messageTraits/kafkaEnvelope" },
    externalHeaders: { headers: { $ref: "./shared/headers.yaml#/TraceHeaders" } },
    refHeaders: { headers: { $ref: "#/components/schemas/TraceHeaders" } },
    cycleA: traitRef("cycleB"),
    cycleB: traitRef("cycleA"),
  },
  schemas: {
    TraceHeaders: { type: "object", required: ["traceId"], properties: { traceId: { type: "string" } } },
  },
  "x-trait-lists": {
    traceAndKey: [traitRef("traceHeaders"), traitRef("integerKey")],
    withExamples: [traitRef("traitExamples")],
  },
};

const TRACE_ID = "4bf92f35-77b3-4da6-a3ce-929d0e0e4736";
const issue = (index, trail, text, trait) => `${trait === undefined ? "" : `traits[${trait}].`}examples[${index}].${trail} ${text}.`;

const EXAMPLE_SCHEMA_TRAIT_CASES = [
  [
    "a trait adding a headers schema",
    { traits: [traitRef("traceHeaders")], examples: [{ payload: { orderId: "o-1" }, headers: { partitionKey: "p" } }, { headers: { traceId: "nope" } }, { headers: { traceId: TRACE_ID } }] },
    [
      ["examples.0.headers", issue(0, "headers", "must have required property 'traceId'")],
      ["examples.1.headers.traceId", issue(1, "headers.traceId", 'must match format "uuid"')],
    ],
    "same",
  ],
  [
    "a trait overriding a header property type",
    { traits: [traitRef("integerKey")], examples: [{ headers: { partitionKey: "p" } }, { headers: { partitionKey: 3 } }] },
    [["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be integer")]],
    [["examples.1.headers.partitionKey", issue(1, "headers.partitionKey", "must be string")]],
  ],
  [
    "a chained trait reference",
    { traits: [traitRef("chained")], examples: [{ headers: { partitionKey: "p" } }, { headers: { partitionKey: 3 } }] },
    [["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be integer")]],
    [["examples.1.headers.partitionKey", issue(1, "headers.partitionKey", "must be string")]],
  ],
  [
    "two traits where the last one sets the header type",
    { traits: [traitRef("integerKey"), traitRef("booleanKey")], examples: [{ headers: { partitionKey: "p" } }, { headers: { partitionKey: 3 } }] },
    [
      ["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be boolean")],
      ["examples.1.headers.partitionKey", issue(1, "headers.partitionKey", "must be boolean")],
    ],
    [["examples.1.headers.partitionKey", issue(1, "headers.partitionKey", "must be string")]],
  ],
  [
    "a trait deleting a nested keyword with null",
    { headers: { type: "object", required: ["partitionKey"], properties: { partitionKey: { type: "string" } } }, traits: [traitRef("dropRequired")], examples: [{ headers: {} }] },
    [],
    [["examples.0.headers", issue(0, "headers", "must have required property 'partitionKey'")]],
  ],
  [
    "a trait setting the headers to null",
    { traits: [traitRef("nullHeaders")], examples: [{ headers: { partitionKey: 1 } }] },
    [],
    [["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be string")]],
  ],
  [
    "a trait setting an Avro schemaFormat",
    { payload: HYBRID_PROBE_SCHEMA, traits: [traitRef("avroFormat")], examples: [{ payload: {} }] },
    [["examples.0.payload", issue(0, "payload", "must have field 'id' of record 'Probe'")]],
    [["examples.0.payload", issue(0, "payload", "must have required property 'id'")]],
  ],
  [
    "a trait providing the examples",
    { traits: [traitRef("traitExamples")] },
    [["traits.0", issue(0, "payload.orderId", "must be string", 0)]],
    "same",
  ],
  [
    "own examples and a trait providing examples",
    { traits: [traitRef("traitExamples")], examples: [{ payload: { orderId: true } }] },
    [["traits.0", issue(0, "payload.orderId", "must be string", 0)]],
    [["examples.0.payload.orderId", issue(0, "payload.orderId", "must be string")]],
  ],
  [
    "a trait adding payload keywords",
    { traits: [traitRef("traitPayload")], examples: [{ payload: { orderId: "o-1" } }, { payload: { orderId: 1 } }] },
    [["examples.0.payload.orderId", issue(0, "payload.orderId", "must be integer")]],
    [["examples.1.payload.orderId", issue(1, "payload.orderId", "must be string")]],
  ],
  [
    "an inline trait with examples",
    { traits: [{ examples: [{ payload: { orderId: 1 } }] }] },
    [["traits.0.examples.0.payload.orderId", issue(0, "payload.orderId", "must be string", 0)]],
    "same",
  ],
  [
    "a tuple trait",
    { traits: [[traitRef("integerKey"), { environment: "prod" }]], examples: [{ headers: { partitionKey: "p" } }] },
    [["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be integer")]],
    [],
  ],
  [
    "an inline tuple trait with examples",
    { traits: [[{ examples: [{ payload: { orderId: 2 } }] }, {}]] },
    [["traits.0.0.examples.0.payload.orderId", issue(0, "payload.orderId", "must be string", 0)]],
    "same",
  ],
  [
    "a traits list behind a local reference",
    { traits: { $ref: "#/components/x-trait-lists/traceAndKey" }, examples: [{ headers: { partitionKey: "p" } }] },
    [
      ["examples.0.headers", issue(0, "headers", "must have required property 'traceId'")],
      ["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be integer")],
    ],
    [["examples.0.headers", issue(0, "headers", "must have required property 'traceId'")]],
  ],
  [
    "a traits list behind a local reference that provides the examples",
    { traits: { $ref: "#/components/x-trait-lists/withExamples" } },
    [["traits", issue(0, "payload.orderId", "must be string", 0)]],
    "same",
  ],
  ["an external trait", { traits: [{ $ref: "./shared/message-traits.yaml#/components/messageTraits/kafkaEnvelope" }], examples: [{ payload: { orderId: 1 } }] }, [], "same"],
  ["a local trait pointing to an external one", { traits: [traitRef("external")], examples: [{ payload: { orderId: 1 } }] }, [], "same"],
  ["an external trait after a local one", { traits: [traitRef("traceHeaders"), traitRef("external")], examples: [{ payload: { orderId: 1 } }] }, [], "same"],
  ["an external traits list", { traits: { $ref: "./shared/message-traits.yaml#/lists/kafka" }, examples: [{ payload: { orderId: 1 } }] }, [], "same"],
  [
    "a trait with external headers",
    { traits: [traitRef("externalHeaders")], examples: [{ payload: { orderId: 1 }, headers: { partitionKey: 1 } }] },
    [["examples.0.payload.orderId", issue(0, "payload.orderId", "must be string")]],
    "same",
  ],
  [
    "a trait with referenced headers",
    { traits: [traitRef("refHeaders")], examples: [{ payload: { orderId: "o-1" }, headers: { partitionKey: 1 } }] },
    [
      ["examples.0.headers", issue(0, "headers", "must have required property 'traceId'")],
      ["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be string")],
    ],
    "same",
  ],
  ["a dangling trait reference", { traits: [traitRef("missing")], examples: [{ payload: { orderId: 1 } }] }, [["examples.0.payload.orderId", issue(0, "payload.orderId", "must be string")]], "same"],
  ["a cyclic trait reference", { traits: [traitRef("cycleA")], examples: [{ payload: { orderId: 1 } }] }, [["examples.0.payload.orderId", issue(0, "payload.orderId", "must be string")]], "same"],
  ["non-object trait entries", { traits: [null, 42, "kafkaEnvelope", [], [null]], examples: [{ payload: { orderId: 1 } }] }, [["examples.0.payload.orderId", issue(0, "payload.orderId", "must be string")]], "same"],
  ["a non-array traits value", { traits: traitRef("integerKey"), examples: [{ headers: { partitionKey: 1 } }] }, [["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be string")]], "same"],
  ["an empty traits list", { traits: [], examples: [{ headers: { partitionKey: 1 } }] }, [["examples.0.headers.partitionKey", issue(0, "headers.partitionKey", "must be string")]], "same"],
];

const CH = "commonHeaders";
const TR = "tracing";
const SHARED_TRAITS = "./shared/message-traits.yaml#/components/messageTraits";

const REQUIRED_TRAIT_COMPONENTS = {
  messageTraits: {
    commonHeaders: {
      headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string", format: "uuid" }, tenantId: { type: ["string", "null"] } } },
    },
    tracing: { correlationId: { description: "W3C trace context of the producer.", location: "$message.header#/traceparent" } },
    kafkaKey: { bindings: { kafka: { key: { type: "string", maxLength: 64 }, bindingVersion: "0.5.0" } } },
    CommonHeaders: { headers: { type: "object", properties: { legacyId: { type: "string" } } } },
    "audit/v2": { headers: { type: "object", properties: { auditId: { type: "string" } } } },
    "tracing v2": { correlationId: { location: "$message.header#/traceparent" } },
    blank: {},
    nullTrait: null,
    scalarTrait: "commonHeaders",
    listTrait: [{ headers: { type: "object" } }],
    headersAlias: traitRef(CH),
    platformDefaults: traitRef("headersAlias"),
    blankAlias: traitRef("blank"),
    danglingAlias: traitRef("missing"),
    cycleA: traitRef("cycleB"),
    cycleB: traitRef("cycleA"),
    sharedTracing: { $ref: `${SHARED_TRAITS}/tracing` },
  },
  "x-trait-lists": {
    standard: [traitRef(CH), traitRef(TR)],
    headersOnly: [traitRef(CH)],
    chained: { $ref: "#/components/x-trait-lists/standard" },
    empty: [],
    blank: [traitRef("blank"), {}],
    notList: { headers: { type: "object" } },
    nullList: null,
    cycleA: { $ref: "#/components/x-trait-lists/cycleB" },
    cycleB: { $ref: "#/components/x-trait-lists/cycleA" },
    external: { $ref: "./shared/message-traits.yaml#/lists/kafka" },
  },
  "x-missing": {},
};

const REQUIRED_TRAIT_CASES = [
  ["no traits field", {}, "missing"],
  ["a null traits value", { traits: null }, "none"],
  ["an empty traits list", { traits: [] }, "none"],
  ["an inline trait object instead of a list", { traits: { headers: { type: "object" } } }, "notArray"],
  ["a single trait reference instead of a list", { traits: traitRef(CH) }, "notArray"],
  ["a trait name instead of a list", { traits: "commonHeaders" }, "notArray"],
  ["an empty string", { traits: "" }, "notArray"],
  ["a number", { traits: 1 }, "notArray"],
  ["zero", { traits: 0 }, "notArray"],
  ["true", { traits: true }, "notArray"],
  ["false", { traits: false }, "notArray"],
  ["the common headers trait", { traits: [traitRef(CH)] }, null],
  ["the tracing trait", { traits: [traitRef(TR)] }, null],
  ["both organization traits", { traits: [traitRef(CH), traitRef(TR)] }, null],
  ["both organization traits after an unrelated one, in reverse order", { traits: [traitRef("kafkaKey"), traitRef(TR), traitRef(CH)] }, null],
  ["the same trait twice", { traits: [traitRef(CH), traitRef(CH)] }, null],
  ["only an unrelated trait", { traits: [traitRef("kafkaKey")] }, null],
  ["a trait whose name differs only in case", { traits: [traitRef("CommonHeaders"), traitRef(TR)] }, null],
  ["an inline trait", { traits: [{ headers: { type: "object", properties: { traceId: { type: "string" } } } }] }, null],
  ["an inline trait with only an extension", { traits: [{ "x-owner": "platform-team" }] }, null],
  ["an inline trait whose name and title match the organization ones", { traits: [{ name: CH, title: TR }] }, null],
  ["an empty inline trait", { traits: [{}] }, "none"],
  ["non-object entries", { traits: [null, 42, "commonHeaders", true, [], [null]] }, "none"],
  ["a chained alias of an organization trait", { traits: [traitRef("headersAlias"), traitRef(TR)] }, null],
  ["a trait chained twice", { traits: [traitRef("platformDefaults")] }, null],
  ["a reference to an empty trait", { traits: [traitRef("blank")] }, "none"],
  ["an alias of an empty trait", { traits: [traitRef("blankAlias")] }, "none"],
  ["a reference to a null trait", { traits: [traitRef("nullTrait")] }, "none"],
  ["a reference to a scalar trait", { traits: [traitRef("scalarTrait")] }, "none"],
  ["a reference to a list", { traits: [traitRef("listTrait")] }, "none"],
  ["a reference to the document root", { traits: [{ $ref: "#" }] }, "none"],
  ["a dangling reference", { traits: [traitRef("missing")] }, "none"],
  ["dangling references named like the organization traits", { traits: [{ $ref: "#/components/x-missing/commonHeaders" }, { $ref: "#/components/x-missing/tracing" }] }, "none"],
  ["a dangling alias", { traits: [traitRef("danglingAlias")] }, "none"],
  ["a cyclic reference", { traits: [traitRef("cycleA")] }, "none"],
  ["references with a non-string $ref", { traits: [{ $ref: 42 }, { $ref: null }] }, "none"],
  ["a dangling reference next to a valid one", { traits: [traitRef("missing"), traitRef(TR)] }, null],
  ["an empty inline trait next to a valid one", { traits: [{}, traitRef(CH)] }, null],
  ["tuple entries", { traits: [[traitRef(CH), { environment: "prod" }], [traitRef(TR), {}]] }, null],
  ["a tuple with an inline trait", { traits: [[{ headers: { type: "object" } }, {}]] }, null],
  ["tuples without a trait", { traits: [[null, {}], [], [{}, { environment: "prod" }]] }, "none"],
  ["a tuple whose trait is dangling", { traits: [[traitRef("missing"), {}]] }, "none"],
  ["an external trait pointer", { traits: [{ $ref: `${SHARED_TRAITS}/tracing` }, traitRef(CH)] }, null],
  ["an external trait with another name", { traits: [{ $ref: `${SHARED_TRAITS}/tracingV2` }] }, null],
  ["external whole-file references", { traits: [{ $ref: "./traits/commonHeaders.yaml" }, { $ref: "https://schemas.example.io/asyncapi/traits/tracing.json" }] }, null],
  ["external files with an upper-case extension or a query", { traits: [{ $ref: "../traits/commonHeaders.YAML" }, { $ref: "./traits/tracing.yml?version=2" }] }, null],
  ["external files with an empty fragment", { traits: [{ $ref: "./traits/commonHeaders.yaml#" }, { $ref: "./traits/tracing.yaml#/" }] }, null],
  ["an external file with another extension", { traits: [{ $ref: "./traits/commonHeaders.avsc" }] }, null],
  ["Windows-style external paths", { traits: [{ $ref: "..\\traits\\commonHeaders.yaml" }, { $ref: "C:\\specs\\traits\\tracing.json" }] }, null],
  ["a local alias of an external trait", { traits: [traitRef("sharedTracing"), traitRef(CH)] }, null],
  ["an escaped pointer", { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, null],
  ["a percent-encoded pointer", { traits: [{ $ref: "#/components/messageTraits/tracing%20v2" }] }, null],
  ["a malformed percent-encoded pointer", { traits: [{ $ref: "#/components/messageTraits/tracing%E0%A4%A" }] }, "none"],
  ["a pointer without a leading slash", { traits: [{ $ref: "#components/messageTraits/commonHeaders" }] }, "none"],
  ["a traits list behind a local reference", { traits: { $ref: "#/components/x-trait-lists/standard" } }, null],
  ["a traits list behind a chained reference", { traits: { $ref: "#/components/x-trait-lists/chained" } }, null],
  ["a referenced list with one organization trait", { traits: { $ref: "#/components/x-trait-lists/headersOnly" } }, null],
  ["a referenced empty list", { traits: { $ref: "#/components/x-trait-lists/empty" } }, "none"],
  ["a referenced list of empty traits", { traits: { $ref: "#/components/x-trait-lists/blank" } }, "none"],
  ["a referenced null list", { traits: { $ref: "#/components/x-trait-lists/nullList" } }, "none"],
  ["a referenced object instead of a list", { traits: { $ref: "#/components/x-trait-lists/notList" } }, "notArray"],
  ["a list reference to the document root", { traits: { $ref: "#" } }, "notArray"],
  ["a dangling list reference", { traits: { $ref: "#/components/x-trait-lists/missing" } }, "none"],
  ["a cyclic list reference", { traits: { $ref: "#/components/x-trait-lists/cycleA" } }, "none"],
  ["a list reference with a non-string $ref", { traits: { $ref: ["standard"] } }, "none"],
  ["an external traits list", { traits: { $ref: "./shared/message-traits.yaml#/lists/kafka" } }, null],
  ["a local list that points to an external one", { traits: { $ref: "#/components/x-trait-lists/external" } }, null],
];

const REQUIRED_TRAIT_MESSAGES = {
  missing: () => "AAR073: Message must apply at least one trait.",
  notArray: () => "AAR073: Message 'traits' must be an array.",
  none: () => "AAR073: Message 'traits' does not apply any valid trait.",
};

const requiredTraitFindings = (base, kind) => (kind === null ? [] : [[kind === "missing" ? base : `${base}.traits`, REQUIRED_TRAIT_MESSAGES[kind]()]]);

const REQUIRED_TRAIT_PROBES = {
  noTraits: { fields: {}, state: "absent" },
  emptyList: { fields: { traits: [] }, state: "list", any: false },
  notList: { fields: { traits: { headers: { type: "object" } } }, state: "notArray" },
  headersOnly: { fields: { traits: [traitRef(CH)] }, state: "list", any: true },
  tracingOnly: { fields: { traits: [traitRef(TR)] }, state: "list", any: true },
  both: { fields: { traits: [traitRef(CH), traitRef(TR)] }, state: "list", any: true },
  all: { fields: { traits: [traitRef(CH), traitRef(TR), traitRef("kafkaKey")] }, state: "list", any: true },
  aliases: { fields: { traits: [traitRef("platformDefaults"), traitRef("sharedTracing")] }, state: "list", any: true },
  caseVariant: { fields: { traits: [traitRef("CommonHeaders")] }, state: "list", any: true },
  escaped: { fields: { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, state: "list", any: true },
  inline: { fields: { traits: [{ headers: { type: "object" } }] }, state: "list", any: true },
  dangling: { fields: { traits: [{ $ref: "#/components/x-missing/commonHeaders" }] }, state: "list", any: false },
};

const requiredTraitProbeFindings = (prefix) =>
  Object.entries(REQUIRED_TRAIT_PROBES)
    .flatMap(([key, probe]) => {
      const base = `${prefix}.${key}`;
      if (probe.state === "absent") return [[base, REQUIRED_TRAIT_MESSAGES.missing()]];
      if (probe.state === "notArray") return [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.notArray()]];
      return probe.any ? [] : [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.none()]];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

const REQUIRED_TRAIT_OPTIONS = [
  ["an empty string", ""],
  ["a blank string", "  \t "],
  ["only commas and spaces", " , ,, "],
  ["a single name", "commonHeaders"],
  ["two padded names", " commonHeaders ,  tracing "],
  ["the names in another order", "tracing,commonHeaders"],
  ["duplicated names", "tracing,commonHeaders,tracing"],
  ["three names", "commonHeaders,tracing,kafkaKey"],
  ["a name with another case", "COMMONHEADERS"],
  ["a name nobody applies", "piiClassification"],
  ["a name with a slash", "audit/v2"],
  ["a local $ref", "#/components/messageTraits/commonHeaders"],
  ["an external $ref and a name", "./shared/message-traits.yaml#/components/messageTraits/tracing, commonHeaders"],
  ["an escaped $ref", "#/components/messageTraits/audit~1v2"],
  ["a bare hash", "#"],
  ["an array of names", [CH, TR]],
  ["an array of comma-separated lists", ["commonHeaders, tracing", "kafkaKey"]],
  ["an array with non-string items", [null, 42, "tracing", {}, ["commonHeaders"]]],
  ["an empty array", []],
  ["null", null],
  ["a number", 42],
  ["true", true],
  ["an object", { commonHeaders: true }],
];

const deepPropertySchema = (levels) => {
  let schema = { type: "object", properties: { trackingCode: { type: "string" }, tracking_code: { type: "string" } } };
  for (let level = levels; level > 0; level--) {
    schema = { type: "object", properties: { [`level${level}`]: schema } };
  }
  return schema;
};

const DEEP_PROPERTY_PATH = `${Array.from({ length: 12 }, (_, index) => `properties.level${index + 1}`).join(".")}.properties.tracking_code`;

const PROPERTY_KEYWORD_CASES = [
  ["properties", { type: "object", properties: { orderId: { type: "string" }, order_id: { type: "string" } } }, ["properties.order_id"]],
  ["nested properties", { type: "object", properties: { customer: { type: "object", properties: { Customer_Id: { type: "string" }, emailAddress: { type: "string" } } } } }, ["properties.customer.properties.Customer_Id"]],
  ["items", { type: "array", items: { type: "object", properties: { line_no: { type: "integer" } } } }, ["items.properties.line_no"]],
  ["tuple items", { type: "array", items: [{ type: "string" }, { type: "object", properties: { LineNo: { type: "integer" } } }] }, ["items.1.properties.LineNo"]],
  ["prefixItems", { type: "array", prefixItems: [{ type: "object", properties: { "line-no": { type: "integer" } } }] }, ["prefixItems.0.properties.line-no"]],
  ["additionalItems", { type: "array", items: [{ type: "string" }], additionalItems: { properties: { extra_item: {} } } }, ["additionalItems.properties.extra_item"]],
  ["unevaluatedItems", { type: "array", unevaluatedItems: { properties: { Unevaluated: {} } } }, ["unevaluatedItems.properties.Unevaluated"]],
  ["contains", { type: "array", contains: { properties: { contained_sku: {} } } }, ["contains.properties.contained_sku"]],
  ["additionalProperties", { type: "object", additionalProperties: { type: "object", properties: { map_value: {} } } }, ["additionalProperties.properties.map_value"]],
  ["unevaluatedProperties", { unevaluatedProperties: { properties: { "Not Evaluated": {} } } }, ["unevaluatedProperties.properties.Not Evaluated"]],
  ["patternProperties values, never their regular expressions", { type: "object", patternProperties: { "^Snake_[a-z]+$": { properties: { pattern_value: {} } } } }, ["patternProperties.^Snake_[a-z]+$.properties.pattern_value"]],
  ["allOf", { allOf: [{ type: "object" }, { properties: { all_of: {} } }] }, ["allOf.1.properties.all_of"]],
  ["anyOf", { anyOf: [{ properties: { cardNumber: {} } }, { properties: { iban_code: {} } }] }, ["anyOf.1.properties.iban_code"]],
  ["oneOf", { oneOf: [{ properties: { One_Of: {} } }, { type: "null" }] }, ["oneOf.0.properties.One_Of"]],
  ["not", { not: { properties: { not_allowed: {} } } }, ["not.properties.not_allowed"]],
  ["if, then and else", { if: { properties: { If_Field: {} } }, then: { properties: { then_field: {} } }, else: { properties: { "else-field": {} } } }, ["else.properties.else-field", "if.properties.If_Field", "then.properties.then_field"]],
  ["definitions", { definitions: { Address: { properties: { postal_code: {} } } } }, ["definitions.Address.properties.postal_code"]],
  ["$defs", { $defs: { Money: { properties: { Amount: {} } } } }, ["$defs.Money.properties.Amount"]],
  ["dependentSchemas", { dependentSchemas: { creditCard: { properties: { billing_address: {} } } } }, ["dependentSchemas.creditCard.properties.billing_address"]],
  ["dependencies in schema form, not in array form", { dependencies: { creditCard: { properties: { Billing: {} } }, iban: ["bic_code"] } }, ["dependencies.creditCard.properties.Billing"]],
  ["a JSON Schema nullable type array", { type: ["object", "null"], properties: { cancelled_at: { type: ["string", "null"], format: "date-time" } } }, ["properties.cancelled_at"]],
  ["an OpenAPI nullable object", { type: "object", nullable: true, properties: { CancelledAt: { type: "string", nullable: true } } }, ["properties.CancelledAt"]],
  ["properties named after schema keywords and extensions", { properties: { properties: { properties: { Type: {} } }, type: {}, fields: {}, items: {}, "x-trace": {} } }, ["properties.properties.properties.Type", "properties.x-trace"]],
  ["boolean subschemas", { properties: { anything: true, nothing: false, Any_Thing: true }, additionalProperties: false, items: true }, ["properties.Any_Thing"]],
  ["empty, numeric and non-ASCII property names", { properties: { "": {}, 42: {}, "2fa": {}, "usér": {}, ok: {} } }, ["properties.", "properties.2fa", "properties.42", "properties.usér"]],
  ["a property with an empty or invalid schema", { properties: { order_id: null, Customer: "string", line_items: [] } }, ["properties.Customer", "properties.line_items", "properties.order_id"]],
  ["a twelve-level property chain", deepPropertySchema(12), [DEEP_PROPERTY_PATH]],
  ["Avro record fields", { type: "record", name: "OrderPlaced", namespace: "com.acme.orders", fields: [{ name: "orderId", type: "string" }, { name: "order_total", type: "double" }] }, ["fields.1.name"]],
  ["an Avro error type", { type: "error", name: "PaymentFailed", fields: [{ name: "ErrorCode", type: "string" }] }, ["fields.0.name"]],
  ["a nullable Avro union", { type: "record", name: "Shipment", fields: [{ name: "carrier", type: ["null", { type: "record", name: "Carrier", fields: [{ name: "carrier_code", type: "string" }] }], default: null }] }, ["fields.0.type.1.fields.0.name"]],
  ["Avro arrays and maps", { type: "record", name: "Cart", fields: [{ name: "lines", type: { type: "array", items: { type: "record", name: "Line", fields: [{ name: "Sku", type: "string" }] } } }, { name: "attributes", type: { type: "map", values: { type: "record", name: "Attribute", fields: [{ name: "attr-value", type: "string" }] } } }] }, ["fields.0.type.items.fields.0.name", "fields.1.type.values.fields.0.name"]],
  ["a nested Avro type wrapper", { type: "record", name: "Envelope", fields: [{ name: "body", type: { type: { type: "record", name: "Body", fields: [{ name: "BodyText", type: "string" }] } } }] }, ["fields.0.type.type.fields.0.name"]],
  ["a union of Avro records", { type: "record", name: "Payment", fields: [{ name: "method", type: [{ type: "record", name: "Card", fields: [{ name: "card_number", type: "string" }] }, { type: "record", name: "Transfer", fields: [{ name: "iban", type: "string" }] }, "null"] }] }, ["fields.0.type.0.fields.0.name"]],
  ["a top-level Avro union", [{ type: "record", name: "Created", fields: [{ name: "created_by", type: "string" }] }, { type: "record", name: "Deleted", fields: [{ name: "deletedBy", type: "string" }] }], ["0.fields.0.name"]],
  [
    "Avro type names, namespaces, enum symbols, aliases, defaults and docs",
    {
      type: "record",
      name: "order_placed",
      namespace: "com.acme.Orders_V1",
      aliases: ["Order_Placed"],
      doc: "Uses order_id.",
      fields: [
        { name: "status", type: { type: "enum", name: "Order_Status", symbols: ["PENDING_PAYMENT", "shipped"] }, aliases: ["order_status"], default: "PENDING_PAYMENT", doc: "snake_case doc" },
        { name: "checksum", type: { type: "fixed", name: "MD5_Hash", size: 16 } },
        { name: "meta", type: "com.acme.Meta_Info", default: { Some_Key: 1 } },
      ],
    },
    [],
  ],
  [
    "values that are not schemas",
    {
      type: "object",
      required: ["order_id"],
      properties: { orderId: { type: "string", examples: [{ order_id: "1" }], default: "1" } },
      example: { properties: { Bad_Example: 1 } },
      examples: [{ properties: { Bad: 1 } }],
      default: { order_id: "1", properties: { Default_Key: 1 } },
      enum: [{ order_id: "1" }],
      const: { properties: { Const_Key: {} } },
      discriminator: "order_type",
      "x-properties": { properties: { x_bad: {} } },
      externalDocs: { url: "https://docs.acme.example.com" },
      title: "Order_Title",
      description: "Holds the order_id.",
    },
    [],
  ],
  ["an OpenAPI discriminator", { oneOf: [{ properties: { cardNumber: {} } }], discriminator: { propertyName: "payment_type", mapping: { card_payment: "#/components/schemas/Card" } } }, []],
  ["propertyNames", { type: "object", propertyNames: { pattern: "^[a-z]+$", properties: { Not_Walked: {} } } }, []],
  ["Avro fields without a usable name", { type: "record", name: "Sparse", fields: [{ type: "string" }, { name: null, type: "int" }, null, "order_id", 42, ["order_id"]] }, []],
  ["an Avro record whose fields are not an array", { type: "record", name: "Broken", fields: { order_id: "string" } }, []],
  ["fields outside an Avro record", { type: "object", fields: [{ name: "order_id" }] }, []],
  ["properties that are not a map", { type: "object", properties: ["order_id"], items: [{ properties: null }, { properties: "order_id" }] }, []],
];

const NON_STRING_AVRO_NAMES = [
  [42, "Avro field 42 must be camelCase."],
  [0, "Avro field 0 must be camelCase."],
  [true, "Avro field true must be camelCase."],
  [false, "Avro field false must be camelCase."],
  [{ value: "orderId" }, 'Avro field {"value":"orderId"} must be camelCase.'],
  [["orderId"], 'Avro field ["orderId"] must be camelCase.'],
  ["", "Avro field '' must be camelCase."],
  [" orderId", "Avro field ' orderId' must be camelCase."],
];

const PROPERTY_FORMAT_CASES = [
  [undefined, "json"],
  [null, "json"],
  ["application/vnd.aai.asyncapi;version=2.6.0", "json"],
  ["application/vnd.aai.asyncapi+json;version=3.0.0", "json"],
  ["application/vnd.aai.asyncapi+yaml;version=3.1.0", "json"],
  ["APPLICATION/VND.AAI.ASYNCAPI+JSON;VERSION=2.6.0", "json"],
  ["application/schema+json;version=draft-07", "json"],
  ["application/schema+yaml;version=draft-07", "json"],
  ["application/vnd.oai.openapi;version=3.0.0", "json"],
  ["application/vnd.oai.openapi+json;version=3.0.0", "json"],
  ["application/vnd.oai.openapi+yaml;version=3.0.0", "json"],
  ["application/vnd.apache.avro;version=1.9.0", "avro"],
  ["application/vnd.apache.avro+json;version=1.9.0", "avro"],
  ["application/vnd.apache.avro+yaml;version=1.9.0", "avro"],
  ["application/vnd.apache.avro", "avro"],
  [" Application/Vnd.Apache.Avro ; version=1.9.0", "avro"],
  ["application/raml+yaml;version=1.0", null],
  ["application/vnd.google.protobuf;version=3", null],
  ["application/x-protobuf", null],
  ["application/json", null],
  ["application/xml", null],
  ["", null],
  [42, null],
  [true, null],
  [{}, null],
  [["application/vnd.apache.avro;version=1.9.0"], null],
];

const PROPERTY_FORMAT_PAYLOADS = {
  json: { type: "object", properties: { orderId: { type: "string" }, order_id: { type: "string" } } },
  avro: { type: "record", name: "OrderPlaced", fields: [{ name: "orderId", type: "string" }, { name: "order_id", type: "string" }] },
};

const PROPERTY_FORMAT_FINDINGS = { json: ["properties.order_id"], avro: ["fields.1.name"] };

const AVRO_TEXT_SCHEMA = JSON.stringify({ type: "record", name: "OrderPlaced", fields: [{ name: "orderId", type: "string" }, { name: "order_id", type: "string" }, { name: "Line_Count", type: "int" }] });

const chars = (...codes) => String.fromCharCode(...codes);
const INFO_DEFAULT_FIELDS = ["title", "version", "description"];
const INFO_V2_FIELDS = [...INFO_DEFAULT_FIELDS, "termsOfService", "contact", "license"];
const INFO_V3_FIELDS = [...INFO_V2_FIELDS, "tags", "externalDocs"];
const infoText = (name) => ({ $ref: `#/components/x-texts/${name}` });
const infoTarget = (name) => ({ $ref: `#/components/x-info/${name}` });

const INFO_COMPONENTS = {
  "x-texts": {
    summary: "Order lifecycle events published by the commerce platform.",
    alias: infoText("summary"),
    aliasTwice: infoText("alias"),
    empty: "",
    blank: " \t ",
    nothing: null,
    emptyObject: {},
    emptyList: [],
    number: 2,
    falsy: false,
    emptyAlias: infoText("empty"),
    cycleA: infoText("cycleB"),
    cycleB: infoText("cycleA"),
    self: infoText("self"),
    "a/b": "Escaped pointer text.",
    "with space": "Percent-encoded pointer text.",
    external: { $ref: "./shared/info-texts.yaml#/description" },
    list: ["Order lifecycle events."],
    contact: { name: "Commerce Integration", email: "integration@commerce.example.io" },
  },
  "x-info": {
    complete: { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." },
    sparse: { title: "Commerce Events", version: "" },
    empty: {},
    alias: infoTarget("complete"),
    sparseAlias: infoTarget("sparse"),
    cycleA: infoTarget("cycleB"),
    cycleB: infoTarget("cycleA"),
    list: [{ title: "Commerce Events", version: "4.2.0", description: "Listed info." }],
    text: "Commerce Events",
    nothing: null,
  },
};

const INFO_VALUE_CASES = [
  ["a plain string", "Order lifecycle events.", true],
  ["a single character", "x", true],
  ["a string with surrounding spaces", "  Order events  ", true],
  ["a multi-line string", "Order events.\n\nPublished by the commerce platform.\n", true],
  ["the string null", "null", true],
  ["the string 0", "0", true],
  ["a string made of dots", "...", true],
  ["a non-Latin string", "注文イベント", true],
  ["a very long string", "Order events. ".repeat(5000), true],
  ["text between zero-width characters", `${chars(0x200b)}Orders${chars(0xfeff)}`, true],
  ["zero", 0, true],
  ["a decimal number", 1.5, true],
  ["a negative number", -1, true],
  ["true", true, true],
  ["false", false, true],
  ["a non-empty object", { url: "https://commerce.example.io" }, true],
  ["an object with only an extension", { "x-team": "commerce" }, true],
  ["a non-empty array", ["Order events."], true],
  ["an array with a null item", [null], true],
  ["an empty string", "", false],
  ["a space", " ", false],
  ["several spaces", "     ", false],
  ["a tab", "\t", false],
  ["a newline", "\n", false],
  ["mixed whitespace", " \t\r\n \n", false],
  ["very long whitespace", " ".repeat(100000), false],
  ["non-breaking spaces", chars(0xa0, 0xa0), false],
  ["an ideographic space", chars(0x3000), false],
  ["em and thin spaces", chars(0x2003, 0x2009), false],
  ["line and paragraph separators", chars(0x2028, 0x2029), false],
  ["zero-width characters", chars(0x200b, 0x200c, 0x200d, 0x2060), false],
  ["a byte order mark", chars(0xfeff), false],
  ["zero-width characters between spaces", ` ${chars(0x200b)} \t${chars(0xfeff)} `, false],
  ["null", null, false],
  ["an empty object", {}, false],
  ["an empty array", [], false],
  ["a local reference to a text", infoText("summary"), true],
  ["a chained reference", infoText("alias"), true],
  ["a reference chained twice", infoText("aliasTwice"), true],
  ["a reference to a number", infoText("number"), true],
  ["a reference to false", infoText("falsy"), true],
  ["a reference to a non-empty object", infoText("contact"), true],
  ["a reference to a non-empty array", infoText("list"), true],
  ["a pointer into an array item", { $ref: "#/components/x-texts/list/0" }, true],
  ["an escaped pointer", { $ref: "#/components/x-texts/a~1b" }, true],
  ["a percent-encoded pointer", { $ref: "#/components/x-texts/with%20space" }, true],
  ["an external reference", { $ref: "./shared/info-texts.yaml#/description" }, true],
  ["an external whole-file reference", { $ref: "https://specs.example.io/texts/description.yaml" }, true],
  ["a local alias of an external text", infoText("external"), true],
  ["a reference to an empty string", infoText("empty"), false],
  ["a reference to a blank string", infoText("blank"), false],
  ["a reference to null", infoText("nothing"), false],
  ["a reference to an empty object", infoText("emptyObject"), false],
  ["a reference to an empty array", infoText("emptyList"), false],
  ["a chain that ends in an empty string", infoText("emptyAlias"), false],
  ["a reference with siblings, which are ignored", { $ref: "#/components/x-texts/empty", text: "Ignored sibling." }, false],
  ["a dangling reference", infoText("missing"), false],
  ["a pointer past the end of an array", { $ref: "#/components/x-texts/list/5" }, false],
  ["a cyclic reference", infoText("cycleA"), false],
  ["a self reference", infoText("self"), false],
  ["a reference to the document root", { $ref: "#" }, false],
  ["an empty reference, which points to the document itself", { $ref: "" }, false],
  ["a pointer without a leading slash", { $ref: "#components/x-texts/summary" }, false],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-texts/%E0%A4%A" }, false],
  ["a non-string reference", { $ref: 42 }, false],
  ["a null reference", { $ref: null }, false],
];

const INFO_OBJECT_CASES = [
  ["an inline info object with every default field", { title: "Commerce Events", version: "4.2.0", description: "Order events." }, []],
  ["an empty info object", {}, [["info", "missing", "title"], ["info", "missing", "version"], ["info", "missing", "description"]]],
  ["a reference to a complete info object", infoTarget("complete"), []],
  ["a chained reference to a complete info object", infoTarget("alias"), []],
  ["a reference with siblings, which are ignored", { ...infoTarget("complete"), title: "" }, []],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ["a reference to a sparse info object", infoTarget("sparse"), [["components.x-info.sparse", "missing", "description"], ["components.x-info.sparse.version", "empty", "version"]]],
  ["a chained reference to a sparse info object", infoTarget("sparseAlias"), [["components.x-info.sparse", "missing", "description"], ["components.x-info.sparse.version", "empty", "version"]]],
  ["a reference to an empty object", infoTarget("empty"), [["components.x-info.empty", "missing", "title"], ["components.x-info.empty", "missing", "version"], ["components.x-info.empty", "missing", "description"]]],
  ["a null info", null, [["info", "invalid"]]],
  ["an empty string", "", [["info", "invalid"]]],
  ["a title instead of an object", "Commerce Events", [["info", "invalid"]]],
  ["zero", 0, [["info", "invalid"]]],
  ["a number", 42, [["info", "invalid"]]],
  ["true", true, [["info", "invalid"]]],
  ["false", false, [["info", "invalid"]]],
  ["an empty list", [], [["info", "invalid"]]],
  ["a list holding an info object", [{ title: "Commerce Events", version: "4.2.0", description: "Order events." }], [["info", "invalid"]]],
  ["a dangling reference", infoTarget("missing"), [["info", "invalid"]]],
  ["a cyclic reference", infoTarget("cycleA"), [["info", "invalid"]]],
  ["a reference to the document root", { $ref: "#" }, [["info", "invalid"]]],
  ["an empty reference", { $ref: "" }, [["info", "invalid"]]],
  ["a reference to a list", infoTarget("list"), [["info", "invalid"]]],
  ["a reference to a string", infoTarget("text"), [["info", "invalid"]]],
  ["a reference to null", infoTarget("nothing"), [["info", "invalid"]]],
  ["a pointer without a leading slash", { $ref: "#components/x-info/complete" }, [["info", "invalid"]]],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-info/%E0%A4%A" }, [["info", "invalid"]]],
  ["a non-string reference", { $ref: 42 }, [["info", "invalid"]]],
  ["a null reference", { $ref: null }, [["info", "invalid"]]],
];

const INFO_PROBE = {
  title: "Fleet Telemetry",
  version: "  ",
  termsOfService: "https://fleet.example.io/terms",
  contact: {},
  tags: [],
  externalDocs: { url: "https://fleet.example.io/docs" },
  "x-audience": "external-partner",
  "x-api-id": "",
  "x-team.owner_id": null,
};

const INFO_PROBE_STATES = {
  title: "populated",
  version: "empty",
  description: "missing",
};

const INFO_OPTION_CASES = [
  ["the former default list", "title,version,description"],
  ["an empty string", ""],
  ["a blank string", "  \t "],
  ["only commas and spaces", " , ,, "],
  ["only the title", "title"],
  ["only the description", "description"],
  ["two padded names in another order", "  description ,  title "],
  ["duplicated names", "title,title,version,title"],
  ["empty entries between names", ",title,,version,"],
  ["fixed fields in any case", "Title,VERSION,Description"],
  ["camelCase fields written in lower and upper case", "termsofservice,EXTERNALDOCS,Contact"],
  ["every AsyncAPI 2.x info field", INFO_V2_FIELDS.join(",")],
  ["every AsyncAPI 3.x info field", INFO_V3_FIELDS.join(",")],
  ["only the 3.x-only fields", "tags,externalDocs"],
  ["one extension", "x-audience"],
  ["several extensions", "x-audience,x-api-id,x-owner"],
  ["an extension with dots and underscores", "x-team.owner_id"],
  ["padded extensions and fields", "  x-api-id  ,  contact "],
  ["an extension with an upper-case prefix", "X-Audience"],
  ["a bare extension prefix", "x-"],
  ["an extension with a forbidden character", "x-audience!"],
  ["nested paths, prefixed names and fields the info object does not define", "contact.email,info.title,$.info.version,owner,summary,servers,id"],
  ["an unusable name next to a usable one", "owner,license"],
  ["names separated by spaces", "title version"],
  ["names separated by semicolons", "title;version"],
  ["an array of names", ["title", "contact"]],
  ["an array of comma-separated lists", ["title, version", "license"]],
  ["an array with non-string items", [null, 7, "license", {}, ["title"]]],
  ["an empty array", []],
  ["null", null],
  ["a number", 42],
  ["true", true],
  ["an object", { title: true }],
];

const quotedList = (fields) => {
  const quoted = fields.map((field) => `'${field}'`);
  return quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`;
};

const INFO_MESSAGES = {
  missing: (field) => `AAR075: The 'info' object must declare the mandatory field '${field}'.`,
  empty: (field) => `AAR075: The mandatory 'info' field '${field}' must not be empty.`,
  invalid: () => `AAR075: The document must declare an 'info' object with the mandatory fields ${quotedList(INFO_DEFAULT_FIELDS)}.`,
};

const infoProbeFindings = () =>
  Object.entries(INFO_PROBE_STATES)
    .filter(([, state]) => state !== "populated")
    .map(([field, state]) => (state === "missing" ? ["info", INFO_MESSAGES.missing(field)] : [`info.${field}`, INFO_MESSAGES.empty(field)]));

const TAG_DEFAULT_FIELDS = ["name", "description"];
const tagTarget = (name) => ({ $ref: `#/components/x-tags/${name}` });
const tagList = (name) => ({ $ref: `#/components/x-tag-lists/${name}` });
const DOCS = { description: "Tag handbook.", url: "https://docs.example.io/tags" };

const TAG_COMPONENTS = {
  "x-tags": {
    complete: { name: "orders", description: "Order lifecycle events.", externalDocs: DOCS, "x-owner": "commerce-platform" },
    sparse: { name: "payments", description: "" },
    nameless: { description: "Shipment events." },
    empty: {},
    alias: tagTarget("complete"),
    indirect: tagTarget("alias"),
    sparseAlias: tagTarget("sparse"),
    cycleA: tagTarget("cycleB"),
    cycleB: tagTarget("cycleA"),
    self: tagTarget("self"),
    list: [{ name: "orders", description: "Listed tag." }],
    text: "orders",
    nothing: null,
    external: { $ref: "./shared/tags.yaml#/orders" },
    "a/b": { name: "escaped", description: "Escaped pointer." },
    "with space": { name: "spaced", description: "Percent-encoded pointer." },
  },
  "x-tag-lists": {
    complete: [{ name: "invoices", description: "Invoice events." }, tagTarget("complete")],
    sparse: [{ name: "refunds" }, { name: "chargebacks", description: "Card chargebacks." }],
    alias: tagList("complete"),
    sparseAlias: tagList("sparse"),
    external: { $ref: "./shared/tags.yaml#/list" },
    notAList: { name: "orders" },
  },
  "x-messages": {
    intermediate: { $ref: "#/components/x-messages/target" },
    target: { tags: [{ name: "via-intermediate", description: "Reached through another reference." }] },
  },
};

const TAG_ITEM_CASES = [
  ["an inline tag with every default field", { name: "orders", description: "Order events." }, []],
  ["an inline tag with an extra externalDocs", { name: "orders", description: "Order events.", externalDocs: DOCS }, []],
  ["an empty tag object", {}, [["", "missing", "name"], ["", "missing", "description"]]],
  ["a tag without description", { name: "orders" }, [["", "missing", "description", "orders"]]],
  ["a tag without name", { description: "Order events." }, [["", "missing", "name"]]],
  ["a tag with only an externalDocs", { externalDocs: DOCS }, [["", "missing", "name"], ["", "missing", "description"]]],
  ["a tag whose keys differ in case", { Name: "orders", DESCRIPTION: "Order events." }, [["", "missing", "name"], ["", "missing", "description"]]],
  ["a tag with an empty name", { name: "", description: "Order events." }, [["name", "empty", "name"]]],
  ["a tag with a blank name and no description", { name: " \t" }, [["name", "empty", "name"], ["", "missing", "description"]]],
  ["a tag with a null description", { name: "orders", description: null }, [["description", "empty", "description", "orders"]]],
  ["a tag with both fields empty", { name: null, description: "" }, [["name", "empty", "name"], ["description", "empty", "description"]]],
  ["a tag with a numeric name", { name: 2024, description: "" }, [["description", "empty", "description"]]],
  ["a tag whose name is a reference to a text", { name: { $ref: "#/components/x-texts/summary" }, description: "" }, [["description", "empty", "description", "Order lifecycle events published by the commerce platform."]]],
  ["a reference to a complete tag", tagTarget("complete"), []],
  ["a chained reference to a complete tag", tagTarget("alias"), []],
  ["a reference chained twice", tagTarget("indirect"), []],
  ["a reference with siblings, which are ignored", { ...tagTarget("complete"), description: "" }, []],
  ["an escaped pointer", { $ref: "#/components/x-tags/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-tags/with%20space" }, []],
  ["a pointer into a list item", { $ref: "#/components/x-tag-lists/complete/0" }, []],
  ["an external reference", { $ref: "./shared/tags.yaml#/orders" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/tags/orders.yaml" }, []],
  ["a local alias of an external tag", tagTarget("external"), []],
  ["a reference to a sparse tag", tagTarget("sparse"), [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a chained reference to a sparse tag", tagTarget("sparseAlias"), [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a sparse tag whose siblings would complete it", { ...tagTarget("sparse"), description: "Ignored sibling." }, [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a reference to a nameless tag", tagTarget("nameless"), [["components.x-tags.nameless", "missing", "name"]]],
  ["a reference to an empty object", tagTarget("empty"), [["components.x-tags.empty", "missing", "name"], ["components.x-tags.empty", "missing", "description"]]],
  ["a pointer into a sparse list item", { $ref: "#/components/x-tag-lists/sparse/0" }, [["components.x-tag-lists.sparse.0", "missing", "description", "refunds"]]],
  ["null", null, [["", "invalid"]]],
  ["an empty string", "", [["", "invalid"]]],
  ["a blank string", " \t ", [["", "invalid"]]],
  ["a tag name instead of an object", "orders", [["", "named", "orders"]]],
  ["zero", 0, [["", "invalid"]]],
  ["a number", 42, [["", "invalid"]]],
  ["true", true, [["", "invalid"]]],
  ["false", false, [["", "invalid"]]],
  ["an empty list", [], [["", "invalid"]]],
  ["a list holding a tag", [{ name: "orders", description: "Order events." }], [["", "invalid"]]],
  ["a dangling reference", tagTarget("missing"), [["", "reference", "#/components/x-tags/missing"]]],
  ["a cyclic reference", tagTarget("cycleA"), [["", "reference", "#/components/x-tags/cycleA"]]],
  ["a self reference", tagTarget("self"), [["", "reference", "#/components/x-tags/self"]]],
  ["a reference to the document root", { $ref: "#" }, [["", "reference", "#"]]],
  ["an empty reference, which points to the document itself", { $ref: "" }, [["", "reference", ""]]],
  ["a reference to a list", tagTarget("list"), [["", "reference", "#/components/x-tags/list"]]],
  ["a reference to a string", tagTarget("text"), [["", "reference", "#/components/x-tags/text"]]],
  ["a reference to null", tagTarget("nothing"), [["", "reference", "#/components/x-tags/nothing"]]],
  ["a pointer past the end of a list", { $ref: "#/components/x-tag-lists/complete/5" }, [["", "reference", "#/components/x-tag-lists/complete/5"]]],
  ["a pointer through another reference, which Spectral does not resolve either", { $ref: "#/components/x-messages/intermediate/tags/0" }, [["", "reference", "#/components/x-messages/intermediate/tags/0"]]],
  ["a pointer without a leading slash", { $ref: "#components/x-tags/complete" }, [["", "reference", "#components/x-tags/complete"]]],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-tags/%E0%A4%A" }, [["", "reference", "#/components/x-tags/%E0%A4%A"]]],
  ["a non-string reference", { $ref: 42 }, [["", "reference", 42]]],
  ["a null reference", { $ref: null }, [["", "reference", null]]],
];

const TAG_LIST_CASES = [
  ["absent", undefined, []],
  ["null", null, []],
  ["an empty list", [], []],
  ["an object instead of a list", { name: "orders" }, []],
  ["a string instead of a list", "orders", []],
  ["a reference to a complete list", tagList("complete"), []],
  ["a chained reference to a complete list", tagList("alias"), []],
  ["an external reference", tagList("external"), []],
  ["a dangling reference", tagList("missing"), []],
  ["a reference to something that is not a list", tagList("notAList"), []],
  ["a reference to a sparse list", tagList("sparse"), [["components.x-tag-lists.sparse.0", "missing", "description", "refunds"]]],
  ["a chained reference to a sparse list", tagList("sparseAlias"), [["components.x-tag-lists.sparse.0", "missing", "description", "refunds"]]],
  [
    "two identical incomplete tags",
    [{ name: "orders" }, { name: "orders" }],
    [["0", "missing", "description", "orders"], ["1", "missing", "description", "orders"]],
  ],
  ["two references to the same sparse tag", [tagTarget("sparse"), tagTarget("sparseAlias")], [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a complete tag next to null and a tag name", [{ name: "orders", description: "Order events." }, null, "payments"], [["1", "invalid"], ["2", "named", "payments"]]],
];

const TAG_PROBE = [
  { name: "fleet-telemetry", description: "  ", "x-owner": "fleet-team", "x-review": "" },
  { description: "Vehicle positions.", externalDocs: DOCS, "x-team.owner_id": null },
  { name: "", description: null, externalDocs: {}, "x-lifecycle": "ga", "x-review": "approved" },
  { name: "maintenance", description: "Workshop events.", externalDocs: { $ref: "#/components/x-texts/emptyObject" }, "x-owner": [] },
];

const TAG_PROBE_STATES = [
  ["fleet-telemetry", { name: "populated", description: "empty" }],
  [undefined, { description: "populated" }],
  [undefined, { name: "empty", description: "empty" }],
  ["maintenance", { name: "populated", description: "populated" }],
];

const TAG_OPTION_CASES = [
  ["the former default list", "name,description"],
  ["an empty string", ""],
  ["a blank string", "  \t "],
  ["only commas and spaces", " , ,, "],
  ["only the name", "name"],
  ["only the description", "description"],
  ["only the externalDocs", "externalDocs"],
  ["two padded names in another order", "  description ,  name "],
  ["duplicated names", "name,NAME,description,name"],
  ["empty entries between names", ",name,,description,"],
  ["fixed fields in any case", "Name,DESCRIPTION,externaldocs"],
  ["every Tag object field", "name,description,externalDocs"],
  ["one extension", "x-owner"],
  ["several extensions", "x-owner,x-review,x-lifecycle"],
  ["an extension with dots and underscores", "x-team.owner_id"],
  ["every field and extension", "name,description,externalDocs,x-owner,x-review,x-lifecycle,x-team.owner_id"],
  ["padded extensions and fields", "  x-owner  ,  externalDocs "],
  ["an extension written in another case is matched as written", "x-Owner"],
  ["an extension with an upper-case prefix", "X-Owner"],
  ["a bare extension prefix", "x-"],
  ["an extension with a forbidden character", "x-owner!"],
  ["nested paths and prefixed names", "externalDocs.url,tags.name,$.tags.description,info.title"],
  ["fields a Tag object does not define", "title,summary,url,version,id,tags"],
  ["an unusable name next to a usable one", "owner,externalDocs"],
  ["names separated by spaces", "name description"],
  ["names separated by semicolons", "name;description"],
  ["an array of names", ["name", "externalDocs"]],
  ["an array of comma-separated lists", ["name, description", "x-owner"]],
  ["an array with non-string items", [null, 7, "externalDocs", {}, ["name"], true]],
  ["an array of blanks", ["", "  "]],
  ["an empty array", []],
  ["null", null],
  ["a number", 42],
  ["true", true],
  ["an object", { name: true }],
];

const quoteRef = (value) => (typeof value === "string" ? `'${value}'` : JSON.stringify(value));

const TAG_MESSAGES = {
  missing: (field, name) => `AAR076: ${name === undefined ? "The tag" : `Tag '${name}'`} must declare the mandatory field '${field}'.`,
  empty: (field, name) => `AAR076: The mandatory field '${field}' of ${name === undefined ? "the tag" : `tag '${name}'`} must not be empty.`,
  invalid: () => `AAR076: The tag must be a Tag object with the mandatory fields ${quotedList(TAG_DEFAULT_FIELDS)}.`,
  named: (name) => `AAR076: Tag '${name}' must be a Tag object with the mandatory fields ${quotedList(TAG_DEFAULT_FIELDS)}.`,
  reference: (ref) => `AAR076: The tag reference ${quoteRef(ref)} must resolve to a Tag object with the mandatory fields ${quotedList(TAG_DEFAULT_FIELDS)}.`,
};

const tagFinding = (base, [path, kind, detail, name]) => {
  const at = path === "" ? base : /^\d+$/.test(path) || ["name", "description"].includes(path) ? `${base}.${path}` : path;
  if (kind === "missing") return [at, TAG_MESSAGES.missing(detail, name)];
  if (kind === "empty") return [at, TAG_MESSAGES.empty(detail, name)];
  return [at, TAG_MESSAGES[kind](detail)];
};

const tagFindings = (tags, invalid = []) => [
  ...tags.flatMap(([path, name, states]) =>
    TAG_DEFAULT_FIELDS
      .filter((field) => states[field] !== "populated")
      .map((field) => (states[field] === "empty" ? [`${path}.${field}`, TAG_MESSAGES.empty(field, name)] : [path, TAG_MESSAGES.missing(field, name)]))
  ),
  ...invalid.map(([path, kind, detail]) => [path, TAG_MESSAGES[kind](detail)]),
];

const tagProbeFindings = (base) => tagFindings(TAG_PROBE_STATES.map(([name, states], index) => [`${base}.${index}`, name, states]));

const CONTACT_FIELDS = ["name", "email"];
const contactTarget = (name) => ({ $ref: `#/components/x-contacts/${name}` });
const CONTACT_COMPLETE = { name: "Commerce Integration", url: "https://commerce.example.io/integration", email: "integration@commerce.example.io" };
const CONTACT_MINIMAL = { name: "Commerce Integration", email: "integration@commerce.example.io" };

const CONTACT_COMPONENTS = {
  ...INFO_COMPONENTS,
  "x-contacts": {
    complete: CONTACT_COMPLETE,
    minimal: CONTACT_MINIMAL,
    alias: contactTarget("complete"),
    aliasTwice: contactTarget("alias"),
    sparse: { url: "https://commerce.example.io/integration", email: " \t " },
    sparseAlias: contactTarget("sparse"),
    empty: {},
    extensionsOnly: { url: "https://commerce.example.io/integration", "x-slack": "#commerce-integration" },
    caseKeys: { Name: "Commerce Integration", EMAIL: "integration@commerce.example.io" },
    cycleA: contactTarget("cycleB"),
    cycleB: contactTarget("cycleA"),
    self: contactTarget("self"),
    list: [CONTACT_COMPLETE],
    text: "Commerce Integration",
    nothing: null,
    external: { $ref: "./shared/contacts.yaml#/integration" },
    "a/b": CONTACT_COMPLETE,
    "with space": CONTACT_MINIMAL,
  },
  "x-info": {
    ...INFO_COMPONENTS["x-info"],
    withContact: { title: "Commerce Events", version: "4.2.0", contact: contactTarget("complete") },
    withContactAlias: infoTarget("withContact"),
    withSparseContact: { title: "Commerce Events", version: "4.2.0", contact: { name: "", url: "https://commerce.example.io/integration" } },
  },
};

const CONTACT_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["an email address", "integration@commerce.example.io", true],
  ["a pointer to a field of another contact", { $ref: "#/components/x-contacts/complete/email" }, true],
  ["a pointer through a chained contact, which Spectral cannot resolve either", { $ref: "#/components/x-contacts/alias/email" }, false],
  ["a pointer to an empty field of another contact", { $ref: "#/components/x-contacts/sparse/email" }, false],
];

const bothMissing = (path) => CONTACT_FIELDS.map((field) => [path, "missing", field]);

const CONTACT_OBJECT_CASES = [
  ["an inline contact with name, url and email", CONTACT_COMPLETE, []],
  ["an inline contact with only name and email", CONTACT_MINIMAL, []],
  ["an inline contact with an empty url and empty extensions", { ...CONTACT_MINIMAL, url: "", "x-slack": null, "x-team": {} }, []],
  ["an empty contact object", {}, bothMissing("info.contact")],
  ["a contact with only a url", { url: "https://commerce.example.io/integration" }, bothMissing("info.contact")],
  ["a contact with only extensions", { "x-slack": "#commerce", "x-owner": "platform-team" }, bothMissing("info.contact")],
  ["a contact without name", { url: "https://commerce.example.io/integration", email: "integration@commerce.example.io" }, [["info.contact", "missing", "name"]]],
  ["a contact without email", { name: "Commerce Integration", url: "https://commerce.example.io/integration" }, [["info.contact", "missing", "email"]]],
  ["a contact whose keys differ in case", { Name: "Commerce Integration", NAME: "Commerce", Email: "a@commerce.example.io", EMAIL: "b@commerce.example.io" }, bothMissing("info.contact")],
  ["a contact with look-alike keys", { "contact-name": "Commerce", fullName: "Commerce Integration", mail: "a@commerce.example.io", "e-mail": "b@commerce.example.io", emailAddress: "c@commerce.example.io" }, bothMissing("info.contact")],
  ["a contact with a blank name and a null email", { name: "  ", email: null }, [["info.contact.name", "empty", "name"], ["info.contact.email", "empty", "email"]]],
  ["a reference to a complete contact", contactTarget("complete"), []],
  ["a reference to a contact with only name and email", contactTarget("minimal"), []],
  ["a chained reference", contactTarget("alias"), []],
  ["a reference chained twice", contactTarget("aliasTwice"), []],
  ["a reference with siblings, which are ignored", { ...contactTarget("complete"), name: "", email: null }, []],
  ["a reference to an empty contact with populated siblings, which are ignored", { $ref: "#/components/x-contacts/empty", ...CONTACT_MINIMAL }, bothMissing("components.x-contacts.empty")],
  ["a pointer into an array item", { $ref: "#/components/x-contacts/list/0" }, []],
  ["an escaped pointer", { $ref: "#/components/x-contacts/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-contacts/with%20space" }, []],
  ["an external reference", { $ref: "./shared/contacts.yaml#/integration" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/contact.yaml" }, []],
  ["a local alias of an external contact", contactTarget("external"), []],
  ["a reference to a sparse contact", contactTarget("sparse"), [["components.x-contacts.sparse", "missing", "name"], ["components.x-contacts.sparse.email", "empty", "email"]]],
  ["a chained reference to a sparse contact", contactTarget("sparseAlias"), [["components.x-contacts.sparse", "missing", "name"], ["components.x-contacts.sparse.email", "empty", "email"]]],
  ["a reference to an empty contact", contactTarget("empty"), bothMissing("components.x-contacts.empty")],
  ["a reference to a contact with only a url and extensions", contactTarget("extensionsOnly"), bothMissing("components.x-contacts.extensionsOnly")],
  ["a reference to a contact whose keys differ in case", contactTarget("caseKeys"), bothMissing("components.x-contacts.caseKeys")],
  ["a null contact", null, [["info.contact", "noContact"]]],
  ["an empty string", "", [["info.contact", "noContact"]]],
  ["a name instead of an object", "Commerce Integration", [["info.contact", "noContact"]]],
  ["an email instead of an object", "integration@commerce.example.io", [["info.contact", "noContact"]]],
  ["zero", 0, [["info.contact", "noContact"]]],
  ["a number", 42, [["info.contact", "noContact"]]],
  ["true", true, [["info.contact", "noContact"]]],
  ["false", false, [["info.contact", "noContact"]]],
  ["an empty list", [], [["info.contact", "noContact"]]],
  ["a list holding a contact", [CONTACT_COMPLETE], [["info.contact", "noContact"]]],
  ["a dangling reference", contactTarget("missing"), [["info.contact", "noContact"]]],
  ["a pointer past the end of an array", { $ref: "#/components/x-contacts/list/3" }, [["info.contact", "noContact"]]],
  ["a reference to the info contact itself", { $ref: "#/info/contact" }, [["info.contact", "noContact"]]],
  ["a cyclic reference", contactTarget("cycleA"), [["info.contact", "noContact"]]],
  ["a self reference", contactTarget("self"), [["info.contact", "noContact"]]],
  ["a reference to the document root", { $ref: "#" }, [["info.contact", "noContact"]]],
  ["an empty reference, which points to the document itself", { $ref: "" }, [["info.contact", "noContact"]]],
  ["a reference to a list", contactTarget("list"), [["info.contact", "noContact"]]],
  ["a reference to a string", contactTarget("text"), [["info.contact", "noContact"]]],
  ["a reference to null", contactTarget("nothing"), [["info.contact", "noContact"]]],
  ["a pointer without a leading slash", { $ref: "#components/x-contacts/complete" }, [["info.contact", "noContact"]]],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-contacts/%E0%A4%A" }, [["info.contact", "noContact"]]],
  ["a non-string reference", { $ref: 42 }, [["info.contact", "noContact"]]],
  ["a null reference", { $ref: null }, [["info.contact", "noContact"]]],
];

const CONTACT_INFO_CASES = [
  ["an inline info object with a complete contact", { title: "Commerce Events", version: "4.2.0", contact: CONTACT_COMPLETE }, []],
  ["an info object with only a contact", { contact: CONTACT_MINIMAL }, []],
  ["an info object without contact", { title: "Commerce Events", version: "4.2.0", description: "Order events." }, [["info", "noContact"]]],
  ["an empty info object", {}, [["info", "noContact"]]],
  ["an info object whose contact key differs in case", { title: "Commerce Events", Contact: CONTACT_COMPLETE, CONTACT: CONTACT_MINIMAL }, [["info", "noContact"]]],
  ["an info object with contact look-alikes", { title: "Commerce Events", "x-contact": CONTACT_COMPLETE, contacts: [CONTACT_COMPLETE], owner: CONTACT_MINIMAL }, [["info", "noContact"]]],
  ["a reference to an info object with a referenced contact", infoTarget("withContact"), []],
  ["a chained reference to that info object", infoTarget("withContactAlias"), []],
  ["a reference with siblings, which are ignored", { ...infoTarget("withContact"), contact: null }, []],
  ["a reference to an info object with a sparse contact", infoTarget("withSparseContact"), [["components.x-info.withSparseContact.contact", "missing", "email"], ["components.x-info.withSparseContact.contact.name", "empty", "name"]]],
  ["a reference to an info object without contact", infoTarget("complete"), [["components.x-info.complete", "noContact"]]],
  ["a chained reference to an info object without contact", infoTarget("alias"), [["components.x-info.complete", "noContact"]]],
  ["a reference to an empty info object", infoTarget("empty"), [["components.x-info.empty", "noContact"]]],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ["a null info", null, [["info", "noInfo"]]],
  ["an empty string", "", [["info", "noInfo"]]],
  ["a title instead of an object", "Commerce Events", [["info", "noInfo"]]],
  ["zero", 0, [["info", "noInfo"]]],
  ["a number", 42, [["info", "noInfo"]]],
  ["true", true, [["info", "noInfo"]]],
  ["false", false, [["info", "noInfo"]]],
  ["an empty list", [], [["info", "noInfo"]]],
  ["a list holding an info object with a contact", [{ title: "Commerce Events", contact: CONTACT_COMPLETE }], [["info", "noInfo"]]],
  ["a dangling reference", infoTarget("missing"), [["info", "noInfo"]]],
  ["a cyclic reference", infoTarget("cycleA"), [["info", "noInfo"]]],
  ["a reference to the document root", { $ref: "#" }, [["info", "noInfo"]]],
  ["an empty reference", { $ref: "" }, [["info", "noInfo"]]],
  ["a reference to a list", infoTarget("list"), [["info", "noInfo"]]],
  ["a reference to a string", infoTarget("text"), [["info", "noInfo"]]],
  ["a reference to null", infoTarget("nothing"), [["info", "noInfo"]]],
  ["a pointer without a leading slash", { $ref: "#components/x-info/withContact" }, [["info", "noInfo"]]],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-info/%E0%A4%A" }, [["info", "noInfo"]]],
  ["a non-string reference", { $ref: 42 }, [["info", "noInfo"]]],
  ["a null reference", { $ref: null }, [["info", "noInfo"]]],
];

const CONTACT_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["fields-to-apply with only the url", { "fields-to-apply": "url" }],
  ["fields-to-apply with only the name", { "fields-to-apply": "name" }],
  ["fields-to-apply with every contact field and an extension", { "fields-to-apply": "name,url,email,x-slack" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a properties list like the core truthy description", { properties: ["url"] }],
  ["a fields array", { fields: ["url", "x-slack"] }],
  ["a required list", { required: ["url"] }],
  ["a field option like core truthy", { field: "url" }],
  ["a pattern", { pattern: "^x-" }],
  ["null values", { "fields-to-apply": null, properties: null }],
  ["non-string values", { "fields-to-apply": 42, properties: true, required: "url" }],
];

const CONTACT_MESSAGES = {
  missing: (field) => `AAR077: The 'contact' object must declare the mandatory field '${field}'.`,
  empty: (field) => `AAR077: The mandatory 'contact' field '${field}' must not be empty.`,
  noContact: () => "AAR077: The 'info' object must declare a 'contact' object with the mandatory fields 'name' and 'email'.",
  noInfo: () => "AAR077: The document must declare an 'info' object whose 'contact' object populates the mandatory fields 'name' and 'email'.",
};

const contactFindings = (expected) => expected.map(([path, kind, field]) => [path, CONTACT_MESSAGES[kind](field)]).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

const LICENSE_FIELDS = ["name", "url"];
const licenseTarget = (name) => ({ $ref: `#/components/x-licenses/${name}` });
const LICENSE_COMPLETE = { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0", "x-spdx-id": "Apache-2.0" };
const LICENSE_MINIMAL = { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" };

const LICENSE_COMPONENTS = {
  ...INFO_COMPONENTS,
  "x-licenses": {
    complete: LICENSE_COMPLETE,
    minimal: LICENSE_MINIMAL,
    alias: licenseTarget("complete"),
    aliasTwice: licenseTarget("alias"),
    sparse: { url: " \t ", "x-spdx-id": "MIT" },
    sparseAlias: licenseTarget("sparse"),
    empty: {},
    extensionsOnly: { "x-spdx-id": "Apache-2.0", "x-legal-review": "2026-03" },
    lookAlikes: { identifier: "Apache-2.0", title: "Apache 2.0", href: "https://www.apache.org/licenses/LICENSE-2.0" },
    caseKeys: { Name: "Apache 2.0", URL: "https://www.apache.org/licenses/LICENSE-2.0" },
    cycleA: licenseTarget("cycleB"),
    cycleB: licenseTarget("cycleA"),
    self: licenseTarget("self"),
    list: [LICENSE_COMPLETE],
    text: "Apache-2.0",
    nothing: null,
    external: { $ref: "./shared/licenses.yaml#/apache" },
    "a/b": LICENSE_COMPLETE,
    "with space": LICENSE_MINIMAL,
  },
  "x-info": {
    ...INFO_COMPONENTS["x-info"],
    withLicense: { title: "Commerce Events", version: "4.2.0", license: licenseTarget("complete") },
    withLicenseAlias: infoTarget("withLicense"),
    withSparseLicense: { title: "Commerce Events", version: "4.2.0", license: { name: "", "x-spdx-id": "MIT" } },
  },
};

const LICENSE_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["an absolute URL", "https://www.apache.org/licenses/LICENSE-2.0", true],
  ["a relative URL, whose format is not checked", "/legal/LICENSE.txt", true],
  ["an SPDX identifier", "Apache-2.0", true],
  ["a pointer to a field of another license", { $ref: "#/components/x-licenses/complete/url" }, true],
  ["a pointer through a chained license, which Spectral cannot resolve either", { $ref: "#/components/x-licenses/alias/url" }, false],
  ["a pointer to an empty field of another license", { $ref: "#/components/x-licenses/sparse/url" }, false],
];

const bothLicenseFieldsMissing = (path) => LICENSE_FIELDS.map((field) => [path, "missing", field]);

const LICENSE_OBJECT_CASES = [
  ["an inline license with name, url and an extension", LICENSE_COMPLETE, []],
  ["an inline license with only name and url", LICENSE_MINIMAL, []],
  ["an inline license with empty extensions and look-alike keys", { ...LICENSE_MINIMAL, identifier: "", "x-spdx-id": null, "x-legal": {} }, []],
  ["an empty license object", {}, bothLicenseFieldsMissing("info.license")],
  ["a license with only an SPDX identifier", { identifier: "Apache-2.0" }, bothLicenseFieldsMissing("info.license")],
  ["a license with only extensions", { "x-spdx-id": "Apache-2.0", "x-legal-review": "2026-03" }, bothLicenseFieldsMissing("info.license")],
  ["a license without name", { url: "https://www.apache.org/licenses/LICENSE-2.0", "x-spdx-id": "Apache-2.0" }, [["info.license", "missing", "name"]]],
  ["a license without url", { name: "Proprietary", "x-spdx-id": "LicenseRef-Proprietary" }, [["info.license", "missing", "url"]]],
  ["a license whose keys differ in case", { Name: "Apache 2.0", NAME: "Apache", Url: "https://www.apache.org/licenses/LICENSE-2.0", URL: "https://opensource.org/licenses/Apache-2.0" }, bothLicenseFieldsMissing("info.license")],
  [
    "a license with look-alike keys",
    { title: "Apache 2.0", licenseName: "Apache 2.0", "license-name": "Apache 2.0", identifier: "Apache-2.0", href: "https://www.apache.org/licenses/LICENSE-2.0", link: "https://opensource.org/licenses/Apache-2.0", uri: "https://spdx.org/licenses/Apache-2.0", licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0" },
    bothLicenseFieldsMissing("info.license"),
  ],
  ["a license with a blank name and a null url", { name: "  ", url: null }, [["info.license.name", "empty", "name"], ["info.license.url", "empty", "url"]]],
  ["a reference to a complete license", licenseTarget("complete"), []],
  ["a reference to a license with only name and url", licenseTarget("minimal"), []],
  ["a chained reference", licenseTarget("alias"), []],
  ["a reference chained twice", licenseTarget("aliasTwice"), []],
  ["a reference with siblings, which are ignored", { ...licenseTarget("complete"), name: "", url: null }, []],
  ["a reference to an empty license with populated siblings, which are ignored", { $ref: "#/components/x-licenses/empty", ...LICENSE_MINIMAL }, bothLicenseFieldsMissing("components.x-licenses.empty")],
  ["a pointer into an array item", { $ref: "#/components/x-licenses/list/0" }, []],
  ["an escaped pointer", { $ref: "#/components/x-licenses/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-licenses/with%20space" }, []],
  ["an external reference", { $ref: "./shared/licenses.yaml#/apache" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/legal/license.yaml" }, []],
  ["a local alias of an external license", licenseTarget("external"), []],
  ["a reference to a sparse license", licenseTarget("sparse"), [["components.x-licenses.sparse", "missing", "name"], ["components.x-licenses.sparse.url", "empty", "url"]]],
  ["a chained reference to a sparse license", licenseTarget("sparseAlias"), [["components.x-licenses.sparse", "missing", "name"], ["components.x-licenses.sparse.url", "empty", "url"]]],
  ["a reference to an empty license", licenseTarget("empty"), bothLicenseFieldsMissing("components.x-licenses.empty")],
  ["a reference to a license with only extensions", licenseTarget("extensionsOnly"), bothLicenseFieldsMissing("components.x-licenses.extensionsOnly")],
  ["a reference to a license with only look-alike keys", licenseTarget("lookAlikes"), bothLicenseFieldsMissing("components.x-licenses.lookAlikes")],
  ["a reference to a license whose keys differ in case", licenseTarget("caseKeys"), bothLicenseFieldsMissing("components.x-licenses.caseKeys")],
  ["a null license", null, [["info.license", "noLicense"]]],
  ["an empty string", "", [["info.license", "noLicense"]]],
  ["an SPDX identifier instead of an object", "Apache-2.0", [["info.license", "noLicense"]]],
  ["a license name instead of an object", "Apache License 2.0", [["info.license", "noLicense"]]],
  ["a URL instead of an object", "https://www.apache.org/licenses/LICENSE-2.0", [["info.license", "noLicense"]]],
  ["zero", 0, [["info.license", "noLicense"]]],
  ["a number", 42, [["info.license", "noLicense"]]],
  ["true", true, [["info.license", "noLicense"]]],
  ["false", false, [["info.license", "noLicense"]]],
  ["an empty list", [], [["info.license", "noLicense"]]],
  ["a list holding a license", [LICENSE_COMPLETE], [["info.license", "noLicense"]]],
  ["a list of SPDX identifiers", ["Apache-2.0", "MIT"], [["info.license", "noLicense"]]],
  ["a dangling reference", licenseTarget("missing"), [["info.license", "noLicense"]]],
  ["a pointer past the end of an array", { $ref: "#/components/x-licenses/list/3" }, [["info.license", "noLicense"]]],
  ["a reference to the info license itself", { $ref: "#/info/license" }, [["info.license", "noLicense"]]],
  ["a cyclic reference", licenseTarget("cycleA"), [["info.license", "noLicense"]]],
  ["a self reference", licenseTarget("self"), [["info.license", "noLicense"]]],
  ["a reference to the document root", { $ref: "#" }, [["info.license", "noLicense"]]],
  ["an empty reference, which points to the document itself", { $ref: "" }, [["info.license", "noLicense"]]],
  ["a reference to a list", licenseTarget("list"), [["info.license", "noLicense"]]],
  ["a reference to a string", licenseTarget("text"), [["info.license", "noLicense"]]],
  ["a reference to null", licenseTarget("nothing"), [["info.license", "noLicense"]]],
  ["a pointer without a leading slash", { $ref: "#components/x-licenses/complete" }, [["info.license", "noLicense"]]],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-licenses/%E0%A4%A" }, [["info.license", "noLicense"]]],
  ["a non-string reference", { $ref: 42 }, [["info.license", "noLicense"]]],
  ["a null reference", { $ref: null }, [["info.license", "noLicense"]]],
];

const LICENSE_INFO_CASES = [
  ["an inline info object with a complete license", { title: "Commerce Events", version: "4.2.0", license: LICENSE_COMPLETE }, []],
  ["an info object with only a license", { license: LICENSE_MINIMAL }, []],
  ["an info object without license", { title: "Commerce Events", version: "4.2.0", description: "Order events." }, [["info", "noLicense"]]],
  ["an empty info object", {}, [["info", "noLicense"]]],
  ["an info object whose license key differs in case", { title: "Commerce Events", License: LICENSE_COMPLETE, LICENSE: LICENSE_MINIMAL }, [["info", "noLicense"]]],
  ["an info object with the British spelling licence", { title: "Commerce Events", licence: LICENSE_COMPLETE }, [["info", "noLicense"]]],
  ["an info object with license look-alikes", { title: "Commerce Events", "x-license": LICENSE_COMPLETE, licenses: [LICENSE_COMPLETE], termsOfService: "https://www.apache.org/licenses/LICENSE-2.0" }, [["info", "noLicense"]]],
  ["a reference to an info object with a referenced license", infoTarget("withLicense"), []],
  ["a chained reference to that info object", infoTarget("withLicenseAlias"), []],
  ["a reference with siblings, which are ignored", { ...infoTarget("withLicense"), license: null }, []],
  ["a reference to an info object with a sparse license", infoTarget("withSparseLicense"), [["components.x-info.withSparseLicense.license", "missing", "url"], ["components.x-info.withSparseLicense.license.name", "empty", "name"]]],
  ["a reference to an info object without license", infoTarget("complete"), [["components.x-info.complete", "noLicense"]]],
  ["a chained reference to an info object without license", infoTarget("alias"), [["components.x-info.complete", "noLicense"]]],
  ["a reference to an empty info object", infoTarget("empty"), [["components.x-info.empty", "noLicense"]]],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ["a null info", null, [["info", "noInfo"]]],
  ["an empty string", "", [["info", "noInfo"]]],
  ["a title instead of an object", "Commerce Events", [["info", "noInfo"]]],
  ["zero", 0, [["info", "noInfo"]]],
  ["a number", 42, [["info", "noInfo"]]],
  ["true", true, [["info", "noInfo"]]],
  ["false", false, [["info", "noInfo"]]],
  ["an empty list", [], [["info", "noInfo"]]],
  ["a list holding an info object with a license", [{ title: "Commerce Events", license: LICENSE_COMPLETE }], [["info", "noInfo"]]],
  ["a dangling reference", infoTarget("missing"), [["info", "noInfo"]]],
  ["a cyclic reference", infoTarget("cycleA"), [["info", "noInfo"]]],
  ["a reference to the document root", { $ref: "#" }, [["info", "noInfo"]]],
  ["an empty reference", { $ref: "" }, [["info", "noInfo"]]],
  ["a reference to a list", infoTarget("list"), [["info", "noInfo"]]],
  ["a reference to a string", infoTarget("text"), [["info", "noInfo"]]],
  ["a reference to null", infoTarget("nothing"), [["info", "noInfo"]]],
  ["a pointer without a leading slash", { $ref: "#components/x-info/withLicense" }, [["info", "noInfo"]]],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-info/%E0%A4%A" }, [["info", "noInfo"]]],
  ["a non-string reference", { $ref: 42 }, [["info", "noInfo"]]],
  ["a null reference", { $ref: null }, [["info", "noInfo"]]],
];

const LICENSE_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["fields-to-apply with only the name", { "fields-to-apply": "name" }],
  ["fields-to-apply with only the url", { "fields-to-apply": "url" }],
  ["fields-to-apply with an identifier and an extension", { "fields-to-apply": "name,url,identifier,x-spdx-id" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a properties list like the core truthy description", { properties: ["name"] }],
  ["a fields array", { fields: ["identifier", "x-spdx-id"] }],
  ["a required list", { required: ["identifier"] }],
  ["a field option like core truthy", { field: "name" }],
  ["a pattern", { pattern: "^x-" }],
  ["null values", { "fields-to-apply": null, properties: null }],
  ["non-string values", { "fields-to-apply": 42, properties: true, required: "identifier" }],
];

const LICENSE_MESSAGES = {
  missing: (field) => `AAR078: The 'license' object must declare the mandatory field '${field}'.`,
  empty: (field) => `AAR078: The mandatory 'license' field '${field}' must not be empty.`,
  noLicense: () => "AAR078: The 'info' object must declare a 'license' object with the mandatory fields 'name' and 'url'.",
  noInfo: () => "AAR078: The document must declare an 'info' object whose 'license' object populates the mandatory fields 'name' and 'url'.",
};

const licenseFindings = (expected) => expected.map(([path, kind, field]) => [path, LICENSE_MESSAGES[kind](field)]).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

const DOCS_FIELDS = ["description", "url"];
const docsTarget = (name) => ({ $ref: `#/components/x-docs/${name}` });
const DOCS_COMPLETE = { description: "Order lifecycle handbook.", url: "https://docs.commerce.example.io/orders", "x-owner": "commerce-platform" };
const DOCS_MINIMAL = { description: "Order lifecycle handbook.", url: "https://docs.commerce.example.io/orders" };
const DOCS_URL_ONLY = { url: "https://docs.commerce.example.io/orders" };

const DOCS_COMPONENTS = {
  ...INFO_COMPONENTS,
  "x-docs": {
    complete: DOCS_COMPLETE,
    minimal: DOCS_MINIMAL,
    alias: docsTarget("complete"),
    aliasTwice: docsTarget("alias"),
    sparse: { url: " \t ", "x-owner": "docs-team" },
    sparseAlias: docsTarget("sparse"),
    urlOnly: DOCS_URL_ONLY,
    empty: {},
    extensionsOnly: { "x-owner": "docs-team", "x-review": "2026-03" },
    lookAlikes: { summary: "Order handbook.", title: "Orders", href: "https://docs.commerce.example.io/orders", link: "https://docs.commerce.example.io", uri: "urn:docs:orders" },
    caseKeys: { Description: "Order lifecycle handbook.", URL: "https://docs.commerce.example.io/orders" },
    cycleA: docsTarget("cycleB"),
    cycleB: docsTarget("cycleA"),
    self: docsTarget("self"),
    list: [DOCS_COMPLETE],
    text: "https://docs.commerce.example.io/orders",
    nothing: null,
    external: { $ref: "./shared/docs.yaml#/orders" },
    "a/b": DOCS_COMPLETE,
    "with space": DOCS_MINIMAL,
  },
  "x-doc-holders": {
    intermediate: { $ref: "#/components/x-doc-holders/target" },
    target: { externalDocs: DOCS_MINIMAL },
  },
};

const DOCS_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["an absolute URL", "https://docs.commerce.example.io/orders", true],
  ["a relative URL, whose format is not checked", "/docs/orders.html", true],
  ["a URN, whose format is not checked", "urn:docs:orders", true],
  ["a pointer to a field of another documentation object", { $ref: "#/components/x-docs/complete/url" }, true],
  ["a pointer through a chained documentation object, which Spectral cannot resolve either", { $ref: "#/components/x-docs/alias/url" }, false],
  ["a pointer to an empty field of another documentation object", { $ref: "#/components/x-docs/sparse/url" }, false],
];

const bothDocsFieldsMissing = (path) => DOCS_FIELDS.map((field) => [path, "missing", field]);
const docsReference = (ref) => [["", "reference", ref]];
const SPARSE_DOCS = [["components.x-docs.sparse", "missing", "description"], ["components.x-docs.sparse.url", "empty", "url"]];

const DOCS_OBJECT_CASES = [
  ["an inline object with description, url and an extension", DOCS_COMPLETE, []],
  ["an inline object with only description and url", DOCS_MINIMAL, []],
  ["an inline object with empty extensions and look-alike keys", { ...DOCS_MINIMAL, title: "", href: null, "x-owner": {} }, []],
  ["an inline object whose url is not an absolute URL", { description: "Order lifecycle handbook.", url: "/docs/orders.html" }, []],
  ["an empty object", {}, bothDocsFieldsMissing("")],
  ["an object with only a url", DOCS_URL_ONLY, [["", "missing", "description"]]],
  ["an object with only a description", { description: "Order lifecycle handbook." }, [["", "missing", "url"]]],
  ["an object with only extensions", { "x-owner": "docs-team", "x-review": "2026-03" }, bothDocsFieldsMissing("")],
  ["an object whose keys differ in case", { Description: "Order lifecycle handbook.", DESCRIPTION: "Orders.", Url: "https://docs.commerce.example.io", URL: "https://docs.commerce.example.io/orders" }, bothDocsFieldsMissing("")],
  [
    "an object with look-alike keys",
    { summary: "Order handbook.", title: "Orders", docs: "Order handbook.", href: "https://docs.commerce.example.io/orders", link: "https://docs.commerce.example.io", uri: "urn:docs:orders", externalUrl: "https://docs.commerce.example.io", "external-url": "https://docs.commerce.example.io" },
    bothDocsFieldsMissing(""),
  ],
  ["an object with a blank description and a null url", { description: "  ", url: null }, [["description", "empty", "description"], ["url", "empty", "url"]]],
  ["an object with an empty url", { description: "Order lifecycle handbook.", url: "" }, [["url", "empty", "url"]]],
  ["an object whose only content is a nested externalDocs", { externalDocs: DOCS_MINIMAL }, bothDocsFieldsMissing("")],
  ["a reference to a complete object", docsTarget("complete"), []],
  ["a reference to an object with only description and url", docsTarget("minimal"), []],
  ["a chained reference", docsTarget("alias"), []],
  ["a reference chained twice", docsTarget("aliasTwice"), []],
  ["a reference with siblings, which are ignored", { ...docsTarget("complete"), description: "", url: null }, []],
  ["a reference to an empty object with populated siblings, which are ignored", { $ref: "#/components/x-docs/empty", ...DOCS_MINIMAL }, bothDocsFieldsMissing("components.x-docs.empty")],
  ["a pointer into an array item", { $ref: "#/components/x-docs/list/0" }, []],
  ["an escaped pointer", { $ref: "#/components/x-docs/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-docs/with%20space" }, []],
  ["an external reference", { $ref: "./shared/docs.yaml#/orders" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/docs/orders.yaml" }, []],
  ["a local alias of an external object", docsTarget("external"), []],
  ["a reference to a sparse object", docsTarget("sparse"), SPARSE_DOCS],
  ["a chained reference to a sparse object", docsTarget("sparseAlias"), SPARSE_DOCS],
  ["a reference to an object with only a url", docsTarget("urlOnly"), [["components.x-docs.urlOnly", "missing", "description"]]],
  ["a reference to an empty object", docsTarget("empty"), bothDocsFieldsMissing("components.x-docs.empty")],
  ["a reference to an object with only extensions", docsTarget("extensionsOnly"), bothDocsFieldsMissing("components.x-docs.extensionsOnly")],
  ["a reference to an object with only look-alike keys", docsTarget("lookAlikes"), bothDocsFieldsMissing("components.x-docs.lookAlikes")],
  ["a reference to an object whose keys differ in case", docsTarget("caseKeys"), bothDocsFieldsMissing("components.x-docs.caseKeys")],
  ["a reference to an object that only holds an externalDocs, which is read as the documentation object", { $ref: "#/components/x-doc-holders/target" }, bothDocsFieldsMissing("components.x-doc-holders.target")],
  ["null", null, [["", "invalid"]]],
  ["an empty string", "", [["", "invalid"]]],
  ["a blank string", " \t ", [["", "invalid"]]],
  ["a URL instead of an object", "https://docs.commerce.example.io/orders", [["", "invalid"]]],
  ["a description instead of an object", "Order lifecycle handbook.", [["", "invalid"]]],
  ["zero", 0, [["", "invalid"]]],
  ["a number", 42, [["", "invalid"]]],
  ["true", true, [["", "invalid"]]],
  ["false", false, [["", "invalid"]]],
  ["an empty list", [], [["", "invalid"]]],
  ["a list holding a documentation object", [DOCS_MINIMAL], [["", "invalid"]]],
  ["a list of URLs", ["https://docs.commerce.example.io/orders", "https://docs.commerce.example.io/payments"], [["", "invalid"]]],
  ["a dangling reference", docsTarget("missing"), docsReference("#/components/x-docs/missing")],
  ["a pointer past the end of an array", { $ref: "#/components/x-docs/list/3" }, docsReference("#/components/x-docs/list/3")],
  ["a cyclic reference", docsTarget("cycleA"), docsReference("#/components/x-docs/cycleA")],
  ["a self reference", docsTarget("self"), docsReference("#/components/x-docs/self")],
  ["a reference to the document root", { $ref: "#" }, docsReference("#")],
  ["an empty reference, which points to the document itself", { $ref: "" }, docsReference("")],
  ["a reference to a list", docsTarget("list"), docsReference("#/components/x-docs/list")],
  ["a reference to a string", docsTarget("text"), docsReference("#/components/x-docs/text")],
  ["a reference to null", docsTarget("nothing"), docsReference("#/components/x-docs/nothing")],
  ["a pointer through another reference, which Spectral does not resolve either", { $ref: "#/components/x-doc-holders/intermediate/externalDocs" }, docsReference("#/components/x-doc-holders/intermediate/externalDocs")],
  ["a pointer without a leading slash", { $ref: "#components/x-docs/complete" }, docsReference("#components/x-docs/complete")],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-docs/%E0%A4%A" }, docsReference("#/components/x-docs/%E0%A4%A")],
  ["a non-string reference", { $ref: 42 }, docsReference(42)],
  ["a null reference", { $ref: null }, docsReference(null)],
];

const deepDocsSchema = (levels, docs) => {
  let schema = { type: "object", externalDocs: docs };
  for (let level = levels; level >= 1; level--) schema = { type: "object", properties: { [`level${level}`]: schema } };
  return schema;
};

const DOCS_SCHEMA_KEYWORD_CASES = [
  ["the root schema", (docs) => ({ type: "object", externalDocs: docs }), "externalDocs"],
  ["a nullable array-form type", (docs) => ({ type: ["object", "null"], externalDocs: docs }), "externalDocs"],
  ["an OpenAPI-style nullable schema", (docs) => ({ type: "object", nullable: true, externalDocs: docs }), "externalDocs"],
  ["a property", (docs) => ({ type: "object", properties: { customer: { type: "object", externalDocs: docs } } }), "properties.customer.externalDocs"],
  ["a nullable property", (docs) => ({ type: "object", properties: { customer: { type: ["object", "null"], externalDocs: docs } } }), "properties.customer.externalDocs"],
  ["a property named externalDocs", (docs) => ({ type: "object", properties: { externalDocs: { type: "object", externalDocs: docs } } }), "properties.externalDocs.externalDocs"],
  ["a property named url", (docs) => ({ type: "object", properties: { url: { type: "string", format: "uri", externalDocs: docs } } }), "properties.url.externalDocs"],
  ["patternProperties", (docs) => ({ type: "object", patternProperties: { "^x-": { type: "string", externalDocs: docs } } }), "patternProperties.^x-.externalDocs"],
  ["additionalProperties", (docs) => ({ type: "object", additionalProperties: { type: "string", externalDocs: docs } }), "additionalProperties.externalDocs"],
  ["unevaluatedProperties", (docs) => ({ type: "object", unevaluatedProperties: { type: "string", externalDocs: docs } }), "unevaluatedProperties.externalDocs"],
  ["items given as a schema", (docs) => ({ type: "array", items: { type: "object", externalDocs: docs } }), "items.externalDocs"],
  ["items given as a tuple", (docs) => ({ type: "array", items: [{ type: "string" }, { type: "object", externalDocs: docs }] }), "items.1.externalDocs"],
  ["prefixItems", (docs) => ({ type: "array", prefixItems: [{ type: "object", externalDocs: docs }] }), "prefixItems.0.externalDocs"],
  ["additionalItems", (docs) => ({ type: "array", items: [{ type: "string" }], additionalItems: { type: "object", externalDocs: docs } }), "additionalItems.externalDocs"],
  ["unevaluatedItems", (docs) => ({ type: "array", unevaluatedItems: { type: "object", externalDocs: docs } }), "unevaluatedItems.externalDocs"],
  ["contains", (docs) => ({ type: "array", contains: { type: "object", externalDocs: docs } }), "contains.externalDocs"],
  ["propertyNames", (docs) => ({ type: "object", propertyNames: { type: "string", pattern: "^[a-z]+$", externalDocs: docs } }), "propertyNames.externalDocs"],
  ["not", (docs) => ({ not: { type: "null", externalDocs: docs } }), "not.externalDocs"],
  ["if", (docs) => ({ if: { properties: { kind: { const: "refund" } }, externalDocs: docs }, then: { required: ["refundId"] } }), "if.externalDocs"],
  ["then", (docs) => ({ if: { properties: { kind: { const: "refund" } } }, then: { required: ["refundId"], externalDocs: docs } }), "then.externalDocs"],
  ["else", (docs) => ({ if: { properties: { kind: { const: "refund" } } }, else: { required: ["orderId"], externalDocs: docs } }), "else.externalDocs"],
  ["allOf", (docs) => ({ allOf: [{ type: "object" }, { type: "object", externalDocs: docs }] }), "allOf.1.externalDocs"],
  ["anyOf", (docs) => ({ anyOf: [{ type: "object", externalDocs: docs }, { type: "null" }] }), "anyOf.0.externalDocs"],
  ["oneOf", (docs) => ({ oneOf: [{ type: "string" }, { type: "object", externalDocs: docs }] }), "oneOf.1.externalDocs"],
  ["definitions", (docs) => ({ type: "object", definitions: { address: { type: "object", externalDocs: docs } } }), "definitions.address.externalDocs"],
  ["$defs", (docs) => ({ type: "object", $defs: { address: { type: "object", externalDocs: docs } } }), "$defs.address.externalDocs"],
  ["dependentSchemas", (docs) => ({ type: "object", dependentSchemas: { refundId: { required: ["reason"], externalDocs: docs } } }), "dependentSchemas.refundId.externalDocs"],
  ["dependencies", (docs) => ({ type: "object", dependencies: { refundId: { required: ["reason"], externalDocs: docs }, orderId: ["customerId"] } }), "dependencies.refundId.externalDocs"],
  ["a property twelve levels deep", (docs) => deepDocsSchema(12, docs), `${Array.from({ length: 12 }, (_, index) => `properties.level${index + 1}`).join(".")}.externalDocs`],
];

const DOCS_SCHEMA_IGNORED_CASES = [
  ["a property named externalDocs without the keyword", { type: "object", properties: { externalDocs: { type: "object", properties: { url: { type: "string" } } } } }],
  ["examples", { type: "object", examples: [{ externalDocs: {} }, { externalDocs: { url: "https://docs.example.io" } }] }],
  ["an example keyword", { type: "object", example: { externalDocs: null } }],
  ["default, const and enum values", { type: "object", default: { externalDocs: {} }, properties: { docs: { const: { externalDocs: "" }, enum: [{ externalDocs: [] }] } } }],
  ["required names", { type: "object", required: ["externalDocs", "url", "description"] }],
  ["an extension", { type: "object", "x-docs": { externalDocs: {} }, "x-externalDocs": { url: "https://docs.example.io" } }],
  ["unknown keywords", { type: "object", schema: { externalDocs: {} }, nested: { externalDocs: {} }, discriminator: "kind" }],
  ["boolean subschemas", { type: "array", items: true, additionalItems: false, additionalProperties: false, not: false }],
  ["scalar and null subschemas", { type: "object", properties: { a: null, b: "string", c: 3 }, items: null, allOf: [null, "x"] }],
  ["the siblings of a $ref", { $ref: "#/components/x-schemas/clean", externalDocs: {} }],
  ["an external $ref", { $ref: "./schemas/order.json#/definitions/order", externalDocs: {} }],
  ["a dangling $ref", { $ref: "#/components/x-schemas/missing" }],
];

const DOCS_SCHEMA_FORMAT_CASES = [
  ["no schemaFormat", undefined, true],
  ["a null schemaFormat", null, true],
  ["the AsyncAPI 2.6 schema format", "application/vnd.aai.asyncapi;version=2.6.0", true],
  ["the AsyncAPI 3.0 schema format", "application/vnd.aai.asyncapi;version=3.0.0", true],
  ["the AsyncAPI JSON schema format", "application/vnd.aai.asyncapi+json;version=2.6.0", true],
  ["the AsyncAPI YAML schema format", "application/vnd.aai.asyncapi+yaml;version=3.0.0", true],
  ["JSON Schema draft-07", "application/schema+json;version=draft-07", true],
  ["JSON Schema draft-04 in YAML", "application/schema+yaml;version=draft-04", true],
  ["the OpenAPI 3.0 schema format", "application/vnd.oai.openapi;version=3.0.0", true],
  ["the OpenAPI JSON schema format", "application/vnd.oai.openapi+json;version=3.0.0", true],
  ["the OpenAPI YAML schema format", "application/vnd.oai.openapi+yaml;version=3.0.0", true],
  ["an upper-case schema format", "APPLICATION/VND.AAI.ASYNCAPI;VERSION=2.6.0", true],
  ["a padded schema format", "  application/schema+json ; version=draft-07", true],
  ["a schema format without version", "application/schema+json", true],
  ["Avro 1.9.0", "application/vnd.apache.avro;version=1.9.0", false],
  ["Avro JSON", "application/vnd.apache.avro+json;version=1.9.0", false],
  ["Avro YAML", "application/vnd.apache.avro+yaml;version=1.9.0", false],
  ["RAML", "application/raml+yaml;version=1.0", false],
  ["Protobuf", "application/vnd.google.protobuf;version=3", false],
  ["plain JSON, which is not a schema format", "application/json", false],
  ["an empty schema format", "", false],
  ["a numeric schema format", 2, false],
  ["a boolean schema format", true, false],
  ["an object schema format", { type: "json" }, false],
];

const DOCS_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["fields-to-apply with only the url", { "fields-to-apply": "url" }],
  ["fields-to-apply with only the description", { "fields-to-apply": "description" }],
  ["fields-to-apply with look-alikes and an extension", { "fields-to-apply": "description,url,title,x-owner" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a properties list like the core truthy description", { properties: ["url"] }],
  ["a properties list with a field the object does not define", { properties: ["title"] }],
  ["a fields array", { fields: ["title", "x-owner"] }],
  ["a required list", { required: ["title"] }],
  ["a field option like core truthy", { field: "url" }],
  ["a pattern", { pattern: "^https://" }],
  ["null values", { "fields-to-apply": null, properties: null }],
  ["non-string values", { "fields-to-apply": 42, properties: true, required: "title" }],
];

const DOCS_OBJECT_TEXT = "an External Documentation object with the mandatory fields 'description' and 'url'";

const DOCS_MESSAGES = {
  missing: (field) => `AAR079: The 'externalDocs' object must declare the mandatory field '${field}'.`,
  empty: (field) => `AAR079: The mandatory 'externalDocs' field '${field}' must not be empty.`,
  invalid: () => `AAR079: The 'externalDocs' value must be ${DOCS_OBJECT_TEXT}.`,
  reference: (ref) => `AAR079: The 'externalDocs' reference ${quoteRef(ref)} must resolve to ${DOCS_OBJECT_TEXT}.`,
};

const docsFinding = (base, [path, kind, detail]) => {
  const at = path === "" ? base : DOCS_FIELDS.includes(path) ? `${base}.${path}` : path;
  return [at, DOCS_MESSAGES[kind](detail)];
};

const docsFindings = (base, expected) => expected.map((entry) => docsFinding(base, entry)).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

const spdxName = (name) => ({ $ref: `#/components/x-license-names/${name}` });
const spdxLicense = (name) => ({ $ref: `#/components/x-licenses/${name}` });
const spdxInfo = (name) => ({ $ref: `#/components/x-info/${name}` });
const escaped = (code) => `\\u${code.toString(16).padStart(4, "0")}`;
const ROCKET = chars(0xd83d, 0xde80);
const LONG_NAME = "Apache License 2.0 ".repeat(5000);
const SPDX_URL = "https://www.apache.org/licenses/LICENSE-2.0";
const SPDX_MINIMAL = { name: "Apache-2.0", url: SPDX_URL };
const SPDX_INFO = { title: "Commerce Events", version: "4.2.0" };

const SPDX_VALID_IDS = [
  "Apache-2.0",
  "MIT",
  "MIT-0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSD-2-Clause-Patent",
  "ISC",
  "MPL-2.0",
  "EPL-2.0",
  "EUPL-1.2",
  "CDDL-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "CC-BY-NC-ND-4.0",
  "CC0-1.0",
  "ODbL-1.0",
  "OGL-UK-3.0",
  "Unlicense",
  "Zlib",
  "PostgreSQL",
  "BSL-1.0",
  "BUSL-1.1",
  "SSPL-1.0",
  "Elastic-2.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "LGPL-2.1-only",
  "LGPL-3.0-or-later",
  "Artistic-2.0",
  "0BSD",
  "3D-Slicer-1.0",
  "blessing",
  "any-OSI",
  "bzip2-1.0.6",
  "libpng-2.0",
  "curl",
  "X11",
  "WTFPL",
];

const SPDX_DEPRECATED_IDS = [
  "AGPL-1.0",
  "AGPL-3.0",
  "BSD-2-Clause-FreeBSD",
  "BSD-2-Clause-NetBSD",
  "bzip2-1.0.5",
  "eCos-2.0",
  "GFDL-1.1",
  "GFDL-1.2",
  "GFDL-1.3",
  "GPL-1.0",
  "GPL-1.0+",
  "GPL-2.0",
  "GPL-2.0+",
  "GPL-2.0-with-autoconf-exception",
  "GPL-2.0-with-bison-exception",
  "GPL-2.0-with-classpath-exception",
  "GPL-2.0-with-font-exception",
  "GPL-2.0-with-GCC-exception",
  "GPL-3.0",
  "GPL-3.0+",
  "GPL-3.0-with-autoconf-exception",
  "GPL-3.0-with-GCC-exception",
  "LGPL-2.0",
  "LGPL-2.0+",
  "LGPL-2.1",
  "LGPL-2.1+",
  "LGPL-3.0",
  "LGPL-3.0+",
  "Net-SNMP",
  "Nunit",
  "StandardML-NJ",
  "wxWindows",
];

const SPDX_COMPONENTS = {
  "x-license-names": {
    apache: "Apache-2.0",
    apacheAlias: spdxName("apache"),
    apacheAliasTwice: spdxName("apacheAlias"),
    freeText: "Apache License 2.0",
    freeTextAlias: spdxName("freeText"),
    lowerCase: "mit",
    number: 2,
    falsy: false,
    object: { spdx: "MIT" },
    list: ["Apache License 2.0", "MIT"],
    empty: "",
    blank: " \t ",
    nothing: null,
    emptyObject: {},
    emptyList: [],
    emptyAlias: spdxName("empty"),
    cycleA: spdxName("cycleB"),
    cycleB: spdxName("cycleA"),
    self: spdxName("self"),
    "a/b": "BSD-3-Clause",
    "a~b": "ISC",
    "with space": "MPL-2.0",
    external: { $ref: "./shared/license-names.yaml#/apache" },
  },
  "x-licenses": {
    valid: SPDX_MINIMAL,
    validAlias: spdxLicense("valid"),
    validAliasTwice: spdxLicense("validAlias"),
    freeText: { name: "Apache License 2.0", url: SPDX_URL, identifier: "Apache-2.0", "x-spdx-id": "Apache-2.0" },
    freeTextAlias: spdxLicense("freeText"),
    lowerCase: { name: "mit", url: "https://opensource.org/license/mit" },
    numeric: { name: 2, url: SPDX_URL },
    nameRef: { name: spdxName("freeTextAlias"), url: SPDX_URL },
    noName: { url: SPDX_URL, identifier: "Apache-2.0" },
    blankName: { name: " ", url: SPDX_URL },
    empty: {},
    caseKeys: { Name: "Apache 2.0", NAME: "MIT", URL: SPDX_URL },
    list: [SPDX_MINIMAL, { name: "Proprietary", url: "https://commerce.example.io/legal" }],
    "a/b": { name: "Apache 2.0", url: SPDX_URL },
    "with space": { name: "GPL-3.0", url: "https://www.gnu.org/licenses/gpl-3.0.html" },
    cycleA: spdxLicense("cycleB"),
    cycleB: spdxLicense("cycleA"),
    self: spdxLicense("self"),
    text: "Apache-2.0",
    nothing: null,
    external: { $ref: "./shared/licenses.yaml#/apache" },
  },
  "x-info": {
    valid: { ...SPDX_INFO, license: spdxLicense("valid") },
    validAlias: spdxInfo("valid"),
    freeText: { ...SPDX_INFO, license: spdxLicense("freeTextAlias") },
    inlineInvalid: { ...SPDX_INFO, license: { name: "Apache 2.0", url: SPDX_URL } },
    inlineInvalidAlias: spdxInfo("inlineInvalid"),
    noLicense: { ...SPDX_INFO, description: "Order events." },
    noName: { ...SPDX_INFO, license: { url: SPDX_URL } },
    empty: {},
    cycleA: spdxInfo("cycleB"),
    cycleB: spdxInfo("cycleA"),
    list: [{ ...SPDX_INFO, license: { name: "Apache 2.0" } }],
    text: "Commerce Events",
    nothing: null,
  },
};

const suggest = (value, id) => ["suggest", value, id];
const invalid = (value) => ["invalid", value];
const typed = (kind) => ["type", kind];

const SPDX_NAME_CASES = [
  ["an SPDX identifier", "Apache-2.0", null],
  ["a deprecated SPDX identifier", "GPL-3.0", null],
  ["a deprecated identifier with a plus", "GPL-2.0+", null],
  ["a lower-case SPDX identifier", "blessing", null],
  ["an identifier starting with a digit", "0BSD", null],
  ["a lower-case identifier", "apache-2.0", suggest("apache-2.0", "Apache-2.0")],
  ["an upper-case identifier", "APACHE-2.0", suggest("APACHE-2.0", "Apache-2.0")],
  ["a lower-case short identifier", "mit", suggest("mit", "MIT")],
  ["a capitalized short identifier", "Mit", suggest("Mit", "MIT")],
  ["a camel-cased identifier", "Gpl-3.0-Or-Later", suggest("Gpl-3.0-Or-Later", "GPL-3.0-or-later")],
  ["a lower-case deprecated identifier", "lgpl-2.1", suggest("lgpl-2.1", "LGPL-2.1")],
  ["a lower-case identifier with a plus", "gpl-2.0+", suggest("gpl-2.0+", "GPL-2.0+")],
  ["a lower-case identifier starting with a digit", "0bsd", suggest("0bsd", "0BSD")],
  ["an upper-cased lower-case identifier", "BLESSING", suggest("BLESSING", "blessing")],
  ["a capitalized mixed-case identifier", "Any-OSI", suggest("Any-OSI", "any-OSI")],
  ["a leading space", " MIT", suggest(" MIT", "MIT")],
  ["a trailing space", "MIT ", suggest("MIT ", "MIT")],
  ["surrounding tabs and newlines", "\tMIT\n", suggest(`${escaped(9)}MIT${escaped(10)}`, "MIT")],
  ["a trailing carriage return", "Apache-2.0\r", suggest(`Apache-2.0${escaped(13)}`, "Apache-2.0")],
  ["surrounding non-breaking spaces", `${chars(0xa0)}MIT${chars(0xa0)}`, suggest(`${chars(0xa0)}MIT${chars(0xa0)}`, "MIT")],
  ["a leading ideographic space", `${chars(0x3000)}Apache-2.0`, suggest(`${chars(0x3000)}Apache-2.0`, "Apache-2.0")],
  ["a trailing zero-width space", `MIT${chars(0x200b)}`, suggest(`MIT${escaped(0x200b)}`, "MIT")],
  ["a leading byte order mark", `${chars(0xfeff)}Apache-2.0`, suggest(`${escaped(0xfeff)}Apache-2.0`, "Apache-2.0")],
  ["a word joiner inside", `Apache${chars(0x2060)}-2.0`, suggest(`Apache${escaped(0x2060)}-2.0`, "Apache-2.0")],
  ["a trailing line separator", `MIT${chars(0x2028)}`, suggest(`MIT${escaped(0x2028)}`, "MIT")],
  ["a space instead of a hyphen, as in the AsyncAPI specification example", "Apache 2.0", suggest("Apache 2.0", "Apache-2.0")],
  ["several spaces instead of a hyphen", "Apache   2.0", suggest("Apache   2.0", "Apache-2.0")],
  ["a tab instead of a hyphen", "Apache\t2.0", suggest(`Apache${escaped(9)}2.0`, "Apache-2.0")],
  ["spaces and the wrong case", "apache 2.0", suggest("apache 2.0", "Apache-2.0")],
  ["a deprecated identifier written with a space", "GPL 3.0", suggest("GPL 3.0", "GPL-3.0")],
  ["a BSD name written with a space", "BSD 3-Clause", suggest("BSD 3-Clause", "BSD-3-Clause")],
  ["a Creative Commons name written with spaces", "CC BY 4.0", suggest("CC BY 4.0", "CC-BY-4.0")],
  ["an identifier after 100 spaces, truncated to spaces", `${" ".repeat(100)}MIT`, suggest(`${" ".repeat(77)}...`, "MIT")],
  ["a descriptive name", "Apache License 2.0", invalid("Apache License 2.0")],
  ["the full Apache name", "Apache License, Version 2.0", invalid("Apache License, Version 2.0")],
  ["the Apache name spelled out", "The Apache Software License, Version 2.0", invalid("The Apache Software License, Version 2.0")],
  ["MIT License", "MIT License", invalid("MIT License")],
  ["The MIT License", "The MIT License", invalid("The MIT License")],
  ["a GNU license name", "GNU General Public License v3.0 only", invalid("GNU General Public License v3.0 only")],
  ["Proprietary", "Proprietary", invalid("Proprietary")],
  ["Commercial", "Commercial", invalid("Commercial")],
  ["the npm UNLICENSED marker", "UNLICENSED", invalid("UNLICENSED")],
  ["All Rights Reserved", "All Rights Reserved", invalid("All Rights Reserved")],
  ["Public Domain", "Public Domain", invalid("Public Domain")],
  ["the SPDX NONE value", "NONE", invalid("NONE")],
  ["the SPDX NOASSERTION value", "NOASSERTION", invalid("NOASSERTION")],
  ["a bare license family", "Apache", invalid("Apache")],
  ["the GPL family", "GPL", invalid("GPL")],
  ["the BSD family", "BSD", invalid("BSD")],
  ["a version without minor", "Apache-2", invalid("Apache-2")],
  ["an extra version digit", "Apache-2.0.0", invalid("Apache-2.0.0")],
  ["an underscore instead of a hyphen", "Apache_2.0", invalid("Apache_2.0")],
  ["no separator", "Apache2.0", invalid("Apache2.0")],
  ["a dot instead of a hyphen", "Apache.2.0", invalid("Apache.2.0")],
  ["a dual license expression", "MIT OR Apache-2.0", invalid("MIT OR Apache-2.0")],
  ["a parenthesized expression", "(MIT OR Apache-2.0)", invalid("(MIT OR Apache-2.0)")],
  ["a conjunctive expression", "MIT AND BSD-3-Clause", invalid("MIT AND BSD-3-Clause")],
  ["an exception expression", "GPL-2.0-only WITH Classpath-exception-2.0", invalid("GPL-2.0-only WITH Classpath-exception-2.0")],
  ["a lower-case operator", "MIT or Apache-2.0", invalid("MIT or Apache-2.0")],
  ["a license exception alone", "Classpath-exception-2.0", invalid("Classpath-exception-2.0")],
  ["an or-later plus on a current identifier", "Apache-2.0+", invalid("Apache-2.0+")],
  ["an or-later plus on MIT", "MIT+", invalid("MIT+")],
  ["a LicenseRef identifier", "LicenseRef-Acme-Proprietary", invalid("LicenseRef-Acme-Proprietary")],
  ["a DocumentRef identifier", "DocumentRef-legal:LicenseRef-Acme", invalid("DocumentRef-legal:LicenseRef-Acme")],
  ["a license URL", SPDX_URL, invalid(SPDX_URL)],
  ["the SPDX page URL", "https://spdx.org/licenses/MIT.html", invalid("https://spdx.org/licenses/MIT.html")],
  ["a comma-separated list", "Apache-2.0,MIT", invalid("Apache-2.0,MIT")],
  ["a slash-separated list", "Apache-2.0/MIT", invalid("Apache-2.0/MIT")],
  ["two identifiers separated by a space", "Apache-2.0 MIT", invalid("Apache-2.0 MIT")],
  ["an SPDX header", "SPDX-License-Identifier: Apache-2.0", invalid("SPDX-License-Identifier: Apache-2.0")],
  ["a quoted identifier", "'Apache-2.0'", invalid("'Apache-2.0'")],
  ["a double-quoted identifier", '"MIT"', invalid('"MIT"')],
  ["a Unicode hyphen", `Apache${chars(0x2010)}2.0`, invalid(`Apache${chars(0x2010)}2.0`)],
  ["full-width letters", chars(0xff2d, 0xff29, 0xff34), invalid(chars(0xff2d, 0xff29, 0xff34))],
  ["a Cyrillic look-alike letter", `${chars(0x41c)}IT`, invalid(`${chars(0x41c)}IT`)],
  ["the string null", "null", invalid("null")],
  ["the string 0", "0", invalid("0")],
  ["a quoted version number", "2.0", invalid("2.0")],
  ["a date", "2026-01-15", invalid("2026-01-15")],
  ["a single character", "x", invalid("x")],
  ["a non-Latin name", "ライセンス", invalid("ライセンス")],
  ["an emoji", `MIT ${ROCKET}`, invalid(`MIT ${ROCKET}`)],
  ["a multi-line name", "Apache-2.0\nMIT", invalid(`Apache-2.0${escaped(10)}MIT`)],
  ["an 80-character name, shown in full", "L".repeat(80), invalid("L".repeat(80))],
  ["an 81-character name, truncated", "L".repeat(81), invalid(`${"L".repeat(77)}...`)],
  ["a very long name, truncated", LONG_NAME, invalid(`${LONG_NAME.slice(0, 77)}...`)],
  ["a long emoji name, truncated without splitting characters", ROCKET.repeat(100), invalid(`${ROCKET.repeat(77)}...`)],
  ["zero", 0, typed("a number")],
  ["a version number", 2, typed("a number")],
  ["a decimal number", 1.5, typed("a number")],
  ["a negative number", -1, typed("a number")],
  ["true", true, typed("a boolean")],
  ["false", false, typed("a boolean")],
  ["an object with a name", { name: "MIT" }, typed("an object")],
  ["an object with an SPDX key", { spdx: "Apache-2.0" }, typed("an object")],
  ["an object with only an extension", { "x-id": "MIT" }, typed("an object")],
  ["a list of identifiers", ["Apache-2.0", "MIT"], typed("an array")],
  ["a list with one identifier", ["MIT"], typed("an array")],
  ["an array with a null item", [null], typed("an array")],
  ["an array with an empty string", [""], typed("an array")],
  ["a reference to an identifier", spdxName("apache"), null],
  ["a chained reference to an identifier", spdxName("apacheAlias"), null],
  ["a reference chained twice", spdxName("apacheAliasTwice"), null],
  ["a pointer into an array item", { $ref: "#/components/x-license-names/list/1" }, null],
  ["a pointer to an array item with a free-text name", { $ref: "#/components/x-license-names/list/0" }, invalid("Apache License 2.0")],
  ["an escaped slash pointer", { $ref: "#/components/x-license-names/a~1b" }, null],
  ["an escaped tilde pointer", { $ref: "#/components/x-license-names/a~0b" }, null],
  ["a percent-encoded pointer", { $ref: "#/components/x-license-names/with%20space" }, null],
  ["a pointer to the name of another license", { $ref: "#/components/x-licenses/valid/name" }, null],
  ["a pointer to the free-text name of another license", { $ref: "#/components/x-licenses/freeText/name" }, invalid("Apache License 2.0")],
  ["a reference to a free-text name", spdxName("freeText"), invalid("Apache License 2.0")],
  ["a chained reference to a free-text name", spdxName("freeTextAlias"), invalid("Apache License 2.0")],
  ["a reference to a lower-case identifier", spdxName("lowerCase"), suggest("mit", "MIT")],
  ["a reference to a number", spdxName("number"), typed("a number")],
  ["a reference to false", spdxName("falsy"), typed("a boolean")],
  ["a reference to a non-empty object", spdxName("object"), typed("an object")],
  ["a reference to a non-empty array", spdxName("list"), typed("an array")],
  ["a reference to an identifier with a free-text sibling, which is ignored", { ...spdxName("apache"), value: "Proprietary" }, null],
  ["a reference to a free-text name with an identifier sibling, which is ignored", { ...spdxName("freeText"), value: "MIT" }, invalid("Apache License 2.0")],
];

const SPDX_EMPTY_NAMES = [
  ["an empty string", ""],
  ["a space", " "],
  ["a tab", "\t"],
  ["a newline", "\n"],
  ["mixed whitespace", " \t\r\n \n"],
  ["very long whitespace", " ".repeat(100000)],
  ["non-breaking spaces", chars(0xa0, 0xa0)],
  ["an ideographic space", chars(0x3000)],
  ["em and thin spaces", chars(0x2003, 0x2009)],
  ["line and paragraph separators", chars(0x2028, 0x2029)],
  ["zero-width characters", chars(0x200b, 0x200c, 0x200d, 0x2060)],
  ["a byte order mark", chars(0xfeff)],
  ["zero-width characters between spaces", ` ${chars(0x200b)} \t${chars(0xfeff)} `],
  ["null", null],
  ["an empty object", {}],
  ["an empty array", []],
  ["a reference to an empty string", spdxName("empty")],
  ["a reference to a blank string", spdxName("blank")],
  ["a reference to null", spdxName("nothing")],
  ["a reference to an empty object", spdxName("emptyObject")],
  ["a reference to an empty array", spdxName("emptyList")],
  ["a chain that ends in an empty string", spdxName("emptyAlias")],
  ["a reference to an empty string with a free-text sibling, which is ignored", { ...spdxName("empty"), value: "Apache 2.0" }],
  ["a dangling reference", spdxName("missing")],
  ["a pointer past the end of an array", { $ref: "#/components/x-license-names/list/5" }],
  ["a pointer through a chained license, which Spectral cannot resolve either", { $ref: "#/components/x-licenses/freeTextAlias/name" }],
  ["a cyclic reference", spdxName("cycleA")],
  ["a self reference", spdxName("self")],
  ["a reference to the document root", { $ref: "#" }],
  ["an empty reference, which points to the document itself", { $ref: "" }],
  ["a pointer without a leading slash", { $ref: "#components/x-license-names/freeText" }],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-license-names/%E0%A4%A" }],
  ["a non-string reference", { $ref: 42 }],
  ["a null reference", { $ref: null }],
  ["an external reference", { $ref: "./shared/license-names.yaml#/proprietary" }],
  ["an external whole-file reference", { $ref: "https://specs.example.io/legal/license-name.yaml" }],
  ["a local alias of an external name", spdxName("external")],
];


const SPDX_LICENSE_CASES = [
  ["an inline license with an SPDX name", SPDX_MINIMAL, []],
  ["an inline license with a deprecated SPDX name and extensions", { name: "LGPL-2.1", url: "https://www.gnu.org/licenses/lgpl-2.1.html", "x-legal-review": "2026-03" }, []],
  ["an inline license with a free-text name", { name: "Apache 2.0", url: SPDX_URL }, [["info.license.name", ...suggest("Apache 2.0", "Apache-2.0")]]],
  ["a free-text name next to an SPDX identifier and extension, which never stand in for it", { name: "Apache License 2.0", url: SPDX_URL, identifier: "Apache-2.0", "x-spdx-id": "Apache-2.0", spdx: "Apache-2.0" }, [["info.license.name", ...invalid("Apache License 2.0")]]],
  ["an SPDX name next to free-text look-alikes, which are ignored", { name: "MIT", title: "The MIT License", identifier: "MIT License", "x-spdx-id": "Proprietary", Name: "MIT License", url: "MIT License" }, []],
  ["a license without name", { url: SPDX_URL, identifier: "Apache License 2.0" }, []],
  ["a license whose keys differ in case", { Name: "Apache 2.0", NAME: "Proprietary", URL: SPDX_URL }, []],
  ["an empty license object", {}, []],
  ["a reference to a license with an SPDX name", spdxLicense("valid"), []],
  ["a chained reference", spdxLicense("validAlias"), []],
  ["a reference chained twice", spdxLicense("validAliasTwice"), []],
  ["a reference with a free-text sibling name, which is ignored", { ...spdxLicense("valid"), name: "Apache 2.0" }, []],
  ["a reference to a free-text license with an SPDX sibling name, which is ignored", { ...spdxLicense("freeText"), name: "Apache-2.0" }, [["components.x-licenses.freeText.name", ...invalid("Apache License 2.0")]]],
  ["a reference to a license with a free-text name", spdxLicense("freeText"), [["components.x-licenses.freeText.name", ...invalid("Apache License 2.0")]]],
  ["a chained reference to a license with a free-text name", spdxLicense("freeTextAlias"), [["components.x-licenses.freeText.name", ...invalid("Apache License 2.0")]]],
  ["a reference to a license with a lower-case name", spdxLicense("lowerCase"), [["components.x-licenses.lowerCase.name", ...suggest("mit", "MIT")]]],
  ["a reference to a license with a numeric name", spdxLicense("numeric"), [["components.x-licenses.numeric.name", ...typed("a number")]]],
  ["a reference to a license whose name is a chained reference", spdxLicense("nameRef"), [["components.x-licenses.nameRef.name", ...invalid("Apache License 2.0")]]],
  ["a pointer into an array item", { $ref: "#/components/x-licenses/list/0" }, []],
  ["a pointer to an array item with a free-text name", { $ref: "#/components/x-licenses/list/1" }, [["components.x-licenses.list.1.name", ...invalid("Proprietary")]]],
  ["an escaped pointer", { $ref: "#/components/x-licenses/a~1b" }, [["components.x-licenses.a/b.name", ...suggest("Apache 2.0", "Apache-2.0")]]],
  ["a percent-encoded pointer to a deprecated identifier", { $ref: "#/components/x-licenses/with%20space" }, []],
  ["a reference to a license without name", spdxLicense("noName"), []],
  ["a reference to a license with a blank name", spdxLicense("blankName"), []],
  ["a reference to an empty license", spdxLicense("empty"), []],
  ["a reference to a license whose keys differ in case", spdxLicense("caseKeys"), []],
  ["an external reference", { $ref: "./shared/licenses.yaml#/proprietary" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/legal/license.yaml" }, []],
  ["a local alias of an external license", spdxLicense("external"), []],
  ["a null license", null, []],
  ["an empty string", "", []],
  ["an SPDX identifier instead of an object", "Apache-2.0", []],
  ["a free-text name instead of an object", "Apache License 2.0", []],
  ["a number", 42, []],
  ["true", true, []],
  ["an empty list", [], []],
  ["a list holding a license with a free-text name", [{ name: "Apache 2.0", url: SPDX_URL }], []],
  ["a dangling reference", spdxLicense("missing"), []],
  ["a pointer past the end of an array", { $ref: "#/components/x-licenses/list/3" }, []],
  ["a reference to the info license itself", { $ref: "#/info/license" }, []],
  ["a cyclic reference", spdxLicense("cycleA"), []],
  ["a self reference", spdxLicense("self"), []],
  ["a reference to the document root", { $ref: "#" }, []],
  ["an empty reference", { $ref: "" }, []],
  ["a reference to a list", spdxLicense("list"), []],
  ["a reference to a string", spdxLicense("text"), []],
  ["a reference to null", spdxLicense("nothing"), []],
  ["a pointer without a leading slash", { $ref: "#components/x-licenses/freeText" }, []],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-licenses/%E0%A4%A" }, []],
  ["a non-string reference", { $ref: 42 }, []],
  ["a null reference", { $ref: null }, []],
];

const SPDX_INFO_CASES = [
  ["an inline info object with an SPDX license name", { ...SPDX_INFO, license: SPDX_MINIMAL }, []],
  ["an info object with only a free-text license", { license: { name: "Apache License 2.0" } }, [["info.license.name", ...invalid("Apache License 2.0")]]],
  ["an info object without license", { ...SPDX_INFO, description: "Order events." }, []],
  ["an empty info object", {}, []],
  ["an info object whose license key differs in case", { ...SPDX_INFO, License: { name: "Apache 2.0" }, LICENSE: { name: "Proprietary" } }, []],
  ["an info object with the British spelling licence", { ...SPDX_INFO, licence: { name: "Apache 2.0" } }, []],
  ["an info object with license look-alikes", { ...SPDX_INFO, "x-license": { name: "Apache 2.0" }, licenses: [{ name: "Proprietary" }], termsOfService: "Apache License 2.0" }, []],
  ["a reference to an info object with an SPDX license", spdxInfo("valid"), []],
  ["a chained reference to that info object", spdxInfo("validAlias"), []],
  ["a reference with a free-text sibling license, which is ignored", { ...spdxInfo("valid"), license: { name: "Apache 2.0" } }, []],
  ["a reference to an info object whose referenced license has a free-text name", spdxInfo("freeText"), [["components.x-licenses.freeText.name", ...invalid("Apache License 2.0")]]],
  ["a reference to an info object with an inline free-text license", spdxInfo("inlineInvalid"), [["components.x-info.inlineInvalid.license.name", ...suggest("Apache 2.0", "Apache-2.0")]]],
  ["a chained reference to that info object", spdxInfo("inlineInvalidAlias"), [["components.x-info.inlineInvalid.license.name", ...suggest("Apache 2.0", "Apache-2.0")]]],
  ["a reference to an info object without license", spdxInfo("noLicense"), []],
  ["a reference to an info object whose license has no name", spdxInfo("noName"), []],
  ["a reference to an empty info object", spdxInfo("empty"), []],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ["a null info", null, []],
  ["an empty string", "", []],
  ["a title instead of an object", "Commerce Events", []],
  ["a number", 42, []],
  ["false", false, []],
  ["an empty list", [], []],
  ["a list holding an info object with a free-text license", [{ ...SPDX_INFO, license: { name: "Apache 2.0" } }], []],
  ["a dangling reference", spdxInfo("missing"), []],
  ["a cyclic reference", spdxInfo("cycleA"), []],
  ["a reference to the document root", { $ref: "#" }, []],
  ["an empty reference", { $ref: "" }, []],
  ["a reference to a list", spdxInfo("list"), []],
  ["a reference to a string", spdxInfo("text"), []],
  ["a reference to null", spdxInfo("nothing"), []],
  ["a pointer without a leading slash", { $ref: "#components/x-info/inlineInvalid" }, []],
  ["a malformed percent-encoded pointer", { $ref: "#/components/x-info/%E0%A4%A" }, []],
  ["a non-string reference", { $ref: 42 }, []],
  ["a null reference", { $ref: null }, []],
];

const SPDX_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["values like the core enumeration, restricted to MIT", { values: ["MIT"] }],
  ["values allowing free-text names", { values: ["Apache License 2.0", "Apache License, Version 2.0", "Proprietary", "apache-2.0"] }],
  ["an empty values list", { values: [] }],
  ["a comma-separated values string", { values: "Apache License 2.0,Proprietary,apache-2.0" }],
  ["allowed-values", { "allowed-values": "Apache License 2.0,Proprietary" }],
  ["validValues like AAR054", { validValues: ["Proprietary"] }],
  ["fields-to-apply", { "fields-to-apply": "identifier" }],
  ["a pattern matching everything", { pattern: ".*" }],
  ["a case-insensitive flag", { caseSensitive: false, "case-sensitive": false }],
  ["an expressions flag", { allowExpressions: true, "allow-expressions": true }],
  ["a deprecated flag", { allowDeprecated: false, "allow-deprecated": false }],
  ["null values", { values: null, pattern: null }],
  ["non-string values", { values: 42, "fields-to-apply": true }],
];

const SPDX_MESSAGES = {
  suggest: (value, id) => `AAR080: The license name '${value}' must be a standard SPDX license identifier: use '${id}'.`,
  invalid: (value) => `AAR080: The license name '${value}' must be a standard SPDX license identifier such as 'Apache-2.0' or 'MIT'.`,
  type: (kind) => `AAR080: The license name must be a string holding a standard SPDX license identifier such as 'Apache-2.0' or 'MIT'; found ${kind}.`,
};

const spdxFindings = (expected) => expected.map(([path, kind, ...args]) => [path, SPDX_MESSAGES[kind](...args)]).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

module.exports.linterForRule = linterForRule;
module.exports.CASING_TYPES = CASING_TYPES;
module.exports.CASING_VALUES = CASING_VALUES;
module.exports.isValidCasing = isValidCasing;
module.exports.CONTENT_TYPE_CASES = CONTENT_TYPE_CASES;
module.exports.NON_STRING_CONTENT_TYPES = NON_STRING_CONTENT_TYPES;
module.exports.BINDING_KEY_CASES = BINDING_KEY_CASES;
module.exports.REQUIRED_BINDING_CASES = REQUIRED_BINDING_CASES;
module.exports.BINDING_VERSION_CASES = BINDING_VERSION_CASES;
module.exports.MESSAGE_EXAMPLE_CASES = MESSAGE_EXAMPLE_CASES;
module.exports.EXAMPLE_TRAIT_COMPONENTS = EXAMPLE_TRAIT_COMPONENTS;
module.exports.EXAMPLE_TRAIT_MERGE_CASES = EXAMPLE_TRAIT_MERGE_CASES;
module.exports.EXAMPLE_SCHEMA_COMPONENTS = EXAMPLE_SCHEMA_COMPONENTS;
module.exports.EXAMPLE_JSON_SCHEMA_CASES = EXAMPLE_JSON_SCHEMA_CASES;
module.exports.EXAMPLE_OPENAPI_SCHEMA_CASES = EXAMPLE_OPENAPI_SCHEMA_CASES;
module.exports.EXAMPLE_FORMAT_CASES = EXAMPLE_FORMAT_CASES;
module.exports.EXAMPLE_NUMBER_FORMAT_CASES = EXAMPLE_NUMBER_FORMAT_CASES;
module.exports.EXAMPLE_IGNORED_FORMATS = EXAMPLE_IGNORED_FORMATS;
module.exports.EXAMPLE_AVRO_SCHEMA_CASES = EXAMPLE_AVRO_SCHEMA_CASES;
module.exports.HYBRID_PROBE_SCHEMA = HYBRID_PROBE_SCHEMA;
module.exports.HYBRID_PROBE_EXAMPLES = HYBRID_PROBE_EXAMPLES;
module.exports.HYBRID_PROBE_FINDINGS = HYBRID_PROBE_FINDINGS;
module.exports.EXAMPLE_SCHEMA_FORMAT_CASES = EXAMPLE_SCHEMA_FORMAT_CASES;
module.exports.TRAIT_BASE_MESSAGE = TRAIT_BASE_MESSAGE;
module.exports.EXAMPLE_SCHEMA_TRAIT_COMPONENTS = EXAMPLE_SCHEMA_TRAIT_COMPONENTS;
module.exports.EXAMPLE_SCHEMA_TRAIT_CASES = EXAMPLE_SCHEMA_TRAIT_CASES;
module.exports.REQUIRED_TRAIT_COMPONENTS = REQUIRED_TRAIT_COMPONENTS;
module.exports.REQUIRED_TRAIT_CASES = REQUIRED_TRAIT_CASES;
module.exports.REQUIRED_TRAIT_MESSAGES = REQUIRED_TRAIT_MESSAGES;
module.exports.REQUIRED_TRAIT_PROBES = REQUIRED_TRAIT_PROBES;
module.exports.REQUIRED_TRAIT_OPTIONS = REQUIRED_TRAIT_OPTIONS;
module.exports.requiredTraitFindings = requiredTraitFindings;
module.exports.requiredTraitProbeFindings = requiredTraitProbeFindings;
module.exports.PROPERTY_KEYWORD_CASES = PROPERTY_KEYWORD_CASES;
module.exports.NON_STRING_AVRO_NAMES = NON_STRING_AVRO_NAMES;
module.exports.PROPERTY_FORMAT_CASES = PROPERTY_FORMAT_CASES;
module.exports.PROPERTY_FORMAT_PAYLOADS = PROPERTY_FORMAT_PAYLOADS;
module.exports.PROPERTY_FORMAT_FINDINGS = PROPERTY_FORMAT_FINDINGS;
module.exports.AVRO_TEXT_SCHEMA = AVRO_TEXT_SCHEMA;
module.exports.INFO_DEFAULT_FIELDS = INFO_DEFAULT_FIELDS;
module.exports.INFO_COMPONENTS = INFO_COMPONENTS;
module.exports.INFO_VALUE_CASES = INFO_VALUE_CASES;
module.exports.INFO_OBJECT_CASES = INFO_OBJECT_CASES;
module.exports.INFO_PROBE = INFO_PROBE;
module.exports.INFO_OPTION_CASES = INFO_OPTION_CASES;
module.exports.INFO_MESSAGES = INFO_MESSAGES;
module.exports.infoProbeFindings = infoProbeFindings;
module.exports.TAG_COMPONENTS = TAG_COMPONENTS;
module.exports.TAG_ITEM_CASES = TAG_ITEM_CASES;
module.exports.TAG_LIST_CASES = TAG_LIST_CASES;
module.exports.TAG_PROBE = TAG_PROBE;
module.exports.TAG_OPTION_CASES = TAG_OPTION_CASES;
module.exports.TAG_MESSAGES = TAG_MESSAGES;
module.exports.tagFinding = tagFinding;
module.exports.tagFindings = tagFindings;
module.exports.tagProbeFindings = tagProbeFindings;
module.exports.CONTACT_FIELDS = CONTACT_FIELDS;
module.exports.CONTACT_COMPLETE = CONTACT_COMPLETE;
module.exports.CONTACT_MINIMAL = CONTACT_MINIMAL;
module.exports.CONTACT_COMPONENTS = CONTACT_COMPONENTS;
module.exports.CONTACT_VALUE_CASES = CONTACT_VALUE_CASES;
module.exports.CONTACT_OBJECT_CASES = CONTACT_OBJECT_CASES;
module.exports.CONTACT_INFO_CASES = CONTACT_INFO_CASES;
module.exports.CONTACT_IGNORED_OPTIONS = CONTACT_IGNORED_OPTIONS;
module.exports.CONTACT_MESSAGES = CONTACT_MESSAGES;
module.exports.contactTarget = contactTarget;
module.exports.contactFindings = contactFindings;
module.exports.LICENSE_FIELDS = LICENSE_FIELDS;
module.exports.LICENSE_COMPLETE = LICENSE_COMPLETE;
module.exports.LICENSE_MINIMAL = LICENSE_MINIMAL;
module.exports.LICENSE_COMPONENTS = LICENSE_COMPONENTS;
module.exports.LICENSE_VALUE_CASES = LICENSE_VALUE_CASES;
module.exports.LICENSE_OBJECT_CASES = LICENSE_OBJECT_CASES;
module.exports.LICENSE_INFO_CASES = LICENSE_INFO_CASES;
module.exports.LICENSE_IGNORED_OPTIONS = LICENSE_IGNORED_OPTIONS;
module.exports.LICENSE_MESSAGES = LICENSE_MESSAGES;
module.exports.licenseTarget = licenseTarget;
module.exports.licenseFindings = licenseFindings;
module.exports.DOCS_FIELDS = DOCS_FIELDS;
module.exports.DOCS_COMPLETE = DOCS_COMPLETE;
module.exports.DOCS_MINIMAL = DOCS_MINIMAL;
module.exports.DOCS_URL_ONLY = DOCS_URL_ONLY;
module.exports.DOCS_COMPONENTS = DOCS_COMPONENTS;
module.exports.DOCS_VALUE_CASES = DOCS_VALUE_CASES;
module.exports.DOCS_OBJECT_CASES = DOCS_OBJECT_CASES;
module.exports.DOCS_SCHEMA_KEYWORD_CASES = DOCS_SCHEMA_KEYWORD_CASES;
module.exports.DOCS_SCHEMA_IGNORED_CASES = DOCS_SCHEMA_IGNORED_CASES;
module.exports.DOCS_SCHEMA_FORMAT_CASES = DOCS_SCHEMA_FORMAT_CASES;
module.exports.DOCS_IGNORED_OPTIONS = DOCS_IGNORED_OPTIONS;
module.exports.DOCS_MESSAGES = DOCS_MESSAGES;
module.exports.docsTarget = docsTarget;
module.exports.docsFinding = docsFinding;
module.exports.docsFindings = docsFindings;
module.exports.SPDX_URL = SPDX_URL;
module.exports.SPDX_MINIMAL = SPDX_MINIMAL;
module.exports.SPDX_INFO = SPDX_INFO;
module.exports.SPDX_VALID_IDS = SPDX_VALID_IDS;
module.exports.SPDX_DEPRECATED_IDS = SPDX_DEPRECATED_IDS;
module.exports.SPDX_COMPONENTS = SPDX_COMPONENTS;
module.exports.SPDX_NAME_CASES = SPDX_NAME_CASES;
module.exports.SPDX_EMPTY_NAMES = SPDX_EMPTY_NAMES;
module.exports.SPDX_LICENSE_CASES = SPDX_LICENSE_CASES;
module.exports.SPDX_INFO_CASES = SPDX_INFO_CASES;
module.exports.SPDX_IGNORED_OPTIONS = SPDX_IGNORED_OPTIONS;
module.exports.SPDX_MESSAGES = SPDX_MESSAGES;
module.exports.spdxName = spdxName;
module.exports.spdxLicense = spdxLicense;
module.exports.spdxInfo = spdxInfo;
module.exports.spdxFindings = spdxFindings;
