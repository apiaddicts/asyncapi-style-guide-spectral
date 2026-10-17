const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  ACTION_V2: ACTION,
  atOf,
  messagesFor,
  findingsFor,
  traitRef,
  channelRef,
  shapesFor,
  operationComponentsFor,
  VALUE_CASES,
  traitOnlyCases,
  traitOverrideCases,
  operationObjectCasesV2,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar092-operation-attributes-required");
const okExample = require("./AAR092/ok-example");
const failExample = require("./AAR092/fail-example");
const failSharedRef = require("./AAR092/fail-shared-ref");
const okStructuralEdges = require("./AAR092/ok-structural-edges");
const failLargeGenerated = require("./AAR092/fail-large-generated");

const RULE = "asa:AAR092";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const AT = atOf(2);
const MSG = messagesFor(2);
const findings = findingsFor(2);
const v3Findings = findingsFor(3);
const { complete, minimal } = shapesFor(2);
const COMPONENTS = operationComponentsFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const atOperation = (expected) => expected.map(([path, kind]) => [path.replace(/^@/, AT), kind, NAME, ACTION]);

const FAIL = findings([
  ["channels.payments.cdc.noSummary.v1.publish", "missing", "payments.cdc.noSummary.v1", "publish"],
  ["channels.payments.cdc.bothMissing.v1.publish", "missing", "payments.cdc.bothMissing.v1", "publish"],
  ["channels.payments.cdc.bothMissing.v1.subscribe", "missing", "payments.cdc.bothMissing.v1", "subscribe"],
  ["channels.payments.cdc.blankSummary.v1.subscribe.summary", "empty", "payments.cdc.blankSummary.v1", "subscribe"],
  ["channels.payments.cdc.nullSummary.v1.subscribe.summary", "empty", "payments.cdc.nullSummary.v1", "subscribe"],
  ["channels.payments.cdc.zeroWidthSummary.v1.publish.summary", "empty", "payments.cdc.zeroWidthSummary.v1", "publish"],
  ["channels.payments.cdc.emptyOperation.v1.subscribe", "missing", "payments.cdc.emptyOperation.v1", "subscribe"],
  ["channels.payments.cdc.nullOperation.v1.publish", "unusable", "payments.cdc.nullOperation.v1", "publish"],
  ["channels.payments.cdc.stringOperation.v1.subscribe", "unusable", "payments.cdc.stringOperation.v1", "subscribe"],
  ["channels.payments.cdc.listOperation.v1.publish", "unusable", "payments.cdc.listOperation.v1", "publish"],
  ["channels.payments.cdc.v3Style.v1.subscribe", "missing", "payments.cdc.v3Style.v1", "subscribe"],
  ["channels.payments.cdc.extensionsOnly.v1.publish", "missing", "payments.cdc.extensionsOnly.v1", "publish"],
  ["channels.payments.cdc.descriptionOnly.v1.publish", "missing", "payments.cdc.descriptionOnly.v1", "publish"],
  ["components.operationTraits.blankSummary.summary", "empty", "payments.cdc.traitBlankOverOwn.v1", "subscribe"],
  ["channels.payments.cdc.traitsLastBlank.v1.subscribe.traits.1.summary", "empty", "payments.cdc.traitsLastBlank.v1", "subscribe"],
  ["channels.x-payments.cdc.partner.v1.publish", "missing", "x-payments.cdc.partner.v1", "publish"],
  ["channels.stores/{storeId}/terminals/{terminalId}.subscribe", "missing", "stores/{storeId}/terminals/{terminalId}", "subscribe"],
  ["components.channels.refundsShared.publish", "missing", "refundsShared", "publish"],
  ["components.channels.archiveShared.subscribe.summary", "empty", "archiveShared", "subscribe"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1.publish", "missing", "payments.partner.v1", "publish"],
  ["components.channels.sellerHub.publish", "missing", "sellerHub", "publish"],
  ["components.channels.hop2.subscribe", "missing", "hop2", "subscribe"],
  ["components.channels.seller/eu~dr.publish.summary", "empty", "seller/eu~dr", "publish"],
  ["components.channels.latin america.subscribe", "missing", "latin america", "subscribe"],
  ["components.channels.espa\u00f1a.publish.summary", "empty", "espa\u00f1a", "publish"],
  ["x-channel-list.0.publish", "missing", "0", "publish"],
  ["components.x-operations.withoutSummary", "missing", "operationRefs", "subscribe"],
  ["components.x-operations.withoutSummaryToo", "missing", "operationRefChained", "publish"],
  ["channels.operationRefDangling.publish", "unusable", "operationRefDangling", "publish"],
  ["components.x-operations.loopB", "unusable", "operationRefCycle", "publish"],
  ["info", "missing", "operationRefToInfo", "subscribe"],
  ["components.x-operations.bare", "missing", "operationRefSiblings", "publish"],
  ["channels.fieldRefs.subscribe.summary", "empty", "fieldRefs", "subscribe"],
  ["components.operationTraits.blank.summary", "empty", "traitListRef", "subscribe"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withOperation = (operation) => base({ [NAME]: { description: "Orders placed.", [ACTION]: operation } });

describe("AAR092 (AsyncAPI 2.x): every publish and subscribe operation must populate its summary", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose operations carry a summary, directly, through traits, through references and with oneOf, Avro payloads, parameters and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every missing, empty or unusable operation of channels and components.channels with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("applies the 2.x fields whenever the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", "v3.0.0", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("checks the operations map for action, channel and summary when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(
        base({ [NAME]: { description: "Orders.", [ACTION]: {}, publish: { summary: "" } } }, { operations: { modern: { action: "send", channel: channelRef(NAME), summary: "Orders." }, empty: {} } }),
        version
      );
      expect(findingsOf(await linter.run(doc))).toEqual(
        v3Findings([
          ["operations.empty", "missing", "empty", "action"],
          ["operations.empty", "missing", "empty", "channel"],
          ["operations.empty", "missing", "empty", "summary"],
        ])
      );
    }
  });

  test("reports with the error severity and one finding per problem", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the operation and the channel in every message", async () => {
    expect(findingsOf(await linter.run(base({ [NAME]: { publish: { operationId: "publishOrder" }, subscribe: { summary: "" } } })))).toEqual([
      [`channels.${NAME}.publish`, `AAR092: The publish operation of channel '${NAME}' must declare 'summary'.`],
      [`${AT}.summary`, `AAR092: The 'summary' of the subscribe operation of channel '${NAME}' must not be empty.`],
    ]);
    expect(findingsOf(await linter.run(withOperation(null)))).toEqual([[AT, `AAR092: The subscribe operation of channel '${NAME}' must be an object declaring 'summary'.`]]);
  });

  describe("field values", () => {
    test.each(VALUE_CASES)("summary set to %s", async (_, value, populated) => {
      for (const action of ["publish", "subscribe"]) {
        const expected = populated ? [] : [[`channels.${NAME}.${action}.summary`, MSG.empty(NAME, action)]];
        expect(findingsOf(await linter.run(base({ [NAME]: { description: "Orders placed.", [action]: { operationId: "order", summary: value } } })))).toEqual(expected);
      }
    });

    test.each(VALUE_CASES)("action, channel, title, description, tags, bindings, traits, message and extensions set to %s are never required", async (_, value) => {
      const operation = { ...minimal, action: value, channel: value, title: value, description: value, tags: value, externalDocs: value, bindings: value, traits: value, message: value, "x-summary": value };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual([]);
    });
  });

  describe("summary inherited from operation traits", () => {
    test.each(traitOnlyCases())("an operation without summary and %s", async (_, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ operationId: "receiveOrderPlaced", traits })))).toEqual(findings(atOperation(expected)));
    });

    test.each(traitOverrideCases(2))("%s: the traits override the operation", async (_, summary, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ summary, traits })))).toEqual(findings(atOperation(expected)));
    });

    test("a trait shared by several operations is reported once per operation that inherits its blank summary", async () => {
      const doc = base({ first: { publish: { traits: [traitRef("blank")] }, subscribe: { summary: "Own.", traits: [traitRef("blankAlias")] } }, second: { subscribe: { summary: "Own.", traits: [traitRef("summary")] } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operationTraits.blank.summary", "empty", "first", "publish"],
          ["components.operationTraits.blank.summary", "empty", "first", "subscribe"],
        ])
      );
    });
  });

  describe("operation object", () => {
    test.each(operationObjectCasesV2())("%s", async (_, operation, expected) => {
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(expected));
    });

    test("checks publish and subscribe independently and never other operation keys", async () => {
      const doc = base({ [NAME]: { publish: {}, subscribe: minimal, Publish: {}, SUBSCRIBE: {}, send: {}, receive: {}, "x-publish": {}, operations: { a: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([[`channels.${NAME}.publish`, "missing", NAME, "publish"]]));
    });

    test("a channel without operations, or whose value is not a usable channel, reports nothing", async () => {
      const doc = base({ silent: { description: "Orders." }, nothing: null, text: "orders", list: [{ publish: {} }], dangling: { $ref: "#/components/channels/missing" }, cyclic: { $ref: "#/x-loop" } }, { "x-loop": { $ref: "#/x-loop" } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("checks the same operations under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { publish: { summary: "" }, subscribe: complete }, gone: { subscribe: null }, fine: { publish: minimal } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared.publish.summary", "empty", "shared", "publish"],
          ["components.channels.gone.subscribe", "unusable", "gone", "subscribe"],
        ])
      );
    });

    test("checks an operation reached through a channel reference once, at the channel definition and with its name", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders" } },
        { components: { ...COMPONENTS, channels: { orders: { description: "Orders.", subscribe: { operationId: "receiveOrders" } } } } }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders.subscribe", "missing", "orders", "subscribe"]]));
    });

    test("never inspects the operations and components.operations maps of AsyncAPI 3.x", async () => {
      const doc = base({ [NAME]: { publish: minimal } }, { operations: { blank: { action: "", channel: {}, summary: "" }, empty: {} }, components: { ...COMPONENTS, operations: { empty: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });
  });

  describe("channels and components maps", () => {
    test("a document without channels or components.channels reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "2.6.0", info: { title: "Quality Order Events", version: "4.2.0" } }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["retail.cdc.orders.placed.v1"], [42], [true]])("skips a channels, components or components.channels value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { channels: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows a channels map, a components object and a components.channels map given as local references", async () => {
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { publish: {} }, local: { subscribe: complete } } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner.publish", "missing", "partner", "publish"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { subscribe: { summary: " " } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.subscribe.summary", "empty", "dr", "subscribe"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { publish: { operationId: "lab" } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.publish", "missing", "lab", "publish"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { subscribe: {} } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab.subscribe", "missing", "lab", "subscribe"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are addresses and not extensions in these maps", async () => {
      const doc = base({ "x-edge.orders": { publish: {} } }, { components: { ...COMPONENTS, channels: { "x-mirror": { subscribe: { summary: "" } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders.publish", "missing", "x-edge.orders", "publish"],
          ["components.channels.x-mirror.subscribe.summary", "empty", "x-mirror", "subscribe"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { subscribe: { summary: "" } }, "orders~1eu": { publish: {} }, "a/b~c": { subscribe: null } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.subscribe.summary", "empty", "stores/{storeId}/orders", "subscribe"],
          ["channels.orders~1eu.publish", "missing", "orders~1eu", "publish"],
          ["channels.a/b~c.subscribe", "unusable", "a/b~c", "subscribe"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { publish: {} }, constructor: { subscribe: { operationId: "c" } }, toString: { publish: complete }, valueOf: { publish: minimal, subscribe: { summary: null } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels..publish", "missing", "", "publish"],
          ["channels.constructor.subscribe", "missing", "constructor", "subscribe"],
          ["channels.valueOf.subscribe.summary", "empty", "valueOf", "subscribe"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { publish: {} }, "tab\tbed": { subscribe: "x" }, "zero\u200bwidth": { subscribe: { summary: "" } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced.publish", "missing", "orders\nplaced", "publish"],
          ["channels.tab\tbed.subscribe", "unusable", "tab\tbed", "subscribe"],
          ["channels.zero\u200bwidth.subscribe.summary", "empty", "zero\u200bwidth", "subscribe"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR092: The publish operation of channel 'orders\\nplaced' must declare 'summary'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: the summary stays the only mandatory field", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...minimal, description: "", operationId: "", tags: [] })))).toEqual([]);
    });
  });

  test("validates operations of shared channels once at the channel definition, follows chained, escaped, percent-encoded, field, trait and operation references, skips external ones and reports dangling and cyclic operation references", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects publish and subscribe of channels and components.channels: x-channels maps, 3.x operations, unreferenced traits, messages, parameters and schemas are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ channels: { a: { publish: {} } } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", channels: { a: { publish: {} } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
