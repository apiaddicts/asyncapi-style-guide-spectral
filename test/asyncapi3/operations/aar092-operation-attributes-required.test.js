const { linterForRule } = require("../../helpers/utils");
const {
  FIELDS_V3: FIELDS,
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  allMissingFor,
  traitRef,
  channelRef,
  CHANNELS_V3,
  shapesFor,
  operationComponentsFor,
  CHANNEL_REF_CASES,
  ACTION_VALUE_CASES,
  VALUE_CASES,
  traitOnlyCases,
  traitOverrideCases,
  operationObjectCasesV3,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar092-operation-attributes-required");
const okExample = require("./AAR092/ok-example");
const failExample = require("./AAR092/fail-example");
const failSharedRef = require("./AAR092/fail-shared-ref");
const okStructuralEdges = require("./AAR092/ok-structural-edges");
const failLargeGenerated = require("./AAR092/fail-large-generated");

const RULE = "asa:AAR092";
const OMIT = Symbol("omit");
const NAME = NAMES[3];
const AT = atOf(3);
const MSG = messagesFor(3);
const findings = findingsFor(3);
const v2Findings = findingsFor(2);
const allMissing = allMissingFor(3);
const { complete, minimal } = shapesFor(3);
const COMPONENTS = operationComponentsFor(3);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const atOperation = (expected) => expected.map(([path, kind]) => [path.replace(/^@/, AT), kind, NAME, "summary"]);

const FAIL = findings([
  ["operations.noAction", "missing", "noAction", "action"],
  ["operations.nullAction.action", "empty", "nullAction", "action"],
  ["operations.blankAction.action", "empty", "blankAction", "action"],
  ["operations.noChannel", "missing", "noChannel", "channel"],
  ["operations.danglingChannel.channel", "empty", "danglingChannel", "channel"],
  ["operations.emptyChannelRef.channel", "empty", "emptyChannelRef", "channel"],
  ["operations.cyclicChannel.channel", "empty", "cyclicChannel", "channel"],
  ["operations.noSummary", "missing", "noSummary", "summary"],
  ["operations.emptySummary.summary", "empty", "emptySummary", "summary"],
  ["operations.zeroWidthSummary.summary", "empty", "zeroWidthSummary", "summary"],
  ...allMissing("operations.emptyOperation", "emptyOperation"),
  ["operations.v2Style", "missing", "v2Style", "action"],
  ["operations.v2Style", "missing", "v2Style", "channel"],
  ...allMissing("operations.lookAlikes", "lookAlikes"),
  ...allMissing("operations.upperCase", "upperCase"),
  ...allMissing("operations.extensionsOnly", "extensionsOnly"),
  ["operations.summaryInDescription", "missing", "summaryInDescription", "summary"],
  ["operations.ownBlankOverTrait.summary", "empty", "ownBlankOverTrait", "summary"],
  ["components.operationTraits.blankSummary.summary", "empty", "traitBlank", "summary"],
  ["operations.traitsLastBlank.traits.1.summary", "empty", "traitsLastBlank", "summary"],
  ["operations.traitActionOnly", "missing", "traitActionOnly", "action"],
  ["operations.traitActionOnly", "missing", "traitActionOnly", "channel"],
  ["operations.replyOnly", "missing", "replyOnly", "channel"],
  ["operations.nullOperation", "unusable", "nullOperation"],
  ["operations.stringOperation", "unusable", "stringOperation"],
  ["operations.listOperation", "unusable", "listOperation"],
  ["operations.x-partnerSync", "missing", "x-partnerSync", "summary"],
  ["components.operations.sharedHub", "missing", "sharedHub", "channel"],
  ["components.operations.legacyReplay.action", "empty", "legacyReplay", "action"],
  ["components.operations.legacyReplay.channel", "empty", "legacyReplay", "channel"],
  ["components.operations.legacyReplay.summary", "empty", "legacyReplay", "summary"],
  ["components.operations.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["operations.partner", "missing", "partner", "summary"],
  ["components.operations.carrierHub", "missing", "carrierHub", "channel"],
  ["components.operations.hop2", "missing", "hop2", "summary"],
  ["components.operations.carrier/eu~dr.action", "empty", "carrier/eu~dr", "action"],
  ["components.operations.north america", "missing", "north america", "action"],
  ["components.operations.recepci\u00f3n.summary", "empty", "recepci\u00f3n", "summary"],
  ["operations.dangling", "unusable", "dangling"],
  ["components.operations.loopA", "unusable", "loopA"],
  ["components.operations.loopB", "unusable", "loopB"],
  ["operations.selfLoop", "unusable", "selfLoop"],
  ["components.operations.sparseShared", "missing", "sparseShared", "summary"],
  ...allMissing("channels.shipments", "shipments"),
  ["operations.toRoot", "unusable", "toRoot"],
  ["operations.nonStringRef", "unusable", "nonStringRef"],
  ["operations.emptyRef", "unusable", "emptyRef"],
  ["operations.badPointer", "unusable", "badPointer"],
  ["operations.badEncoding", "unusable", "badEncoding"],
  ["operations.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.operations.nullShared", "unusable", "nullShared"],
  ["x-operation-list.0", "missing", "0", "summary"],
  ["operations.fieldRefs.action", "empty", "fieldRefs", "action"],
  ["operations.fieldRefs.channel", "empty", "fieldRefs", "channel"],
  ["operations.fieldRefs.summary", "empty", "fieldRefs", "summary"],
]);

const base = (operations, extra = {}) => ({
  asyncapi: "3.0.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
  channels: CHANNELS_V3,
  ...(operations === OMIT ? {} : { operations }),
  components: COMPONENTS,
  ...extra,
});
const withOperation = (operation) => base({ [NAME]: operation });
const { summary: _summary, ...withoutSummary } = minimal;

describe("AAR092 (AsyncAPI 3.x): every operation must populate action, channel and summary", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose operations populate action, channel and summary, with summaries from traits, replies, multi-format payloads, parameters without schema and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every missing, empty or unusable operation field of operations and components.operations with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("requires action, channel and summary whenever the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "10"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("checks the summary of the publish and subscribe operations of channels instead when the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2.6.0", "2.0.0", "latest", "v3.0.0", "", null]) {
      const doc = withVersion(
        base({ [NAME]: {}, other: { action: "" } }, { channels: { legacy: { description: "Orders.", subscribe: { operationId: "receiveOrder" }, publish: { summary: "Publish orders." } }, modern: { address: "orders", messages: {} } } }),
        version
      );
      expect(findingsOf(await linter.run(doc))).toEqual(v2Findings([["channels.legacy.subscribe", "missing", "legacy", "subscribe"]]));
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the operation and the field in every message", async () => {
    expect(findingsOf(await linter.run(withOperation({ action: null, summary: "Orders." })))).toEqual([
      [AT, "AAR092: Operation 'sendOrderPlaced' must declare 'channel'."],
      [`${AT}.action`, "AAR092: The 'action' of operation 'sendOrderPlaced' must not be empty."],
    ]);
    expect(findingsOf(await linter.run(withOperation(null)))).toEqual([[AT, "AAR092: Operation 'sendOrderPlaced' must be an object declaring 'action', 'channel' and 'summary'."]]);
  });

  describe("field values", () => {
    const FIELD_CASES = VALUE_CASES.flatMap(([label, value, populated]) => FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`${AT}.${field}`, MSG.empty(NAME, field)]];
      expect(findingsOf(await linter.run(withOperation({ ...minimal, [field]: value })))).toEqual(expected);
    });

    test.each(VALUE_CASES)("action, channel and summary all set to %s", async (_, value, populated) => {
      const expected = populated ? [] : findings(FIELDS.map((field) => [`${AT}.${field}`, "empty", NAME, field]));
      expect(findingsOf(await linter.run(withOperation({ action: value, channel: value, summary: value })))).toEqual(expected);
    });

    test.each(ACTION_VALUE_CASES)("action set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [[`${AT}.action`, MSG.empty(NAME, "action")]];
      expect(findingsOf(await linter.run(withOperation({ ...minimal, action: value })))).toEqual(expected);
    });

    test.each(CHANNEL_REF_CASES)("channel set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [[`${AT}.channel`, MSG.empty(NAME, "channel")]];
      expect(findingsOf(await linter.run(withOperation({ ...minimal, channel: value })))).toEqual(expected);
    });

    test("a channel reference that points back to the operation's own channel field is cyclic and reported as empty", async () => {
      expect(findingsOf(await linter.run(withOperation({ ...minimal, channel: { $ref: `#/operations/${NAME}/channel` } })))).toEqual([[`${AT}.channel`, MSG.empty(NAME, "channel")]]);
    });

    test.each(VALUE_CASES)("title, description, security, tags, externalDocs, bindings, traits, messages, reply and extensions set to %s are never required", async (_, value) => {
      const operation = { ...minimal, title: value, description: value, security: value, tags: value, externalDocs: value, bindings: value, traits: value, messages: value, reply: value, "x-summary": value };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual([]);
    });
  });

  describe("summary inherited from operation traits", () => {
    test.each(traitOnlyCases())("an operation without summary and %s", async (_, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ ...withoutSummary, traits })))).toEqual(findings(atOperation(expected)));
    });

    test.each(traitOverrideCases(3))("%s: the operation wins over its traits", async (_, summary, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ ...withoutSummary, summary, traits })))).toEqual(findings(atOperation(expected)));
    });

    test("a trait never supplies action or channel, even when it declares them", async () => {
      expect(findingsOf(await linter.run(withOperation({ traits: [traitRef("withActionAndChannel"), traitRef("summary")] })))).toEqual(
        findings([
          [AT, "missing", NAME, "action"],
          [AT, "missing", NAME, "channel"],
        ])
      );
    });

    test("a trait shared by several operations is reported once per operation that inherits its blank summary", async () => {
      const doc = base({ first: { ...withoutSummary, traits: [traitRef("blank")] }, second: { ...withoutSummary, traits: [traitRef("blankAlias")] }, third: { ...minimal, traits: [traitRef("blank")] } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operationTraits.blank.summary", "empty", "first", "summary"],
          ["components.operationTraits.blank.summary", "empty", "second", "summary"],
        ])
      );
    });
  });

  describe("operation object", () => {
    test.each(operationObjectCasesV3())("%s", async (_, operation, expected) => {
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.operations, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, operations: { shared: { action: "receive", channel: {} }, gone: null, fine: complete } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operations.shared.channel", "empty", "shared", "channel"],
          ["components.operations.shared", "missing", "shared", "summary"],
          ["components.operations.gone", "unusable", "gone"],
        ])
      );
    });

    test("checks an operation once at its definition, whether operations or other components point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/operations/orders" }, ordersAgain: { $ref: "#/components/operations/orders" } },
        { components: { ...COMPONENTS, operations: { orders: { action: "send", channel: channelRef("orders") }, mirror: { $ref: "#/operations/orders" } } } }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.operations.orders", "missing", "orders", "summary"]]));
    });

    test("never inspects channels, replies, reply addresses, components.replies, operation traits on their own or 2.x publish and subscribe operations", async () => {
      const doc = base(
        { orders: complete },
        {
          channels: { ...CHANNELS_V3, legacy: { publish: {}, subscribe: { summary: "" } } },
          components: { ...COMPONENTS, replies: { inline: { channel: {}, messages: [] } }, replyAddresses: { blank: { location: "" } }, operationTraits: { ...COMPONENTS.operationTraits, orphan: { summary: "" } } },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });
  });

  describe("operations and components maps", () => {
    test("a document without operations or components.operations reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "3.0.0", info: { title: "Quality Order Events", version: "4.2.0" }, channels: {} }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["sendOrderPlaced"], [42], [true]])("skips an operations, components or components.operations value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { operations: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows an operations map, a components object and a components.operations map given as local references", async () => {
      const viaOperations = base({ $ref: "#/x-operation-map" }, { "x-operation-map": { partner: { action: "send", channel: channelRef("orders") }, local: complete } });
      expect(findingsOf(await linter.run(viaOperations))).toEqual(findings([["x-operation-map.partner", "missing", "partner", "summary"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { operations: { dr: { channel: channelRef("orders"), summary: "Dr." } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.operations.dr", "missing", "dr", "action"]]));
      const operationsMapRef = base(OMIT, { components: { operations: { $ref: "#/x-shared" } }, "x-shared": { lab: { action: "", channel: channelRef("orders"), summary: "Lab." } } });
      expect(findingsOf(await linter.run(operationsMapRef))).toEqual(findings([["x-shared.lab.action", "empty", "lab", "action"]]));
    });

    test("checks an operations map shared by operations and components.operations once", async () => {
      const doc = base({ $ref: "#/components/operations" }, { components: { ...COMPONENTS, operations: { lab: { action: "send", channel: channelRef("orders") } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.operations.lab", "missing", "lab", "summary"]]));
    });

    test("ignores an operations map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./operations.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { operations: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/operations" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { operations: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("operation names", () => {
    test("checks operations whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { action: "send", channel: channelRef("orders") } }, { components: { ...COMPONENTS, operations: { "x-mirror": { channel: channelRef("orders"), summary: "Mirror." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.x-edge", "missing", "x-edge", "summary"],
          ["components.operations.x-mirror", "missing", "x-mirror", "action"],
        ])
      );
    });

    test("reports operations whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { ...minimal, action: "" }, "orders~0dr": {}, "a/b~c": { action: "send", channel: channelRef("orders") }, "orders.placed.v1": { action: "send", summary: "Orders." } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.eu~1west.action", "empty", "eu~1west", "action"],
          ...allMissing("operations.orders~0dr", "orders~0dr"),
          ["operations.a/b~c", "missing", "a/b~c", "summary"],
          ["operations.orders.placed.v1", "missing", "orders.placed.v1", "channel"],
        ])
      );
    });

    test("checks an empty operation key and operations named like Object members", async () => {
      const doc = base({ "": { action: "send", channel: channelRef("orders") }, constructor: { channel: channelRef("orders"), summary: "C." }, toString: complete, valueOf: { action: "send", summary: "V." } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.", "missing", "", "summary"],
          ["operations.constructor", "missing", "constructor", "action"],
          ["operations.valueOf", "missing", "valueOf", "channel"],
        ])
      );
    });

    test("escapes control and invisible characters of operation names so every message stays on one line", async () => {
      const doc = base({ "send\norders": { action: "send" }, "tab\tbed": null, "zero\u200bwidth": { ...minimal, summary: "" } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["operations.send\norders", "missing", "send\norders", "channel"],
          ["operations.send\norders", "missing", "send\norders", "summary"],
          ["operations.tab\tbed", "unusable", "tab\tbed"],
          ["operations.zero\u200bwidth.summary", "empty", "zero\u200bwidth", "summary"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR092: Operation 'send\\norders' must declare 'channel'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: action, channel and summary stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...minimal, title: "", description: "", tags: [] })))).toEqual([]);
    });
  });

  test("validates a shared operation once at its definition, follows chained, escaped, percent-encoded and field references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects operations and components.operations: channels, replies, reply addresses, x-operations maps, unreferenced traits, messages and schemas are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ operations: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", operations: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
