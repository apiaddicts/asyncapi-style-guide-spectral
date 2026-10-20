const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  ACTION_V2: ACTION,
  atOf,
  messagesFor,
  findingsFor,
  ORDER_PLACED,
  traitRef,
  messageRef,
  wrapperRef,
  shapesFor,
  operationComponentsFor,
  ENTRY_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  traitCases,
  operationObjectCasesFor,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar095-operation-messages-required");
const okExample = require("./AAR095/ok-example");
const failExample = require("./AAR095/fail-example");
const failSharedRef = require("./AAR095/fail-shared-ref");
const okStructuralEdges = require("./AAR095/ok-structural-edges");
const failLargeGenerated = require("./AAR095/fail-large-generated");

const RULE = "asa:AAR095";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const AT = atOf(2);
const MSG = messagesFor(2);
const findings = findingsFor(2);
const v3Findings = findingsFor(3);
const { complete, minimal, bare } = shapesFor(2);
const COMPONENTS = operationComponentsFor(2);
const USABLE = messageRef("orderPlaced");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const atOperation = (expected) => expected.map(([path, kind]) => [path.replace(/^@/, AT), kind, NAME, ACTION]);

const FAIL = findings([
  ["channels.payments.cdc.noMessage.v1.publish", "missing", "payments.cdc.noMessage.v1", "publish"],
  ["channels.payments.cdc.emptyOneOf.v1.subscribe.message", "empty", "payments.cdc.emptyOneOf.v1", "subscribe"],
  ["channels.payments.cdc.nullMessage.v1.publish.message", "empty", "payments.cdc.nullMessage.v1", "publish"],
  ["channels.payments.cdc.danglingMessage.v1.subscribe.message", "empty", "payments.cdc.danglingMessage.v1", "subscribe"],
  ["channels.payments.cdc.nullItems.v1.publish.message", "empty", "payments.cdc.nullItems.v1", "publish"],
  ["channels.payments.cdc.scalarItems.v1.subscribe.message", "empty", "payments.cdc.scalarItems.v1", "subscribe"],
  ["channels.payments.cdc.listMessage.v1.publish.message", "empty", "payments.cdc.listMessage.v1", "publish"],
  ["channels.payments.cdc.stringMessage.v1.subscribe.message", "empty", "payments.cdc.stringMessage.v1", "subscribe"],
  ["channels.payments.cdc.pluralMessages.v1.publish", "missing", "payments.cdc.pluralMessages.v1", "publish"],
  ["channels.payments.cdc.traitOnly.v1.subscribe", "missing", "payments.cdc.traitOnly.v1", "subscribe"],
  ["channels.payments.cdc.extension.v1.publish", "missing", "payments.cdc.extension.v1", "publish"],
  ["channels.payments.cdc.upperCase.v1.subscribe", "missing", "payments.cdc.upperCase.v1", "subscribe"],
  ["channels.payments.cdc.bindingsOnly.v1.publish", "missing", "payments.cdc.bindingsOnly.v1", "publish"],
  ["channels.payments.cdc.emptyWrapperRef.v1.subscribe.message", "empty", "payments.cdc.emptyWrapperRef.v1", "subscribe"],
  ["channels.payments.cdc.cyclicWrappers.v1.publish.message", "empty", "payments.cdc.cyclicWrappers.v1", "publish"],
  ["channels.payments.cdc.oneOfDanglingList.v1.subscribe.message", "empty", "payments.cdc.oneOfDanglingList.v1", "subscribe"],
  ["channels.payments.cdc.bothMissing.v1.publish", "missing", "payments.cdc.bothMissing.v1", "publish"],
  ["channels.payments.cdc.bothMissing.v1.subscribe.message", "empty", "payments.cdc.bothMissing.v1", "subscribe"],
  ["channels.payments.cdc.oneUsable.v1.subscribe", "missing", "payments.cdc.oneUsable.v1", "subscribe"],
  ["channels.payments.cdc.nullOperation.v1.publish", "unusable", "payments.cdc.nullOperation.v1", "publish"],
  ["channels.payments.cdc.stringOperation.v1.subscribe", "unusable", "payments.cdc.stringOperation.v1", "subscribe"],
  ["channels.payments.cdc.listOperation.v1.publish", "unusable", "payments.cdc.listOperation.v1", "publish"],
  ["channels.payments.cdc.v3Style.v1.subscribe", "missing", "payments.cdc.v3Style.v1", "subscribe"],
  ["channels.x-payments.cdc.partner.v1.publish", "missing", "x-payments.cdc.partner.v1", "publish"],
  ["channels.terminals/{terminalId}/payments.subscribe.message", "empty", "terminals/{terminalId}/payments", "subscribe"],
  ["components.channels.refundsShared.publish", "missing", "refundsShared", "publish"],
  ["components.channels.archiveShared.subscribe.message", "empty", "archiveShared", "subscribe"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1.publish", "missing", "payments.partner.v1", "publish"],
  ["components.channels.sellerHub.publish", "missing", "sellerHub", "publish"],
  ["components.channels.hop2.subscribe.message", "empty", "hop2", "subscribe"],
  ["components.channels.seller/eu~dr.publish.message", "empty", "seller/eu~dr", "publish"],
  ["components.channels.latin america.subscribe", "missing", "latin america", "subscribe"],
  ["components.channels.espa\u00f1a.publish.message", "empty", "espa\u00f1a", "publish"],
  ["x-channel-list.0.publish", "missing", "0", "publish"],
  ["components.x-operations.withoutMessage", "missing", "operationRefs", "subscribe"],
  ["components.x-operations.emptyMessage.message", "empty", "operationRefChained", "publish"],
  ["channels.operationRefDangling.publish", "unusable", "operationRefDangling", "publish"],
  ["components.x-operations.loopB", "unusable", "operationRefCycle", "publish"],
  ["info", "missing", "operationRefToInfo", "subscribe"],
  ["components.x-operations.bare", "missing", "operationRefSiblings", "publish"],
  ["channels.messageToText.publish.message", "empty", "messageToText", "publish"],
  ["channels.messageCyclic.subscribe.message", "empty", "messageCyclic", "subscribe"],
  ["channels.messageSelf.publish.message", "empty", "messageSelf", "publish"],
  ["channels.messageToRoot.subscribe.message", "empty", "messageToRoot", "subscribe"],
  ["channels.messageBadPointer.publish.message", "empty", "messageBadPointer", "publish"],
  ["channels.messageThroughIntermediate.subscribe.message", "empty", "messageThroughIntermediate", "subscribe"],
  ["channels.messageNonString.publish.message", "empty", "messageNonString", "publish"],
  ["channels.wrapperEmpty.publish.message", "empty", "wrapperEmpty", "publish"],
  ["channels.wrapperCyclic.subscribe.message", "empty", "wrapperCyclic", "subscribe"],
  ["channels.oneOfListEmpty.subscribe.message", "empty", "oneOfListEmpty", "subscribe"],
  ["channels.oneOfListCyclic.publish.message", "empty", "oneOfListCyclic", "publish"],
  ["channels.traitsWithMessage.publish", "missing", "traitsWithMessage", "publish"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withOperation = (operation, channel = {}) => base({ [NAME]: { description: "Orders placed.", ...channel, [ACTION]: operation } });
const withComponents = (extra) => ({ ...COMPONENTS, ...extra });

describe("AAR095 (AsyncAPI 2.x): every publish and subscribe operation must declare at least one message", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose operations declare messages inline, through oneOf, wrappers, lists, escaped, encoded, shared and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every publish and subscribe operation of channels and components.channels without a usable message with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("checks publish and subscribe whenever the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", "v3.0.0", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("checks the operations map instead when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(base({ [NAME]: { description: "Orders.", [ACTION]: {}, publish: { message: { oneOf: [] } } } }, { operations: { modern: { action: "send", messages: [USABLE] }, empty: {} } }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(v3Findings([["operations.empty", "missing", "empty"]]));
    }
  });

  test("reports with the error severity and one finding per problem", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the operation and the channel in every message", async () => {
    expect(findingsOf(await linter.run(base({ [NAME]: { publish: { operationId: "publishOrder" }, subscribe: { message: { oneOf: [] } } } })))).toEqual([
      [`channels.${NAME}.publish`, `AAR095: The publish operation of channel '${NAME}' must declare a 'message'.`],
      [`${AT}.message`, `AAR095: The 'message' of the subscribe operation of channel '${NAME}' must declare at least one message.`],
    ]);
    expect(findingsOf(await linter.run(withOperation(null)))).toEqual([[AT, `AAR095: The subscribe operation of channel '${NAME}' must be an object declaring a 'message'.`]]);
  });

  describe("message values", () => {
    test.each([...ENTRY_VALUE_CASES, ...MESSAGE_VALUE_CASES])("message set to %s", async (_, value, usable) => {
      for (const action of ["publish", "subscribe"]) {
        const expected = usable ? [] : [[`channels.${NAME}.${action}.message`, MSG.empty(NAME, action)]];
        expect(findingsOf(await linter.run(base({ [NAME]: { description: "Orders placed.", [action]: { ...bare, message: value } } })))).toEqual(expected);
      }
    });

    test.each([...ENTRY_VALUE_CASES, ...MESSAGE_VALUE_CASES])("message of an operation of a components channel set to %s", async (_, value, usable) => {
      const doc = base(OMIT, { components: withComponents({ channels: { shared: { publish: { ...bare, message: value } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [["components.channels.shared.publish.message", MSG.empty("shared", "publish")]]);
    });

    test.each(ENTRY_VALUE_CASES)("a oneOf whose only item is %s", async (_, value, usable) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, message: { oneOf: [value] } })))).toEqual(usable ? [] : [[`${AT}.message`, MSG.empty(NAME, ACTION)]]);
    });

    test.each([...ENTRY_VALUE_CASES, ...MESSAGE_VALUE_CASES])("%s next to a usable oneOf item never reports", async (_, value) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, message: { oneOf: [value, USABLE] } })))).toEqual([]);
      expect(findingsOf(await linter.run(withOperation({ ...bare, message: { oneOf: [USABLE, value] } })))).toEqual([]);
    });

    test.each([...ENTRY_VALUE_CASES, ...MESSAGE_VALUE_CASES])("the same message reached through a components message reference: %s", async (_, value, usable) => {
      const components = withComponents({ messages: { ...COMPONENTS.messages, probe: value } });
      const doc = base({ [NAME]: { [ACTION]: { ...bare, message: messageRef("probe") } } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [[`${AT}.message`, MSG.empty(NAME, ACTION)]]);
    });

    test("follows nested oneOf wrappers up to 100 levels deep", async () => {
      const nest = (levels) => Array.from({ length: levels }).reduce((inner) => ({ oneOf: [inner] }), USABLE);
      expect(findingsOf(await linter.run(withOperation({ ...bare, message: nest(100) })))).toEqual([]);
      expect(findingsOf(await linter.run(withOperation({ ...bare, message: nest(101) })))).toEqual([[`${AT}.message`, MSG.empty(NAME, ACTION)]]);
    });

    test("explores shared oneOf wrappers once, so a wide diamond of empty wrappers finishes fast", async () => {
      const wrappers = {};
      for (let level = 0; level < 40; level++) {
        const next = level === 39 ? null : wrapperRef(`level${level + 1}`);
        wrappers[`level${level}`] = { oneOf: [next, next, next] };
      }
      const doc = base({ [NAME]: { [ACTION]: { ...bare, message: wrapperRef("level0") } } }, { components: withComponents({ "x-message-wrappers": wrappers }) });
      const started = Date.now();
      expect(findingsOf(await linter.run(doc))).toEqual([[`${AT}.message`, MSG.empty(NAME, ACTION)]]);
      expect(Date.now() - started).toBeLessThan(10000);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a message reference", USABLE],
      ["a number", 42],
    ])("operationId, summary, description, tags, security, bindings, traits, messages, action, channel, reply and extensions set to %s never matter", async (_, value) => {
      const operation = { message: USABLE, operationId: value, summary: value, description: value, tags: value, security: value, externalDocs: value, bindings: value, traits: value, messages: value, action: value, channel: value, reply: value, "x-message": value };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual([]);
    });
  });

  describe("operation traits never supply or remove messages", () => {
    test.each(traitCases(2, OMIT))("an operation with %s", async (_, message, traits, expected) => {
      const operation = message === OMIT ? { ...bare, traits } : { ...bare, message, traits };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(atOperation(expected)));
    });
  });

  describe("operation object", () => {
    test.each(operationObjectCasesFor(2))("%s", async (_, operation, expected) => {
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(expected));
    });

    test("a message of the channel, its parameters, bindings or the other operation never stands in for the message of an operation", async () => {
      const channel = { bindings: { kafka: { message: USABLE } }, parameters: { region: { description: "Region.", schema: { type: "string" } } }, messages: { orderPlaced: ORDER_PLACED }, publish: minimal };
      expect(findingsOf(await linter.run(withOperation(bare, channel)))).toEqual(findings([[AT, "missing", NAME, ACTION]]));
    });

    test("checks publish and subscribe independently and never other operation keys", async () => {
      const doc = base({ [NAME]: { publish: {}, subscribe: minimal, Publish: {}, SUBSCRIBE: {}, send: {}, receive: {}, "x-publish": {}, operations: { a: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([[`channels.${NAME}.publish`, "missing", NAME, "publish"]]));
    });

    test("a channel without operations, or whose value is not a usable channel, reports nothing", async () => {
      const doc = base({ silent: { description: "Orders.", bindings: {} }, nothing: null, text: "orders", list: [{ publish: {} }], dangling: { $ref: "#/components/channels/missing" }, cyclic: { $ref: "#/x-loop" } }, { "x-loop": { $ref: "#/x-loop" } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("checks the same operations under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: withComponents({ channels: { shared: { publish: { message: { oneOf: [] } }, subscribe: complete }, gone: { subscribe: null }, fine: { publish: minimal }, broken: { subscribe: { operationId: "receiveBroken" } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared.publish.message", "empty", "shared", "publish"],
          ["components.channels.gone.subscribe", "unusable", "gone", "subscribe"],
          ["components.channels.broken.subscribe", "missing", "broken", "subscribe"],
        ])
      );
    });

    test("checks an operation reached through a channel reference once, at the channel definition and with its name", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders", subscribe: { message: USABLE } } },
        { components: withComponents({ channels: { orders: { description: "Orders.", subscribe: { operationId: "receiveOrders" } } } }) }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders.subscribe", "missing", "orders", "subscribe"]]));
    });

    test("checks an operation shared by several channels once, named after the first channel that reaches it", async () => {
      const doc = base({ first: { publish: { $ref: "#/components/x-operations/bare" } }, second: { subscribe: { $ref: "#/components/x-operations/bare" } }, third: { publish: { $ref: "#/channels/first/publish" } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.x-operations.bare", "missing", "first", "publish"]]));
    });

    test("never inspects the operations and components.operations maps of AsyncAPI 3.x", async () => {
      const doc = base({ [NAME]: { publish: minimal } }, { operations: { blank: { action: "send" }, empty: {} }, components: withComponents({ operations: { empty: {}, nullMessages: { messages: null } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("never inspects components.messages, message or operation traits or x-operations entries no operation uses", async () => {
      const components = withComponents({
        messages: { ...COMPONENTS.messages, unusedNull: null, unusedEmpty: { oneOf: [] } },
        messageTraits: { blank: { message: null } },
        operationTraits: { ...COMPONENTS.operationTraits, unused: { message: { oneOf: [] } }, unusedNull: { message: null } },
      });
      expect(findingsOf(await linter.run(base({ [NAME]: { publish: complete, subscribe: minimal } }, { components })))).toEqual([]);
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
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { subscribe: { message: null } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.subscribe.message", "empty", "dr", "subscribe"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { publish: { message: "lab" } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.publish.message", "empty", "lab", "publish"]]));
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
      const doc = base({ "x-edge.orders": { publish: {} } }, { components: withComponents({ channels: { "x-mirror": { subscribe: { message: { oneOf: [] } } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders.publish", "missing", "x-edge.orders", "publish"],
          ["components.channels.x-mirror.subscribe.message", "empty", "x-mirror", "subscribe"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { subscribe: { message: null } }, "orders~1eu": { publish: {} }, "a/b~c": { subscribe: { message: [USABLE] } }, "orders~0dr": { publish: minimal } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.subscribe.message", "empty", "stores/{storeId}/orders", "subscribe"],
          ["channels.orders~1eu.publish", "missing", "orders~1eu", "publish"],
          ["channels.a/b~c.subscribe.message", "empty", "a/b~c", "subscribe"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { publish: {} }, constructor: { subscribe: { message: null } }, toString: { publish: complete }, valueOf: { publish: minimal, subscribe: { message: { oneOf: { valueOf: USABLE } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels..publish", "missing", "", "publish"],
          ["channels.constructor.subscribe.message", "empty", "constructor", "subscribe"],
          ["channels.valueOf.subscribe.message", "empty", "valueOf", "subscribe"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { publish: {} }, "tab\tbed": { subscribe: "x" }, "zero\u200bwidth": { subscribe: { message: { oneOf: [] } } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced.publish", "missing", "orders\nplaced", "publish"],
          ["channels.tab\tbed.subscribe", "unusable", "tab\tbed", "subscribe"],
          ["channels.zero\u200bwidth.subscribe.message", "empty", "zero\u200bwidth", "subscribe"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR095: The publish operation of channel 'orders\\nplaced' must declare a 'message'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: every operation must still declare at least one message", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, traits: [traitRef("withMessage")] })))).toEqual([[AT, MSG.missing(NAME, ACTION)]]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, message: { oneOf: [null, USABLE] } })))).toEqual([]);
    });
  });

  test("validates operations of shared channels once at the channel definition, follows chained, escaped, percent-encoded, operation, message, wrapper and oneOf list references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects publish and subscribe of channels and components.channels: channel messages, case-different and 3.x keys, traits, unused messages and x-operations maps are ignored", async () => {
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
