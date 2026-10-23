const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  allMissingFor,
  messageRef,
  shapesFor,
  channelComponentsFor,
  CHANNEL_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  channelObjectCasesV2,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar087-channel-attributes-required");
const okExample = require("./AAR087/ok-example");
const failExample = require("./AAR087/fail-example");
const failSharedRef = require("./AAR087/fail-shared-ref");
const okStructuralEdges = require("./AAR087/ok-structural-edges");
const failLargeGenerated = require("./AAR087/fail-large-generated");

const RULE = "asa:AAR087";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const AT = atOf(2);
const MSG = messagesFor(2);
const findings = findingsFor(2);
const v3Findings = findingsFor(3);
const allMissing = allMissingFor(2);
const { complete, minimal } = shapesFor(2);
const COMPONENTS = channelComponentsFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = findings([
  ["channels.payments.cdc.noDescription.v1", "missing", "payments.cdc.noDescription.v1", "description"],
  ["channels.payments.cdc.noOperations.v1", "noOperation", "payments.cdc.noOperations.v1"],
  ...allMissing("channels.payments.cdc.empty.v1", "payments.cdc.empty.v1"),
  ["channels.payments.cdc.blankDescription.v1.description", "empty", "payments.cdc.blankDescription.v1", "description"],
  ["channels.payments.cdc.nullDescription.v1.description", "empty", "payments.cdc.nullDescription.v1", "description"],
  ["channels.payments.cdc.zeroWidthDescription.v1.description", "empty", "payments.cdc.zeroWidthDescription.v1", "description"],
  ["channels.payments.cdc.messagesMap.v1", "noOperation", "payments.cdc.messagesMap.v1"],
  ["channels.payments.cdc.sendReceive.v1", "noOperation", "payments.cdc.sendReceive.v1"],
  ...allMissing("channels.payments.cdc.extensionsOnly.v1", "payments.cdc.extensionsOnly.v1"),
  ["channels.payments.cdc.operationDescriptionOnly.v1", "missing", "payments.cdc.operationDescriptionOnly.v1", "description"],
  ["channels.payments.cdc.nullChannel.v1", "unusable", "payments.cdc.nullChannel.v1"],
  ["channels.payments.cdc.stringChannel.v1", "unusable", "payments.cdc.stringChannel.v1"],
  ["channels.payments.cdc.listChannel.v1", "unusable", "payments.cdc.listChannel.v1"],
  ["channels.x-payments.cdc.partner.v1", "missing", "x-payments.cdc.partner.v1", "description"],
  ["channels.payments.refunds.requested", "missing", "payments.refunds.requested", "description"],
  ["components.channels.refundsShared", "missing", "refundsShared", "description"],
  ["components.channels.archiveShared.description", "empty", "archiveShared", "description"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1", "missing", "payments.partner.v1", "description"],
  ["components.channels.sellerHub", "missing", "sellerHub", "description"],
  ["components.channels.hop2", "noOperation", "hop2"],
  ["components.channels.seller/eu~dr.description", "empty", "seller/eu~dr", "description"],
  ["components.channels.latin america", "missing", "latin america", "description"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.sparseShared", "noOperation", "sparseShared"],
  ...allMissing("info", "info"),
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "noOperation", "0"],
  ["channels.fieldRefs.description", "empty", "fieldRefs", "description"],
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

describe("AAR087 (AsyncAPI 2.x): every channel must populate its description and declare a publish or subscribe operation", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels are described and declare operations, through references, oneOf, Avro payloads, traits, parameters and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every missing, empty or unusable channel field of channels and components.channels with the exact message", async () => {
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

  test("requires address, description and messages when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(base({ [NAME]: minimal, modern: { address: "orders.placed", description: "Orders.", messages: { orderPlaced: messageRef("orderPlaced") } }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(
        v3Findings([
          [AT, "missing", NAME, "address"],
          [AT, "missing", NAME, "messages"],
          ["channels.empty", "missing", "empty", "address"],
          ["channels.empty", "missing", "empty", "description"],
          ["channels.empty", "missing", "empty", "messages"],
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

  test("names the channel and the field in every message", async () => {
    expect(findingsOf(await linter.run(withChannel({ description: "", bindings: { kafka: { bindingVersion: "0.4.0" } } })))).toEqual([
      [AT, `AAR087: Channel '${NAME}' must declare a 'publish' or 'subscribe' operation.`],
      [`${AT}.description`, `AAR087: The 'description' of channel '${NAME}' must not be empty.`],
    ]);
    expect(findingsOf(await linter.run(withChannel({ subscribe: { message: { oneOf: [] } } })))).toEqual([[AT, `AAR087: Channel '${NAME}' must declare 'description'.`]]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, `AAR087: Channel '${NAME}' must be an object declaring 'description' and a 'publish' or 'subscribe' operation.`]]);
  });

  describe("field values", () => {
    test.each(CHANNEL_VALUE_CASES)("description set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [[`${AT}.description`, MSG.empty(NAME, "description")]];
      expect(findingsOf(await linter.run(withChannel({ ...minimal, description: value })))).toEqual(expected);
    });

    test.each(MESSAGE_VALUE_CASES)("the only operation message set to %s is never inspected: AAR094 checks it", async (_, value) => {
      for (const operation of ["publish", "subscribe"]) {
        expect(findingsOf(await linter.run(withChannel({ description: "Orders placed.", [operation]: { operationId: "order", message: value } })))).toEqual([]);
      }
    });

    test.each(MESSAGE_VALUE_CASES)("the only operation set to %s is enough: AAR094 checks it", async (_, value) => {
      for (const operation of ["publish", "subscribe"]) {
        expect(findingsOf(await linter.run(withChannel({ description: "Orders placed.", [operation]: value })))).toEqual([]);
      }
    });

    test.each(MESSAGE_VALUE_CASES)("a publish message set to %s next to a subscribe message is never reported", async (_, value) => {
      expect(findingsOf(await linter.run(withChannel({ ...minimal, publish: { message: value } })))).toEqual([]);
    });

    test.each(CHANNEL_VALUE_CASES)("address, messages, title, summary, servers, parameters, bindings and extensions set to %s are never required", async (_, value) => {
      const channel = { ...minimal, address: value, messages: value, title: value, summary: value, servers: value, parameters: value, bindings: value, "x-description": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesV2())("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { description: "", subscribe: { message: messageRef("orderPlaced") } }, gone: null, fine: complete, silent: { description: "Silent." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared.description", "empty", "shared", "description"],
          ["components.channels.gone", "unusable", "gone"],
          ["components.channels.silent", "noOperation", "silent"],
        ])
      );
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
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner", "noOperation", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { subscribe: { message: { name: "dr" } } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr", "missing", "dr", "description"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { description: "", publish: { message: { name: "lab" } } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.description", "empty", "lab", "description"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { description: "Lab." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab", "noOperation", "lab"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are addresses and not extensions in these maps", async () => {
      const doc = base({ "x-edge.orders": { description: "Edge." } }, { components: { channels: { "x-mirror": { subscribe: { message: { name: "mirror" } } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders", "noOperation", "x-edge.orders"],
          ["components.channels.x-mirror", "missing", "x-mirror", "description"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { description: "", subscribe: { message: { name: "a" } } }, "orders~1eu": {}, "a/b~c": { description: "Mixed." } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.description", "empty", "stores/{storeId}/orders", "description"],
          ...allMissing("channels.orders~1eu", "orders~1eu"),
          ["channels.a/b~c", "noOperation", "a/b~c"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { description: "Unnamed." }, constructor: { subscribe: { message: { name: "a" } } }, toString: complete, valueOf: { description: "Value." } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "noOperation", ""],
          ["channels.constructor", "missing", "constructor", "description"],
          ["channels.valueOf", "noOperation", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { description: "Orders." }, "tab\tbed": null, "zero\u200bwidth": { description: "", subscribe: { message: { name: "a" } } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced", "noOperation", "orders\nplaced"],
          ["channels.tab\tbed", "unusable", "tab\tbed"],
          ["channels.zero\u200bwidth.description", "empty", "zero\u200bwidth", "description"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR087: Channel 'orders\\nplaced' must declare a 'publish' or 'subscribe' operation.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: description and a publish or subscribe operation stay mandatory", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withChannel({ ...minimal, title: "", summary: "", address: "" })))).toEqual([]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded, field and operation references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
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
