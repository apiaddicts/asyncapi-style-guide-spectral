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
const M = "channels.meterTelemetry.messages";
const L = "channels.leakAlerts.messages";
const V = "channels.valveCommands.messages";

const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byFinding);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const toFindings = (expected) => expected.map(([path, kind, ...args]) => [path, MSG[kind](...args)]).sort(byFinding);
const lacks = (path, ...names) => names.map((name) => [path, MSG.trait(name)]);

const FAIL_DEFAULT = [
  [`${M}.readingReported`, MSG.missing()],
  [`${M}.readingBatch.traits`, MSG.none()],
  [`${M}.readingAvro.traits`, MSG.notArray()],
  [`${L}.leakDetected.traits`, MSG.none()],
  [`${L}.leakHeartbeat.traits`, MSG.none()],
  [`${V}.valveJammed.traits`, MSG.notArray()],
  ["components.channels.networkAudit.messages.auditLogged.traits", MSG.none()],
  ["components.messages.tariffChanged", MSG.missing()],
  ["components.messages.pressureForecast.traits", MSG.none()],
  ["components.messages.x-legacy-reading.traits", MSG.none()],
  ["components.messages.legacyOneOf", MSG.missing()],
].sort(byFinding);

const FAIL_NAMED = [
  ...lacks(`${M}.readingReported`, CH, TR),
  ...lacks(`${M}.readingBatch.traits`, CH, TR),
  ...lacks(`${M}.readingCorrected.traits`, TR),
  [`${M}.readingAvro.traits`, MSG.notArray()],
  ...lacks(`${L}.leakDetected.traits`, CH, TR),
  ...lacks(`${L}.leakHeartbeat.traits`, CH, TR),
  ...lacks(`${V}.valveOpened.traits`, TR),
  [`${V}.valveJammed.traits`, MSG.notArray()],
  ...lacks("components.channels.networkAudit.messages.auditLogged.traits", CH, TR),
  ...lacks("components.messages.tariffChanged", CH, TR),
  ...lacks("components.messages.pressureForecast.traits", CH, TR),
  ...lacks("components.messages.x-legacy-reading.traits", CH, TR),
  ...lacks("components.messages.legacyOneOf", CH, TR),
  ...lacks("components.messages.qualitySample.traits", CH, TR),
  ...lacks("components.messages.meterPing.traits", CH, TR),
  ...lacks("components.messages.consumptionDigest.traits", CH),
  ...lacks("components.messages.billingCycle.traits", TR),
].sort(byFinding);

const SHARED_DEFAULT = [
  ["components.messages.paymentAuthorized", MSG.missing()],
  ["components.channels.refunds.messages.refundRequested.traits", MSG.none()],
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
  ...lacks("components.channels.refunds.messages.refundRequested.traits", CH, TR),
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

const bare = { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } } };
const applied = { ...bare, traits: [{ $ref: "#/components/messageTraits/commonHeaders" }, { $ref: "#/components/messageTraits/tracing" }] };

const LOCATIONS = [
  ["channel message", "channels.orders.messages.orderPlaced", { channels: { orders: { address: "orders", messages: { orderPlaced: bare } } } }],
  ["message of a channel with a null address", "channels.replies.messages.orderPlaced", { channels: { replies: { address: null, messages: { orderPlaced: bare } } } }],
  ["message of a channel without address", "channels.orders.messages.orderPlaced", { channels: { orders: { messages: { orderPlaced: bare } } } }],
  ["message of a parameterized channel", "channels.orderById.messages.orderPlaced", { channels: { orderById: { address: "orders/{orderId}", parameters: { orderId: { description: "Id." } }, messages: { orderPlaced: bare } } } }],
  ["components.channels message", "components.channels.audit.messages.orderPlaced", { components: { channels: { audit: { address: "audit", messages: { orderPlaced: bare } } } } }],
  ["components.messages", "components.messages.orderPlaced", { components: { messages: { orderPlaced: bare } } }],
  ["message with a 2.x oneOf wrapper", "components.messages.orderPlaced", { components: { messages: { orderPlaced: { oneOf: [applied] } } } }],
  ["multi-format Avro message", "components.messages.orderPlaced", { components: { messages: { orderPlaced: { name: "orderPlaced", payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: ["null", "string"] } } } } }],
];

describe.each(["3.0.0", "3.1.0"])("AAR073 (AsyncAPI %s): every message must apply at least one message trait and every required trait", (version) => {
  let linter;
  let named;

  const base = (extra) => ({ asyncapi: version, info: { title: "Message Trait Locations", version: "1.0.0" }, ...extra });
  const withLocation = (extra) => {
    const doc = base(extra);
    doc.components = { ...REQUIRED_TRAIT_COMPONENTS, ...doc.components, messages: { ...(doc.components && doc.components.messages), ok: applied } };
    return doc;
  };
  const caseDoc = (fields) => base({ components: { ...REQUIRED_TRAIT_COMPONENTS, messages: { m: { ...bare, ...fields } } } });
  const probeDoc = () => base({ components: { ...REQUIRED_TRAIT_COMPONENTS, messages: Object.fromEntries(Object.entries(REQUIRED_TRAIT_PROBES).map(([key, probe]) => [key, { ...bare, ...probe.fields }])) } });
  const run = async (lint, doc) => lint.run(withVersion(doc, version));

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    named = await linterForRule(RULE, { functionOptions: NAMED });
  });

  test("passes a realistic multi-protocol document with multi-format payloads, null addresses, replies, chained, tuple, listed and external traits", async () => {
    expect(findingsOf(await run(linter, okExample))).toEqual([]);
  });

  test("reports every message without traits, with an empty or unusable list or with a non-array value in channel messages maps, components.channels and components.messages", async () => {
    expect(findingsOf(await run(linter, failExample))).toEqual(FAIL_DEFAULT);
  });

  test("treats any version from 3 upwards as 3.x", async () => {
    for (const variant of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, variant)))).toEqual(FAIL_DEFAULT);
      expect(findingsOf(await named.run(withVersion(failExample, variant)))).toEqual(FAIL_NAMED);
    }
  });

  test.each(LOCATIONS)("reports a %s without traits at the message itself", async (_, path, extra) => {
    expect(findingsOf(await run(linter, withLocation(extra)))).toEqual([[path, MSG.missing()]]);
    expect(findingsOf(await run(named, withLocation(extra)))).toEqual(lacks(path, CH, TR).sort(byFinding));
  });

  test("reports with the warn severity and one finding per message", async () => {
    const results = only(await run(linter, failExample));
    expect(results).toHaveLength(FAIL_DEFAULT.length);
    expect(new Set(results.map((r) => r.path.join("."))).size).toBe(FAIL_DEFAULT.length);
    results.forEach((r) => expect(r.severity).toBe(1));
  });

  test("never reports operations, replies or operation message lists, which only reference channel messages, even when they are written inline", async () => {
    for (const lint of [linter, named]) {
      const results = only(await run(lint, failExample));
      expect(results.filter((r) => r.path[0] === "operations" || r.path.includes("replies"))).toEqual([]);
    }
    expect(only(await run(linter, failExample)).filter((r) => r.path.join(".") === "components.messages.tariffChanged")).toHaveLength(1);
    expect(only(await run(named, failExample)).filter((r) => r.path.join(".") === "components.messages.tariffChanged")).toHaveLength(2);
  });

  describe("traits value", () => {
    test.each(REQUIRED_TRAIT_CASES)("%s", async (_, fields, kind) => {
      expect(findingsOf(await run(linter, caseDoc(fields)))).toEqual(requiredTraitFindings("components.messages.m", kind));
    });

    test("does not count operation traits: they apply to the operation, not to its messages", async () => {
      const doc = base({
        channels: { orders: { address: "orders", messages: { orderPlaced: bare } } },
        operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, traits: [{ $ref: "#/components/operationTraits/commonHeaders" }], messages: [{ $ref: "#/channels/orders/messages/orderPlaced" }] } },
        components: { operationTraits: { commonHeaders: { bindings: { kafka: { clientId: { type: "string" } } } } } },
      });
      expect(findingsOf(await run(linter, doc))).toEqual([["channels.orders.messages.orderPlaced", MSG.missing()]]);
      expect(findingsOf(await run(named, doc))).toEqual(lacks("channels.orders.messages.orderPlaced", CH, TR));
    });

    test("ignores trait-like keys anywhere but the message: payload properties, extensions and orphan components", async () => {
      const doc = base({
        channels: {
          orders: {
            address: "orders",
            "x-traits": [],
            messages: { orderPlaced: { ...applied, payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { type: "object", properties: { traits: { type: "array" } } } }, "x-traits": [] } },
          },
        },
        components: { ...REQUIRED_TRAIT_COMPONENTS, messageTraits: { ...REQUIRED_TRAIT_COMPONENTS.messageTraits, orphan: { traits: [] } } },
      });
      expect(findingsOf(await run(linter, doc))).toEqual([]);
      expect(findingsOf(await run(named, doc))).toEqual([]);
    });

    test("only needs one valid trait per message, whatever its name, when no trait is required", async () => {
      expect(findingsOf(await run(linter, probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages"));
    });
  });

  describe("required-traits", () => {
    test.each(REQUIRED_TRAIT_OPTIONS)("set to %s", async (_, value, names) => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": value } });
      expect(findingsOf(await run(custom, probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages", names));
    });

    test.each(REQUIRED_TRAIT_CASES)("with both organization traits required, %s", async (_, fields, __, missing) => {
      expect(findingsOf(await run(named, caseDoc(fields)))).toEqual(namedTraitFindings("components.messages.m", fields, missing));
    });

    test.each(REQUIRED_TRAIT_NAME_CASES)("matches pointers against names: %s", async (_, value, fields, missing) => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": value } });
      expect(findingsOf(await run(custom, caseDoc(fields)))).toEqual(namedTraitFindings("components.messages.m", fields, missing));
    });

    test("with both organization traits required, passes the realistic and structural documents and reports every missing trait in the fail and shared documents", async () => {
      expect(findingsOf(await run(named, okExample))).toEqual([]);
      expect(findingsOf(await run(named, okStructuralEdges))).toEqual([]);
      expect(findingsOf(await run(named, failExample))).toEqual(FAIL_NAMED);
      expect(findingsOf(await run(named, failSharedRef))).toEqual(SHARED_NAMED);
    });

    test("the array form gives the same findings as the comma-separated string", async () => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": [CH, TR] } });
      expect(findingsOf(await run(custom, failExample))).toEqual(FAIL_NAMED);
      expect(findingsOf(await run(custom, failSharedRef))).toEqual(SHARED_NAMED);
    });

    test("reports one finding per missing trait and message with the warn severity, and never the generic findings", async () => {
      const results = only(await run(named, failExample));
      expect(results).toHaveLength(FAIL_NAMED.length);
      results.forEach((r) => expect(r.severity).toBe(1));
      expect(results.filter((r) => r.message === MSG.missing() || r.message === MSG.none())).toEqual([]);
    });

    test("only checks names the organization requires: a message applying them passes whatever else it applies", async () => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": "kafkaKey" } });
      expect(findingsOf(await run(custom, caseDoc({ traits: [{}, null, traitRef("kafkaKey"), { headers: { type: "object" } }] })))).toEqual([]);
    });

    test("skips a message whose traits list is an external reference", async () => {
      expect(findingsOf(await run(named, caseDoc({ traits: { $ref: "./shared/message-traits.yaml#/lists/standard" } })))).toEqual([]);
      expect(findingsOf(await run(named, caseDoc({ traits: { $ref: "#/components/x-trait-lists/external" } })))).toEqual([]);
    });

    test.each(UNRELATED_OPTIONS)("ignores options unrelated to the rule: %s", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await run(custom, failExample))).toEqual(FAIL_DEFAULT);
    });

    test("handles a very large document and reports exactly the generated missing traits", async () => {
      expect(findingsOf(await run(named, failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expectedNamed));
    });
  });

  test("checks a shared message, channel or traits list once per message where it is defined and follows local, chained and escaped pointers", async () => {
    expect(findingsOf(await run(linter, failSharedRef))).toEqual(SHARED_DEFAULT);
    for (const lint of [linter, named]) {
      expect(only(await run(lint, failSharedRef)).filter((r) => r.path[0] === "channels" || r.path[0] === "operations")).toEqual([]);
    }
  });

  test("skips null, scalar and array nodes, $ref channels and messages, inline operation and reply messages, orphan traits, extensions and 2.x-only structures", async () => {
    expect(findingsOf(await run(linter, okStructuralEdges))).toEqual([]);
  });

  test("checks channels and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
    const doc = base({
      channels: { "x-internal": { address: "internal", messages: { "x-ping": bare } } },
      components: { messages: { "x-legacy": bare }, channels: { "x-audit": { address: "audit", messages: { logged: bare } } }, "x-messages": { m: bare } },
      "x-messages": { m: bare },
    });
    expect(findingsOf(await run(linter, doc))).toEqual(
      [
        ["channels.x-internal.messages.x-ping", MSG.missing()],
        ["components.channels.x-audit.messages.logged", MSG.missing()],
        ["components.messages.x-legacy", MSG.missing()],
      ].sort(byFinding)
    );
  });

  test("ignores 2.x publish and subscribe operations and their oneOf messages", async () => {
    const doc = base({ channels: { orders: { address: "orders", publish: { message: bare }, subscribe: { message: { oneOf: [bare] } } } } });
    expect(findingsOf(await run(linter, doc))).toEqual([]);
    expect(findingsOf(await run(named, doc))).toEqual([]);
  });

  test("handles components set to null or to a scalar", async () => {
    for (const components of [null, "components", [], 42]) {
      expect(findingsOf(await run(linter, base({ components, channels: { orders: { address: "orders", messages: { orderPlaced: bare } } } })))).toEqual([
        ["channels.orders.messages.orderPlaced", MSG.missing()],
      ]);
    }
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await named.run(withoutVersion))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(findingsOf(await run(linter, failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expected));
  });
});
