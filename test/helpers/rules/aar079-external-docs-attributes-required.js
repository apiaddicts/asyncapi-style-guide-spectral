const { INFO_COMPONENTS, INFO_VALUE_CASES, quoteRef, unusableObjectCases } = require("../required-fields");

const DOCS_FIELDS = ["description", "url"];
const docsTarget = (name) => ({ $ref: `#/components/x-docs/${name}` });
const DOCS_COMPLETE = { description: "Order lifecycle handbook.", url: "https://docs.commerce.example.io/orders", "x-owner": "commerce-platform" };
const DOCS_MINIMAL = { description: "Order lifecycle handbook.", url: "https://docs.commerce.example.io/orders" };
const DOCS_URL_ONLY = { url: "https://docs.commerce.example.io/orders" };

const DOCS_COMPONENTS = {
  ...INFO_COMPONENTS,
  "x-docs": {
    complete: DOCS_COMPLETE,
    minimal: DOCS_MINIMAL,
    alias: docsTarget("complete"),
    aliasTwice: docsTarget("alias"),
    sparse: { url: " \t ", "x-owner": "docs-team" },
    sparseAlias: docsTarget("sparse"),
    urlOnly: DOCS_URL_ONLY,
    empty: {},
    extensionsOnly: { "x-owner": "docs-team", "x-review": "2026-03" },
    lookAlikes: { summary: "Order handbook.", title: "Orders", href: "https://docs.commerce.example.io/orders", link: "https://docs.commerce.example.io", uri: "urn:docs:orders" },
    caseKeys: { Description: "Order lifecycle handbook.", URL: "https://docs.commerce.example.io/orders" },
    cycleA: docsTarget("cycleB"),
    cycleB: docsTarget("cycleA"),
    self: docsTarget("self"),
    list: [DOCS_COMPLETE],
    text: "https://docs.commerce.example.io/orders",
    nothing: null,
    external: { $ref: "./shared/docs.yaml#/orders" },
    "a/b": DOCS_COMPLETE,
    "with space": DOCS_MINIMAL,
  },
  "x-doc-holders": {
    intermediate: { $ref: "#/components/x-doc-holders/target" },
    target: { externalDocs: DOCS_MINIMAL },
  },
};

const DOCS_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["an absolute URL", "https://docs.commerce.example.io/orders", true],
  ["a relative URL, whose format is not checked", "/docs/orders.html", true],
  ["a URN, whose format is not checked", "urn:docs:orders", true],
  ["a pointer to a field of another documentation object", { $ref: "#/components/x-docs/complete/url" }, true],
  ["a pointer through a chained documentation object, which Spectral cannot resolve either", { $ref: "#/components/x-docs/alias/url" }, false],
  ["a pointer to an empty field of another documentation object", { $ref: "#/components/x-docs/sparse/url" }, false],
];

const bothDocsFieldsMissing = (path) => DOCS_FIELDS.map((field) => [path, "missing", field]);
const docsReference = (ref) => [["", "reference", ref]];
const SPARSE_DOCS = [["components.x-docs.sparse", "missing", "description"], ["components.x-docs.sparse.url", "empty", "url"]];

const DOCS_OBJECT_CASES = [
  ["an inline object with description, url and an extension", DOCS_COMPLETE, []],
  ["an inline object with only description and url", DOCS_MINIMAL, []],
  ["an inline object with empty extensions and look-alike keys", { ...DOCS_MINIMAL, title: "", href: null, "x-owner": {} }, []],
  ["an inline object whose url is not an absolute URL", { description: "Order lifecycle handbook.", url: "/docs/orders.html" }, []],
  ["an empty object", {}, bothDocsFieldsMissing("")],
  ["an object with only a url", DOCS_URL_ONLY, [["", "missing", "description"]]],
  ["an object with only a description", { description: "Order lifecycle handbook." }, [["", "missing", "url"]]],
  ["an object with only extensions", { "x-owner": "docs-team", "x-review": "2026-03" }, bothDocsFieldsMissing("")],
  ["an object whose keys differ in case", { Description: "Order lifecycle handbook.", DESCRIPTION: "Orders.", Url: "https://docs.commerce.example.io", URL: "https://docs.commerce.example.io/orders" }, bothDocsFieldsMissing("")],
  [
    "an object with look-alike keys",
    { summary: "Order handbook.", title: "Orders", docs: "Order handbook.", href: "https://docs.commerce.example.io/orders", link: "https://docs.commerce.example.io", uri: "urn:docs:orders", externalUrl: "https://docs.commerce.example.io", "external-url": "https://docs.commerce.example.io" },
    bothDocsFieldsMissing(""),
  ],
  ["an object with a blank description and a null url", { description: "  ", url: null }, [["description", "empty", "description"], ["url", "empty", "url"]]],
  ["an object with an empty url", { description: "Order lifecycle handbook.", url: "" }, [["url", "empty", "url"]]],
  ["an object whose only content is a nested externalDocs", { externalDocs: DOCS_MINIMAL }, bothDocsFieldsMissing("")],
  ["a reference to a complete object", docsTarget("complete"), []],
  ["a reference to an object with only description and url", docsTarget("minimal"), []],
  ["a chained reference", docsTarget("alias"), []],
  ["a reference chained twice", docsTarget("aliasTwice"), []],
  ["a reference with siblings, which are ignored", { ...docsTarget("complete"), description: "", url: null }, []],
  ["a reference to an empty object with populated siblings, which are ignored", { $ref: "#/components/x-docs/empty", ...DOCS_MINIMAL }, bothDocsFieldsMissing("components.x-docs.empty")],
  ["a pointer into an array item", { $ref: "#/components/x-docs/list/0" }, []],
  ["an escaped pointer", { $ref: "#/components/x-docs/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-docs/with%20space" }, []],
  ["an external reference", { $ref: "./shared/docs.yaml#/orders" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/docs/orders.yaml" }, []],
  ["a local alias of an external object", docsTarget("external"), []],
  ["a reference to a sparse object", docsTarget("sparse"), SPARSE_DOCS],
  ["a chained reference to a sparse object", docsTarget("sparseAlias"), SPARSE_DOCS],
  ["a reference to an object with only a url", docsTarget("urlOnly"), [["components.x-docs.urlOnly", "missing", "description"]]],
  ["a reference to an empty object", docsTarget("empty"), bothDocsFieldsMissing("components.x-docs.empty")],
  ["a reference to an object with only extensions", docsTarget("extensionsOnly"), bothDocsFieldsMissing("components.x-docs.extensionsOnly")],
  ["a reference to an object with only look-alike keys", docsTarget("lookAlikes"), bothDocsFieldsMissing("components.x-docs.lookAlikes")],
  ["a reference to an object whose keys differ in case", docsTarget("caseKeys"), bothDocsFieldsMissing("components.x-docs.caseKeys")],
  ["a reference to an object that only holds an externalDocs, which is read as the documentation object", { $ref: "#/components/x-doc-holders/target" }, bothDocsFieldsMissing("components.x-doc-holders.target")],
  ...unusableObjectCases(docsTarget, { text: "https://docs.commerce.example.io/orders", item: DOCS_MINIMAL }, () => [["", "invalid"]], docsReference),
  ["a blank string", " \t ", [["", "invalid"]]],
  ["a description instead of an object", "Order lifecycle handbook.", [["", "invalid"]]],
  ["a list of URLs", ["https://docs.commerce.example.io/orders", "https://docs.commerce.example.io/payments"], [["", "invalid"]]],
  ["a pointer past the end of an array", { $ref: "#/components/x-docs/list/3" }, docsReference("#/components/x-docs/list/3")],
  ["a self reference", docsTarget("self"), docsReference("#/components/x-docs/self")],
  ["a pointer through another reference, which Spectral does not resolve either", { $ref: "#/components/x-doc-holders/intermediate/externalDocs" }, docsReference("#/components/x-doc-holders/intermediate/externalDocs")],
];

const deepDocsSchema = (levels, docs) => {
  let schema = { type: "object", externalDocs: docs };
  for (let level = levels; level >= 1; level--) schema = { type: "object", properties: { [`level${level}`]: schema } };
  return schema;
};

const DOCS_SCHEMA_KEYWORD_CASES = [
  ["the root schema", (docs) => ({ type: "object", externalDocs: docs }), "externalDocs"],
  ["a nullable array-form type", (docs) => ({ type: ["object", "null"], externalDocs: docs }), "externalDocs"],
  ["an OpenAPI-style nullable schema", (docs) => ({ type: "object", nullable: true, externalDocs: docs }), "externalDocs"],
  ["a property", (docs) => ({ type: "object", properties: { customer: { type: "object", externalDocs: docs } } }), "properties.customer.externalDocs"],
  ["a nullable property", (docs) => ({ type: "object", properties: { customer: { type: ["object", "null"], externalDocs: docs } } }), "properties.customer.externalDocs"],
  ["a property named externalDocs", (docs) => ({ type: "object", properties: { externalDocs: { type: "object", externalDocs: docs } } }), "properties.externalDocs.externalDocs"],
  ["a property named url", (docs) => ({ type: "object", properties: { url: { type: "string", format: "uri", externalDocs: docs } } }), "properties.url.externalDocs"],
  ["patternProperties", (docs) => ({ type: "object", patternProperties: { "^x-": { type: "string", externalDocs: docs } } }), "patternProperties.^x-.externalDocs"],
  ["additionalProperties", (docs) => ({ type: "object", additionalProperties: { type: "string", externalDocs: docs } }), "additionalProperties.externalDocs"],
  ["unevaluatedProperties", (docs) => ({ type: "object", unevaluatedProperties: { type: "string", externalDocs: docs } }), "unevaluatedProperties.externalDocs"],
  ["items given as a schema", (docs) => ({ type: "array", items: { type: "object", externalDocs: docs } }), "items.externalDocs"],
  ["items given as a tuple", (docs) => ({ type: "array", items: [{ type: "string" }, { type: "object", externalDocs: docs }] }), "items.1.externalDocs"],
  ["prefixItems", (docs) => ({ type: "array", prefixItems: [{ type: "object", externalDocs: docs }] }), "prefixItems.0.externalDocs"],
  ["additionalItems", (docs) => ({ type: "array", items: [{ type: "string" }], additionalItems: { type: "object", externalDocs: docs } }), "additionalItems.externalDocs"],
  ["unevaluatedItems", (docs) => ({ type: "array", unevaluatedItems: { type: "object", externalDocs: docs } }), "unevaluatedItems.externalDocs"],
  ["contains", (docs) => ({ type: "array", contains: { type: "object", externalDocs: docs } }), "contains.externalDocs"],
  ["propertyNames", (docs) => ({ type: "object", propertyNames: { type: "string", pattern: "^[a-z]+$", externalDocs: docs } }), "propertyNames.externalDocs"],
  ["not", (docs) => ({ not: { type: "null", externalDocs: docs } }), "not.externalDocs"],
  ["if", (docs) => ({ if: { properties: { kind: { const: "refund" } }, externalDocs: docs }, then: { required: ["refundId"] } }), "if.externalDocs"],
  ["then", (docs) => ({ if: { properties: { kind: { const: "refund" } } }, then: { required: ["refundId"], externalDocs: docs } }), "then.externalDocs"],
  ["else", (docs) => ({ if: { properties: { kind: { const: "refund" } } }, else: { required: ["orderId"], externalDocs: docs } }), "else.externalDocs"],
  ["allOf", (docs) => ({ allOf: [{ type: "object" }, { type: "object", externalDocs: docs }] }), "allOf.1.externalDocs"],
  ["anyOf", (docs) => ({ anyOf: [{ type: "object", externalDocs: docs }, { type: "null" }] }), "anyOf.0.externalDocs"],
  ["oneOf", (docs) => ({ oneOf: [{ type: "string" }, { type: "object", externalDocs: docs }] }), "oneOf.1.externalDocs"],
  ["definitions", (docs) => ({ type: "object", definitions: { address: { type: "object", externalDocs: docs } } }), "definitions.address.externalDocs"],
  ["$defs", (docs) => ({ type: "object", $defs: { address: { type: "object", externalDocs: docs } } }), "$defs.address.externalDocs"],
  ["dependentSchemas", (docs) => ({ type: "object", dependentSchemas: { refundId: { required: ["reason"], externalDocs: docs } } }), "dependentSchemas.refundId.externalDocs"],
  ["dependencies", (docs) => ({ type: "object", dependencies: { refundId: { required: ["reason"], externalDocs: docs }, orderId: ["customerId"] } }), "dependencies.refundId.externalDocs"],
  ["a property twelve levels deep", (docs) => deepDocsSchema(12, docs), `${Array.from({ length: 12 }, (_, index) => `properties.level${index + 1}`).join(".")}.externalDocs`],
];

const DOCS_SCHEMA_IGNORED_CASES = [
  ["a property named externalDocs without the keyword", { type: "object", properties: { externalDocs: { type: "object", properties: { url: { type: "string" } } } } }],
  ["examples", { type: "object", examples: [{ externalDocs: {} }, { externalDocs: { url: "https://docs.example.io" } }] }],
  ["an example keyword", { type: "object", example: { externalDocs: null } }],
  ["default, const and enum values", { type: "object", default: { externalDocs: {} }, properties: { docs: { const: { externalDocs: "" }, enum: [{ externalDocs: [] }] } } }],
  ["required names", { type: "object", required: ["externalDocs", "url", "description"] }],
  ["an extension", { type: "object", "x-docs": { externalDocs: {} }, "x-externalDocs": { url: "https://docs.example.io" } }],
  ["unknown keywords", { type: "object", schema: { externalDocs: {} }, nested: { externalDocs: {} }, discriminator: "kind" }],
  ["boolean subschemas", { type: "array", items: true, additionalItems: false, additionalProperties: false, not: false }],
  ["scalar and null subschemas", { type: "object", properties: { a: null, b: "string", c: 3 }, items: null, allOf: [null, "x"] }],
  ["the siblings of a $ref", { $ref: "#/components/x-schemas/clean", externalDocs: {} }],
  ["an external $ref", { $ref: "./schemas/order.json#/definitions/order", externalDocs: {} }],
  ["a dangling $ref", { $ref: "#/components/x-schemas/missing" }],
];

const DOCS_SCHEMA_FORMAT_CASES = [
  ["no schemaFormat", undefined, true],
  ["a null schemaFormat", null, true],
  ["the AsyncAPI 2.6 schema format", "application/vnd.aai.asyncapi;version=2.6.0", true],
  ["the AsyncAPI 3.0 schema format", "application/vnd.aai.asyncapi;version=3.0.0", true],
  ["the AsyncAPI JSON schema format", "application/vnd.aai.asyncapi+json;version=2.6.0", true],
  ["the AsyncAPI YAML schema format", "application/vnd.aai.asyncapi+yaml;version=3.0.0", true],
  ["JSON Schema draft-07", "application/schema+json;version=draft-07", true],
  ["JSON Schema draft-04 in YAML", "application/schema+yaml;version=draft-04", true],
  ["the OpenAPI 3.0 schema format", "application/vnd.oai.openapi;version=3.0.0", true],
  ["the OpenAPI JSON schema format", "application/vnd.oai.openapi+json;version=3.0.0", true],
  ["the OpenAPI YAML schema format", "application/vnd.oai.openapi+yaml;version=3.0.0", true],
  ["an upper-case schema format", "APPLICATION/VND.AAI.ASYNCAPI;VERSION=2.6.0", true],
  ["a padded schema format", "  application/schema+json ; version=draft-07", true],
  ["a schema format without version", "application/schema+json", true],
  ["Avro 1.9.0", "application/vnd.apache.avro;version=1.9.0", false],
  ["Avro JSON", "application/vnd.apache.avro+json;version=1.9.0", false],
  ["Avro YAML", "application/vnd.apache.avro+yaml;version=1.9.0", false],
  ["RAML", "application/raml+yaml;version=1.0", false],
  ["Protobuf", "application/vnd.google.protobuf;version=3", false],
  ["plain JSON, which is not a schema format", "application/json", false],
  ["an empty schema format", "", false],
  ["a numeric schema format", 2, false],
  ["a boolean schema format", true, false],
  ["an object schema format", { type: "json" }, false],
];

const DOCS_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["fields-to-apply with only the url", { "fields-to-apply": "url" }],
  ["fields-to-apply with only the description", { "fields-to-apply": "description" }],
  ["fields-to-apply with look-alikes and an extension", { "fields-to-apply": "description,url,title,x-owner" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a properties list like the core truthy description", { properties: ["url"] }],
  ["a properties list with a field the object does not define", { properties: ["title"] }],
  ["a fields array", { fields: ["title", "x-owner"] }],
  ["a required list", { required: ["title"] }],
  ["a field option like core truthy", { field: "url" }],
  ["a pattern", { pattern: "^https://" }],
  ["null values", { "fields-to-apply": null, properties: null }],
  ["non-string values", { "fields-to-apply": 42, properties: true, required: "title" }],
];

const DOCS_OBJECT_TEXT = "an object with 'description' and 'url'";

const DOCS_MESSAGES = {
  missing: (field) => `AAR079: The 'externalDocs' object must declare '${field}'.`,
  empty: (field) => `AAR079: The '${field}' of the 'externalDocs' object must not be empty.`,
  invalid: () => `AAR079: The 'externalDocs' value must be ${DOCS_OBJECT_TEXT}.`,
  reference: (ref) => `AAR079: The 'externalDocs' reference ${quoteRef(ref)} must resolve to ${DOCS_OBJECT_TEXT}.`,
};

const docsFinding = (base, [path, kind, detail]) => {
  const at = path === "" ? base : DOCS_FIELDS.includes(path) ? `${base}.${path}` : path;
  return [at, DOCS_MESSAGES[kind](detail)];
};

const docsFindings = (base, expected) => expected.map((entry) => docsFinding(base, entry)).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

module.exports = {
  DOCS_FIELDS,
  docsTarget,
  DOCS_COMPLETE,
  DOCS_MINIMAL,
  DOCS_URL_ONLY,
  DOCS_COMPONENTS,
  DOCS_VALUE_CASES,
  DOCS_OBJECT_CASES,
  DOCS_SCHEMA_KEYWORD_CASES,
  DOCS_SCHEMA_IGNORED_CASES,
  DOCS_SCHEMA_FORMAT_CASES,
  DOCS_IGNORED_OPTIONS,
  DOCS_MESSAGES,
  docsFinding,
  docsFindings,
};
