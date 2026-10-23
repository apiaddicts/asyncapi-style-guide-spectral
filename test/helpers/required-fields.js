const { chars } = require("./utils");

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

const quotedList = (fields) => {
  const quoted = fields.map((field) => `'${field}'`);
  return quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`;
};

const quoteRef = (value) => (typeof value === "string" ? `'${value}'` : JSON.stringify(value));

const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);

/**
 * @param {object} messages - Expected message builders of one rule, keyed by finding kind
 * @returns {Function} Maps [path, kind, ...args] entries to sorted [path, message] findings
 */
const findingsFrom = (messages) => (expected) => expected.map(([path, kind, ...args]) => [path, messages[kind](...args)]).sort(byPathAndMessage);

/**
 * @param {Function} target - Builds a local reference to an entry of the rule's components map
 * @param {object} shape - Rule-specific values: a string the user might write instead of the object, a usable object and the entry a pointer without a leading slash names
 * @param {Function} onValue - Expected findings for a value that is not an object
 * @param {Function} [onReference] - Expected findings for a reference that does not resolve to an object
 * @returns {Array} [description, value, expected] cases shared by the rules that require an object
 */
const unusableObjectCases = (target, { text, item, pointer = "complete" }, onValue, onReference = onValue) => [
  ...[
    ["null", null],
    ["an empty string", ""],
    ["a string instead of an object", text],
    ["zero", 0],
    ["a number", 42],
    ["true", true],
    ["false", false],
    ["an empty list", []],
    ["a list holding the object", [item]],
  ].map(([name, value]) => [name, value, onValue(value)]),
  ...[
    ["a dangling reference", target("missing")],
    ["a cyclic reference", target("cycleA")],
    ["a reference to the document root", { $ref: "#" }],
    ["an empty reference, which points to the document itself", { $ref: "" }],
    ["a reference to a list", target("list")],
    ["a reference to a string", target("text")],
    ["a reference to null", target("nothing")],
    ["a pointer without a leading slash", { $ref: target(pointer).$ref.replace("#/", "#") }],
    ["a malformed percent-encoded pointer", target("%E0%A4%A")],
    ["a non-string reference", { $ref: 42 }],
    ["a null reference", { $ref: null }],
  ].map(([name, value]) => [name, value, onReference(value.$ref)]),
];

module.exports = {
  infoTarget,
  INFO_COMPONENTS,
  INFO_VALUE_CASES,
  quotedList,
  quoteRef,
  findingsFrom,
  unusableObjectCases,
};
