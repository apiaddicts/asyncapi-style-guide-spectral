const { linterForRule } = require("../../helpers/utils");
const {
  EXAMPLE_SCHEMA_COMPONENTS,
  EXAMPLE_JSON_SCHEMA_CASES,
  EXAMPLE_OPENAPI_SCHEMA_CASES,
  EXAMPLE_FORMAT_CASES,
  EXAMPLE_NUMBER_FORMAT_CASES,
  EXAMPLE_IGNORED_FORMATS,
  EXAMPLE_AVRO_SCHEMA_CASES,
  HYBRID_PROBE_SCHEMA,
  HYBRID_PROBE_EXAMPLES,
  HYBRID_PROBE_FINDINGS,
  EXAMPLE_SCHEMA_FORMAT_CASES,
  TRAIT_BASE_MESSAGE,
  EXAMPLE_SCHEMA_TRAIT_COMPONENTS,
  EXAMPLE_SCHEMA_TRAIT_CASES,
} = require("../../helpers/rules/aar072-message-examples-schema");
const okExample = require("./AAR072/ok-example");
const failExample = require("./AAR072/fail-example");
const failSharedRef = require("./AAR072/fail-shared-ref");
const okStructuralEdges = require("./AAR072/ok-structural-edges");
const failLargeGenerated = require("./AAR072/fail-large-generated");

const RULE = "asa:AAR072";
const AVRO = "application/vnd.apache.avro;version=1.9.0";
const OPENAPI = "application/vnd.oai.openapi;version=3.0.0";

const only = (results) => results.filter((r) => r.code === RULE);
const sorted = (pairs) => [...pairs].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
const findingsOf = (results) => sorted(only(results).map((r) => [r.path.join("."), r.message]));
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const trailOf = (part, rel) =>
  rel.reduce((text, segment) => {
    if (typeof segment === "number") return `${text}[${segment}]`;
    return /^[A-Za-z_$][\w$-]*$/.test(segment) ? `${text}.${segment}` : `${text}[${JSON.stringify(segment)}]`;
  }, part);
const messageOf = (index, part, rel, text, trait) => `AAR072: ${trait === undefined ? "" : `traits[${trait}].`}examples[${index}].${trailOf(part, rel)} ${text}.`;
const multiFormat = (schema, format) => (format === undefined ? schema : { schemaFormat: format, schema });
const formatCases = (type, name, ok, bad) => [name, { type, format: name }, ok, bad.map((value) => [value, [[[], `must match format "${name}"`]]])];

const TOP_LEVEL_CASES = EXAMPLE_JSON_SCHEMA_CASES.filter(([label]) => label !== "external $ref with siblings");

const E = "channels.gridTelemetry.messages";
const O = "channels.outageAlerts.messages";
const B = "channels.substationCommands.messages";

const FAIL_EXAMPLE_FINDINGS = [
  [`${E}.meterReading.examples.0.payload.kwh`, messageOf(0, "payload", ["kwh"], "must be >= 0")],
  [`${E}.meterReading.examples.0.payload.readAt`, messageOf(0, "payload", ["readAt"], 'must match format "date-time"')],
  [`${E}.meterReading.examples.1.headers`, messageOf(1, "headers", [], "must have required property 'meterId'")],
  [`${E}.meterReading.examples.1.payload.phase`, messageOf(1, "payload", ["phase"], "must be an integer or null")],
  [`${E}.meterReadingAvro.examples.0.payload.voltage`, messageOf(0, "payload", ["voltage"], "must be a double")],
  [`${E}.meterReadingAvro.examples.0.payload.quality`, messageOf(0, "payload", ["quality"], "must be a symbol of enum 'Quality': GOOD, ESTIMATED, MISSING")],
  [`${E}.meterReadingAvro.examples.0.payload`, messageOf(0, "payload", [], "must have field 'meterId' of record 'MeterReading'")],
  [`${E}.meterReadingAvro.examples.1.headers.partition`, messageOf(1, "headers", ["partition"], "must be an int")],
  [`${O}.outageDetected.examples.0.payload.affectedCustomers`, messageOf(0, "payload", ["affectedCustomers"], "must be an integer")],
  [`${O}.outageDetected.examples.0.payload.feeder`, messageOf(0, "payload", ["feeder"], "must have required property 'feederId'")],
  [`${O}.outageCleared.examples.0.payload.durationMinutes`, messageOf(0, "payload", ["durationMinutes"], "must be > 0")],
  [`${O}.outageCleared.examples.0.payload.cause`, messageOf(0, "payload", ["cause"], "must match exactly one schema in oneOf")],
  [`${B}.breakerTrip.examples.0.payload.breakerId`, messageOf(0, "payload", ["breakerId"], 'must match pattern "^BRK-[0-9]{4}$"')],
  [`${B}.breakerTrip.examples.0.headers.priority`, messageOf(0, "headers", ["priority"], "must be an integer")],
  [`${B}.breakerReset.traits.0`, messageOf(0, "payload", ["operator"], "must be a string", 0)],
  [`${B}.breakerResetConfirmed.examples.0.payload.resetAt`, messageOf(0, "payload", ["resetAt"], 'must match format "date-time"')],
  ["components.channels.gridAudit.messages.auditLogged.examples.0.payload.actor", messageOf(0, "payload", ["actor"], "must be a string")],
  ["components.messages.tariffChanged.examples.0.payload.rates.1.pricePerKwh", messageOf(0, "payload", ["rates", 1, "pricePerKwh"], "must be a multiple of 0.0001")],
  ["components.messages.tariffChanged.examples.0.payload.rates", messageOf(0, "payload", ["rates"], "must not have duplicate items: items 0 and 2 are identical")],
  ["components.messages.demandForecast.examples.0.payload.horizon", messageOf(0, "payload", ["horizon"], 'must match format "duration"')],
  ["components.messages.demandForecast.examples.0.payload.points.0", messageOf(0, "payload", ["points", 0], "must not have more than 2 items")],
  ["components.messages.x-legacy-reading.examples.0.payload", messageOf(0, "payload", [], "must be an object")],
  ["components.messages.loadShed.examples.0.payload.zones.0", messageOf(0, "payload", ["zones", 0], "must be a string")],
];

const bare = { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } }, examples: [{ payload: { orderId: 1 } }] };
const LOCATIONS = [
  ["channel message", "channels.orders.messages.orderPlaced", { channels: { orders: { address: "orders", messages: { orderPlaced: bare } } } }],
  ["message of a channel with a null address", "channels.replies.messages.orderPlaced", { channels: { replies: { address: null, messages: { orderPlaced: bare } } } }],
  ["message of a channel without address", "channels.orders.messages.orderPlaced", { channels: { orders: { messages: { orderPlaced: bare } } } }],
  ["message of a parameterized channel", "channels.orderById.messages.orderPlaced", { channels: { orderById: { address: "orders/{orderId}", parameters: { orderId: { description: "Id." } }, messages: { orderPlaced: bare } } } }],
  ["components.channels message", "components.channels.audit.messages.orderPlaced", { components: { channels: { audit: { address: "audit", messages: { orderPlaced: bare } } } } }],
  ["components.messages", "components.messages.orderPlaced", { components: { messages: { orderPlaced: bare } } }],
  ["channel with an x- key", "channels.x-internal.messages.x-legacy", { channels: { "x-internal": { address: "internal", messages: { "x-legacy": bare } } } }],
  ["message with an x- key", "components.messages.x-legacy", { components: { messages: { "x-legacy": bare } } }],
];

describe.each(["3.0.0", "3.1.0"])("AAR072 (AsyncAPI %s): message examples must comply with the payload and headers schemas", (version) => {
  let linter;

  const base = (extra) => ({ asyncapi: version, info: { title: "Message Example Schemas", version: "1.0.0" }, ...extra });
  const run = async (doc) => linter.run(withVersion(doc, version));
  const matrixDoc = (schema, values, { part = "payload", format } = {}) =>
    base({
      components: {
        ...EXAMPLE_SCHEMA_COMPONENTS,
        messages: Object.fromEntries(values.map((value, index) => [`case${index}`, { name: `case${index}`, [part]: multiFormat(schema, format), examples: [{ [part]: value }] }])),
      },
    });
  const expectedMatrix = (okCount, fails, { part = "payload" } = {}) =>
    sorted(
      fails.flatMap(([, findings], index) =>
        findings.map(([rel, text]) => [[`components.messages.case${okCount + index}.examples.0.${part}`, ...rel].join("."), messageOf(0, part, rel, text)])
      )
    );
  const runMatrix = async ([, schema, okValues, fails], options = {}) => {
    const doc = matrixDoc(schema, [...okValues, ...fails.map(([value]) => value)], options);
    expect(findingsOf(await run(doc))).toEqual(expectedMatrix(okValues.length, fails, options));
  };

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose examples all comply with multi-format JSON Schema, OpenAPI and Avro schemas", async () => {
    expect(findingsOf(await run(okExample))).toEqual([]);
  });

  test("reports every non-compliant value of a realistic document at its exact location with the exact message", async () => {
    expect(findingsOf(await run(failExample))).toEqual(sorted(FAIL_EXAMPLE_FINDINGS));
  });

  test("reports with error severity", async () => {
    const results = only(await run(failExample));
    expect(results).toHaveLength(FAIL_EXAMPLE_FINDINGS.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("treats any version from 3 upwards as 3.x", async () => {
    for (const variant of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, variant)))).toEqual(sorted(FAIL_EXAMPLE_FINDINGS));
    }
  });

  test("never reports operations, replies or operation message lists, which only reference channel messages", async () => {
    const results = only(await run(failExample));
    expect(results.filter((r) => r.path[0] === "operations" || r.path.includes("replies") || r.path.includes("operations"))).toEqual([]);
  });

  test.each(LOCATIONS)("checks a %s", async (_, path, extra) => {
    expect(findingsOf(await run(base(extra)))).toEqual([[`${path}.examples.0.payload.orderId`, messageOf(0, "payload", ["orderId"], "must be a string")]]);
  });

  describe("JSON Schema keywords", () => {
    test.each(TOP_LEVEL_CASES)("payload: %s", async (...testCase) => {
      await runMatrix(testCase);
    });

    test.each(TOP_LEVEL_CASES)("headers: %s", async (...testCase) => {
      await runMatrix(testCase, { part: "headers" });
    });

    test.each(["payload", "headers"])("does not check a %s that is an unresolvable reference, whose schema format is unknown, even with sibling keywords", async (part) => {
      const schema = { $ref: "../shared/money.json#/Money", type: "object" };
      expect(findingsOf(await run(matrixDoc(schema, [1, "x"], { part })))).toEqual([]);
      expect(findingsOf(await run(matrixDoc({ $ref: "#/components/schemas/Missing", type: "object" }, [1], { part })))).toEqual([]);
      const wrapped = findingsOf(await run(matrixDoc(schema, [1], { part, format: "application/schema+json;version=draft-07" })));
      expect(wrapped).toEqual([[`components.messages.case0.examples.0.${part}`, messageOf(0, part, [], "must be an object")]]);
    });

    test.each(EXAMPLE_JSON_SCHEMA_CASES)("multi-format JSON Schema payload: %s", async (...testCase) => {
      await runMatrix(testCase, { format: "application/schema+json;version=draft-07" });
    });

    test.each(EXAMPLE_FORMAT_CASES.map(([name, ok, bad]) => formatCases("string", name, ok, bad)))("string format %s", async (...testCase) => {
      await runMatrix(testCase);
    });

    test.each(EXAMPLE_NUMBER_FORMAT_CASES.map(([name, ok, bad]) => formatCases("number", name, ok, bad)))("number format %s", async (...testCase) => {
      await runMatrix(testCase);
    });

    test.each(EXAMPLE_IGNORED_FORMATS)("ignores the format %p", async (format) => {
      await runMatrix(["", { format }, ["anything", "", 1.5, -0, 1e300, null], []]);
    });
  });

  describe("OpenAPI 3.0 schemas", () => {
    test.each(EXAMPLE_OPENAPI_SCHEMA_CASES)("payload: %s", async (...testCase) => {
      await runMatrix(testCase, { format: OPENAPI });
    });

    test.each(EXAMPLE_OPENAPI_SCHEMA_CASES)("headers: %s", async (...testCase) => {
      await runMatrix(testCase, { part: "headers", format: OPENAPI });
    });

    test("ignores the discriminator outside the OpenAPI format", async () => {
      const [, schema, okValues] = EXAMPLE_OPENAPI_SCHEMA_CASES.find(([label]) => label === "discriminator by schema name");
      const ambiguous = messageOf(0, "payload", [], "must match exactly one schema in oneOf, but matches oneOf[0] and oneOf[1]");
      expect(findingsOf(await run(matrixDoc(schema, okValues)))).toEqual(sorted(okValues.map((_, index) => [`components.messages.case${index}.examples.0.payload`, ambiguous])));
    });
  });

  describe("Avro schemas", () => {
    test.each(EXAMPLE_AVRO_SCHEMA_CASES)("payload: %s", async (...testCase) => {
      await runMatrix(testCase, { format: AVRO });
    });

    test.each(EXAMPLE_AVRO_SCHEMA_CASES)("headers: %s", async (...testCase) => {
      await runMatrix(testCase, { part: "headers", format: AVRO });
    });
  });

  describe("schemaFormat", () => {
    test.each(EXAMPLE_SCHEMA_FORMAT_CASES)("payload schemaFormat %p is checked as %p", async (format, kind) => {
      const message = { name: "probe", payload: format === undefined ? HYBRID_PROBE_SCHEMA : { schemaFormat: format, schema: HYBRID_PROBE_SCHEMA }, examples: HYBRID_PROBE_EXAMPLES };
      const expected = kind === null ? [] : HYBRID_PROBE_FINDINGS[kind].map(([index, trail, text]) => [`components.messages.m.examples.${index}.${trail}`, `AAR072: examples[${index}].${trail} ${text}.`]);
      expect(findingsOf(await run(base({ components: { messages: { m: message } } })))).toEqual(sorted(expected));
    });

    test("ignores a 2.x message-level schemaFormat and checks the payload as an AsyncAPI schema", async () => {
      const message = { schemaFormat: AVRO, payload: HYBRID_PROBE_SCHEMA, examples: HYBRID_PROBE_EXAMPLES };
      expect(findingsOf(await run(base({ components: { messages: { m: message } } })))).toEqual(
        sorted([
          ["components.messages.m.examples.0.payload", messageOf(0, "payload", [], "must have required property 'id'")],
          ["components.messages.m.examples.1.payload.id", messageOf(1, "payload", ["id"], "must be a string")],
        ])
      );
    });

    test("follows a multi-format payload or headers behind a local reference and skips external ones", async () => {
      const components = {
        schemas: {
          AvroPing: { schemaFormat: AVRO, schema: { type: "record", name: "Ping", fields: [{ name: "at", type: "long" }] } },
          AliasPing: { $ref: "#/components/schemas/AvroPing" },
          JsonHeaders: { schemaFormat: "application/schema+yaml;version=draft-07", schema: { type: "object", required: ["traceId"] } },
        },
        messages: {
          local: { payload: { $ref: "#/components/schemas/AliasPing" }, headers: { $ref: "#/components/schemas/JsonHeaders" }, examples: [{ payload: { at: "1" }, headers: {} }] },
          external: { payload: { $ref: "./schemas/ping.yaml#/AvroPing" }, headers: { schemaFormat: AVRO, schema: { $ref: "./avro/headers.avsc" } }, examples: [{ payload: { at: "1" }, headers: {} }] },
          refSchema: { payload: { schemaFormat: AVRO, schema: { $ref: "#/components/schemas/AvroPing/schema" } }, examples: [{ payload: { at: 1.5 } }] },
          noSchema: { payload: { schemaFormat: AVRO }, examples: [{ payload: { at: "1" } }] },
          nullSchema: { payload: { schemaFormat: AVRO, schema: null }, examples: [{ payload: { at: "1" } }] },
          nullFormat: { payload: { schemaFormat: null, schema: { type: "object", required: ["at"] } }, examples: [{ payload: {} }] },
        },
      };
      expect(findingsOf(await run(base({ components })))).toEqual(
        sorted([
          ["components.messages.local.examples.0.payload.at", messageOf(0, "payload", ["at"], "must be a long")],
          ["components.messages.local.examples.0.headers", messageOf(0, "headers", [], "must have required property 'traceId'")],
          ["components.messages.refSchema.examples.0.payload.at", messageOf(0, "payload", ["at"], "must be a long")],
          ["components.messages.nullFormat.examples.0.payload", messageOf(0, "payload", [], "must have required property 'at'")],
        ])
      );
    });
  });

  describe("traits", () => {
    test.each(EXAMPLE_SCHEMA_TRAIT_CASES.map(([label, extra, v2, v3]) => [label, extra, v3 === "same" ? v2 : v3]))("%s", async (_, extra, expected) => {
      const doc = base({ components: { ...EXAMPLE_SCHEMA_TRAIT_COMPONENTS, messages: { m: { ...TRAIT_BASE_MESSAGE, ...extra } } } });
      expect(findingsOf(await run(doc))).toEqual(sorted(expected.map(([suffix, text]) => [`components.messages.m.${suffix}`, `AAR072: ${text}`])));
    });

    test("merges multi-format headers of the message over the headers of its traits", async () => {
      const doc = base({
        components: {
          messageTraits: { avroHeaders: { headers: { schemaFormat: AVRO, schema: { type: "record", name: "KafkaHeaders", fields: [{ name: "partition", type: "int" }] } } } },
          messages: { m: { headers: { schema: { fields: [{ name: "partition", type: "long" }] } }, traits: [{ $ref: "#/components/messageTraits/avroHeaders" }], examples: [{ headers: { partition: 3000000000 } }, { headers: { partition: "1" } }] } },
        },
      });
      expect(findingsOf(await run(doc))).toEqual([["components.messages.m.examples.1.headers.partition", messageOf(1, "headers", ["partition"], "must be a long")]]);
    });

    test("never reports a trait on its own: traits are not messages", async () => {
      expect(findingsOf(await run(base({ components: { ...EXAMPLE_SCHEMA_TRAIT_COMPONENTS } })))).toEqual([]);
    });
  });

  test("checks a shared message, channel or example once at its definition and reports referenced examples at the reference", async () => {
    expect(findingsOf(await run(failSharedRef.document))).toEqual(sorted(failSharedRef.expected));
  });

  test("skips null, scalar and array nodes, $ref channels and messages, inline operation and reply messages, missing schemas, unusable examples, external references and 2.x-only structures", async () => {
    expect(findingsOf(await run(okStructuralEdges))).toEqual([]);
  });

  test("ignores 2.x publish and subscribe operations, including their oneOf members", async () => {
    const doc = base({ channels: { orders: { publish: { message: bare }, subscribe: { message: { oneOf: [bare] } } } } });
    expect(findingsOf(await run(doc))).toEqual([]);
  });

  test("treats a 2.x oneOf wrapper as a message without payload", async () => {
    const doc = base({ components: { messages: { m: { oneOf: [bare], examples: [{ payload: { orderId: 1 } }] } } } });
    expect(findingsOf(await run(doc))).toEqual([]);
  });

  test("handles components set to null or to a scalar", async () => {
    for (const components of [null, "components", [], 42]) {
      expect(pathsOf(await run(base({ components, channels: { orders: { messages: { orderPlaced: bare } } } })))).toEqual(["channels.orders.messages.orderPlaced.examples.0.payload.orderId"]);
    }
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: version, components: { messages: { m: bare } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(findingsOf(await run(failLargeGenerated.document))).toEqual(sorted(failLargeGenerated.expected));
  });

  test("checks very large Avro examples and reports only their violations", async () => {
    const readings = Object.fromEntries(Array.from({ length: 3000 }, (_, index) => [`meter-${index}`, index % 3 === 0 ? null : index % 3 === 1 ? { long: index } : index]));
    readings["meter-2777"] = "2777";
    const schema = { type: "record", name: "Snapshot", fields: [{ name: "readings", type: { type: "map", values: ["null", "long"] } }, { name: "ids", type: { type: "array", items: "string" } }] };
    const ids = Array.from({ length: 5000 }, (_, index) => `id-${index}`);
    ids[4500] = 4500;
    const doc = base({ components: { messages: { snapshot: { payload: { schemaFormat: AVRO, schema }, examples: [{ payload: { readings, ids } }] } } } });
    expect(findingsOf(await run(doc))).toEqual(
      sorted([
        ["components.messages.snapshot.examples.0.payload.readings.meter-2777", messageOf(0, "payload", ["readings", "meter-2777"], "must match one of the union types null, long")],
        ["components.messages.snapshot.examples.0.payload.ids.4500", messageOf(0, "payload", ["ids", 4500], "must be a string")],
      ])
    );
  }, 60000);
});
