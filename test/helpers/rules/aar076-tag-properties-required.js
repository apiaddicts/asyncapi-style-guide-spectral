const { quotedList, quoteRef, unusableObjectCases } = require("../required-fields");

const TAG_DEFAULT_FIELDS = ["name", "description"];
const tagTarget = (name) => ({ $ref: `#/components/x-tags/${name}` });
const tagList = (name) => ({ $ref: `#/components/x-tag-lists/${name}` });
const DOCS = { description: "Tag handbook.", url: "https://docs.example.io/tags" };

const TAG_COMPONENTS = {
  "x-tags": {
    complete: { name: "orders", description: "Order lifecycle events.", externalDocs: DOCS, "x-owner": "commerce-platform" },
    sparse: { name: "payments", description: "" },
    nameless: { description: "Shipment events." },
    empty: {},
    alias: tagTarget("complete"),
    indirect: tagTarget("alias"),
    sparseAlias: tagTarget("sparse"),
    cycleA: tagTarget("cycleB"),
    cycleB: tagTarget("cycleA"),
    self: tagTarget("self"),
    list: [{ name: "orders", description: "Listed tag." }],
    text: "orders",
    nothing: null,
    external: { $ref: "./shared/tags.yaml#/orders" },
    "a/b": { name: "escaped", description: "Escaped pointer." },
    "with space": { name: "spaced", description: "Percent-encoded pointer." },
  },
  "x-tag-lists": {
    complete: [{ name: "invoices", description: "Invoice events." }, tagTarget("complete")],
    sparse: [{ name: "refunds" }, { name: "chargebacks", description: "Card chargebacks." }],
    alias: tagList("complete"),
    sparseAlias: tagList("sparse"),
    external: { $ref: "./shared/tags.yaml#/list" },
    notAList: { name: "orders" },
  },
  "x-messages": {
    intermediate: { $ref: "#/components/x-messages/target" },
    target: { tags: [{ name: "via-intermediate", description: "Reached through another reference." }] },
  },
};

const TAG_ITEM_CASES = [
  ["an inline tag with every default field", { name: "orders", description: "Order events." }, []],
  ["an inline tag with an extra externalDocs", { name: "orders", description: "Order events.", externalDocs: DOCS }, []],
  ["an empty tag object", {}, [["", "missing", "name"], ["", "missing", "description"]]],
  ["a tag without description", { name: "orders" }, [["", "missing", "description", "orders"]]],
  ["a tag without name", { description: "Order events." }, [["", "missing", "name"]]],
  ["a tag with only an externalDocs", { externalDocs: DOCS }, [["", "missing", "name"], ["", "missing", "description"]]],
  ["a tag whose keys differ in case", { Name: "orders", DESCRIPTION: "Order events." }, [["", "missing", "name"], ["", "missing", "description"]]],
  ["a tag with an empty name", { name: "", description: "Order events." }, [["name", "empty", "name"]]],
  ["a tag with a blank name and no description", { name: " \t" }, [["name", "empty", "name"], ["", "missing", "description"]]],
  ["a tag with a null description", { name: "orders", description: null }, [["description", "empty", "description", "orders"]]],
  ["a tag with both fields empty", { name: null, description: "" }, [["name", "empty", "name"], ["description", "empty", "description"]]],
  ["a tag with a numeric name", { name: 2024, description: "" }, [["description", "empty", "description"]]],
  ["a tag whose name is a reference to a text", { name: { $ref: "#/components/x-texts/summary" }, description: "" }, [["description", "empty", "description", "Order lifecycle events published by the commerce platform."]]],
  ["a reference to a complete tag", tagTarget("complete"), []],
  ["a chained reference to a complete tag", tagTarget("alias"), []],
  ["a reference chained twice", tagTarget("indirect"), []],
  ["a reference with siblings, which are ignored", { ...tagTarget("complete"), description: "" }, []],
  ["an escaped pointer", { $ref: "#/components/x-tags/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-tags/with%20space" }, []],
  ["a pointer into a list item", { $ref: "#/components/x-tag-lists/complete/0" }, []],
  ["an external reference", { $ref: "./shared/tags.yaml#/orders" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/tags/orders.yaml" }, []],
  ["a local alias of an external tag", tagTarget("external"), []],
  ["a reference to a sparse tag", tagTarget("sparse"), [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a chained reference to a sparse tag", tagTarget("sparseAlias"), [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a sparse tag whose siblings would complete it", { ...tagTarget("sparse"), description: "Ignored sibling." }, [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a reference to a nameless tag", tagTarget("nameless"), [["components.x-tags.nameless", "missing", "name"]]],
  ["a reference to an empty object", tagTarget("empty"), [["components.x-tags.empty", "missing", "name"], ["components.x-tags.empty", "missing", "description"]]],
  ["a pointer into a sparse list item", { $ref: "#/components/x-tag-lists/sparse/0" }, [["components.x-tag-lists.sparse.0", "missing", "description", "refunds"]]],
  ...unusableObjectCases(tagTarget, { text: "orders", item: { name: "orders", description: "Order events." } }, (value) => (value === "orders" ? [["", "named", "orders"]] : [["", "invalid"]]), (ref) => [["", "reference", ref]]),
  ["a blank string", " \t ", [["", "invalid"]]],
  ["a self reference", tagTarget("self"), [["", "reference", "#/components/x-tags/self"]]],
  ["a pointer past the end of a list", { $ref: "#/components/x-tag-lists/complete/5" }, [["", "reference", "#/components/x-tag-lists/complete/5"]]],
  ["a pointer through another reference, which Spectral does not resolve either", { $ref: "#/components/x-messages/intermediate/tags/0" }, [["", "reference", "#/components/x-messages/intermediate/tags/0"]]],
];

const TAG_LIST_CASES = [
  ["absent", undefined, []],
  ["null", null, []],
  ["an empty list", [], []],
  ["an object instead of a list", { name: "orders" }, []],
  ["a string instead of a list", "orders", []],
  ["a reference to a complete list", tagList("complete"), []],
  ["a chained reference to a complete list", tagList("alias"), []],
  ["an external reference", tagList("external"), []],
  ["a dangling reference", tagList("missing"), []],
  ["a reference to something that is not a list", tagList("notAList"), []],
  ["a reference to a sparse list", tagList("sparse"), [["components.x-tag-lists.sparse.0", "missing", "description", "refunds"]]],
  ["a chained reference to a sparse list", tagList("sparseAlias"), [["components.x-tag-lists.sparse.0", "missing", "description", "refunds"]]],
  [
    "two identical incomplete tags",
    [{ name: "orders" }, { name: "orders" }],
    [["0", "missing", "description", "orders"], ["1", "missing", "description", "orders"]],
  ],
  ["two references to the same sparse tag", [tagTarget("sparse"), tagTarget("sparseAlias")], [["components.x-tags.sparse.description", "empty", "description", "payments"]]],
  ["a complete tag next to null and a tag name", [{ name: "orders", description: "Order events." }, null, "payments"], [["1", "invalid"], ["2", "named", "payments"]]],
];

const TAG_PROBE = [
  { name: "fleet-telemetry", description: "  ", "x-owner": "fleet-team", "x-review": "" },
  { description: "Vehicle positions.", externalDocs: DOCS, "x-team.owner_id": null },
  { name: "", description: null, externalDocs: {}, "x-lifecycle": "ga", "x-review": "approved" },
  { name: "maintenance", description: "Workshop events.", externalDocs: { $ref: "#/components/x-texts/emptyObject" }, "x-owner": [] },
];

const TAG_PROBE_STATES = [
  ["fleet-telemetry", { name: "populated", description: "empty" }],
  [undefined, { description: "populated" }],
  [undefined, { name: "empty", description: "empty" }],
  ["maintenance", { name: "populated", description: "populated" }],
];

const TAG_OPTION_CASES = [
  ["the former default list", "name,description"],
  ["an empty string", ""],
  ["a blank string", "  \t "],
  ["only commas and spaces", " , ,, "],
  ["only the name", "name"],
  ["only the description", "description"],
  ["only the externalDocs", "externalDocs"],
  ["two padded names in another order", "  description ,  name "],
  ["duplicated names", "name,NAME,description,name"],
  ["empty entries between names", ",name,,description,"],
  ["fixed fields in any case", "Name,DESCRIPTION,externaldocs"],
  ["every Tag object field", "name,description,externalDocs"],
  ["one extension", "x-owner"],
  ["several extensions", "x-owner,x-review,x-lifecycle"],
  ["an extension with dots and underscores", "x-team.owner_id"],
  ["every field and extension", "name,description,externalDocs,x-owner,x-review,x-lifecycle,x-team.owner_id"],
  ["padded extensions and fields", "  x-owner  ,  externalDocs "],
  ["an extension written in another case is matched as written", "x-Owner"],
  ["an extension with an upper-case prefix", "X-Owner"],
  ["a bare extension prefix", "x-"],
  ["an extension with a forbidden character", "x-owner!"],
  ["nested paths and prefixed names", "externalDocs.url,tags.name,$.tags.description,info.title"],
  ["fields a Tag object does not define", "title,summary,url,version,id,tags"],
  ["an unusable name next to a usable one", "owner,externalDocs"],
  ["names separated by spaces", "name description"],
  ["names separated by semicolons", "name;description"],
  ["an array of names", ["name", "externalDocs"]],
  ["an array of comma-separated lists", ["name, description", "x-owner"]],
  ["an array with non-string items", [null, 7, "externalDocs", {}, ["name"], true]],
  ["an array of blanks", ["", "  "]],
  ["an empty array", []],
  ["null", null],
  ["a number", 42],
  ["true", true],
  ["an object", { name: true }],
];

const TAG_MESSAGES = {
  missing: (field, name) => `AAR076: ${name === undefined ? "The tag" : `Tag '${name}'`} must declare '${field}'.`,
  empty: (field, name) => `AAR076: The '${field}' of ${name === undefined ? "the tag" : `tag '${name}'`} must not be empty.`,
  invalid: () => `AAR076: The tag must be a Tag object with ${quotedList(TAG_DEFAULT_FIELDS)}.`,
  named: (name) => `AAR076: Tag '${name}' must be a Tag object with ${quotedList(TAG_DEFAULT_FIELDS)}.`,
  reference: (ref) => `AAR076: The tag reference ${quoteRef(ref)} must resolve to a Tag object with ${quotedList(TAG_DEFAULT_FIELDS)}.`,
};

const tagFinding = (base, [path, kind, detail, name]) => {
  const at = path === "" ? base : /^\d+$/.test(path) || ["name", "description"].includes(path) ? `${base}.${path}` : path;
  if (kind === "missing") return [at, TAG_MESSAGES.missing(detail, name)];
  if (kind === "empty") return [at, TAG_MESSAGES.empty(detail, name)];
  return [at, TAG_MESSAGES[kind](detail)];
};

const tagFindings = (tags, invalid = []) => [
  ...tags.flatMap(([path, name, states]) =>
    TAG_DEFAULT_FIELDS
      .filter((field) => states[field] !== "populated")
      .map((field) => (states[field] === "empty" ? [`${path}.${field}`, TAG_MESSAGES.empty(field, name)] : [path, TAG_MESSAGES.missing(field, name)]))
  ),
  ...invalid.map(([path, kind, detail]) => [path, TAG_MESSAGES[kind](detail)]),
];

const tagProbeFindings = (base) => tagFindings(TAG_PROBE_STATES.map(([name, states], index) => [`${base}.${index}`, name, states]));

module.exports = {
  TAG_COMPONENTS,
  TAG_ITEM_CASES,
  TAG_LIST_CASES,
  TAG_PROBE,
  TAG_OPTION_CASES,
  TAG_MESSAGES,
  tagFinding,
  tagFindings,
  tagProbeFindings,
};
