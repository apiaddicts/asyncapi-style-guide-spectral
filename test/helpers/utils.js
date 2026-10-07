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

module.exports.linterForRule = linterForRule;
module.exports.CASING_TYPES = CASING_TYPES;
module.exports.CASING_VALUES = CASING_VALUES;
module.exports.isValidCasing = isValidCasing;
module.exports.CONTENT_TYPE_CASES = CONTENT_TYPE_CASES;
module.exports.NON_STRING_CONTENT_TYPES = NON_STRING_CONTENT_TYPES;
module.exports.BINDING_KEY_CASES = BINDING_KEY_CASES;
