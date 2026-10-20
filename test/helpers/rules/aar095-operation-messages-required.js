const { findingsFrom, unusableObjectCases } = require("../required-fields");

const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "receiveOrderPlaced" };
const ACTION_V2 = "subscribe";
const FIELD = { 2: "message", 3: "messages" };
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
        missing: (operation) => `AAR095: Operation '${shown(operation)}' must declare at least one message in 'messages'.`,
        empty: (operation) => `AAR095: The 'messages' of operation '${shown(operation)}' must declare at least one message.`,
        unusable: (operation) => `AAR095: Operation '${shown(operation)}' must be an object declaring at least one message in 'messages'.`,
      }
    : {
        missing: (channel, action) => `AAR095: The ${action} operation of channel '${shown(channel)}' must declare a 'message'.`,
        empty: (channel, action) => `AAR095: The 'message' of the ${action} operation of channel '${shown(channel)}' must declare at least one message.`,
        unusable: (channel, action) => `AAR095: The ${action} operation of channel '${shown(channel)}' must be an object declaring a 'message'.`,
      };

const findingsFor = (major) => findingsFrom(messagesFor(major));

const operationTarget = (name) => ({ $ref: `#/components/x-operations/${name}` });
const traitRef = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const channelRef = (name) => ({ $ref: `#/channels/${name}` });
const messageRef = (name) => ({ $ref: `#/components/messages/${name}` });
const channelMessageRef = (name, channel = "orders") => ({ $ref: `#/channels/${channel}/messages/${name}` });
const listRef = (name) => ({ $ref: `#/components/x-message-lists/${name}` });
const wrapperRef = (name) => ({ $ref: `#/components/x-message-wrappers/${name}` });

const TOPIC = "retail.cdc.orders.placed.v1";

const ORDER_PLACED = {
  name: "orderPlaced",
  title: "Order placed",
  contentType: "application/json",
  payload: { type: "object", required: ["orderId"], properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
};

const AVRO_SCHEMA = {
  type: "record",
  name: "OrderPlaced",
  namespace: "es.quality.retail",
  fields: [
    { name: "orderId", type: "string" },
    { name: "couponCode", type: ["null", "string"], default: null },
  ],
};

const avroMessage = (major) =>
  major === 3
    ? { name: "orderPlacedAvro", contentType: "application/vnd.apache.avro+json", payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: AVRO_SCHEMA } }
    : { name: "orderPlacedAvro", contentType: "application/vnd.apache.avro+json", schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: AVRO_SCHEMA };

const messagesOf = (major) => ({
  orderPlaced: ORDER_PLACED,
  orderPlacedAvro: avroMessage(major),
  emptyMessage: {},
  traitsOnly: { traits: [{ $ref: "#/components/messageTraits/tracing" }] },
  headersOnly: { headers: { type: "object", properties: { traceId: { type: "string" } } } },
  alias: messageRef("orderPlaced"),
  aliasTwice: messageRef("alias"),
  aliasToNull: messageRef("nothing"),
  external: { $ref: "./shared/messages.yaml#/orderPlaced" },
  cycleA: messageRef("cycleB"),
  cycleB: messageRef("cycleA"),
  self: messageRef("self"),
  list: [ORDER_PLACED],
  text: "orderPlaced",
  nothing: null,
  "a/b": ORDER_PLACED,
  "with space": ORDER_PLACED,
  "espa\u00f1a": ORDER_PLACED,
});

const CHANNELS_V3 = {
  orders: { address: TOPIC, description: "Orders placed.", messages: { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") } },
  replies: { address: null, description: "Dynamic replies.", messages: { orderAccepted: messageRef("orderPlaced") } },
  silent: { address: "retail.cdc.orders.silent.v1", description: "Channel without messages.", messages: {} },
};

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} complete: an operation with two messages, minimal: only one message, bare: an operation of that version without messages
 */
const shapesFor = (major) => {
  if (major === 3) {
    const bare = { action: "receive", channel: channelRef("orders"), summary: "Receive the orders placed in any sales channel." };
    return { complete: { ...bare, messages: [channelMessageRef("orderPlaced"), channelMessageRef("orderPlacedAvro")] }, minimal: { messages: [channelMessageRef("orderPlaced")] }, bare };
  }
  const bare = { operationId: "receiveOrderPlaced", summary: "Receive the orders placed in any sales channel." };
  return { complete: { ...bare, message: { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] } }, minimal: { message: messageRef("orderPlaced") }, bare };
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: messages, message and operation traits, and the x-message-lists, x-message-wrappers
 *   and x-operations reference targets
 */
const operationComponentsFor = (major) => {
  const { complete, minimal, bare } = shapesFor(major);
  const field = FIELD[major];
  const usable = major === 3 ? [channelMessageRef("orderPlaced")] : messageRef("orderPlaced");
  return {
    messages: messagesOf(major),
    schemas: { orderId: { type: "string", pattern: "^ORD-[0-9]{8}$" }, couponCode: { type: ["string", "null"] } },
    securitySchemes: { saslScram: { type: "scramSha512", description: "SASL SCRAM credentials." } },
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    operationTraits: {
      described: { summary: "Process order events.", description: "Order events.", tags: [{ name: "orders" }] },
      kafka: { bindings: { kafka: { groupId: { type: "string", enum: ["fulfilment"] }, bindingVersion: "0.5.0" } } },
      withMessages: { messages: [channelMessageRef("orderPlaced")] },
      withMessage: { message: messageRef("orderPlaced") },
      withBoth: { summary: "Both message fields.", message: messageRef("orderPlaced"), messages: [messageRef("orderPlaced")] },
      emptyMessages: { messages: [], message: { oneOf: [] } },
    },
    "x-trait-lists": { withMessages: [traitRef("withMessages"), traitRef("withMessage")] },
    "x-message-lists": {
      two: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")],
      mixed: [messageRef("gone"), messageRef("orderPlaced")],
      empty: [],
      onlyNull: [null, "orderPlaced", 42, []],
      onlyDangling: [messageRef("gone")],
      alias: listRef("two"),
      emptyAlias: listRef("empty"),
      cycleA: listRef("cycleB"),
      cycleB: listRef("cycleA"),
      map: { orderPlaced: messageRef("orderPlaced") },
      text: "orderPlaced",
      nothing: null,
      external: { $ref: "./shared/message-lists.yaml#/orders" },
    },
    "x-message-wrappers": {
      two: { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] },
      emptyOneOf: { oneOf: [] },
      onlyNull: { oneOf: [null] },
      onlyDangling: { oneOf: [messageRef("gone")] },
      nested: { oneOf: [wrapperRef("two")] },
      nestedEmpty: { oneOf: [wrapperRef("emptyOneOf"), wrapperRef("onlyNull")] },
      cycleA: { oneOf: [wrapperRef("cycleB"), wrapperRef("cycleA")] },
      cycleB: { oneOf: [wrapperRef("cycleA")] },
      loopWithMessage: { oneOf: [wrapperRef("loopBack")] },
      loopBack: { oneOf: [wrapperRef("loopWithMessage"), messageRef("orderPlaced")] },
    },
    "x-operations": {
      complete,
      minimal,
      bare,
      traitOnly: { ...bare, traits: [traitRef(major === 3 ? "withMessages" : "withMessage")] },
      alias: operationTarget("complete"),
      aliasTwice: operationTarget("alias"),
      bareAlias: operationTarget("bare"),
      emptyMessages: { ...bare, [field]: major === 3 ? [] : { oneOf: [] } },
      nullMessages: { ...bare, [field]: null },
      danglingOnly: { ...bare, [field]: major === 3 ? [messageRef("gone")] : messageRef("gone") },
      usable: { ...bare, [field]: usable },
      extensionsOnly: { ...bare, [`x-${field}`]: usable },
      caseKeys: major === 3 ? { ...bare, Messages: usable, MESSAGES: usable } : { ...bare, Message: usable, MESSAGE: usable },
      otherVersion: major === 3 ? { ...bare, message: messageRef("orderPlaced") } : { ...bare, messages: [messageRef("orderPlaced")] },
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

const unusableEntryCases = () =>
  unusableObjectCases(messageRef, { text: "orderPlaced", item: messageRef("orderPlaced"), pointer: "orderPlaced" }, () => false).map(([name, value]) => [name, value, false]);

/**
 * Values with the same verdict as an entry of a 3.x messages list, a 2.x operation message and a 2.x oneOf item.
 * @returns {Array} [description, value, usable] cases
 */
const ENTRY_VALUE_CASES = [
  ["a reference to a component message", messageRef("orderPlaced"), true],
  ["a reference to an Avro component message", messageRef("orderPlacedAvro"), true],
  ["an inline message", { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } } }, true],
  ["an empty message object", {}, true],
  ["a reference to an empty component message", messageRef("emptyMessage"), true],
  ["a message that only applies traits", messageRef("traitsOnly"), true],
  ["a message whose traits are dangling", { name: "orderPlaced", traits: [{ $ref: "#/components/messageTraits/missing" }] }, true],
  ["a message with only headers", messageRef("headersOnly"), true],
  ["a message with only an extension", { "x-owner": "orders" }, true],
  ["a message with a nullable JSON Schema payload", { payload: { type: ["object", "null"], properties: { couponCode: { type: ["string", "null"] } } } }, true],
  ["a chained reference", messageRef("alias"), true],
  ["a reference chained twice", messageRef("aliasTwice"), true],
  ["an escaped pointer", messageRef("a~1b"), true],
  ["a percent-encoded pointer", messageRef("with%20space"), true],
  ["a UTF-8 percent-encoded pointer", messageRef("espa%C3%B1a"), true],
  ["an external reference", { $ref: "./shared/messages.yaml#/orderPlaced" }, true],
  ["an external whole-file reference", { $ref: "https://schemas.example.io/messages/order-placed.yaml" }, true],
  ["a local alias of an external message", messageRef("external"), true],
  ["a reference to an object that is not a message", { $ref: "#/info" }, true],
  ["a pointer into a list item", { $ref: "#/components/messages/list/0" }, true],
  ["a reference with siblings, which are ignored", { ...messageRef("nothing"), name: "orderPlaced", payload: { type: "object" } }, false],
  ["a reference to a null component message", messageRef("nothing"), false],
  ["a chain that ends in null", messageRef("aliasToNull"), false],
  ["a self reference", messageRef("self"), false],
  ["a pointer through a chained message, which Spectral cannot resolve either", { $ref: "#/components/messages/alias/payload" }, false],
  ["a pointer past the end of a list", { $ref: "#/components/messages/list/3" }, false],
  ["a blank string", " \t ", false],
  ["a list of messages", [messageRef("orderPlaced"), messageRef("orderPlacedAvro")], false],
  ...unusableEntryCases(),
];

/**
 * @returns {Array} [description, entry, usable] cases that only make sense as an entry of a 3.x messages list
 */
const ENTRY_VALUE_CASES_V3 = [
  ["a reference to a message of the operation channel", channelMessageRef("orderPlaced"), true],
  ["a reference to the Avro message of the operation channel", channelMessageRef("orderPlacedAvro"), true],
  ["a reference to a message of another channel, a reply channel with a null address", channelMessageRef("orderAccepted", "replies"), true],
  ["an inline multi-format Avro message", { name: "orderPlacedAvro", payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: AVRO_SCHEMA } }, true],
  ["a 2.x oneOf wrapper, which is an object in 3.x", { oneOf: [] }, true],
  ["a reference to a 2.x oneOf wrapper", wrapperRef("emptyOneOf"), true],
  ["a reference to a channel message that does not exist", channelMessageRef("orderCancelled"), false],
  ["a reference to a message of a channel that does not exist", channelMessageRef("orderPlaced", "returns"), false],
  ["a reference to the messages map of a channel, which is an object", { $ref: "#/channels/orders/messages" }, true],
  ["a pointer through a referenced channel message, which Spectral cannot resolve either", { $ref: "#/channels/orders/messages/orderPlaced/payload" }, false],
];

/**
 * @returns {Array} [description, value, hasMessage] cases for the value of a 3.x operation messages field
 */
const MESSAGES_VALUE_CASES = [
  ["a list with one reference to a channel message", [channelMessageRef("orderPlaced")], true],
  ["a list with the JSON and the Avro messages of the channel", [channelMessageRef("orderPlaced"), channelMessageRef("orderPlacedAvro")], true],
  ["a list with a component message reference, which the spec forbids but still names a message", [messageRef("orderPlaced")], true],
  ["a list with an inline message", [ORDER_PLACED], true],
  ["a list with an empty object", [{}], true],
  ["a list with an inline multi-format Avro message", [{ payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: AVRO_SCHEMA } }], true],
  ["a list with a null entry next to a usable one", [null, channelMessageRef("orderPlaced")], true],
  ["a list with a dangling entry next to a usable one", [channelMessageRef("orderCancelled"), channelMessageRef("orderPlaced")], true],
  ["a list whose only usable entry is external", [messageRef("gone"), "orderPlaced", { $ref: "./shared/messages.yaml#/partner" }], true],
  ["a list of many entries of which only the last is usable", [null, "", [], messageRef("gone"), { $ref: "#" }, {}], true],
  ["a list with a duplicated entry", [channelMessageRef("orderPlaced"), channelMessageRef("orderPlaced")], true],
  ["a reference to a list of messages", listRef("two"), true],
  ["a chained reference to a list of messages", listRef("alias"), true],
  ["a reference to a list with a dangling and a usable entry", listRef("mixed"), true],
  ["an external reference to a list", { $ref: "./shared/message-lists.yaml#/orders" }, true],
  ["a local alias of an external list", listRef("external"), true],
  ["a pointer to the messages of another operation", { $ref: "#/components/x-operations/complete/messages" }, true],
  ["an empty list", [], false],
  ["null", null, false],
  ["an empty map", {}, false],
  ["a map of messages like a channel", { orderPlaced: channelMessageRef("orderPlaced") }, false],
  ["a single message reference instead of a list", channelMessageRef("orderPlaced"), false],
  ["a reference to the messages map of the channel", { $ref: "#/channels/orders/messages" }, false],
  ["a message name instead of a list", "orderPlaced", false],
  ["an empty string", "", false],
  ["zero", 0, false],
  ["a number", 42, false],
  ["true", true, false],
  ["false", false, false],
  ["a list whose only entry is null", [null], false],
  ["a list whose entries are a string, a number, a boolean and a list", ["orderPlaced", 42, true, [channelMessageRef("orderPlaced")]], false],
  ["a list whose only entry is a dangling channel message", [channelMessageRef("orderCancelled")], false],
  ["a list whose only entry is a dangling component message", [messageRef("gone")], false],
  [
    "a list of cyclic, self, root, empty, unprefixed, malformed, non-string and null references",
    [messageRef("cycleA"), messageRef("self"), { $ref: "#" }, { $ref: "" }, { $ref: "#components/messages/orderPlaced" }, messageRef("%E0%A4%A"), { $ref: 42 }, { $ref: null }],
    false,
  ],
  ["a list whose only entry is a chain that ends in null", [messageRef("aliasToNull")], false],
  ["a list whose only entry points through a referenced channel message", [{ $ref: "#/channels/orders/messages/orderPlaced/payload" }], false],
  ["a reference to an empty list", listRef("empty"), false],
  ["a chained reference to an empty list", listRef("emptyAlias"), false],
  ["a reference to a list without usable entries", listRef("onlyNull"), false],
  ["a reference to a list whose only entry is dangling", listRef("onlyDangling"), false],
  ["a reference to an empty list with a populated sibling, which is ignored", { ...listRef("empty"), items: [channelMessageRef("orderPlaced")] }, false],
  ["a reference to a map", listRef("map"), false],
  ["a dangling list reference", listRef("missing"), false],
  ["a cyclic list reference", listRef("cycleA"), false],
  ["a reference to a string", listRef("text"), false],
  ["a reference to null", listRef("nothing"), false],
  ["a reference to the document root", { $ref: "#" }, false],
  ["an empty reference", { $ref: "" }, false],
  ["a non-string reference", { $ref: 42 }, false],
  ["a pointer to the empty messages of another operation", { $ref: "#/components/x-operations/emptyMessages/messages" }, false],
];

/**
 * @returns {Array} [description, value, hasMessage] cases for a 2.x operation message, on top of ENTRY_VALUE_CASES
 */
const MESSAGE_VALUE_CASES = [
  ["an Avro message with schemaFormat", { schemaFormat: "application/vnd.apache.avro;version=1.9.0", contentType: "application/vnd.apache.avro+json", payload: AVRO_SCHEMA }, true],
  ["a oneOf with references", { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] }, true],
  ["a oneOf with one inline message", { oneOf: [{ name: "orderPlaced" }] }, true],
  ["a oneOf with an empty message object", { oneOf: [{}] }, true],
  ["a oneOf with a null item next to a usable one", { oneOf: [null, messageRef("orderPlaced")] }, true],
  ["a oneOf with a dangling item next to a usable one", { oneOf: [messageRef("gone"), messageRef("orderPlaced")] }, true],
  ["a oneOf with an external item", { oneOf: [{ $ref: "./shared/messages.yaml#/orderPlaced" }] }, true],
  ["a oneOf given as a reference to a list", { oneOf: listRef("two") }, true],
  ["a oneOf given as a chained reference to a list", { oneOf: listRef("alias") }, true],
  ["a oneOf given as an external reference", { oneOf: { $ref: "./shared/messages.yaml#/all" } }, true],
  ["a oneOf with siblings, which are ignored", { oneOf: [messageRef("orderPlaced")], name: "ignored" }, true],
  ["a reference to a oneOf wrapper", wrapperRef("two"), true],
  ["a oneOf whose item is a nested oneOf with messages", wrapperRef("nested"), true],
  ["cyclic oneOf wrappers that also list a message", wrapperRef("loopWithMessage"), true],
  ["an empty oneOf", { oneOf: [] }, false],
  ["a null oneOf", { oneOf: null }, false],
  ["a blank oneOf", { oneOf: " " }, false],
  ["a oneOf given as an object", { oneOf: { orderPlaced: messageRef("orderPlaced") } }, false],
  ["a oneOf whose only item is null", { oneOf: [null] }, false],
  ["a oneOf whose items are null, strings, numbers and lists", { oneOf: [null, "orderPlaced", 42, [messageRef("orderPlaced")]] }, false],
  ["a oneOf whose only item is a dangling reference", { oneOf: [messageRef("gone")] }, false],
  ["a oneOf whose items are cyclic, self and root references", { oneOf: [messageRef("cycleA"), messageRef("self"), { $ref: "#" }] }, false],
  ["an empty oneOf with siblings", { oneOf: [], name: "orderPlaced", payload: { type: "object" } }, false],
  ["a oneOf given as a reference to an empty list", { oneOf: listRef("empty") }, false],
  ["a oneOf given as a reference to a list without usable items", { oneOf: listRef("onlyNull") }, false],
  ["a oneOf given as a dangling reference", { oneOf: listRef("missing") }, false],
  ["a oneOf given as a cyclic reference", { oneOf: listRef("cycleA") }, false],
  ["a reference to an empty oneOf wrapper", wrapperRef("emptyOneOf"), false],
  ["a reference to a wrapper whose only item is null", wrapperRef("onlyNull"), false],
  ["a reference to a wrapper whose only item is dangling", wrapperRef("onlyDangling"), false],
  ["nested oneOf wrappers without a usable item", wrapperRef("nestedEmpty"), false],
  ["cyclic oneOf wrappers without a message", wrapperRef("cycleA"), false],
];

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, own message field or OMIT, traits, expected] cases: operation traits never supply or remove
 *   messages; expected findings are [path, kind] pairs where "@" is the operation path
 */
const traitCases = (major, OMIT) => {
  const v3 = major === 3;
  const own = v3 ? [channelMessageRef("orderPlaced")] : messageRef("orderPlaced");
  const empty = v3 ? [] : { oneOf: [] };
  const field = FIELD[major];
  return [
    ["no messages of its own and a referenced trait with messages", OMIT, [traitRef(v3 ? "withMessages" : "withMessage")], [["@", "missing"]]],
    ["no messages of its own and an inline trait with messages", OMIT, [{ [field]: own }], [["@", "missing"]]],
    ["no messages of its own and a trait with both message fields", OMIT, [traitRef("withBoth")], [["@", "missing"]]],
    ["no messages of its own and a tuple trait with messages", OMIT, [[{ [field]: own }, {}]], [["@", "missing"]]],
    ["no messages of its own and a traits list given as a reference", OMIT, { $ref: "#/components/x-trait-lists/withMessages" }, [["@", "missing"]]],
    ["no messages of its own and an external trait", OMIT, [{ $ref: "./shared/operation-traits.yaml#/withMessages" }], [["@", "missing"]]],
    ["empty messages and a trait with messages", empty, [traitRef(v3 ? "withMessages" : "withMessage")], [[`@.${field}`, "empty"]]],
    ["empty messages and an external trait", empty, [{ $ref: "./shared/operation-traits.yaml#/withMessages" }], [[`@.${field}`, "empty"]]],
    ["usable messages and a trait with empty messages", own, [traitRef("emptyMessages")], []],
    ["usable messages and a trait without messages", own, [traitRef("described"), traitRef("kafka")], []],
    ["usable messages and dangling, null and scalar traits", own, [traitRef("retired"), null, "kafka"], []],
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
  const field = FIELD[major];
  const { complete, minimal } = shapesFor(major);
  const f = (path, kind, key) => (v3 ? [path, kind, key] : [path, kind, NAME, ACTION_V2]);
  return [
    ["a reference to a complete operation", operationTarget("complete"), []],
    ["a reference to a minimal operation", operationTarget("minimal"), []],
    ["a chained reference", operationTarget("alias"), []],
    ["a reference chained twice", operationTarget("aliasTwice"), []],
    ["a reference to an operation with a usable message", operationTarget("usable"), []],
    ["a reference with an empty messages sibling, which is ignored", { ...operationTarget("complete"), [field]: v3 ? [] : { oneOf: [] } }, []],
    ["a reference to an operation without messages, whose messages siblings are ignored", { ...operationTarget("bare"), [field]: v3 ? [messageRef("orderPlaced")] : messageRef("orderPlaced") }, [f("components.x-operations.bare", "missing", "bare")]],
    ["a pointer into an array item", { $ref: "#/components/x-operations/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-operations/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-operations/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-operations/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/operations.yaml#/receiveOrderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/operations/receive-order-placed.yaml" }, []],
    ["a local alias of an external operation", operationTarget("external"), []],
    ["a reference to an operation without messages", operationTarget("bare"), [f("components.x-operations.bare", "missing", "bare")]],
    ["a chained reference to an operation without messages", operationTarget("bareAlias"), [f("components.x-operations.bare", "missing", "bare")]],
    ["a reference to an operation whose messages come only from a trait", operationTarget("traitOnly"), [f("components.x-operations.traitOnly", "missing", "traitOnly")]],
    ["a reference to an operation with empty messages", operationTarget("emptyMessages"), [f(`components.x-operations.emptyMessages.${field}`, "empty", "emptyMessages")]],
    ["a reference to an operation with null messages", operationTarget("nullMessages"), [f(`components.x-operations.nullMessages.${field}`, "empty", "nullMessages")]],
    ["a reference to an operation whose only message is dangling", operationTarget("danglingOnly"), [f(`components.x-operations.danglingOnly.${field}`, "empty", "danglingOnly")]],
    ["a reference to an operation with only an extension", operationTarget("extensionsOnly"), [f("components.x-operations.extensionsOnly", "missing", "extensionsOnly")]],
    ["a reference to an operation whose messages key differs in case", operationTarget("caseKeys"), [f("components.x-operations.caseKeys", "missing", "caseKeys")]],
    [`a reference to an operation using the AsyncAPI ${v3 ? "2.x message" : "3.x messages"} field`, operationTarget("otherVersion"), [f("components.x-operations.otherVersion", "missing", "otherVersion")]],
    ["a reference to an empty operation", operationTarget("empty"), [f("components.x-operations.empty", "missing", "empty")]],
    ["a reference to an object that is not an operation", { $ref: "#/info" }, [f("info", "missing", "info")]],
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
    ["a pointer through a chained operation", { $ref: `#/components/x-operations/alias/${field}` }, [f(AT, "unusable", NAME)]],
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
  const field = FIELD[major];
  const { complete, minimal, bare } = shapesFor(major);
  const f = (path, kind) => (v3 ? [path, kind, NAME] : [path, kind, NAME, ACTION_V2]);
  const missing = [f(AT, "missing")];
  const empty = [f(`${AT}.${field}`, "empty")];
  const usable = v3 ? [channelMessageRef("orderPlaced")] : messageRef("orderPlaced");
  return [
    ["a complete inline operation", complete, []],
    ["an operation with only one message", minimal, []],
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
            bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" } },
            traits: [traitRef("described")],
            reply: { address: { location: "$message.header#/replyTo" }, channel: channelRef("replies"), messages: [channelMessageRef("orderAccepted", "replies")] },
            "x-owner": "orders",
          }
        : {
            ...complete,
            description: "Consumed by fulfilment.",
            security: [{ saslScram: [] }],
            tags: [{ name: "orders" }],
            externalDocs: { url: "https://docs.example.io/orders" },
            bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.4.0" } },
            traits: [traitRef("described")],
            "x-owner": "orders",
          },
      [],
    ],
    ["an operation written for the other AsyncAPI version that also declares this version's field", { ...shapesFor(v3 ? 2 : 3).complete, [field]: usable }, []],
    ["an operation whose only message is an empty object", { ...bare, [field]: v3 ? [{}] : {} }, []],
    ["an empty operation", {}, missing],
    ["an operation without messages", bare, missing],
    ["an operation whose messages are an extension", { ...bare, [`x-${field}`]: usable }, missing],
    ["an operation whose messages key differs in case", v3 ? { ...bare, Messages: usable, MESSAGES: usable } : { ...bare, Message: usable, MESSAGE: usable }, missing],
    ["an operation whose message is only in its operation traits", { ...bare, traits: [{ [field]: usable }] }, missing],
    ["an operation whose message is only in its bindings", { ...bare, bindings: { kafka: { [field]: usable } } }, missing],
    ["an operation whose message is only in its tags or external docs", { ...bare, tags: [{ name: "orders", [field]: usable }], externalDocs: { url: "https://docs.example.io", [field]: usable } }, missing],
    ...(v3
      ? [
          ["an operation with a singular message key", { ...bare, message: messageRef("orderPlaced") }, missing],
          ["an operation whose channel declares messages but the operation does not", { ...bare, channel: channelRef("orders") }, missing],
          ["an operation whose inline channel declares messages", { ...bare, channel: { address: TOPIC, messages: { orderPlaced: messageRef("orderPlaced") } } }, missing],
          ["an operation whose messages are only in its reply", { ...bare, reply: { address: { location: "$message.header#/replyTo" }, channel: channelRef("replies"), messages: [channelMessageRef("orderAccepted", "replies")] } }, missing],
          ["an operation whose messages are only in AsyncAPI 2.x publish and subscribe keys", { ...bare, subscribe: { message: messageRef("orderPlaced") }, publish: { message: messageRef("orderPlaced") } }, missing],
          ["an operation with empty messages next to a reply with messages", { ...bare, messages: [], reply: { channel: channelRef("replies"), messages: [channelMessageRef("orderAccepted", "replies")] } }, empty],
          ["an operation with usable messages and a reply with empty, null or dangling messages", { ...minimal, reply: { channel: channelRef("replies"), messages: [null, channelMessageRef("gone", "replies")] } }, []],
          ["an operation with usable messages and a reply whose messages are an empty list", { ...minimal, reply: { messages: [] } }, []],
          ["an operation with usable messages and a channel without messages", { ...minimal, channel: channelRef("silent") }, []],
        ]
      : [
          ["an operation with a plural messages key", { ...bare, messages: [messageRef("orderPlaced")] }, missing],
          ["an operation whose message is only in AsyncAPI 3.x action, channel and reply keys", { ...bare, action: "receive", channel: { messages: { orderPlaced: messageRef("orderPlaced") } }, reply: { messages: [messageRef("orderPlaced")] } }, missing],
          ["an operation whose message is only in a send or receive key", { ...bare, send: { message: messageRef("orderPlaced") }, receive: { message: messageRef("orderPlaced") } }, missing],
        ]),
    ["an operation with empty messages", { ...bare, [field]: v3 ? [] : { oneOf: [] } }, empty],
    ["an operation with null messages", { ...bare, [field]: null }, empty],
    ["an operation whose only message is dangling", { ...bare, [field]: v3 ? [messageRef("orderPlacedV2")] : messageRef("orderPlacedV2") }, empty],
    ["an operation whose messages are a message name", { ...bare, [field]: "orderPlaced" }, empty],
    ...sharedReferenceCases(major),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a field option like the rule table", { field: "messages" }],
  ["a field option with the 2.x field", { field: "message" }],
  ["a field option with another field", { field: "summary" }],
  ["a truthy function option", { function: "truthy", field: "messages" }],
  ["a minimum of two messages", { "min-messages": 2, minMessages: "2", minItems: 2 }],
  ["a minimum of zero messages", { "min-messages": 0, minItems: 0 }],
  ["a maximum of one message", { "max-messages": 1, maxItems: 1 }],
  ["an allow-empty flag", { "allow-empty": true, allowEmpty: "true", "allow-missing": true }],
  ["a flag accepting the channel messages", { "inherit-channel-messages": true, "use-channel": true }],
  ["a flag reading operation traits and replies", { "apply-traits": true, "check-replies": true, replies: true }],
  ["a flag requiring references to the operation channel", { "same-channel": true, "references-only": true }],
  ["a properties list", { properties: ["messages"] }],
  ["a properties list with other fields", { properties: ["action", "channel", "summary"] }],
  ["fields-to-apply with other fields", { "fields-to-apply": "action,channel" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a pattern", { pattern: "^x-" }],
  ["valid-versions", { "valid-versions": "2.8.0" }],
  ["null values", { field: null, "min-messages": null, properties: null }],
  ["non-string values", { field: 42, "min-messages": true, properties: "messages" }],
];

module.exports = {
  NAMES,
  ACTION_V2,
  FIELD,
  atOf,
  shown,
  messagesFor,
  findingsFor,
  TOPIC,
  ORDER_PLACED,
  AVRO_SCHEMA,
  CHANNELS_V3,
  operationTarget,
  traitRef,
  channelRef,
  messageRef,
  channelMessageRef,
  listRef,
  wrapperRef,
  shapesFor,
  operationComponentsFor,
  ENTRY_VALUE_CASES,
  ENTRY_VALUE_CASES_V3,
  MESSAGES_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  traitCases,
  operationObjectCasesFor,
  IGNORED_OPTIONS,
};
