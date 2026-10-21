const { linterForRule } = require("../../helpers/utils");
const {
  FIELDS_V3: FIELDS,
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  allMissingFor,
  reportedEmptyV3,
  messageRef,
  shapesFor,
  channelComponentsFor,
  CHANNEL_VALUE_CASES,
  channelObjectCasesV3,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar087-channel-attributes-required");
const okExample = require("./AAR087/ok-example");
const failExample = require("./AAR087/fail-example");
const failSharedRef = require("./AAR087/fail-shared-ref");
const okStructuralEdges = require("./AAR087/ok-structural-edges");
const failLargeGenerated = require("./AAR087/fail-large-generated");

const RULE = "asa:AAR087";
const OMIT = Symbol("omit");
const NAME = NAMES[3];
const AT = atOf(3);
const MSG = messagesFor(3);
const findings = findingsFor(3);
const v2Findings = findingsFor(2);
const allMissing = allMissingFor(3);
const { complete, minimal } = shapesFor(3);
const COMPONENTS = channelComponentsFor(3);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = findings([
  ["channels.noAddress", "missing", "noAddress", "address"],
  ["channels.blankAddress.address", "empty", "blankAddress", "address"],
  ["channels.noDescription", "missing", "noDescription", "description"],
  ["channels.emptyDescription.description", "empty", "emptyDescription", "description"],
  ["channels.zeroWidthDescription.description", "empty", "zeroWidthDescription", "description"],
  ["channels.noMessages", "missing", "noMessages", "messages"],
  ...allMissing("channels.emptyChannel", "emptyChannel"),
  ["channels.v2Style", "missing", "v2Style", "address"],
  ["channels.v2Style", "missing", "v2Style", "messages"],
  ...allMissing("channels.lookAlikes", "lookAlikes"),
  ...allMissing("channels.upperCase", "upperCase"),
  ...allMissing("channels.extensionsOnly", "extensionsOnly"),
  ["channels.addressInBindings", "missing", "addressInBindings", "address"],
  ["channels.referencedByOperation", "missing", "referencedByOperation", "messages"],
  ["channels.nullChannel", "unusable", "nullChannel"],
  ["channels.stringChannel", "unusable", "stringChannel"],
  ["channels.listChannel", "unusable", "listChannel"],
  ["channels.x-partner", "missing", "x-partner", "description"],
  ["channels.chargerTelemetry", "missing", "chargerTelemetry", "description"],
  ["components.channels.sharedHub", "missing", "sharedHub", "address"],
  ["components.channels.legacyQueue.address", "empty", "legacyQueue", "address"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.partner", "missing", "partner", "description"],
  ["components.channels.carrierHub", "missing", "carrierHub", "address"],
  ["components.channels.hop2", "missing", "hop2", "messages"],
  ["components.channels.carrier/eu~dr.address", "empty", "carrier/eu~dr", "address"],
  ["components.channels.north america", "missing", "north america", "address"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.sparseShared", "missing", "sparseShared", "description"],
  ["operations.receiveShipments", "missing", "receiveShipments", "address"],
  ["operations.receiveShipments", "missing", "receiveShipments", "description"],
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "missing", "0", "messages"],
  ["channels.fieldRefs.address", "empty", "fieldRefs", "address"],
  ["channels.fieldRefs.description", "empty", "fieldRefs", "description"],
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

describe("AAR087 (AsyncAPI 3.x): every channel must populate address, description and messages", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels populate address, description and messages, with operations, replies, multi-format payloads, parameters without schema and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every missing, empty or unusable channel field of channels and components.channels with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("requires address, description and messages whenever the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "10"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("applies the 2.x fields instead when the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2.6.0", "2.0.0", "latest", "v3.0.0", "", null]) {
      const doc = withVersion(base({ [NAME]: minimal, legacy: { description: "Orders.", subscribe: { message: messageRef("orderPlaced") } }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(
        v2Findings([
          [AT, "noOperation", NAME],
          ["channels.empty", "missing", "empty", "description"],
          ["channels.empty", "noOperation", "empty"],
        ])
      );
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the channel and the field in every message", async () => {
    expect(findingsOf(await linter.run(withChannel({ address: "", description: "Orders." })))).toEqual([
      [AT, "AAR087: Channel 'orderPlaced' must declare 'messages'."],
      [`${AT}.address`, "AAR087: The 'address' of channel 'orderPlaced' must not be empty."],
    ]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, "AAR087: Channel 'orderPlaced' must be an object declaring 'address', 'description' and 'messages'."]]);
  });

  test.each(["3.0.0", "3.1.0"])("on AsyncAPI %s, accepts a null address, which marks it as unknown, and only requires messages to be present, leaving its content to AAR091", async (version) => {
    const doc = withVersion(
      base({
        dynamic: { address: null, description: "Dynamic address.", messages: { orderPlaced: messageRef("orderPlaced") } },
        emptyMap: { address: "orders.empty", description: "Empty map.", messages: {} },
        nullMap: { address: "orders.null", description: "Null map.", messages: null },
        listMap: { address: "orders.list", description: "List.", messages: [] },
        danglingMap: { address: "orders.dangling", description: "Dangling.", messages: { $ref: "#/components/x-message-maps/missing" } },
        dynamicWithoutMessages: { address: null, description: "Dynamic address without messages." },
        blankAddress: { address: " ", description: "Blank address.", messages: {} },
      }),
      version
    );
    expect(findingsOf(await linter.run(doc))).toEqual(
      findings([
        ["channels.dynamicWithoutMessages", "missing", "dynamicWithoutMessages", "messages"],
        ["channels.blankAddress.address", "empty", "blankAddress", "address"],
      ])
    );
  });

  describe("field values", () => {
    const FIELD_CASES = CHANNEL_VALUE_CASES.flatMap(([label, value, populated]) => FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = reportedEmptyV3(field, value, populated) ? [[`${AT}.${field}`, MSG.empty(NAME, field)]] : [];
      expect(findingsOf(await linter.run(withChannel({ ...minimal, [field]: value })))).toEqual(expected);
    });

    test.each(CHANNEL_VALUE_CASES)("address, description and messages all set to %s", async (_, value, populated) => {
      const expected = findings(FIELDS.filter((field) => reportedEmptyV3(field, value, populated)).map((field) => [`${AT}.${field}`, "empty", NAME, field]));
      expect(findingsOf(await linter.run(withChannel({ address: value, description: value, messages: value })))).toEqual(expected);
    });

    test.each(CHANNEL_VALUE_CASES)("title, summary, servers, parameters, tags, bindings, publish, subscribe and extensions set to %s are never required", async (_, value) => {
      const channel = { ...minimal, title: value, summary: value, servers: value, parameters: value, tags: value, externalDocs: value, bindings: value, publish: value, subscribe: value, "x-address": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesV3())("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { address: "orders.shared", messages: {} }, gone: null, fine: complete } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared", "missing", "shared", "description"],
          ["components.channels.gone", "unusable", "gone"],
        ])
      );
    });

    test("checks a channel once at its definition, whether operations, replies or other channels point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders" } },
        {
          components: { ...COMPONENTS, channels: { orders: { address: "orders", messages: { orderPlaced: messageRef("orderPlaced") } } } },
          operations: {
            receiveOrders: { action: "receive", channel: { $ref: "#/channels/orders" } },
            sendOrders: { action: "send", channel: { $ref: "#/components/channels/orders" }, reply: { channel: { $ref: "#/channels/ordersAgain" } } },
          },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders", "missing", "orders", "description"]]));
    });

    test("never inspects channels declared only inside operations, replies or components.operations", async () => {
      const doc = base(
        { orders: complete },
        {
          operations: { sendOrders: { action: "send", channel: { $ref: "#/channels/orders" }, reply: { address: { location: "$message.header#/replyTo" }, channel: { address: null, messages: {} } } } },
          components: { ...COMPONENTS, operations: { inlineChannel: { action: "send", channel: { description: "" } } }, replies: { inline: { channel: {} } } },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual([]);
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
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { address: "partner", description: "Partner." }, local: complete } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner", "missing", "partner", "messages"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { description: "Dr.", messages: { a: {} } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr", "missing", "dr", "address"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { address: "", description: "Lab.", messages: { a: {} } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.address", "empty", "lab", "address"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { address: "lab", description: "Lab." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab", "missing", "lab", "messages"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { address: "edge", description: "Edge." } }, { components: { channels: { "x-mirror": { address: "mirror", messages: { a: {} } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge", "missing", "x-edge", "messages"],
          ["components.channels.x-mirror", "missing", "x-mirror", "description"],
        ])
      );
    });

    test("reports channels whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { address: "", description: "EU.", messages: { a: {} } }, "orders~0dr": {}, "a/b~c": { address: "ab", description: "AB." }, "orders.placed.v1": { address: "x", messages: { a: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.eu~1west.address", "empty", "eu~1west", "address"],
          ...allMissing("channels.orders~0dr", "orders~0dr"),
          ["channels.a/b~c", "missing", "a/b~c", "messages"],
          ["channels.orders.placed.v1", "missing", "orders.placed.v1", "description"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { address: "unnamed", description: "Unnamed." }, constructor: { address: "a", messages: { a: {} } }, toString: complete, valueOf: { description: "Value.", messages: { a: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", "", "messages"],
          ["channels.constructor", "missing", "constructor", "description"],
          ["channels.valueOf", "missing", "valueOf", "address"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { address: "orders" }, "tab\tbed": null, "zero\u200bwidth": { address: "x", description: "", messages: { a: {} } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced", "missing", "orders\nplaced", "description"],
          ["channels.orders\nplaced", "missing", "orders\nplaced", "messages"],
          ["channels.tab\tbed", "unusable", "tab\tbed"],
          ["channels.zero\u200bwidth.description", "empty", "zero\u200bwidth", "description"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR087: Channel 'orders\\nplaced' must declare 'description'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: address, description and messages stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withChannel({ ...minimal, title: "", summary: "", servers: [] })))).toEqual([]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded and field references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
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
