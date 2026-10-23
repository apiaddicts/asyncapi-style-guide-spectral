const { linterForRule } = require("../../helpers/utils");
const { INFO_COMPONENTS, INFO_VALUE_CASES } = require("../../helpers/required-fields");
const {
  TAG_COMPONENTS,
  TAG_ITEM_CASES,
  TAG_LIST_CASES,
  TAG_PROBE,
  TAG_OPTION_CASES,
  TAG_MESSAGES: MSG,
  tagFinding,
  tagFindings,
  tagProbeFindings,
} = require("../../helpers/rules/aar076-tag-properties-required");
const okExample = require("./AAR076/ok-example");
const failExample = require("./AAR076/fail-example");
const failSharedRef = require("./AAR076/fail-shared-ref");
const okStructuralEdges = require("./AAR076/ok-structural-edges");
const failLargeGenerated = require("./AAR076/fail-large-generated");

const RULE = "asa:AAR076";
const FULL = { "fields-to-apply": "name,description,externalDocs,x-owner" };
const P = "populated";
const E = "empty";
const M = "channels.meterReadings";
const R = `${M}.messages.readingReported`;

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const sorted = (findings) => [...findings].sort(byPath);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => sorted(only(results).map((r) => [r.path.join("."), r.message]));
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL_TAGS = [
  ["info.tags.0", "energy", { name: P, description: P }],
  ["info.tags.1", "metering", { name: P }],
  ["components.tags.demandResponse", "demand-response", { name: P, description: E }],
  ["servers.mqttMeters.tags.0", "smart-meters", { name: P, description: E }],
  ["components.tags.production", "production", { name: P, description: P }],
  [`${M}.tags.0`, "readings", { name: P, description: E }],
  [`${R}.tags.0`, undefined, { name: E, description: P }],
  [`${R}.traits.1.tags.0`, "inline-message-trait", { name: P }],
  [`${R}.traits.2.0.tags.0`, undefined, { description: P }],
  ["channels.operatorAlerts.tags.0", "alerts", { name: P }],
  ["channels.operatorAlerts.messages.alertRaised.tags.0", undefined, {}],
  ["operations.reportReading.tags.0", "producers", { name: P, description: E }],
  ["operations.reportReading.traits.1.tags.0", "inline-operation-trait", { name: P }],
  ["components.servers.wsOperators.tags.0", "operators", { name: P, description: E }],
  ["components.channels.gridBalancing.tags.0", "balancing", { name: P }],
  ["components.channels.gridBalancing.messages.setpointChanged.tags.0", "setpoints", { name: P, description: P }],
  ["components.operations.balanceGrid.tags.0", "balancers", { name: P, description: E }],
  ["components.messages.readingRejected.tags.0", "rejections", { name: P }],
  ["components.operationTraits.mqttQos.tags.0", "qos", { name: P, description: E }],
  ["components.messageTraits.meterHeaders.tags.0", "meter-headers", { name: P }],
  ["components.tags.unused", "unused", { name: P }],
];
const FAIL_INVALID = [
  ["info.tags.3", "reference", "#/components/tags/missing"],
  [`${M}.tags.1`, "named", "telemetry"],
  ["operations.reportReading.tags.1", "invalid"],
];
const FAIL_DEFAULT = sorted(tagFindings(FAIL_TAGS, FAIL_INVALID));

const SHARED_TAGS = [
  ["components.tags.platform", "payments-hub", { name: P, description: E }],
  ["components.x-tag-sets.platform.1", "sepa-instant", { name: P, description: E }],
  ["components.tags.transfers", "transfers", { name: P }],
  ["components.messages.transferRequested.tags.1", "requests", { name: P }],
  ["components.x-tag-sets.headers.0", "headers", { name: P }],
  ["components.x-trait-library.audited.tags.0", "audited", { name: P }],
  ["components.x-channel-library.settlements.tags.0", undefined, { description: P }],
  ["components.x-channel-library.confirmations.messages.transferConfirmed.tags.0", "confirmations", { name: P, description: P }],
  ["components.x-channel-library.confirmations.messages.transferConfirmed.tags.1", "sca", { name: P }],
];
const SHARED_INVALID = [
  ["components.tags.cycleA", "reference", "#/components/tags/cycleB"],
  ["components.tags.cycleB", "reference", "#/components/tags/cycleA"],
  ["components.x-channel-library.settlements.messages.transferSettled.tags.0", "reference", "#/components/tags/cycleA"],
];
const SHARED_DEFAULT = sorted(tagFindings(SHARED_TAGS, SHARED_INVALID));

const UNRELATED_OPTIONS = [
  ["an empty object", {}],
  ["a camelCase fields-to-apply key", { fieldsToApply: "externalDocs,x-owner" }],
  ["a properties list", { properties: ["name", "description", "externalDocs"] }],
  ["a required-fields list", { "required-fields": "externalDocs" }],
  ["a field option", { field: "externalDocs" }],
  ["a pattern", { pattern: "^x-" }],
  ["null and non-string values", { properties: null, pattern: 42, field: true }],
];

const INFO = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const COMPONENTS = { ...INFO_COMPONENTS, ...TAG_COMPONENTS };
const T = { name: "orders" };
const complete = { name: "orders", description: "Order events.", externalDocs: { url: "https://docs.commerce.example.io/orders" }, "x-owner": "commerce-platform" };
const server = (tags) => ({ host: "kafka.commerce.example.com:9093", protocol: "kafka-secure", tags });
const ORDERS_FINDING = (path) => [[path, MSG.missing("description", "orders")]];

describe.each(["3.0.0", "3.1.0"])("AAR076 (AsyncAPI %s): every Tag object must populate its mandatory fields", (version) => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  const doc = (extra = {}, components = {}) => ({
    asyncapi: version,
    id: "urn:commerce:events",
    info: INFO,
    channels: {},
    operations: {},
    ...extra,
    components: { ...COMPONENTS, ...components },
  });
  const run = async (built, rule = linter) => findingsOf(await rule.run(withVersion(built, version)));

  const LOCATIONS = [
    ["info.tags", () => doc({ info: { ...INFO, tags: [T] } }), "info.tags.0"],
    ["the tags of an info object reached through $ref", () => doc({ info: { $ref: "#/components/x-info-library/main" } }, { "x-info-library": { main: { ...INFO, tags: [T] } } }), "components.x-info-library.main.tags.0"],
    ["server tags", () => doc({ servers: { kafka: server([T]) } }), "servers.kafka.tags.0"],
    ["a server whose name starts with x-", () => doc({ servers: { "x-edge": server([T]) } }), "servers.x-edge.tags.0"],
    ["channel tags", () => doc({ channels: { orders: { address: "orders", tags: [T] } } }), "channels.orders.tags.0"],
    ["the tags of a channel with a null address", () => doc({ channels: { orders: { address: null, tags: [T] } } }), "channels.orders.tags.0"],
    ["a channel whose name starts with x-", () => doc({ channels: { "x-orders": { tags: [T] } } }), "channels.x-orders.tags.0"],
    ["a channel message", () => doc({ channels: { orders: { messages: { orderPlaced: { tags: [T] } } } } }), "channels.orders.messages.orderPlaced.tags.0"],
    ["a message whose name starts with x-", () => doc({ channels: { orders: { messages: { "x-orderPlaced": { tags: [T] } } } } }), "channels.orders.messages.x-orderPlaced.tags.0"],
    ["a message that also declares an unused oneOf", () => doc({ channels: { orders: { messages: { orderPlaced: { oneOf: [{ name: "a" }], tags: [T] } } } } }), "channels.orders.messages.orderPlaced.tags.0"],
    ["an inline message trait", () => doc({ channels: { orders: { messages: { orderPlaced: { traits: [{ tags: [T] }] } } } } }), "channels.orders.messages.orderPlaced.traits.0.tags.0"],
    ["a message trait in tuple form", () => doc({ channels: { orders: { messages: { orderPlaced: { traits: [[{ tags: [T] }, {}]] } } } } }), "channels.orders.messages.orderPlaced.traits.0.0.tags.0"],
    ["operation tags", () => doc({ operations: { sendOrder: { action: "send", tags: [T] } } }), "operations.sendOrder.tags.0"],
    ["an operation whose name starts with x-", () => doc({ operations: { "x-sendOrder": { action: "send", tags: [T] } } }), "operations.x-sendOrder.tags.0"],
    ["an inline operation trait", () => doc({ operations: { sendOrder: { action: "send", traits: [{ tags: [T] }] } } }), "operations.sendOrder.traits.0.tags.0"],
    ["an operation trait in tuple form", () => doc({ operations: { sendOrder: { action: "send", traits: [[{ tags: [T] }, { "x-override": true }]] } } }), "operations.sendOrder.traits.0.0.tags.0"],
    ["components.servers", () => doc({}, { servers: { kafka: server([T]) } }), "components.servers.kafka.tags.0"],
    ["components.channels", () => doc({}, { channels: { orders: { tags: [T] } } }), "components.channels.orders.tags.0"],
    ["a message of components.channels", () => doc({}, { channels: { orders: { messages: { orderPlaced: { tags: [T] } } } } }), "components.channels.orders.messages.orderPlaced.tags.0"],
    ["components.operations", () => doc({}, { operations: { receiveOrder: { action: "receive", tags: [T] } } }), "components.operations.receiveOrder.tags.0"],
    ["components.messages", () => doc({}, { messages: { orderPlaced: { tags: [T] } } }), "components.messages.orderPlaced.tags.0"],
    ["a trait of a components message", () => doc({}, { messages: { orderPlaced: { traits: [{ tags: [T] }] } } }), "components.messages.orderPlaced.traits.0.tags.0"],
    ["components.operationTraits", () => doc({}, { operationTraits: { producer: { tags: [T] } } }), "components.operationTraits.producer.tags.0"],
    ["components.messageTraits", () => doc({}, { messageTraits: { headers: { tags: [T] } } }), "components.messageTraits.headers.tags.0"],
    ["an unreferenced components.tags entry", () => doc({}, { tags: { orders: T } }), "components.tags.orders"],
    ["a components.tags entry whose key starts with x-", () => doc({}, { tags: { "x-orders": T } }), "components.tags.x-orders"],
    ["a components.tags entry that is a reference", () => doc({}, { tags: { alias: { $ref: "#/components/x-tag-drafts/orders" } }, "x-tag-drafts": { orders: T } }), "components.x-tag-drafts.orders"],
    ["a channel reached through $ref", () => doc({ channels: { orders: { $ref: "#/components/x-channels/orders" } } }, { "x-channels": { orders: { tags: [T] } } }), "components.x-channels.orders.tags.0"],
    ["the channel of an operation", () => doc({ operations: { sendOrder: { action: "send", channel: { $ref: "#/components/x-channels/orders" } } } }, { "x-channels": { orders: { tags: [T] } } }), "components.x-channels.orders.tags.0"],
    [
      "the messages of an operation",
      () => doc({ operations: { sendOrder: { action: "send", messages: [{ $ref: "#/components/x-channels/orders/messages/orderPlaced" }] } } }, { "x-channels": { orders: { messages: { orderPlaced: { tags: [T] } } } } }),
      "components.x-channels.orders.messages.orderPlaced.tags.0",
    ],
    ["the channel of an inline reply", () => doc({ operations: { sendOrder: { action: "send", reply: { channel: { $ref: "#/components/x-channels/replies" } } } } }, { "x-channels": { replies: { tags: [T] } } }), "components.x-channels.replies.tags.0"],
    [
      "the messages of an inline reply",
      () => doc({ operations: { sendOrder: { action: "send", reply: { messages: [{ $ref: "#/components/x-message-library/orderAccepted" }] } } } }, { "x-message-library": { orderAccepted: { tags: [T] } } }),
      "components.x-message-library.orderAccepted.tags.0",
    ],
    [
      "a reply reached through $ref",
      () => doc({ operations: { sendOrder: { action: "send", reply: { $ref: "#/components/x-replies/accepted" } } } }, { "x-replies": { accepted: { channel: { $ref: "#/components/x-channels/replies" } } }, "x-channels": { replies: { tags: [T] } } }),
      "components.x-channels.replies.tags.0",
    ],
    ["the channel of components.replies", () => doc({}, { replies: { accepted: { channel: { $ref: "#/components/x-channels/replies" } } }, "x-channels": { replies: { tags: [T] } } }), "components.x-channels.replies.tags.0"],
    [
      "the messages of components.replies",
      () => doc({}, { replies: { accepted: { messages: [{ $ref: "#/components/x-message-library/orderAccepted" }] } }, "x-message-library": { orderAccepted: { tags: [T] } } }),
      "components.x-message-library.orderAccepted.tags.0",
    ],
    ["a server listed by a channel", () => doc({ channels: { orders: { servers: [{ $ref: "#/components/x-servers/kafka" }] } } }, { "x-servers": { kafka: server([T]) } }), "components.x-servers.kafka.tags.0"],
    ["a server reached through $ref", () => doc({ servers: { kafka: { $ref: "#/components/x-servers/kafka" } } }, { "x-servers": { kafka: server([T]) } }), "components.x-servers.kafka.tags.0"],
    [
      "a channel message reached through $ref",
      () => doc({ channels: { orders: { messages: { orderPlaced: { $ref: "#/components/x-message-library/orderPlaced" } } } } }, { "x-message-library": { orderPlaced: { tags: [T] } } }),
      "components.x-message-library.orderPlaced.tags.0",
    ],
    [
      "an operation reached through $ref",
      () => doc({ operations: { sendOrder: { $ref: "#/components/x-operations/sendOrder" } } }, { "x-operations": { sendOrder: { action: "send", tags: [T] } } }),
      "components.x-operations.sendOrder.tags.0",
    ],
    [
      "a message trait reached through a chained $ref",
      () => doc({ channels: { orders: { messages: { orderPlaced: { traits: [{ $ref: "#/components/x-traits/alias" }] } } } } }, { "x-traits": { alias: { $ref: "#/components/x-traits/headers" }, headers: { tags: [T] } } }),
      "components.x-traits.headers.tags.0",
    ],
    [
      "an operation trait reached through $ref",
      () => doc({ operations: { sendOrder: { action: "send", traits: [{ $ref: "#/components/x-traits/producer" }] } } }, { "x-traits": { producer: { tags: [T] } } }),
      "components.x-traits.producer.tags.0",
    ],
    ["a tag list reached through $ref", () => doc({ operations: { sendOrder: { action: "send", tags: { $ref: "#/components/x-lists/orders" } } } }, { "x-lists": { orders: [T] } }), "components.x-lists.orders.0"],
  ];

  const IGNORED = [
    ["root tags, an AsyncAPI 2.x location", () => doc({ tags: [T] })],
    ["channel-level publish and subscribe, an AsyncAPI 2.x location", () => doc({ channels: { orders: { publish: { tags: [T], message: { tags: [T] } }, subscribe: { traits: [{ tags: [T] }] } } } })],
    ["the oneOf members of a message, an AsyncAPI 2.x construct", () => doc({ channels: { orders: { messages: { orderPlaced: { oneOf: [{ tags: [T] }] } } } } })],
    ["an external info object", () => doc({ info: { $ref: "./info.yaml#/info", tags: [T] } })],
    ["an unreferenced extension", () => doc({ "x-tags": [T] }, { "x-tag-drafts": { orders: T } })],
    ["the siblings of a channel $ref", () => doc({ channels: { orders: { $ref: "#/components/channels/complete", tags: [T] } } }, { channels: { complete: { tags: [complete] } } })],
    ["the siblings of an operation $ref", () => doc({ operations: { sendOrder: { $ref: "#/components/operations/complete", tags: [T] } } }, { operations: { complete: { action: "send" } } })],
    ["the siblings of a components.tags reference", () => doc({}, { tags: { orders: complete, alias: { $ref: "#/components/tags/orders", description: "" } } })],
    ["an external channel, message, operation, reply and server", () => doc({ servers: { kafka: { $ref: "./servers.yaml#/kafka" } }, channels: { orders: { $ref: "./channels.yaml#/orders" } }, operations: { sendOrder: { action: "send", channel: { $ref: "./channels.yaml#/orders" }, messages: [{ $ref: "./messages.yaml#/orderPlaced" }], reply: { $ref: "./replies.yaml#/accepted" } } } })],
    ["a dangling channel, message and server", () => doc({ channels: { orders: { messages: { orderPlaced: { $ref: "#/components/messages/missing" } }, servers: [{ $ref: "#/servers/missing" }] } }, operations: { sendOrder: { action: "send", channel: { $ref: "#/channels/missing" } } } })],
    ["a traits object instead of a list", () => doc({ operations: { sendOrder: { action: "send", traits: { tags: [T] } } }, channels: { orders: { messages: { orderPlaced: { traits: { tags: [T] } } } } } })],
    ["a messages list instead of a map", () => doc({ channels: { orders: { messages: [{ tags: [T] }] } } })],
    [
      "a multi-format payload property named tags, nullable in both JSON Schema and Avro",
      () =>
        doc({
          channels: {
            orders: {
              messages: {
                json: { payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { type: "object", properties: { tags: { type: ["array", "null"], items: { type: "object" }, default: [T] } } } } },
                avro: { payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Tag", fields: [{ name: "name", type: "string" }, { name: "tags", type: ["null", { type: "array", items: "string" }], default: null }] } } },
              },
            },
          },
        }),
    ],
    ["message examples, headers and correlation ids", () => doc({ channels: { orders: { messages: { orderPlaced: { headers: { type: "object", properties: { tags: { type: "string" } } }, examples: [{ payload: { tags: [T] } }], correlationId: { location: "$message.header#/id", tags: [T] } } } } } })],
    ["bindings, parameters without schema and externalDocs", () => doc({ channels: { orders: { address: "orders/{region}", parameters: { region: { enum: ["eu"], tags: [T] } }, bindings: { kafka: { tags: [T] } }, externalDocs: { url: "https://docs.example.io", tags: [T] } } } })],
    ["a reply address and security requirements", () => doc({ operations: { sendOrder: { action: "send", security: [{ $ref: "#/components/securitySchemes/oauth", tags: [T] }], reply: { address: { location: "$message.header#/replyTo", tags: [T] } } } } }, { securitySchemes: { oauth: { type: "oauth2", flows: {}, tags: [T] } } })],
    ["a JSON schema named Tag", () => doc({}, { schemas: { Tag: { type: "object", properties: { name: { type: "string" }, description: { type: ["string", "null"] } }, examples: [T] } } })],
  ];

  test("passes a realistic MQTT, Kafka, AMQP and WebSocket document whose tags populate every field", async () => {
    expect(await run(okExample)).toEqual([]);
  });

  test("reports info, server, channel, message, operation, trait and every components tag", async () => {
    expect(await run(failExample)).toEqual(FAIL_DEFAULT);
  });

  test("treats every version from 3 on as 3.x", async () => {
    for (const other of [3, "3", "3.0", " 3.1.0", "3.2.0", "4.0.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, other)))).toEqual(FAIL_DEFAULT);
    }
  });

  test("the same document read as AsyncAPI 2.6 no longer checks info, channel, operation and components.tags", async () => {
    const asV2 = findingsOf(await linter.run(withVersion(failExample, "2.6.0")));
    expect(asV2).toEqual(
      sorted(
        tagFindings(
          FAIL_TAGS.filter(([path]) => path.startsWith("servers.") || /^components\.(servers|messages|operationTraits|messageTraits)\./.test(path)),
          []
        )
      )
    );
  });

  test("reports with the error severity", async () => {
    const results = only(await linter.run(withVersion(failExample, version)));
    expect(results).toHaveLength(FAIL_DEFAULT.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the tag in the message when it has a name, and falls back to 'the tag' when it does not", async () => {
    const byPath = Object.fromEntries(only(await linter.run(withVersion(failExample, version))).map((r) => [r.path.join("."), r.message]));
    expect(byPath["info.tags.1"]).toBe("AAR076: Tag 'metering' must declare 'description'.");
    expect(byPath["components.tags.demandResponse.description"]).toBe("AAR076: The 'description' of tag 'demand-response' must not be empty.");
    expect(byPath[`${R}.tags.0.name`]).toBe("AAR076: The 'name' of the tag must not be empty.");
    expect(byPath[`${M}.tags.1`]).toBe("AAR076: Tag 'telemetry' must be a Tag object with 'name' and 'description'.");
    expect(byPath["operations.reportReading.tags.1"]).toBe("AAR076: The tag must be a Tag object with 'name' and 'description'.");
    expect(byPath["info.tags.3"]).toBe("AAR076: The tag reference '#/components/tags/missing' must resolve to a Tag object with 'name' and 'description'.");
  });

  test("reports a components.tags entry once, however many info, message and operation tags reference it, and skips external tags", async () => {
    const results = only(await linter.run(withVersion(failExample, version)));
    expect(results.filter((r) => r.message.includes("'demand-response'")).map((r) => r.path.join("."))).toEqual(["components.tags.demandResponse.description"]);
    expect(results.filter((r) => r.path.join(".").startsWith("operations.receiveAlerts"))).toEqual([]);
    expect(results.filter((r) => r.path.join(".").includes("productionAlias"))).toEqual([]);
  });

  test("operations pointing to channels, messages and replies through $ref do not report their tags twice", async () => {
    const results = only(await linter.run(withVersion(failExample, version)));
    const paths = results.map((r) => `${r.path.join(".")}|${r.message}`);
    expect(new Set(paths).size).toBe(paths.length);
    expect(results.filter((r) => r.path.join(".").startsWith("operations.reportReading.reply"))).toEqual([]);
  });

  test("follows chained references to tags, tag lists, channels, messages, traits and replies, reporting each shared tag once", async () => {
    expect(await run(failSharedRef)).toEqual(SHARED_DEFAULT);
  });

  describe("tag locations", () => {
    test.each(LOCATIONS)("checks %s", async (_, build, path) => {
      expect(await run(build())).toEqual(ORDERS_FINDING(path));
    });

    test.each(IGNORED)("ignores %s", async (_, build) => {
      expect(await run(build())).toEqual([]);
    });

    test("skips null, scalar, external, dangling and sibling nodes around tags, and every 2.x-only location", async () => {
      expect(await run(okStructuralEdges)).toEqual([]);
    });

    test("still validates the rest of the document when info is missing or not an object", async () => {
      const expected = FAIL_DEFAULT.filter(([path]) => !path.startsWith("info."));
      const { info, ...withoutInfo } = failExample;
      expect(info.tags).toHaveLength(4);
      expect(await run(withoutInfo)).toEqual(expected);
      expect(await run({ ...failExample, info: "notAnObject" })).toEqual(expected);
      expect(await run({ ...failExample, info: { $ref: "#" } })).toEqual(expected);
    });
  });

  describe("tag items", () => {
    const AT = [
      ["info.tags", (item) => doc({ info: { ...INFO, tags: [item] } }), "info.tags.0"],
      ["operation tags", (item) => doc({ operations: { sendOrder: { action: "send", tags: [item] } } }), "operations.sendOrder.tags.0"],
      ["a components.tags entry", (item) => doc({}, { tags: { orders: item } }), "components.tags.orders"],
    ];
    const CASES = AT.flatMap(([where, build, path]) => TAG_ITEM_CASES.map(([label, item, expected]) => [label, where, build, path, item, expected]));

    test.each(CASES)("%s in %s", async (_, __, build, path, item, expected) => {
      expect(await run(build(item))).toEqual(sorted(expected.map((entry) => tagFinding(path, entry))));
    });

    test.each(TAG_LIST_CASES)("a tags field set to %s", async (_, list, expected) => {
      const extra = list === undefined ? {} : { tags: list };
      expect(await run(doc({ channels: { orders: { address: "orders", ...extra } } }))).toEqual(sorted(expected.map((entry) => tagFinding("channels.orders.tags", entry))));
    });
  });

  describe("field values", () => {
    test.each(INFO_VALUE_CASES)("description set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [["components.tags.orders.description", MSG.empty("description", "orders")]];
      expect(await run(doc({}, { tags: { orders: { name: "orders", description: value } } }))).toEqual(expected);
    });

    test.each(INFO_VALUE_CASES)("name set to %s", async (_, value, populated) => {
      const expected = populated ? [] : [["info.tags.0.name", MSG.empty("name")]];
      expect(await run(doc({ info: { ...INFO, tags: [{ name: value, description: "Order events." }] } }))).toEqual(expected);
    });

    test.each(INFO_VALUE_CASES)("never inspects externalDocs and extensions set to %s", async (_, value) => {
      const tags = [{ name: "orders", description: "Order events.", externalDocs: value, "x-owner": value }];
      expect(await run(doc({ operations: { sendOrder: { action: "send", tags } } }))).toEqual([]);
    });
  });

  describe("trait merging and tag names", () => {
    test("checks tags where they are written: the message overriding its traits does not complete them, nor the other way round", async () => {
      const message = { name: "orderPlaced", tags: [complete], traits: [{ tags: [T] }] };
      expect(await run(doc({ channels: { orders: { messages: { orderPlaced: message } } } }))).toEqual(ORDERS_FINDING("channels.orders.messages.orderPlaced.traits.0.tags.0"));
      const reversed = { name: "orderPlaced", tags: [T], traits: [{ tags: [complete] }] };
      expect(await run(doc({ channels: { orders: { messages: { orderPlaced: reversed } } } }))).toEqual(ORDERS_FINDING("channels.orders.messages.orderPlaced.tags.0"));
    });

    test("a message trait shared by many messages is reported once, at the trait", async () => {
      const messages = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`order${i}`, { traits: [{ $ref: "#/components/messageTraits/headers" }] }]));
      expect(await run(doc({ channels: { orders: { messages } } }, { messageTraits: { headers: { tags: [T] } } }))).toEqual(ORDERS_FINDING("components.messageTraits.headers.tags.0"));
    });

    test("a tag is never completed by a documented tag with the same name elsewhere", async () => {
      const built = doc({ info: { ...INFO, tags: [complete] }, operations: { sendOrder: { action: "send", tags: [T] } } }, { tags: { orders: complete } });
      expect(await run(built)).toEqual(ORDERS_FINDING("operations.sendOrder.tags.0"));
    });

    test("a reference to a documented components.tags entry is accepted wherever it is used", async () => {
      const shared = { $ref: "#/components/tags/orders" };
      const built = doc(
        { info: { ...INFO, tags: [shared] }, servers: { kafka: server([shared]) }, channels: { orders: { tags: [shared], messages: { orderPlaced: { tags: [shared] } } } }, operations: { sendOrder: { action: "send", tags: [shared] } } },
        { tags: { orders: complete } }
      );
      expect(await run(built)).toEqual([]);
    });
  });

  describe("functionOptions", () => {
    const NOT_OBJECTS = [
      ["components.tags.name", MSG.named("orders")],
      ["components.tags.nothing", MSG.invalid()],
      ["components.tags.dangling", MSG.reference("#/components/tags/missing")],
    ];

    test("requires name and description", async () => {
      expect(await run(doc({ info: { ...INFO, tags: TAG_PROBE } }))).toEqual(sorted(tagProbeFindings("info.tags")));
    });

    test.each(TAG_OPTION_CASES)("an injected fields-to-apply %s changes nothing", async (_, value) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      expect(await run(doc({ info: { ...INFO, tags: TAG_PROBE } }), custom)).toEqual(sorted(tagProbeFindings("info.tags")));
    });

    test.each(TAG_OPTION_CASES)("an injected fields-to-apply %s changes nothing in the messages of tags that are not objects", async (_, value) => {
      const custom = await linterForRule(RULE, { functionOptions: { "fields-to-apply": value } });
      const built = doc({}, { tags: { name: "orders", nothing: null, dangling: { $ref: "#/components/tags/missing" } } });
      expect(await run(built, custom)).toEqual(sorted(NOT_OBJECTS));
    });

    test("an injected fields-to-apply requiring externalDocs and an extension changes nothing on the realistic, shared and structural documents", async () => {
      const custom = await linterForRule(RULE, { functionOptions: FULL });
      expect(await run(okExample, custom)).toEqual([]);
      expect(await run(failExample, custom)).toEqual(FAIL_DEFAULT);
      expect(await run(failSharedRef, custom)).toEqual(SHARED_DEFAULT);
      expect(await run(okStructuralEdges, custom)).toEqual([]);
    });

    test.each(UNRELATED_OPTIONS)("ignores options unrelated to the rule: %s", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(await run(failExample, custom)).toEqual(FAIL_DEFAULT);
    });
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
  });

  test("handles a very large document with thousands of tags and reports exactly the generated violations", async () => {
    const { document, tags, invalid } = failLargeGenerated;
    expect(tags.length + invalid.length).toBeGreaterThan(3000);
    expect(await run(document)).toEqual(sorted(tagFindings(tags, invalid)));
  });
});
