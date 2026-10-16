const { INFO_COMPONENTS, INFO_VALUE_CASES, findingsFrom, unusableObjectCases } = require("../required-fields");

const FIELDS_V3 = ["address", "description", "messages"];
const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "orderPlaced" };
const atOf = (major) => `channels.${NAMES[major]}`;

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const EXPECTED = { 2: "'description' and a message in 'publish' or 'subscribe'", 3: "'address', 'description' and 'messages'" };

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} Expected message builders keyed by finding kind
 */
const messagesFor = (major) => ({
  missing: (channel, field) => `AAR087: Channel '${shown(channel)}' must declare '${field}'.`,
  empty: (channel, field) => `AAR087: The '${field}' of channel '${shown(channel)}' must not be empty.`,
  noMessage: (channel) => `AAR087: Channel '${shown(channel)}' must declare a message in 'publish' or 'subscribe'.`,
  emptyMessage: (channel, operation) => `AAR087: The '${operation}.message' of channel '${shown(channel)}' must not be empty.`,
  unusable: (channel) => `AAR087: Channel '${shown(channel)}' must be an object declaring ${EXPECTED[major]}.`,
});

const findingsFor = (major) => findingsFrom(messagesFor(major));

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Function} Expected [path, kind, ...args] entries for a channel lacking every mandatory field
 */
const allMissingFor = (major) => (path, name) =>
  major === 3 ? FIELDS_V3.map((field) => [path, "missing", name, field]) : [[path, "missing", name, "description"], [path, "noMessage", name]];

const channelTarget = (name) => ({ $ref: `#/components/x-channels/${name}` });
const operationTarget = (name) => ({ $ref: `#/components/x-operations/${name}` });
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
  emptyMessage: {},
};

const shapesFor = (major) => {
  if (major === 3) {
    const complete = {
      address: "retail.cdc.orders.placed.v1",
      title: "Orders placed",
      description: "Orders placed in any sales channel.",
      messages: { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") },
    };
    const minimal = { address: "orders.placed", description: "Orders placed.", messages: { orderPlaced: messageRef("orderPlaced") } };
    return { complete, minimal };
  }
  const complete = {
    description: "Orders placed in any sales channel.",
    subscribe: { operationId: "receiveOrderPlaced", message: { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] } },
    publish: { operationId: "publishOrderPlaced", message: messageRef("orderPlaced") },
  };
  const minimal = { description: "Orders placed.", subscribe: { message: messageRef("orderPlaced") } };
  return { complete, minimal };
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: the shared texts of the required-field rules, messages and the x-channels and x-operations reference targets
 */
const channelComponentsFor = (major) => {
  const { complete, minimal } = shapesFor(major);
  const v3 = major === 3;
  return {
    ...INFO_COMPONENTS,
    messages: MESSAGES,
    "x-message-wrappers": { emptyOneOf: { oneOf: [] }, twoMessages: { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] } },
    "x-message-lists": { empty: [], two: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] },
    "x-operations": {
      withMessage: { operationId: "receiveShared", message: messageRef("orderPlaced") },
      withoutMessage: { operationId: "receiveNothing", summary: "No message." },
      emptyMessage: { operationId: "receiveEmpty", message: { oneOf: [] } },
      alias: operationTarget("withMessage"),
    },
    "x-channels": {
      complete,
      minimal,
      alias: channelTarget("complete"),
      aliasTwice: channelTarget("alias"),
      sparse: v3 ? { address: "orders.sparse", messages: {}, "x-description": "Sparse." } : { description: " \t ", publish: { operationId: "publishSparse" } },
      sparseAlias: channelTarget("sparse"),
      empty: {},
      extensionsOnly: v3
        ? { "x-address": "orders.placed", "x-description": "Orders.", "x-messages": { orderPlaced: messageRef("orderPlaced") } }
        : { "x-description": "Orders.", "x-publish": { message: messageRef("orderPlaced") } },
      lookAlikes: v3
        ? { name: "orders.placed", topic: "orders.placed", path: "/orders", summary: "Orders.", title: "Orders", message: messageRef("orderPlaced"), payload: { type: "object" } }
        : { summary: "Orders.", title: "Orders", messages: { orderPlaced: messageRef("orderPlaced") }, send: { message: messageRef("orderPlaced") }, receive: { message: messageRef("orderPlaced") } },
      caseKeys: v3
        ? { Address: "orders.placed", DESCRIPTION: "Orders.", Messages: { orderPlaced: messageRef("orderPlaced") } }
        : { Description: "Orders.", Publish: { message: messageRef("orderPlaced") }, SUBSCRIBE: { message: messageRef("orderPlaced") } },
      otherVersion: v3 ? { description: "Orders placed.", subscribe: { message: messageRef("orderPlaced") } } : { address: "orders.placed", description: "Orders placed.", messages: { orderPlaced: messageRef("orderPlaced") } },
      cycleA: channelTarget("cycleB"),
      cycleB: channelTarget("cycleA"),
      self: channelTarget("self"),
      list: [complete],
      text: "retail.cdc.orders.placed.v1",
      nothing: null,
      external: { $ref: "./shared/channels.yaml#/orderPlaced" },
      "a/b": complete,
      "with space": minimal,
      "espa\u00f1a": complete,
    },
  };
};

const CHANNEL_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["a dotted Kafka topic", "retail.cdc.orders.placed.v1", true],
  ["an address expression", "stores/{storeId}/sensors/{sensorId}", true],
  ["an MQTT wildcard topic", "devices/+/telemetry/#", true],
  ["an HTTP path", "/v1/orders", true],
  ["a single slash", "/", true],
  ["a messages map", { orderPlaced: messageRef("orderPlaced") }, true],
  ["a messages map with an x- key, which is a message name", { "x-orderPlaced": messageRef("orderPlaced") }, true],
  ["a messages map whose only message is null", { orderPlaced: null }, true],
  ["a messages map with a dangling message", { gone: messageRef("gone") }, true],
  ["a reference to the components messages map", { $ref: "#/components/messages" }, true],
  ["a pointer to a field of another channel", { $ref: "#/components/x-channels/complete/description" }, true],
  ["a pointer through a chained channel, which Spectral cannot resolve either", { $ref: "#/components/x-channels/alias/description" }, false],
  ["a pointer to an empty field of another channel", { $ref: "#/components/x-channels/sparse/messages" }, false],
];

const MESSAGE_VALUE_CASES = [
  ["an inline message", { name: "orderPlaced", payload: { type: "object" } }, true],
  ["an empty message object", {}, true],
  ["a message with only headers", { headers: { type: "object", properties: { traceId: { type: "string" } } } }, true],
  ["a message with only an extension", { "x-owner": "orders" }, true],
  ["an Avro message with schemaFormat", { schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: { type: "record", name: "Order", fields: [] } }, true],
  ["a message with traits", { name: "orderPlaced", traits: [{ $ref: "#/components/messageTraits/missing" }] }, true],
  ["a reference to a component message", messageRef("orderPlaced"), true],
  ["a reference to an empty component message", messageRef("emptyMessage"), true],
  ["a chained reference to a oneOf wrapper", { $ref: "#/components/x-message-wrappers/twoMessages" }, true],
  ["an external reference", { $ref: "./shared/messages.yaml#/orderPlaced" }, true],
  ["an external whole-file reference", { $ref: "https://schemas.example.io/messages/order-placed.yaml" }, true],
  ["a oneOf with references", { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] }, true],
  ["a oneOf with one inline message", { oneOf: [{ name: "orderPlaced" }] }, true],
  ["a oneOf with a dangling message, which is still listed", { oneOf: [messageRef("gone")] }, true],
  ["a oneOf with a null item, which is still listed", { oneOf: [null] }, true],
  ["a oneOf given as a reference to a list", { oneOf: { $ref: "#/components/x-message-lists/two" } }, true],
  ["a oneOf given as an external reference", { oneOf: { $ref: "./shared/messages.yaml#/all" } }, true],
  ["a oneOf with siblings", { oneOf: [messageRef("orderPlaced")], name: "ignored" }, true],
  ["a message name instead of an object", "orderPlaced", true],
  ["a list of messages", [messageRef("orderPlaced")], true],
  ["zero", 0, true],
  ["false", false, true],
  ["an empty oneOf", { oneOf: [] }, false],
  ["a null oneOf", { oneOf: null }, false],
  ["a blank oneOf", { oneOf: " " }, false],
  ["an empty oneOf with siblings", { oneOf: [], name: "orderPlaced", payload: { type: "object" } }, false],
  ["a oneOf given as a reference to an empty list", { oneOf: { $ref: "#/components/x-message-lists/empty" } }, false],
  ["a oneOf given as a dangling reference", { oneOf: { $ref: "#/components/x-message-lists/missing" } }, false],
  ["a reference to an empty oneOf wrapper", { $ref: "#/components/x-message-wrappers/emptyOneOf" }, false],
  ["a dangling reference", messageRef("gone"), false],
  ["a cyclic reference", { $ref: "#/components/x-texts/cycleA" }, false],
  ["a reference to the document root", { $ref: "#" }, false],
  ["a malformed pointer", { $ref: "#components/messages/orderPlaced" }, false],
  ["a non-string reference", { $ref: 42 }, false],
  ["null", null, false],
  ["an empty string", "", false],
  ["a blank string", " \t ", false],
  ["an empty list", [], false],
];

const REFERENCE_LANDING = {
  "#/components/x-channels/cycleA": ["components.x-channels.cycleB", "cycleB"],
  "#/components/x-channels/list": ["components.x-channels.list", "list"],
  "#/components/x-channels/text": ["components.x-channels.text", "text"],
  "#/components/x-channels/nothing": ["components.x-channels.nothing", "nothing"],
};

const combinations = (items) => items.flatMap((_, index) => items.slice(index + 1).map((other) => [items[index], other]));

const sharedReferenceCases = (major) => {
  const AT = atOf(major);
  const NAME = NAMES[major];
  const { complete, minimal } = shapesFor(major);
  const allMissing = allMissingFor(major);
  const sparse =
    major === 3
      ? [["components.x-channels.sparse", "missing", "sparse", "description"], ["components.x-channels.sparse.messages", "empty", "sparse", "messages"]]
      : [["components.x-channels.sparse.description", "empty", "sparse", "description"], ["components.x-channels.sparse", "noMessage", "sparse"]];
  const otherVersion = major === 3 ? [["components.x-channels.otherVersion", "missing", "otherVersion", "address"], ["components.x-channels.otherVersion", "missing", "otherVersion", "messages"]] : [["components.x-channels.otherVersion", "noMessage", "otherVersion"]];
  return [
    ["a reference to a complete channel", channelTarget("complete"), []],
    ["a reference to a minimal channel", channelTarget("minimal"), []],
    ["a chained reference", channelTarget("alias"), []],
    ["a reference chained twice", channelTarget("aliasTwice"), []],
    ["a reference with siblings, which are ignored", { ...channelTarget("complete"), description: "", messages: {}, publish: null }, []],
    ["a reference to an empty channel with populated siblings, which are ignored", { ...channelTarget("empty"), ...minimal }, allMissing("components.x-channels.empty", "empty")],
    ["a pointer into an array item", { $ref: "#/components/x-channels/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-channels/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-channels/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-channels/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/channels.yaml#/orderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/channels/order-placed.yaml" }, []],
    ["a local alias of an external channel", channelTarget("external"), []],
    ["a reference to a sparse channel", channelTarget("sparse"), sparse],
    ["a chained reference to a sparse channel", channelTarget("sparseAlias"), sparse],
    ["a reference to an empty channel", channelTarget("empty"), allMissing("components.x-channels.empty", "empty")],
    ["a reference to a channel with only extensions", channelTarget("extensionsOnly"), allMissing("components.x-channels.extensionsOnly", "extensionsOnly")],
    ["a reference to a channel with only look-alike keys", channelTarget("lookAlikes"), allMissing("components.x-channels.lookAlikes", "lookAlikes")],
    ["a reference to a channel whose keys differ in case", channelTarget("caseKeys"), allMissing("components.x-channels.caseKeys", "caseKeys")],
    [`a reference to a channel written for AsyncAPI ${major === 3 ? 2 : 3}`, channelTarget("otherVersion"), otherVersion],
    ["a reference to an object that is not a channel", { $ref: "#/info" }, allMissing("info", "info")],
    ...unusableObjectCases(
      channelTarget,
      { text: "retail.cdc.orders.placed.v1", item: complete },
      () => [[AT, "unusable", NAME]],
      (ref) => {
        const [path, name] = REFERENCE_LANDING[ref] || [AT, NAME];
        return [[path, "unusable", name]];
      }
    ),
    ["a topic name instead of an object", "retail.cdc.orders.placed.v1", [[AT, "unusable", NAME]]],
    ["a list of channels", [minimal, complete], [[AT, "unusable", NAME]]],
    ["a pointer past the end of an array", { $ref: "#/components/x-channels/list/3" }, [[AT, "unusable", NAME]]],
    ["a pointer through a chained channel", { $ref: "#/components/x-channels/alias/messages" }, [[AT, "unusable", NAME]]],
    ["a self reference", channelTarget("self"), [["components.x-channels.self", "unusable", "self"]]],
    ["a reference to the channel itself", { $ref: `#/channels/${NAME}` }, [[AT, "unusable", NAME]]],
  ];
};

/**
 * @returns {Array} [description, channel, expected] cases for an AsyncAPI 3.x channel written at channels.orderPlaced
 */
const channelObjectCasesV3 = () => {
  const AT = atOf(3);
  const NAME = NAMES[3];
  const { complete, minimal } = shapesFor(3);
  const allMissing = allMissingFor(3);
  const without = (...dropped) => Object.fromEntries(Object.entries(minimal).filter(([key]) => !dropped.includes(key)));
  return [
    ["a complete inline channel", complete, []],
    ["a channel with only the three fields", minimal, []],
    [
      "a channel with every optional field",
      {
        ...minimal,
        address: "stores/{storeId}/orders",
        title: "Store orders",
        summary: "Orders of a store.",
        servers: [{ $ref: "#/servers/production" }],
        parameters: { storeId: { description: "Store identifier.", enum: ["MAD001", "BCN002"], default: "MAD001", location: "$message.payload#/storeId" } },
        tags: [{ name: "orders" }],
        externalDocs: { url: "https://docs.example.io/orders" },
        bindings: { kafka: { topic: "retail.orders", partitions: 12, bindingVersion: "0.5.0" } },
        "x-owner": "orders",
      },
      [],
    ],
    ["a channel whose only message is an inline message", { ...minimal, messages: { orderPlaced: { name: "orderPlaced", payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Order", fields: [] } } } } }, []],
    ["an empty channel", {}, allMissing(AT, NAME)],
    ...FIELDS_V3.map((field) => [`a channel without ${field}`, without(field), [[AT, "missing", NAME, field]]]),
    ...combinations(FIELDS_V3).map(([a, b]) => [`a channel without ${a} and ${b}`, without(a, b), [[AT, "missing", NAME, a], [AT, "missing", NAME, b]]]),
    ["a channel with a null address, which the spec reads as unknown", { ...minimal, address: null }, [[`${AT}.address`, "empty", NAME, "address"]]],
    ["a reply channel with a null address and a dynamic reply location elsewhere", { address: null, description: "Replies.", messages: { orderAccepted: messageRef("orderPlaced") } }, [[`${AT}.address`, "empty", NAME, "address"]]],
    ["a channel with an empty messages map", { ...minimal, messages: {} }, [[`${AT}.messages`, "empty", NAME, "messages"]]],
    ["a channel with only extensions", { "x-address": "orders.placed", "x-description": "Orders.", "x-messages": { orderPlaced: messageRef("orderPlaced") } }, allMissing(AT, NAME)],
    ["a channel with look-alike keys", { name: "orders.placed", topic: "orders.placed", path: "/orders", summary: "Orders.", title: "Orders", message: messageRef("orderPlaced"), payload: { type: "object" } }, allMissing(AT, NAME)],
    ["a channel whose keys differ in case", { Address: "orders.placed", ADDRESS: "orders.placed", Description: "Orders.", Messages: { orderPlaced: messageRef("orderPlaced") } }, allMissing(AT, NAME)],
    ["an address only in the Kafka binding", { ...without("address"), bindings: { kafka: { topic: "orders.placed", bindingVersion: "0.5.0" } } }, [[AT, "missing", NAME, "address"]]],
    ["a description only in the title and summary", { ...without("description"), title: "Orders placed", summary: "Orders placed in any sales channel." }, [[AT, "missing", NAME, "description"]]],
    ["a channel written for AsyncAPI 2.x", { description: "Orders.", subscribe: { message: messageRef("orderPlaced") }, publish: { message: messageRef("orderPlaced") } }, [[AT, "missing", NAME, "address"], [AT, "missing", NAME, "messages"]]],
    ["a channel with the three fields blank", { address: " ", description: "", messages: {} }, FIELDS_V3.map((field) => [`${AT}.${field}`, "empty", NAME, field])],
    ["a channel with blank fields and populated look-alikes", { address: "\t", description: null, messages: [], topic: "orders.placed", summary: "Orders.", message: messageRef("orderPlaced") }, FIELDS_V3.map((field) => [`${AT}.${field}`, "empty", NAME, field])],
    ...sharedReferenceCases(3),
  ];
};

/**
 * @returns {Array} [description, channel, expected] cases for an AsyncAPI 2.x channel written at channels.retail.cdc.orders.placed.v1
 */
const channelObjectCasesV2 = () => {
  const AT = atOf(2);
  const NAME = NAMES[2];
  const { complete, minimal } = shapesFor(2);
  const allMissing = allMissingFor(2);
  const DESCRIPTION = { description: "Orders placed." };
  const noMessage = [[AT, "noMessage", NAME]];
  return [
    ["a complete inline channel", complete, []],
    ["a channel with a description and a subscribe message", minimal, []],
    ["a channel with a description and a publish message", { ...DESCRIPTION, publish: { message: messageRef("orderPlaced") } }, []],
    [
      "a channel with every optional field",
      {
        ...minimal,
        servers: ["production"],
        parameters: { storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" }, location: "$message.payload#/storeId" } },
        bindings: { kafka: { bindingVersion: "0.4.0" } },
        deprecated: false,
        "x-owner": "orders",
      },
      [],
    ],
    ["an empty channel", {}, allMissing(AT, NAME)],
    ["a channel without description", { subscribe: { message: messageRef("orderPlaced") } }, [[AT, "missing", NAME, "description"]]],
    ["a channel without operations", { ...DESCRIPTION, parameters: { storeId: { schema: { type: "string" } } } }, noMessage],
    ["a channel whose publish has no message", { ...DESCRIPTION, publish: { operationId: "publishOrder", summary: "Publish.", traits: [{ $ref: "#/components/operationTraits/kafka" }], bindings: { kafka: { clientId: "orders" } } } }, noMessage],
    ["a channel whose operations are empty objects", { ...DESCRIPTION, publish: {}, subscribe: {} }, noMessage],
    ["a channel whose operations are null", { ...DESCRIPTION, publish: null, subscribe: null }, noMessage],
    ["a channel whose operations are not objects", { ...DESCRIPTION, publish: "orderPlaced", subscribe: [{ message: messageRef("orderPlaced") }] }, noMessage],
    ["a channel whose message is only in an operation trait", { ...DESCRIPTION, subscribe: { traits: [{ message: messageRef("orderPlaced") }] } }, noMessage],
    ["a channel whose message is only in the bindings", { ...DESCRIPTION, bindings: { kafka: { message: messageRef("orderPlaced") } } }, noMessage],
    ["a channel with an AsyncAPI 3.x messages map", { ...DESCRIPTION, messages: { orderPlaced: messageRef("orderPlaced") } }, noMessage],
    ["a channel with AsyncAPI 3.x send and receive keys", { ...DESCRIPTION, send: { message: messageRef("orderPlaced") }, receive: { message: messageRef("orderPlaced") } }, noMessage],
    ["a channel whose operation keys differ in case", { ...DESCRIPTION, Publish: { message: messageRef("orderPlaced") }, SUBSCRIBE: { message: messageRef("orderPlaced") } }, noMessage],
    ["a channel whose operations are extensions", { ...DESCRIPTION, "x-publish": { message: messageRef("orderPlaced") } }, noMessage],
    ["a channel with an empty publish message", { ...DESCRIPTION, publish: { message: { oneOf: [] } } }, [[`${AT}.publish.message`, "emptyMessage", NAME, "publish"]]],
    ["a channel with both messages empty", { ...DESCRIPTION, publish: { message: null }, subscribe: { message: { oneOf: [] } } }, [[`${AT}.publish.message`, "emptyMessage", NAME, "publish"], [`${AT}.subscribe.message`, "emptyMessage", NAME, "subscribe"]]],
    ["an empty publish message next to a subscribe message", { ...DESCRIPTION, publish: { message: { oneOf: [] } }, subscribe: { message: messageRef("orderPlaced") } }, []],
    ["an empty publish message next to a subscribe without message", { ...DESCRIPTION, publish: { message: "" }, subscribe: { operationId: "receiveOrder" } }, [[`${AT}.publish.message`, "emptyMessage", NAME, "publish"]]],
    ["a description only in the operations", { publish: { description: "Publishes orders.", message: messageRef("orderPlaced") } }, [[AT, "missing", NAME, "description"]]],
    ["a description only as an extension or binding", { "x-description": "Orders.", bindings: { kafka: { description: "Orders." } }, subscribe: { message: messageRef("orderPlaced") } }, [[AT, "missing", NAME, "description"]]],
    ["a blank description and no operations", { description: " " }, [[`${AT}.description`, "empty", NAME, "description"], [AT, "noMessage", NAME]]],
    ["an operation given as a reference to an operation with a message", { ...DESCRIPTION, subscribe: operationTarget("withMessage") }, []],
    ["an operation given as a chained reference", { ...DESCRIPTION, subscribe: operationTarget("alias") }, []],
    ["an operation given as an external reference", { ...DESCRIPTION, subscribe: { $ref: "./shared/operations.yaml#/receiveOrder" } }, []],
    ["an operation given as a reference to an operation without message", { ...DESCRIPTION, subscribe: operationTarget("withoutMessage") }, noMessage],
    ["an operation given as a dangling reference", { ...DESCRIPTION, subscribe: operationTarget("missing") }, noMessage],
    ["an operation given as a reference to an operation with an empty message", { ...DESCRIPTION, publish: operationTarget("emptyMessage") }, [["components.x-operations.emptyMessage.message", "emptyMessage", NAME, "publish"]]],
    ...sharedReferenceCases(2),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a properties list like the rule table", { properties: ["address", "description", "messages"] }],
  ["a properties list with one field", { properties: ["description"] }],
  ["a properties list with other fields", { properties: ["title", "summary", "servers", "bindings"] }],
  ["a properties string", { properties: "address,description,messages" }],
  ["fields-to-apply with only the description", { "fields-to-apply": "description" }],
  ["fields-to-apply with other fields", { "fields-to-apply": "title,summary,parameters" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a required list", { required: ["title"] }],
  ["a field option like core truthy", { field: "summary" }],
  ["a pattern", { pattern: "^x-" }],
  ["valid-versions", { "valid-versions": "2.8.0" }],
  ["null values", { properties: null, "fields-to-apply": null, field: null }],
  ["non-string values", { properties: 42, "fields-to-apply": true, required: "description" }],
];

module.exports = {
  FIELDS_V3,
  NAMES,
  atOf,
  shown,
  messagesFor,
  findingsFor,
  allMissingFor,
  channelTarget,
  operationTarget,
  messageRef,
  shapesFor,
  channelComponentsFor,
  CHANNEL_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  channelObjectCasesV2,
  channelObjectCasesV3,
  IGNORED_OPTIONS,
};
