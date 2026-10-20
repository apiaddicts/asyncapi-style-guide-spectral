const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  ORDER_PLACED,
  CHANNELS_V3,
  traitRef,
  channelRef,
  messageRef,
  channelMessageRef,
  shapesFor,
  operationComponentsFor,
  ENTRY_VALUE_CASES,
  ENTRY_VALUE_CASES_V3,
  MESSAGES_VALUE_CASES,
  traitCases,
  operationObjectCasesFor,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar094-operation-messages-required");
const okExample = require("./AAR094/ok-example");
const failExample = require("./AAR094/fail-example");
const failSharedRef = require("./AAR094/fail-shared-ref");
const okStructuralEdges = require("./AAR094/ok-structural-edges");
const failLargeGenerated = require("./AAR094/fail-large-generated");

const RULE = "asa:AAR094";
const OMIT = Symbol("omit");
const NAME = NAMES[3];
const AT = atOf(3);
const MSG = messagesFor(3);
const findings = findingsFor(3);
const v2Findings = findingsFor(2);
const { complete, minimal, bare } = shapesFor(3);
const COMPONENTS = operationComponentsFor(3);
const USABLE = channelMessageRef("orderPlaced");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const atOperation = (expected) => expected.map(([path, kind]) => [path.replace(/^@/, AT), kind, NAME]);

const FAIL = findings([
  ["operations.emptyMessages.messages", "empty", "emptyMessages"],
  ["operations.nullMessages.messages", "empty", "nullMessages"],
  ["operations.danglingEntry.messages", "empty", "danglingEntry"],
  ["operations.nullEntries.messages", "empty", "nullEntries"],
  ["operations.scalarEntries.messages", "empty", "scalarEntries"],
  ["operations.mapMessages.messages", "empty", "mapMessages"],
  ["operations.singleReference.messages", "empty", "singleReference"],
  ["operations.channelMessagesMap.messages", "empty", "channelMessagesMap"],
  ["operations.danglingList.messages", "empty", "danglingList"],
  ["operations.cyclicEntries.messages", "empty", "cyclicEntries"],
  ["operations.nullOperation", "unusable", "nullOperation"],
  ["operations.stringOperation", "unusable", "stringOperation"],
  ["operations.listOperation", "unusable", "listOperation"],
  ["operations.terminals/payments.messages", "empty", "terminals/payments"],
  ["components.operations.archiveShared.messages", "empty", "archiveShared"],
  ["components.operations.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["components.operations.hop2.messages", "empty", "hop2"],
  ["components.operations.carrier/eu~dr.messages", "empty", "carrier/eu~dr"],
  ["components.operations.recepci\u00f3n.messages", "empty", "recepci\u00f3n"],
  ["operations.dangling", "unusable", "dangling"],
  ["components.operations.loopA", "unusable", "loopA"],
  ["components.operations.loopB", "unusable", "loopB"],
  ["operations.selfLoop", "unusable", "selfLoop"],
  ["channels.shipments.messages", "empty", "shipments"],
  ["channels.replies.messages", "empty", "replies"],
  ["operations.toRoot", "unusable", "toRoot"],
  ["operations.nonStringRef", "unusable", "nonStringRef"],
  ["operations.emptyRef", "unusable", "emptyRef"],
  ["operations.badPointer", "unusable", "badPointer"],
  ["operations.badEncoding", "unusable", "badEncoding"],
  ["operations.throughIntermediate", "unusable", "throughIntermediate"],
  ["operations.listToEmpty.messages", "empty", "listToEmpty"],
  ["operations.listCyclic.messages", "empty", "listCyclic"],
  ["operations.listSelf.messages", "empty", "listSelf"],
  ["operations.listToRoot.messages", "empty", "listToRoot"],
  ["operations.listBadPointer.messages", "empty", "listBadPointer"],
  ["operations.listThroughIntermediate.messages", "empty", "listThroughIntermediate"],
  ["operations.listSiblingEntries.messages", "empty", "listSiblingEntries"],
  ["operations.entryToText.messages", "empty", "entryToText"],
  ["operations.entryCyclic.messages", "empty", "entryCyclic"],
  ["operations.entryNonString.messages", "empty", "entryNonString"],
  ["operations.entryThroughIntermediate.messages", "empty", "entryThroughIntermediate"],
  ["components.operations.nullShared", "unusable", "nullShared"],
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
const withComponents = (extra) => ({ ...COMPONENTS, ...extra });

describe("AAR094 (AsyncAPI 3.x): every operation that declares messages must include at least one message, and one that omits them takes those of its channel", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose operations list their messages through channel, escaped, encoded, shared, external and component references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every operation of operations and components.operations without a usable message with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("checks the operations map whenever the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("checks publish and subscribe of channels instead when the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2.6.0", "latest", "v3.0.0", "", null, false]) {
      const doc = withVersion(base({ empty: {} }, { channels: { orders: { address: "orders", publish: { message: messageRef("orderPlaced") }, subscribe: {} } } }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(v2Findings([["channels.orders.subscribe", "missing", "orders", "subscribe"]]));
    }
  });

  test("reports with the error severity and one finding per problem", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the operation in every message", async () => {
    expect(findingsOf(await linter.run(withOperation({ ...bare, messages: [] })))).toEqual([[`${AT}.messages`, `AAR094: The 'messages' of operation '${NAME}' must declare at least one message.`]]);
    expect(findingsOf(await linter.run(withOperation(null)))).toEqual([[AT, `AAR094: Operation '${NAME}' must be an object declaring at least one message in 'messages'.`]]);
  });

  test.each(["3.0.0", "3.1.0"])("on AsyncAPI %s, an operation that omits messages takes those of its channel and is never reported, while messages: [] means no messages", async (version) => {
    const doc = withVersion(
      base({
        omitted: bare,
        omittedSilentChannel: { ...bare, channel: channelRef("silent") },
        omittedNoChannel: { action: "send" },
        omittedWithTrait: { ...bare, traits: [traitRef("emptyMessages")] },
        explicitEmpty: { ...bare, messages: [] },
        explicitNull: { ...bare, messages: null },
        listed: minimal,
      }),
      version
    );
    expect(findingsOf(await linter.run(doc))).toEqual(
      findings([
        ["operations.explicitEmpty.messages", "empty", "explicitEmpty"],
        ["operations.explicitNull.messages", "empty", "explicitNull"],
      ])
    );
  });

  describe("messages values", () => {
    test.each(MESSAGES_VALUE_CASES)("messages set to %s", async (_, value, hasMessage) => {
      for (const action of ["send", "receive"]) {
        const expected = hasMessage ? [] : [[`${AT}.messages`, MSG.empty(NAME)]];
        expect(findingsOf(await linter.run(withOperation({ ...bare, action, messages: value })))).toEqual(expected);
      }
    });

    test.each(MESSAGES_VALUE_CASES)("messages of a components operation set to %s", async (_, value, hasMessage) => {
      const doc = base(OMIT, { components: withComponents({ operations: { shared: { ...bare, messages: value } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(hasMessage ? [] : [["components.operations.shared.messages", MSG.empty("shared")]]);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a list of messages", [USABLE]],
      ["a number", 42],
    ])("action, channel, title, summary, description, security, tags, bindings, traits, reply, message, publish, subscribe and extensions set to %s never matter", async (_, value) => {
      const operation = { messages: [USABLE], action: value, channel: value, title: value, summary: value, description: value, security: value, tags: value, externalDocs: value, bindings: value, traits: value, reply: value, message: value, publish: value, subscribe: value, "x-messages": value };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual([]);
    });
  });

  describe("message entries", () => {
    const ENTRIES = [...ENTRY_VALUE_CASES, ...ENTRY_VALUE_CASES_V3];

    test.each(ENTRIES)("a messages list whose only entry is %s", async (_, entry, usable) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, messages: [entry] })))).toEqual(usable ? [] : [[`${AT}.messages`, MSG.empty(NAME)]]);
    });

    test.each(ENTRIES)("%s next to a usable entry never reports", async (_, entry) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, messages: [entry, USABLE] })))).toEqual([]);
      expect(findingsOf(await linter.run(withOperation({ ...bare, messages: [USABLE, entry] })))).toEqual([]);
    });

    test.each(ENTRY_VALUE_CASES)("the same entry reached through a components message reference: %s", async (_, entry, usable) => {
      const components = withComponents({ messages: { ...COMPONENTS.messages, probe: entry } });
      const doc = base({ [NAME]: { ...bare, messages: [messageRef("probe")] } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [[`${AT}.messages`, MSG.empty(NAME)]]);
    });

    test.each(ENTRY_VALUE_CASES)("the same entry reached through a channel message reference: %s", async (_, entry, usable) => {
      const channels = { ...CHANNELS_V3, probes: { address: "retail.cdc.probes.v1", messages: { probe: entry } } };
      const doc = base({ [NAME]: { ...bare, channel: channelRef("probes"), messages: [channelMessageRef("probe", "probes")] } }, { channels });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [[`${AT}.messages`, MSG.empty(NAME)]]);
    });
  });

  describe("operation traits never supply or remove messages, and an operation that omits messages is never reported", () => {
    test.each(traitCases(3, OMIT))("an operation with %s", async (_, messages, traits, expected) => {
      const operation = messages === OMIT ? { ...bare, traits } : { ...bare, messages, traits };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(atOperation(expected)));
    });
  });

  describe("replies", () => {
    test("the messages of a reply never stand in for the messages of its operation", async () => {
      const reply = { address: { location: "$message.header#/replyTo" }, channel: channelRef("replies"), messages: [channelMessageRef("orderAccepted", "replies")] };
      expect(findingsOf(await linter.run(withOperation({ ...bare, messages: [], reply })))).toEqual(findings([[`${AT}.messages`, "empty", NAME]]));
      expect(findingsOf(await linter.run(withOperation({ ...bare, messages: [null], reply })))).toEqual(findings([[`${AT}.messages`, "empty", NAME]]));
    });

    test.each([
      ["an empty list", []],
      ["null", null],
      ["a dangling entry", [channelMessageRef("gone", "replies")]],
      ["a map", { orderAccepted: channelMessageRef("orderAccepted", "replies") }],
      ["a string", "orderAccepted"],
    ])("a reply whose messages are %s is never reported", async (_, messages) => {
      const components = withComponents({ replies: { probe: { channel: channelRef("replies"), messages } } });
      expect(findingsOf(await linter.run(base({ [NAME]: { ...minimal, reply: { channel: channelRef("replies"), messages } } }, { components })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ [NAME]: { ...minimal, reply: { $ref: "#/components/replies/probe" } } }, { components })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ [NAME]: complete }, { components })))).toEqual([]);
    });

    test("a reply or a reply channel reached as an operation reference is checked as an operation", async () => {
      const components = withComponents({ replies: { inline: { channel: channelRef("replies"), messages: [] }, listed: { messages: [channelMessageRef("orderAccepted", "replies")] } } });
      const doc = base({ toReply: { $ref: "#/components/replies/inline" }, toListedReply: { $ref: "#/components/replies/listed" }, toReplyChannel: { $ref: "#/channels/replies" } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.replies.inline.messages", "empty", "inline"],
          ["channels.replies.messages", "empty", "replies"],
        ])
      );
    });
  });

  describe("operation object", () => {
    test.each(operationObjectCasesFor(3))("%s", async (_, operation, expected) => {
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(expected));
    });

    test("an operation that omits messages takes those of its channel without inspecting them, while the channel messages never stand in for an explicit empty list", async () => {
      const channels = { ...CHANNELS_V3, dedicated: { address: "orders.dedicated", messages: { orderPlaced: ORDER_PLACED }, bindings: { kafka: { messages: [USABLE] } } }, hollow: { address: "orders.hollow", messages: {} } };
      const operation = { action: "receive", channel: channelRef("dedicated"), bindings: { kafka: { groupId: { type: "string" } } } };
      expect(findingsOf(await linter.run(base({ [NAME]: operation, hollow: { action: "send", channel: channelRef("hollow") } }, { channels })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ [NAME]: { ...operation, messages: [] } }, { channels })))).toEqual(findings([[`${AT}.messages`, "empty", NAME]]));
    });

    test("checks the same objects under components.operations, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: withComponents({ operations: { shared: bare, gone: null, fine: complete, tiny: minimal, nothing: { ...bare, messages: [] }, broken: { ...bare, messages: [null] } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operations.gone", "unusable", "gone"],
          ["components.operations.nothing.messages", "empty", "nothing"],
          ["components.operations.broken.messages", "empty", "broken"],
        ])
      );
    });

    test("checks an operation once at its definition, whatever operations point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/operations/orders" }, ordersAgain: { $ref: "#/components/operations/orders", messages: [USABLE] }, mirror: { $ref: "#/operations/orders" } },
        { components: withComponents({ operations: { orders: { ...bare, messages: [] } } }) }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.operations.orders.messages", "empty", "orders"]]));
    });

    test("an operation whose messages point to another operation's messages follows them", async () => {
      const doc = base({ first: { ...bare, messages: [USABLE] }, second: { ...bare, messages: { $ref: "#/operations/first/messages" } }, third: { ...bare, messages: { $ref: "#/operations/fourth/messages" } }, fourth: { ...bare, messages: [] } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.fourth.messages", "empty", "fourth"],
          ["operations.third.messages", "empty", "third"],
        ])
      );
    });

    test("never inspects publish and subscribe operations of channels, operations inside replies or components.replies", async () => {
      const channels = { ...CHANNELS_V3, legacy: { address: "legacy", publish: {}, subscribe: { message: { oneOf: [] } } } };
      const doc = base({ [NAME]: complete }, { channels, components: withComponents({ replies: { inline: { channel: channelRef("replies"), messages: [] } }, channels: { shared: { address: "shared", publish: {} } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("never inspects components.messages, message traits, operation traits or x-operations entries no operation uses", async () => {
      const components = withComponents({
        messages: { ...COMPONENTS.messages, unusedNull: null, unusedEmpty: {} },
        messageTraits: { blank: { messages: [], message: null } },
        operationTraits: { ...COMPONENTS.operationTraits, unused: { messages: [] }, unusedNull: { messages: null } },
      });
      expect(findingsOf(await linter.run(base({ [NAME]: complete, minimal }, { components })))).toEqual([]);
    });
  });

  describe("operations and components maps", () => {
    test("a document without operations or components.operations reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "3.0.0", info: { title: "Quality Order Events", version: "4.2.0" }, channels: CHANNELS_V3 }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["receiveOrderPlaced"], [42], [true]])("skips an operations, components or components.operations value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { operations: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows an operations map, a components object and a components.operations map given as local references", async () => {
      const viaOperations = base({ $ref: "#/x-operation-map" }, { "x-operation-map": { partner: { action: "send", messages: [] }, local: complete } });
      expect(findingsOf(await linter.run(viaOperations))).toEqual(findings([["x-operation-map.partner.messages", "empty", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { operations: { dr: { messages: [] } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.operations.dr.messages", "empty", "dr"]]));
      const operationsMapRef = base(OMIT, { components: { operations: { $ref: "#/x-shared" } }, "x-shared": { lab: { messages: "lab" } } });
      expect(findingsOf(await linter.run(operationsMapRef))).toEqual(findings([["x-shared.lab.messages", "empty", "lab"]]));
    });

    test("checks an operations map shared by operations and components.operations once", async () => {
      const doc = base({ $ref: "#/components/operations" }, { components: { operations: { lab: { action: "send", messages: null } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.operations.lab.messages", "empty", "lab"]]));
    });

    test("ignores an operations map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./operations.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { operations: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/operations" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { operations: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("operation names", () => {
    test("checks operations whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { action: "send", messages: [] } }, { components: withComponents({ operations: { "x-mirror": { messages: [] } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.x-edge.messages", "empty", "x-edge"],
          ["components.operations.x-mirror.messages", "empty", "x-mirror"],
        ])
      );
    });

    test("reports operations whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { messages: [] }, "orders~0dr": { messages: "orderPlaced" }, "a/b~c": { messages: [null] }, "orders.placed.v1": minimal });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.eu~1west.messages", "empty", "eu~1west"],
          ["operations.orders~0dr.messages", "empty", "orders~0dr"],
          ["operations.a/b~c.messages", "empty", "a/b~c"],
        ])
      );
    });

    test("checks an empty operation key and operations named like Object members", async () => {
      const doc = base({ "": { action: "send", messages: [] }, constructor: { messages: null }, toString: complete, valueOf: { messages: { valueOf: USABLE } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations..messages", "empty", ""],
          ["operations.constructor.messages", "empty", "constructor"],
          ["operations.valueOf.messages", "empty", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of operation names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { action: "send", messages: [] }, "tab\tbed": null, "zero\u200bwidth": { messages: [] } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["operations.orders\nplaced.messages", "empty", "orders\nplaced"],
          ["operations.tab\tbed", "unusable", "tab\tbed"],
          ["operations.zero\u200bwidth.messages", "empty", "zero\u200bwidth"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR094: The 'messages' of operation 'orders\\nplaced' must declare at least one message.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: declared messages must still include at least one message", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, messages: [], traits: [traitRef("withMessages")] })))).toEqual([[`${AT}.messages`, MSG.empty(NAME)]]);
      expect(findingsOf(await custom.run(withOperation(bare)))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, messages: [messageRef("orderPlaced")] })))).toEqual([]);
    });
  });

  test("validates a shared operation once at its definition, follows chained, escaped, percent-encoded, list and entry references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects operations and components.operations: channel messages, replies, components.replies, traits, unused messages and x-operations maps are ignored", async () => {
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
