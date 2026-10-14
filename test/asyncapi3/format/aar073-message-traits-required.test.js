const {
  linterForRule,
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
const NAMED = { "required-traits": "commonHeaders,tracing" };
const M = "channels.meterTelemetry.messages";
const L = "channels.leakAlerts.messages";
const V = "channels.valveCommands.messages";

const byPath = (a, b) => a[0].localeCompare(b[0]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const toFindings = (expected) => expected.map(([path, kind]) => [path, MSG[kind]()]);

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
].sort(byPath);

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
].sort(byPath);

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

describe.each(["3.0.0", "3.1.0"])("AAR073 (AsyncAPI %s): every message must apply at least one message trait", (version) => {
  let linter;

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
    }
  });

  test.each(LOCATIONS)("reports a %s without traits at the message itself", async (_, path, extra) => {
    expect(findingsOf(await run(linter, withLocation(extra)))).toEqual([[path, MSG.missing()]]);
  });

  test("reports with the warn severity and one finding per message", async () => {
    const results = only(await run(linter, failExample));
    expect(results).toHaveLength(FAIL_DEFAULT.length);
    expect(new Set(results.map((r) => r.path.join("."))).size).toBe(FAIL_DEFAULT.length);
    results.forEach((r) => expect(r.severity).toBe(1));
  });

  test("never reports operations, replies or operation message lists, which only reference channel messages, even when they are written inline", async () => {
    const results = only(await run(linter, failExample));
    expect(results.filter((r) => r.path[0] === "operations" || r.path.includes("replies"))).toEqual([]);
    expect(results.filter((r) => r.path.join(".") === "components.messages.tariffChanged")).toHaveLength(1);
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
    });

    test("only needs one valid trait per message, whatever its name", async () => {
      expect(findingsOf(await run(linter, probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages"));
    });
  });

  describe("functionOptions", () => {
    test.each(REQUIRED_TRAIT_OPTIONS)("an injected required-traits %s changes nothing", async (_, value) => {
      const custom = await linterForRule(RULE, { functionOptions: { "required-traits": value } });
      expect(findingsOf(await run(custom, probeDoc()))).toEqual(requiredTraitProbeFindings("components.messages"));
    });

    test("an injected required-traits naming both organization traits changes nothing on the realistic, shared and structural documents", async () => {
      const custom = await linterForRule(RULE, { functionOptions: NAMED });
      expect(findingsOf(await run(custom, okExample))).toEqual([]);
      expect(findingsOf(await run(custom, failExample))).toEqual(FAIL_DEFAULT);
      expect(findingsOf(await run(custom, failSharedRef))).toEqual(SHARED_DEFAULT);
      expect(findingsOf(await run(custom, okStructuralEdges))).toEqual([]);
    });

    test.each(UNRELATED_OPTIONS)("ignores options unrelated to the rule: %s", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await run(custom, failExample))).toEqual(FAIL_DEFAULT);
    });
  });

  test("checks a shared message, channel or traits list once per message where it is defined and follows local, chained and escaped pointers", async () => {
    expect(findingsOf(await run(linter, failSharedRef))).toEqual(SHARED_DEFAULT);
    expect(only(await run(linter, failSharedRef)).filter((r) => r.path[0] === "channels" || r.path[0] === "operations")).toEqual([]);
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
      ].sort(byPath)
    );
  });

  test("ignores 2.x publish and subscribe operations and their oneOf messages", async () => {
    const doc = base({ channels: { orders: { address: "orders", publish: { message: bare }, subscribe: { message: { oneOf: [bare] } } } } });
    expect(findingsOf(await run(linter, doc))).toEqual([]);
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
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(findingsOf(await run(linter, failLargeGenerated.document))).toEqual(toFindings(failLargeGenerated.expected));
  });
});
