const { findingsFrom, unusableObjectCases } = require("../required-fields");

const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "orderPlaced" };
const atOf = (major) => `channels.${NAMES[major]}`;

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const MSG = {
  missing: (channel) => `AAR090: Channel '${shown(channel)}' must declare a 'kafka' binding.`,
  invalid: (channel) => `AAR090: The 'kafka' binding of channel '${shown(channel)}' must be an object.`,
  unusable: (channel) => `AAR090: Channel '${shown(channel)}' must be an object declaring a 'kafka' binding.`,
};

const findings = findingsFrom(MSG);

const channelTarget = (name) => ({ $ref: `#/components/x-channels/${name}` });
const bindingsRef = (name) => ({ $ref: `#/components/channelBindings/${name}` });
const kafkaRef = (name) => ({ $ref: `#/components/x-kafka/${name}` });
const messageRef = (name) => ({ $ref: `#/components/messages/${name}` });

const TOPIC = "retail.cdc.orders.placed.v1";

const KAFKA = {
  v010: {},
  v030: { topic: TOPIC, partitions: 12, replicas: 3, bindingVersion: "0.3.0" },
  v040: {
    topic: TOPIC,
    partitions: 24,
    replicas: 3,
    topicConfiguration: { "cleanup.policy": ["delete", "compact"], "retention.ms": 604800000, "retention.bytes": -1, "delete.retention.ms": 86400000, "max.message.bytes": 1048588 },
    bindingVersion: "0.4.0",
  },
  v050: {
    topic: TOPIC,
    partitions: 24,
    replicas: 3,
    topicConfiguration: {
      "cleanup.policy": ["delete"],
      "retention.ms": 604800000,
      "max.message.bytes": 1048588,
      "confluent.key.schema.validation": true,
      "confluent.key.subject.name.strategy": "TopicNameStrategy",
      "confluent.value.schema.validation": true,
      "confluent.value.subject.name.strategy": "TopicNameStrategy",
    },
    bindingVersion: "0.5.0",
  },
};

const OTHER_BINDINGS = {
  amqp: { is: "routingKey", exchange: { name: "retail.orders", type: "topic", durable: true, autoDelete: false, vhost: "/" }, bindingVersion: "0.3.0" },
  mqtt: {},
  ws: { method: "GET", query: { type: "object", properties: { token: { type: "string" } } }, bindingVersion: "0.1.0" },
  ibmmq: { destinationType: "topic", topic: { string: "retail/orders/placed", objectName: "ORDERS" }, bindingVersion: "0.1.0" },
  googlepubsub: { messageRetentionDuration: "86400s", bindingVersion: "0.2.0" },
};

const KAFKA_OPERATION = { groupId: { type: "string", enum: ["retail-orders"] }, clientId: { type: "string", enum: ["retail-orders-1"] }, bindingVersion: "0.5.0" };
const KAFKA_MESSAGE = { key: { type: "string" }, schemaIdLocation: "payload", schemaIdPayloadEncoding: "4", bindingVersion: "0.5.0" };
const KAFKA_SERVER = { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" };

const ORDER_PLACED = {
  name: "orderPlaced",
  title: "Order placed",
  contentType: "application/json",
  payload: { type: "object", properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
};

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} complete: a channel with a populated kafka binding, minimal: only an empty kafka binding, bare: a channel of that version without bindings
 */
const shapesFor = (major) => {
  const bare =
    major === 3
      ? { address: TOPIC, description: "Orders placed in any sales channel.", messages: { orderPlaced: messageRef("orderPlaced") } }
      : {
          description: "Orders placed in any sales channel.",
          subscribe: { operationId: "receiveOrderPlaced", message: messageRef("orderPlaced") },
          publish: { operationId: "publishOrderPlaced", message: messageRef("orderPlaced") },
        };
  const complete = { ...bare, bindings: { kafka: KAFKA.v050 } };
  const minimal = { bindings: { kafka: {} } };
  return { complete, minimal, bare };
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: messages, shared channel bindings, x-kafka binding targets and x-channels channel targets
 */
const channelComponentsFor = (major) => {
  const { complete, minimal, bare } = shapesFor(major);
  return {
    messages: { orderPlaced: ORDER_PLACED },
    channelBindings: {
      kafkaOnly: { kafka: KAFKA.v050 },
      kafkaEmpty: { kafka: {} },
      kafkaAndOthers: { kafka: KAFKA.v040, ...OTHER_BINDINGS, "x-internal": { owner: "retail" } },
      kafkaByRef: { kafka: kafkaRef("v030") },
      kafkaExternal: { kafka: { $ref: "./shared/kafka-bindings.yaml#/orders" } },
      alias: bindingsRef("kafkaOnly"),
      aliasTwice: bindingsRef("alias"),
      external: { $ref: "./shared/channel-bindings.yaml#/orders" },
      noKafka: { amqp: OTHER_BINDINGS.amqp },
      noKafkaAlias: bindingsRef("noKafka"),
      emptyBindings: {},
      upperCase: { Kafka: KAFKA.v050, KAFKA: {} },
      extension: { "x-kafka": KAFKA.v050 },
      nullKafka: { kafka: null },
      textKafka: { kafka: "enabled" },
      listKafka: { kafka: [KAFKA.v050] },
      danglingKafka: { kafka: kafkaRef("missing") },
      cycleA: bindingsRef("cycleB"),
      cycleB: bindingsRef("cycleA"),
      self: bindingsRef("self"),
      list: [{ kafka: {} }],
      text: "kafka",
      nothing: null,
      "a/b": { kafka: {} },
      "with space": { kafka: KAFKA.v030 },
      "espa\u00f1a": { kafka: KAFKA.v040 },
    },
    "x-kafka": {
      ...KAFKA,
      alias: kafkaRef("v050"),
      aliasTwice: kafkaRef("alias"),
      external: { $ref: "./shared/kafka-bindings.yaml#/orders" },
      cycleA: kafkaRef("cycleB"),
      cycleB: kafkaRef("cycleA"),
      self: kafkaRef("self"),
      list: [KAFKA.v050],
      text: "kafka",
      nothing: null,
      falsy: false,
      "a/b": KAFKA.v030,
      "with space": {},
      "espa\u00f1a": KAFKA.v040,
    },
    "x-channels": {
      complete,
      minimal,
      bare,
      alias: channelTarget("complete"),
      aliasTwice: channelTarget("alias"),
      bareAlias: channelTarget("bare"),
      emptyBindings: { ...bare, bindings: {} },
      amqpOnly: { ...bare, bindings: { amqp: OTHER_BINDINGS.amqp } },
      nullKafka: { ...bare, bindings: { kafka: null } },
      sharedNoKafka: { ...bare, bindings: bindingsRef("noKafka") },
      extensionsOnly: { ...bare, "x-bindings": { kafka: {} } },
      caseKeys: { ...bare, Bindings: { kafka: {} }, BINDINGS: { kafka: {} } },
      empty: {},
      cycleA: channelTarget("cycleB"),
      cycleB: channelTarget("cycleA"),
      self: channelTarget("self"),
      list: [complete],
      text: TOPIC,
      nothing: null,
      external: { $ref: "./shared/channels.yaml#/orderPlaced" },
      "a/b": complete,
      "with space": minimal,
      "espa\u00f1a": complete,
    },
  };
};

const KAFKA_VALUE_CASES = [
  ["an empty object, the kafka binding 0.1.0 form", {}, true],
  ["a kafka binding 0.3.0 with topic, partitions and replicas", KAFKA.v030, true],
  ["a kafka binding 0.4.0 with a topic configuration", KAFKA.v040, true],
  ["a kafka binding 0.5.0 with the Confluent schema validation settings", KAFKA.v050, true],
  ["an object with only the bindingVersion", { bindingVersion: "0.1.0" }, true],
  ["an object with null fields", { topic: null, partitions: null, bindingVersion: null }, true],
  ["an object with only an extension", { "x-owner": "retail" }, true],
  ["an object with operation binding fields", KAFKA_OPERATION, true],
  ["an object with an unknown bindingVersion", { bindingVersion: "9.9.9" }, true],
  ["a local reference to a kafka binding", kafkaRef("v050"), true],
  ["a reference to an empty kafka binding", kafkaRef("v010"), true],
  ["a chained reference", kafkaRef("alias"), true],
  ["a reference chained twice", kafkaRef("aliasTwice"), true],
  ["a reference with siblings, which are ignored", { ...kafkaRef("v040"), topic: 42 }, true],
  ["a reference to the kafka binding of a shared bindings object", { $ref: "#/components/channelBindings/kafkaOnly/kafka" }, true],
  ["a reference to another object", { $ref: "#/info" }, true],
  ["a pointer into an array item", { $ref: "#/components/x-kafka/list/0" }, true],
  ["an escaped pointer", { $ref: "#/components/x-kafka/a~1b" }, true],
  ["a percent-encoded pointer", { $ref: "#/components/x-kafka/with%20space" }, true],
  ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-kafka/espa%C3%B1a" }, true],
  ["an external reference", { $ref: "./shared/kafka-bindings.yaml#/orders" }, true],
  ["an external whole-file reference", { $ref: "https://specs.example.io/bindings/kafka-orders.yaml" }, true],
  ["a local alias of an external binding", kafkaRef("external"), true],
  ["the string kafka", "kafka", false],
  ["the string true", "true", false],
  ["a blank string", " \t ", false],
  ["one", 1, false],
  ["a list of kafka bindings", [KAFKA.v030, KAFKA.v050], false],
  ["a list holding an empty object", [{}], false],
  ["a reference to false", kafkaRef("falsy"), false],
  ["a self reference", kafkaRef("self"), false],
  ["a pointer past the end of an array", { $ref: "#/components/x-kafka/list/3" }, false],
  ["a pointer through a chained binding", { $ref: "#/components/x-kafka/alias/topic" }, false],
  ["a pointer through a shared bindings reference", { $ref: "#/components/channelBindings/alias/kafka" }, false],
  ["a reference to a pointer into the topic", { $ref: "#/components/x-kafka/v030/topic" }, false],
  ...unusableObjectCases(kafkaRef, { text: "kafka", item: KAFKA.v050, pointer: "v050" }, () => false),
];

const BINDINGS_VALUE_CASES = [
  ["a kafka binding", { kafka: KAFKA.v050 }, null],
  ["an empty kafka binding", { kafka: {} }, null],
  ["a kafka binding next to amqp, mqtt, ws, ibmmq, googlepubsub and an extension", { ...OTHER_BINDINGS, kafka: KAFKA.v040, "x-internal": { owner: "retail" } }, null],
  ["a kafka binding next to look-alike keys", { kafka: {}, Kafka: null, "x-kafka": null, "kafka-secure": null }, null],
  ["a kafka binding given as a reference", { kafka: kafkaRef("v030") }, null],
  ["a kafka binding given as an external reference", { kafka: { $ref: "./shared/kafka-bindings.yaml#/orders" } }, null],
  ["a reference to shared bindings with a kafka binding", bindingsRef("kafkaOnly"), null],
  ["a reference to shared bindings with an empty kafka binding", bindingsRef("kafkaEmpty"), null],
  ["a reference to shared bindings with several protocols", bindingsRef("kafkaAndOthers"), null],
  ["a reference to shared bindings whose kafka binding is a reference", bindingsRef("kafkaByRef"), null],
  ["a reference to shared bindings whose kafka binding is external", bindingsRef("kafkaExternal"), null],
  ["a chained reference", bindingsRef("alias"), null],
  ["a reference chained twice", bindingsRef("aliasTwice"), null],
  ["a reference with siblings, which are ignored", { ...bindingsRef("kafkaOnly"), kafka: null, amqp: {} }, null],
  ["a pointer into an array item", { $ref: "#/components/channelBindings/list/0" }, null],
  ["an escaped pointer", { $ref: "#/components/channelBindings/a~1b" }, null],
  ["a percent-encoded pointer", { $ref: "#/components/channelBindings/with%20space" }, null],
  ["a UTF-8 percent-encoded pointer", { $ref: "#/components/channelBindings/espa%C3%B1a" }, null],
  ["an external reference", { $ref: "./shared/channel-bindings.yaml#/orders" }, null],
  ["an external whole-file reference", { $ref: "https://specs.example.io/bindings/orders.yaml" }, null],
  ["a local alias of external bindings", bindingsRef("external"), null],
  ["a reference to the bindings of another channel", { $ref: "#/components/x-channels/complete/bindings" }, null],
  ["an empty bindings object", {}, "missing"],
  ["an amqp binding only", { amqp: OTHER_BINDINGS.amqp }, "missing"],
  ["every other protocol binding", { ...OTHER_BINDINGS, http: {}, sqs: { queue: { name: "orders" } }, nats: { queue: "orders" } }, "missing"],
  ["a kafka key in upper case", { KAFKA: KAFKA.v050 }, "missing"],
  ["a kafka key in title case", { Kafka: KAFKA.v050 }, "missing"],
  ["a kafka extension", { "x-kafka": KAFKA.v050 }, "missing"],
  ["a kafka-secure key", { "kafka-secure": KAFKA.v050 }, "missing"],
  ["a kafka key with surrounding spaces", { " kafka": {}, "kafka ": {} }, "missing"],
  ["a kafka key with a zero-width character", { "kafka\u200b": {} }, "missing"],
  ["look-alike kafka keys", { kafkaBinding: {}, kafka_binding: {}, "bindings.kafka": {}, confluent: {} }, "missing"],
  ["kafka binding fields written directly in bindings", { topic: TOPIC, partitions: 12, bindingVersion: "0.5.0" }, "missing"],
  ["a reference to shared bindings without kafka", bindingsRef("noKafka"), "missing"],
  ["a chained reference to shared bindings without kafka", bindingsRef("noKafkaAlias"), "missing"],
  ["a reference to empty shared bindings", bindingsRef("emptyBindings"), "missing"],
  ["a reference to shared bindings whose kafka key differs in case", bindingsRef("upperCase"), "missing"],
  ["a reference to shared bindings with only a kafka extension", bindingsRef("extension"), "missing"],
  ["a reference to empty shared bindings with a kafka sibling, which is ignored", { ...bindingsRef("emptyBindings"), kafka: {} }, "missing"],
  ["a reference to the kafka binding itself instead of the bindings", { $ref: "#/components/channelBindings/kafkaOnly/kafka" }, "missing"],
  ["a self reference", bindingsRef("self"), "missing"],
  ["a pointer past the end of an array", { $ref: "#/components/channelBindings/list/3" }, "missing"],
  ["a pointer through a chained bindings reference", { $ref: "#/components/channelBindings/alias/kafka" }, "missing"],
  ["a reference to a channel instead of its bindings", { $ref: "#/components/x-channels/complete" }, "missing"],
  ...unusableObjectCases(bindingsRef, { text: "kafka", item: { kafka: {} }, pointer: "kafkaOnly" }, () => "missing"),
  ["a kafka binding set to null", { kafka: null }, "invalid"],
  ["a kafka binding set to true", { kafka: true }, "invalid"],
  ["a kafka binding set to false", { kafka: false }, "invalid"],
  ["a kafka binding set to zero", { kafka: 0 }, "invalid"],
  ["a kafka binding set to an empty string", { kafka: "" }, "invalid"],
  ["a kafka binding set to a protocol name", { kafka: "kafka-secure" }, "invalid"],
  ["a kafka binding set to an empty list", { kafka: [] }, "invalid"],
  ["a kafka binding set to a list", { kafka: [KAFKA.v050] }, "invalid"],
  ["a kafka binding set to a dangling reference", { kafka: kafkaRef("missing") }, "invalid"],
  ["a kafka binding set to a cyclic reference", { kafka: kafkaRef("cycleA") }, "invalid"],
  ["a kafka binding set to a reference to null", { kafka: kafkaRef("nothing") }, "invalid"],
  ["a kafka binding next to other protocols set to null", { ...OTHER_BINDINGS, kafka: null }, "invalid"],
  ["a reference to shared bindings whose kafka binding is null", bindingsRef("nullKafka"), "invalid"],
  ["a reference to shared bindings whose kafka binding is a string", bindingsRef("textKafka"), "invalid"],
  ["a reference to shared bindings whose kafka binding is a list", bindingsRef("listKafka"), "invalid"],
  ["a reference to shared bindings whose kafka binding is a dangling reference", bindingsRef("danglingKafka"), "invalid"],
  ["a reference to shared bindings whose kafka binding is null, with an ignored kafka sibling", { ...bindingsRef("nullKafka"), kafka: {} }, "invalid"],
];

const REFERENCE_LANDING = {
  "#/components/x-channels/cycleA": ["components.x-channels.cycleB", "cycleB"],
  "#/components/x-channels/list": ["components.x-channels.list", "list"],
  "#/components/x-channels/text": ["components.x-channels.text", "text"],
  "#/components/x-channels/nothing": ["components.x-channels.nothing", "nothing"],
};

const sharedReferenceCases = (major) => {
  const AT = atOf(major);
  const NAME = NAMES[major];
  const { complete, minimal } = shapesFor(major);
  return [
    ["a reference to a complete channel", channelTarget("complete"), []],
    ["a reference to a minimal channel", channelTarget("minimal"), []],
    ["a chained reference", channelTarget("alias"), []],
    ["a reference chained twice", channelTarget("aliasTwice"), []],
    ["a reference with bindings siblings, which are ignored", { ...channelTarget("complete"), bindings: {} }, []],
    ["a reference to a channel without bindings, whose kafka siblings are ignored", { ...channelTarget("bare"), bindings: { kafka: {} } }, [["components.x-channels.bare", "missing", "bare"]]],
    ["a pointer into an array item", { $ref: "#/components/x-channels/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-channels/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-channels/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-channels/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/channels.yaml#/orderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/channels/order-placed.yaml" }, []],
    ["a local alias of an external channel", channelTarget("external"), []],
    ["a reference to a channel without bindings", channelTarget("bare"), [["components.x-channels.bare", "missing", "bare"]]],
    ["a chained reference to a channel without bindings", channelTarget("bareAlias"), [["components.x-channels.bare", "missing", "bare"]]],
    ["a reference to a channel with empty bindings", channelTarget("emptyBindings"), [["components.x-channels.emptyBindings.bindings", "missing", "emptyBindings"]]],
    ["a reference to a channel with only an amqp binding", channelTarget("amqpOnly"), [["components.x-channels.amqpOnly.bindings", "missing", "amqpOnly"]]],
    ["a reference to a channel whose kafka binding is null", channelTarget("nullKafka"), [["components.x-channels.nullKafka.bindings.kafka", "invalid", "nullKafka"]]],
    ["a reference to a channel whose bindings reference shared bindings without kafka", channelTarget("sharedNoKafka"), [["components.x-channels.sharedNoKafka.bindings", "missing", "sharedNoKafka"]]],
    ["a reference to a channel with only x-bindings", channelTarget("extensionsOnly"), [["components.x-channels.extensionsOnly", "missing", "extensionsOnly"]]],
    ["a reference to a channel whose bindings key differs in case", channelTarget("caseKeys"), [["components.x-channels.caseKeys", "missing", "caseKeys"]]],
    ["a reference to an empty channel", channelTarget("empty"), [["components.x-channels.empty", "missing", "empty"]]],
    ["a reference to an object that is not a channel", { $ref: "#/info" }, [["info", "missing", "info"]]],
    ["a reference to a bindings object instead of a channel", bindingsRef("kafkaOnly"), [["components.channelBindings.kafkaOnly", "missing", "kafkaOnly"]]],
    ...unusableObjectCases(
      channelTarget,
      { text: TOPIC, item: complete },
      () => [[AT, "unusable", NAME]],
      (ref) => {
        const [path, name] = REFERENCE_LANDING[ref] || [AT, NAME];
        return [[path, "unusable", name]];
      }
    ),
    ["a list of channels", [minimal, complete], [[AT, "unusable", NAME]]],
    ["a pointer past the end of an array", { $ref: "#/components/x-channels/list/3" }, [[AT, "unusable", NAME]]],
    ["a pointer through a chained channel", { $ref: "#/components/x-channels/alias/bindings" }, [[AT, "unusable", NAME]]],
    ["a self reference", channelTarget("self"), [["components.x-channels.self", "unusable", "self"]]],
    ["a reference to the channel itself", { $ref: `#/channels/${NAME}` }, [[AT, "unusable", NAME]]],
  ];
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, channel, expected] cases for a channel written at channels.<NAMES[major]>
 */
const channelObjectCasesFor = (major) => {
  const AT = atOf(major);
  const NAME = NAMES[major];
  const { complete, minimal, bare } = shapesFor(major);
  const missing = [[AT, "missing", NAME]];
  const missingInBindings = [[`${AT}.bindings`, "missing", NAME]];
  const v3 = major === 3;
  return [
    ["a complete inline channel", complete, []],
    ["a channel with only an empty kafka binding", minimal, []],
    [
      "a channel with every optional field",
      v3
        ? {
            ...complete,
            title: "Orders placed",
            summary: "Orders placed.",
            servers: [{ $ref: "#/servers/production" }],
            parameters: { storeId: { description: "Store identifier.", enum: ["MAD001", "BCN002"], default: "MAD001", location: "$message.payload#/storeId" } },
            tags: [{ name: "orders" }],
            externalDocs: { url: "https://docs.example.io/orders" },
            "x-owner": "orders",
          }
        : {
            ...complete,
            servers: ["production"],
            parameters: { storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" }, location: "$message.payload#/storeId" } },
            deprecated: false,
            "x-owner": "orders",
          },
      [],
    ],
    ["a channel written for the other AsyncAPI version with a kafka binding", v3 ? { ...shapesFor(2).bare, bindings: { kafka: {} } } : { ...shapesFor(3).bare, bindings: { kafka: {} } }, []],
    ["an empty channel", {}, missing],
    ["a channel without bindings", bare, missing],
    ["a channel whose bindings are only an extension", { ...bare, "x-bindings": { kafka: {} } }, missing],
    ["a channel whose bindings key differs in case", { ...bare, Bindings: { kafka: {} }, BINDINGS: { kafka: {} } }, missing],
    ["a channel with a singular binding key", { ...bare, binding: { kafka: {} } }, missing],
    ["a channel with a kafka key outside its bindings", { ...bare, kafka: KAFKA.v050 }, missing],
    ["a channel with a dotted bindings.kafka key", { ...bare, "bindings.kafka": {} }, missing],
    ["a channel whose kafka binding is only in its parameters", { ...bare, parameters: { region: { description: "Region.", bindings: { kafka: {} } } } }, missing],
    ...(v3
      ? [
          ["a channel whose kafka binding is only in its messages", { ...bare, messages: { orderPlaced: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } } } }, missing],
          ["a channel whose kafka binding is only in a message trait", { ...bare, messages: { orderPlaced: { ...ORDER_PLACED, traits: [{ bindings: { kafka: KAFKA_MESSAGE } }] } } }, missing],
          ["a channel whose kafka binding is only in the server it references", { ...bare, servers: [{ $ref: "#/servers/production" }] }, missing],
          ["a reply channel with a null address and a kafka binding", { address: null, description: "Replies.", messages: { orderAccepted: messageRef("orderPlaced") }, bindings: { kafka: {} } }, []],
          ["a reply channel with a null address and no bindings", { address: null, description: "Replies.", messages: { orderAccepted: messageRef("orderPlaced") } }, missing],
          ["a channel whose kafka binding is only in AsyncAPI 2.x operations", { ...bare, subscribe: { bindings: { kafka: KAFKA_OPERATION } }, publish: { bindings: { kafka: KAFKA_OPERATION } } }, missing],
        ]
      : [
          ["a channel whose kafka binding is only in its operations", { ...bare, subscribe: { ...bare.subscribe, bindings: { kafka: KAFKA_OPERATION } }, publish: { ...bare.publish, bindings: { kafka: KAFKA_OPERATION } } }, missing],
          ["a channel whose kafka binding is only in an operation trait", { ...bare, subscribe: { ...bare.subscribe, traits: [{ bindings: { kafka: KAFKA_OPERATION } }] } }, missing],
          ["a channel whose kafka binding is only in its operation message", { ...bare, subscribe: { message: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } } } }, missing],
          ["a channel whose kafka binding is only in a oneOf message", { ...bare, subscribe: { message: { oneOf: [{ ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } }, messageRef("orderPlaced")] } } }, missing],
          ["a channel whose kafka binding is only in a message trait", { ...bare, subscribe: { message: { ...ORDER_PLACED, traits: [{ bindings: { kafka: KAFKA_MESSAGE } }] } } }, missing],
          ["a channel whose kafka binding is only in the server it lists", { ...bare, servers: ["production"] }, missing],
          ["a channel whose kafka binding is only in AsyncAPI 3.x messages", { ...bare, messages: { orderPlaced: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } } } }, missing],
        ]),
    ["a channel with an empty bindings object", { ...bare, bindings: {} }, missingInBindings],
    ["a channel with null bindings", { ...bare, bindings: null }, missingInBindings],
    ["a channel whose bindings are a list of bindings objects", { ...bare, bindings: [{ kafka: {} }] }, missingInBindings],
    ["a channel whose bindings are a protocol name", { ...bare, bindings: "kafka" }, missingInBindings],
    ["a channel with only non-kafka bindings", { ...bare, bindings: OTHER_BINDINGS }, missingInBindings],
    ["a channel whose kafka binding is null", { ...bare, bindings: { kafka: null } }, [[`${AT}.bindings.kafka`, "invalid", NAME]]],
    ["a channel whose kafka binding is true", { ...bare, bindings: { kafka: true, amqp: OTHER_BINDINGS.amqp } }, [[`${AT}.bindings.kafka`, "invalid", NAME]]],
    ["a channel whose shared bindings hold a null kafka binding", { ...bare, bindings: bindingsRef("nullKafka") }, [[`${AT}.bindings`, "invalid", NAME]]],
    ...sharedReferenceCases(major),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a field option like the rule table", { field: "bindings.kafka" }],
  ["a field option naming another binding", { field: "bindings.amqp" }],
  ["a properties list with another protocol", { properties: ["amqp"] }],
  ["a properties list with every protocol", { properties: ["kafka", "amqp", "mqtt", "ws"] }],
  ["a required-bindings list", { "required-bindings": "amqp,mqtt" }],
  ["an empty required-bindings list", { "required-bindings": "" }],
  ["a bindings option", { bindings: "mqtt", binding: "ws", protocol: "amqp" }],
  ["allowed-bindings", { "allowed-bindings": "amqp" }],
  ["required_binding_props", { required_binding_props: "channel.kafka.topic,channel.kafka.partitions" }],
  ["fields-to-apply", { "fields-to-apply": "amqp" }],
  ["a flag accepting channels without bindings", { "allow-missing": true, required: false }],
  ["a flag rejecting empty kafka bindings", { "allow-empty": false, "non-empty": true }],
  ["a pattern", { pattern: "^amqp$" }],
  ["valid-versions", { "valid-versions": "0.5.0" }],
  ["null values", { field: null, properties: null, "required-bindings": null }],
  ["non-string values", { field: 42, properties: true, "required-bindings": ["amqp"] }],
];

module.exports = {
  NAMES,
  atOf,
  shown,
  MSG,
  findings,
  TOPIC,
  KAFKA,
  OTHER_BINDINGS,
  KAFKA_OPERATION,
  KAFKA_MESSAGE,
  KAFKA_SERVER,
  channelTarget,
  bindingsRef,
  kafkaRef,
  messageRef,
  shapesFor,
  channelComponentsFor,
  KAFKA_VALUE_CASES,
  BINDINGS_VALUE_CASES,
  channelObjectCasesFor,
  IGNORED_OPTIONS,
};
