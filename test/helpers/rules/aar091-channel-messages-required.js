const { findingsFrom, unusableObjectCases } = require("../required-fields");

const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "orderPlaced" };
const atOf = (major) => `channels.${NAMES[major]}`;

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const WHERE = { 2: "'publish' or 'subscribe'", 3: "'messages'" };

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {object} Expected message builders keyed by finding kind
 */
const messagesFor = (major) => ({
  missing: (channel) => `AAR091: Channel '${shown(channel)}' must declare at least one message in ${WHERE[major]}.`,
  empty: (channel) => `AAR091: The 'messages' of channel '${shown(channel)}' must declare at least one message.`,
  emptyMessage: (channel, operation) => `AAR091: The '${operation}.message' of channel '${shown(channel)}' must declare at least one message.`,
  unusable: (channel) => `AAR091: Channel '${shown(channel)}' must be an object declaring at least one message in ${WHERE[major]}.`,
});

const findingsFor = (major) => findingsFrom(messagesFor(major));

const channelTarget = (name) => ({ $ref: `#/components/x-channels/${name}` });
const operationTarget = (name) => ({ $ref: `#/components/x-operations/${name}` });
const messageRef = (name) => ({ $ref: `#/components/messages/${name}` });
const mapRef = (name) => ({ $ref: `#/components/x-message-maps/${name}` });
const wrapperRef = (name) => ({ $ref: `#/components/x-message-wrappers/${name}` });
const listRef = (name) => ({ $ref: `#/components/x-message-lists/${name}` });

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

const shapesFor = (major) => {
  if (major === 3) {
    const complete = {
      address: "retail.cdc.orders.placed.v1",
      title: "Orders placed",
      description: "Orders placed in any sales channel.",
      messages: { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") },
    };
    const minimal = { messages: { orderPlaced: messageRef("orderPlaced") } };
    return { complete, minimal };
  }
  const complete = {
    description: "Orders placed in any sales channel.",
    subscribe: { operationId: "receiveOrderPlaced", message: { oneOf: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")] } },
    publish: { operationId: "publishOrderPlaced", message: messageRef("orderPlaced") },
  };
  const minimal = { subscribe: { message: messageRef("orderPlaced") } };
  return { complete, minimal };
};

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: messages, message traits and the x- reference targets of messages maps, oneOf wrappers, oneOf lists, operations and channels
 */
const channelComponentsFor = (major) => {
  const { complete, minimal } = shapesFor(major);
  const v3 = major === 3;
  return {
    messages: messagesOf(major),
    messageTraits: { tracing: { headers: { type: "object", properties: { traceId: { type: "string" } } } } },
    "x-message-maps": {
      orders: { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") },
      mixed: { gone: messageRef("gone"), orderPlaced: messageRef("orderPlaced") },
      empty: {},
      onlyNull: { orderPlaced: null },
      onlyDangling: { orderPlaced: messageRef("gone") },
      alias: mapRef("orders"),
      emptyAlias: mapRef("empty"),
      cycleA: mapRef("cycleB"),
      cycleB: mapRef("cycleA"),
      list: [messageRef("orderPlaced")],
      text: "orderPlaced",
      nothing: null,
      external: { $ref: "./shared/message-maps.yaml#/orders" },
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
    "x-message-lists": {
      two: [messageRef("orderPlaced"), messageRef("orderPlacedAvro")],
      empty: [],
      onlyNull: [null, "orderPlaced", 42, []],
      alias: listRef("two"),
      cycleA: listRef("cycleB"),
      cycleB: listRef("cycleA"),
    },
    "x-operations": {
      withMessage: { operationId: "receiveShared", message: messageRef("orderPlaced") },
      withoutMessage: { operationId: "receiveNothing", summary: "No message." },
      emptyMessage: { operationId: "receiveEmpty", message: { oneOf: [] } },
      nullItemMessage: { operationId: "receiveNull", message: { oneOf: [null] } },
      alias: operationTarget("withMessage"),
    },
    "x-channels": {
      complete,
      minimal,
      alias: channelTarget("complete"),
      aliasTwice: channelTarget("alias"),
      sparse: v3 ? { address: "orders.sparse", description: "Sparse.", messages: { orderPlaced: null } } : { description: "Sparse.", publish: { operationId: "publishSparse" } },
      sparseAlias: channelTarget("sparse"),
      empty: {},
      extensionsOnly: v3 ? { "x-messages": { orderPlaced: messageRef("orderPlaced") } } : { "x-publish": { message: messageRef("orderPlaced") } },
      lookAlikes: v3
        ? { message: messageRef("orderPlaced"), payload: { type: "object" }, publish: { message: messageRef("orderPlaced") }, subscribe: { message: messageRef("orderPlaced") } }
        : { messages: { orderPlaced: messageRef("orderPlaced") }, send: { message: messageRef("orderPlaced") }, receive: { message: messageRef("orderPlaced") } },
      caseKeys: v3 ? { Messages: { orderPlaced: messageRef("orderPlaced") }, MESSAGES: { orderPlaced: messageRef("orderPlaced") } } : { Publish: { message: messageRef("orderPlaced") }, SUBSCRIBE: { message: messageRef("orderPlaced") } },
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

const unusableEntryCases = () =>
  unusableObjectCases(messageRef, { text: "orderPlaced", item: messageRef("orderPlaced"), pointer: "orderPlaced" }, () => false).map(([name, value]) => [name, value, false]);

/**
 * Message values whose verdict is the same as a 3.x messages map entry, a 2.x operation message and a 2.x oneOf item.
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
 * @returns {Array} [description, value, hasMessage] cases for the value of a 3.x channel messages field
 */
const MESSAGES_VALUE_CASES = [
  ["a map with one message reference", { orderPlaced: messageRef("orderPlaced") }, true],
  ["a map with a JSON and an Avro message", { orderPlaced: messageRef("orderPlaced"), orderPlacedAvro: messageRef("orderPlacedAvro") }, true],
  ["a map with an inline multi-format message", { orderPlacedAvro: { payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: AVRO_SCHEMA } } }, true],
  ["a map with an x- key, which is a message name", { "x-orderPlaced": messageRef("orderPlaced") }, true],
  ["a map with a 2.x oneOf wrapper, which is an object in 3.x", { orderPlaced: { oneOf: [] } }, true],
  ["a map with a null message next to a usable one", { gone: null, orderPlaced: messageRef("orderPlaced") }, true],
  ["a map with a dangling message next to a usable one", { gone: messageRef("gone"), orderPlaced: messageRef("orderPlaced") }, true],
  ["a map with an external message next to unusable ones", { gone: messageRef("gone"), text: "orderPlaced", partner: { $ref: "./shared/messages.yaml#/partner" } }, true],
  ["a map with many messages of which only the last is usable", { a: null, b: "", c: [], d: messageRef("gone"), e: { $ref: "#" }, f: {} }, true],
  ["a reference to the components messages map", { $ref: "#/components/messages" }, true],
  ["a reference to a messages map", mapRef("orders"), true],
  ["a chained reference to a messages map", mapRef("alias"), true],
  ["a reference to a map with a dangling and a usable message", mapRef("mixed"), true],
  ["an external reference to a messages map", { $ref: "./shared/message-maps.yaml#/orders" }, true],
  ["a local alias of an external messages map", mapRef("external"), true],
  ["a pointer to the messages of another channel", { $ref: "#/components/x-channels/complete/messages" }, true],
  ["an empty map", {}, false],
  ["null", null, false],
  ["an empty list", [], false],
  ["a list of messages", [messageRef("orderPlaced")], false],
  ["a message name instead of a map", "orderPlaced", false],
  ["an empty string", "", false],
  ["zero", 0, false],
  ["a number", 42, false],
  ["true", true, false],
  ["false", false, false],
  ["a map whose only message is null", { orderPlaced: null }, false],
  ["a map whose messages are a string, a number, a boolean and a list", { a: "orderPlaced", b: 42, c: true, d: [messageRef("orderPlaced")] }, false],
  ["a map whose only message is a dangling reference", { orderPlaced: messageRef("gone") }, false],
  [
    "a map whose messages are cyclic, self, root, empty, unprefixed, malformed, non-string and null references",
    {
      a: messageRef("cycleA"),
      b: messageRef("self"),
      c: { $ref: "#" },
      d: { $ref: "" },
      e: { $ref: "#components/messages/orderPlaced" },
      f: messageRef("%E0%A4%A"),
      g: { $ref: 42 },
      h: { $ref: null },
    },
    false,
  ],
  ["a map whose only message is a chain that ends in null", { orderPlaced: messageRef("aliasToNull") }, false],
  ["a reference to an empty messages map", mapRef("empty"), false],
  ["a chained reference to an empty messages map", mapRef("emptyAlias"), false],
  ["a reference to a map whose only message is null", mapRef("onlyNull"), false],
  ["a reference to a map whose only message is dangling", mapRef("onlyDangling"), false],
  ["a reference with a populated sibling, which is ignored", { ...mapRef("empty"), orderPlaced: messageRef("orderPlaced") }, false],
  ["a dangling map reference", mapRef("missing"), false],
  ["a cyclic map reference", mapRef("cycleA"), false],
  ["a reference to a list", mapRef("list"), false],
  ["a reference to a string", mapRef("text"), false],
  ["a reference to null", mapRef("nothing"), false],
  ["a reference to the document root", { $ref: "#" }, false],
  ["an empty reference", { $ref: "" }, false],
  ["a non-string reference", { $ref: 42 }, false],
  ["a pointer to the empty messages map of another channel", { $ref: "#/components/x-channels/sparse/messages" }, false],
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
  const sparse = major === 3 ? [["components.x-channels.sparse.messages", "empty", "sparse"]] : [["components.x-channels.sparse", "missing", "sparse"]];
  const missing = (name) => [[`components.x-channels.${name}`, "missing", name]];
  return [
    ["a reference to a complete channel", channelTarget("complete"), []],
    ["a reference to a minimal channel", channelTarget("minimal"), []],
    ["a chained reference", channelTarget("alias"), []],
    ["a reference chained twice", channelTarget("aliasTwice"), []],
    ["a reference with siblings, which are ignored", { ...channelTarget("complete"), messages: {}, publish: null }, []],
    ["a reference to an empty channel with populated siblings, which are ignored", { ...channelTarget("empty"), ...minimal }, missing("empty")],
    ["a pointer into an array item", { $ref: "#/components/x-channels/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-channels/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-channels/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-channels/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/channels.yaml#/orderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/channels/order-placed.yaml" }, []],
    ["a local alias of an external channel", channelTarget("external"), []],
    ["a reference to a sparse channel", channelTarget("sparse"), sparse],
    ["a chained reference to a sparse channel", channelTarget("sparseAlias"), sparse],
    ["a reference to an empty channel", channelTarget("empty"), missing("empty")],
    ["a reference to a channel with only extensions", channelTarget("extensionsOnly"), missing("extensionsOnly")],
    ["a reference to a channel with only look-alike keys", channelTarget("lookAlikes"), missing("lookAlikes")],
    ["a reference to a channel whose keys differ in case", channelTarget("caseKeys"), missing("caseKeys")],
    [`a reference to a channel written for AsyncAPI ${major === 3 ? 2 : 3}`, channelTarget("otherVersion"), missing("otherVersion")],
    ["a reference to an object that is not a channel", { $ref: "#/info" }, [["info", "missing", "info"]]],
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
  const missing = [[AT, "missing", NAME]];
  const empty = [[`${AT}.messages`, "empty", NAME]];
  const fields = { address: "retail.cdc.orders.placed.v1", description: "Orders placed." };
  return [
    ["a complete inline channel", complete, []],
    ["a channel with only messages", minimal, []],
    [
      "a channel with every optional field",
      {
        ...minimal,
        address: "stores/{storeId}/orders",
        title: "Store orders",
        summary: "Orders of a store.",
        description: "Orders of a store.",
        servers: [{ $ref: "#/servers/production" }],
        parameters: { storeId: { description: "Store identifier.", enum: ["MAD001", "BCN002"], default: "MAD001", location: "$message.payload#/storeId" } },
        tags: [{ name: "orders" }],
        externalDocs: { url: "https://docs.example.io/orders" },
        bindings: { kafka: { topic: "retail.orders", partitions: 12, bindingVersion: "0.5.0" } },
        "x-owner": "orders",
      },
      [],
    ],
    ["a channel with a null address, which does not matter", { ...minimal, address: null }, []],
    ["a reply channel with a null address and a dynamic reply location elsewhere", { address: null, description: "Replies.", messages: { orderAccepted: messageRef("orderPlaced") } }, []],
    ["a channel whose only message is an inline multi-format Avro message", { messages: { orderPlacedAvro: { name: "orderPlacedAvro", payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: AVRO_SCHEMA } } } }, []],
    ["a channel whose only message is an empty object", { messages: { heartbeat: {} } }, []],
    ["a channel whose only message applies traits", { messages: { orderPlaced: { traits: [{ $ref: "#/components/messageTraits/tracing" }] } } }, []],
    ["an empty channel", {}, missing],
    ["a channel without messages", fields, missing],
    ["a channel whose messages are only in the operations", { ...fields, summary: "Operations list the messages." }, missing],
    ["a channel with a singular message key", { ...fields, message: messageRef("orderPlaced") }, missing],
    ["a channel with only a payload", { ...fields, payload: { type: "object" } }, missing],
    ["a channel written for AsyncAPI 2.x", { description: "Orders.", subscribe: { message: messageRef("orderPlaced") }, publish: { message: { oneOf: [messageRef("orderPlaced")] } } }, missing],
    ["a channel with AsyncAPI 3.x send and receive keys", { ...fields, send: { messages: [messageRef("orderPlaced")] }, receive: { messages: [messageRef("orderPlaced")] } }, missing],
    ["a channel whose messages key differs in case", { ...fields, Messages: { orderPlaced: messageRef("orderPlaced") }, MESSAGES: { orderPlaced: messageRef("orderPlaced") } }, missing],
    ["a channel whose messages are an extension", { ...fields, "x-messages": { orderPlaced: messageRef("orderPlaced") } }, missing],
    ["a channel whose message is only in the bindings", { ...fields, bindings: { kafka: { message: messageRef("orderPlaced") } } }, missing],
    ["a channel whose message is only in a tag or the external docs", { ...fields, tags: [{ name: "orderPlaced", messages: { orderPlaced: messageRef("orderPlaced") } }] }, missing],
    ["a channel with an empty messages map", { ...fields, messages: {} }, empty],
    ["a channel whose messages are all null", { ...fields, messages: { orderPlaced: null, orderCancelled: null } }, empty],
    ["a channel whose messages are all dangling", { ...fields, messages: { orderPlaced: messageRef("orderPlacedV2"), orderCancelled: messageRef("orderCancelled") } }, empty],
    ["a channel whose messages map is a dangling reference", { ...fields, messages: mapRef("missing") }, empty],
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
  const DESCRIPTION = { description: "Orders placed." };
  const missing = [[AT, "missing", NAME]];
  const emptyAt = (operation, path = `${AT}.${operation}.message`) => [path, "emptyMessage", NAME, operation];
  return [
    ["a complete inline channel", complete, []],
    ["a channel with only a subscribe message", minimal, []],
    ["a channel with only a publish message", { publish: { message: messageRef("orderPlaced") } }, []],
    ["a channel without description, which does not matter", { subscribe: { operationId: "receiveOrder", message: messageRef("orderPlaced") } }, []],
    [
      "a channel with every optional field",
      {
        ...minimal,
        ...DESCRIPTION,
        servers: ["production"],
        parameters: { storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" }, location: "$message.payload#/storeId" } },
        bindings: { kafka: { bindingVersion: "0.4.0" } },
        deprecated: false,
        "x-owner": "orders",
      },
      [],
    ],
    ["a channel whose message is an Avro message with schemaFormat", { subscribe: { message: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: AVRO_SCHEMA } } }, []],
    ["a channel whose message only applies traits", { subscribe: { message: { traits: [{ $ref: "#/components/messageTraits/tracing" }] } } }, []],
    ["an empty channel", {}, missing],
    ["a channel without operations", { ...DESCRIPTION, parameters: { storeId: { schema: { type: "string" } } } }, missing],
    ["a channel whose publish has no message", { ...DESCRIPTION, publish: { operationId: "publishOrder", summary: "Publish.", traits: [{ $ref: "#/components/operationTraits/kafka" }], bindings: { kafka: { clientId: "orders" } } } }, missing],
    ["a channel whose operations are empty objects", { ...DESCRIPTION, publish: {}, subscribe: {} }, missing],
    ["a channel whose operations are null", { ...DESCRIPTION, publish: null, subscribe: null }, missing],
    ["a channel whose operations are not objects", { ...DESCRIPTION, publish: "orderPlaced", subscribe: [{ message: messageRef("orderPlaced") }] }, missing],
    ["a channel whose message is only in an operation trait", { ...DESCRIPTION, subscribe: { traits: [{ message: messageRef("orderPlaced") }] } }, missing],
    ["a channel whose message is only in the bindings", { ...DESCRIPTION, bindings: { kafka: { message: messageRef("orderPlaced") } } }, missing],
    ["a channel with an AsyncAPI 3.x messages map", { ...DESCRIPTION, messages: { orderPlaced: messageRef("orderPlaced") } }, missing],
    ["a channel with AsyncAPI 3.x send and receive keys", { ...DESCRIPTION, send: { message: messageRef("orderPlaced") }, receive: { message: messageRef("orderPlaced") } }, missing],
    ["a channel whose operation keys differ in case", { ...DESCRIPTION, Publish: { message: messageRef("orderPlaced") }, SUBSCRIBE: { message: messageRef("orderPlaced") } }, missing],
    ["a channel whose operations are extensions", { ...DESCRIPTION, "x-publish": { message: messageRef("orderPlaced") } }, missing],
    ["a channel whose operation declares messages instead of message", { ...DESCRIPTION, subscribe: { messages: [messageRef("orderPlaced")] } }, missing],
    ["a channel with an empty publish message", { ...DESCRIPTION, publish: { message: { oneOf: [] } } }, [emptyAt("publish")]],
    ["a channel whose only oneOf item is null", { ...DESCRIPTION, subscribe: { message: { oneOf: [null] } } }, [emptyAt("subscribe")]],
    ["a channel whose only message is dangling", { ...DESCRIPTION, subscribe: { message: messageRef("orderPlacedV2") } }, [emptyAt("subscribe")]],
    ["a channel with both messages unusable", { ...DESCRIPTION, publish: { message: null }, subscribe: { message: { oneOf: [messageRef("gone")] } } }, [emptyAt("publish"), emptyAt("subscribe")]],
    ["an unusable publish message next to a usable subscribe message", { ...DESCRIPTION, publish: { message: { oneOf: [null] } }, subscribe: { message: messageRef("orderPlaced") } }, []],
    ["a usable publish message next to an unusable subscribe message", { ...DESCRIPTION, publish: { message: { oneOf: [messageRef("orderPlaced")] } }, subscribe: { message: "" } }, []],
    ["an unusable publish message next to a subscribe without message", { ...DESCRIPTION, publish: { message: "orderPlaced" }, subscribe: { operationId: "receiveOrder" } }, [emptyAt("publish")]],
    ["an operation given as a reference to an operation with a message", { ...DESCRIPTION, subscribe: operationTarget("withMessage") }, []],
    ["an operation given as a chained reference", { ...DESCRIPTION, subscribe: operationTarget("alias") }, []],
    ["an operation given as an external reference", { ...DESCRIPTION, subscribe: { $ref: "./shared/operations.yaml#/receiveOrder" } }, []],
    ["an operation given as a reference to an operation without message", { ...DESCRIPTION, subscribe: operationTarget("withoutMessage") }, missing],
    ["an operation given as a dangling reference", { ...DESCRIPTION, subscribe: operationTarget("missing") }, missing],
    ["an operation given as a reference to an operation with an empty message", { ...DESCRIPTION, publish: operationTarget("emptyMessage") }, [emptyAt("publish", "components.x-operations.emptyMessage.message")]],
    [
      "both operations given as references to operations without a usable message",
      { ...DESCRIPTION, publish: operationTarget("emptyMessage"), subscribe: operationTarget("nullItemMessage") },
      [emptyAt("publish", "components.x-operations.emptyMessage.message"), emptyAt("subscribe", "components.x-operations.nullItemMessage.message")],
    ],
    ...sharedReferenceCases(2),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a field option like the rule table", { field: "messages" }],
  ["a field option with another field", { field: "description" }],
  ["a truthy function option", { function: "truthy", field: "messages" }],
  ["a minimum of two messages", { "min-messages": 2, minMessages: "2" }],
  ["a minimum of zero messages", { "min-messages": 0, minItems: 0 }],
  ["a maximum of one message", { "max-messages": 1, maxItems: 1 }],
  ["an allow-empty flag", { "allow-empty": true, allowEmpty: "true" }],
  ["a properties list", { properties: ["messages"] }],
  ["a properties list with other fields", { properties: ["address", "description", "title"] }],
  ["fields-to-apply with other fields", { "fields-to-apply": "address,description" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a required list", { required: ["title"] }],
  ["a pattern", { pattern: "^x-" }],
  ["valid-versions", { "valid-versions": "2.8.0" }],
  ["null values", { field: null, "min-messages": null, properties: null }],
  ["non-string values", { field: 42, "min-messages": true, properties: "messages" }],
];

module.exports = {
  NAMES,
  atOf,
  shown,
  messagesFor,
  findingsFor,
  channelTarget,
  operationTarget,
  messageRef,
  mapRef,
  wrapperRef,
  listRef,
  AVRO_SCHEMA,
  shapesFor,
  channelComponentsFor,
  ENTRY_VALUE_CASES,
  MESSAGES_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  channelObjectCasesV2,
  channelObjectCasesV3,
  IGNORED_OPTIONS,
};
