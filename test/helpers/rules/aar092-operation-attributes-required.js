const { INFO_COMPONENTS, INFO_VALUE_CASES, findingsFrom, unusableObjectCases } = require("../required-fields");

const FIELDS_V3 = ["action", "channel", "summary"];
const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "sendOrderPlaced" };
const ACTION_V2 = "subscribe";
const atOf = (major) => (major === 3 ? `operations.${NAMES[3]}` : `channels.${NAMES[2]}.${ACTION_V2}`);

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} Expected message builders keyed by finding kind: (operation, field) in 3.x, (channel, action) in 2.x
 */
const messagesFor = (major) =>
  major === 3
    ? {
        missing: (operation, field) => `AAR092: Operation '${shown(operation)}' must declare '${field}'.`,
        empty: (operation, field) => `AAR092: The '${field}' of operation '${shown(operation)}' must not be empty.`,
        unusable: (operation) => `AAR092: Operation '${shown(operation)}' must be an object declaring 'action', 'channel' and 'summary'.`,
      }
    : {
        missing: (channel, action) => `AAR092: The ${action} operation of channel '${shown(channel)}' must declare 'summary'.`,
        empty: (channel, action) => `AAR092: The 'summary' of the ${action} operation of channel '${shown(channel)}' must not be empty.`,
        unusable: (channel, action) => `AAR092: The ${action} operation of channel '${shown(channel)}' must be an object declaring 'summary'.`,
      };

const findingsFor = (major) => findingsFrom(messagesFor(major));

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Function} Expected [path, kind, ...args] entries for an operation lacking every mandatory field
 */
const allMissingFor = (major) => (path, name, action = ACTION_V2) =>
  major === 3 ? FIELDS_V3.map((field) => [path, "missing", name, field]) : [[path, "missing", name, action]];

const operationTarget = (name) => ({ $ref: `#/components/x-operations/${name}` });
const traitRef = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const channelRef = (name) => ({ $ref: `#/channels/${name}` });
const messageRef = (name) => ({ $ref: `#/components/messages/${name}` });

const MESSAGES = {
  orderPlaced: {
    name: "orderPlaced",
    title: "Order placed",
    contentType: "application/json",
    payload: { type: "object", properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } },
  },
  orderPlacedAvro: {
    name: "orderPlacedAvro",
    contentType: "application/vnd.apache.avro+json",
    payload: { type: "record", name: "OrderPlaced", fields: [{ name: "orderId", type: "string" }, { name: "couponCode", type: ["null", "string"], default: null }] },
  },
};

const CHANNELS_V3 = {
  orders: { address: "retail.cdc.orders.placed.v1", description: "Orders placed.", messages: { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") } },
  ordersAlias: { $ref: "#/components/channels/sharedOrders" },
  replies: { address: null, description: "Dynamic replies.", messages: { orderPlaced: messageRef("orderPlaced") } },
  "eu/west~dr": { address: "retail.cdc.orders.eu.v1", messages: { orderPlaced: messageRef("orderPlaced") } },
  "north america": { address: "retail.cdc.orders.na.v1", messages: { orderPlaced: messageRef("orderPlaced") } },
  "recepci\u00f3n": { address: "retail.cdc.orders.reception.v1", messages: { orderPlaced: messageRef("orderPlaced") } },
  remote: { $ref: "./shared/channels.yaml#/orders" },
};

const shapesFor = (major) => {
  if (major === 3) {
    const complete = {
      action: "send",
      channel: channelRef("orders"),
      title: "Publish order placed",
      summary: "Publish the orders placed in any sales channel.",
      description: "Published once the payment is authorised.",
      messages: [{ $ref: "#/channels/orders/messages/orderPlaced" }, { $ref: "#/channels/orders/messages/orderPlacedAvro" }],
      tags: [{ name: "orders" }],
      bindings: { kafka: { clientId: { type: "string", enum: ["orders-service"] }, bindingVersion: "0.5.0" } },
      traits: [traitRef("kafka")],
    };
    const minimal = { action: "send", channel: channelRef("orders"), summary: "Publish orders placed." };
    return { complete, minimal };
  }
  const complete = {
    operationId: "receiveOrderPlaced",
    summary: "Receive the orders placed in any sales channel.",
    description: "Consumed by the fulfilment services.",
    tags: [{ name: "orders" }],
    bindings: { kafka: { groupId: { type: "string", enum: ["fulfilment"] }, bindingVersion: "0.4.0" } },
    traits: [traitRef("kafka")],
    message: { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] },
  };
  const minimal = { summary: "Receive orders placed." };
  return { complete, minimal };
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: the shared texts of the required-field rules, messages, channels, operation
 *   traits and the x-operations, x-channels and x-trait-lists reference targets
 */
const operationComponentsFor = (major) => {
  const { complete, minimal } = shapesFor(major);
  const v3 = major === 3;
  return {
    ...INFO_COMPONENTS,
    messages: MESSAGES,
    channels: { sharedOrders: { address: "retail.cdc.orders.shared.v1", messages: { orderPlaced: messageRef("orderPlaced") } } },
    operationTraits: {
      kafka: { bindings: { kafka: v3 ? { groupId: { type: "string", enum: ["orders"] }, bindingVersion: "0.5.0" } : { groupId: { type: "string", enum: ["orders"] }, bindingVersion: "0.4.0" } } },
      summary: { summary: "Process order events." },
      blank: { summary: " \t " },
      nullSummary: { summary: null },
      described: { description: "Order events.", tags: [{ name: "orders" }] },
      extensionSummary: { "x-summary": "Order events." },
      alias: traitRef("summary"),
      blankAlias: traitRef("blank"),
      external: { $ref: "./shared/operation-traits.yaml#/orders" },
      withActionAndChannel: { action: "receive", channel: channelRef("orders") },
      textRef: { summary: { $ref: "#/components/x-texts/summary" } },
      emptyTextRef: { summary: { $ref: "#/components/x-texts/empty" } },
      danglingTextRef: { summary: { $ref: "#/components/x-texts/missing" } },
    },
    "x-trait-lists": {
      summary: [traitRef("summary")],
      blank: [traitRef("blank")],
      inlineBlank: [{ summary: "" }],
      mixed: [traitRef("summary"), traitRef("blank")],
      empty: [],
    },
    "x-channels": {
      draft: {},
      nothing: null,
      cycleA: { $ref: "#/components/x-channels/cycleB" },
      cycleB: { $ref: "#/components/x-channels/cycleA" },
      list: [{ address: "retail.cdc.orders.listed.v1" }],
      text: "retail.cdc.orders.placed.v1",
    },
    "x-operations": {
      complete,
      minimal,
      alias: operationTarget("complete"),
      aliasTwice: operationTarget("alias"),
      sparse: v3 ? { action: "send", channel: {}, "x-summary": "Sparse." } : { summary: " \t ", operationId: "sparse" },
      sparseAlias: operationTarget("sparse"),
      empty: {},
      extensionsOnly: v3 ? { "x-action": "send", "x-channel": channelRef("orders"), "x-summary": "Orders." } : { "x-summary": "Orders." },
      lookAlikes: v3
        ? { operationId: "sendOrder", name: "sendOrder", type: "publish", title: "Orders", description: "Orders.", message: messageRef("orderPlaced"), channelRef: channelRef("orders") }
        : { title: "Orders", description: "Orders.", operationId: "receiveOrder", name: "Orders", message: messageRef("orderPlaced") },
      caseKeys: v3 ? { Action: "send", CHANNEL: channelRef("orders"), Summary: "Orders." } : { Summary: "Orders.", SUMMARY: "Orders." },
      otherVersion: v3 ? { operationId: "sendOrder", summary: "Orders.", message: messageRef("orderPlaced") } : { action: "receive", channel: channelRef("orders"), title: "Orders." },
      cycleA: operationTarget("cycleB"),
      cycleB: operationTarget("cycleA"),
      self: operationTarget("self"),
      list: [complete],
      text: "sendOrderPlaced",
      nothing: null,
      external: { $ref: "./shared/operations.yaml#/sendOrderPlaced" },
      "a/b": complete,
      "with space": minimal,
      "espa\u00f1a": complete,
    },
  };
};

const CHANNEL_REF_CASES = [
  ["a reference to a root channel", channelRef("orders"), true],
  ["a reference to a components channel", { $ref: "#/components/channels/sharedOrders" }, true],
  ["a chained reference", channelRef("ordersAlias"), true],
  ["an escaped pointer", { $ref: "#/channels/eu~1west~0dr" }, true],
  ["a percent-encoded pointer", { $ref: "#/channels/north%20america" }, true],
  ["a UTF-8 percent-encoded pointer", { $ref: "#/channels/recepci%C3%B3n" }, true],
  ["a reference to a reply channel with a null address", channelRef("replies"), true],
  ["a reference to an object that is not a channel", { $ref: "#/info" }, true],
  ["a reference to a message of a channel", { $ref: "#/channels/orders/messages/orderPlaced" }, true],
  ["a reference with siblings, which are ignored", { ...channelRef("orders"), address: "", messages: {} }, true],
  ["a reference to a pointer into an array item", { $ref: "#/components/x-channels/list/0" }, true],
  ["an external reference", { $ref: "./shared/channels.yaml#/orders" }, true],
  ["an external whole-file reference", { $ref: "https://specs.example.io/channels/orders.yaml" }, true],
  ["a local alias of an external channel", channelRef("remote"), true],
  ["an inline channel object", { address: "retail.cdc.orders.inline.v1", messages: {} }, true],
  ["a channel name instead of a reference", "orders", true],
  ["a dangling reference", channelRef("retired"), false],
  ["a reference to an empty channel", { $ref: "#/components/x-channels/draft" }, false],
  ["a reference to a null channel", { $ref: "#/components/x-channels/nothing" }, false],
  ["a cyclic reference", { $ref: "#/components/x-channels/cycleA" }, false],
  ["a reference to the document root", { $ref: "#" }, false],
  ["an empty reference, which points to the document itself", { $ref: "" }, false],
  ["a pointer without a leading slash", { $ref: "#channels/orders" }, false],
  ["a malformed percent-encoded pointer", { $ref: "#/channels/%E0%A4%A" }, false],
  ["a pointer through a chained channel, which Spectral cannot resolve either", { $ref: "#/channels/ordersAlias/address" }, false],
  ["a non-string reference", { $ref: 42 }, false],
  ["a null reference", { $ref: null }, false],
  ["an empty inline object", {}, false],
];

const ACTION_VALUE_CASES = [
  ["send", "send", true],
  ["receive", "receive", true],
  ["an AsyncAPI 2.x action name, which is not validated", "publish", true],
  ["a value in another case, which is not validated", "SEND", true],
];

/**
 * @returns {Array} [description, traits, expected] cases for an operation without its own summary, the same in every
 *   version: expected findings are [path, kind] pairs where "@" is the operation path, completed by the caller
 */
const traitOnlyCases = () => [
  ["an inline trait with a summary", [{ summary: "Process order events." }], []],
  ["a referenced trait with a summary", [traitRef("summary")], []],
  ["a chained trait reference", [traitRef("alias")], []],
  ["a trait whose summary is a reference to a text", [traitRef("textRef")], []],
  ["a traits list given as a reference", { $ref: "#/components/x-trait-lists/summary" }, []],
  ["an external trait, which cannot be read", [traitRef("external")], []],
  ["an external whole-file trait", [{ $ref: "https://specs.example.io/traits/orders.yaml" }], []],
  ["a traits list given as an external reference", { $ref: "./shared/operation-traits.yaml#/all" }, []],
  ["a tuple trait with a summary", [[{ summary: "Process order events." }, {}]], []],
  ["a trait without summary", [traitRef("kafka")], [["@", "missing"]]],
  ["a trait with only a description", [traitRef("described")], [["@", "missing"]]],
  ["a trait with only an x-summary extension", [traitRef("extensionSummary")], [["@", "missing"]]],
  ["a dangling trait", [traitRef("retired")], [["@", "missing"]]],
  ["a cyclic trait list", { $ref: "#/components/x-texts/cycleA" }, [["@", "missing"]]],
  ["a null trait", [null], [["@", "missing"]]],
  ["a scalar trait", ["summary"], [["@", "missing"]]],
  ["an empty traits list", [], [["@", "missing"]]],
  ["a traits list given as a reference to an empty list", { $ref: "#/components/x-trait-lists/empty" }, [["@", "missing"]]],
  ["traits given as an object", { summary: "Process order events." }, [["@", "missing"]]],
  ["traits given as null", null, [["@", "missing"]]],
  ["traits given as a string", "kafka", [["@", "missing"]]],
  ["an inline trait with a blank summary", [{ summary: "  " }], [["@.traits.0.summary", "empty"]]],
  ["a referenced trait with a blank summary", [traitRef("blank")], [["components.operationTraits.blank.summary", "empty"]]],
  ["a chained reference to a trait with a blank summary", [traitRef("blankAlias")], [["components.operationTraits.blank.summary", "empty"]]],
  ["a trait with a null summary", [traitRef("nullSummary")], [["components.operationTraits.nullSummary.summary", "empty"]]],
  ["a trait whose summary is a reference to an empty text", [traitRef("emptyTextRef")], [["components.operationTraits.emptyTextRef.summary", "empty"]]],
  ["a trait whose summary is a dangling reference", [traitRef("danglingTextRef")], [["components.operationTraits.danglingTextRef.summary", "empty"]]],
  ["a traits list reference holding a trait with a blank summary", { $ref: "#/components/x-trait-lists/blank" }, [["components.operationTraits.blank.summary", "empty"]]],
  ["a traits list reference holding an inline blank summary", { $ref: "#/components/x-trait-lists/inlineBlank" }, [["components.x-trait-lists.inlineBlank.0.summary", "empty"]]],
  ["a tuple trait with an empty summary", [[{ summary: "" }, {}]], [["@.traits.0.0.summary", "empty"]]],
  ["a trait with a summary next to a trait without one", [traitRef("summary"), traitRef("kafka")], []],
  ["a trait without summary next to a trait with one", [traitRef("kafka"), traitRef("summary")], []],
  ["a populated trait applied before a blank one, which wins", [traitRef("summary"), traitRef("blank")], [["components.operationTraits.blank.summary", "empty"]]],
  ["a blank trait applied before a populated one, which wins", [traitRef("blank"), traitRef("summary")], []],
  ["a traits list reference with a populated trait before a blank one", { $ref: "#/components/x-trait-lists/mixed" }, [["components.operationTraits.blank.summary", "empty"]]],
  ["an external trait applied after a blank one", [traitRef("blank"), traitRef("external")], []],
  ["a blank trait applied after an external one", [traitRef("external"), traitRef("blank")], [["components.operationTraits.blank.summary", "empty"]]],
];

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, own summary, traits, expected] cases where the operation and its traits both carry a
 *   summary: 2.x traits override the operation, in 3.x the operation wins
 */
const traitOverrideCases = (major) => {
  const v3 = major === 3;
  const ownEmpty = [["@.summary", "empty"]];
  return [
    ["a populated summary and a populated trait summary", "Own summary.", [traitRef("summary")], []],
    ["a blank summary and a blank trait summary", " ", [traitRef("blank")], v3 ? ownEmpty : [["components.operationTraits.blank.summary", "empty"]]],
    ["a populated summary and a blank trait summary", "Own summary.", [traitRef("blank")], v3 ? [] : [["components.operationTraits.blank.summary", "empty"]]],
    ["a populated summary and a null trait summary", "Own summary.", [traitRef("nullSummary")], v3 ? [] : [["components.operationTraits.nullSummary.summary", "empty"]]],
    ["a populated summary and an inline blank trait summary", "Own summary.", [{ summary: "" }], v3 ? [] : [["@.traits.0.summary", "empty"]]],
    ["a blank summary and a populated trait summary", "", [traitRef("summary")], v3 ? ownEmpty : []],
    ["a null summary and a populated inline trait summary", null, [{ summary: "Trait summary." }], v3 ? ownEmpty : []],
    ["a blank summary and a trait without summary", "", [traitRef("kafka")], ownEmpty],
    ["a blank summary and an external trait", "", [traitRef("external")], v3 ? ownEmpty : []],
    ["a populated summary and an external trait", "Own summary.", [traitRef("external")], []],
    ["a blank summary, a populated trait and a blank trait", "", [traitRef("summary"), traitRef("blank")], v3 ? ownEmpty : [["components.operationTraits.blank.summary", "empty"]]],
    ["a populated summary, a blank trait and a populated trait", "Own summary.", [traitRef("blank"), traitRef("summary")], []],
    ["a populated summary, a blank trait and an external trait", "Own summary.", [traitRef("blank"), traitRef("external")], []],
    ["a populated summary, an external trait and a blank trait", "Own summary.", [traitRef("external"), traitRef("blank")], v3 ? [] : [["components.operationTraits.blank.summary", "empty"]]],
  ];
};

const REFERENCE_LANDING = {
  "#/components/x-operations/cycleA": ["components.x-operations.cycleB", "cycleB"],
  "#/components/x-operations/list": ["components.x-operations.list", "list"],
  "#/components/x-operations/text": ["components.x-operations.text", "text"],
  "#/components/x-operations/nothing": ["components.x-operations.nothing", "nothing"],
};

const combinations = (items) => items.flatMap((_, index) => items.slice(index + 1).map((other) => [items[index], other]));

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
  const allMissing = allMissingFor(major);
  const at = (path, key) => (v3 ? [path, key] : [path, NAME]);
  const missingAt = (path, key) => allMissing(...at(path, key));
  const sparse = v3
    ? [["components.x-operations.sparse.channel", "empty", "sparse", "channel"], ["components.x-operations.sparse", "missing", "sparse", "summary"]]
    : [["components.x-operations.sparse.summary", "empty", NAME, ACTION_V2]];
  const otherVersion = v3
    ? [["components.x-operations.otherVersion", "missing", "otherVersion", "action"], ["components.x-operations.otherVersion", "missing", "otherVersion", "channel"]]
    : [["components.x-operations.otherVersion", "missing", NAME, ACTION_V2]];
  const unusable = (path, key) => (v3 ? [[path, "unusable", key]] : [[path, "unusable", NAME, ACTION_V2]]);
  return [
    ["a reference to a complete operation", operationTarget("complete"), []],
    ["a reference to a minimal operation", operationTarget("minimal"), []],
    ["a chained reference", operationTarget("alias"), []],
    ["a reference chained twice", operationTarget("aliasTwice"), []],
    ["a reference with siblings, which are ignored", { ...operationTarget("complete"), summary: "", action: null }, []],
    ["a reference to an empty operation with populated siblings, which are ignored", { ...operationTarget("empty"), ...minimal }, missingAt("components.x-operations.empty", "empty")],
    ["a pointer into an array item", { $ref: "#/components/x-operations/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-operations/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-operations/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-operations/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/operations.yaml#/sendOrderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/operations/send-order-placed.yaml" }, []],
    ["a local alias of an external operation", operationTarget("external"), []],
    ["a reference to a sparse operation", operationTarget("sparse"), sparse],
    ["a chained reference to a sparse operation", operationTarget("sparseAlias"), sparse],
    ["a reference to an empty operation", operationTarget("empty"), missingAt("components.x-operations.empty", "empty")],
    ["a reference to an operation with only extensions", operationTarget("extensionsOnly"), missingAt("components.x-operations.extensionsOnly", "extensionsOnly")],
    ["a reference to an operation with only look-alike keys", operationTarget("lookAlikes"), missingAt("components.x-operations.lookAlikes", "lookAlikes")],
    ["a reference to an operation whose keys differ in case", operationTarget("caseKeys"), missingAt("components.x-operations.caseKeys", "caseKeys")],
    [`a reference to an operation written for AsyncAPI ${v3 ? 2 : 3}`, operationTarget("otherVersion"), otherVersion],
    ["a reference to an object that is not an operation", { $ref: "#/info" }, missingAt("info", "info")],
    ...unusableObjectCases(
      operationTarget,
      { text: "sendOrderPlaced", item: complete },
      () => unusable(AT, NAME),
      (ref) => {
        const [path, name] = REFERENCE_LANDING[ref] || [AT, NAME];
        return unusable(path, name);
      }
    ),
    ["an operation name instead of an object", "sendOrderPlaced", unusable(AT, NAME)],
    ["a list of operations", [minimal, complete], unusable(AT, NAME)],
    ["a pointer past the end of an array", { $ref: "#/components/x-operations/list/3" }, unusable(AT, NAME)],
    ["a pointer through a chained operation", { $ref: "#/components/x-operations/alias/summary" }, unusable(AT, NAME)],
    ["a self reference", operationTarget("self"), unusable("components.x-operations.self", "self")],
    ["a reference to the operation itself", { $ref: v3 ? `#/operations/${NAME}` : `#/channels/${NAME}/${ACTION_V2}` }, unusable(AT, NAME)],
  ];
};

/**
 * @returns {Array} [description, operation, expected] cases for an AsyncAPI 3.x operation written at operations.sendOrderPlaced
 */
const operationObjectCasesV3 = () => {
  const AT = atOf(3);
  const NAME = NAMES[3];
  const { complete, minimal } = shapesFor(3);
  const allMissing = allMissingFor(3);
  const without = (...dropped) => Object.fromEntries(Object.entries(minimal).filter(([key]) => !dropped.includes(key)));
  return [
    ["a complete inline operation", complete, []],
    ["an operation with only the three fields", minimal, []],
    ["a receive operation", { ...minimal, action: "receive" }, []],
    [
      "an operation with every optional field",
      {
        ...minimal,
        title: "Publish orders",
        description: "Publishes orders.",
        security: [{ $ref: "#/components/securitySchemes/saslScram" }],
        tags: [{ name: "orders" }],
        externalDocs: { url: "https://docs.example.io/orders" },
        bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } },
        traits: [traitRef("kafka")],
        messages: [{ $ref: "#/channels/orders/messages/orderPlaced" }],
        reply: { address: { location: "$message.header#/replyTo" }, channel: channelRef("replies"), messages: [] },
        "x-owner": "orders",
      },
      [],
    ],
    ["an empty operation", {}, allMissing(AT, NAME)],
    ...FIELDS_V3.map((field) => [`an operation without ${field}`, without(field), [[AT, "missing", NAME, field]]]),
    ...combinations(FIELDS_V3).map(([a, b]) => [`an operation without ${a} and ${b}`, without(a, b), [[AT, "missing", NAME, a], [AT, "missing", NAME, b]]]),
    ["an operation with only extensions", { "x-action": "send", "x-channel": channelRef("orders"), "x-summary": "Orders." }, allMissing(AT, NAME)],
    ["an operation with look-alike keys", { operationId: "sendOrder", type: "send", title: "Orders", description: "Orders.", message: messageRef("orderPlaced"), channels: [channelRef("orders")] }, allMissing(AT, NAME)],
    ["an operation whose keys differ in case", { Action: "send", ACTION: "send", Channel: channelRef("orders"), Summary: "Orders." }, allMissing(AT, NAME)],
    ["an operation written for AsyncAPI 2.x", { operationId: "sendOrder", summary: "Orders.", message: messageRef("orderPlaced") }, [[AT, "missing", NAME, "action"], [AT, "missing", NAME, "channel"]]],
    ["a summary only in the title and description", { ...without("summary"), title: "Publish orders", description: "Publishes orders." }, [[AT, "missing", NAME, "summary"]]],
    ["a channel only in the messages and the reply", { ...without("channel"), messages: [{ $ref: "#/channels/orders/messages/orderPlaced" }], reply: { channel: channelRef("replies") } }, [[AT, "missing", NAME, "channel"]]],
    ["an action only in the bindings", { ...without("action"), bindings: { kafka: { action: "send" } } }, [[AT, "missing", NAME, "action"]]],
    ["an action and a channel only in a trait, which never supplies them", { summary: "Orders.", traits: [traitRef("withActionAndChannel")] }, [[AT, "missing", NAME, "action"], [AT, "missing", NAME, "channel"]]],
    ["an action and a channel only in an inline trait", { traits: [{ action: "send", channel: channelRef("orders"), summary: "Orders." }] }, [[AT, "missing", NAME, "action"], [AT, "missing", NAME, "channel"]]],
    ["the three fields blank", { action: " ", channel: {}, summary: "" }, FIELDS_V3.map((field) => [`${AT}.${field}`, "empty", NAME, field])],
    ["blank fields and populated look-alikes", { action: "\t", channel: null, summary: [], operationId: "sendOrder", title: "Orders", description: "Orders." }, FIELDS_V3.map((field) => [`${AT}.${field}`, "empty", NAME, field])],
    ["a dangling channel, a blank action and a summary in a trait", { action: "", channel: channelRef("retired"), traits: [traitRef("summary")] }, [[`${AT}.action`, "empty", NAME, "action"], [`${AT}.channel`, "empty", NAME, "channel"]]],
    ...sharedReferenceCases(3),
  ];
};

/**
 * @returns {Array} [description, operation, expected] cases for an AsyncAPI 2.x subscribe operation of channel retail.cdc.orders.placed.v1
 */
const operationObjectCasesV2 = () => {
  const AT = atOf(2);
  const NAME = NAMES[2];
  const { complete, minimal } = shapesFor(2);
  const missing = [[AT, "missing", NAME, ACTION_V2]];
  return [
    ["a complete inline operation", complete, []],
    ["an operation with only a summary", minimal, []],
    [
      "an operation with every optional field",
      {
        ...minimal,
        operationId: "receiveOrderPlaced",
        description: "Receives orders.",
        security: [{ saslScram: [] }],
        tags: [{ name: "orders" }],
        externalDocs: { url: "https://docs.example.io/orders" },
        bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.4.0" } },
        traits: [traitRef("kafka")],
        message: messageRef("orderPlaced"),
        "x-owner": "orders",
      },
      [],
    ],
    ["an empty operation", {}, missing],
    ["an operation without summary", { operationId: "receiveOrderPlaced", description: "Receives orders.", message: messageRef("orderPlaced") }, missing],
    ["an operation with only extensions", { "x-summary": "Orders.", "x-description": "Orders." }, missing],
    ["an operation whose keys differ in case", { Summary: "Orders.", SUMMARY: "Orders." }, missing],
    ["a summary only in the bindings", { bindings: { kafka: { summary: "Orders." } } }, missing],
    ["a summary only in the message", { message: { name: "orderPlaced", summary: "Order placed." } }, missing],
    ["an operation written for AsyncAPI 3.x", { action: "receive", channel: channelRef("orders"), title: "Orders", messages: [messageRef("orderPlaced")] }, missing],
    ["an operation with a blank summary", { summary: " " }, [[`${AT}.summary`, "empty", NAME, ACTION_V2]]],
    ["an operation with a null summary and a populated description", { summary: null, description: "Receives orders." }, [[`${AT}.summary`, "empty", NAME, ACTION_V2]]],
    ...sharedReferenceCases(2),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a properties list like the rule table", { properties: ["action", "channel", "summary"] }],
  ["a properties list with the description", { properties: ["action", "channel", "summary", "description"] }],
  ["a properties list with one field", { properties: ["summary"] }],
  ["a properties list with other fields", { properties: ["title", "description", "operationId", "bindings"] }],
  ["a properties string", { properties: "action,channel,summary" }],
  ["fields-to-apply with only the summary", { "fields-to-apply": "summary" }],
  ["fields-to-apply with other fields", { "fields-to-apply": "description,operationId,tags" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a required list", { required: ["description"] }],
  ["a field option like core truthy", { field: "description" }],
  ["a pattern", { pattern: "^x-" }],
  ["valid-versions", { "valid-versions": "2.8.0" }],
  ["null values", { properties: null, "fields-to-apply": null, field: null }],
  ["non-string values", { properties: 42, "fields-to-apply": true, required: "summary" }],
];

module.exports = {
  FIELDS_V3,
  NAMES,
  ACTION_V2,
  atOf,
  shown,
  messagesFor,
  findingsFor,
  allMissingFor,
  operationTarget,
  traitRef,
  channelRef,
  messageRef,
  CHANNELS_V3,
  shapesFor,
  operationComponentsFor,
  CHANNEL_REF_CASES,
  ACTION_VALUE_CASES,
  VALUE_CASES: INFO_VALUE_CASES,
  traitOnlyCases,
  traitOverrideCases,
  operationObjectCasesV2,
  operationObjectCasesV3,
  IGNORED_OPTIONS,
};
