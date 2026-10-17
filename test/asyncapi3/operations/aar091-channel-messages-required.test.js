const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  messageRef,
  shapesFor,
  channelComponentsFor,
  ENTRY_VALUE_CASES,
  MESSAGES_VALUE_CASES,
  channelObjectCasesV3,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar091-channel-messages-required");
const okExample = require("./AAR091/ok-example");
const failExample = require("./AAR091/fail-example");
const failSharedRef = require("./AAR091/fail-shared-ref");
const okStructuralEdges = require("./AAR091/ok-structural-edges");
const failLargeGenerated = require("./AAR091/fail-large-generated");

const RULE = "asa:AAR091";
const OMIT = Symbol("omit");
const NAME = NAMES[3];
const AT = atOf(3);
const MSG = messagesFor(3);
const findings = findingsFor(3);
const v2Findings = findingsFor(2);
const { complete, minimal } = shapesFor(3);
const COMPONENTS = channelComponentsFor(3);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = findings([
  ["channels.noMessages", "missing", "noMessages"],
  ["channels.emptyMessages.messages", "empty", "emptyMessages"],
  ["channels.nullMessages.messages", "empty", "nullMessages"],
  ["channels.listMessages.messages", "empty", "listMessages"],
  ["channels.textMessages.messages", "empty", "textMessages"],
  ["channels.onlyNullEntry.messages", "empty", "onlyNullEntry"],
  ["channels.onlyScalarEntries.messages", "empty", "onlyScalarEntries"],
  ["channels.onlyDanglingEntries.messages", "empty", "onlyDanglingEntries"],
  ["channels.onlyBrokenRefs.messages", "empty", "onlyBrokenRefs"],
  ["channels.nullComponentMessage.messages", "empty", "nullComponentMessage"],
  ["channels.x-partnerFeed.messages", "empty", "x-partnerFeed"],
  ["channels.v2Style", "missing", "v2Style"],
  ["channels.singularMessage", "missing", "singularMessage"],
  ["channels.upperCaseMessages", "missing", "upperCaseMessages"],
  ["channels.extensionMessages", "missing", "extensionMessages"],
  ["channels.bindingsOnly", "missing", "bindingsOnly"],
  ["channels.referencedByOperation", "missing", "referencedByOperation"],
  ["channels.sharedMapEmpty.messages", "empty", "sharedMapEmpty"],
  ["channels.nullChannel", "unusable", "nullChannel"],
  ["channels.stringChannel", "unusable", "stringChannel"],
  ["channels.listChannel", "unusable", "listChannel"],
  ["components.channels.sharedHub", "missing", "sharedHub"],
  ["components.channels.legacyQueue.messages", "empty", "legacyQueue"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.partner", "missing", "partner"],
  ["components.channels.carrierHub.messages", "empty", "carrierHub"],
  ["components.channels.hop2", "missing", "hop2"],
  ["components.channels.carrier/eu~dr.messages", "empty", "carrier/eu~dr"],
  ["components.channels.north america", "missing", "north america"],
  ["components.channels.recepci\u00f3n.messages", "empty", "recepci\u00f3n"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.sparseShared.messages", "empty", "sparseShared"],
  ["operations.receiveShipments.messages", "empty", "receiveShipments"],
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "missing", "0"],
  ["channels.mapRefs.messages", "empty", "mapRefs"],
  ["channels.deadEntryRefs.messages", "empty", "deadEntryRefs"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "3.0.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });
const withMessages = (messages) => withChannel({ address: "retail.cdc.orders.placed.v1", description: "Orders placed.", messages });

describe("AAR091 (AsyncAPI 3.x): every channel must declare at least one message in its messages map", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels declare messages, with operations, replies, multi-format payloads, shared maps, empty messages and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every channel of channels and components.channels without a usable message with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("reads the messages map whenever the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "10"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("asks for a publish or subscribe message instead when the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2.6.0", "2.0.0", "latest", "v3.0.0", "", null]) {
      const doc = withVersion(base({ [NAME]: minimal, legacy: { subscribe: { message: messageRef("orderPlaced") } }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(
        v2Findings([
          [AT, "missing", NAME],
          ["channels.empty", "missing", "empty"],
        ])
      );
    }
  });

  test("reports with the error severity and one finding per channel", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => (r.path[0] === "channels" ? r.path[1] : `components:${r.path[2]}`))).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the channel in every message", async () => {
    expect(findingsOf(await linter.run(withChannel({ address: "orders" })))).toEqual([[AT, "AAR091: Channel 'orderPlaced' must declare at least one message in 'messages'."]]);
    expect(findingsOf(await linter.run(withMessages({ orderPlaced: null })))).toEqual([[`${AT}.messages`, "AAR091: The 'messages' of channel 'orderPlaced' must declare at least one message."]]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, "AAR091: Channel 'orderPlaced' must be an object declaring at least one message in 'messages'."]]);
  });

  describe("messages values", () => {
    test.each(MESSAGES_VALUE_CASES)("messages set to %s", async (_, value, hasMessage) => {
      const expected = hasMessage ? [] : [[`${AT}.messages`, MSG.empty(NAME)]];
      expect(findingsOf(await linter.run(withMessages(value)))).toEqual(expected);
    });

    test.each(ENTRY_VALUE_CASES)("the only entry of messages set to %s", async (_, value, usable) => {
      const expected = usable ? [] : [[`${AT}.messages`, MSG.empty(NAME)]];
      expect(findingsOf(await linter.run(withMessages({ orderPlaced: value })))).toEqual(expected);
    });

    test.each(ENTRY_VALUE_CASES)("an entry set to %s next to a usable message is never reported", async (_, value) => {
      expect(findingsOf(await linter.run(withMessages({ orderPlaced: value, orderPlacedAvro: messageRef("orderPlacedAvro") })))).toEqual([]);
    });

    test("a map with every unusable entry at once still reports a single finding at messages", async () => {
      const entries = Object.fromEntries(ENTRY_VALUE_CASES.filter(([, , usable]) => !usable).map(([, value], index) => [`entry${index}`, value]));
      expect(Object.keys(entries).length).toBeGreaterThan(20);
      expect(findingsOf(await linter.run(withMessages(entries)))).toEqual([[`${AT}.messages`, MSG.empty(NAME)]]);
    });

    test.each(MESSAGES_VALUE_CASES)("address, description, title, summary, servers, parameters, tags, bindings, publish, subscribe and extensions set to %s never matter", async (_, value) => {
      const channel = { ...minimal, address: value, description: value, title: value, summary: value, servers: value, parameters: value, tags: value, bindings: value, publish: value, subscribe: value, "x-messages": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesV3())("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { address: "orders.shared", messages: { a: null } }, bare: { address: "orders.bare" }, gone: null, fine: complete } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared.messages", "empty", "shared"],
          ["components.channels.bare", "missing", "bare"],
          ["components.channels.gone", "unusable", "gone"],
        ])
      );
    });

    test("checks a channel once at its definition, whether operations, replies or other channels point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders" } },
        {
          components: { ...COMPONENTS, channels: { orders: { address: "orders", messages: {} } } },
          operations: {
            receiveOrders: { action: "receive", channel: { $ref: "#/channels/orders" } },
            sendOrders: { action: "send", channel: { $ref: "#/components/channels/orders" }, reply: { channel: { $ref: "#/channels/ordersAgain" } } },
          },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders.messages", "empty", "orders"]]));
    });

    test("never counts the messages listed by operations or replies, nor inspects channels declared only inside them", async () => {
      const doc = base(
        { orders: { address: "orders" } },
        {
          operations: {
            sendOrders: { action: "send", channel: { $ref: "#/channels/orders" }, messages: [messageRef("orderPlaced")], reply: { channel: { address: null, messages: {} }, messages: [messageRef("orderPlaced")] } },
          },
          components: { ...COMPONENTS, operations: { inlineChannel: { action: "send", channel: { messages: {} } } }, replies: { inline: { channel: {} } } },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["channels.orders", "missing", "orders"]]));
    });
  });

  describe("channels and components maps", () => {
    test("a document without channels or components.channels reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "3.0.0", info: { title: "Quality Order Events", version: "4.2.0" }, operations: {} }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["orders.placed"], [42], [true]])("skips a channels, components or components.channels value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { channels: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows a channels map, a components object and a components.channels map given as local references", async () => {
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { address: "partner" }, local: complete } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner", "missing", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { messages: {} } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.messages", "empty", "dr"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { address: "lab", messages: { a: messageRef("gone") } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.messages", "empty", "lab"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { address: "lab" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab", "missing", "lab"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { address: "edge" } }, { components: { channels: { "x-mirror": { address: "mirror", messages: {} } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge", "missing", "x-edge"],
          ["components.channels.x-mirror.messages", "empty", "x-mirror"],
        ])
      );
    });

    test("reports channels whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { messages: {} }, "orders~0dr": {}, "a/b~c": { address: "ab", messages: { a: null } }, "orders.placed.v1": { address: "x" } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.eu~1west.messages", "empty", "eu~1west"],
          ["channels.orders~0dr", "missing", "orders~0dr"],
          ["channels.a/b~c.messages", "empty", "a/b~c"],
          ["channels.orders.placed.v1", "missing", "orders.placed.v1"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { address: "unnamed" }, constructor: { messages: {} }, toString: complete, valueOf: { messages: { valueOf: null } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", ""],
          ["channels.constructor.messages", "empty", "constructor"],
          ["channels.valueOf.messages", "empty", "valueOf"],
        ])
      );
    });

    test("counts messages whose keys are empty or named like Object members", async () => {
      expect(findingsOf(await linter.run(withMessages({ "": messageRef("orderPlaced") })))).toEqual([]);
      expect(findingsOf(await linter.run(withMessages({ constructor: {}, toString: null })))).toEqual([]);
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { address: "orders" }, "tab\tbed": null, "zero\u200bwidth": { messages: {} } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced", "missing", "orders\nplaced"],
          ["channels.tab\tbed", "unusable", "tab\tbed"],
          ["channels.zero\u200bwidth.messages", "empty", "zero\u200bwidth"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR091: Channel 'orders\\nplaced' must declare at least one message in 'messages'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: at least one usable message stays mandatory", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withChannel(minimal)))).toEqual([]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded, map and entry references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects channels and components.channels: operations, replies, reply addresses, x-channels maps, traits, parameters, payloads and schemas are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ channels: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", channels: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
