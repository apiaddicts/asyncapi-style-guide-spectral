const { traitRef } = require("../utils");

const CH = "commonHeaders";
const TR = "tracing";
const SHARED_TRAITS = "./shared/message-traits.yaml#/components/messageTraits";

const REQUIRED_TRAIT_COMPONENTS = {
  messageTraits: {
    commonHeaders: {
      headers: { type: "object", required: ["traceId"], properties: { traceId: { type: "string", format: "uuid" }, tenantId: { type: ["string", "null"] } } },
    },
    tracing: { correlationId: { description: "W3C trace context of the producer.", location: "$message.header#/traceparent" } },
    kafkaKey: { bindings: { kafka: { key: { type: "string", maxLength: 64 }, bindingVersion: "0.5.0" } } },
    CommonHeaders: { headers: { type: "object", properties: { legacyId: { type: "string" } } } },
    "audit/v2": { headers: { type: "object", properties: { auditId: { type: "string" } } } },
    "tracing v2": { correlationId: { location: "$message.header#/traceparent" } },
    blank: {},
    nullTrait: null,
    scalarTrait: "commonHeaders",
    listTrait: [{ headers: { type: "object" } }],
    headersAlias: traitRef(CH),
    platformDefaults: traitRef("headersAlias"),
    blankAlias: traitRef("blank"),
    danglingAlias: traitRef("missing"),
    cycleA: traitRef("cycleB"),
    cycleB: traitRef("cycleA"),
    sharedTracing: { $ref: `${SHARED_TRAITS}/tracing` },
  },
  "x-trait-lists": {
    standard: [traitRef(CH), traitRef(TR)],
    headersOnly: [traitRef(CH)],
    chained: { $ref: "#/components/x-trait-lists/standard" },
    empty: [],
    blank: [traitRef("blank"), {}],
    notList: { headers: { type: "object" } },
    nullList: null,
    cycleA: { $ref: "#/components/x-trait-lists/cycleB" },
    cycleB: { $ref: "#/components/x-trait-lists/cycleA" },
    external: { $ref: "./shared/message-traits.yaml#/lists/kafka" },
  },
  "x-missing": {},
};

const REQUIRED_TRAIT_CASES = [
  ["no traits field", {}, "missing"],
  ["a null traits value", { traits: null }, "none"],
  ["an empty traits list", { traits: [] }, "none"],
  ["an inline trait object instead of a list", { traits: { headers: { type: "object" } } }, "notArray"],
  ["a single trait reference instead of a list", { traits: traitRef(CH) }, "notArray"],
  ["a trait name instead of a list", { traits: "commonHeaders" }, "notArray"],
  ["an empty string", { traits: "" }, "notArray"],
  ["a number", { traits: 1 }, "notArray"],
  ["zero", { traits: 0 }, "notArray"],
  ["true", { traits: true }, "notArray"],
  ["false", { traits: false }, "notArray"],
  ["the common headers trait", { traits: [traitRef(CH)] }, null],
  ["the tracing trait", { traits: [traitRef(TR)] }, null],
  ["both organization traits", { traits: [traitRef(CH), traitRef(TR)] }, null],
  ["both organization traits after an unrelated one, in reverse order", { traits: [traitRef("kafkaKey"), traitRef(TR), traitRef(CH)] }, null],
  ["the same trait twice", { traits: [traitRef(CH), traitRef(CH)] }, null],
  ["only an unrelated trait", { traits: [traitRef("kafkaKey")] }, null],
  ["a trait whose name differs only in case", { traits: [traitRef("CommonHeaders"), traitRef(TR)] }, null],
  ["an inline trait", { traits: [{ headers: { type: "object", properties: { traceId: { type: "string" } } } }] }, null],
  ["an inline trait with only an extension", { traits: [{ "x-owner": "platform-team" }] }, null],
  ["an inline trait whose name and title match the organization ones", { traits: [{ name: CH, title: TR }] }, null],
  ["an empty inline trait", { traits: [{}] }, "none"],
  ["non-object entries", { traits: [null, 42, "commonHeaders", true, [], [null]] }, "none"],
  ["a chained alias of an organization trait", { traits: [traitRef("headersAlias"), traitRef(TR)] }, null],
  ["a trait chained twice", { traits: [traitRef("platformDefaults")] }, null],
  ["a reference to an empty trait", { traits: [traitRef("blank")] }, "none"],
  ["an alias of an empty trait", { traits: [traitRef("blankAlias")] }, "none"],
  ["a reference to a null trait", { traits: [traitRef("nullTrait")] }, "none"],
  ["a reference to a scalar trait", { traits: [traitRef("scalarTrait")] }, "none"],
  ["a reference to a list", { traits: [traitRef("listTrait")] }, "none"],
  ["a reference to the document root", { traits: [{ $ref: "#" }] }, "none"],
  ["a dangling reference", { traits: [traitRef("missing")] }, "none"],
  ["dangling references named like the organization traits", { traits: [{ $ref: "#/components/x-missing/commonHeaders" }, { $ref: "#/components/x-missing/tracing" }] }, "none"],
  ["a dangling alias", { traits: [traitRef("danglingAlias")] }, "none"],
  ["a cyclic reference", { traits: [traitRef("cycleA")] }, "none"],
  ["references with a non-string $ref", { traits: [{ $ref: 42 }, { $ref: null }] }, "none"],
  ["a dangling reference next to a valid one", { traits: [traitRef("missing"), traitRef(TR)] }, null],
  ["an empty inline trait next to a valid one", { traits: [{}, traitRef(CH)] }, null],
  ["tuple entries", { traits: [[traitRef(CH), { environment: "prod" }], [traitRef(TR), {}]] }, null],
  ["a tuple with an inline trait", { traits: [[{ headers: { type: "object" } }, {}]] }, null],
  ["tuples without a trait", { traits: [[null, {}], [], [{}, { environment: "prod" }]] }, "none"],
  ["a tuple whose trait is dangling", { traits: [[traitRef("missing"), {}]] }, "none"],
  ["an external trait pointer", { traits: [{ $ref: `${SHARED_TRAITS}/tracing` }, traitRef(CH)] }, null],
  ["an external trait with another name", { traits: [{ $ref: `${SHARED_TRAITS}/tracingV2` }] }, null],
  ["external whole-file references", { traits: [{ $ref: "./traits/commonHeaders.yaml" }, { $ref: "https://schemas.example.io/asyncapi/traits/tracing.json" }] }, null],
  ["external files with an upper-case extension or a query", { traits: [{ $ref: "../traits/commonHeaders.YAML" }, { $ref: "./traits/tracing.yml?version=2" }] }, null],
  ["external files with an empty fragment", { traits: [{ $ref: "./traits/commonHeaders.yaml#" }, { $ref: "./traits/tracing.yaml#/" }] }, null],
  ["an external file with another extension", { traits: [{ $ref: "./traits/commonHeaders.avsc" }] }, null],
  ["Windows-style external paths", { traits: [{ $ref: "..\\traits\\commonHeaders.yaml" }, { $ref: "C:\\specs\\traits\\tracing.json" }] }, null],
  ["a local alias of an external trait", { traits: [traitRef("sharedTracing"), traitRef(CH)] }, null],
  ["an escaped pointer", { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, null],
  ["a percent-encoded pointer", { traits: [{ $ref: "#/components/messageTraits/tracing%20v2" }] }, null],
  ["a malformed percent-encoded pointer", { traits: [{ $ref: "#/components/messageTraits/tracing%E0%A4%A" }] }, "none"],
  ["a pointer without a leading slash", { traits: [{ $ref: "#components/messageTraits/commonHeaders" }] }, "none"],
  ["a traits list behind a local reference", { traits: { $ref: "#/components/x-trait-lists/standard" } }, null],
  ["a traits list behind a chained reference", { traits: { $ref: "#/components/x-trait-lists/chained" } }, null],
  ["a referenced list with one organization trait", { traits: { $ref: "#/components/x-trait-lists/headersOnly" } }, null],
  ["a referenced empty list", { traits: { $ref: "#/components/x-trait-lists/empty" } }, "none"],
  ["a referenced list of empty traits", { traits: { $ref: "#/components/x-trait-lists/blank" } }, "none"],
  ["a referenced null list", { traits: { $ref: "#/components/x-trait-lists/nullList" } }, "none"],
  ["a referenced object instead of a list", { traits: { $ref: "#/components/x-trait-lists/notList" } }, "notArray"],
  ["a list reference to the document root", { traits: { $ref: "#" } }, "notArray"],
  ["a dangling list reference", { traits: { $ref: "#/components/x-trait-lists/missing" } }, "none"],
  ["a cyclic list reference", { traits: { $ref: "#/components/x-trait-lists/cycleA" } }, "none"],
  ["a list reference with a non-string $ref", { traits: { $ref: ["standard"] } }, "none"],
  ["an external traits list", { traits: { $ref: "./shared/message-traits.yaml#/lists/kafka" } }, null],
  ["a local list that points to an external one", { traits: { $ref: "#/components/x-trait-lists/external" } }, null],
];

const REQUIRED_TRAIT_MESSAGES = {
  missing: () => "AAR073: Message must apply at least one trait.",
  notArray: () => "AAR073: Message 'traits' must be an array.",
  none: () => "AAR073: Message 'traits' must include at least one valid trait.",
};

const requiredTraitFindings = (base, kind) => (kind === null ? [] : [[kind === "missing" ? base : `${base}.traits`, REQUIRED_TRAIT_MESSAGES[kind]()]]);

const REQUIRED_TRAIT_PROBES = {
  noTraits: { fields: {}, state: "absent" },
  emptyList: { fields: { traits: [] }, state: "list", any: false },
  notList: { fields: { traits: { headers: { type: "object" } } }, state: "notArray" },
  headersOnly: { fields: { traits: [traitRef(CH)] }, state: "list", any: true },
  tracingOnly: { fields: { traits: [traitRef(TR)] }, state: "list", any: true },
  both: { fields: { traits: [traitRef(CH), traitRef(TR)] }, state: "list", any: true },
  all: { fields: { traits: [traitRef(CH), traitRef(TR), traitRef("kafkaKey")] }, state: "list", any: true },
  aliases: { fields: { traits: [traitRef("platformDefaults"), traitRef("sharedTracing")] }, state: "list", any: true },
  caseVariant: { fields: { traits: [traitRef("CommonHeaders")] }, state: "list", any: true },
  escaped: { fields: { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, state: "list", any: true },
  inline: { fields: { traits: [{ headers: { type: "object" } }] }, state: "list", any: true },
  dangling: { fields: { traits: [{ $ref: "#/components/x-missing/commonHeaders" }] }, state: "list", any: false },
};

const requiredTraitProbeFindings = (prefix) =>
  Object.entries(REQUIRED_TRAIT_PROBES)
    .flatMap(([key, probe]) => {
      const base = `${prefix}.${key}`;
      if (probe.state === "absent") return [[base, REQUIRED_TRAIT_MESSAGES.missing()]];
      if (probe.state === "notArray") return [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.notArray()]];
      return probe.any ? [] : [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.none()]];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

const REQUIRED_TRAIT_OPTIONS = [
  ["an empty string", ""],
  ["a blank string", "  \t "],
  ["only commas and spaces", " , ,, "],
  ["a single name", "commonHeaders"],
  ["two padded names", " commonHeaders ,  tracing "],
  ["the names in another order", "tracing,commonHeaders"],
  ["duplicated names", "tracing,commonHeaders,tracing"],
  ["three names", "commonHeaders,tracing,kafkaKey"],
  ["a name with another case", "COMMONHEADERS"],
  ["a name nobody applies", "piiClassification"],
  ["a name with a slash", "audit/v2"],
  ["a local $ref", "#/components/messageTraits/commonHeaders"],
  ["an external $ref and a name", "./shared/message-traits.yaml#/components/messageTraits/tracing, commonHeaders"],
  ["an escaped $ref", "#/components/messageTraits/audit~1v2"],
  ["a bare hash", "#"],
  ["an array of names", [CH, TR]],
  ["an array of comma-separated lists", ["commonHeaders, tracing", "kafkaKey"]],
  ["an array with non-string items", [null, 42, "tracing", {}, ["commonHeaders"]]],
  ["an empty array", []],
  ["null", null],
  ["a number", 42],
  ["true", true],
  ["an object", { commonHeaders: true }],
];

module.exports = {
  REQUIRED_TRAIT_COMPONENTS,
  REQUIRED_TRAIT_CASES,
  REQUIRED_TRAIT_MESSAGES,
  requiredTraitFindings,
  REQUIRED_TRAIT_PROBES,
  requiredTraitProbeFindings,
  REQUIRED_TRAIT_OPTIONS,
};
