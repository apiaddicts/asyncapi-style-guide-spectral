const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  MSG,
  findings,
  KAFKA,
  KAFKA_SERVER,
  bindingsRef,
  shapesFor,
  channelComponentsFor,
  KAFKA_VALUE_CASES,
  BINDINGS_VALUE_CASES,
  channelObjectCasesFor,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar090-channel-bindings-required");
const okExample = require("./AAR090/ok-example");
const failExample = require("./AAR090/fail-example");
const failSharedRef = require("./AAR090/fail-shared-ref");
const okStructuralEdges = require("./AAR090/ok-structural-edges");
const failLargeGenerated = require("./AAR090/fail-large-generated");

const RULE = "asa:AAR090";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const AT = atOf(2);
const { complete, minimal, bare } = shapesFor(2);
const COMPONENTS = channelComponentsFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const isRef = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && value.$ref !== undefined;

const FAIL = findings([
  ["channels.payments.cdc.noBindings.v1", "missing", "payments.cdc.noBindings.v1"],
  ["channels.payments.cdc.emptyBindings.v1.bindings", "missing", "payments.cdc.emptyBindings.v1"],
  ["channels.payments.cdc.nullBindings.v1.bindings", "missing", "payments.cdc.nullBindings.v1"],
  ["channels.payments.cdc.amqpOnly.v1.bindings", "missing", "payments.cdc.amqpOnly.v1"],
  ["channels.payments.cdc.mqttAndWs.v1.bindings", "missing", "payments.cdc.mqttAndWs.v1"],
  ["channels.payments.cdc.upperCase.v1.bindings", "missing", "payments.cdc.upperCase.v1"],
  ["channels.payments.cdc.extension.v1.bindings", "missing", "payments.cdc.extension.v1"],
  ["channels.payments.cdc.kafkaSecure.v1.bindings", "missing", "payments.cdc.kafkaSecure.v1"],
  ["channels.payments.cdc.nullKafka.v1.bindings.kafka", "invalid", "payments.cdc.nullKafka.v1"],
  ["channels.payments.cdc.stringKafka.v1.bindings.kafka", "invalid", "payments.cdc.stringKafka.v1"],
  ["channels.payments.cdc.listKafka.v1.bindings.kafka", "invalid", "payments.cdc.listKafka.v1"],
  ["channels.payments.cdc.trueKafka.v1.bindings.kafka", "invalid", "payments.cdc.trueKafka.v1"],
  ["channels.payments.cdc.danglingKafka.v1.bindings.kafka", "invalid", "payments.cdc.danglingKafka.v1"],
  ["channels.payments.cdc.operationOnly.v1", "missing", "payments.cdc.operationOnly.v1"],
  ["channels.payments.cdc.messageOnly.v1", "missing", "payments.cdc.messageOnly.v1"],
  ["channels.payments.cdc.traitOnly.v1", "missing", "payments.cdc.traitOnly.v1"],
  ["channels.payments.cdc.serverOnly.v1", "missing", "payments.cdc.serverOnly.v1"],
  ["channels.payments.cdc.sharedNoKafka.v1.bindings", "missing", "payments.cdc.sharedNoKafka.v1"],
  ["channels.payments.cdc.sharedNullKafka.v1.bindings", "invalid", "payments.cdc.sharedNullKafka.v1"],
  ["channels.payments.cdc.danglingBindings.v1.bindings", "missing", "payments.cdc.danglingBindings.v1"],
  ["channels.payments.cdc.nullChannel.v1", "unusable", "payments.cdc.nullChannel.v1"],
  ["channels.payments.cdc.stringChannel.v1", "unusable", "payments.cdc.stringChannel.v1"],
  ["channels.payments.cdc.listChannel.v1", "unusable", "payments.cdc.listChannel.v1"],
  ["channels.x-payments.cdc.partner.v1", "missing", "x-payments.cdc.partner.v1"],
  ["channels.terminals/{terminalId}/payments.bindings", "missing", "terminals/{terminalId}/payments"],
  ["components.channels.refundsShared", "missing", "refundsShared"],
  ["components.channels.archiveShared.bindings", "missing", "archiveShared"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1", "missing", "payments.partner.v1"],
  ["components.channels.sellerHub", "missing", "sellerHub"],
  ["components.channels.hop2.bindings", "missing", "hop2"],
  ["components.channels.seller/eu~dr.bindings", "missing", "seller/eu~dr"],
  ["components.channels.latin america", "missing", "latin america"],
  ["components.channels.espa\u00f1a.bindings.kafka", "invalid", "espa\u00f1a"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.bareShared", "missing", "bareShared"],
  ["info", "missing", "info"],
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "missing", "0"],
  ["channels.bindingsToNoKafka.bindings", "missing", "bindingsToNoKafka"],
  ["channels.bindingsCyclic.bindings", "missing", "bindingsCyclic"],
  ["channels.bindingsSelf.bindings", "missing", "bindingsSelf"],
  ["channels.bindingsToRoot.bindings", "missing", "bindingsToRoot"],
  ["channels.bindingsBadPointer.bindings", "missing", "bindingsBadPointer"],
  ["channels.bindingsThroughIntermediate.bindings", "missing", "bindingsThroughIntermediate"],
  ["channels.bindingsSiblingKafka.bindings", "missing", "bindingsSiblingKafka"],
  ["channels.kafkaToText.bindings.kafka", "invalid", "kafkaToText"],
  ["channels.kafkaCyclic.bindings.kafka", "invalid", "kafkaCyclic"],
  ["channels.kafkaNonString.bindings.kafka", "invalid", "kafkaNonString"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", bindings: { kafka: KAFKA_SERVER } } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });

describe("AAR090 (AsyncAPI 2.x): every channel must declare a kafka binding", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels declare kafka bindings of every version, inline, shared through references, next to other protocols and in external files", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every channel of channels and components.channels without a usable kafka binding with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("applies the same check whatever the asyncapi value is", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "3.0.0", "latest", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("reports with the error severity and one finding per channel", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the channel in every message", async () => {
    expect(findingsOf(await linter.run(withChannel(bare)))).toEqual([[AT, `AAR090: Channel '${NAME}' must declare a 'kafka' binding.`]]);
    expect(findingsOf(await linter.run(withChannel({ ...bare, bindings: { amqp: {} } })))).toEqual([[`${AT}.bindings`, `AAR090: Channel '${NAME}' must declare a 'kafka' binding.`]]);
    expect(findingsOf(await linter.run(withChannel({ ...bare, bindings: { kafka: null } })))).toEqual([[`${AT}.bindings.kafka`, `AAR090: The 'kafka' binding of channel '${NAME}' must be an object.`]]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, `AAR090: Channel '${NAME}' must be an object declaring a 'kafka' binding.`]]);
  });

  describe("kafka binding values", () => {
    test.each(KAFKA_VALUE_CASES)("bindings.kafka set to %s", async (_, value, usable) => {
      const expected = usable ? [] : [[`${AT}.bindings.kafka`, MSG.invalid(NAME)]];
      expect(findingsOf(await linter.run(withChannel({ ...bare, bindings: { kafka: value } })))).toEqual(expected);
    });

    test.each(KAFKA_VALUE_CASES)("the kafka binding of shared bindings set to %s is reported at the channel bindings reference", async (_, value, usable) => {
      const components = { ...COMPONENTS, channelBindings: { ...COMPONENTS.channelBindings, probe: { kafka: value } } };
      const doc = base({ [NAME]: { ...bare, bindings: bindingsRef("probe") } }, { components });
      const expected = usable ? [] : [[`${AT}.bindings`, MSG.invalid(NAME)]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });
  });

  describe("bindings values", () => {
    test.each(BINDINGS_VALUE_CASES)("bindings set to %s", async (_, value, kind) => {
      const path = kind === "invalid" && !isRef(value) ? `${AT}.bindings.kafka` : `${AT}.bindings`;
      const expected = kind === null ? [] : [[path, MSG[kind](NAME)]];
      expect(findingsOf(await linter.run(withChannel({ ...bare, bindings: value })))).toEqual(expected);
    });

    test.each(BINDINGS_VALUE_CASES)("bindings of a components channel set to %s", async (_, value, kind) => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { ...bare, bindings: value } } } });
      const path = kind === "invalid" && !isRef(value) ? "components.channels.shared.bindings.kafka" : "components.channels.shared.bindings";
      const expected = kind === null ? [] : [[path, MSG[kind]("shared")]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a kafka binding", { kafka: KAFKA.v050 }],
      ["a number", 42],
    ])("description, servers, parameters, publish, subscribe, messages, address and extensions set to %s never matter", async (_, value) => {
      const channel = { bindings: { kafka: {} }, description: value, servers: value, parameters: value, publish: value, subscribe: value, messages: value, address: value, "x-bindings": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesFor(2))("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: bare, gone: null, fine: complete, tiny: minimal, mqtt: { ...bare, bindings: { mqtt: {} } }, broken: { ...bare, bindings: { kafka: [] } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared", "missing", "shared"],
          ["components.channels.gone", "unusable", "gone"],
          ["components.channels.mqtt.bindings", "missing", "mqtt"],
          ["components.channels.broken.bindings.kafka", "invalid", "broken"],
        ])
      );
    });

    test("checks a channel once at its definition, whatever channels point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders", bindings: { kafka: {} } }, mirror: { $ref: "#/channels/orders" } },
        { components: { ...COMPONENTS, channels: { orders: bare } } }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders", "missing", "orders"]]));
    });

    test("reports each channel that shares a bindings object without kafka at its own bindings reference", async () => {
      const doc = base({ a: { ...bare, bindings: bindingsRef("noKafka") }, b: { ...bare, bindings: bindingsRef("noKafka") }, c: { ...bare, bindings: bindingsRef("noKafkaAlias") } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.a.bindings", "missing", "a"],
          ["channels.b.bindings", "missing", "b"],
          ["channels.c.bindings", "missing", "c"],
        ])
      );
    });

    test("never inspects components.channelBindings entries no channel uses, nor operation, message or server bindings", async () => {
      const components = {
        ...COMPONENTS,
        channelBindings: { ...COMPONENTS.channelBindings, unused: {}, unusedNull: { kafka: null } },
        operationBindings: { noKafka: { amqp: {} }, nullKafka: { kafka: null } },
        messageBindings: { noKafka: {} },
        serverBindings: { nullKafka: { kafka: null } },
        operationTraits: { noKafka: { bindings: {} } },
        messageTraits: { nullKafka: { bindings: { kafka: null } } },
        servers: { backup: { url: "kafka-backup.quality.es:9093", protocol: "kafka", bindings: { kafka: null } } },
      };
      const channel = { ...complete, publish: { bindings: { kafka: null }, traits: [{ $ref: "#/components/operationTraits/noKafka" }], message: { bindings: {}, traits: [{ $ref: "#/components/messageTraits/nullKafka" }] } } };
      expect(findingsOf(await linter.run(base({ [NAME]: channel }, { components })))).toEqual([]);
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
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { bindings: { mqtt: {} } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.bindings", "missing", "dr"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { bindings: { kafka: "lab" } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.bindings.kafka", "invalid", "lab"]]));
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
      const doc = base({ "x-edge.orders": { description: "Edge." } }, { components: { channels: { "x-mirror": { bindings: { "x-kafka": {} } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders", "missing", "x-edge.orders"],
          ["components.channels.x-mirror.bindings", "missing", "x-mirror"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { bindings: {} }, "orders~1eu": {}, "a/b~c": { bindings: { kafka: 1 } }, "orders~0dr": minimal });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.bindings", "missing", "stores/{storeId}/orders"],
          ["channels.orders~1eu", "missing", "orders~1eu"],
          ["channels.a/b~c.bindings.kafka", "invalid", "a/b~c"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { description: "Unnamed." }, constructor: { bindings: { kafka: null } }, toString: complete, valueOf: { bindings: { valueOf: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", ""],
          ["channels.constructor.bindings.kafka", "invalid", "constructor"],
          ["channels.valueOf.bindings", "missing", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { description: "Orders." }, "tab\tbed": null, "zero\u200bwidth": { bindings: { kafka: false } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced", "missing", "orders\nplaced"],
          ["channels.tab\tbed", "unusable", "tab\tbed"],
          ["channels.zero\u200bwidth.bindings.kafka", "invalid", "zero\u200bwidth"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR090: Channel 'orders\\nplaced' must declare a 'kafka' binding.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: every channel must still declare a kafka binding", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withChannel({ ...bare, bindings: { amqp: {}, mqtt: {} } })))).toEqual([[`${AT}.bindings`, MSG.missing(NAME)]]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded, bindings and kafka references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects channels and components.channels: operation, message, server and unused shared bindings, traits, parameters, payloads and x-channels maps are ignored", async () => {
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
