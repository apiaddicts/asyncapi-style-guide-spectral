const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  MSG,
  findings,
  KAFKA,
  KAFKA_SERVER,
  bindingsRef,
  messageRef,
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
const NAME = NAMES[3];
const AT = atOf(3);
const { complete, minimal, bare } = shapesFor(3);
const COMPONENTS = channelComponentsFor(3);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const isRef = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && value.$ref !== undefined;

const FAIL = findings([
  ["channels.noBindings", "missing", "noBindings"],
  ["channels.emptyBindings.bindings", "missing", "emptyBindings"],
  ["channels.nullBindings.bindings", "missing", "nullBindings"],
  ["channels.amqpOnly.bindings", "missing", "amqpOnly"],
  ["channels.mqttAndWs.bindings", "missing", "mqttAndWs"],
  ["channels.upperCase.bindings", "missing", "upperCase"],
  ["channels.extension.bindings", "missing", "extension"],
  ["channels.kafkaSecure.bindings", "missing", "kafkaSecure"],
  ["channels.nullKafka.bindings.kafka", "invalid", "nullKafka"],
  ["channels.stringKafka.bindings.kafka", "invalid", "stringKafka"],
  ["channels.listKafka.bindings.kafka", "invalid", "listKafka"],
  ["channels.numberKafka.bindings.kafka", "invalid", "numberKafka"],
  ["channels.danglingKafka.bindings.kafka", "invalid", "danglingKafka"],
  ["channels.messageOnly", "missing", "messageOnly"],
  ["channels.messageTraitOnly", "missing", "messageTraitOnly"],
  ["channels.operationOnly", "missing", "operationOnly"],
  ["channels.serverOnly", "missing", "serverOnly"],
  ["channels.sharedNoKafka.bindings", "missing", "sharedNoKafka"],
  ["channels.sharedNullKafka.bindings", "invalid", "sharedNullKafka"],
  ["channels.danglingBindings.bindings", "missing", "danglingBindings"],
  ["channels.tripReplies", "missing", "tripReplies"],
  ["channels.v2Style", "missing", "v2Style"],
  ["channels.nullChannel", "unusable", "nullChannel"],
  ["channels.stringChannel", "unusable", "stringChannel"],
  ["channels.listChannel", "unusable", "listChannel"],
  ["channels.x-partner", "missing", "x-partner"],
  ["channels.chargerTelemetry.bindings", "missing", "chargerTelemetry"],
  ["components.channels.sharedHub", "missing", "sharedHub"],
  ["components.channels.legacyQueue.bindings", "missing", "legacyQueue"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.partner", "missing", "partner"],
  ["components.channels.carrierHub", "missing", "carrierHub"],
  ["components.channels.hop2.bindings", "missing", "hop2"],
  ["components.channels.carrier/eu~dr.bindings", "missing", "carrier/eu~dr"],
  ["components.channels.north america", "missing", "north america"],
  ["components.channels.recepci\u00f3n.bindings.kafka", "invalid", "recepci\u00f3n"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.bareShared", "missing", "bareShared"],
  ["operations.sendDispatch", "missing", "sendDispatch"],
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
  asyncapi: "3.0.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", bindings: { kafka: KAFKA_SERVER } } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });

describe("AAR090 (AsyncAPI 3.x): every channel must declare a kafka binding", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels declare kafka bindings, with operations, replies, multi-format payloads, parameters without schema, shared and external bindings", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every channel of channels and components.channels without a usable kafka binding with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("applies the same check whatever the asyncapi value is", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "2.6.0", "latest", "", null, false]) {
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
    ])("address, description, messages, servers, parameters, title, summary, publish, subscribe and extensions set to %s never matter", async (_, value) => {
      const channel = { bindings: { kafka: {} }, address: value, description: value, messages: value, servers: value, parameters: value, title: value, summary: value, publish: value, subscribe: value, "x-bindings": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesFor(3))("%s", async (_, channel, expected) => {
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

    test("checks a channel once at its definition, whether operations, replies or other channels point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders", bindings: { kafka: {} } }, replies: { address: null, description: "Replies.", messages: {} } },
        {
          components: { ...COMPONENTS, channels: { orders: bare } },
          operations: {
            receiveOrders: { action: "receive", channel: { $ref: "#/channels/orders" }, bindings: { kafka: { groupId: { type: "string" } } } },
            sendOrders: { action: "send", channel: { $ref: "#/components/channels/orders" }, reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/replies" } } },
          },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.orders", "missing", "orders"],
          ["channels.replies", "missing", "replies"],
        ])
      );
    });

    test("never inspects channels declared only inside operations, replies or components.operations", async () => {
      const doc = base(
        { orders: complete },
        {
          operations: { sendOrders: { action: "send", channel: { $ref: "#/channels/orders" }, reply: { address: { location: "$message.header#/replyTo" }, channel: { address: null, messages: {} } } } },
          components: { ...COMPONENTS, operations: { inlineChannel: { action: "send", channel: { address: "inline" } } }, replies: { inline: { channel: { bindings: {} } } } },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual([]);
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
        servers: { backup: { host: "kafka-backup.quality.es:9093", protocol: "kafka", bindings: { kafka: null } } },
      };
      const channel = { ...complete, messages: { orderPlaced: { name: "orderPlaced", bindings: {}, traits: [{ $ref: "#/components/messageTraits/nullKafka" }] } } };
      const operations = { sendOrder: { action: "send", channel: { $ref: `#/channels/${NAME}` }, bindings: { kafka: null }, traits: [{ $ref: "#/components/operationTraits/noKafka" }], messages: [messageRef("orderPlaced")] } };
      expect(findingsOf(await linter.run(base({ [NAME]: channel }, { components, operations })))).toEqual([]);
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
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { bindings: { mqtt: {} } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.bindings", "missing", "dr"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { bindings: { kafka: "lab" } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.bindings.kafka", "invalid", "lab"]]));
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
      const doc = base({ "x-edge": { address: "edge" } }, { components: { channels: { "x-mirror": { bindings: { "x-kafka": {} } } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge", "missing", "x-edge"],
          ["components.channels.x-mirror.bindings", "missing", "x-mirror"],
        ])
      );
    });

    test("reports channels whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { bindings: {} }, "orders~0dr": {}, "a/b~c": { bindings: { kafka: 1 } }, "orders.placed.v1": minimal });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.eu~1west.bindings", "missing", "eu~1west"],
          ["channels.orders~0dr", "missing", "orders~0dr"],
          ["channels.a/b~c.bindings.kafka", "invalid", "a/b~c"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { address: "unnamed" }, constructor: { bindings: { kafka: null } }, toString: complete, valueOf: { bindings: { valueOf: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", ""],
          ["channels.constructor.bindings.kafka", "invalid", "constructor"],
          ["channels.valueOf.bindings", "missing", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { address: "orders" }, "tab\tbed": null, "zero\u200bwidth": { bindings: { kafka: false } } });
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

  test("only inspects channels and components.channels: operations, replies, operation, message, server and unused shared bindings, traits, payloads and x-channels maps are ignored", async () => {
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

  test("handles a very large document with operations and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
