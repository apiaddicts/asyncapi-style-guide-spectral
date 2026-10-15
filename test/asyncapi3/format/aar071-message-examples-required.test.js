const { linterForRule } = require("../../helpers/utils");
const { MESSAGE_EXAMPLE_CASES, EXAMPLE_TRAIT_COMPONENTS, EXAMPLE_TRAIT_MERGE_CASES } = require("../../helpers/rules/aar071-message-examples-required");
const okExample = require("./AAR071/ok-example");
const failExample = require("./AAR071/fail-example");
const failSharedRef = require("./AAR071/fail-shared-ref");
const okStructuralEdges = require("./AAR071/ok-structural-edges");
const failLargeGenerated = require("./AAR071/fail-large-generated");

const RULE = "asa:AAR071";
const M = "channels.meterReadings.messages";
const O = "channels.outageAlerts.messages";
const B = "channels.substationCommands.messages";
const SAMPLE = "a sample 'payload'";
const ANY = "a 'payload' or non-empty 'headers'";

const only = (results) => results.filter((r) => r.code === RULE);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const labelOf = (suffix, index = suffix.split(".")[1]) => (suffix === "examples" ? "Message 'examples'" : `Message 'examples' from traits[${index}]`);
const MESSAGES = {
  missing: (_, sample = SAMPLE) => `AAR071: Message must provide at least one example with ${sample}.`,
  empty: (label, sample = SAMPLE) => `AAR071: ${label} must contain at least one example with ${sample}.`,
  notArray: (label, sample = SAMPLE) => `AAR071: ${label} must be an array containing at least one example with ${sample}.`,
  noSample: (label, sample = SAMPLE) => `AAR071: ${label} must contain at least one example with ${sample}.`,
};
const expectedFinding = (base, [suffix, kind, index], sample = SAMPLE) => [
  suffix === "" ? base : `${base}.${suffix}`,
  MESSAGES[kind](suffix === "" ? null : labelOf(suffix, index), sample),
];

const FAIL_EXAMPLE_PATHS = [
  `${M}.readingReported`,
  `${M}.readingReportedAvro`,
  `${M}.readingCorrected.examples`,
  `${M}.readingBatch.examples`,
  `${O}.outageDetected.examples`,
  `${O}.outageCleared.examples`,
  `${B}.breakerOpened.examples`,
  `${B}.breakerClosed.traits.1`,
  `${B}.breakerHeartbeat`,
  "components.channels.gridAudit.messages.auditLogged",
  "components.messages.tariffChanged",
  "components.messages.loadForecast.examples",
  "components.messages.demandResponse.examples",
  "components.messages.x-legacy-reading",
  "components.messages.meterPing.examples",
  "components.messages.legacyOneOf",
  "components.messages.gridEvent.examples",
].sort();

const bare = { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } } };
const headersOnly = { name: "heartbeat", headers: { type: "object", properties: { node: { type: "string" } } } };

const LOCATIONS = [
  ["channel message", "channels.orders.messages.orderPlaced", { channels: { orders: { address: "orders", messages: { orderPlaced: bare } } } }],
  ["message of a channel with a null address", "channels.replies.messages.orderPlaced", { channels: { replies: { address: null, messages: { orderPlaced: bare } } } }],
  ["message of a channel without address", "channels.orders.messages.orderPlaced", { channels: { orders: { messages: { orderPlaced: bare } } } }],
  ["message of a parameterized channel", "channels.orderById.messages.orderPlaced", { channels: { orderById: { address: "orders/{orderId}", parameters: { orderId: { description: "Id." } }, messages: { orderPlaced: bare } } } }],
  ["components.channels message", "components.channels.audit.messages.orderPlaced", { components: { channels: { audit: { address: "audit", messages: { orderPlaced: bare } } } } }],
  ["components.messages", "components.messages.orderPlaced", { components: { messages: { orderPlaced: bare } } }],
  ["message with a 2.x oneOf wrapper", "components.messages.orderPlaced", { components: { messages: { orderPlaced: { oneOf: [{ ...bare, examples: [{ payload: {} }] }] } } } }],
];

describe.each(["3.0.0", "3.1.0"])("AAR071 (AsyncAPI %s): every message must provide at least one sample payload example", (version) => {
  let linter;

  const base = (extra) => ({ asyncapi: version, info: { title: "Message Example Locations", version: "1.0.0" }, ...extra });
  const matrixDoc = (items, message = bare) => base({ components: { messages: Object.fromEntries(items.map((item, index) => [`case${index}`, { ...message, examples: [item] }])) } });
  const valuesDoc = (values, message = bare) => base({ components: { messages: Object.fromEntries(values.map((value, index) => [`case${index}`, { ...message, examples: value }])) } });
  const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[2].slice(4))));
  const traitDoc = (message) => base({ components: { ...EXAMPLE_TRAIT_COMPONENTS, messages: { m: { ...bare, ...message } } } });
  const run = async (doc) => linter.run(withVersion(doc, version));

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document with multi-format payloads, tombstones, header-only messages, replies, trait-provided, referenced and external examples", async () => {
    expect(pathsOf(await run(okExample))).toEqual([]);
  });

  test("reports every message without a usable example in channel messages maps, traits, components.channels and components.messages", async () => {
    expect(pathsOf(await run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
  });

  test("treats any version from 3 upwards as 3.x", async () => {
    for (const variant of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
      expect(pathsOf(await linter.run(withVersion(failExample, variant)))).toEqual(FAIL_EXAMPLE_PATHS);
    }
  });

  test.each(LOCATIONS)("reports a %s without examples at the message itself", async (_, path, extra) => {
    const results = only(await run(base(extra)));
    const sample = path === "components.messages.orderPlaced" && extra.components.messages.orderPlaced.oneOf ? ANY : SAMPLE;
    expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[path, MESSAGES.missing(null, sample)]]);
  });

  test("reports the exact message and the warn severity of each kind of finding", async () => {
    const results = only(await run(failExample));
    const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
    expect(byPath[`${M}.readingReported`]).toBe(MESSAGES.missing());
    expect(byPath[`${M}.readingReportedAvro`]).toBe(MESSAGES.missing());
    expect(byPath[`${M}.readingCorrected.examples`]).toBe(MESSAGES.empty("Message 'examples'"));
    expect(byPath[`${M}.readingBatch.examples`]).toBe(MESSAGES.notArray("Message 'examples'"));
    expect(byPath[`${O}.outageDetected.examples`]).toBe(MESSAGES.noSample("Message 'examples'"));
    expect(byPath[`${O}.outageCleared.examples`]).toBe(MESSAGES.noSample("Message 'examples'"));
    expect(byPath[`${B}.breakerOpened.examples`]).toBe(MESSAGES.empty("Message 'examples'"));
    expect(byPath[`${B}.breakerClosed.traits.1`]).toBe(MESSAGES.empty("Message 'examples' from traits[1]"));
    expect(byPath[`${B}.breakerHeartbeat`]).toBe(MESSAGES.missing(null, ANY));
    expect(byPath["components.messages.demandResponse.examples"]).toBe(MESSAGES.empty("Message 'examples'"));
    expect(byPath["components.messages.meterPing.examples"]).toBe(MESSAGES.noSample("Message 'examples'", ANY));
    expect(byPath["components.messages.legacyOneOf"]).toBe(MESSAGES.missing(null, ANY));
    expect(byPath["components.messages.gridEvent.examples"]).toBe(MESSAGES.noSample("Message 'examples'"));
    expect(results).toHaveLength(FAIL_EXAMPLE_PATHS.length);
    results.forEach((r) => expect(r.severity).toBe(1));
  });

  test("never reports operations, replies or operation message lists, which only reference channel messages", async () => {
    const results = only(await run(failExample));
    expect(results.filter((r) => r.path[0] === "operations" || r.path.includes("replies"))).toEqual([]);
    expect(results.filter((r) => r.path.join(".") === "components.messages.tariffChanged")).toHaveLength(1);
  });

  test("ignores schema-level examples, x-examples and multi-format schema examples", async () => {
    const results = only(await run(failExample));
    expect(results.filter((r) => /payload|schema|x-examples/.test(r.path.join(".")))).toEqual([]);
  });

  describe("example items", () => {
    test.each(MESSAGE_EXAMPLE_CASES.payloadSamples.map((item) => [item]))("accepts the example %p for a message with a payload", async (item) => {
      expect(pathsOf(await run(matrixDoc([item])))).toEqual([]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.headerSamples.map((item) => [item]))("rejects the header-only example %p for a message with a payload", async (item) => {
      const results = only(await run(matrixDoc([item])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.case0.examples", MESSAGES.noSample("Message 'examples'")]]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.headerSamples.map((item) => [item]))("accepts the header-only example %p for a message without a payload", async (item) => {
      expect(pathsOf(await run(matrixDoc([item], headersOnly)))).toEqual([]);
      expect(pathsOf(await run(matrixDoc([item], { ...headersOnly, payload: null })))).toEqual([]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.nonSamples.map((item) => [item]))("rejects the example %p for any message", async (item) => {
      const withPayload = only(await run(matrixDoc([item])));
      expect(withPayload.map((r) => r.message)).toEqual([MESSAGES.noSample("Message 'examples'")]);
      const withoutPayload = only(await run(matrixDoc([item], headersOnly)));
      expect(withoutPayload.map((r) => r.message)).toEqual([MESSAGES.noSample("Message 'examples'", ANY)]);
    });

    test("checks a whole matrix and reports exactly the non-samples, per payload declaration", async () => {
      const { payloadSamples, headerSamples, nonSamples } = MESSAGE_EXAMPLE_CASES;
      const items = [...payloadSamples, ...headerSamples, ...nonSamples];
      const withPayload = reportedCases(await run(matrixDoc(items)));
      const withoutPayload = reportedCases(await run(matrixDoc(items, headersOnly)));
      items.forEach((item, index) => {
        expect([item, withPayload.has(index)]).toEqual([item, index >= payloadSamples.length]);
        expect([item, withoutPayload.has(index)]).toEqual([item, index >= payloadSamples.length + headerSamples.length]);
      });
    });
  });

  describe("examples value", () => {
    test.each(MESSAGE_EXAMPLE_CASES.emptyValues.map((value) => [value]))("reports the empty examples value %p at the examples field", async (value) => {
      const results = only(await run(valuesDoc([value])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.case0.examples", MESSAGES.empty("Message 'examples'")]]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.notArrayValues.map((value) => [value]))("reports the non-array examples value %p at the examples field", async (value) => {
      const results = only(await run(valuesDoc([value])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.case0.examples", MESSAGES.notArray("Message 'examples'")]]);
    });

    test.each([
      ["no payload field", {}, ANY],
      ["a null payload", { payload: null }, ANY],
      ["an empty schema", { payload: {} }, SAMPLE],
      ["a $ref payload", { payload: { $ref: "#/components/schemas/Order" } }, SAMPLE],
      ["an external $ref payload", { payload: { $ref: "./schemas/order.json" } }, SAMPLE],
      ["a multi-format JSON Schema payload", { payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { type: "object" } } }, SAMPLE],
      ["a multi-format AsyncAPI schema payload", { payload: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: ["object", "null"] } } }, SAMPLE],
      ["a multi-format Avro record", { payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Order", fields: [] } } }, SAMPLE],
      ["a multi-format Avro union", { payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: ["null", "string"] } }, SAMPLE],
      ["a multi-format Avro schema behind a $ref", { payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { $ref: "./avro/order.avsc" } } }, SAMPLE],
      ["a multi-format protobuf payload", { payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "message Order { string id = 1; }" } }, SAMPLE],
      ["a multi-format RAML payload", { payload: { schemaFormat: "application/raml+yaml;version=1.0", schema: { type: "object" } } }, SAMPLE],
      ["a multi-format OpenAPI payload", { payload: { schemaFormat: "application/vnd.oai.openapi;version=3.0.0", schema: { type: "object", nullable: true } } }, SAMPLE],
      ["a multi-format payload with a null schema", { payload: { schemaFormat: "application/schema+json;version=draft-07", schema: null } }, SAMPLE],
      ["a nullable array-form payload", { payload: { type: ["object", "null"] } }, SAMPLE],
    ])("a message with %s asks for %s", async (_, fields, sample) => {
      const message = { name: "orderPlaced", headers: { type: "object" }, ...fields };
      const doc = base({ components: { messages: { m: message, n: { ...message, examples: [{ headers: { traceId: "4bf92f35" } }] } } } });
      const results = only(await run(doc));
      const expected = [["components.messages.m", MESSAGES.missing(null, sample)]];
      if (sample === SAMPLE) expected.push(["components.messages.n.examples", MESSAGES.noSample("Message 'examples'", sample)]);
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual(expected);
    });
  });

  describe("traits", () => {
    test.each(EXAMPLE_TRAIT_MERGE_CASES.map(([name, message, , v3]) => [name, message, v3]))("%s", async (_, message, expected) => {
      const results = only(await run(traitDoc(message)));
      const findings = results.map((r) => [r.path.join("."), r.message]);
      expect(findings).toEqual(expected === null ? [] : [expectedFinding("components.messages.m", expected)]);
    });

    test.each([
      ["a header-only trait", [{ $ref: "#/components/messageTraits/headerExamples" }], null],
      ["a payload trait", [{ $ref: "#/components/messageTraits/withExamples" }], null],
      ["an empty trait", [{ $ref: "#/components/messageTraits/emptyExamples" }], ["traits.0", "empty"]],
      ["a trait without examples", [{ $ref: "#/components/messageTraits/noExamples" }], ["", "missing"]],
    ])("a message without a payload with %s", async (_, traits, expected) => {
      const doc = base({ components: { ...EXAMPLE_TRAIT_COMPONENTS, messages: { m: { ...headersOnly, traits } } } });
      const findings = only(await run(doc)).map((r) => [r.path.join("."), r.message]);
      expect(findings).toEqual(expected === null ? [] : [expectedFinding("components.messages.m", expected, ANY)]);
    });

    test("lets the message override its traits and, among traits, the last one that sets examples", async () => {
      const traits = [{ examples: [{ payload: { orderId: "ord-1" } }] }, { examples: [{ name: "label only" }] }, { headers: { type: "object" } }];
      const withoutOwn = only(await run(traitDoc({ traits })));
      expect(withoutOwn.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.m.traits.1", MESSAGES.noSample("Message 'examples' from traits[1]")]]);
      expect(pathsOf(await run(traitDoc({ examples: [{ payload: { orderId: "ord-0" } }], traits })))).toEqual([]);
    });

    test("does not report a trait on its own: traits are not messages", async () => {
      const doc = base({ components: { ...EXAMPLE_TRAIT_COMPONENTS, messages: { m: { ...bare, examples: [{ payload: {} }] } } } });
      expect(pathsOf(await run(doc))).toEqual([]);
    });
  });

  test("checks a shared message, channel or examples array once at its definition and follows local, chained and escaped pointers", async () => {
    const results = only(await run(failSharedRef));
    expect(results.map((r) => [r.path.join("."), r.message]).sort()).toEqual(
      [
        ["components.messages.paymentAuthorized", MESSAGES.missing()],
        ["components.channels.refunds.messages.refundRejected.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.refundIssued.examples", MESSAGES.noSample("Message 'examples'")],
        ["components.messages.sharedEmptyExamples.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.malformedPercent.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.missingSlash.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.rootPointer.examples", MESSAGES.notArray("Message 'examples'")],
        ["components.messages.nonStringRef.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.cyclicExamples.examples", MESSAGES.empty("Message 'examples'")],
      ].sort()
    );
    expect(results.filter((r) => r.path[0] === "channels" || r.path[0] === "operations")).toEqual([]);
  });

  test("skips null, scalar and array nodes, $ref channels and messages, inline operation and reply messages, traits, schemas, extensions and 2.x-only structures", async () => {
    expect(pathsOf(await run(okStructuralEdges))).toEqual([]);
  });

  test("checks channels and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
    const doc = base({
      channels: { "x-internal": { address: "internal", messages: { "x-legacy": bare } } },
      components: { messages: { "x-legacy": bare }, channels: { "x-audit": { messages: { orderPlaced: bare } } }, "x-messages": { m: bare } },
      "x-messages": { m: bare },
    });
    expect(pathsOf(await run(doc))).toEqual(["channels.x-internal.messages.x-legacy", "components.channels.x-audit.messages.orderPlaced", "components.messages.x-legacy"]);
  });

  test("ignores 2.x publish and subscribe operations, including their oneOf members", async () => {
    const doc = base({ channels: { orders: { publish: { message: bare }, subscribe: { message: { oneOf: [bare] } } } } });
    expect(pathsOf(await run(doc))).toEqual([]);
  });

  test("handles components set to null or to a scalar", async () => {
    for (const components of [null, "components", [], 42]) {
      expect(pathsOf(await run(base({ components, channels: { orders: { messages: { orderPlaced: bare } } } })))).toEqual(["channels.orders.messages.orderPlaced"]);
    }
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(pathsOf(await linter.run("42"))).toEqual([]);
    expect(pathsOf(await linter.run([{ asyncapi: version, components: { messages: { m: bare } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(pathsOf(await run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
  });
});
