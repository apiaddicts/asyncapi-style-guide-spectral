const { findingsFrom, unusableObjectCases } = require("../required-fields");

const NAMES = { 2: "retail.cdc.orders.placed.v1", 3: "orderPlaced" };
const atOf = (major) => `channels.${NAMES[major]}`;

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const MSG = {
  missing: (channel) => `AAR088: Channel '${shown(channel)}' must declare 'servers'.`,
  noServer: (channel) => `AAR088: The 'servers' of channel '${shown(channel)}' must list at least one server defined in the root 'servers' object.`,
  unusable: (channel) => `AAR088: Channel '${shown(channel)}' must be an object declaring 'servers'.`,
};

const findings = findingsFrom(MSG);

const escapePointer = (name) => name.replace(/~/g, "~0").replace(/\//g, "~1");
const serverRef = (name) => ({ $ref: `#/servers/${escapePointer(name)}` });

/**
 * @param {number} major - The AsyncAPI major version under test (2 or 3)
 * @returns {Function} Builds the entry a channel servers list uses for a server name: the name itself (2.x) or a $ref to #/servers/<name> (3.x)
 */
const entryFor = (major) => (name) => (major === 3 ? serverRef(name) : name);

const channelTarget = (name) => ({ $ref: `#/components/x-channels/${name}` });
const messageRef = (name) => ({ $ref: `#/components/messages/${name}` });

const serverFor = (major) => (host, protocol, extra = {}) => (major === 3 ? { host, protocol, ...extra } : { url: host, protocol, ...extra });

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} The root servers map shared by the unit tests: plain servers, an x- name, names with a slash, a tilde, spaces and accents, and entries defined through a reference, a dangling reference and null
 */
const rootServersFor = (major) => {
  const server = serverFor(major);
  return {
    production: server("kafka.quality.es:9093", "kafka-secure", { protocolVersion: "3.3.0" }),
    staging: server("kafka-staging.quality.es:9093", "kafka-secure", { protocolVersion: "3.3.0" }),
    "x-edge": server("edge.quality.es:8883", "secure-mqtt", { protocolVersion: "5.0" }),
    "eu/west~dr": server("dr-eu-west.quality.es:9093", "kafka-secure"),
    "sala de m\u00e1quinas": server("planta.quality.es:5671", "amqps", { protocolVersion: "0.9.1" }),
    shared: { $ref: "#/components/servers/backup" },
    broken: { $ref: "#/components/servers/retired" },
    retired: null,
  };
};

const shapesFor = (major) => {
  const entry = entryFor(major);
  if (major === 3) {
    const complete = {
      address: "retail.cdc.orders.placed.v1",
      description: "Orders placed in any sales channel.",
      servers: [entry("production"), entry("staging")],
      messages: { orderPlaced: messageRef("orderPlaced") },
    };
    const minimal = { address: "orders.placed", servers: [entry("production")] };
    const bare = { address: "orders.placed", description: "Orders placed.", messages: { orderPlaced: messageRef("orderPlaced") } };
    return { complete, minimal, bare };
  }
  const complete = {
    description: "Orders placed in any sales channel.",
    servers: [entry("production"), entry("staging")],
    subscribe: { operationId: "receiveOrderPlaced", message: messageRef("orderPlaced") },
    publish: { operationId: "publishOrderPlaced", message: messageRef("orderPlaced") },
  };
  const minimal = { servers: [entry("production")] };
  const bare = { description: "Orders placed.", subscribe: { message: messageRef("orderPlaced") } };
  return { complete, minimal, bare };
};

const INLINE_SERVER = { url: "kafka.quality.es:9093", host: "kafka.quality.es:9093", protocol: "kafka-secure" };

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {object} components entries: messages, servers outside the root map and the x- reference targets for names, server references, lists and channels
 */
const channelComponentsFor = (major) => {
  const { complete, minimal, bare } = shapesFor(major);
  const entry = entryFor(major);
  const server = serverFor(major);
  const otherEntry = major === 3 ? (name) => name : serverRef;
  return {
    servers: { backup: server("kafka-backup.quality.es:9093", "kafka-secure"), production: server("kafka.quality.es:9093", "kafka-secure") },
    messages: { orderPlaced: { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" }, couponCode: { type: ["string", "null"] } } } } },
    "x-server-names": {
      production: "production",
      staging: "staging",
      ghost: "ghost",
      alias: { $ref: "#/components/x-server-names/production" },
      cycleA: { $ref: "#/components/x-server-names/cycleB" },
      cycleB: { $ref: "#/components/x-server-names/cycleA" },
    },
    "x-server-refs": {
      production: serverRef("production"),
      alias: { $ref: "#/components/x-server-refs/production" },
      ghost: serverRef("ghost"),
      component: { $ref: "#/components/servers/backup" },
      external: { $ref: "./shared/servers.yaml#/production" },
      cycleA: { $ref: "#/components/x-server-refs/cycleB" },
      cycleB: { $ref: "#/components/x-server-refs/cycleA" },
    },
    "x-server-lists": {
      eu: [entry("production"), entry("staging")],
      alias: { $ref: "#/components/x-server-lists/eu" },
      empty: [],
      ghosts: [entry("ghost"), entry("backup")],
      otherVersion: [otherEntry("production")],
      cycleA: { $ref: "#/components/x-server-lists/cycleB" },
      cycleB: { $ref: "#/components/x-server-lists/cycleA" },
    },
    "x-channels": {
      complete,
      minimal,
      bare,
      alias: channelTarget("complete"),
      aliasTwice: channelTarget("alias"),
      bareAlias: channelTarget("bare"),
      emptyServers: { ...bare, servers: [] },
      ghostServers: { ...bare, servers: [entry("ghost")] },
      otherVersion: { ...bare, servers: [otherEntry("production")] },
      extensionsOnly: { ...bare, "x-servers": [entry("production")] },
      caseKeys: { ...bare, Servers: [entry("production")], SERVERS: [entry("production")] },
      empty: {},
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

const COMMON_VALUE_CASES = [
  ["an empty list", [], false],
  ["null", null, false],
  ["an empty string", "", false],
  ["a blank string", " \t ", false],
  ["an empty object", {}, false],
  ["zero", 0, false],
  ["a number", 42, false],
  ["true", true, false],
  ["false", false, false],
  ["a list of nulls", [null, null], false],
  ["a list of empty objects", [{}, {}], false],
  ["a list of empty lists", [[], []], false],
  ["a list of numbers", [0, 1, 2], false],
  ["a list of booleans", [true, false], false],
  ["a list with an inline server object", [INLINE_SERVER], false],
  ["a list given as a reference to a list with root servers", { $ref: "#/components/x-server-lists/eu" }, true],
  ["a list given as a chained reference", { $ref: "#/components/x-server-lists/alias" }, true],
  ["a list given as a reference with siblings, which are ignored", { $ref: "#/components/x-server-lists/eu", servers: [] }, true],
  ["a list given as an external reference", { $ref: "./shared/servers.yaml#/eu" }, true],
  ["a list given as an external whole-file reference", { $ref: "https://specs.example.io/servers/eu.yaml" }, true],
  ["a list given as a reference to an empty list", { $ref: "#/components/x-server-lists/empty" }, false],
  ["a list given as a reference to a list without root servers", { $ref: "#/components/x-server-lists/ghosts" }, false],
  ["a list given as a reference to a list written for the other version", { $ref: "#/components/x-server-lists/otherVersion" }, false],
  ["a list given as a dangling reference", { $ref: "#/components/x-server-lists/missing" }, false],
  ["a list given as a cyclic reference", { $ref: "#/components/x-server-lists/cycleA" }, false],
  ["a list given as a reference to the document root", { $ref: "#" }, false],
  ["a list given as an empty reference", { $ref: "" }, false],
  ["a list given as a reference to the root servers map", { $ref: "#/servers" }, false],
  ["a list given as a pointer without a leading slash", { $ref: "#components/x-server-lists/eu" }, false],
  ["a list given as a malformed percent-encoded pointer", { $ref: "#/components/x-server-lists/%E0%A4%A" }, false],
  ["a list given as a non-string reference", { $ref: 42 }, false],
  ["a list given as a null reference", { $ref: null }, false],
];

const NAME_VALUE_CASES = [
  ["the name of a root server", ["production"], true],
  ["the names of several root servers", ["production", "staging", "x-edge"], true],
  ["a root server after an unknown name", ["ghost", "production"], true],
  ["a root server after null, numbers, objects and server references", [null, 42, {}, serverRef("production"), "production"], true],
  ["a root server whose name starts with x-", ["x-edge"], true],
  ["a root server whose name has a slash and a tilde", ["eu/west~dr"], true],
  ["a root server whose name has spaces and accents", ["sala de m\u00e1quinas"], true],
  ["a root server defined through a reference", ["shared"], true],
  ["a root server whose definition is a dangling reference", ["broken"], true],
  ["a root server whose definition is null", ["retired"], true],
  ["a duplicated root server", ["production", "production"], true],
  ["a name given as a local reference", [{ $ref: "#/components/x-server-names/production" }], true],
  ["a name given as a chained reference", [{ $ref: "#/components/x-server-names/alias" }], true],
  ["a name given as an external reference", [{ $ref: "./shared/servers.yaml#/productionName" }], true],
  ["an unknown name", ["ghost"], false],
  ["the name of a components server", ["backup"], false],
  ["names that differ in case", ["Production", "PRODUCTION"], false],
  ["names with surrounding spaces", [" production", "production "], false],
  ["a name with a zero-width character", ["production\u200b"], false],
  ["an escaped pointer token instead of the name", ["eu~1west~0dr"], false],
  ["an empty name", [""], false],
  ["the server url", ["kafka.quality.es:9093"], false],
  ["the server name instead of a list", "production", false],
  ["a map keyed by server name", { production: {} }, false],
  ["AsyncAPI 3.x server references", [serverRef("production"), serverRef("staging")], false],
  ["a nested list", [["production"]], false],
  ["a name given as a reference to an unknown name", [{ $ref: "#/components/x-server-names/ghost" }], false],
  ["a name given as a dangling reference", [{ $ref: "#/components/x-server-names/missing" }], false],
  ["a name given as a cyclic reference", [{ $ref: "#/components/x-server-names/cycleA" }], false],
  ...COMMON_VALUE_CASES,
];

const REFERENCE_VALUE_CASES = [
  ["a reference to a root server", [serverRef("production")], true],
  ["references to several root servers", [serverRef("production"), serverRef("staging"), serverRef("x-edge")], true],
  ["a root server after a dangling reference", [serverRef("ghost"), serverRef("production")], true],
  ["a root server after names, nulls, inline servers and components servers", ["production", null, INLINE_SERVER, { $ref: "#/components/servers/production" }, serverRef("production")], true],
  ["a reference to a root server whose name starts with x-", [serverRef("x-edge")], true],
  ["an escaped pointer", [{ $ref: "#/servers/eu~1west~0dr" }], true],
  ["a percent-encoded pointer", [{ $ref: "#/servers/sala%20de%20m%C3%A1quinas" }], true],
  ["a reference to a root server defined through a reference", [serverRef("shared")], true],
  ["a reference to a root server whose definition is a dangling reference", [serverRef("broken")], true],
  ["a reference to a root server whose definition is null", [serverRef("retired")], true],
  ["a duplicated reference", [serverRef("production"), serverRef("production")], true],
  ["a reference with siblings, which are ignored", [{ $ref: "#/servers/production", description: "Ignored.", host: "" }], true],
  ["a chained reference that reaches a root server", [{ $ref: "#/components/x-server-refs/production" }], true],
  ["a reference chained twice", [{ $ref: "#/components/x-server-refs/alias" }], true],
  ["an external reference", [{ $ref: "./shared/servers.yaml#/production" }], true],
  ["an external whole-file reference", [{ $ref: "https://specs.example.io/servers/production.yaml" }], true],
  ["a local alias of an external reference", [{ $ref: "#/components/x-server-refs/external" }], true],
  ["a dangling reference", [serverRef("ghost")], false],
  ["a reference to a components server", [{ $ref: "#/components/servers/backup" }], false],
  ["a reference to a components server named like a root server", [{ $ref: "#/components/servers/production" }], false],
  ["a chained reference that ends in a components server", [{ $ref: "#/components/x-server-refs/component" }], false],
  ["a chained reference that ends in a dangling reference", [{ $ref: "#/components/x-server-refs/ghost" }], false],
  ["a cyclic reference", [{ $ref: "#/components/x-server-refs/cycleA" }], false],
  ["a reference that differs in case", [{ $ref: "#/servers/Production" }], false],
  ["an unescaped pointer to a name with a slash", [{ $ref: "#/servers/eu/west~dr" }], false],
  ["a reference to the root servers map", [{ $ref: "#/servers" }], false],
  ["a pointer into a root server", [{ $ref: "#/servers/production/protocol" }], false],
  ["a pointer with a trailing slash", [{ $ref: "#/servers/production/" }], false],
  ["a reference to the document root", [{ $ref: "#" }], false],
  ["an empty reference", [{ $ref: "" }], false],
  ["a pointer without a leading slash", [{ $ref: "#servers/production" }], false],
  ["a malformed percent-encoded pointer", [{ $ref: "#/servers/%E0%A4%A" }], false],
  ["a non-string reference", [{ $ref: 42 }], false],
  ["a null reference", [{ $ref: null }], false],
  ["AsyncAPI 2.x server names", ["production", "staging"], false],
  ["a single reference instead of a list", serverRef("production"), false],
  ["a map keyed by server name", { production: serverRef("production") }, false],
  ["a nested list", [[serverRef("production")]], false],
  ...COMMON_VALUE_CASES,
];

/**
 * @param {number} major - The AsyncAPI major version under test
 * @returns {Array} [description, servers value, associated] cases for the servers field of a channel
 */
const serversValueCasesFor = (major) => (major === 3 ? REFERENCE_VALUE_CASES : NAME_VALUE_CASES);

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
    ["a reference with servers siblings, which are ignored", { ...channelTarget("complete"), servers: [] }, []],
    ["a reference to a channel without servers, whose servers siblings are ignored", { ...channelTarget("bare"), servers: [entryFor(major)("production")] }, [["components.x-channels.bare", "missing", "bare"]]],
    ["a pointer into an array item", { $ref: "#/components/x-channels/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-channels/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-channels/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-channels/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/channels.yaml#/orderPlaced" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/channels/order-placed.yaml" }, []],
    ["a local alias of an external channel", channelTarget("external"), []],
    ["a reference to a channel without servers", channelTarget("bare"), [["components.x-channels.bare", "missing", "bare"]]],
    ["a chained reference to a channel without servers", channelTarget("bareAlias"), [["components.x-channels.bare", "missing", "bare"]]],
    ["a reference to a channel with an empty servers list", channelTarget("emptyServers"), [["components.x-channels.emptyServers.servers", "noServer", "emptyServers"]]],
    ["a reference to a channel listing only unknown servers", channelTarget("ghostServers"), [["components.x-channels.ghostServers.servers", "noServer", "ghostServers"]]],
    [`a reference to a channel listing servers the AsyncAPI ${major === 3 ? 2 : 3} way`, channelTarget("otherVersion"), [["components.x-channels.otherVersion.servers", "noServer", "otherVersion"]]],
    ["a reference to a channel with only x-servers", channelTarget("extensionsOnly"), [["components.x-channels.extensionsOnly", "missing", "extensionsOnly"]]],
    ["a reference to a channel whose servers key differs in case", channelTarget("caseKeys"), [["components.x-channels.caseKeys", "missing", "caseKeys"]]],
    ["a reference to an empty channel", channelTarget("empty"), [["components.x-channels.empty", "missing", "empty"]]],
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
    ["a pointer through a chained channel", { $ref: "#/components/x-channels/alias/servers" }, [[AT, "unusable", NAME]]],
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
  const entry = entryFor(major);
  const { complete, minimal, bare } = shapesFor(major);
  const missing = [[AT, "missing", NAME]];
  const noServer = [[`${AT}.servers`, "noServer", NAME]];
  const v3 = major === 3;
  return [
    ["a complete inline channel", complete, []],
    ["a channel with only servers", minimal, []],
    [
      "a channel with every optional field",
      v3
        ? {
            ...complete,
            title: "Orders placed",
            summary: "Orders placed.",
            parameters: { storeId: { description: "Store identifier.", enum: ["MAD001", "BCN002"], default: "MAD001", location: "$message.payload#/storeId" } },
            tags: [{ name: "orders" }],
            externalDocs: { url: "https://docs.example.io/orders" },
            bindings: { kafka: { topic: "retail.orders", partitions: 12, bindingVersion: "0.5.0" } },
            "x-owner": "orders",
          }
        : {
            ...complete,
            parameters: { storeId: { description: "Store identifier.", schema: { type: "string", pattern: "^[A-Z]{3}[0-9]{3}$" }, location: "$message.payload#/storeId" } },
            bindings: { kafka: { bindingVersion: "0.4.0" } },
            deprecated: false,
            "x-owner": "orders",
          },
      [],
    ],
    ["an empty channel", {}, missing],
    ["a channel without servers", bare, missing],
    ["a channel whose servers are only an extension", { ...bare, "x-servers": [entry("production")] }, missing],
    ["a channel whose servers key differs in case", { ...bare, Servers: [entry("production")], SERVERS: [entry("production")] }, missing],
    ["a channel with a singular server key", { ...bare, server: entry("production") }, missing],
    ["a channel whose servers are only in the bindings", { ...bare, bindings: { kafka: { servers: [entry("production")], bindingVersion: "0.5.0" } } }, missing],
    ["a channel whose servers are only in its parameters", { ...bare, parameters: { region: { description: "Region.", servers: [entry("production")] } } }, missing],
    ...(v3
      ? [
          ["a channel whose servers are only in its messages", { ...bare, messages: { orderPlaced: { name: "orderPlaced", servers: [entry("production")] } } }, missing],
          ["a reply channel with a null address and no servers", { address: null, description: "Replies.", messages: { orderAccepted: messageRef("orderPlaced") } }, missing],
          ["a reply channel with a null address and servers", { address: null, description: "Replies.", servers: [entry("staging")] }, []],
          ["a channel written for AsyncAPI 2.x, with names", { description: "Orders.", servers: ["production"], subscribe: { message: messageRef("orderPlaced") } }, noServer],
        ]
      : [
          ["a channel whose servers are only in its operations", { description: "Orders.", subscribe: { servers: ["production"], message: messageRef("orderPlaced") }, publish: { servers: ["staging"] } }, missing],
          ["a channel whose servers are only in an operation trait", { description: "Orders.", subscribe: { traits: [{ servers: ["production"] }], message: messageRef("orderPlaced") } }, missing],
          ["a channel written for AsyncAPI 3.x, with server references", { address: "orders.placed", servers: [serverRef("production")], messages: { orderPlaced: messageRef("orderPlaced") } }, noServer],
        ]),
    ["a channel with an empty servers list and a singular server key", { ...bare, servers: [], server: entry("production") }, noServer],
    ["a channel with an empty servers list and x-servers", { ...bare, servers: [], "x-servers": [entry("production")] }, noServer],
    ["a channel listing only unknown servers", { ...bare, servers: [entry("ghost"), entry("legacy")] }, noServer],
    ["a channel listing a components server", { ...bare, servers: [entry("backup")] }, noServer],
    ...sharedReferenceCases(major),
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a field option like the rule table", { field: "servers" }],
  ["a field option naming another field", { field: "description" }],
  ["a properties list", { properties: ["servers"] }],
  ["a properties list with other fields", { properties: ["address", "bindings"] }],
  ["fields-to-apply with servers", { "fields-to-apply": "servers" }],
  ["fields-to-apply with other fields", { "fields-to-apply": "title,summary" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["an allowed-servers list", { "allowed-servers": "ghost,backup" }],
  ["allowed-server-types", { "allowed-server-types": "eventstreams" }],
  ["a minimum number of servers", { min: 3, minItems: 3, "min-servers": 3 }],
  ["a flag accepting channels without servers", { "allow-missing": true, required: false }],
  ["a flag accepting components servers", { "allow-components-servers": true, "root-only": false }],
  ["a pattern", { pattern: "^ghost$" }],
  ["valid-versions", { "valid-versions": "2.0.0" }],
  ["null values", { field: null, properties: null, "fields-to-apply": null }],
  ["non-string values", { field: 42, properties: true, "allowed-servers": ["ghost"] }],
];

module.exports = {
  NAMES,
  atOf,
  shown,
  MSG,
  findings,
  serverRef,
  entryFor,
  channelTarget,
  messageRef,
  rootServersFor,
  shapesFor,
  channelComponentsFor,
  serversValueCasesFor,
  channelObjectCasesFor,
  IGNORED_OPTIONS,
};
