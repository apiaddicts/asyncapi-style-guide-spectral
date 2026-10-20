const { traitRef } = require("../utils");

const CH = "commonHeaders";
const TR = "tracing";
const BOTH = [CH, TR];
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
    "tilde~key": { headers: { type: "object", properties: { legacy: { type: "boolean" } } } },
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
  "x-aliases": {
    headers: traitRef(CH),
    headersTwice: { $ref: "#/components/x-aliases/headers" },
  },
  "x-missing": {},
};

const REQUIRED_TRAIT_CASES = [
  ["no traits field", {}, "missing", BOTH],
  ["a null traits value", { traits: null }, "none", BOTH],
  ["an empty traits list", { traits: [] }, "none", BOTH],
  ["an inline trait object instead of a list", { traits: { headers: { type: "object" } } }, "notArray", "notArray"],
  ["a single trait reference instead of a list", { traits: traitRef(CH) }, "notArray", "notArray"],
  ["a trait name instead of a list", { traits: "commonHeaders" }, "notArray", "notArray"],
  ["an empty string", { traits: "" }, "notArray", "notArray"],
  ["a number", { traits: 1 }, "notArray", "notArray"],
  ["zero", { traits: 0 }, "notArray", "notArray"],
  ["true", { traits: true }, "notArray", "notArray"],
  ["false", { traits: false }, "notArray", "notArray"],
  ["the common headers trait", { traits: [traitRef(CH)] }, null, [TR]],
  ["the tracing trait", { traits: [traitRef(TR)] }, null, [CH]],
  ["both organization traits", { traits: [traitRef(CH), traitRef(TR)] }, null, []],
  ["both organization traits after an unrelated one, in reverse order", { traits: [traitRef("kafkaKey"), traitRef(TR), traitRef(CH)] }, null, []],
  ["the same trait twice", { traits: [traitRef(CH), traitRef(CH)] }, null, [TR]],
  ["only an unrelated trait", { traits: [traitRef("kafkaKey")] }, null, BOTH],
  ["a trait whose name differs only in case", { traits: [traitRef("CommonHeaders"), traitRef(TR)] }, null, [CH]],
  ["an inline trait", { traits: [{ headers: { type: "object", properties: { traceId: { type: "string" } } } }] }, null, BOTH],
  ["an inline trait with only an extension", { traits: [{ "x-owner": "platform-team" }] }, null, BOTH],
  ["an inline trait whose name and title match the organization ones", { traits: [{ name: CH, title: TR }] }, null, BOTH],
  ["an empty inline trait", { traits: [{}] }, "none", BOTH],
  ["non-object entries", { traits: [null, 42, "commonHeaders", true, [], [null]] }, "none", BOTH],
  ["a chained alias of an organization trait", { traits: [traitRef("headersAlias"), traitRef(TR)] }, null, []],
  ["a trait chained twice", { traits: [traitRef("platformDefaults")] }, null, [TR]],
  ["a reference to an empty trait", { traits: [traitRef("blank")] }, "none", BOTH],
  ["an alias of an empty trait", { traits: [traitRef("blankAlias")] }, "none", BOTH],
  ["a reference to a null trait", { traits: [traitRef("nullTrait")] }, "none", BOTH],
  ["a reference to a scalar trait", { traits: [traitRef("scalarTrait")] }, "none", BOTH],
  ["a reference to a list", { traits: [traitRef("listTrait")] }, "none", BOTH],
  ["a reference to the document root", { traits: [{ $ref: "#" }] }, "none", BOTH],
  ["a dangling reference", { traits: [traitRef("missing")] }, "none", BOTH],
  ["dangling references named like the organization traits", { traits: [{ $ref: "#/components/x-missing/commonHeaders" }, { $ref: "#/components/x-missing/tracing" }] }, "none", BOTH],
  ["a dangling alias", { traits: [traitRef("danglingAlias")] }, "none", BOTH],
  ["a cyclic reference", { traits: [traitRef("cycleA")] }, "none", BOTH],
  ["references with a non-string $ref", { traits: [{ $ref: 42 }, { $ref: null }] }, "none", BOTH],
  ["a dangling reference next to a valid one", { traits: [traitRef("missing"), traitRef(TR)] }, null, [CH]],
  ["an empty inline trait next to a valid one", { traits: [{}, traitRef(CH)] }, null, [TR]],
  ["tuple entries", { traits: [[traitRef(CH), { environment: "prod" }], [traitRef(TR), {}]] }, null, []],
  ["a tuple with an inline trait", { traits: [[{ headers: { type: "object" } }, {}]] }, null, BOTH],
  ["tuples without a trait", { traits: [[null, {}], [], [{}, { environment: "prod" }]] }, "none", BOTH],
  ["a tuple whose trait is dangling", { traits: [[traitRef("missing"), {}]] }, "none", BOTH],
  ["a tuple whose second item references a trait", { traits: [[traitRef(CH), traitRef(TR)]] }, null, [TR]],
  ["an external trait pointer", { traits: [{ $ref: `${SHARED_TRAITS}/tracing` }, traitRef(CH)] }, null, []],
  ["an external trait with another name", { traits: [{ $ref: `${SHARED_TRAITS}/tracingV2` }] }, null, BOTH],
  ["external whole-file references", { traits: [{ $ref: "./traits/commonHeaders.yaml" }, { $ref: "https://schemas.example.io/asyncapi/traits/tracing.json" }] }, null, BOTH],
  ["external files with an upper-case extension or a query", { traits: [{ $ref: "../traits/commonHeaders.YAML" }, { $ref: "./traits/tracing.yml?version=2" }] }, null, BOTH],
  ["external files with an empty fragment", { traits: [{ $ref: "./traits/commonHeaders.yaml#" }, { $ref: "./traits/tracing.yaml#/" }] }, null, BOTH],
  ["an external file with another extension", { traits: [{ $ref: "./traits/commonHeaders.avsc" }] }, null, BOTH],
  ["Windows-style external paths", { traits: [{ $ref: "..\\traits\\commonHeaders.yaml" }, { $ref: "C:\\specs\\traits\\tracing.json" }] }, null, BOTH],
  ["a local alias of an external trait", { traits: [traitRef("sharedTracing"), traitRef(CH)] }, null, []],
  ["an escaped pointer", { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, null, BOTH],
  ["a percent-encoded pointer", { traits: [{ $ref: "#/components/messageTraits/tracing%20v2" }] }, null, BOTH],
  ["a malformed percent-encoded pointer", { traits: [{ $ref: "#/components/messageTraits/tracing%E0%A4%A" }] }, "none", BOTH],
  ["a pointer without a leading slash", { traits: [{ $ref: "#components/messageTraits/commonHeaders" }] }, "none", BOTH],
  ["a traits list behind a local reference", { traits: { $ref: "#/components/x-trait-lists/standard" } }, null, []],
  ["a traits list behind a chained reference", { traits: { $ref: "#/components/x-trait-lists/chained" } }, null, []],
  ["a referenced list with one organization trait", { traits: { $ref: "#/components/x-trait-lists/headersOnly" } }, null, [TR]],
  ["a referenced empty list", { traits: { $ref: "#/components/x-trait-lists/empty" } }, "none", BOTH],
  ["a referenced list of empty traits", { traits: { $ref: "#/components/x-trait-lists/blank" } }, "none", BOTH],
  ["a referenced null list", { traits: { $ref: "#/components/x-trait-lists/nullList" } }, "none", BOTH],
  ["a referenced object instead of a list", { traits: { $ref: "#/components/x-trait-lists/notList" } }, "notArray", "notArray"],
  ["a list reference to the document root", { traits: { $ref: "#" } }, "notArray", "notArray"],
  ["a dangling list reference", { traits: { $ref: "#/components/x-trait-lists/missing" } }, "none", BOTH],
  ["a cyclic list reference", { traits: { $ref: "#/components/x-trait-lists/cycleA" } }, "none", BOTH],
  ["a list reference with a non-string $ref", { traits: { $ref: ["standard"] } }, "none", BOTH],
  ["an external traits list", { traits: { $ref: "./shared/message-traits.yaml#/lists/kafka" } }, null, []],
  ["a local list that points to an external one", { traits: { $ref: "#/components/x-trait-lists/external" } }, null, []],
];

const REQUIRED_TRAIT_NAME_CASES = [
  ["an escaped slash in the pointer matches a name with a slash", "audit/v2", { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, []],
  ["an escaped tilde in the pointer matches a name with a tilde", "tilde~key", { traits: [{ $ref: "#/components/messageTraits/tilde~0key" }] }, []],
  ["a percent-encoded space in the pointer matches a name with a space", "tracing v2", { traits: [{ $ref: "#/components/messageTraits/tracing%20v2" }] }, []],
  ["percent-encoded pointer segments", CH, { traits: [{ $ref: "#/components/message%54raits/common%48eaders" }] }, []],
  ["a required name written as an escaped token", "audit~1v2", { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, ["audit~1v2"]],
  ["required names compared with their case", "COMMONHEADERS,CommonHeaders", { traits: [traitRef(CH)] }, ["COMMONHEADERS", "CommonHeaders"]],
  ["a required trait whose name differs only in case from another one", "CommonHeaders", { traits: [traitRef("CommonHeaders")] }, []],
  ["every alias a chain passes through", "headersAlias,platformDefaults,commonHeaders", { traits: [traitRef("platformDefaults")] }, []],
  ["aliases that a chain does not pass through", "platformDefaults,headersAlias", { traits: [traitRef(CH)] }, ["platformDefaults", "headersAlias"]],
  ["a chain through pointers outside messageTraits", CH, { traits: [{ $ref: "#/components/x-aliases/headersTwice" }] }, []],
  ["a reference with a sibling description", CH, { traits: [{ $ref: "#/components/messageTraits/commonHeaders", description: "Shared headers." }] }, []],
  ["a pointer inside a trait", CH, { traits: [{ $ref: "#/components/messageTraits/commonHeaders/headers" }] }, [CH]],
  ["a pointer with a trailing slash", CH, { traits: [{ $ref: "#/components/messageTraits/commonHeaders/" }] }, [CH]],
  ["a pointer to the messageTraits map", CH, { traits: [{ $ref: "#/components/messageTraits" }] }, [CH]],
  ["a pointer to a trait that is not defined", "piiClassification", { traits: [traitRef("piiClassification"), traitRef(CH)] }, ["piiClassification"]],
  ["a reference to an empty required trait", "blank", { traits: [traitRef("blank")] }, ["blank"]],
  ["an alias of an empty required trait", "blankAlias,blank", { traits: [traitRef("blankAlias")] }, ["blankAlias", "blank"]],
  ["a reference to a null required trait", "nullTrait", { traits: [traitRef("nullTrait")] }, ["nullTrait"]],
  ["a dangling alias", "danglingAlias", { traits: [traitRef("danglingAlias")] }, ["danglingAlias"]],
  ["a cyclic chain", "cycleA,cycleB", { traits: [traitRef("cycleA")] }, ["cycleA", "cycleB"]],
  ["a local alias of an external trait, which applies both names", "sharedTracing,tracing", { traits: [traitRef("sharedTracing")] }, []],
  [
    "external references whose fragment is a trait pointer",
    "commonHeaders,tracing",
    { traits: [{ $ref: "./shared/message-traits.yaml#/components/messageTraits/commonHeaders" }, { $ref: "https://schemas.example.io/asyncapi/common.yaml#/components/messageTraits/tracing" }] },
    [],
  ],
  [
    "external fragments with escaped and percent-encoded names",
    "audit/v2,tracing v2",
    { traits: [{ $ref: "./shared/traits.yaml#/components/messageTraits/audit~1v2" }, { $ref: "./shared/traits.yaml#/components/messageTraits/tracing%20v2" }] },
    [],
  ],
  ["an external fragment inside a trait", CH, { traits: [{ $ref: "./shared/traits.yaml#/components/messageTraits/commonHeaders/headers" }] }, [CH]],
  ["external fragments outside components.messageTraits", CH, { traits: [{ $ref: "./shared/traits.yaml#/messageTraits/commonHeaders" }, { $ref: "./shared/traits.yaml#/x-traits/commonHeaders" }] }, [CH]],
  ["an external fragment without a leading slash", CH, { traits: [{ $ref: "./shared/traits.yaml#components/messageTraits/commonHeaders" }] }, [CH]],
  ["a malformed percent-encoded external fragment", CH, { traits: [{ $ref: "./shared/traits.yaml#/components/messageTraits/common%E0%A4%A" }] }, [CH]],
  ["external files named like the trait", CH, { traits: [{ $ref: "./traits/commonHeaders.yaml" }, { $ref: "./commonHeaders.yaml#" }] }, [CH]],
  ["inline traits named like the required ones", "commonHeaders,tracing", { traits: [{ name: CH, headers: { type: "object" } }, { "x-trait": TR, title: TR }] }, BOTH],
  ["a referenced list that lacks one required trait", "commonHeaders,tracing,kafkaKey", { traits: { $ref: "#/components/x-trait-lists/standard" } }, ["kafkaKey"]],
  ["a required trait applied twice", CH, { traits: [traitRef(CH), [traitRef(CH), {}]] }, []],
];

const REQUIRED_TRAIT_MESSAGES = {
  missing: () => "AAR073: Message must apply at least one trait.",
  notArray: () => "AAR073: Message 'traits' must be an array.",
  none: () => "AAR073: Message 'traits' must include at least one valid trait.",
  trait: (name) => `AAR073: Message must apply the trait '${name}'.`,
};

const byFinding = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);

const requiredTraitFindings = (base, kind) => (kind === null ? [] : [[kind === "missing" ? base : `${base}.traits`, REQUIRED_TRAIT_MESSAGES[kind]()]]);

const namedTraitFindings = (base, fields, missing) => {
  if (missing === "notArray") return [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.notArray()]];
  const at = Object.prototype.hasOwnProperty.call(fields, "traits") ? `${base}.traits` : base;
  return missing.map((name) => [at, REQUIRED_TRAIT_MESSAGES.trait(name)]).sort(byFinding);
};

const REQUIRED_TRAIT_PROBES = {
  noTraits: { fields: {}, state: "absent" },
  emptyList: { fields: { traits: [] }, state: "list", any: false, applied: [] },
  notList: { fields: { traits: { headers: { type: "object" } } }, state: "notArray" },
  headersOnly: { fields: { traits: [traitRef(CH)] }, state: "list", any: true, applied: [CH] },
  tracingOnly: { fields: { traits: [traitRef(TR)] }, state: "list", any: true, applied: [TR] },
  both: { fields: { traits: [traitRef(CH), traitRef(TR)] }, state: "list", any: true, applied: BOTH },
  all: { fields: { traits: [traitRef(CH), traitRef(TR), traitRef("kafkaKey")] }, state: "list", any: true, applied: [CH, TR, "kafkaKey"] },
  aliases: { fields: { traits: [traitRef("platformDefaults"), traitRef("sharedTracing")] }, state: "list", any: true, applied: ["platformDefaults", "headersAlias", CH, "sharedTracing", TR] },
  caseVariant: { fields: { traits: [traitRef("CommonHeaders")] }, state: "list", any: true, applied: ["CommonHeaders"] },
  escaped: { fields: { traits: [{ $ref: "#/components/messageTraits/audit~1v2" }] }, state: "list", any: true, applied: ["audit/v2"] },
  inline: { fields: { traits: [{ headers: { type: "object" } }] }, state: "list", any: true, applied: [] },
  dangling: { fields: { traits: [{ $ref: "#/components/x-missing/commonHeaders" }] }, state: "list", any: false, applied: [] },
};

const requiredTraitProbeFindings = (prefix, required = []) =>
  Object.entries(REQUIRED_TRAIT_PROBES)
    .flatMap(([key, probe]) => {
      const base = `${prefix}.${key}`;
      if (probe.state === "notArray") return [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.notArray()]];
      if (required.length === 0) {
        if (probe.state === "absent") return [[base, REQUIRED_TRAIT_MESSAGES.missing()]];
        return probe.any ? [] : [[`${base}.traits`, REQUIRED_TRAIT_MESSAGES.none()]];
      }
      const at = probe.state === "absent" ? base : `${base}.traits`;
      const applied = probe.applied || [];
      return required.filter((name) => !applied.includes(name)).map((name) => [at, REQUIRED_TRAIT_MESSAGES.trait(name)]);
    })
    .sort(byFinding);

const SHARED_REF = "./shared/message-traits.yaml#/components/messageTraits/tracing";

const REQUIRED_TRAIT_OPTIONS = [
  ["an empty string", "", []],
  ["a blank string", "  \t ", []],
  ["only commas and spaces", " , ,, ", []],
  ["a single name", "commonHeaders", [CH]],
  ["two padded names", " commonHeaders ,  tracing ", BOTH],
  ["the names in another order", "tracing,commonHeaders", [TR, CH]],
  ["duplicated names", "tracing,commonHeaders,tracing", [TR, CH]],
  ["empty entries between names", "commonHeaders,,tracing,", BOTH],
  ["a name surrounded by tabs and newlines", "\ttracing\n", [TR]],
  ["three names", "commonHeaders,tracing,kafkaKey", [CH, TR, "kafkaKey"]],
  ["a name with another case", "COMMONHEADERS", ["COMMONHEADERS"]],
  ["the name of a trait that differs only in case", "CommonHeaders", ["CommonHeaders"]],
  ["a name nobody applies", "piiClassification", ["piiClassification"]],
  ["a name with a slash", "audit/v2", ["audit/v2"]],
  ["a local $ref, which is a name and not a pointer", "#/components/messageTraits/commonHeaders", ["#/components/messageTraits/commonHeaders"]],
  ["an external $ref and a name", `${SHARED_REF}, commonHeaders`, [SHARED_REF, CH]],
  ["an escaped $ref", "#/components/messageTraits/audit~1v2", ["#/components/messageTraits/audit~1v2"]],
  ["a bare hash", "#", ["#"]],
  ["an array of names", [CH, TR], BOTH],
  ["an array of comma-separated lists", ["commonHeaders, tracing", "kafkaKey"], [CH, TR, "kafkaKey"]],
  ["an array with duplicated and padded names", [" tracing", "tracing ", "commonHeaders,tracing"], [TR, CH]],
  ["an array with non-string items", [null, 42, "tracing", {}, ["commonHeaders"]], [TR]],
  ["an array of blank strings", [" ", "", " , "], []],
  ["an empty array", [], []],
  ["null", null, []],
  ["a number", 42, []],
  ["true", true, []],
  ["false", false, []],
  ["an object", { commonHeaders: true }, []],
];

module.exports = {
  CH,
  TR,
  BOTH,
  REQUIRED_TRAIT_COMPONENTS,
  REQUIRED_TRAIT_CASES,
  REQUIRED_TRAIT_NAME_CASES,
  REQUIRED_TRAIT_MESSAGES,
  byFinding,
  requiredTraitFindings,
  namedTraitFindings,
  REQUIRED_TRAIT_PROBES,
  requiredTraitProbeFindings,
  REQUIRED_TRAIT_OPTIONS,
};
