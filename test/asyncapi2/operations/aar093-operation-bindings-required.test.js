const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  ACTION_V2: ACTION,
  atOf,
  messagesFor,
  findingsFor,
  KAFKA,
  KAFKA_CHANNEL,
  KAFKA_MESSAGE,
  KAFKA_SERVER,
  ORDER_PLACED,
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
const NAME = NAMES[2];
const AT = atOf(2);
const MSG = messagesFor(2);
const findings = findingsFor(2);
const v3Findings = findingsFor(3);
const { complete, minimal, bare } = shapesFor(2);
const COMPONENTS = operationComponentsFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const isRef = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && value.$ref !== undefined;
const atOperation = (expected) => expected.map(([path, kind]) => [path.replace(/^@/, AT), kind, NAME, ACTION]);

const FAIL = findings([
  ["channels.payments.cdc.noBindings.v1.publish", "missing", "payments.cdc.noBindings.v1", "publish"],
  ["channels.payments.cdc.emptyBindings.v1.subscribe.bindings", "missing", "payments.cdc.emptyBindings.v1", "subscribe"],
  ["channels.payments.cdc.nullBindings.v1.publish.bindings", "missing", "payments.cdc.nullBindings.v1", "publish"],
  ["channels.payments.cdc.amqpOnly.v1.subscribe.bindings", "missing", "payments.cdc.amqpOnly.v1", "subscribe"],
  ["channels.payments.cdc.mqttAndHttp.v1.publish.bindings", "missing", "payments.cdc.mqttAndHttp.v1", "publish"],
  ["channels.payments.cdc.upperCase.v1.subscribe.bindings", "missing", "payments.cdc.upperCase.v1", "subscribe"],
  ["channels.payments.cdc.extension.v1.publish.bindings", "missing", "payments.cdc.extension.v1", "publish"],
  ["channels.payments.cdc.kafkaSecure.v1.subscribe.bindings", "missing", "payments.cdc.kafkaSecure.v1", "subscribe"],
  ["channels.payments.cdc.nullKafka.v1.publish.bindings.kafka", "invalid", "payments.cdc.nullKafka.v1", "publish"],
  ["channels.payments.cdc.stringKafka.v1.subscribe.bindings.kafka", "invalid", "payments.cdc.stringKafka.v1", "subscribe"],
  ["channels.payments.cdc.listKafka.v1.publish.bindings.kafka", "invalid", "payments.cdc.listKafka.v1", "publish"],
  ["channels.payments.cdc.trueKafka.v1.subscribe.bindings.kafka", "invalid", "payments.cdc.trueKafka.v1", "subscribe"],
  ["channels.payments.cdc.danglingKafka.v1.publish.bindings.kafka", "invalid", "payments.cdc.danglingKafka.v1", "publish"],
  ["channels.payments.cdc.channelOnly.v1.subscribe", "missing", "payments.cdc.channelOnly.v1", "subscribe"],
  ["channels.payments.cdc.messageOnly.v1.publish", "missing", "payments.cdc.messageOnly.v1", "publish"],
  ["channels.payments.cdc.messageTraitOnly.v1.subscribe", "missing", "payments.cdc.messageTraitOnly.v1", "subscribe"],
  ["channels.payments.cdc.serverOnly.v1.publish", "missing", "payments.cdc.serverOnly.v1", "publish"],
  ["channels.payments.cdc.sharedNoKafka.v1.subscribe.bindings", "missing", "payments.cdc.sharedNoKafka.v1", "subscribe"],
  ["channels.payments.cdc.sharedNullKafka.v1.publish.bindings", "invalid", "payments.cdc.sharedNullKafka.v1", "publish"],
  ["channels.payments.cdc.danglingBindings.v1.subscribe.bindings", "missing", "payments.cdc.danglingBindings.v1", "subscribe"],
  ["channels.payments.cdc.traitNoKafka.v1.publish", "missing", "payments.cdc.traitNoKafka.v1", "publish"],
  ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "payments.cdc.traitNullKafka.v1", "subscribe"],
  ["channels.payments.cdc.traitOverrides.v1.publish.traits.0.bindings.kafka", "invalid", "payments.cdc.traitOverrides.v1", "publish"],
  ["channels.payments.cdc.bothMissing.v1.publish", "missing", "payments.cdc.bothMissing.v1", "publish"],
  ["channels.payments.cdc.bothMissing.v1.subscribe.bindings", "missing", "payments.cdc.bothMissing.v1", "subscribe"],
  ["channels.payments.cdc.nullOperation.v1.publish", "unusable", "payments.cdc.nullOperation.v1", "publish"],
  ["channels.payments.cdc.stringOperation.v1.subscribe", "unusable", "payments.cdc.stringOperation.v1", "subscribe"],
  ["channels.payments.cdc.listOperation.v1.publish", "unusable", "payments.cdc.listOperation.v1", "publish"],
  ["channels.payments.cdc.v3Style.v1.subscribe", "missing", "payments.cdc.v3Style.v1", "subscribe"],
  ["channels.x-payments.cdc.partner.v1.publish", "missing", "x-payments.cdc.partner.v1", "publish"],
  ["channels.terminals/{terminalId}/payments.subscribe.bindings", "missing", "terminals/{terminalId}/payments", "subscribe"],
  ["components.channels.refundsShared.publish", "missing", "refundsShared", "publish"],
  ["components.channels.archiveShared.subscribe.bindings", "missing", "archiveShared", "subscribe"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1.publish", "missing", "payments.partner.v1", "publish"],
  ["components.channels.sellerHub.publish", "missing", "sellerHub", "publish"],
  ["components.channels.hop2.subscribe.bindings", "missing", "hop2", "subscribe"],
  ["components.channels.seller/eu~dr.publish.bindings.kafka", "invalid", "seller/eu~dr", "publish"],
  ["components.channels.latin america.subscribe", "missing", "latin america", "subscribe"],
  ["components.channels.espa\u00f1a.publish.bindings", "missing", "espa\u00f1a", "publish"],
  ["x-channel-list.0.publish", "missing", "0", "publish"],
  ["components.x-operations.withoutKafka", "missing", "operationRefs", "subscribe"],
  ["components.x-operations.withoutKafkaToo.bindings", "missing", "operationRefChained", "publish"],
  ["channels.operationRefDangling.publish", "unusable", "operationRefDangling", "publish"],
  ["components.x-operations.loopB", "unusable", "operationRefCycle", "publish"],
  ["info", "missing", "operationRefToInfo", "subscribe"],
  ["components.x-operations.bare", "missing", "operationRefSiblings", "publish"],
  ["channels.bindingsToNoKafka.publish.bindings", "missing", "bindingsToNoKafka", "publish"],
  ["channels.bindingsCyclic.subscribe.bindings", "missing", "bindingsCyclic", "subscribe"],
  ["channels.bindingsSelf.publish.bindings", "missing", "bindingsSelf", "publish"],
  ["channels.bindingsToRoot.subscribe.bindings", "missing", "bindingsToRoot", "subscribe"],
  ["channels.bindingsBadPointer.publish.bindings", "missing", "bindingsBadPointer", "publish"],
  ["channels.bindingsThroughIntermediate.subscribe.bindings", "missing", "bindingsThroughIntermediate", "subscribe"],
  ["channels.bindingsSiblingKafka.publish.bindings", "missing", "bindingsSiblingKafka", "publish"],
  ["channels.kafkaToText.subscribe.bindings.kafka", "invalid", "kafkaToText", "subscribe"],
  ["channels.kafkaCyclic.publish.bindings.kafka", "invalid", "kafkaCyclic", "publish"],
  ["channels.kafkaNonString.subscribe.bindings.kafka", "invalid", "kafkaNonString", "subscribe"],
  ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "traitRefs", "subscribe"],
  ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "traitsChainedNull", "publish"],
  ["channels.traitsDangling.publish", "missing", "traitsDangling", "publish"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0", bindings: { kafka: KAFKA_SERVER } } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withOperation = (operation, channel = {}) => base({ [NAME]: { description: "Orders placed.", ...channel, [ACTION]: operation } });
const withComponents = (extra) => ({ ...COMPONENTS, ...extra });

describe("AAR093 (AsyncAPI 2.x): every publish and subscribe operation must declare a kafka binding", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose operations declare kafka bindings inline, through shared bindings, traits, operation references and external files", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every publish and subscribe operation of channels and components.channels without a usable kafka binding with the exact message", async () => {
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
      const doc = withVersion(base({ [NAME]: { description: "Orders.", [ACTION]: {}, publish: { bindings: {} } } }, { operations: { modern: { action: "send", bindings: { kafka: {} } }, empty: {} } }), version);
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
    expect(findingsOf(await linter.run(base({ [NAME]: { publish: { operationId: "publishOrder" }, subscribe: { bindings: { amqp: {} } } } })))).toEqual([
      [`channels.${NAME}.publish`, `AAR093: The publish operation of channel '${NAME}' must declare a 'kafka' binding.`],
      [`${AT}.bindings`, `AAR093: The subscribe operation of channel '${NAME}' must declare a 'kafka' binding.`],
    ]);
    expect(findingsOf(await linter.run(withOperation({ bindings: { kafka: null } })))).toEqual([[`${AT}.bindings.kafka`, `AAR093: The 'kafka' binding of the subscribe operation of channel '${NAME}' must be an object.`]]);
    expect(findingsOf(await linter.run(withOperation(null)))).toEqual([[AT, `AAR093: The subscribe operation of channel '${NAME}' must be an object declaring a 'kafka' binding.`]]);
  });

  describe("kafka binding values", () => {
    test.each(KAFKA_VALUE_CASES)("bindings.kafka set to %s", async (_, value, usable) => {
      for (const action of ["publish", "subscribe"]) {
        const expected = usable ? [] : [[`channels.${NAME}.${action}.bindings.kafka`, MSG.invalid(NAME, action)]];
        expect(findingsOf(await linter.run(base({ [NAME]: { description: "Orders placed.", [action]: { ...bare, bindings: { kafka: value } } } })))).toEqual(expected);
      }
    });

    test.each(KAFKA_VALUE_CASES)("the kafka binding of shared bindings set to %s is reported at the operation bindings reference", async (_, value, usable) => {
      const components = withComponents({ operationBindings: { ...COMPONENTS.operationBindings, probe: { kafka: value } } });
      const doc = base({ [NAME]: { [ACTION]: { ...bare, bindings: bindingsRef("probe") } } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [[`${AT}.bindings`, MSG.invalid(NAME, ACTION)]]);
    });

    test.each(KAFKA_VALUE_CASES)("the kafka binding of an operation trait set to %s is reported where the trait declares it", async (_, value, usable) => {
      const components = withComponents({ operationTraits: { ...COMPONENTS.operationTraits, probe: { bindings: { kafka: value } } } });
      const doc = base({ [NAME]: { [ACTION]: { ...bare, traits: [traitRef("probe")] } } }, { components });
      expect(findingsOf(await linter.run(doc))).toEqual(usable ? [] : [["components.operationTraits.probe.bindings.kafka", MSG.invalid(NAME, ACTION)]]);
    });
  });

  describe("bindings values", () => {
    test.each(BINDINGS_VALUE_CASES)("bindings set to %s", async (_, value, kind) => {
      const path = kind === "invalid" && !isRef(value) ? `${AT}.bindings.kafka` : `${AT}.bindings`;
      const expected = kind === null ? [] : [[path, MSG[kind](NAME, ACTION)]];
      expect(findingsOf(await linter.run(withOperation({ ...bare, bindings: value })))).toEqual(expected);
    });

    test.each(BINDINGS_VALUE_CASES)("bindings of an operation of a components channel set to %s", async (_, value, kind) => {
      const doc = base(OMIT, { components: withComponents({ channels: { shared: { publish: { ...bare, bindings: value } } } }) });
      const path = kind === "invalid" && !isRef(value) ? "components.channels.shared.publish.bindings.kafka" : "components.channels.shared.publish.bindings";
      const expected = kind === null ? [] : [[path, MSG[kind]("shared", "publish")]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each(BINDINGS_VALUE_CASES)("bindings of an operation trait set to %s, applied to an operation without bindings", async (_, value, kind) => {
      const components = withComponents({ operationTraits: { ...COMPONENTS.operationTraits, probe: { bindings: value } } });
      const doc = base({ [NAME]: { [ACTION]: { ...bare, traits: [traitRef("probe")] } } }, { components });
      const traitPath = isRef(value) ? "components.operationTraits.probe.bindings" : "components.operationTraits.probe.bindings.kafka";
      const expected = kind === null ? [] : [[kind === "missing" ? AT : traitPath, MSG[kind](NAME, ACTION)]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a kafka binding", { kafka: KAFKA.v050 }],
      ["a number", 42],
    ])("operationId, summary, description, tags, security, message, action, channel, messages, reply and extensions set to %s never matter", async (_, value) => {
      const operation = { bindings: { kafka: {} }, operationId: value, summary: value, description: value, tags: value, security: value, externalDocs: value, message: value, action: value, channel: value, messages: value, reply: value, "x-bindings": value };
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual([]);
    });
  });

  describe("kafka binding inherited from operation traits", () => {
    test.each(traitOnlyCases())("an operation without bindings and %s", async (_, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, traits })))).toEqual(findings(atOperation(expected)));
    });

    test.each(traitOverrideCases(2))("%s: the traits override the operation", async (_, bindings, traits, expected) => {
      expect(findingsOf(await linter.run(withOperation({ ...bare, bindings, traits })))).toEqual(findings(atOperation(expected)));
    });

    test("a trait shared by several operations is reported once per operation that inherits its null kafka binding", async () => {
      const doc = base({ first: { publish: { traits: [traitRef("nullKafka")] }, subscribe: { bindings: { kafka: {} }, traits: [traitRef("nullAlias")] } }, second: { subscribe: { bindings: { kafka: null }, traits: [traitRef("kafka")] } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "first", "publish"],
          ["components.operationTraits.nullKafka.bindings.kafka", "invalid", "first", "subscribe"],
        ])
      );
    });
  });

  describe("operation object", () => {
    test.each(operationObjectCasesFor(2))("%s", async (_, operation, expected) => {
      expect(findingsOf(await linter.run(withOperation(operation)))).toEqual(findings(expected));
    });

    test("a kafka binding on the channel, its parameters, servers, messages or message traits never counts", async () => {
      const channel = { bindings: { kafka: KAFKA_CHANNEL }, servers: ["production"], parameters: { region: { description: "Region.", schema: { type: "string" }, bindings: { kafka: {} } } } };
      const operation = { operationId: "receiveOrderPlaced", message: { ...ORDER_PLACED, bindings: { kafka: KAFKA_MESSAGE }, traits: [{ $ref: "#/components/messageTraits/kafkaKey" }] } };
      expect(findingsOf(await linter.run(withOperation(operation, channel)))).toEqual(findings([[AT, "missing", NAME, ACTION]]));
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
      const doc = base(OMIT, { components: withComponents({ channels: { shared: { publish: { bindings: { mqtt: {} } }, subscribe: complete }, gone: { subscribe: null }, fine: { publish: minimal }, broken: { subscribe: { bindings: { kafka: [] } } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared.publish.bindings", "missing", "shared", "publish"],
          ["components.channels.gone.subscribe", "unusable", "gone", "subscribe"],
          ["components.channels.broken.subscribe.bindings.kafka", "invalid", "broken", "subscribe"],
        ])
      );
    });

    test("checks an operation reached through a channel reference once, at the channel definition and with its name", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders", subscribe: { bindings: { kafka: {} } } } },
        { components: withComponents({ channels: { orders: { description: "Orders.", subscribe: { operationId: "receiveOrders" } } } }) }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders.subscribe", "missing", "orders", "subscribe"]]));
    });

    test("checks an operation shared by several channels once, named after the first channel that reaches it", async () => {
      const doc = base({ first: { publish: { $ref: "#/components/x-operations/bare" } }, second: { subscribe: { $ref: "#/components/x-operations/bare" } }, third: { publish: { $ref: "#/channels/first/publish" } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.x-operations.bare", "missing", "first", "publish"]]));
    });

    test("never inspects the operations and components.operations maps of AsyncAPI 3.x", async () => {
      const doc = base({ [NAME]: { publish: minimal } }, { operations: { blank: { action: "send", channel: channelRef(NAME) }, empty: {} }, components: withComponents({ operations: { empty: {}, nullKafka: { bindings: { kafka: null } } } }) });
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
        servers: { backup: { url: "kafka-backup.quality.es:9093", protocol: "kafka", bindings: { kafka: null } } },
      });
      const channel = { bindings: { kafka: null }, publish: { ...complete, message: { bindings: {}, traits: [{ $ref: "#/components/messageTraits/nullKafka" }] } }, subscribe: minimal };
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
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { publish: {} }, local: { subscribe: complete } } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner.publish", "missing", "partner", "publish"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { subscribe: { bindings: { mqtt: {} } } } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.subscribe.bindings", "missing", "dr", "subscribe"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { publish: { bindings: { kafka: "lab" } } } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.publish.bindings.kafka", "invalid", "lab", "publish"]]));
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
      const doc = base({ "x-edge.orders": { publish: {} } }, { components: withComponents({ channels: { "x-mirror": { subscribe: { bindings: { "x-kafka": {} } } } } }) });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders.publish", "missing", "x-edge.orders", "publish"],
          ["components.channels.x-mirror.subscribe.bindings", "missing", "x-mirror", "subscribe"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { subscribe: { bindings: {} } }, "orders~1eu": { publish: {} }, "a/b~c": { subscribe: { bindings: { kafka: 1 } } }, "orders~0dr": { publish: minimal } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.subscribe.bindings", "missing", "stores/{storeId}/orders", "subscribe"],
          ["channels.orders~1eu.publish", "missing", "orders~1eu", "publish"],
          ["channels.a/b~c.subscribe.bindings.kafka", "invalid", "a/b~c", "subscribe"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { publish: {} }, constructor: { subscribe: { bindings: { kafka: null } } }, toString: { publish: complete }, valueOf: { publish: minimal, subscribe: { bindings: { valueOf: {} } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels..publish", "missing", "", "publish"],
          ["channels.constructor.subscribe.bindings.kafka", "invalid", "constructor", "subscribe"],
          ["channels.valueOf.subscribe.bindings", "missing", "valueOf", "subscribe"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { publish: {} }, "tab\tbed": { subscribe: "x" }, "zero\u200bwidth": { subscribe: { bindings: { kafka: false } } } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced.publish", "missing", "orders\nplaced", "publish"],
          ["channels.tab\tbed.subscribe", "unusable", "tab\tbed", "subscribe"],
          ["channels.zero\u200bwidth.subscribe.bindings.kafka", "invalid", "zero\u200bwidth", "subscribe"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR093: The publish operation of channel 'orders\\nplaced' must declare a 'kafka' binding.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: every operation must still declare a kafka binding", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, bindings: { amqp: {}, mqtt: {} } })))).toEqual([[`${AT}.bindings`, MSG.missing(NAME, ACTION)]]);
      expect(findingsOf(await custom.run(withOperation({ ...bare, traits: [traitRef("kafka")] })))).toEqual([]);
    });
  });

  test("validates operations of shared channels once at the channel definition, follows chained, escaped, percent-encoded, operation, bindings, kafka and trait references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects publish and subscribe of channels and components.channels: channel, message and server bindings, unused shared bindings and traits, 3.x operations and x-channels maps are ignored", async () => {
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
