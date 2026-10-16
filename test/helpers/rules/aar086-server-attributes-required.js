const { INFO_COMPONENTS, INFO_VALUE_CASES, findingsFrom, unusableObjectCases } = require("../required-fields");

const FIELDS_V2 = ["url", "protocol", "protocolVersion"];
const FIELDS_V3 = ["host", "protocol", "protocolVersion"];
const NAME = "ordersKafka";
const AT = `servers.${NAME}`;

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const listOf = (fields) => `'${fields[0]}', '${fields[1]}' and '${fields[2]}'`;

/**
 * @param {string[]} fields - The mandatory fields of the AsyncAPI version under test (FIELDS_V2 or FIELDS_V3)
 * @returns {object} Expected message builders keyed by finding kind
 */
const messagesFor = (fields) => ({
  missing: (server, field) => `AAR086: Server '${shown(server)}' must declare '${field}'.`,
  empty: (server, field) => `AAR086: The '${field}' of server '${shown(server)}' must not be empty.`,
  unusable: (server) => `AAR086: Server '${shown(server)}' must be an object declaring ${listOf(fields)}.`,
});

const findingsFor = (fields) => findingsFrom(messagesFor(fields));

const serverTarget = (name) => ({ $ref: `#/components/x-servers/${name}` });

const shapesFor = (fields) => {
  const [address] = fields;
  const other = address === "url" ? "host" : "url";
  const complete = { [address]: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", description: "Orders cluster." };
  const minimal = { [address]: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0" };
  return { address, other, complete, minimal };
};

/**
 * @param {string[]} fields - The mandatory fields of the AsyncAPI version under test
 * @returns {object} components entries: the shared texts of the required-field rules plus x-servers reference targets
 */
const serverComponentsFor = (fields) => {
  const { address, other, complete, minimal } = shapesFor(fields);
  return {
    ...INFO_COMPONENTS,
    "x-servers": {
      complete,
      minimal,
      alias: serverTarget("complete"),
      aliasTwice: serverTarget("alias"),
      sparse: { [address]: "kafka-sparse.quality.es:9092", protocolVersion: " \t ", "x-protocol": "kafka" },
      sparseAlias: serverTarget("sparse"),
      empty: {},
      extensionsOnly: { [`x-${address}`]: "kafka.quality.es", "x-protocol": "kafka", "x-protocolVersion": "3.3.0" },
      lookAlikes: { hostname: "kafka.quality.es", uri: "kafka://kafka.quality.es", scheme: "kafka", version: "3.3.0", protocol_version: "3.3.0" },
      caseKeys: { [address.toUpperCase()]: "kafka.quality.es", Protocol: "kafka", ProtocolVersion: "3.3.0", protocolversion: "3.3.0" },
      otherVersion: { [other]: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0" },
      cycleA: serverTarget("cycleB"),
      cycleB: serverTarget("cycleA"),
      self: serverTarget("self"),
      list: [complete],
      text: "kafka://kafka.quality.es:9092",
      nothing: null,
      external: { $ref: "./shared/servers.yaml#/kafka" },
      "a/b": complete,
      "with space": minimal,
      "espa\u00f1a": complete,
    },
  };
};

const SERVER_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["a host with port", "kafka.quality.es:9093", true],
  ["a host with a variable", "{cluster}.quality.es:{port}", true],
  ["a broker list", "kafka-1.quality.es:9093,kafka-2.quality.es:9093", true],
  ["a URL with scheme", "kafka://kafka.quality.es:9093", true],
  ["localhost", "localhost", true],
  ["a single slash", "/", true],
  ["a protocol name", "kafka-secure", true],
  ["a version", "3.3.0", true],
  ["a port number", 9093, true],
  ["a decimal version", 3.3, true],
  ["a pointer to a field of another server", { $ref: "#/components/x-servers/complete/protocol" }, true],
  ["a pointer through a chained server, which Spectral cannot resolve either", { $ref: "#/components/x-servers/alias/protocol" }, false],
  ["a pointer to an empty field of another server", { $ref: "#/components/x-servers/sparse/protocolVersion" }, false],
];

const REFERENCE_LANDING = {
  "#/components/x-servers/cycleA": ["components.x-servers.cycleB", "cycleB"],
  "#/components/x-servers/list": ["components.x-servers.list", "list"],
  "#/components/x-servers/text": ["components.x-servers.text", "text"],
  "#/components/x-servers/nothing": ["components.x-servers.nothing", "nothing"],
};

const combinations = (items) => items.flatMap((_, index) => items.slice(index + 1).map((other) => [items[index], other]));

/**
 * @param {string[]} fields - The mandatory fields of the AsyncAPI version under test
 * @returns {Array} [description, server, expected] cases for a server written at servers.ordersKafka
 */
const serverObjectCasesFor = (fields) => {
  const { address, other, complete, minimal } = shapesFor(fields);
  const allMissing = (path, name) => fields.map((field) => [path, "missing", name, field]);
  const without = (...dropped) => Object.fromEntries(Object.entries(minimal).filter(([key]) => !dropped.includes(key)));
  return [
    ["a complete inline server", complete, []],
    ["a server with only the three fields", minimal, []],
    [
      "a server with every optional field",
      {
        ...minimal,
        description: "Orders cluster.",
        variables: { port: { enum: ["9092", "9093"], default: "9093" } },
        security: [{ saslScram: [] }],
        bindings: { kafka: { schemaRegistryUrl: "https://registry.quality.es", bindingVersion: "0.5.0" } },
        tags: [{ name: "kafka" }],
        "x-owner": "orders",
      },
      [],
    ],
    ["a server with both url and host", { ...minimal, [other]: "kafka.quality.es" }, []],
    ["an empty server", {}, allMissing(AT, NAME)],
    ...fields.map((field) => [`a server without ${field}`, without(field), [[AT, "missing", NAME, field]]]),
    ...combinations(fields).map(([a, b]) => [`a server without ${a} and ${b}`, without(a, b), [[AT, "missing", NAME, a], [AT, "missing", NAME, b]]]),
    [`a server with ${other} instead of ${address}`, { [other]: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0" }, [[AT, "missing", NAME, address]]],
    ["a server with only extensions", { [`x-${address}`]: "kafka.quality.es", "x-protocol": "kafka", "x-protocolVersion": "3.3.0" }, allMissing(AT, NAME)],
    [
      "a server with look-alike keys",
      { hostname: "kafka.quality.es", uri: "kafka://kafka.quality.es", endpoint: "kafka.quality.es", scheme: "kafka", transport: "kafka", version: "3.3.0", protocol_version: "3.3.0", "protocol-version": "3.3.0" },
      allMissing(AT, NAME),
    ],
    ["a server whose keys differ in case", { [address.toUpperCase()]: "kafka.quality.es", Protocol: "kafka", PROTOCOL: "kafka", ProtocolVersion: "3.3.0", protocolversion: "3.3.0" }, allMissing(AT, NAME)],
    ["a protocolVersion only inside the bindings", { ...without("protocolVersion"), bindings: { kafka: { protocolVersion: "3.3.0", bindingVersion: "0.5.0" } } }, [[AT, "missing", NAME, "protocolVersion"]]],
    ["a protocolVersion only as a server variable", { ...without("protocolVersion"), variables: { protocolVersion: { enum: ["3.3.0"], default: "3.3.0" } } }, [[AT, "missing", NAME, "protocolVersion"]]],
    ["a server with the three fields blank", { [address]: " ", protocol: "", protocolVersion: null }, fields.map((field) => [`${AT}.${field}`, "empty", NAME, field])],
    ["a server with blank fields and populated look-alikes", { [address]: "\t", protocol: [], protocolVersion: {}, hostname: "kafka.quality.es", version: "3.3.0" }, fields.map((field) => [`${AT}.${field}`, "empty", NAME, field])],
    ["a reference to a complete server", serverTarget("complete"), []],
    ["a reference to a server with only the three fields", serverTarget("minimal"), []],
    ["a chained reference", serverTarget("alias"), []],
    ["a reference chained twice", serverTarget("aliasTwice"), []],
    ["a reference with siblings, which are ignored", { ...serverTarget("complete"), protocol: "", protocolVersion: null }, []],
    ["a reference to an empty server with populated siblings, which are ignored", { ...serverTarget("empty"), ...minimal }, allMissing("components.x-servers.empty", "empty")],
    ["a pointer into an array item", { $ref: "#/components/x-servers/list/0" }, []],
    ["an escaped pointer", { $ref: "#/components/x-servers/a~1b" }, []],
    ["a percent-encoded pointer", { $ref: "#/components/x-servers/with%20space" }, []],
    ["a UTF-8 percent-encoded pointer", { $ref: "#/components/x-servers/espa%C3%B1a" }, []],
    ["an external reference", { $ref: "./shared/servers.yaml#/kafka" }, []],
    ["an external whole-file reference", { $ref: "https://specs.example.io/servers/kafka.yaml" }, []],
    ["a local alias of an external server", serverTarget("external"), []],
    [
      "a reference to a sparse server",
      serverTarget("sparse"),
      [["components.x-servers.sparse", "missing", "sparse", "protocol"], ["components.x-servers.sparse.protocolVersion", "empty", "sparse", "protocolVersion"]],
    ],
    [
      "a chained reference to a sparse server",
      serverTarget("sparseAlias"),
      [["components.x-servers.sparse", "missing", "sparse", "protocol"], ["components.x-servers.sparse.protocolVersion", "empty", "sparse", "protocolVersion"]],
    ],
    ["a reference to an empty server", serverTarget("empty"), allMissing("components.x-servers.empty", "empty")],
    ["a reference to a server with only extensions", serverTarget("extensionsOnly"), allMissing("components.x-servers.extensionsOnly", "extensionsOnly")],
    ["a reference to a server with only look-alike keys", serverTarget("lookAlikes"), allMissing("components.x-servers.lookAlikes", "lookAlikes")],
    ["a reference to a server whose keys differ in case", serverTarget("caseKeys"), allMissing("components.x-servers.caseKeys", "caseKeys")],
    [`a reference to a server written with ${other}`, serverTarget("otherVersion"), [["components.x-servers.otherVersion", "missing", "otherVersion", address]]],
    ["a reference to an object that is not a server", { $ref: "#/info" }, allMissing("info", "info")],
    ...unusableObjectCases(
      serverTarget,
      { text: "kafka://kafka.quality.es:9092", item: complete },
      () => [[AT, "unusable", NAME]],
      (ref) => {
        const [path, name] = REFERENCE_LANDING[ref] || [AT, NAME];
        return [[path, "unusable", name]];
      }
    ),
    ["a URL instead of an object", "kafka://kafka.quality.es:9093", [[AT, "unusable", NAME]]],
    ["a list of servers", [minimal, complete], [[AT, "unusable", NAME]]],
    ["a pointer past the end of an array", { $ref: "#/components/x-servers/list/3" }, [[AT, "unusable", NAME]]],
    ["a pointer through a chained server", { $ref: "#/components/x-servers/alias/bindings" }, [[AT, "unusable", NAME]]],
    ["a self reference", serverTarget("self"), [["components.x-servers.self", "unusable", "self"]]],
    ["a reference to the server itself", { $ref: `#/servers/${NAME}` }, [[AT, "unusable", NAME]]],
  ];
};

const IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["a properties list like the rule table", { properties: ["host", "protocol", "protocolVersion"] }],
  ["a properties list with url", { properties: ["url", "protocol", "protocolVersion"] }],
  ["a properties list with one field", { properties: ["protocol"] }],
  ["a properties list with other fields", { properties: ["description", "title", "pathname"] }],
  ["a properties string", { properties: "host,protocol,protocolVersion" }],
  ["fields-to-apply with only the protocol", { "fields-to-apply": "protocol" }],
  ["fields-to-apply with other fields", { "fields-to-apply": "description,title,pathname,security" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a required list", { required: ["description"] }],
  ["a field option like core truthy", { field: "description" }],
  ["a pattern", { pattern: "^x-" }],
  ["valid-versions", { "valid-versions": "2.8.0" }],
  ["allowed-protocols", { "allowed-protocols": "kafka" }],
  ["null values", { properties: null, "fields-to-apply": null, field: null }],
  ["non-string values", { properties: 42, "fields-to-apply": true, required: "description" }],
];

module.exports = {
  FIELDS_V2,
  FIELDS_V3,
  NAME,
  AT,
  shown,
  messagesFor,
  findingsFor,
  serverTarget,
  shapesFor,
  serverComponentsFor,
  SERVER_VALUE_CASES,
  serverObjectCasesFor,
  IGNORED_OPTIONS,
};
