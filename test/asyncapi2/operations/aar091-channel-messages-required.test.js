const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  messageRef,
  wrapperRef,
  shapesFor,
  channelComponentsFor,
  ENTRY_VALUE_CASES,
  MESSAGES_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  channelObjectCasesV2,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar091-channel-messages-required");
const okExample = require("./AAR091/ok-example");
const failExample = require("./AAR091/fail-example");
const failSharedRef = require("./AAR091/fail-shared-ref");
const okStructuralEdges = require("./AAR091/ok-structural-edges");
const failLargeGenerated = require("./AAR091/fail-large-generated");

const RULE = "asa:AAR091";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const AT = atOf(2);
const MSG = messagesFor(2);
const findings = findingsFor(2);
const v3Findings = findingsFor(3);
const { complete, minimal } = shapesFor(2);
const COMPONENTS = channelComponentsFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = findings([
  ["channels.payments.cdc.noOperations.v1", "missing", "payments.cdc.noOperations.v1"],
  ["channels.payments.cdc.noMessage.v1", "missing", "payments.cdc.noMessage.v1"],
  ["channels.payments.cdc.emptyOperations.v1", "missing", "payments.cdc.emptyOperations.v1"],
  ["channels.payments.cdc.emptyOneOf.v1.publish.message", "emptyMessage", "payments.cdc.emptyOneOf.v1", "publish"],
  ["channels.payments.cdc.nullOneOfItem.v1.subscribe.message", "emptyMessage", "payments.cdc.nullOneOfItem.v1", "subscribe"],
  ["channels.payments.cdc.danglingItems.v1.subscribe.message", "emptyMessage", "payments.cdc.danglingItems.v1", "subscribe"],
  ["channels.payments.cdc.bothUnusable.v1.publish.message", "emptyMessage", "payments.cdc.bothUnusable.v1", "publish"],
  ["channels.payments.cdc.bothUnusable.v1.subscribe.message", "emptyMessage", "payments.cdc.bothUnusable.v1", "subscribe"],
  ["channels.payments.cdc.danglingMessage.v1.subscribe.message", "emptyMessage", "payments.cdc.danglingMessage.v1", "subscribe"],
  ["channels.payments.cdc.nullComponent.v1.subscribe.message", "emptyMessage", "payments.cdc.nullComponent.v1", "subscribe"],
  ["channels.payments.cdc.listMessage.v1.publish.message", "emptyMessage", "payments.cdc.listMessage.v1", "publish"],
  ["channels.payments.cdc.cyclicWrapper.v1.publish.message", "emptyMessage", "payments.cdc.cyclicWrapper.v1", "publish"],
  ["channels.payments.cdc.messagesMap.v1", "missing", "payments.cdc.messagesMap.v1"],
  ["channels.payments.cdc.sendReceive.v1", "missing", "payments.cdc.sendReceive.v1"],
  ["channels.payments.cdc.traitMessage.v1", "missing", "payments.cdc.traitMessage.v1"],
  ["channels.payments.cdc.bindingMessage.v1", "missing", "payments.cdc.bindingMessage.v1"],
  ["channels.payments.cdc.upperCase.v1", "missing", "payments.cdc.upperCase.v1"],
  ["channels.payments.cdc.extensionsOnly.v1", "missing", "payments.cdc.extensionsOnly.v1"],
  ["channels.payments.cdc.nullChannel.v1", "unusable", "payments.cdc.nullChannel.v1"],
  ["channels.payments.cdc.stringChannel.v1", "unusable", "payments.cdc.stringChannel.v1"],
  ["channels.payments.cdc.listChannel.v1", "unusable", "payments.cdc.listChannel.v1"],
  ["channels.x-payments.cdc.partner.v1.publish.message", "emptyMessage", "x-payments.cdc.partner.v1", "publish"],
  ["channels.terminals/{terminalId}/payments", "missing", "terminals/{terminalId}/payments"],
  ["components.channels.refundsShared", "missing", "refundsShared"],
  ["components.channels.archiveShared.publish.message", "emptyMessage", "archiveShared", "publish"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1", "missing", "payments.partner.v1"],
  ["components.channels.sellerHub.publish.message", "emptyMessage", "sellerHub", "publish"],
  ["components.channels.hop2", "missing", "hop2"],
  ["components.channels.seller/eu~dr.subscribe.message", "emptyMessage", "seller/eu~dr", "subscribe"],
  ["components.channels.latin america", "missing", "latin america"],
  ["components.channels.espa\u00f1a.publish.message", "emptyMessage", "espa\u00f1a", "publish"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.sparseShared", "missing", "sparseShared"],
  ["info", "missing", "info"],
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "missing", "0"],
  ["channels.messageRefs.publish.message", "emptyMessage", "messageRefs", "publish"],
  ["channels.messageRefs.subscribe.message", "emptyMessage", "messageRefs", "subscribe"],
  ["channels.listRefs.subscribe.message", "emptyMessage", "listRefs", "subscribe"],
  ["channels.operationRefs", "missing", "operationRefs"],
  ["x-operations.emptyMessage.message", "emptyMessage", "operationRefEmpty", "publish"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });
const withMessage = (operation, value) => withChannel({ description: "Orders placed.", [operation]: { operationId: "order", message: value } });

const ALL_MESSAGE_CASES = [...ENTRY_VALUE_CASES, ...MESSAGE_VALUE_CASES];

describe("AAR091 (AsyncAPI 2.x): every channel must declare at least one message in publish or subscribe", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels carry messages, through references, oneOf, Avro payloads, traits, parameters, empty messages and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every channel of channels and components.channels without a usable message with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("reads publish and subscribe whenever the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", "v3.0.0", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("reads the messages map instead when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(base({ [NAME]: minimal, modern: { address: "orders.placed", messages: { orderPlaced: messageRef("orderPlaced") } }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(
        v3Findings([
          [AT, "missing", NAME],
          ["channels.empty", "missing", "empty"],
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

  test("names the channel and the operation in every message", async () => {
    expect(findingsOf(await linter.run(withChannel({ description: "Orders.", publish: { operationId: "publishOrder" } })))).toEqual([
      [AT, `AAR091: Channel '${NAME}' must declare at least one message in 'publish' or 'subscribe'.`],
    ]);
    expect(findingsOf(await linter.run(withChannel({ subscribe: { message: { oneOf: [] } } })))).toEqual([
      [`${AT}.subscribe.message`, `AAR091: The 'subscribe.message' of channel '${NAME}' must declare at least one message.`],
    ]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, `AAR091: Channel '${NAME}' must be an object declaring at least one message in 'publish' or 'subscribe'.`]]);
  });

  describe("message values", () => {
    test.each(ALL_MESSAGE_CASES)("the only operation message set to %s", async (_, value, usable) => {
      for (const operation of ["publish", "subscribe"]) {
        const expected = usable ? [] : [[`${AT}.${operation}.message`, MSG.emptyMessage(NAME, operation)]];
        expect(findingsOf(await linter.run(withMessage(operation, value)))).toEqual(expected);
      }
    });

    test.each(ENTRY_VALUE_CASES)("the only oneOf item set to %s", async (_, value, usable) => {
      const expected = usable ? [] : [[`${AT}.subscribe.message`, MSG.emptyMessage(NAME, "subscribe")]];
      expect(findingsOf(await linter.run(withMessage("subscribe", { oneOf: [value] })))).toEqual(expected);
    });

    test.each(ENTRY_VALUE_CASES)("a oneOf item set to %s next to a usable message is never reported", async (_, value) => {
      expect(findingsOf(await linter.run(withMessage("publish", { oneOf: [value, messageRef("orderPlaced")] })))).toEqual([]);
      expect(findingsOf(await linter.run(withMessage("publish", { oneOf: [messageRef("orderPlaced"), value] })))).toEqual([]);
    });

    test.each(ALL_MESSAGE_CASES)("a publish message set to %s next to a subscribe message is never reported", async (_, value) => {
      expect(findingsOf(await linter.run(withChannel({ ...minimal, publish: { message: value } })))).toEqual([]);
    });

    test("a oneOf with every unusable item at once still reports a single finding at the message", async () => {
      const items = ENTRY_VALUE_CASES.filter(([, , usable]) => !usable).map(([, value]) => value);
      expect(items.length).toBeGreaterThan(20);
      expect(findingsOf(await linter.run(withMessage("publish", { oneOf: items })))).toEqual([[`${AT}.publish.message`, MSG.emptyMessage(NAME, "publish")]]);
    });

    test("follows nested oneOf wrappers up to 100 levels deep", async () => {
      const nest = (levels) => Array.from({ length: levels }).reduce((inner) => ({ oneOf: [inner] }), messageRef("orderPlaced"));
      expect(findingsOf(await linter.run(withMessage("publish", nest(100))))).toEqual([]);
      expect(findingsOf(await linter.run(withMessage("publish", nest(101))))).toEqual([[`${AT}.publish.message`, MSG.emptyMessage(NAME, "publish")]]);
    });

    test("explores shared oneOf wrappers once, so a wide diamond of empty wrappers finishes fast", async () => {
      const wrappers = {};
      for (let level = 0; level < 40; level++) {
        const next = level === 39 ? null : wrapperRef(`level${level + 1}`);
        wrappers[`level${level}`] = { oneOf: [next, next, next] };
      }
      const doc = base({ [NAME]: { publish: { message: wrapperRef("level0") } } }, { components: { ...COMPONENTS, "x-message-wrappers": wrappers } });
      const started = Date.now();
      expect(findingsOf(await linter.run(doc))).toEqual([[`${AT}.publish.message`, MSG.emptyMessage(NAME, "publish")]]);
      expect(Date.now() - started).toBeLessThan(10000);
    });

    test.each(MESSAGES_VALUE_CASES)("address, messages, title, summary, servers, parameters, bindings and extensions set to %s never matter", async (_, value) => {
      const channel = { ...minimal, address: value, messages: value, title: value, summary: value, servers: value, parameters: value, bindings: value, "x-message": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesV2())("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { subscribe: { message: { oneOf: [null] } } }, gone: null, fine: complete, silent: { description: "Silent." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared.subscribe.message", "emptyMessage", "shared", "subscribe"],
          ["components.channels.gone", "unusable", "gone"],
          ["components.channels.silent", "missing", "silent"],
        ])
      );
    });

    test("checks a channel once at its definition, whatever channels point to it", async () => {
      const doc = base({ orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders" } }, { components: { ...COMPONENTS, channels: { orders: { publish: { message: null } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders.publish.message", "emptyMessage", "orders", "publish"]]));
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
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { description: "Partner." }, local: complete } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner", "missing", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { subscribe: { message: { oneOf: [] } } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.subscribe.message", "emptyMessage", "dr", "subscribe"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { publish: { message: messageRef("gone") } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.publish.message", "emptyMessage", "lab", "publish"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { description: "Lab." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab", "missing", "lab"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are addresses and not extensions in these maps", async () => {
      const doc = base({ "x-edge.orders": { description: "Edge." } }, { components: { channels: { "x-mirror": { subscribe: { message: { oneOf: [null] } } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders", "missing", "x-edge.orders"],
          ["components.channels.x-mirror.subscribe.message", "emptyMessage", "x-mirror", "subscribe"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { subscribe: { message: { oneOf: [] } } }, "orders~1eu": {}, "a/b~c": { description: "Mixed." } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.subscribe.message", "emptyMessage", "stores/{storeId}/orders", "subscribe"],
          ["channels.orders~1eu", "missing", "orders~1eu"],
          ["channels.a/b~c", "missing", "a/b~c"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { description: "Unnamed." }, constructor: { subscribe: { message: null } }, toString: complete, valueOf: { description: "Value." } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", ""],
          ["channels.constructor.subscribe.message", "emptyMessage", "constructor", "subscribe"],
          ["channels.valueOf", "missing", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { description: "Orders." }, "tab\tbed": null, "zero\u200bwidth": { subscribe: { message: { oneOf: [] } } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced", "missing", "orders\nplaced"],
          ["channels.tab\tbed", "unusable", "tab\tbed"],
          ["channels.zero\u200bwidth.subscribe.message", "emptyMessage", "zero\u200bwidth", "subscribe"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR091: Channel 'orders\\nplaced' must declare at least one message in 'publish' or 'subscribe'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: at least one usable publish or subscribe message stays mandatory", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withChannel(minimal)))).toEqual([]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded, message, oneOf and operation references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects channels and components.channels: x-channels maps, operation and message traits, parameters, payloads, headers, examples and schemas are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ channels: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", channels: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
