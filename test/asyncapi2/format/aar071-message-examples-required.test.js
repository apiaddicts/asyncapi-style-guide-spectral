const { linterForRule } = require("../../helpers/utils");
const { MESSAGE_EXAMPLE_CASES, EXAMPLE_TRAIT_COMPONENTS, EXAMPLE_TRAIT_MERGE_CASES } = require("../../helpers/rules/aar071-message-examples-required");
const okExample = require("./AAR071/ok-example");
const failExample = require("./AAR071/fail-example");
const failSharedRef = require("./AAR071/fail-shared-ref");
const okStructuralEdges = require("./AAR071/ok-structural-edges");
const failLargeGenerated = require("./AAR071/fail-large-generated");

const RULE = "asa:AAR071";
const W = "channels.railfreight.cdc.wagons.loaded.v3";
const D = "channels.railfreight.cmd.trains.dispatch.v1";
const S = "channels.railfreight/signals/{signalId}/state";
const C = "channels.railfreight.sys.crews.roster.v1";
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
  `${W}.publish.message`,
  `${W}.subscribe.message.oneOf.1`,
  `${W}.subscribe.message.oneOf.2.examples`,
  `${D}.publish.message.examples`,
  `${D}.subscribe.message.examples`,
  `${S}.publish.message.examples`,
  `${S}.subscribe.message.examples`,
  `${C}.subscribe.message.traits.1`,
  `${C}.publish.message`,
  "components.channels.maintenanceWindows.subscribe.message",
  "components.messages.wagonCoupled",
  "components.messages.wagonInspected.examples",
  "components.messages.trainDispatched.oneOf.1",
  "components.messages.signalHeartbeat.examples",
  "components.messages.signalReset",
  "components.messages.trackClosure.examples",
  "components.messages.x-legacy-manifest",
  "components.messages.crewAssigned.traits.0",
  "components.messages.etaPredicted.examples",
].sort();

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Message Example Locations", version: "1.0.0" }, ...extra });
const bare = { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } } };

const LOCATIONS = [
  ["publish message", "channels.orders.publish.message", { channels: { orders: { publish: { message: bare } } } }],
  ["subscribe message", "channels.orders.subscribe.message", { channels: { orders: { subscribe: { message: bare } } } }],
  ["oneOf member", "channels.orders.publish.message.oneOf.1", { channels: { orders: { publish: { message: { oneOf: [{ $ref: "#/components/messages/ok" }, bare] } } } } }],
  ["nested oneOf member", "channels.orders.publish.message.oneOf.0.oneOf.0", { channels: { orders: { publish: { message: { oneOf: [{ oneOf: [bare] }] } } } } }],
  ["components.channels message", "components.channels.audit.subscribe.message", { components: { channels: { audit: { subscribe: { message: bare } } } } }],
  ["components.channels oneOf member", "components.channels.audit.publish.message.oneOf.0", { components: { channels: { audit: { publish: { message: { oneOf: [bare] } } } } } }],
  ["components.messages", "components.messages.m", { components: { messages: { m: bare } } }],
  ["components.messages oneOf member", "components.messages.m.oneOf.0", { components: { messages: { m: { oneOf: [bare] } } } }],
];

const matrixDoc = (items, message = bare) => base({ components: { messages: Object.fromEntries(items.map((item, index) => [`case${index}`, { ...message, examples: [item] }])) } });
const valuesDoc = (values, message = bare) => base({ components: { messages: Object.fromEntries(values.map((value, index) => [`case${index}`, { ...message, examples: value }])) } });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[2].slice(4))));
const traitDoc = (message) => base({ components: { ...EXAMPLE_TRAIT_COMPONENTS, messages: { m: { ...bare, ...message } } } });
const headersOnly = { name: "heartbeat", headers: { type: "object", properties: { node: { type: "string" } } } };

describe("AAR071 (AsyncAPI 2.x): every message must provide at least one sample payload example", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document with inline, oneOf, Avro, tombstone, header-only, trait-provided, referenced and external examples", async () => {
    expect(pathsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every message without a usable example in channels, oneOf members, traits, components.channels and components.messages", async () => {
    expect(pathsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE_PATHS);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
    expect(pathsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
      expect(pathsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE_PATHS);
    }
  });

  test.each(LOCATIONS)("reports a %s without examples at the message itself", async (_, path, extra) => {
    const doc = base(extra);
    doc.components = { ...doc.components, messages: { ...(doc.components && doc.components.messages), ok: { ...bare, examples: [{ payload: {} }] } } };
    const results = only(await linter.run(doc));
    expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[path, MESSAGES.missing()]]);
  });

  test("reports the exact message and the warn severity of each kind of finding", async () => {
    const results = only(await linter.run(failExample));
    const byPath = Object.fromEntries(results.map((r) => [r.path.join("."), r.message]));
    expect(byPath[`${W}.publish.message`]).toBe(MESSAGES.missing());
    expect(byPath[`${W}.subscribe.message.oneOf.2.examples`]).toBe(MESSAGES.empty("Message 'examples'"));
    expect(byPath[`${D}.publish.message.examples`]).toBe(MESSAGES.noSample("Message 'examples'"));
    expect(byPath[`${D}.subscribe.message.examples`]).toBe(MESSAGES.noSample("Message 'examples'"));
    expect(byPath[`${S}.publish.message.examples`]).toBe(MESSAGES.empty("Message 'examples'"));
    expect(byPath[`${S}.subscribe.message.examples`]).toBe(MESSAGES.notArray("Message 'examples'"));
    expect(byPath[`${C}.subscribe.message.traits.1`]).toBe(MESSAGES.empty("Message 'examples' from traits[1]"));
    expect(byPath[`${C}.publish.message`]).toBe(MESSAGES.missing(null, ANY));
    expect(byPath["components.messages.signalHeartbeat.examples"]).toBe(MESSAGES.noSample("Message 'examples'", ANY));
    expect(byPath["components.messages.signalReset"]).toBe(MESSAGES.missing(null, ANY));
    expect(byPath["components.messages.trackClosure.examples"]).toBe(MESSAGES.empty("Message 'examples'"));
    expect(byPath["components.messages.crewAssigned.traits.0"]).toBe(MESSAGES.noSample("Message 'examples' from traits[0]"));
    expect(byPath["components.messages.etaPredicted.examples"]).toBe(MESSAGES.noSample("Message 'examples'"));
    expect(results).toHaveLength(FAIL_EXAMPLE_PATHS.length);
    results.forEach((r) => expect(r.severity).toBe(1));
  });

  test("ignores schema-level examples, x-examples and payload example keywords", async () => {
    const results = only(await linter.run(failExample));
    expect(results.map((r) => r.path.join("."))).toContain(`${W}.publish.message`);
    expect(results.filter((r) => /payload|x-examples|schemas/.test(r.path.join(".")))).toEqual([]);
  });

  describe("example items", () => {
    test.each(MESSAGE_EXAMPLE_CASES.payloadSamples.map((item) => [item]))("accepts the example %p for a message with a payload", async (item) => {
      expect(pathsOf(await linter.run(matrixDoc([item])))).toEqual([]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.headerSamples.map((item) => [item]))("rejects the header-only example %p for a message with a payload", async (item) => {
      const results = only(await linter.run(matrixDoc([item])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.case0.examples", MESSAGES.noSample("Message 'examples'")]]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.headerSamples.map((item) => [item]))("accepts the header-only example %p for a message without a payload", async (item) => {
      expect(pathsOf(await linter.run(matrixDoc([item], headersOnly)))).toEqual([]);
      expect(pathsOf(await linter.run(matrixDoc([item], { ...headersOnly, payload: null })))).toEqual([]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.nonSamples.map((item) => [item]))("rejects the example %p for any message", async (item) => {
      const withPayload = only(await linter.run(matrixDoc([item])));
      expect(withPayload.map((r) => r.message)).toEqual([MESSAGES.noSample("Message 'examples'")]);
      const withoutPayload = only(await linter.run(matrixDoc([item], headersOnly)));
      expect(withoutPayload.map((r) => r.message)).toEqual([MESSAGES.noSample("Message 'examples'", ANY)]);
    });

    test("accepts a message as soon as one of its examples is a sample, wherever it sits in the array", async () => {
      const noise = MESSAGE_EXAMPLE_CASES.nonSamples;
      const sample = MESSAGE_EXAMPLE_CASES.payloadSamples[0];
      const doc = valuesDoc([[sample, ...noise], [...noise, sample], [...noise.slice(0, 9), sample, ...noise.slice(9)]]);
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });

    test("checks a whole matrix and reports exactly the non-samples, per payload declaration", async () => {
      const { payloadSamples, headerSamples, nonSamples } = MESSAGE_EXAMPLE_CASES;
      const items = [...payloadSamples, ...headerSamples, ...nonSamples];
      const withPayload = reportedCases(await linter.run(matrixDoc(items)));
      const withoutPayload = reportedCases(await linter.run(matrixDoc(items, headersOnly)));
      items.forEach((item, index) => {
        expect([item, withPayload.has(index)]).toEqual([item, index >= payloadSamples.length]);
        expect([item, withoutPayload.has(index)]).toEqual([item, index >= payloadSamples.length + headerSamples.length]);
      });
    });
  });

  describe("examples value", () => {
    test.each(MESSAGE_EXAMPLE_CASES.emptyValues.map((value) => [value]))("reports the empty examples value %p at the examples field", async (value) => {
      const results = only(await linter.run(valuesDoc([value])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.case0.examples", MESSAGES.empty("Message 'examples'")]]);
    });

    test.each(MESSAGE_EXAMPLE_CASES.notArrayValues.map((value) => [value]))("reports the non-array examples value %p at the examples field", async (value) => {
      const results = only(await linter.run(valuesDoc([value])));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.case0.examples", MESSAGES.notArray("Message 'examples'")]]);
    });

    test("names the header alternative only for messages that declare no payload", async () => {
      const results = only(await linter.run(valuesDoc([[], null, {}], headersOnly)));
      expect(results.map((r) => r.message)).toEqual([
        MESSAGES.empty("Message 'examples'", ANY),
        MESSAGES.empty("Message 'examples'", ANY),
        MESSAGES.notArray("Message 'examples'", ANY),
      ]);
    });

    test.each([
      ["no payload field", {}, ANY],
      ["a null payload", { payload: null }, ANY],
      ["an empty schema", { payload: {} }, SAMPLE],
      ["a $ref payload", { payload: { $ref: "#/components/schemas/Order" } }, SAMPLE],
      ["an external $ref payload", { payload: { $ref: "./schemas/order.json" } }, SAMPLE],
      ["a scalar JSON Schema payload", { payload: { type: "string", format: "uuid" } }, SAMPLE],
      ["a nullable array-form payload", { payload: { type: ["object", "null"] } }, SAMPLE],
      ["an Avro record payload", { schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: { type: "record", name: "Order", fields: [] } }, SAMPLE],
      ["an Avro union payload", { schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: ["null", "string"] }, SAMPLE],
      ["a primitive Avro payload", { schemaFormat: "application/vnd.apache.avro+yaml;version=1.9.0", payload: "string" }, SAMPLE],
      ["a protobuf payload", { schemaFormat: "application/vnd.google.protobuf;version=3", payload: "message Order { string id = 1; }" }, SAMPLE],
      ["a RAML payload", { schemaFormat: "application/raml+yaml;version=1.0", payload: { type: "object" } }, SAMPLE],
      ["an OpenAPI schema payload", { schemaFormat: "application/vnd.oai.openapi;version=3.0.0", payload: { type: "object", nullable: true } }, SAMPLE],
      ["a false payload", { payload: false }, SAMPLE],
    ])("a message with %s asks for %s", async (_, fields, sample) => {
      const message = { name: "orderPlaced", headers: { type: "object" }, ...fields };
      const doc = base({ components: { messages: { m: message, n: { ...message, examples: [{ headers: { traceId: "4bf92f35" } }] } } } });
      const results = only(await linter.run(doc));
      const expected = [["components.messages.m", MESSAGES.missing(null, sample)]];
      if (sample === SAMPLE) expected.push(["components.messages.n.examples", MESSAGES.noSample("Message 'examples'", sample)]);
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual(expected);
    });
  });

  describe("traits", () => {
    test.each(EXAMPLE_TRAIT_MERGE_CASES.map(([name, message, v2]) => [name, message, v2]))("%s", async (_, message, expected) => {
      const results = only(await linter.run(traitDoc(message)));
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
      const findings = only(await linter.run(doc)).map((r) => [r.path.join("."), r.message]);
      expect(findings).toEqual(expected === null ? [] : [expectedFinding("components.messages.m", expected, ANY)]);
    });

    test("applies every trait over the message in order, so the last trait that sets examples decides", async () => {
      const traits = [{ examples: [] }, { examples: [{ payload: { orderId: "ord-1" } }] }, { headers: { type: "object" } }, { examples: [{ name: "label only" }] }];
      const results = only(await linter.run(traitDoc({ examples: [{ payload: { orderId: "ord-0" } }], traits })));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([["components.messages.m.traits.3", MESSAGES.noSample("Message 'examples' from traits[3]")]]);
    });

    test("does not report a trait on its own: traits are not messages", async () => {
      const doc = base({ components: { ...EXAMPLE_TRAIT_COMPONENTS, messages: { m: { ...bare, examples: [{ payload: {} }] } } } });
      expect(pathsOf(await linter.run(doc))).toEqual([]);
    });
  });

  test("checks a shared message, channel or examples array once at its definition and follows local, chained and escaped pointers", async () => {
    const results = only(await linter.run(failSharedRef));
    expect(results.map((r) => [r.path.join("."), r.message]).sort()).toEqual(
      [
        ["components.messages.paymentAuthorized", MESSAGES.missing()],
        ["components.channels.refunds.subscribe.message.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.refundIssued.examples", MESSAGES.noSample("Message 'examples'")],
        ["components.messages.sharedEmptyExamples.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.malformedPercent.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.missingSlash.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.rootPointer.examples", MESSAGES.notArray("Message 'examples'")],
        ["components.messages.nonStringRef.examples", MESSAGES.empty("Message 'examples'")],
        ["components.messages.cyclicExamples.examples", MESSAGES.empty("Message 'examples'")],
      ].sort()
    );
    expect(results.filter((r) => r.path[0] === "channels")).toEqual([]);
  });

  test("skips null, scalar and array nodes, $ref operations and messages, empty oneOf lists, traits, schemas, extensions and 3.x-only structures", async () => {
    expect(pathsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("checks channels and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
    const doc = base({
      channels: { "x-internal": { publish: { message: bare } } },
      components: { messages: { "x-legacy": bare }, channels: { "x-audit": { subscribe: { message: bare } } }, "x-messages": { m: bare } },
      "x-messages": { m: bare },
    });
    expect(pathsOf(await linter.run(doc))).toEqual(["channels.x-internal.publish.message", "components.channels.x-audit.subscribe.message", "components.messages.x-legacy"]);
  });

  test("ignores the 3.x channel messages map and top-level operations", async () => {
    const doc = base({
      channels: { orders: { address: "orders", messages: { orderPlaced: bare } } },
      operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, messages: [bare] } },
    });
    expect(pathsOf(await linter.run(doc))).toEqual([]);
  });

  test("handles components set to null or to a scalar", async () => {
    for (const components of [null, "components", [], 42]) {
      expect(pathsOf(await linter.run(base({ components, channels: { orders: { publish: { message: bare } } } })))).toEqual(["channels.orders.publish.message"]);
    }
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(pathsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(pathsOf(await linter.run("42"))).toEqual([]);
    expect(pathsOf(await linter.run([{ asyncapi: "2.6.0", components: { messages: { m: bare } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(pathsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedPaths);
  });
});
