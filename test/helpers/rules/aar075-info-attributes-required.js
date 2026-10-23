const { infoTarget, quotedList, unusableObjectCases } = require("../required-fields");

const INFO_DEFAULT_FIELDS = ["title", "version", "description"];
const INFO_V2_FIELDS = [...INFO_DEFAULT_FIELDS, "termsOfService", "contact", "license"];
const INFO_V3_FIELDS = [...INFO_V2_FIELDS, "tags", "externalDocs"];

const INFO_OBJECT_CASES = [
  ["an inline info object with every default field", { title: "Commerce Events", version: "4.2.0", description: "Order events." }, []],
  ["an empty info object", {}, [["info", "missing", "title"], ["info", "missing", "version"], ["info", "missing", "description"]]],
  ["a reference to a complete info object", infoTarget("complete"), []],
  ["a chained reference to a complete info object", infoTarget("alias"), []],
  ["a reference with siblings, which are ignored", { ...infoTarget("complete"), title: "" }, []],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ["a reference to a sparse info object", infoTarget("sparse"), [["components.x-info.sparse", "missing", "description"], ["components.x-info.sparse.version", "empty", "version"]]],
  ["a chained reference to a sparse info object", infoTarget("sparseAlias"), [["components.x-info.sparse", "missing", "description"], ["components.x-info.sparse.version", "empty", "version"]]],
  ["a reference to an empty object", infoTarget("empty"), [["components.x-info.empty", "missing", "title"], ["components.x-info.empty", "missing", "version"], ["components.x-info.empty", "missing", "description"]]],
  ...unusableObjectCases(infoTarget, { text: "Commerce Events", item: { title: "Commerce Events", version: "4.2.0", description: "Order events." } }, () => [["info", "invalid"]]),
];

const INFO_PROBE = {
  title: "Fleet Telemetry",
  version: "  ",
  termsOfService: "https://fleet.example.io/terms",
  contact: {},
  tags: [],
  externalDocs: { url: "https://fleet.example.io/docs" },
  "x-audience": "external-partner",
  "x-api-id": "",
  "x-team.owner_id": null,
};

const INFO_PROBE_STATES = {
  title: "populated",
  version: "empty",
  description: "missing",
};

const INFO_OPTION_CASES = [
  ["the former default list", "title,version,description"],
  ["an empty string", ""],
  ["a blank string", "  \t "],
  ["only commas and spaces", " , ,, "],
  ["only the title", "title"],
  ["only the description", "description"],
  ["two padded names in another order", "  description ,  title "],
  ["duplicated names", "title,title,version,title"],
  ["empty entries between names", ",title,,version,"],
  ["fixed fields in any case", "Title,VERSION,Description"],
  ["camelCase fields written in lower and upper case", "termsofservice,EXTERNALDOCS,Contact"],
  ["every AsyncAPI 2.x info field", INFO_V2_FIELDS.join(",")],
  ["every AsyncAPI 3.x info field", INFO_V3_FIELDS.join(",")],
  ["only the 3.x-only fields", "tags,externalDocs"],
  ["one extension", "x-audience"],
  ["several extensions", "x-audience,x-api-id,x-owner"],
  ["an extension with dots and underscores", "x-team.owner_id"],
  ["padded extensions and fields", "  x-api-id  ,  contact "],
  ["an extension with an upper-case prefix", "X-Audience"],
  ["a bare extension prefix", "x-"],
  ["an extension with a forbidden character", "x-audience!"],
  ["nested paths, prefixed names and fields the info object does not define", "contact.email,info.title,$.info.version,owner,summary,servers,id"],
  ["an unusable name next to a usable one", "owner,license"],
  ["names separated by spaces", "title version"],
  ["names separated by semicolons", "title;version"],
  ["an array of names", ["title", "contact"]],
  ["an array of comma-separated lists", ["title, version", "license"]],
  ["an array with non-string items", [null, 7, "license", {}, ["title"]]],
  ["an empty array", []],
  ["null", null],
  ["a number", 42],
  ["true", true],
  ["an object", { title: true }],
];

const INFO_MESSAGES = {
  missing: (field) => `AAR075: The 'info' object must declare '${field}'.`,
  empty: (field) => `AAR075: The '${field}' of the 'info' object must not be empty.`,
  invalid: () => `AAR075: The document must declare an 'info' object with ${quotedList(INFO_DEFAULT_FIELDS)}.`,
};

const infoProbeFindings = () =>
  Object.entries(INFO_PROBE_STATES)
    .filter(([, state]) => state !== "populated")
    .map(([field, state]) => (state === "missing" ? ["info", INFO_MESSAGES.missing(field)] : [`info.${field}`, INFO_MESSAGES.empty(field)]));

module.exports = {
  INFO_DEFAULT_FIELDS,
  INFO_OBJECT_CASES,
  INFO_PROBE,
  INFO_OPTION_CASES,
  INFO_MESSAGES,
  infoProbeFindings,
};
