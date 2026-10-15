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

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Message Example Schemas", version: "1.0.0" }, ...extra });
const matrixDoc = (schema, values, { part = "payload", format } = {}) =>
  base({
    components: {
      ...EXAMPLE_SCHEMA_COMPONENTS,
      messages: Object.fromEntries(
        values.map((value, index) => [
          `case${index}`,
          { name: `case${index}`, ...(format === undefined ? {} : { schemaFormat: format }), [part]: schema, examples: [{ [part]: value }] },
        ])
      ),
    },
  });
const expectedMatrix = (okCount, fails, { part = "payload" } = {}) =>
  sorted(
    fails.flatMap(([, findings], index) =>
      findings.map(([rel, text]) => [[`components.messages.case${okCount + index}.examples.0.${part}`, ...rel].join("."), messageOf(0, part, rel, text)])
    )
  );
const runMatrix = async (linter, [, schema, okValues, fails], options = {}) => {
  const doc = matrixDoc(schema, [...okValues, ...fails.map(([value]) => value)], options);
  expect(findingsOf(await linter.run(doc))).toEqual(expectedMatrix(okValues.length, fails, options));
};
const formatCases = (type, name, ok, bad) => [name, { type, format: name }, ok, bad.map((value) => [value, [[[], `must match format "${name}"`]]])];

const W = "channels.fleet.cdc.telemetry.position.v2";
const D = "channels.fleet.cmd.dispatch.assign.v1";
const M = "channels.fleet/vehicles/{vehicleId}/maintenance";
const B = "channels.fleet.sys.billing.invoices.v1";

const FAIL_EXAMPLE_FINDINGS = [
  [`${W}.publish.message.examples.0.payload.speedKmh`, messageOf(0, "payload", ["speedKmh"], "must be <= 300")],
  [`${W}.publish.message.examples.0.payload.position.lat`, messageOf(0, "payload", ["position", "lat"], "must be a number")],
  [`${W}.publish.message.examples.1.payload`, messageOf(1, "payload", [], "must have required property 'vehicleId'")],
  [`${W}.publish.message.examples.1.headers.traceId`, messageOf(1, "headers", ["traceId"], 'must match format "uuid"')],
  [`${W}.subscribe.message.oneOf.1.examples.0.payload.recordedAt`, messageOf(0, "payload", ["recordedAt"], "must be a long")],
  [`${W}.subscribe.message.oneOf.1.examples.0.payload.source`, messageOf(0, "payload", ["source"], "must be a symbol of enum 'Source': GPS, GLONASS, GALILEO")],
  [`${W}.subscribe.message.oneOf.1.examples.0.payload.firmware`, messageOf(0, "payload", ["firmware"], "is not a field of record 'PositionReported'")],
  [`${W}.subscribe.message.oneOf.2.examples.0.payload`, messageOf(0, "payload", [], "must be an object or null")],
  [`${D}.publish.message.examples.0.payload.stops.1.eta`, messageOf(0, "payload", ["stops", 1, "eta"], 'must match format "date-time"')],
  [`${D}.publish.message.examples.0.payload.priority`, messageOf(0, "payload", ["priority"], 'must be one of: "LOW", "NORMAL", "URGENT"')],
  [`${D}.publish.message.examples.0.payload.stops`, messageOf(0, "payload", ["stops"], "must not have duplicate items: items 0 and 2 are identical")],
  [`${D}.subscribe.message.examples.0.payload.driver`, messageOf(0, "payload", ["driver"], "must have required property 'licenseId'")],
  [`${D}.subscribe.message.examples.0.payload.notes`, messageOf(0, "payload", ["notes"], "must not have more than 140 characters")],
  [`${M}.publish.message.traits.1`, messageOf(0, "payload", ["workshopId"], "must be a string", 1)],
  [`${M}.subscribe.message.examples.0.headers`, messageOf(0, "headers", [], "must have required property 'tenant'")],
  [`${M}.subscribe.message.examples.0.headers.priority`, messageOf(0, "headers", ["priority"], "must be an integer")],
  [`${B}.publish.message.examples.0.payload.lines.0.amount`, messageOf(0, "payload", ["lines", 0, "amount"], "must be a multiple of 0.01")],
  [`${B}.publish.message.examples.0.payload.currency`, messageOf(0, "payload", ["currency"], 'must match pattern "^[A-Z]{3}$"')],
  [`${B}.publish.message.examples.0.payload.x-legacy-ref`, messageOf(0, "payload", ["x-legacy-ref"], "is not allowed by additionalProperties")],
  [`${B}.subscribe.message.examples.0.payload.total`, messageOf(0, "payload", ["total"], "must be a string of bytes")],
  ["components.channels.fleet.sys.audit.v1.subscribe.message.examples.0.payload.actor", messageOf(0, "payload", ["actor"], "must be a string")],
  ["components.messages.vehicleRegistered.examples.0.payload.vin", messageOf(0, "payload", ["vin"], "must not have fewer than 17 characters")],
  ["components.messages.vehicleRegistered.examples.1.payload.registeredOn", messageOf(1, "payload", ["registeredOn"], 'must match format "date"')],
  ["components.messages.driverShiftEnded.examples.0.payload", messageOf(0, "payload", [], "must be an object")],
  ["components.messages.geofenceBreached.examples.0.payload.zone", messageOf(0, "payload", ["zone"], "must match exactly one schema in oneOf")],
  ["components.messages.geofenceBreached.examples.1.payload.zone.radiusMeters", messageOf(1, "payload", ["zone", "radiusMeters"], "must be > 0")],
  ["components.messages.x-legacy-ping.examples.0.payload", messageOf(0, "payload", [], "must equal \"ping\"")],
  ["components.messages.tripSummary.oneOf.0.examples.0.payload.distanceKm", messageOf(0, "payload", ["distanceKm"], "must be >= 0")],
];

const LOCATIONS = [
  ["publish message", "channels.orders.publish.message", { channels: { orders: { publish: { message: "MESSAGE" } } } }],
  ["subscribe message", "channels.orders.subscribe.message", { channels: { orders: { subscribe: { message: "MESSAGE" } } } }],
  ["oneOf member", "channels.orders.publish.message.oneOf.1", { channels: { orders: { publish: { message: { oneOf: [{ name: "other", payload: {} }, "MESSAGE"] } } } } }],
  ["nested oneOf member", "channels.orders.publish.message.oneOf.0.oneOf.0", { channels: { orders: { publish: { message: { oneOf: [{ oneOf: ["MESSAGE"] }] } } } } }],
  ["components.channels message", "components.channels.audit.subscribe.message", { components: { channels: { audit: { subscribe: { message: "MESSAGE" } } } } }],
  ["components.channels oneOf member", "components.channels.audit.publish.message.oneOf.0", { components: { channels: { audit: { publish: { message: { oneOf: ["MESSAGE"] } } } } } }],
  ["components.messages", "components.messages.m", { components: { messages: { m: "MESSAGE" } } }],
  ["components.messages oneOf member", "components.messages.m.oneOf.0", { components: { messages: { m: { oneOf: ["MESSAGE"] } } } }],
  ["channel with an x- key", "channels.x-internal.publish.message", { channels: { "x-internal": { publish: { message: "MESSAGE" } } } }],
  ["message with an x- key", "components.messages.x-legacy", { components: { messages: { "x-legacy": "MESSAGE" } } }],
];
const badMessage = { name: "orderPlaced", payload: { type: "object", properties: { orderId: { type: "string" } } }, examples: [{ payload: { orderId: 1 } }] };
const placeMessage = (value) => JSON.parse(JSON.stringify(value), (key, item) => (item === "MESSAGE" ? badMessage : item));

describe("AAR072 (AsyncAPI 2.x): message examples must comply with the payload and headers schemas", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose examples all comply with JSON Schema, OpenAPI and Avro schemas", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every non-compliant value of a realistic document at its exact location with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(sorted(FAIL_EXAMPLE_FINDINGS));
  });

  test("reports with error severity", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL_EXAMPLE_FINDINGS.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(sorted(FAIL_EXAMPLE_FINDINGS));
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(sorted(FAIL_EXAMPLE_FINDINGS));
    }
  });

  test.each(LOCATIONS)("checks a %s", async (_, path, extra) => {
    const results = await linter.run(base(placeMessage(extra)));
    expect(findingsOf(results)).toEqual([[`${path}.examples.0.payload.orderId`, messageOf(0, "payload", ["orderId"], "must be a string")]]);
  });

  describe("JSON Schema keywords", () => {
    test.each(EXAMPLE_JSON_SCHEMA_CASES)("payload: %s", async (...testCase) => {
      await runMatrix(linter, testCase);
    });

    test.each(EXAMPLE_JSON_SCHEMA_CASES)("headers: %s", async (...testCase) => {
      await runMatrix(linter, testCase, { part: "headers" });
    });

    test.each(EXAMPLE_FORMAT_CASES.map(([name, ok, bad]) => formatCases("string", name, ok, bad)))("string format %s", async (...testCase) => {
      await runMatrix(linter, testCase);
    });

    test.each(EXAMPLE_NUMBER_FORMAT_CASES.map(([name, ok, bad]) => formatCases("number", name, ok, bad)))("number format %s", async (...testCase) => {
      await runMatrix(linter, testCase);
    });

    test("checks a format without a type only on values of the type the format applies to", async () => {
      await runMatrix(linter, ["", { format: "date" }, [5, null, true, {}, []], [["2026-02-30", [[[], 'must match format "date"']]]]]);
      await runMatrix(linter, ["", { format: "int32" }, ["2147483648", 1.5e9], [[2147483648, [[[], 'must match format "int32"']]]]]);
    });

    test.each(EXAMPLE_IGNORED_FORMATS)("ignores the format %p", async (format) => {
      await runMatrix(linter, ["", { format }, ["anything", "", 1.5, -0, 1e300, null], []]);
    });
  });

  describe("OpenAPI 3.0 schemas", () => {
    test.each(EXAMPLE_OPENAPI_SCHEMA_CASES)("%s", async (...testCase) => {
      await runMatrix(linter, testCase, { format: OPENAPI });
    });

    test.each(EXAMPLE_OPENAPI_SCHEMA_CASES.filter(([label]) => label.startsWith("nullable") && label !== "nullable false"))("%s fails null outside the OpenAPI format", async (_, schema) => {
      const results = only(await linter.run(matrixDoc(schema, [null])));
      expect(results.length).toBeGreaterThan(0);
    });

    test("ignores the discriminator outside the OpenAPI format", async () => {
      const [, schema, okValues] = EXAMPLE_OPENAPI_SCHEMA_CASES.find(([label]) => label === "discriminator by schema name");
      const ambiguous = messageOf(0, "payload", [], "must match exactly one schema in oneOf, but matches oneOf[0] and oneOf[1]");
      expect(findingsOf(await linter.run(matrixDoc(schema, okValues)))).toEqual(sorted(okValues.map((_, index) => [`components.messages.case${index}.examples.0.payload`, ambiguous])));
    });
  });

  describe("Avro schemas", () => {
    test.each(EXAMPLE_AVRO_SCHEMA_CASES)("%s", async (...testCase) => {
      await runMatrix(linter, testCase, { format: AVRO });
    });

    test("validates the headers with JSON Schema even when the message schemaFormat is Avro", async () => {
      const doc = base({
        components: {
          messages: {
            m: {
              schemaFormat: AVRO,
              payload: { type: "record", name: "Ping", fields: [{ name: "at", type: "long" }] },
              headers: { type: "object", properties: { at: { type: "integer" } } },
              examples: [{ payload: { at: "1" }, headers: { at: "1" } }],
            },
          },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        sorted([
          ["components.messages.m.examples.0.payload.at", messageOf(0, "payload", ["at"], "must be a long")],
          ["components.messages.m.examples.0.headers.at", messageOf(0, "headers", ["at"], "must be an integer")],
        ])
      );
    });
  });

  describe("schemaFormat", () => {
    test.each(EXAMPLE_SCHEMA_FORMAT_CASES)("schemaFormat %p is checked as %p", async (format, kind) => {
      const message = { name: "probe", payload: HYBRID_PROBE_SCHEMA, examples: HYBRID_PROBE_EXAMPLES };
      if (format !== undefined) message.schemaFormat = format;
      const results = await linter.run(base({ components: { messages: { m: message } } }));
      const expected = kind === null ? [] : HYBRID_PROBE_FINDINGS[kind].map(([index, trail, text]) => [`components.messages.m.examples.${index}.${trail}`, `AAR072: examples[${index}].${trail} ${text}.`]);
      expect(findingsOf(results)).toEqual(sorted(expected));
    });

    test("ignores a 3.x multi-format payload object, which in 2.x is a schema with unknown keywords", async () => {
      const message = { payload: { schemaFormat: AVRO, schema: { type: "record", name: "Ping", fields: [{ name: "at", type: "long" }] } }, examples: [{ payload: { at: "1" } }, { payload: 42 }] };
      expect(findingsOf(await linter.run(base({ components: { messages: { m: message } } })))).toEqual([]);
    });
  });

  describe("traits", () => {
    test.each(EXAMPLE_SCHEMA_TRAIT_CASES.map(([label, extra, v2]) => [label, extra, v2]))("%s", async (_, extra, expected) => {
      const doc = base({ components: { ...EXAMPLE_SCHEMA_TRAIT_COMPONENTS, messages: { m: { ...TRAIT_BASE_MESSAGE, ...extra } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(sorted(expected.map(([suffix, text]) => [`components.messages.m.${suffix}`, `AAR072: ${text}`])));
    });

    test("never reports a trait on its own: traits are not messages", async () => {
      const doc = base({ components: { ...EXAMPLE_SCHEMA_TRAIT_COMPONENTS } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });
  });

  test("checks a shared message, channel or example once at its definition and reports referenced examples at the reference", async () => {
    expect(findingsOf(await linter.run(failSharedRef.document))).toEqual(sorted(failSharedRef.expected));
  });

  test("skips null, scalar and array nodes, $ref operations, missing schemas, unusable examples, external references and 3.x-only structures", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("ignores the 3.x channel messages map and top-level operations", async () => {
    const doc = base({
      channels: { orders: { address: "orders", messages: { orderPlaced: badMessage } } },
      operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/orders" }, messages: [badMessage] } },
    });
    expect(findingsOf(await linter.run(doc))).toEqual([]);
  });

  test("handles components set to null or to a scalar", async () => {
    for (const components of [null, "components", [], 42]) {
      expect(pathsOf(await linter.run(base({ components, channels: { orders: { publish: { message: badMessage } } } })))).toEqual(["channels.orders.publish.message.examples.0.payload.orderId"]);
    }
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", components: { messages: { m: badMessage } } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(sorted(failLargeGenerated.expected));
  });

  test("checks very large examples and reports only their violations", async () => {
    const lines = Array.from({ length: 5000 }, (_, index) => ({ sku: `SKU-${index}`, quantity: index % 7 }));
    lines[4999] = { quantity: 0, sku: "SKU-0" };
    lines[3456].quantity = 1.5;
    const payload = { type: "object", properties: { lines: { type: "array", uniqueItems: true, items: { type: "object", properties: { quantity: { type: "integer" } } } } } };
    const doc = base({ components: { messages: { bulk: { payload, examples: [{ payload: { lines } }] } } } });
    expect(findingsOf(await linter.run(doc))).toEqual(
      sorted([
        ["components.messages.bulk.examples.0.payload.lines", messageOf(0, "payload", ["lines"], "must not have duplicate items: items 0 and 4999 are identical")],
        ["components.messages.bulk.examples.0.payload.lines.3456.quantity", messageOf(0, "payload", ["lines", 3456, "quantity"], "must be an integer")],
      ])
    );
  }, 60000);
});
