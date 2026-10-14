const {
  linterForRule,
  INFO_COMPONENTS,
  INFO_VALUE_CASES,
  TAG_DEFAULT_FIELDS,
  TAG_FIXED_FIELDS,
  TAG_FULL_FIELDS,
  TAG_COMPONENTS,
  TAG_ITEM_CASES,
  TAG_LIST_CASES,
  TAG_PROBE,
  TAG_OPTION_CASES,
  TAG_MESSAGES: MSG,
  tagFinding,
  tagFindings,
  tagProbeFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR076/ok-example");
const failExample = require("./AAR076/fail-example");
const failSharedRef = require("./AAR076/fail-shared-ref");
const okStructuralEdges = require("./AAR076/ok-structural-edges");
const failLargeGenerated = require("./AAR076/fail-large-generated");

const RULE = "asa:AAR076";
const FULL = { "fields-to-apply": TAG_FULL_FIELDS.join(",") };
const P = "populated";
const E = "empty";
const G = "channels.harborline.cmd.containers.gate-in.v2";
const V = "channels.vessels/{vesselId}/berth";

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const sorted = (findings) => [...findings].sort(byPath);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => sorted(only(results).map((r) => [r.path.join("."), r.message]));
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL_TAGS = [
  ["tags.0", "containers", { name: P, description: P, externalDocs: P, "x-owner": P }],
  ["tags.1", "vessels", { name: P }],
  ["tags.2", "yard", { name: P, description: E }],
  ["tags.3", undefined, { description: P }],
  ["servers.kafkaTerminals.tags.1", "production", { name: P, description: E }],
  ["servers.rabbitGates.tags.0", undefined, { name: E, description: P }],
  [`${G}.publish.tags.0`, "gate-in", { name: P, description: P }],
  [`${G}.publish.traits.1.tags.0`, "inline-producer", { name: P }],
  [`${G}.publish.message.tags.0`, "gate-events", { name: P, description: E }],
  [`${G}.publish.message.traits.1.0.tags.0`, "tuple-trait", { name: P }],
  [`${G}.subscribe.message.oneOf.1.tags.0`, "rejections", { name: P, description: E }],
  [`${G}.subscribe.message.oneOf.1.tags.1`, undefined, {}],
  ["components.servers.kafkaDr.tags.0", "disaster-recovery", { name: P, description: E }],
  ["components.channels.yardMoves.publish.tags.0", "yard-moves", { name: P }],
  ["components.messages.containerInspected.tags.0", "inspections", { name: P, description: E }],
  ["components.messages.vesselBerthed.tags.0", "berthing", { name: P, description: P }],
  ["components.operationTraits.kafkaProducer.tags.0", "producers", { name: P, description: E }],
  ["components.messageTraits.terminalHeaders.tags.0", "terminal-headers", { name: P }],
  ["components.x-tag-library.customs", "customs", { name: P }],
];
const FAIL_INVALID = [
  [`${G}.publish.tags.1`, "named", "gate-automation"],
  [`${G}.publish.message.tags.1`, "invalid"],
  [`${V}.subscribe.tags.0`, "reference", "#/components/x-tag-library/missing"],
];
const FAIL_DEFAULT = sorted(tagFindings(FAIL_TAGS, FAIL_INVALID));
const FAIL_FULL = sorted(tagFindings(FAIL_TAGS, FAIL_INVALID, TAG_FULL_FIELDS));

const SHARED_TAGS = [
  ["components.x-tag-sets.platform.0", "clearing-platform", { name: P, description: E }],
  ["components.x-tag-library.clearing", "clearing", { name: P, description: E }],
  ["components.x-tag-library.settlement", "settlement", { name: P }],
  ["components.messages.settlementRequested.tags.1", "requests", { name: P }],
  ["components.x-tag-sets.headers.0", "headers", { name: P }],
  ["components.x-tag-library.chargebacks", undefined, { description: P }],
  ["components.x-message-library.settlementConfirmed.tags.1", "confirmations", { name: P, description: P }],
  ["components.x-trait-library.audited.tags.0", "audited", { name: P }],
];
const SHARED_INVALID = [["components.x-message-library.chargebackOpened.tags.1", "reference", "#/components/x-tag-library/cycleA"]];
const SHARED_DEFAULT = sorted(tagFindings(SHARED_TAGS, SHARED_INVALID));
const SHARED_FULL = sorted(tagFindings(SHARED_TAGS, SHARED_INVALID, TAG_FULL_FIELDS));

const INFO = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const COMPONENTS = { ...INFO_COMPONENTS, ...TAG_COMPONENTS };
const doc = (extra = {}, components = {}) => ({
  asyncapi: "2.6.0",
  id: "urn:commerce:events",
  info: INFO,
  channels: {},
  ...extra,
  components: { ...COMPONENTS, ...components },
});
const T = { name: "orders" };
const complete = { name: "orders", description: "Order events.", externalDocs: { url: "https://docs.commerce.example.io/orders" }, "x-owner": "commerce-platform" };
const server = (tags) => ({ url: "kafka.commerce.example.com:9093", protocol: "kafka-secure", tags });
const ORDERS_FINDING = (path) => [[path, MSG.missing("description", "orders")]];

const LOCATIONS = [
  ["root tags", () => doc({ tags: [T] }), "tags.0"],
  ["server tags", () => doc({ servers: { kafka: server([T]) } }), "servers.kafka.tags.0"],
  ["a server whose name starts with x-", () => doc({ servers: { "x-edge": server([T]) } }), "servers.x-edge.tags.0"],
  ["publish operation tags", () => doc({ channels: { orders: { publish: { tags: [T] } } } }), "channels.orders.publish.tags.0"],
  ["subscribe operation tags", () => doc({ channels: { orders: { subscribe: { tags: [T] } } } }), "channels.orders.subscribe.tags.0"],
  ["a channel whose name starts with x-", () => doc({ channels: { "x-orders": { publish: { tags: [T] } } } }), "channels.x-orders.publish.tags.0"],
  ["an inline operation trait", () => doc({ channels: { orders: { publish: { traits: [{ tags: [T] }] } } } }), "channels.orders.publish.traits.0.tags.0"],
  ["an operation trait in tuple form", () => doc({ channels: { orders: { publish: { traits: [[{ tags: [T] }, { "x-override": true }]] } } } }), "channels.orders.publish.traits.0.0.tags.0"],
  ["an inline message", () => doc({ channels: { orders: { publish: { message: { tags: [T] } } } } }), "channels.orders.publish.message.tags.0"],
  ["a oneOf member", () => doc({ channels: { orders: { subscribe: { message: { oneOf: [{ name: "a" }, { tags: [T] }] } } } } }), "channels.orders.subscribe.message.oneOf.1.tags.0"],
  ["an inline message trait", () => doc({ channels: { orders: { publish: { message: { traits: [{ tags: [T] }] } } } } }), "channels.orders.publish.message.traits.0.tags.0"],
  ["a message trait in tuple form", () => doc({ channels: { orders: { publish: { message: { traits: [[{ tags: [T] }, {}]] } } } } }), "channels.orders.publish.message.traits.0.0.tags.0"],
  ["a trait of a oneOf member", () => doc({ channels: { orders: { subscribe: { message: { oneOf: [{ traits: [{ tags: [T] }] }] } } } } }), "channels.orders.subscribe.message.oneOf.0.traits.0.tags.0"],
  ["components.servers", () => doc({}, { servers: { kafka: server([T]) } }), "components.servers.kafka.tags.0"],
  ["an operation of components.channels", () => doc({}, { channels: { orders: { subscribe: { tags: [T] } } } }), "components.channels.orders.subscribe.tags.0"],
  ["a message of components.channels", () => doc({}, { channels: { orders: { subscribe: { message: { tags: [T] } } } } }), "components.channels.orders.subscribe.message.tags.0"],
  ["components.messages", () => doc({}, { messages: { orderPlaced: { tags: [T] } } }), "components.messages.orderPlaced.tags.0"],
  ["a oneOf member in components.messages", () => doc({}, { messages: { orderEvents: { oneOf: [{ tags: [T] }] } } }), "components.messages.orderEvents.oneOf.0.tags.0"],
  ["a trait of a components message", () => doc({}, { messages: { orderPlaced: { traits: [{ tags: [T] }] } } }), "components.messages.orderPlaced.traits.0.tags.0"],
  ["components.operationTraits", () => doc({}, { operationTraits: { producer: { tags: [T] } } }), "components.operationTraits.producer.tags.0"],
  ["components.messageTraits", () => doc({}, { messageTraits: { headers: { tags: [T] } } }), "components.messageTraits.headers.tags.0"],
  [
    "a channel item reached through $ref",
    () => doc({ channels: { orders: { $ref: "#/components/x-channels/orders" } } }, { "x-channels": { orders: { publish: { tags: [T] } } } }),
    "components.x-channels.orders.publish.tags.0",
  ],
  [
    "an operation reached through $ref",
    () => doc({ channels: { orders: { publish: { $ref: "#/components/x-operations/publish" } } } }, { "x-operations": { publish: { tags: [T] } } }),
    "components.x-operations.publish.tags.0",
  ],
  [
    "a message reached through $ref",
    () => doc({ channels: { orders: { publish: { message: { $ref: "#/components/x-message-library/orderPlaced" } } } } }, { "x-message-library": { orderPlaced: { tags: [T] } } }),
    "components.x-message-library.orderPlaced.tags.0",
  ],
  [
    "a oneOf member reached through $ref",
    () => doc({ channels: { orders: { subscribe: { message: { oneOf: [{ $ref: "#/components/x-message-library/orderPlaced" }] } } } } }, { "x-message-library": { orderPlaced: { tags: [T] } } }),
    "components.x-message-library.orderPlaced.tags.0",
  ],
  [
    "an operation trait reached through a chained $ref",
    () => doc({ channels: { orders: { publish: { traits: [{ $ref: "#/components/x-traits/alias" }] } } } }, { "x-traits": { alias: { $ref: "#/components/x-traits/producer" }, producer: { tags: [T] } } }),
    "components.x-traits.producer.tags.0",
  ],
  [
    "a message trait reached through $ref",
    () => doc({ channels: { orders: { publish: { message: { traits: [{ $ref: "#/components/x-traits/headers" }] } } } } }, { "x-traits": { headers: { tags: [T] } } }),
    "components.x-traits.headers.tags.0",
  ],
  ["a server reached through $ref", () => doc({ servers: { kafka: { $ref: "#/components/x-servers/kafka" } } }, { "x-servers": { kafka: server([T]) } }), "components.x-servers.kafka.tags.0"],
  [
    "a tag list reached through $ref",
    () => doc({ channels: { orders: { publish: { tags: { $ref: "#/components/x-lists/orders" } } } } }, { "x-lists": { orders: [T] } }),
    "components.x-lists.orders.0",
  ],
];

const IGNORED = [
  ["info.tags, an AsyncAPI 3.x location", () => doc({ info: { ...INFO, tags: [T] } })],
  ["channel tags, an AsyncAPI 3.x location", () => doc({ channels: { orders: { tags: [T], publish: { tags: [complete] } } } })],
  ["channel messages, an AsyncAPI 3.x location", () => doc({ channels: { orders: { messages: { orderPlaced: { tags: [T] } } } } })],
  ["root operations, an AsyncAPI 3.x location", () => doc({ operations: { sendOrder: { action: "send", tags: [T] } } })],
  ["components.tags, an AsyncAPI 3.x location", () => doc({}, { tags: { orders: T } })],
  ["components.operations, an AsyncAPI 3.x location", () => doc({}, { operations: { receiveOrder: { action: "receive", tags: [T] } } })],
  ["components.replies, an AsyncAPI 3.x location", () => doc({}, { replies: { orderReply: { channel: { $ref: "#/components/x-channels/orders" } } }, "x-channels": { orders: { tags: [T] } } })],
  ["tags next to a oneOf", () => doc({ channels: { orders: { publish: { message: { oneOf: [{ name: "a" }], tags: [T] } } } } })],
  ["an unreferenced extension", () => doc({ "x-tags": [T] }, { "x-tag-drafts": { orders: T } })],
  ["the siblings of a message $ref", () => doc({ channels: { orders: { publish: { message: { $ref: "#/components/messages/complete", tags: [T] } } } } }, { messages: { complete: { name: "complete" } } })],
  ["the siblings of a channel $ref", () => doc({ channels: { orders: { $ref: "#/components/channels/complete", publish: { tags: [T] } } } }, { channels: { complete: {} } })],
  ["an external message", () => doc({ channels: { orders: { publish: { message: { $ref: "./messages.yaml#/orderPlaced", tags: [T] } } } } })],
  ["a dangling message reference", () => doc({ channels: { orders: { publish: { message: { $ref: "#/components/messages/missing" } } } } })],
  ["a traits object instead of a list", () => doc({ channels: { orders: { publish: { traits: { tags: [T] }, message: { traits: { tags: [T] } } } } } })],
  [
    "a payload property named tags, nullable in both JSON Schema and Avro",
    () =>
      doc({
        channels: {
          orders: {
            publish: { message: { payload: { type: "object", properties: { tags: { type: ["array", "null"], items: { type: "object", properties: { name: { type: "string" } } }, default: [T] } } } } },
            subscribe: {
              message: {
                schemaFormat: "application/vnd.apache.avro;version=1.9.0",
                payload: { type: "record", name: "Tag", fields: [{ name: "name", type: "string" }, { name: "tags", type: ["null", { type: "array", items: "string" }], default: null }] },
              },
            },
          },
        },
      }),
  ],
  ["message examples, headers and correlation ids", () => doc({ channels: { orders: { publish: { message: { headers: { type: "object", properties: { tags: { type: "string" } } }, examples: [{ payload: { tags: [T] } }], correlationId: { location: "$message.header#/id", tags: [T] } } } } } })],
  ["bindings, parameters and externalDocs", () => doc({ channels: { "orders/{region}": { parameters: { region: { schema: { type: "string" }, tags: [T] } }, bindings: { kafka: { tags: [T] } }, publish: { externalDocs: { url: "https://docs.example.io", tags: [T] } } } } })],
  ["a JSON schema named Tag", () => doc({}, { schemas: { Tag: { type: "object", properties: { name: { type: "string" }, description: { type: ["string", "null"] } }, examples: [T] } } })],
];

describe("AAR076 (AsyncAPI 2.x): every Tag object must populate its mandatory fields", () => {
  let linter;
  let full;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
    full = await linterForRule(RULE, { functionOptions: FULL });
  });

  test("passes a realistic Kafka, AMQP, MQTT and WebSocket document whose tags populate every field", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
    expect(findingsOf(await full.run(okExample))).toEqual([]);
  });

  test("reports root, server, operation, operation trait, message, message trait, oneOf and components tags", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_DEFAULT);
  });

  test("with externalDocs and an extension also required, reports them on every Tag object and lists them in the invalid-tag messages", async () => {
    expect(findingsOf(await full.run(failExample))).toEqual(FAIL_FULL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    expect(findingsOf(await full.run(withVersion(failExample, version)))).toEqual(FAIL_FULL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED_DEFAULT);
    expect(findingsOf(await full.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("treats a version that is not 3.x as 2.x", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null, { major: 3 }]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_DEFAULT);
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await full.run(failExample));
    expect(results).toHaveLength(FAIL_FULL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the tag in the message when it has a name, and falls back to 'the tag' when it does not", async () => {
    const byPath = Object.fromEntries(only(await linter.run(failExample)).map((r) => [r.path.join("."), r.message]));
    expect(byPath["tags.1"]).toBe("AAR076: Tag 'vessels' must declare the mandatory field 'description'.");
    expect(byPath["tags.2.description"]).toBe("AAR076: The mandatory field 'description' of tag 'yard' must not be empty.");
    expect(byPath["tags.3"]).toBe("AAR076: The tag must declare the mandatory field 'name'.");
    expect(byPath["servers.rabbitGates.tags.0.name"]).toBe("AAR076: The mandatory field 'name' of the tag must not be empty.");
    expect(byPath[`${G}.publish.tags.1`]).toBe("AAR076: Tag 'gate-automation' must be a Tag object with the mandatory fields 'name' and 'description'.");
    expect(byPath[`${G}.publish.message.tags.1`]).toBe("AAR076: The tag must be a Tag object with the mandatory fields 'name' and 'description'.");
    expect(byPath[`${V}.subscribe.tags.0`]).toBe("AAR076: The tag reference '#/components/x-tag-library/missing' must resolve to a Tag object with the mandatory fields 'name' and 'description'.");
  });

  test("reports a tag shared through $ref once, at its definition, and skips external tags", async () => {
    const results = only(await linter.run(failExample));
    expect(results.filter((r) => r.message.includes("'customs'")).map((r) => r.path.join("."))).toEqual(["components.x-tag-library.customs"]);
    expect(results.filter((r) => r.message.includes("'vessels'")).map((r) => r.path.join("."))).toEqual(["tags.1"]);
    expect(results.filter((r) => r.message.includes("'inspections'")).map((r) => r.path.join("."))).toEqual(["components.messages.containerInspected.tags.0.description"]);
    expect(results.filter((r) => r.path.join(".").startsWith(`${V}.subscribe.tags.1`))).toEqual([]);
  });

  test("follows chained references to tags, tag lists, messages and traits, reporting each shared tag once", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED_DEFAULT);
    expect(findingsOf(await full.run(failSharedRef))).toEqual(SHARED_FULL);
  });

  describe("tag locations", () => {
    test.each(LOCATIONS)("checks %s", async (_, build, path) => {
      expect(findingsOf(await linter.run(build()))).toEqual(ORDERS_FINDING(path));
    });

    test.each(IGNORED)("ignores %s", async (_, build) => {
      expect(findingsOf(await linter.run(build()))).toEqual([]);
      expect(findingsOf(await full.run(build()))).toEqual([]);
    });

    test("skips null, scalar, external, dangling and sibling nodes around tags, and every 3.x-only location", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
      expect(findingsOf(await full.run(okStructuralEdges))).toEqual([]);
    });
  });

  describe("tag items", () => {
    const AT = [
      ["root tags", (item) => doc({ tags: [item] }), "tags.0"],
      ["a components message", (item) => doc({}, { messages: { orderPlaced: { tags: [item] } } }), "components.messages.orderPlaced.tags.0"],
    ];
    const CASES = AT.flatMap(([where, build, path]) => TAG_ITEM_CASES.map(([label, item, expected]) => [label, where, build, path, item, expected]));

    test.each(CASES)("%s in %s", async (_, __, build, path, item, expected) => {
      expect(findingsOf(await linter.run(build(item)))).toEqual(sorted(expected.map((entry) => tagFinding(path, entry, TAG_DEFAULT_FIELDS))));
    });

    test.each(TAG_LIST_CASES)("a tags field set to %s", async (_, list, expected) => {
      const extra = list === undefined ? {} : { tags: list };
      expect(findingsOf(await linter.run(doc({ channels: { orders: { publish: { operationId: "publishOrder", ...extra } } } })))).toEqual(
        sorted(expected.map((entry) => tagFinding("channels.orders.publish.tags", entry, TAG_DEFAULT_FIELDS)))
      );
    });
  });

  describe("field values", () => {
    test.each(INFO_VALUE_CASES)("description set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [["tags.0.description", MSG.empty("description", "orders")]];
      expect(findingsOf(await linter.run(doc({ tags: [{ name: "orders", description: value }] })))).toEqual(expected);
    });

    test.each(INFO_VALUE_CASES)("name set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [["tags.0.name", MSG.empty("name")]];
      expect(findingsOf(await linter.run(doc({ tags: [{ name: value, description: "Order events." }] })))).toEqual(expected);
    });

    test.each(INFO_VALUE_CASES)("externalDocs and an extension set to %s, with them required", async (_, value, populated) => {
      const tags = [{ name: "orders", description: "Order events.", externalDocs: value, "x-owner": value }];
      const expected = populated ? [] : sorted([["tags.0.externalDocs", MSG.empty("externalDocs", "orders")], ["tags.0.x-owner", MSG.empty("x-owner", "orders")]]);
      expect(findingsOf(await full.run(doc({ tags })))).toEqual(expected);
      expect(findingsOf(await linter.run(doc({ tags })))).toEqual([]);
    });

    test.each([[["name"]], [["description"]], [["name", "description"]]])("reports %p missing at the tag", async (fields) => {
      const tag = Object.fromEntries(Object.entries(complete).filter(([key]) => !fields.includes(key)));
      const name = fields.includes("name") ? undefined : "orders";
      expect(findingsOf(await linter.run(doc({ tags: [tag] })))).toEqual(sorted(fields.map((field) => ["tags.0", MSG.missing(field, name)])));
    });

    test("does not inspect externalDocs and extensions with the shipped options", async () => {
      expect(findingsOf(await linter.run(doc({ tags: [{ ...complete, externalDocs: {}, "x-owner": "" }] })))).toEqual([]);
    });
  });

  describe("trait merging and tag names", () => {
    test("checks tags where they are written: a trait that would replace the message tags does not complete them", async () => {
      const message = { name: "orderPlaced", tags: [T], traits: [{ tags: [complete] }] };
      expect(findingsOf(await linter.run(doc({ channels: { orders: { publish: { message } } } })))).toEqual(ORDERS_FINDING("channels.orders.publish.message.tags.0"));
      const reversed = { name: "orderPlaced", tags: [complete], traits: [{ tags: [T] }] };
      expect(findingsOf(await linter.run(doc({ channels: { orders: { publish: { message: reversed } } } })))).toEqual(ORDERS_FINDING("channels.orders.publish.message.traits.0.tags.0"));
    });

    test("an operation trait shared by many operations is reported once, at the trait", async () => {
      const channels = Object.fromEntries(
        Array.from({ length: 6 }, (_, i) => [`orders.v${i}`, { publish: { traits: [{ $ref: "#/components/operationTraits/producer" }] }, subscribe: { traits: [{ $ref: "#/components/operationTraits/producer" }] } }])
      );
      expect(findingsOf(await linter.run(doc({ channels }, { operationTraits: { producer: { tags: [T] } } })))).toEqual(ORDERS_FINDING("components.operationTraits.producer.tags.0"));
    });

    test("a tag is never completed by a documented tag with the same name elsewhere", async () => {
      const built = doc({ tags: [complete], channels: { orders: { publish: { tags: [T], message: { tags: [T] } } } } });
      expect(findingsOf(await linter.run(built))).toEqual(sorted([...ORDERS_FINDING("channels.orders.publish.tags.0"), ...ORDERS_FINDING("channels.orders.publish.message.tags.0")]));
    });

    test("a reference to the documented root tag is accepted", async () => {
      expect(findingsOf(await linter.run(doc({ tags: [complete], channels: { orders: { publish: { tags: [{ $ref: "#/tags/0" }] } } } })))).toEqual([]);
    });
  });

  describe("fields-to-apply option", () => {
    test.each(TAG_OPTION_CASES)("%s", async (_, value, effective) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      expect(findingsOf(await custom.run(doc({ tags: TAG_PROBE })))).toEqual(sorted(tagProbeFindings("tags", effective)));
    });

    test.each(TAG_OPTION_CASES)("%s, listed in the messages of tags that are not objects", async (_, value, effective) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      const built = doc({ tags: ["orders", null, { $ref: "#/components/x-tags/missing" }] });
      expect(findingsOf(await custom.run(built))).toEqual(
        sorted([
          ["tags.0", MSG.named("orders", effective)],
          ["tags.1", MSG.invalid(effective)],
          ["tags.2", MSG.reference("#/components/x-tags/missing", effective)],
        ])
      );
    });

    test("ships name and description", async () => {
      expect(findingsOf(await linter.run(doc({ tags: TAG_PROBE })))).toEqual(sorted(tagProbeFindings("tags", TAG_DEFAULT_FIELDS)));
    });

    test("a rule served without fields-to-apply requires the defaults", async () => {
      const unset = await linterForRule(RULE, { functionOptions: { "fields-to-apply": undefined } });
      expect(findingsOf(await unset.run(failExample))).toEqual(FAIL_DEFAULT);
    });

    test("lists the fields in the order they are configured", async () => {
      const reversed = await linterForRule(RULE, { functionOptions: { "fields-to-apply": [...TAG_FIXED_FIELDS].reverse().join(",") } });
      expect(findingsOf(await reversed.run(doc({ tags: [null] })))).toEqual([["tags.0", MSG.invalid([...TAG_FIXED_FIELDS].reverse())]]);
    });
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await full.run(withoutVersion))).toEqual([]);
  });

  test("follows a components object given as a $ref, and ignores one that points to the document itself", async () => {
    const built = { asyncapi: "2.6.0", info: INFO, tags: [complete], channels: {}, components: { $ref: "#/x-components" }, "x-components": { messages: { orderPlaced: { tags: [T] } } } };
    expect(findingsOf(await linter.run(built))).toEqual(ORDERS_FINDING("x-components.messages.orderPlaced.tags.0"));
    expect(findingsOf(await linter.run({ ...built, components: { $ref: "#" } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", tags: [{ name: "orders" }] }]))).toEqual([]);
  });

  test("handles a very large document with thousands of tags and reports exactly the generated violations", async () => {
    const { document, tags, invalid } = failLargeGenerated;
    expect(tags.length + invalid.length).toBeGreaterThan(4000);
    expect(findingsOf(await linter.run(document))).toEqual(sorted(tagFindings(tags, invalid)));
    expect(findingsOf(await full.run(document))).toEqual(sorted(tagFindings(tags, invalid, TAG_FULL_FIELDS)));
  });
});
