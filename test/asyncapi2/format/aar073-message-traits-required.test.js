const { linterForRule, traitRef } = require("../../helpers/utils");
const {
  CH,
  TR,
  REQUIRED_TRAIT_COMPONENTS,
  REQUIRED_TRAIT_CASES,
  REQUIRED_TRAIT_NAME_CASES,
  REQUIRED_TRAIT_MESSAGES: MSG,
  REQUIRED_TRAIT_PROBES,
  REQUIRED_TRAIT_OPTIONS,
  byFinding,
  requiredTraitFindings,
  namedTraitFindings,
  requiredTraitProbeFindings,
} = require("../../helpers/rules/aar073-message-traits-required");
const okExample = require("./AAR073/ok-example");
const failExample = require("./AAR073/fail-example");
const failSharedRef = require("./AAR073/fail-shared-ref");
const okStructuralEdges = require("./AAR073/ok-structural-edges");
const failLargeGenerated = require("./AAR073/fail-large-generated");

const RULE = "asa:AAR073";
const NAMED = { "required-traits": "commonHeaders,tracing" };
const W = "channels.coldchain.cdc.shipments.temperature.v2";
const R = "channels.coldchain.cmd.reefers.setpoint.v1";
const S = "channels.coldchain/sensors/{sensorId}/readings";
const H = "channels.coldchain.sys.gateways.heartbeat.v1";
const X = "channels.x-coldchain.legacy.feed";

const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byFinding);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const toFindings = (expected) => expected.map(([path, kind, ...args]) => [path, MSG[kind](...args)]).sort(byFinding);
const lacks = (path, ...names) => names.map((name) => [path, MSG.trait(name)]);

const FAIL_DEFAULT = [
  [`${W}.publish.message`, MSG.missing()],
  [`${W}.subscribe.message.oneOf.1.traits`, MSG.none()],
  [`${W}.subscribe.message.oneOf.4.oneOf.0`, MSG.missing()],
  [`${R}.publish.message.traits`, MSG.notArray()],
  [`${R}.subscribe.message.traits`, MSG.none()],
  [`${S}.publish.message.traits`, MSG.none()],
  [`${X}.publish.message`, MSG.missing()],
  ["components.channels.maintenanceWindows.subscribe.message.traits", MSG.none()],
  ["components.messages.shipmentDelayed", MSG.missing()],
  ["components.messages.reeferAlarm.traits", MSG.none()],
  ["components.messages.customsHold.traits", MSG.notArray()],
  ["components.messages.podSigned.oneOf.0", MSG.missing()],
  ["components.messages.x-legacy-manifest.traits", MSG.none()],
].sort(byFinding);

const FAIL_NAMED = [
  ...lacks(`${W}.publish.message`, CH, TR),
  ...lacks(`${W}.subscribe.message.oneOf.1.traits`, CH, TR),
  ...lacks(`${W}.subscribe.message.oneOf.2.traits`, TR),
  ...lacks(`${W}.subscribe.message.oneOf.3.traits`, CH, TR),
  ...lacks(`${W}.subscribe.message.oneOf.4.oneOf.0`, CH, TR),
  [`${R}.publish.message.traits`, MSG.notArray()],
  ...lacks(`${R}.subscribe.message.traits`, CH, TR),
  ...lacks(`${S}.publish.message.traits`, CH, TR),
  ...lacks(`${H}.subscribe.message.traits`, TR),
  ...lacks(`${X}.publish.message`, CH, TR),
  ...lacks("components.channels.maintenanceWindows.subscribe.message.traits", CH, TR),
  ...lacks("components.messages.shipmentDelayed", CH, TR),
  ...lacks("components.messages.reeferAlarm.traits", CH, TR),
  ...lacks("components.messages.sensorCalibrated.traits", CH, TR),
  ["components.messages.customsHold.traits", MSG.notArray()],
  ...lacks("components.messages.podSigned.oneOf.0", CH, TR),
  ...lacks("components.messages.x-legacy-manifest.traits", CH, TR),
  ...lacks("components.messages.temperatureExcursion.traits", TR),
  ...lacks("components.messages.driverHandover.traits", CH, TR),
  ...lacks("components.messages.palletScanned.traits", CH),
  ...lacks("components.messages.customsCleared.traits", TR),
].sort(byFinding);

const SHARED_DEFAULT = [
  ["components.messages.paymentAuthorized", MSG.missing()],
  ["components.channels.refunds.subscribe.message.traits", MSG.none()],
  ["components.messages.paymentCaptured.traits", MSG.none()],
  ["components.messages.malformedPercent.traits", MSG.none()],
  ["components.messages.missingSlash.traits", MSG.none()],
  ["components.messages.rootPointer.traits", MSG.none()],
  ["components.messages.nonStringRef.traits", MSG.none()],
  ["components.messages.cyclicList.traits", MSG.none()],
  ["components.messages.sharedEmptyA.traits", MSG.none()],
  ["components.messages.sharedEmptyB.traits", MSG.none()],
].sort(byFinding);

const SHARED_NAMED = [
  ...lacks("components.messages.paymentAuthorized", CH, TR),
  ...lacks("components.channels.refunds.subscribe.message.traits", CH, TR),
  ...["paymentCaptured", "fxRateFixed", "escapedTilde", "malformedPercent", "missingSlash", "rootPointer", "nonStringRef", "cyclicList", "sharedEmptyA", "sharedEmptyB"].flatMap((key) =>
    lacks(`components.messages.${key}.traits`, CH, TR)
  ),
  ...lacks("components.messages.tenantChain.traits", TR),
  ...lacks("components.messages.percentTracing.traits", CH),
].sort(byFinding);

const UNRELATED_OPTIONS = [
  ["an empty object", {}],
  ["a camelCase required-traits key", { requiredTraits: "commonHeaders,tracing" }],
  ["a snake_case required-traits key", { required_traits: "commonHeaders" }],
  ["a fields-to-apply list", { "fields-to-apply": "traits" }],
  ["a pattern", { pattern: "^commonHeaders$" }],
  ["a traits list", { traits: [] }],
  ["null and non-string values", { "fields-to-apply": null, pattern: 42, traits: true }],
];

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Message Trait Locations", version: "1.0.0" }, ...extra });
const bare = { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } } };
const applied = { ...bare, traits: [{ $ref: "#/components/messageTraits/commonHeaders" }, { $ref: "#/components/messageTraits/tracing" }] };

const LOCATIONS = [
  ["publish message", "channels.orders.publish.message", { channels: { orders: { publish: { message: bare } } } }],
  ["subscribe message", "channels.orders.subscribe.message", { channels: { orders: { subscribe: { message: bare } } } }],
  ["oneOf member", "channels.orders.publish.message.oneOf.1", { channels: { orders: { publish: { message: { oneOf: [{ $ref: "#/components/messages/ok" }, bare] } } } } }],
  ["nested oneOf member", "channels.orders.publish.message.oneOf.0.oneOf.0", { channels: { orders: { publish: { message: { oneOf: [{ oneOf: [bare] }] } } } } }],
  ["parameterized channel message", "channels.orders/{orderId}.subscribe.message", { channels: { "orders/{orderId}": { parameters: { orderId: { schema: { type: "string" } } }, subscribe: { message: bare } } } }],
  ["components.channels message", "components.channels.audit.subscribe.message", { components: { channels: { audit: { subscribe: { message: bare } } } } }],
  ["components.channels oneOf member", "components.channels.audit.publish.message.oneOf.0", { components: { channels: { audit: { publish: { message: { oneOf: [bare] } } } } } }],
  ["components.messages", "components.messages.m", { components: { messages: { m: bare } } }],
  ["components.messages oneOf member", "components.messages.m.oneOf.0", { components: { messages: { m: { oneOf: [bare] } } } }],
];

const withLocation = (extra) => {
  const doc = base(extra);
  doc.components = {
    ...REQUIRED_TRAIT_COMPONENTS,
    ...doc.components,
    messages: { ...(doc.components && doc.components.messages), ok: applied },
  };
  return doc;
};

const caseDoc = (fields) => base({ components: { ...REQUIRED_TRAIT_COMPONENTS, messages: { m: { ...bare, ...fields } } } });
const probeDoc = () => base({ components: { ...REQUIRED_TRAIT_COMPONENTS, messages: Object.fromEntries(Object.entries(REQUIRED_TRAIT_PROBES).map(([key, probe]) => [key, { ...bare, ...probe.fields }])) } });

describe("AAR073 (AsyncAPI 2.x): every message must apply at least one message trait and every required trait", () => {
  let linter;
  let named;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    named = await linterForRule(RULE, { functionOptions: NAMED });
  });

  test("passes a realistic multi-protocol document whose messages apply both organization traits through references, chains, tuples, lists and external files", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every message without traits, with an empty or unusable list or with a non-array value in channels, oneOf members, components.channels and components.messages", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_DEFAULT);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED_DEFAULT);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await named.run(withVersion(failExample, version)))).toEqual(FAIL_NAMED);
    expect(findingsOf(await named.run(withVersion(failSharedRef, version)))).toEqual(SHARED_NAMED);
    expect(findingsOf(await named.run(withVersion(okExample, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    }
  });

  test.each(LOCATIONS)("reports a %s without traits at the message itself", async (_, path, extra) => {
    expect(findingsOf(await linter.run(withLocation(extra)))).toEqual([[path, MSG.missing()]]);
    expect(findingsOf(await named.run(withLocation(extra)))).toEqual(lacks(path, CH, TR).sort(byFinding));
  });

  test("reports with the warn severity and one finding per message", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL_DEFAULT.length);
    expect(new Set(results.map((r) => r.path.join("."))).size).toBe(FAIL_DEFAULT.length);
    results.forEach((r) => expect(r.severity).toBe(1));
  });

  describe("traits value", () => {
    test.each(REQUIRED_TRAIT_CASES)("%s", async (_, fields, kind) => {
      expect(findingsOf(await linter.run(caseDoc(fields)))).toEqual(requiredTraitFindings("components.messages.m", kind));
    });

    test("does not count operation traits: they apply to the operation, not to its message", async () => {
      const doc = base({
        channels: { orders: { publish: { traits: [{ $ref: "#/components/operationTraits/commonHeaders" }, { $ref: "#/components/operationTraits/tracing" }], message: bare } } },
        components: { operationTraits: { commonHeaders: { bindings: { kafka: { clientId: { type: "string" } } } }, tracing: { description: "Traced." } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([["channels.orders.publish.message", MSG.missing()]]);
      expect(findingsOf(await named.run(doc))).toEqual(lacks("channels.orders.publish.message", CH, TR));
    });

    test("ignores trait-like keys anywhere but the message: payload properties, extensions and orphan components", async () => {
      const doc = base({
        channels: { orders: { "x-traits": [], publish: { "x-traits": [], message: { ...applied, payload: { type: "object", properties: { traits: { type: "array" } } }, "x-traits": [] } } } },
        components: { ...REQUIRED_TRAIT_COMPONENTS, messageTraits: { ...REQUIRED_TRAIT_COMPONENTS.messageTraits, orphan: { traits: [] } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
      expect(findingsOf(await named.run(doc))).toEqual([]);
    });

    test("only needs one valid trait per message, whatever its name, when no trait is required", async () => {
      expect(findingsOf(await linter.run(probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages"));
    });
  });

  describe("required-traits", () => {
    test.each(REQUIRED_TRAIT_OPTIONS)("set to %s", async (_, value, names) => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": value } });
      expect(findingsOf(await custom.run(probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages", names));
    });

    test.each(REQUIRED_TRAIT_CASES)("with both organization traits required, %s", async (_, fields, __, missing) => {
      expect(findingsOf(await named.run(caseDoc(fields)))).toEqual(namedTraitFindings("components.messages.m", fields, missing));
    });

    test.each(REQUIRED_TRAIT_NAME_CASES)("matches pointers against names: %s", async (_, value, fields, missing) => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": value } });
      expect(findingsOf(await custom.run(caseDoc(fields)))).toEqual(namedTraitFindings("components.messages.m", fields, missing));
    });

    test("with both organization traits required, passes the realistic and structural documents and reports every missing trait in the fail and shared documents", async () => {
      expect(findingsOf(await named.run(okExample))).toEqual([]);
      expect(findingsOf(await named.run(okStructuralEdges))).toEqual([]);
      expect(findingsOf(await named.run(failExample))).toEqual(FAIL_NAMED);
      expect(findingsOf(await named.run(failSharedRef))).toEqual(SHARED_NAMED);
    });

    test("the array form gives the same findings as the comma-separated string", async () => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": [CH, TR] } });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL_NAMED);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED_NAMED);
    });

    test("reports one finding per missing trait and message with the warn severity, and never the generic findings", async () => {
      const results = only(await named.run(failExample));
      expect(results).toHaveLength(FAIL_NAMED.length);
      results.forEach((r) => expect(r.severity).toBe(1));
      expect(results.filter((r) => r.message === MSG.missing() || r.message === MSG.none())).toEqual([]);
    });

    test("only checks names the organization requires: a message applying them passes whatever else it applies", async () => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": "kafkaKey" } });
      const doc = caseDoc({ traits: [{}, null, traitRef("kafkaKey"), { headers: { type: "object" } }] });
      expect(findingsOf(await custom.run(doc))).toEqual([]);
    });

    test("skips a message whose traits list is an external reference", async () => {
      expect(findingsOf(await named.run(caseDoc({ traits: { $ref: "./shared/message-traits.yaml#/lists/standard" } })))).toEqual([]);
      expect(findingsOf(await named.run(caseDoc({ traits: { $ref: "#/components/x-trait-lists/external" } })))).toEqual([]);
    });

    test.each(UNRELATED_OPTIONS)("ignores options unrelated to the rule: %s", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL_DEFAULT);
    });

    test("handles a very large document and reports exactly the generated missing traits", async () => {
      expect(findingsOf(await named.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expectedNamed));
    });
  });

  test("checks a shared message, channel or traits list once per message where it is defined and follows local, chained and escaped pointers", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED_DEFAULT);
    expect(only(await linter.run(failSharedRef)).filter((r) => r.path[0] === "channels")).toEqual([]);
    expect(only(await named.run(failSharedRef)).filter((r) => r.path[0] === "channels")).toEqual([]);
  });

  test("skips null, scalar and array nodes, $ref operations and messages, empty oneOf lists, orphan traits, extensions and 3.x-only structures", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("checks channels and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
    const doc = base({
      channels: { "x-internal": { publish: { message: bare } } },
      components: { messages: { "x-legacy": bare }, channels: { "x-audit": { subscribe: { message: bare } } }, "x-messages": { m: bare } },
      "x-messages": { m: bare },
    });
    expect(findingsOf(await linter.run(doc))).toEqual(
      [
        ["channels.x-internal.publish.message", MSG.missing()],
        ["components.channels.x-audit.subscribe.message", MSG.missing()],
        ["components.messages.x-legacy", MSG.missing()],
      ].sort(byFinding)
    );
  });

  test("ignores the 3.x channel messages map and top-level operations", async () => {
    const doc = base({
      channels: { orders: { address: "orders", messages: { orderPlaced: bare } } },
      operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, messages: [bare] } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual([]);
    expect(findingsOf(await named.run(doc))).toEqual([]);
  });

  test("handles components set to null or to a scalar", async () => {
    for (const components of [null, "components", [], 42]) {
      expect(findingsOf(await linter.run(base({ components, channels: { orders: { publish: { message: bare } } } })))).toEqual([["channels.orders.publish.message", MSG.missing()]]);
    }
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await named.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", components: { messages: { m: bare } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expected));
  });
});
