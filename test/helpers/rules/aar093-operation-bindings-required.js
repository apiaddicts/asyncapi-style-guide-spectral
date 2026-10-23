const { findingsFrom, unusableObjectCases } = require("../required-fields");

const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "receiveOrderPlaced" };
const ACTION_V2 = "subscribe";
const atOf = (major) => (major === 3 ? `operations.${NAMES[3]}` : `channels.${NAMES[2]}.${ACTION_V2}`);

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} Expected message builders keyed by finding kind: (operation) in 3.x, (channel, action) in 2.x
 */
const messagesFor = (major) =>
  major === 3
    ? {
        missing: (operation) => `AAR093: Operation '${shown(operation)}' must declare a 'kafka' binding.`,
        invalid: (operation) => `AAR093: The 'kafka' binding of operation '${shown(operation)}' must be an object.`,
        unusable: (operation) => `AAR093: Operation '${shown(operation)}' must be an object declaring a 'kafka' binding.`,
      }
    : {
        missing: (channel, action) => `AAR093: The ${action} operation of channel '${shown(channel)}' must declare a 'kafka' binding.`,
        invalid: (channel, action) => `AAR093: The 'kafka' binding of the ${action} operation of channel '${shown(channel)}' must be an object.`,
        unusable: (channel, action) => `AAR093: The ${action} operation of channel '${shown(channel)}' must be an object declaring a 'kafka' binding.`,
      };

const findingsFor = (major) => findingsFrom(messagesFor(major));

const operationTarget = (name) => ({ $ref: `#/components/x-operations/${name}` });
const traitRef = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const bindingsRef = (name) => ({ $ref: `#/components/operationBindings/${name}` });
const kafkaRef = (name) => ({ $ref: `#/components/x-kafka/${name}` });
const channelRef = (name) => ({ $ref: `#/channels/${name}` });
const messageRef = (name) => ({ $ref: `#/components/messages/${name}` });

const TOPIC = "retail.cdc.orders.placed.v1";

const KAFKA = {
  v010: { groupId: { type: "string", enum: ["fulfilment"] }, clientId: { type: "string", enum: ["fulfilment-1"] }, bindingVersion: "0.1.0" },
  v030: { groupId: { type: "string", enum: ["fulfilment"] }, bindingVersion: "0.3.0" },
  v040: { groupId: { type: "string", enum: ["fulfilment", "invoicing"] }, clientId: { type: "string", pattern: "^fulfilment-[0-9]+$" }, bindingVersion: "0.4.0" },
  v050: { groupId: { $ref: "#/components/schemas/consumerGroup" }, clientId: { $ref: "#/components/schemas/clientId" }, bindingVersion: "0.5.0" },
};

const OTHER_BINDINGS = {
  amqp: { expiration: 100000, userId: "retail", cc: ["retail.orders"], priority: 10, deliveryMode: 2, mandatory: false, bcc: ["retail.audit"], timestamp: true, ack: false, bindingVersion: "0.3.0" },
  mqtt: { qos: 1, retain: false, messageExpiryInterval: 60, bindingVersion: "0.2.0" },
  http: { method: "POST", query: { type: "object", properties: { storeId: { type: "string" } } }, bindingVersion: "0.3.0" },
  nats: { queue: "fulfilment-workers", bindingVersion: "0.1.0" },
  solace: { destinations: [{ destinationType: "queue", queue: { name: "fulfilment", topicSubscriptions: ["retail/orders/>"] } }], bindingVersion: "0.4.0" },
  sqs: { queues: [{ name: "fulfilment-orders", fifoQueue: false }], bindingVersion: "0.2.0" },
};

const KAFKA_CHANNEL = { topic: TOPIC, partitions: 12, replicas: 3, bindingVersion: "0.5.0" };
const KAFKA_MESSAGE = { key: { type: "string" }, schemaIdLocation: "payload", schemaIdPayloadEncoding: "4", bindingVersion: "0.5.0" };
const KAFKA_SERVER = { schemaRegistryUrl: "https://schema-registry.quality.es", schemaRegistryVendor: "confluent", bindingVersion: "0.5.0" };

const ORDER_PLACED = {
  name: "orderPlaced",
  title: "Order placed",
  contentType: "application/json",
  payload: { type: "object", properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
};

const AVRO_ORDER = { type: "record", name: "OrderPlaced", namespace: "es.quality.retail", fields: [{ name: "orderId", type: "string" }, { name: "couponCode", type: ["null", "string"], default: null }] };

const messageComponentsFor = (major) => ({
  orderPlaced: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } },
  orderPlacedAvro:
    major === 3
      ? { name: "orderPlacedAvro", contentType: "application/vnd.apache.avro+json", payload: { schemaFormat: "application/vnd.apache.avro+json;version=1.9.0", schema: AVRO_ORDER }, bindings: { kafka: KAFKA_MESSAGE } }
      : { name: "orderPlacedAvro", contentType: "application/vnd.apache.avro+json", schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: AVRO_ORDER, bindings: { kafka: KAFKA_MESSAGE } },
});

const CHANNELS_V3 = {
  orders: { address: TOPIC, description: "Orders placed.", messages: { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") }, bindings: { kafka: KAFKA_CHANNEL } },
  replies: { address: null, description: "Dynamic replies.", messages: { orderAccepted: messageRef("orderPlaced") }, bindings: { kafka: {} } },
};

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} complete: an operation with a populated kafka binding, minimal: only an empty kafka binding, bare: an operation of that version without bindings
 */
const shapesFor = (major) => {
  const bare =
    major === 3
      ? { action: "receive", channel: channelRef("orders"), summary: "Receive the orders placed in any sales channel.", messages: [{ $ref: "#/channels/orders/messages/orderPlaced" }] }
      : { operationId: "receiveOrderPlaced", summary: "Receive the orders placed in any sales channel.", message: messageRef("orderPlaced") };
  const complete = { ...bare, bindings: { kafka: KAFKA.v050 } };
  const minimal = { bindings: { kafka: {} } };
  return { complete, minimal, bare };
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: messages, schemas, distractor bindings and traits, shared operation bindings and
 *   traits, and the x-kafka, x-trait-lists, x-channels and x-operations reference targets
 */
const operationComponentsFor = (major) => {
  const { complete, minimal, bare } = shapesFor(major);
  return {
    messages: messageComponentsFor(major),
    schemas: { consumerGroup: { type: "string", enum: ["fulfilment", "invoicing"] }, clientId: { type: ["string", "null"] } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL SCRAM credentials." } },
    channelBindings: { kafka: { kafka: KAFKA_CHANNEL } },
    messageBindings: { kafka: { kafka: KAFKA_MESSAGE } },
    serverBindings: { kafka: { kafka: KAFKA_SERVER } },
    messageTraits: { kafkaKey: { bindings: { kafka: KAFKA_MESSAGE } } },
    operationBindings: {
      kafkaOnly: { kafka: KAFKA.v050 },
      kafkaEmpty: { kafka: {} },
      kafkaAndOthers: { kafka: KAFKA.v040, ...OTHER_BINDINGS, "x-internal": { owner: "retail" } },
      kafkaByRef: { kafka: kafkaRef("v030") },
      kafkaExternal: { kafka: { $ref: "./shared/kafka-operation-bindings.yaml#/consumer" } },
      alias: bindingsRef("kafkaOnly"),
      aliasTwice: bindingsRef("alias"),
      external: { $ref: "./shared/operation-bindings.yaml#/orders" },
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
    operationTraits: {
      kafka: { bindings: { kafka: KAFKA.v040 } },
      kafkaEmpty: { bindings: { kafka: {} } },
      kafkaShared: { bindings: bindingsRef("kafkaOnly") },
      kafkaByRef: { bindings: { kafka: kafkaRef("v030") } },
      kafkaExternal: { bindings: { kafka: { $ref: "./shared/kafka-operation-bindings.yaml#/consumer" } } },
      kafkaAlias: traitRef("kafka"),
      withOthers: { summary: "Process order events.", bindings: { ...OTHER_BINDINGS, kafka: KAFKA.v010 } },
      noKafka: { bindings: { amqp: OTHER_BINDINGS.amqp } },
      described: { summary: "Process order events.", description: "Order events.", tags: [{ name: "orders" }] },
      extension: { "x-bindings": { kafka: {} } },
      sharedNoKafka: { bindings: bindingsRef("noKafka") },
      emptyBindings: { bindings: {} },
      nullBindings: { bindings: null },
      externalBindings: { bindings: { $ref: "./shared/operation-bindings.yaml#/orders" } },
      nullKafka: { bindings: { kafka: null } },
      textKafka: { bindings: { kafka: "kafka" } },
      listKafka: { bindings: { kafka: [KAFKA.v040] } },
      danglingKafka: { bindings: { kafka: kafkaRef("missing") } },
      sharedNullKafka: { bindings: bindingsRef("nullKafka") },
      nullAlias: traitRef("nullKafka"),
      external: { $ref: "./shared/operation-traits.yaml#/kafkaConsumer" },
    },
    "x-trait-lists": {
      kafka: [traitRef("kafka")],
      noKafka: [traitRef("noKafka")],
      nullKafka: [traitRef("nullKafka")],
      inlineNull: [{ bindings: { kafka: null } }],
      mixed: [traitRef("kafka"), traitRef("nullKafka")],
      empty: [],
      cycleA: { $ref: "#/components/x-trait-lists/cycleB" },
      cycleB: { $ref: "#/components/x-trait-lists/cycleA" },
    },
    "x-kafka": {
      ...KAFKA,
      empty: {},
      alias: kafkaRef("v050"),
      aliasTwice: kafkaRef("alias"),
      external: { $ref: "./shared/kafka-operation-bindings.yaml#/consumer" },
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
      kafkaChannel: major === 3 ? { address: TOPIC, description: "Kafka channel.", bindings: { kafka: KAFKA_CHANNEL } } : { description: "Kafka channel.", bindings: { kafka: KAFKA_CHANNEL } },
    },
    "x-operations": {
      complete,
      minimal,
      bare,
      traitOnly: { ...bare, traits: [traitRef("kafka")] },
      traitNull: { ...bare, traits: [traitRef("nullKafka")] },
      alias: operationTarget("complete"),
      aliasTwice: operationTarget("alias"),
      bareAlias: operationTarget("bare"),
      emptyBindings: { ...bare, bindings: {} },
      amqpOnly: { ...bare, bindings: { amqp: OTHER_BINDINGS.amqp } },
      nullKafka: { ...bare, bindings: { kafka: null } },
      sharedNoKafka: { ...bare, bindings: bindingsRef("noKafka") },
      extensionsOnly: { ...bare, "x-bindings": { kafka: {} } },
      caseKeys: { ...bare, Bindings: { kafka: {} }, BINDINGS: { kafka: {} } },
      empty: {},
      cycleA: operationTarget("cycleB"),
      cycleB: operationTarget("cycleA"),
      self: operationTarget("self"),
      list: [complete],
      text: NAMES[major],
      nothing: null,
      external: { $ref: "./shared/operations.yaml#/receiveOrderPlaced" },
      "a/b": complete,
      "with space": minimal,
      "espa\u00f1a": complete,
    },
  };
};

const KAFKA_VALUE_CASES = [
  ["an empty object, the kafka operation binding 0.1.0 form", {}, true],
  ["a kafka binding 0.1.0 with groupId and clientId", KAFKA.v010, true],
  ["a kafka binding 0.3.0 with a groupId", KAFKA.v030, true],
  ["a kafka binding 0.4.0 with a groupId and a clientId pattern", KAFKA.v040, true],
  ["a kafka binding 0.5.0 whose groupId and clientId are schema references", KAFKA.v050, true],
  ["an object with only the bindingVersion", { bindingVersion: "0.5.0" }, true],
  ["an object with null fields", { groupId: null, clientId: null, bindingVersion: null }, true],
  ["an object with only an extension", { "x-owner": "retail" }, true],
  ["an object with plain string groupId and clientId, which are not validated", { groupId: "fulfilment", clientId: "fulfilment-1" }, true],
  ["an object with channel binding fields", KAFKA_CHANNEL, true],
  ["an object with message binding fields", KAFKA_MESSAGE, true],
  ["an object with an unknown bindingVersion", { bindingVersion: "9.9.9" }, true],
  ["a local reference to a kafka binding", kafkaRef("v050"), true],
  ["a reference to an empty kafka binding", kafkaRef("empty"), true],
  ["a chained reference", kafkaRef("alias"), true],
  ["a reference chained twice", kafkaRef("aliasTwice"), true],
  ["a reference with siblings, which are ignored", { ...kafkaRef("v040"), groupId: 42 }, true],
  ["a reference to the kafka binding of shared operation bindings", { $ref: "#/components/operationBindings/kafkaOnly/kafka" }, true],
  ["a reference to the kafka binding of an operation trait", { $ref: "#/components/operationTraits/kafka/bindings/kafka" }, true],
  ["a reference to the kafka binding of shared channel bindings", { $ref: "#/components/channelBindings/kafka/kafka" }, true],
  ["a reference to another object", { $ref: "#/info" }, true],
  ["a pointer into an array item", { $ref: "#/components/x-kafka/list/0" }, true],
  ["an escaped pointer", { $ref: "#/components/x-kafka/a~1b" }, true],
  ["a percent-encoded pointer", { $ref: "#/components/x-kafka/with%20space" }, true],
  ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-kafka/espa%C3%B1a" }, true],
  ["an external reference", { $ref: "./shared/kafka-operation-bindings.yaml#/consumer" }, true],
  ["an external whole-file reference", { $ref: "https://specs.example.io/bindings/kafka-consumer.yaml" }, true],
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
  ["a pointer through a chained binding", { $ref: "#/components/x-kafka/alias/groupId" }, false],
  ["a pointer through a shared bindings reference", { $ref: "#/components/operationBindings/alias/kafka" }, false],
  ["a reference to the type of a groupId schema", { $ref: "#/components/x-kafka/v030/groupId/type" }, false],
  ...unusableObjectCases(kafkaRef, { text: "kafka", item: KAFKA.v050, pointer: "v050" }, () => false),
];

const BINDINGS_VALUE_CASES = [
  ["a kafka binding", { kafka: KAFKA.v050 }, null],
  ["an empty kafka binding", { kafka: {} }, null],
  ["a kafka binding next to amqp, mqtt, http, nats, solace, sqs and an extension", { ...OTHER_BINDINGS, kafka: KAFKA.v040, "x-internal": { owner: "retail" } }, null],
  ["a kafka binding next to look-alike keys", { kafka: {}, Kafka: null, "x-kafka": null, "kafka-secure": null }, null],
  ["a kafka binding given as a reference", { kafka: kafkaRef("v030") }, null],
  ["a kafka binding given as an external reference", { kafka: { $ref: "./shared/kafka-operation-bindings.yaml#/consumer" } }, null],
  ["a reference to shared bindings with a kafka binding", bindingsRef("kafkaOnly"), null],
  ["a reference to shared bindings with an empty kafka binding", bindingsRef("kafkaEmpty"), null],
  ["a reference to shared bindings with several protocols", bindingsRef("kafkaAndOthers"), null],
  ["a reference to shared bindings whose kafka binding is a reference", bindingsRef("kafkaByRef"), null],
  ["a reference to shared bindings whose kafka binding is external", bindingsRef("kafkaExternal"), null],
  ["a chained reference", bindingsRef("alias"), null],
  ["a reference chained twice", bindingsRef("aliasTwice"), null],
  ["a reference with siblings, which are ignored", { ...bindingsRef("kafkaOnly"), kafka: null, amqp: {} }, null],
  ["a pointer into an array item", { $ref: "#/components/operationBindings/list/0" }, null],
  ["an escaped pointer", { $ref: "#/components/operationBindings/a~1b" }, null],
  ["a percent-encoded pointer", { $ref: "#/components/operationBindings/with%20space" }, null],
  ["a UTF-8 percent-encoded pointer", { $ref: "#/components/operationBindings/espa%C3%B1a" }, null],
  ["an external reference", { $ref: "./shared/operation-bindings.yaml#/orders" }, null],
  ["an external whole-file reference", { $ref: "https://specs.example.io/bindings/orders-consumer.yaml" }, null],
  ["a local alias of external bindings", bindingsRef("external"), null],
  ["a reference to the bindings of another operation", { $ref: "#/components/x-operations/complete/bindings" }, null],
  ["a reference to the bindings of an operation trait", { $ref: "#/components/operationTraits/kafka/bindings" }, null],
  ["a reference to shared channel bindings with a kafka binding, used as written", { $ref: "#/components/channelBindings/kafka" }, null],
  ["an empty bindings object", {}, "missing"],
  ["an amqp binding only", { amqp: OTHER_BINDINGS.amqp }, "missing"],
  ["every other protocol binding", { ...OTHER_BINDINGS, ws: {}, ibmmq: {}, googlepubsub: {}, pulsar: {}, sns: {}, jms: {} }, "missing"],
  ["a kafka key in upper case", { KAFKA: KAFKA.v050 }, "missing"],
  ["a kafka key in title case", { Kafka: KAFKA.v050 }, "missing"],
  ["a kafka extension", { "x-kafka": KAFKA.v050 }, "missing"],
  ["a kafka-secure key", { "kafka-secure": KAFKA.v050 }, "missing"],
  ["a kafka key with surrounding spaces", { " kafka": {}, "kafka ": {} }, "missing"],
  ["a kafka key with a zero-width character", { "kafka\u200b": {} }, "missing"],
  ["look-alike kafka keys", { kafkaBinding: {}, kafka_binding: {}, "bindings.kafka": {}, confluent: {} }, "missing"],
  ["kafka binding fields written directly in bindings", { groupId: { type: "string" }, clientId: { type: "string" }, bindingVersion: "0.5.0" }, "missing"],
  ["a reference to shared bindings without kafka", bindingsRef("noKafka"), "missing"],
  ["a chained reference to shared bindings without kafka", bindingsRef("noKafkaAlias"), "missing"],
  ["a reference to empty shared bindings", bindingsRef("emptyBindings"), "missing"],
  ["a reference to shared bindings whose kafka key differs in case", bindingsRef("upperCase"), "missing"],
  ["a reference to shared bindings with only a kafka extension", bindingsRef("extension"), "missing"],
  ["a reference to empty shared bindings with a kafka sibling, which is ignored", { ...bindingsRef("emptyBindings"), kafka: {} }, "missing"],
  ["a reference to the kafka binding itself instead of the bindings", { $ref: "#/components/operationBindings/kafkaOnly/kafka" }, "missing"],
  ["a self reference", bindingsRef("self"), "missing"],
  ["a pointer past the end of an array", { $ref: "#/components/operationBindings/list/3" }, "missing"],
  ["a pointer through a chained bindings reference", { $ref: "#/components/operationBindings/alias/kafka" }, "missing"],
  ["a reference to an operation instead of its bindings", { $ref: "#/components/x-operations/complete" }, "missing"],
  ["a reference to an operation trait instead of its bindings", traitRef("kafka"), "missing"],
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

const NULL_TRAIT = "components.operationTraits.nullKafka.bindings.kafka";

/**
 * @returns {Array} [description, traits, expected] cases for an operation without bindings of its own, the same in every
 *   version: expected findings are [path, kind] pairs where "@" is the operation path, completed by the caller
 */
const traitOnlyCases = () => [
  ["an inline trait with a kafka binding", [{ bindings: { kafka: KAFKA.v040 } }], []],
  ["an inline trait with an empty kafka binding", [{ bindings: { kafka: {} } }], []],
  ["a referenced trait with a kafka binding", [traitRef("kafka")], []],
  ["a referenced trait with an empty kafka binding", [traitRef("kafkaEmpty")], []],
  ["a trait whose bindings reference shared bindings with kafka", [traitRef("kafkaShared")], []],
  ["a trait whose kafka binding is a reference", [traitRef("kafkaByRef")], []],
  ["a trait whose kafka binding is an external reference", [traitRef("kafkaExternal")], []],
  ["a trait with a kafka binding next to other protocols", [traitRef("withOthers")], []],
  ["a chained trait reference", [traitRef("kafkaAlias")], []],
  ["a traits list given as a reference", { $ref: "#/components/x-trait-lists/kafka" }, []],
  ["an external trait, which cannot be read", [traitRef("external")], []],
  ["an external whole-file trait", [{ $ref: "https://specs.example.io/traits/kafka-consumer.yaml" }], []],
  ["a traits list given as an external reference", { $ref: "./shared/operation-traits.yaml#/all" }, []],
  ["a trait whose bindings are an external reference", [traitRef("externalBindings")], []],
  ["a tuple trait with a kafka binding", [[{ bindings: { kafka: {} } }, {}]], []],
  ["a message trait used as an operation trait, applied as written", [{ $ref: "#/components/messageTraits/kafkaKey" }], []],
  ["a trait with only an amqp binding", [traitRef("noKafka")], [["@", "missing"]]],
  ["a trait without bindings", [traitRef("described")], [["@", "missing"]]],
  ["a trait with only an x-bindings extension", [traitRef("extension")], [["@", "missing"]]],
  ["a trait whose bindings reference shared bindings without kafka", [traitRef("sharedNoKafka")], [["@", "missing"]]],
  ["a trait with empty bindings", [traitRef("emptyBindings")], [["@", "missing"]]],
  ["a trait with null bindings", [traitRef("nullBindings")], [["@", "missing"]]],
  ["shared channel bindings used as a trait, whose kafka key is not under bindings", [{ $ref: "#/components/channelBindings/kafka" }], [["@", "missing"]]],
  ["a dangling trait", [traitRef("retired")], [["@", "missing"]]],
  ["a cyclic traits list", { $ref: "#/components/x-trait-lists/cycleA" }, [["@", "missing"]]],
  ["a null trait", [null], [["@", "missing"]]],
  ["a scalar trait", ["kafka"], [["@", "missing"]]],
  ["an empty traits list", [], [["@", "missing"]]],
  ["a traits list given as a reference to an empty list", { $ref: "#/components/x-trait-lists/empty" }, [["@", "missing"]]],
  ["traits given as an object", { bindings: { kafka: {} } }, [["@", "missing"]]],
  ["traits given as null", null, [["@", "missing"]]],
  ["traits given as a string", "kafka", [["@", "missing"]]],
  ["an inline trait with a null kafka binding", [{ bindings: { kafka: null } }], [["@.traits.0.bindings.kafka", "invalid"]]],
  ["a referenced trait with a null kafka binding", [traitRef("nullKafka")], [[NULL_TRAIT, "invalid"]]],
  ["a chained reference to a trait with a null kafka binding", [traitRef("nullAlias")], [[NULL_TRAIT, "invalid"]]],
  ["a trait whose kafka binding is a string", [traitRef("textKafka")], [["components.operationTraits.textKafka.bindings.kafka", "invalid"]]],
  ["a trait whose kafka binding is a list", [traitRef("listKafka")], [["components.operationTraits.listKafka.bindings.kafka", "invalid"]]],
  ["a trait whose kafka binding is a dangling reference", [traitRef("danglingKafka")], [["components.operationTraits.danglingKafka.bindings.kafka", "invalid"]]],
  ["a trait whose bindings reference shared bindings with a null kafka binding", [traitRef("sharedNullKafka")], [["components.operationTraits.sharedNullKafka.bindings", "invalid"]]],
  ["a traits list reference holding a trait with a null kafka binding", { $ref: "#/components/x-trait-lists/nullKafka" }, [[NULL_TRAIT, "invalid"]]],
  ["a traits list reference holding an inline null kafka binding", { $ref: "#/components/x-trait-lists/inlineNull" }, [["components.x-trait-lists.inlineNull.0.bindings.kafka", "invalid"]]],
  ["a tuple trait with a null kafka binding", [[{ bindings: { kafka: null } }, {}]], [["@.traits.0.0.bindings.kafka", "invalid"]]],
  ["a trait with a kafka binding next to a trait without one", [traitRef("kafka"), traitRef("noKafka")], []],
  ["a trait without kafka binding next to a trait with one", [traitRef("noKafka"), traitRef("kafka")], []],
  ["a kafka binding applied before a null one, which wins", [traitRef("kafka"), traitRef("nullKafka")], [[NULL_TRAIT, "invalid"]]],
  ["a null kafka binding applied before a valid one, which wins", [traitRef("nullKafka"), traitRef("kafka")], []],
  ["a traits list reference with a valid trait before a null one", { $ref: "#/components/x-trait-lists/mixed" }, [[NULL_TRAIT, "invalid"]]],
  ["a trait without kafka applied after a null kafka binding, which stays in force", [traitRef("nullKafka"), traitRef("noKafka")], [[NULL_TRAIT, "invalid"]]],
  ["an external trait applied after a null kafka binding", [traitRef("nullKafka"), traitRef("external")], []],
  ["external trait bindings applied after a null kafka binding", [traitRef("nullKafka"), traitRef("externalBindings")], []],
  ["a null kafka binding applied after an external trait", [traitRef("external"), traitRef("nullKafka")], [[NULL_TRAIT, "invalid"]]],
];

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, own bindings, traits, expected] cases where the operation declares bindings and applies
 *   traits: 2.x traits override the operation, in 3.x the operation wins; "@" is the operation path
 */
const traitOverrideCases = (major) => {
  const v3 = major === 3;
  const ownInvalid = [["@.bindings.kafka", "invalid"]];
  const traitInvalid = [[NULL_TRAIT, "invalid"]];
  return [
    ["a kafka binding and a trait kafka binding", { kafka: KAFKA.v050 }, [traitRef("kafka")], []],
    ["a null kafka binding and a trait null kafka binding", { kafka: null }, [traitRef("nullKafka")], v3 ? ownInvalid : traitInvalid],
    ["a kafka binding and a trait null kafka binding", { kafka: {} }, [traitRef("nullKafka")], v3 ? [] : traitInvalid],
    ["a kafka binding and an inline trait whose kafka binding is a string", { kafka: KAFKA.v030 }, [{ bindings: { kafka: "kafka" } }], v3 ? [] : [["@.traits.0.bindings.kafka", "invalid"]]],
    ["a null kafka binding and a trait kafka binding", { kafka: null }, [traitRef("kafka")], v3 ? ownInvalid : []],
    ["a string kafka binding and an inline trait with an empty kafka binding", { kafka: "enabled" }, [{ bindings: { kafka: {} } }], v3 ? ownInvalid : []],
    ["only an amqp binding and a trait kafka binding, which merge", { amqp: OTHER_BINDINGS.amqp }, [traitRef("kafka")], []],
    ["only an amqp binding and a trait whose shared bindings hold kafka", { amqp: OTHER_BINDINGS.amqp }, [traitRef("kafkaShared")], []],
    ["only an amqp binding and a trait without kafka", { amqp: OTHER_BINDINGS.amqp }, [traitRef("noKafka")], [["@.bindings", "missing"]]],
    ["empty bindings and a trait without bindings", {}, [traitRef("described")], [["@.bindings", "missing"]]],
    ["empty bindings and a trait with an empty kafka binding", {}, [traitRef("kafkaEmpty")], []],
    ["a null kafka binding and a trait without kafka", { kafka: null }, [traitRef("noKafka")], ownInvalid],
    ["a null kafka binding and an external trait", { kafka: null }, [traitRef("external")], v3 ? ownInvalid : []],
    ["a kafka binding and an external trait", { kafka: {} }, [traitRef("external")], []],
    ["a null kafka binding, a trait kafka binding and a trait null kafka binding", { kafka: null }, [traitRef("kafka"), traitRef("nullKafka")], v3 ? ownInvalid : traitInvalid],
    ["a kafka binding, a trait null kafka binding and a trait kafka binding", { kafka: {} }, [traitRef("nullKafka"), traitRef("kafka")], []],
    ["a kafka binding, a trait null kafka binding and an external trait", { kafka: {} }, [traitRef("nullKafka"), traitRef("external")], []],
    ["a kafka binding, an external trait and a trait null kafka binding", { kafka: {} }, [traitRef("external"), traitRef("nullKafka")], v3 ? [] : traitInvalid],
    ["shared bindings with kafka and a trait null kafka binding", bindingsRef("kafkaOnly"), [traitRef("nullKafka")], v3 ? [] : traitInvalid],
    ["shared bindings with a null kafka binding and a trait kafka binding", bindingsRef("nullKafka"), [traitRef("kafka")], v3 ? [["@.bindings", "invalid"]] : []],
    ["external bindings and a trait null kafka binding", { $ref: "./shared/operation-bindings.yaml#/orders" }, [traitRef("nullKafka")], v3 ? [] : traitInvalid],
    ["null bindings and a trait kafka binding", null, [traitRef("kafka")], []],
    ["null bindings and a trait without kafka", null, [traitRef("noKafka")], [["@.bindings", "missing"]]],
  ];
};

const REFERENCE_LANDING = {
  "#/components/x-operations/cycleA": ["components.x-operations.cycleB", "cycleB"],
  "#/components/x-operations/list": ["components.x-operations.list", "list"],
  "#/components/x-operations/text": ["components.x-operations.text", "text"],
  "#/components/x-operations/nothing": ["components.x-operations.nothing", "nothing"],
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, operation, expected] cases for an operation given as a value or a reference; 3.x names
 *   the operation by the key where it is defined, 2.x by the channel and action that reach it
 */
const sharedReferenceCases = (major) => {
  const v3 = major === 3;
  const AT = atOf(major);
  const NAME = NAMES[major];
  const { complete, minimal } = shapesFor(major);
  const f = (path, kind, key) => (v3 ? [path, kind, key] : [path, kind, NAME, ACTION_V2]);
  return [
    ["a reference to a complete operation", operationTarget("complete"), []],
    ["a reference to a minimal operation", operationTarget("minimal"), []],
    ["a chained reference", operationTarget("alias"), []],
    ["a reference chained twice", operationTarget("aliasTwice"), []],
    ["a reference to an operation inheriting its kafka binding from a trait", operationTarget("traitOnly"), []],
    ["a reference with bindings siblings, which are ignored", { ...operationTarget("complete"), bindings: {} }, []],
    ["a reference to an operation without bindings, whose kafka siblings are ignored", { ...operationTarget("bare"), bindings: { kafka: {} } }, [f("components.x-operations.bare", "missing", "bare")]],
    ["a pointer into an array item", { $ref: "#/components/x-operations/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-operations/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-operations/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-operations/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/operations.yaml#/receiveOrderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/operations/receive-order-placed.yaml" }, []],
    ["a local alias of an external operation", operationTarget("external"), []],
    ["a reference to a channel with a kafka binding, checked as an operation", { $ref: "#/components/x-channels/kafkaChannel" }, []],
    ["a reference to an operation without bindings", operationTarget("bare"), [f("components.x-operations.bare", "missing", "bare")]],
    ["a chained reference to an operation without bindings", operationTarget("bareAlias"), [f("components.x-operations.bare", "missing", "bare")]],
    ["a reference to an operation with empty bindings", operationTarget("emptyBindings"), [f("components.x-operations.emptyBindings.bindings", "missing", "emptyBindings")]],
    ["a reference to an operation with only an amqp binding", operationTarget("amqpOnly"), [f("components.x-operations.amqpOnly.bindings", "missing", "amqpOnly")]],
    ["a reference to an operation whose kafka binding is null", operationTarget("nullKafka"), [f("components.x-operations.nullKafka.bindings.kafka", "invalid", "nullKafka")]],
    ["a reference to an operation whose bindings reference shared bindings without kafka", operationTarget("sharedNoKafka"), [f("components.x-operations.sharedNoKafka.bindings", "missing", "sharedNoKafka")]],
    ["a reference to an operation inheriting a null kafka binding from a trait", operationTarget("traitNull"), [f(NULL_TRAIT, "invalid", "traitNull")]],
    ["a reference to an operation with only x-bindings", operationTarget("extensionsOnly"), [f("components.x-operations.extensionsOnly", "missing", "extensionsOnly")]],
    ["a reference to an operation whose bindings key differs in case", operationTarget("caseKeys"), [f("components.x-operations.caseKeys", "missing", "caseKeys")]],
    ["a reference to an empty operation", operationTarget("empty"), [f("components.x-operations.empty", "missing", "empty")]],
    ["a reference to an object that is not an operation", { $ref: "#/info" }, [f("info", "missing", "info")]],
    ["a reference to a bindings object instead of an operation", bindingsRef("kafkaOnly"), [f("components.operationBindings.kafkaOnly", "missing", "kafkaOnly")]],
    ...unusableObjectCases(
      operationTarget,
      { text: NAME, item: complete },
      () => [f(AT, "unusable", NAME)],
      (ref) => {
        const [path, name] = REFERENCE_LANDING[ref] || [AT, NAME];
        return [f(path, "unusable", name)];
      }
    ),
    ["a list of operations", [minimal, complete], [f(AT, "unusable", NAME)]],
    ["a pointer past the end of an array", { $ref: "#/components/x-operations/list/3" }, [f(AT, "unusable", NAME)]],
    ["a pointer through a chained operation", { $ref: "#/components/x-operations/alias/bindings" }, [f(AT, "unusable", NAME)]],
    ["a self reference", operationTarget("self"), [f("components.x-operations.self", "unusable", "self")]],
    ["a reference to the operation itself", { $ref: v3 ? `#/operations/${NAME}` : `#/channels/${NAME}/${ACTION_V2}` }, [f(AT, "unusable", NAME)]],
  ];
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, operation, expected] cases for an operation written at atOf(major)
 */
const operationObjectCasesFor = (major) => {
  const v3 = major === 3;
  const AT = atOf(major);
  const NAME = NAMES[major];
  const { complete, minimal, bare } = shapesFor(major);
  const f = (path, kind) => (v3 ? [path, kind, NAME] : [path, kind, NAME, ACTION_V2]);
  const missing = [f(AT, "missing")];
  const missingInBindings = [f(`${AT}.bindings`, "missing")];
  return [
    ["a complete inline operation", complete, []],
    ["an operation with only an empty kafka binding", minimal, []],
    ["an operation inheriting its kafka binding from a trait", { ...bare, traits: [traitRef("kafka")] }, []],
    [
      "an operation with every optional field",
      v3
        ? {
            ...complete,
            title: "Receive orders placed",
            description: "Consumed by fulfilment.",
            security: [{ $ref: "#/components/securitySchemes/saslScram" }],
            tags: [{ name: "orders" }],
            externalDocs: { url: "https://docs.example.io/orders" },
            traits: [traitRef("described")],
            reply: { address: { location: "$message.header#/replyTo" }, channel: channelRef("replies"), messages: [{ $ref: "#/channels/replies/messages/orderAccepted" }] },
            "x-owner": "orders",
          }
        : {
            ...complete,
            description: "Consumed by fulfilment.",
            security: [{ saslScram: [] }],
            tags: [{ name: "orders" }],
            externalDocs: { url: "https://docs.example.io/orders" },
            traits: [traitRef("described")],
            "x-owner": "orders",
          },
      [],
    ],
    ["an operation written for the other AsyncAPI version with a kafka binding", { ...shapesFor(v3 ? 2 : 3).bare, bindings: { kafka: {} } }, []],
    ["an operation whose kafka binding holds channel binding fields, which are not validated", { ...bare, bindings: { kafka: KAFKA_CHANNEL } }, []],
    ["an empty operation", {}, missing],
    ["an operation without bindings, whose channel and messages declare kafka bindings", bare, missing],
    ["an operation whose bindings are only an extension", { ...bare, "x-bindings": { kafka: {} } }, missing],
    ["an operation whose bindings key differs in case", { ...bare, Bindings: { kafka: {} }, BINDINGS: { kafka: {} } }, missing],
    ["an operation with a singular binding key", { ...bare, binding: { kafka: {} } }, missing],
    ["an operation with a kafka key outside its bindings", { ...bare, kafka: KAFKA.v050 }, missing],
    ["an operation with a dotted bindings.kafka key", { ...bare, "bindings.kafka": {} }, missing],
    ["an operation with kafka binding fields written directly on it", { ...bare, groupId: { type: "string" }, clientId: { type: "string" } }, missing],
    ...(v3
      ? [
          ["an operation whose kafka binding is only in an inline message", { ...bare, messages: [{ ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } }] }, missing],
          ["an operation whose kafka binding is only in a message trait", { ...bare, messages: [{ ...ORDER_PLACED, traits: [{ bindings: { kafka: KAFKA_MESSAGE } }] }] }, missing],
          ["an operation whose kafka binding is only in an inline channel", { ...bare, channel: { address: TOPIC, bindings: { kafka: KAFKA_CHANNEL } } }, missing],
          ["an operation whose kafka binding is only in its reply", { ...bare, reply: { address: { location: "$message.header#/replyTo" }, channel: channelRef("replies"), bindings: { kafka: {} } } }, missing],
          ["an operation whose kafka binding is only in its reply channel", { ...bare, reply: { channel: channelRef("replies") } }, missing],
          ["an operation whose kafka binding is only in AsyncAPI 2.x publish and subscribe keys", { ...bare, subscribe: { bindings: { kafka: {} } }, publish: { bindings: { kafka: {} } } }, missing],
        ]
      : [
          ["an operation whose kafka binding is only in its inline message", { ...bare, message: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } } }, missing],
          ["an operation whose kafka binding is only in a oneOf message", { ...bare, message: { oneOf: [{ ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE } }, messageRef("orderPlacedAvro")] } }, missing],
          ["an operation whose kafka binding is only in a message trait", { ...bare, message: { ...ORDER_PLACED, traits: [{ bindings: { kafka: KAFKA_MESSAGE } }] } }, missing],
          ["an operation whose kafka binding is only in AsyncAPI 3.x messages and reply", { ...bare, messages: [{ ...ORDER_PLACED, bindings: { kafka: {} } }], reply: { bindings: { kafka: {} } } }, missing],
        ]),
    ["an operation whose trait is a reference to a traits list, which is not a trait", { ...bare, traits: [{ $ref: "#/components/x-trait-lists/kafka" }] }, missing],
    ["an operation with an empty bindings object", { ...bare, bindings: {} }, missingInBindings],
    ["an operation with null bindings", { ...bare, bindings: null }, missingInBindings],
    ["an operation whose bindings are a list of bindings objects", { ...bare, bindings: [{ kafka: {} }] }, missingInBindings],
    ["an operation whose bindings are a protocol name", { ...bare, bindings: "kafka" }, missingInBindings],
    ["an operation with only non-kafka bindings", { ...bare, bindings: OTHER_BINDINGS }, missingInBindings],
    ["an operation whose kafka binding is null", { ...bare, bindings: { kafka: null } }, [f(`${AT}.bindings.kafka`, "invalid")]],
    ["an operation whose kafka binding is true", { ...bare, bindings: { kafka: true, amqp: OTHER_BINDINGS.amqp } }, [f(`${AT}.bindings.kafka`, "invalid")]],
    ["an operation whose shared bindings hold a null kafka binding", { ...bare, bindings: bindingsRef("nullKafka") }, [f(`${AT}.bindings`, "invalid")]],
    ...sharedReferenceCases(major),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a field option like the rule table", { field: "bindings.kafka" }],
  ["a field option naming another binding", { field: "bindings.amqp" }],
  ["a properties list with another protocol", { properties: ["amqp"] }],
  ["a properties list with every protocol", { properties: ["kafka", "amqp", "mqtt", "http"] }],
  ["a required-bindings list", { "required-bindings": "amqp,mqtt" }],
  ["an empty required-bindings list", { "required-bindings": "" }],
  ["a bindings option", { bindings: "mqtt", binding: "http", protocol: "amqp" }],
  ["allowed-bindings", { "allowed-bindings": "amqp" }],
  ["required_binding_props", { required_binding_props: "operation.kafka.groupId,operation.kafka.clientId" }],
  ["fields-to-apply", { "fields-to-apply": "amqp" }],
  ["a flag accepting operations without bindings", { "allow-missing": true, required: false }],
  ["a flag ignoring operation traits", { "ignore-traits": true, traits: false }],
  ["a flag rejecting empty kafka bindings", { "allow-empty": false, "non-empty": true }],
  ["an action filter", { actions: ["receive"], action: "subscribe" }],
  ["a pattern", { pattern: "^amqp$" }],
  ["valid-versions", { "valid-versions": "0.5.0" }],
  ["null values", { field: null, properties: null, "required-bindings": null }],
  ["non-string values", { field: 42, properties: true, "required-bindings": ["amqp"] }],
];

module.exports = {
  NAMES,
  ACTION_V2,
  atOf,
  shown,
  messagesFor,
  findingsFor,
  TOPIC,
  KAFKA,
  OTHER_BINDINGS,
  KAFKA_CHANNEL,
  KAFKA_MESSAGE,
  KAFKA_SERVER,
  ORDER_PLACED,
  CHANNELS_V3,
  operationTarget,
  traitRef,
  bindingsRef,
  kafkaRef,
  channelRef,
  messageRef,
  shapesFor,
  operationComponentsFor,
  KAFKA_VALUE_CASES,
  BINDINGS_VALUE_CASES,
  traitOnlyCases,
  traitOverrideCases,
  operationObjectCasesFor,
  IGNORED_OPTIONS,
};
