const {
  linterForRule,
  REQUIRED_TRAIT_NAMES,
  REQUIRED_TRAIT_COMPONENTS,
  REQUIRED_TRAIT_CASES,
  REQUIRED_TRAIT_MESSAGES: MSG,
  REQUIRED_TRAIT_PROBES,
  REQUIRED_TRAIT_OPTIONS,
  requiredTraitFindings,
  requiredTraitProbeFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR073/ok-example");
const failExample = require("./AAR073/fail-example");
const failSharedRef = require("./AAR073/fail-shared-ref");
const okStructuralEdges = require("./AAR073/ok-structural-edges");
const failLargeGenerated = require("./AAR073/fail-large-generated");

const RULE = "asa:AAR073";
const [CH, TR] = REQUIRED_TRAIT_NAMES;
const ALL = [CH, TR];
const NAMED = { "required-traits": `${CH},${TR}` };
const W = "channels.coldchain.cdc.shipments.temperature.v2";
const R = "channels.coldchain.cmd.reefers.setpoint.v1";
const S = "channels.coldchain/sensors/{sensorId}/readings";
const G = "channels.coldchain.sys.gateways.heartbeat.v1";
const X = "channels.x-coldchain.legacy.feed";

const byPath = (a, b) => a[0].localeCompare(b[0]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const toFindings = (expected) => expected.map(([path, kind, names]) => [path, MSG[kind](names)]);

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
].sort(byPath);

const FAIL_NAMED = [
  [`${W}.publish.message`, MSG.missing(ALL)],
  [`${W}.subscribe.message.oneOf.1.traits`, MSG.lacks(ALL)],
  [`${W}.subscribe.message.oneOf.2.traits`, MSG.lacks([TR])],
  [`${W}.subscribe.message.oneOf.3.traits`, MSG.lacks(ALL)],
  [`${W}.subscribe.message.oneOf.4.oneOf.0`, MSG.missing(ALL)],
  [`${R}.publish.message.traits`, MSG.notArray(ALL)],
  [`${R}.subscribe.message.traits`, MSG.lacks(ALL)],
  [`${S}.publish.message.traits`, MSG.lacks(ALL)],
  [`${G}.subscribe.message.traits`, MSG.lacks([TR])],
  [`${X}.publish.message`, MSG.missing(ALL)],
  ["components.channels.maintenanceWindows.subscribe.message.traits", MSG.lacks(ALL)],
  ["components.messages.shipmentDelayed", MSG.missing(ALL)],
  ["components.messages.reeferAlarm.traits", MSG.lacks(ALL)],
  ["components.messages.sensorCalibrated.traits", MSG.lacks(ALL)],
  ["components.messages.customsHold.traits", MSG.notArray(ALL)],
  ["components.messages.podSigned.oneOf.0", MSG.missing(ALL)],
  ["components.messages.x-legacy-manifest.traits", MSG.lacks(ALL)],
  ["components.messages.temperatureExcursion.traits", MSG.lacks([TR])],
  ["components.messages.driverHandover.traits", MSG.lacks(ALL)],
  ["components.messages.palletScanned.traits", MSG.lacks([CH])],
].sort(byPath);

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
].sort(byPath);

const SHARED_NAMED = [
  ["components.messages.paymentAuthorized", MSG.missing(ALL)],
  ["components.channels.refunds.subscribe.message.traits", MSG.lacks(ALL)],
  ...["paymentCaptured", "fxRateFixed", "escapedTilde", "malformedPercent", "missingSlash", "rootPointer", "nonStringRef", "cyclicList", "sharedEmptyA", "sharedEmptyB"].map((key) => [
    `components.messages.${key}.traits`,
    MSG.lacks(ALL),
  ]),
  ["components.messages.tenantChain.traits", MSG.lacks([TR])],
  ["components.messages.percentTracing.traits", MSG.lacks([CH])],
].sort(byPath);

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

describe("AAR073 (AsyncAPI 2.x): every message must apply the required message traits", () => {
  let linter;
  let named;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    named = await linterForRule(RULE, { functionOptions: NAMED });
  });

  test("passes a realistic multi-protocol document whose messages apply both organization traits through references, chains, tuples, lists and external files", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
    expect(findingsOf(await named.run(okExample))).toEqual([]);
  });

  test("reports every message without traits, with an empty or unusable list or with a non-array value in channels, oneOf members, components.channels and components.messages", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_DEFAULT);
  });

  test("with required-traits, also reports every message that lacks one of the named traits, listing only the missing ones", async () => {
    expect(findingsOf(await named.run(failExample))).toEqual(FAIL_NAMED);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    expect(findingsOf(await named.run(withVersion(failExample, version)))).toEqual(FAIL_NAMED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await named.run(withVersion(okExample, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    }
  });

  test.each(LOCATIONS)("reports a %s without traits at the message itself", async (_, path, extra) => {
    expect(findingsOf(await linter.run(withLocation(extra)))).toEqual([[path, MSG.missing()]]);
    expect(findingsOf(await named.run(withLocation(extra)))).toEqual([[path, MSG.missing(ALL)]]);
  });

  test("reports with the warn severity and one finding per message", async () => {
    const results = only(await named.run(failExample));
    expect(results).toHaveLength(FAIL_NAMED.length);
    expect(new Set(results.map((r) => r.path.join("."))).size).toBe(FAIL_NAMED.length);
    results.forEach((r) => expect(r.severity).toBe(1));
  });

  describe("traits value", () => {
    test.each(REQUIRED_TRAIT_CASES)("%s", async (_, fields, defaultKind) => {
      expect(findingsOf(await linter.run(caseDoc(fields)))).toEqual(requiredTraitFindings("components.messages.m", fields, defaultKind, ALL, false));
    });

    test.each(REQUIRED_TRAIT_CASES)("%s, with required-traits commonHeaders and tracing", async (_, fields, defaultKind, missing) => {
      expect(findingsOf(await named.run(caseDoc(fields)))).toEqual(requiredTraitFindings("components.messages.m", fields, defaultKind, missing, true));
    });

    test("does not count operation traits: they apply to the operation, not to its message", async () => {
      const doc = base({
        channels: { orders: { publish: { traits: [{ $ref: "#/components/operationTraits/commonHeaders" }, { $ref: "#/components/operationTraits/tracing" }], message: bare } } },
        components: { operationTraits: { commonHeaders: { bindings: { kafka: { clientId: { type: "string" } } } }, tracing: { description: "Traced." } } },
      });
      expect(findingsOf(await named.run(doc))).toEqual([["channels.orders.publish.message", MSG.missing(ALL)]]);
    });

    test("ignores trait-like keys anywhere but the message: payload properties, extensions and orphan components", async () => {
      const doc = base({
        channels: { orders: { "x-traits": [], publish: { "x-traits": [], message: { ...applied, payload: { type: "object", properties: { traits: { type: "array" } } }, "x-traits": [] } } } },
        components: { ...REQUIRED_TRAIT_COMPONENTS, messageTraits: { ...REQUIRED_TRAIT_COMPONENTS.messageTraits, orphan: { traits: [] } } },
      });
      expect(findingsOf(await named.run(doc))).toEqual([]);
    });
  });

  describe("required-traits option", () => {
    test.each(REQUIRED_TRAIT_OPTIONS)("%s", async (_, value, effective) => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": value } });
      expect(findingsOf(await custom.run(probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages", effective));
    });

    test("ships an empty required-traits option, so every message only needs one trait", async () => {
      expect(findingsOf(await linter.run(probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages", []));
    });

    test("matches the names written in escaped and percent-encoded pointers", async () => {
      const fx = await linterForRule(RULE, { functionOptions: { "required-traits": "fx/rates, settlement batch" } });
      const findings = findingsOf(await fx.run(failSharedRef));
      expect(findings.find(([path]) => path === "components.messages.fxRateFixed.traits")).toBeUndefined();
      expect(findings).toContainEqual(["components.messages.escapedTilde.traits", MSG.lacks(["fx/rates", "settlement batch"])]);
      const tilde = await linterForRule(RULE, { functionOptions: { "required-traits": "tilde~key" } });
      expect(findingsOf(await tilde.run(failSharedRef)).find(([path]) => path === "components.messages.escapedTilde.traits")).toBeUndefined();
    });
  });

  test("checks a shared message, channel or traits list once per message where it is defined and follows local, chained and escaped pointers", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED_DEFAULT);
    expect(findingsOf(await named.run(failSharedRef))).toEqual(SHARED_NAMED);
    expect(only(await named.run(failSharedRef)).filter((r) => r.path[0] === "channels")).toEqual([]);
  });

  test("skips null, scalar and array nodes, $ref operations and messages, empty oneOf lists, orphan traits, extensions and 3.x-only structures", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    expect(findingsOf(await named.run(okStructuralEdges))).toEqual([]);
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
      ].sort(byPath)
    );
  });

  test("ignores the 3.x channel messages map and top-level operations", async () => {
    const doc = base({
      channels: { orders: { address: "orders", messages: { orderPlaced: bare } } },
      operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, messages: [bare] } },
    });
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
    expect(findingsOf(await named.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", components: { messages: { m: bare } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expectedDefault));
    expect(findingsOf(await named.run(failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expectedNamed));
  });
});
