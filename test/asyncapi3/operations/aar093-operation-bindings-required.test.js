const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  messagesFor,
  findingsFor,
  KAFKA,
  KAFKA_CHANNEL,
  KAFKA_MESSAGE,
  KAFKA_SERVER,
  ORDER_PLACED,
  CHANNELS_V3,
  traitRef,
  bindingsRef,
  channelRef,
  shapesFor,
  operationComponentsFor,
  KAFKA_VALUE_CASES,
  BINDINGS_VALUE_CASES,
  traitOnlyCases,
  traitOverrideCases,
  operationObjectCasesFor,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar093-operation-bindings-required");
const okExample = require("./AAR093/ok-example");
const failExample = require("./AAR093/fail-example");
const failSharedRef = require("./AAR093/fail-shared-ref");
const okStructuralEdges = require("./AAR093/ok-structural-edges");
const failLargeGenerated = require("./AAR093/fail-large-generated");

const RULE = "asa:AAR093";
const OMIT = Symbol("omit");
const NAME = NAMES[3];
const AT = atOf(3);
const MSG = messagesFor(3);
const findings = findingsFor(3);
const v2Findings = findingsFor(2);
const { complete, minimal, bare } = shapesFor(3);
const COMPONENTS = operationComponentsFor(3);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const isRef = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && value.$ref !== undefined;
const atOperation = (expected) => expected.map(([path, kind]) => [path.replace(/^@/, AT), kind, NAME]);

const FAIL = findings([
  ["operations.noBindings", "missing", "noBindings"],
  ["operations.emptyBindings.bindings", "missing", "emptyBindings"],
  ["operations.nullBindings.bindings", "missing", "nullBindings"],
  ["operations.amqpOnly.bindings", "missing", "amqpOnly"],
  ["operations.mqttAndHttp.bindings", "missing", "mqttAndHttp"],
  ["operations.upperCase.bindings", "missing", "upperCase"],
  ["operations.extension.bindings", "missing", "extension"],
  ["operations.kafkaSecure.bindings", "missing", "kafkaSecure"],
  ["operations.nullKafka.bindings.kafka", "invalid", "nullKafka"],
  ["operations.stringKafka.bindings.kafka", "invalid", "stringKafka"],
  ["operations.listKafka.bindings.kafka", "invalid", "listKafka"],
  ["operations.numberKafka.bindings.kafka", "invalid", "numberKafka"],
  ["operations.danglingKafka.bindings.kafka", "invalid", "danglingKafka"],
  ["operations.channelOnly", "missing", "channelOnly"],
  ["operations.messageOnly", "missing", "messageOnly"],
  ["operations.messageTraitOnly", "missing", "messageTraitOnly"],
  ["operations.replyOnly", "missing", "replyOnly"],
  ["operations.sharedNoKafka.bindings", "missing", "sharedNoKafka"],
  ["operations.sharedNullKafka.bindings", "invalid", "sharedNullKafka"],
  ["operations.danglingBindings.bindings", "missing", "danglingBindings"],
  ["operations.traitNoKafka", "missing", "traitNoKafka"],
  ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "traitNullKafka"],
  ["operations.ownWins.bindings.kafka", "invalid", "ownWins"],
  ["operations.emptyOperation", "missing", "emptyOperation"],
  ["operations.nullOperation", "unusable", "nullOperation"],
  ["operations.stringOperation", "unusable", "stringOperation"],
  ["operations.listOperation", "unusable", "listOperation"],
  ["operations.v2Style", "missing", "v2Style"],
  ["operations.x-partner", "missing", "x-partner"],
  ["operations.terminals/payments.bindings", "missing", "terminals/payments"],
  ["components.operations.refundsShared", "missing", "refundsShared"],
  ["components.operations.archiveShared.bindings", "missing", "archiveShared"],
  ["components.operations.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["operations.partner", "missing", "partner"],
  ["components.operations.carrierHub", "missing", "carrierHub"],
  ["components.operations.hop2.bindings", "missing", "hop2"],
  ["components.operations.carrier/eu~dr.bindings.kafka", "invalid", "carrier/eu~dr"],
  ["components.operations.north america", "missing", "north america"],
  ["components.operations.recepci\u00f3n.bindings", "missing", "recepci\u00f3n"],
  ["operations.dangling", "unusable", "dangling"],
  ["components.operations.loopA", "unusable", "loopA"],
  ["components.operations.loopB", "unusable", "loopB"],
  ["operations.selfLoop", "unusable", "selfLoop"],
  ["x-operation-list.0", "missing", "0"],
  ["channels.replies", "missing", "replies"],
  ["info", "missing", "info"],
  ["operations.toRoot", "unusable", "toRoot"],
  ["operations.nonStringRef", "unusable", "nonStringRef"],
  ["operations.emptyRef", "unusable", "emptyRef"],
  ["operations.badPointer", "unusable", "badPointer"],
  ["operations.badEncoding", "unusable", "badEncoding"],
  ["operations.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.operations.bare", "missing", "bare"],
  ["operations.bindingsToNoKafka.bindings", "missing", "bindingsToNoKafka"],
  ["operations.bindingsCyclic.bindings", "missing", "bindingsCyclic"],
  ["operations.bindingsSelf.bindings", "missing", "bindingsSelf"],
  ["operations.bindingsToRoot.bindings", "missing", "bindingsToRoot"],
  ["operations.bindingsBadPointer.bindings", "missing", "bindingsBadPointer"],
  ["operations.bindingsThroughIntermediate.bindings", "missing", "bindingsThroughIntermediate"],
  ["operations.bindingsSiblingKafka.bindings", "missing", "bindingsSiblingKafka"],
  ["operations.kafkaToText.bindings.kafka", "invalid", "kafkaToText"],
  ["operations.kafkaCyclic.bindings.kafka", "invalid", "kafkaCyclic"],
  ["operations.kafkaNonString.bindings.kafka", "invalid", "kafkaNonString"],
  ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "traitListRef"],
  ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "traitsChainedNull"],
  ["operations.traitsDangling", "missing", "traitsDangling"],
  ["components.operations.nullShared", "unusable", "nullShared"],
]);

const base = (operations, extra = {}) => ({
  asyncapi: "3.0.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", bindings: { kafka: KAFKA_SERVER } } },
  channels: CHANNELS_V3,
  ...(operations === OMIT ? {} : { operations }),
  components: COMPONENTS,
  ...extra,
});
const withOperation = (operation) => base({ [NAME]: operation });
const withComponents = (extra) => ({ ...COMPONENTS, ...extra });

describe("AAR093 (AsyncAPI 3.x): every operation must declare a kafka binding", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose operations declare kafka bindings inline, through shared bindings, traits, references, replies and external files", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every operation of operations and components.operations without a usable kafka binding with the exact message", async () => {
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
      const doc = withVersion(base({ empty: {} }, { channels: { orders: { address: "orders", publish: { bindings: { kafka: {} } }, subscribe: {} } } }), version);
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
    expect(findingsOf(await linter.run(withOperation(bare)))).toEqual([[AT, `AAR093: Operation '${NAME}' must declare a 'kafka' binding.`]]);
    expect(findingsOf(await linter.run(withOperation({ ...bare, bindings: { amqp: {} } })))).toEqual([[`${AT}.bindings`, `AAR093: Operation '${NAME}' must declare a 'kafka' binding.`]]);
    expect(findingsOf(await linter.run(withOperation({ ...bare, bindings: { kafka: null } })))).toEqual([[`${AT}.bindings.kafka`, `AAR093: The 'kafka' binding of operation '${NAME}' must be an object.`]]);
    expect(findingsOf(await linter.run(withOperation(null)))).toEqual([[AT, `AAR093: Operation '${NAME}' must be an object declaring a 'kafka' binding.`]]);
  });

  describe("kafka binding values", () => {
    test.each(KAFKA_VALUE_CASES)("bindings.kafka set to %s", async (_, value, usable) => {
      for (const action of ["send", "receive"]) {
        const expected = usable ? [] : [[`${AT}.bindings.kafka`, MSG.invalid(NAME)]];
        expect(findingsOf(await linter.run(withOperation({ ...bare, action, bindings: { kafka: value } })))).toEqual(expected);
      }
    });

    test.each(KAFKA_VALUE_CASES)("the kafka binding of shared bindings set to %s is reported at the operation bindings reference", async (_, value, usable) => {
      const components = withComponents({ operationBindings: { ...COMPONENTS.operationBindings, probe: { kafka: value } } });
      const doc = base({ [NAME]: { ...bare, bindings: bindingsRef("probe") } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [[`${AT}.bindings`, MSG.invalid(NAME)]]);
    });

    test.each(KAFKA_VALUE_CASES)("the kafka binding of an operation trait set to %s is reported where the trait declares it", async (_, value, usable) => {
      const components = withComponents({ operationTraits: { ...COMPONENTS.operationTraits, probe: { bindings: { kafka: value } } } });
      const doc = base({ [NAME]: { ...bare, traits: [traitRef("probe")] } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [["components.operationTraits.probe.bindings.kafka", MSG.invalid(NAME)]]);
    });
  });

  describe("bindings values", () => {
    test.each(BINDINGS_VALUE_CASES)("bindings set to %s", async (_, value, kind) => {
      const path = kind === "invalid" && !isRef(value) ? `${AT}.bindings.kafka` : `${AT}.bindings`;
      const expected = kind === null ? [] : [[path, MSG[kind](NAME)]];
      expect(findingsOf(await linter.run(withOperation({ ...bare, bindings: value })))).toEqual(expected);
    });

    test.each(BINDINGS_VALUE_CASES)("bindings of a components operation set to %s", async (_, value, kind) => {
      const doc = base(OMIT, { components: withComponents({ operations: { shared: { ...bare, bindings: value } } }) });
      const path = kind === "invalid" && !isRef(value) ? "components.operations.shared.bindings.kafka" : "components.operations.shared.bindings";
      const expected = kind === null ? [] : [[path, MSG[kind]("shared")]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each(BINDINGS_VALUE_CASES)("bindings of an operation trait set to %s, applied to an operation without bindings", async (_, value, kind) => {
      const components = withComponents({ operationTraits: { ...COMPONENTS.operationTraits, probe: { bindings: value } } });
      const doc = base({ [NAME]: { ...bare, traits: [traitRef("probe")] } }, { components });
      const traitPath = isRef(value) ? "components.operationTraits.probe.bindings" : "components.operationTraits.probe.bindings.kafka";
      const expected = kind === null ? [] : [[kind === "missing" ? AT : traitPath, MSG[kind](NAME)]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a kafka binding", { kafka: KAFKA.v050 }],
      ["a number", 42],
    ])("action, channel, title, summary, description, security, tags, messages, reply, publish, subscribe and extensions set to %s never matter", async (_, value) => {
      const operation = { bindings: { kafka: {} }, action: value, channel: value, title: value, summary: value, description: value, security: value, tags: value, externalDocs: value, messages: value, reply: value, publish: value, subscribe: value, "x-bindings": value };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual([]);
    });
  });

  describe("kafka binding inherited from operation traits", () => {
    test.each(traitOnlyCases())("an operation without bindings and %s", async (_, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, traits })))).toEqual(findings(atOperation(expected)));
    });

    test.each(traitOverrideCases(3))("%s: the operation wins over its traits", async (_, bindings, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, bindings, traits })))).toEqual(findings(atOperation(expected)));
    });

    test("a trait shared by several operations is reported once per operation that inherits its null kafka binding", async () => {
      const doc = base({ first: { ...bare, traits: [traitRef("nullKafka")] }, second: { ...bare, traits: [traitRef("kafka"), traitRef("nullAlias")] }, third: { ...bare, bindings: { kafka: {} }, traits: [traitRef("nullKafka")] } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "first"],
          ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "second"],
        ])
      );
    });
  });

  describe("operation object", () => {
    test.each(operationObjectCasesFor(3))("%s", async (_, operation, expected) => {
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(expected));
    });

    test("a kafka binding on the channel, its messages, message traits, servers or the reply channel never counts", async () => {
      const channels = { ...CHANNELS_V3, dedicated: { address: "orders.dedicated", servers: [{ $ref: "#/servers/production" }], bindings: { kafka: KAFKA_CHANNEL }, messages: { orderPlaced: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE }, traits: [{ $ref: "#/components/messageTraits/kafkaKey" }] } } } };
      const operation = { action: "receive", channel: channelRef("dedicated"), messages: [{ $ref: "#/channels/dedicated/messages/orderPlaced" }], reply: { channel: channelRef("replies") } };
      expect(findingsOf(await linter.run(base({ [NAME]: operation }, { channels })))).toEqual(findings([[AT, "missing", NAME]]));
    });

    test("checks the same objects under components.operations, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: withComponents({ operations: { shared: bare, gone: null, fine: complete, tiny: minimal, mqtt: { ...bare, bindings: { mqtt: {} } }, broken: { ...bare, bindings: { kafka: [] } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operations.shared", "missing", "shared"],
          ["components.operations.gone", "unusable", "gone"],
          ["components.operations.mqtt.bindings", "missing", "mqtt"],
          ["components.operations.broken.bindings.kafka", "invalid", "broken"],
        ])
      );
    });

    test("checks an operation once at its definition, whatever operations point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/operations/orders" }, ordersAgain: { $ref: "#/components/operations/orders", bindings: { kafka: {} } }, mirror: { $ref: "#/operations/orders" } },
        { components: withComponents({ operations: { orders: bare } }) }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.operations.orders", "missing", "orders"]]));
    });

    test("never inspects publish and subscribe operations of channels, operations inside replies or components.replies", async () => {
      const channels = { ...CHANNELS_V3, legacy: { address: "legacy", publish: {}, subscribe: { bindings: { kafka: null } } } };
      const doc = base({ [NAME]: complete }, { channels, components: withComponents({ replies: { inline: { channel: channelRef("replies"), bindings: {} } }, channels: { shared: { address: "shared", publish: {} } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("never inspects components.operationBindings or operationTraits entries no operation uses, nor channel, message or server bindings", async () => {
      const components = withComponents({
        operationBindings: { ...COMPONENTS.operationBindings, unused: {}, unusedNull: { kafka: null } },
        operationTraits: { ...COMPONENTS.operationTraits, unused: { bindings: {} }, unusedNull: { bindings: { kafka: null } } },
        channelBindings: { noKafka: { amqp: {} }, nullKafka: { kafka: null } },
        messageBindings: { noKafka: {} },
        serverBindings: { nullKafka: { kafka: null } },
        messageTraits: { nullKafka: { bindings: { kafka: null } } },
        servers: { backup: { host: "kafka-backup.quality.es:9093", protocol: "kafka", bindings: { kafka: null } } },
      });
      const channels = { ...CHANNELS_V3, orders: { ...CHANNELS_V3.orders, bindings: { kafka: null }, messages: { orderPlaced: { name: "orderPlaced", bindings: {}, traits: [{ $ref: "#/components/messageTraits/nullKafka" }] } } } };
      expect(findingsOf(await linter.run(base({ [NAME]: complete, minimal }, { components, channels })))).toEqual([]);
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
      const viaOperations = base({ $ref: "#/x-operation-map" }, { "x-operation-map": { partner: { action: "send" }, local: complete } });
      expect(findingsOf(await linter.run(viaOperations))).toEqual(findings([["x-operation-map.partner", "missing", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { operations: { dr: { bindings: { mqtt: {} } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.operations.dr.bindings", "missing", "dr"]]));
      const operationsMapRef = base(OMIT, { components: { operations: { $ref: "#/x-shared" } }, "x-shared": { lab: { bindings: { kafka: "lab" } } } });
      expect(findingsOf(await linter.run(operationsMapRef))).toEqual(findings([["x-shared.lab.bindings.kafka", "invalid", "lab"]]));
    });

    test("checks an operations map shared by operations and components.operations once", async () => {
      const doc = base({ $ref: "#/components/operations" }, { components: { operations: { lab: { action: "send" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.operations.lab", "missing", "lab"]]));
    });

    test("ignores an operations map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./operations.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { operations: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/operations" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { operations: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("operation names", () => {
    test("checks operations whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { action: "send" } }, { components: withComponents({ operations: { "x-mirror": { bindings: { "x-kafka": {} } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.x-edge", "missing", "x-edge"],
          ["components.operations.x-mirror.bindings", "missing", "x-mirror"],
        ])
      );
    });

    test("reports operations whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { bindings: {} }, "orders~0dr": {}, "a/b~c": { bindings: { kafka: 1 } }, "orders.placed.v1": minimal });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.eu~1west.bindings", "missing", "eu~1west"],
          ["operations.orders~0dr", "missing", "orders~0dr"],
          ["operations.a/b~c.bindings.kafka", "invalid", "a/b~c"],
        ])
      );
    });

    test("checks an empty operation key and operations named like Object members", async () => {
      const doc = base({ "": { action: "send" }, constructor: { bindings: { kafka: null } }, toString: complete, valueOf: { bindings: { valueOf: {} } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["operations.", "missing", ""],
          ["operations.constructor.bindings.kafka", "invalid", "constructor"],
          ["operations.valueOf.bindings", "missing", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of operation names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { action: "send" }, "tab\tbed": null, "zero\u200bwidth": { bindings: { kafka: false } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["operations.orders\nplaced", "missing", "orders\nplaced"],
          ["operations.tab\tbed", "unusable", "tab\tbed"],
          ["operations.zero\u200bwidth.bindings.kafka", "invalid", "zero\u200bwidth"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR093: Operation 'orders\\nplaced' must declare a 'kafka' binding.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: every operation must still declare a kafka binding", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, bindings: { amqp: {}, mqtt: {} } })))).toEqual([[`${AT}.bindings`, MSG.missing(NAME)]]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, traits: [traitRef("kafka")] })))).toEqual([]);
    });
  });

  test("validates a shared operation once at its definition, follows chained, escaped, percent-encoded, bindings, kafka and trait references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects operations and components.operations: channel, message, server and reply bindings, unused shared bindings and traits, 2.x operations and x-operations maps are ignored", async () => {
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
