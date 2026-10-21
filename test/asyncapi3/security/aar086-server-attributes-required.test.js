const { linterForRule } = require("../../helpers/utils");
const {
  FIELDS_V3: FIELDS,
  FIELDS_V2,
  NAME,
  AT,
  messagesFor,
  findingsFor,
  shapesFor,
  serverComponentsFor,
  SERVER_VALUE_CASES,
  serverObjectCasesFor,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar086-server-attributes-required");
const okExample = require("./AAR086/ok-example");
const failExample = require("./AAR086/fail-example");
const failSharedRef = require("./AAR086/fail-shared-ref");
const okStructuralEdges = require("./AAR086/ok-structural-edges");
const failLargeGenerated = require("./AAR086/fail-large-generated");

const RULE = "asa:AAR086";
const OMIT = Symbol("omit");
const MSG = messagesFor(FIELDS);
const findings = findingsFor(FIELDS);
const v2Findings = findingsFor(FIELDS_V2);
const { complete, minimal } = shapesFor(FIELDS);
const COMPONENTS = serverComponentsFor(FIELDS);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const allMissing = (path, name, fields = FIELDS) => fields.map((field) => [path, "missing", name, field]);

const FAIL = findings([
  ["servers.noVersion", "missing", "noVersion", "protocolVersion"],
  ["servers.noProtocol", "missing", "noProtocol", "protocol"],
  ["servers.noHost", "missing", "noHost", "host"],
  ["servers.urlInsteadOfHost", "missing", "urlInsteadOfHost", "host"],
  ...allMissing("servers.pathnameOnly", "pathnameOnly"),
  ...allMissing("servers.emptyServer", "emptyServer"),
  ["servers.emptyHost.host", "empty", "emptyHost", "host"],
  ["servers.blankProtocol.protocol", "empty", "blankProtocol", "protocol"],
  ["servers.nullVersion.protocolVersion", "empty", "nullVersion", "protocolVersion"],
  ["servers.zeroWidthHost.host", "empty", "zeroWidthHost", "host"],
  ["servers.newlineVersion.protocolVersion", "empty", "newlineVersion", "protocolVersion"],
  ["servers.emptyListProtocol.protocol", "empty", "emptyListProtocol", "protocol"],
  ["servers.emptyMapVersion.protocolVersion", "empty", "emptyMapVersion", "protocolVersion"],
  ...allMissing("servers.lookAlikes", "lookAlikes"),
  ...allMissing("servers.upperCase", "upperCase"),
  ...allMissing("servers.extensionsOnly", "extensionsOnly"),
  ["servers.versionInBindings", "missing", "versionInBindings", "protocolVersion"],
  ["servers.versionAsVariable", "missing", "versionAsVariable", "protocolVersion"],
  ["servers.nullServer", "unusable", "nullServer"],
  ["servers.stringServer", "unusable", "stringServer"],
  ["servers.listServer", "unusable", "listServer"],
  ["servers.x-oem", "missing", "x-oem", "protocolVersion"],
  ["servers.chargersMqtt", "missing", "chargersMqtt", "protocolVersion"],
  ["servers.tripsAmqp", "missing", "tripsAmqp", "protocol"],
  ["components.servers.oemHub", "missing", "oemHub", "protocolVersion"],
  ["components.servers.legacyMq.host", "empty", "legacyMq", "host"],
  ["components.servers.legacyMq.protocolVersion", "empty", "legacyMq", "protocolVersion"],
  ["components.servers.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["servers.partner", "missing", "partner", "protocolVersion"],
  ["components.servers.carrierHub", "missing", "carrierHub", "protocolVersion"],
  ["components.servers.hop2", "missing", "hop2", "protocol"],
  ["components.servers.carrier/eu~dr.host", "empty", "carrier/eu~dr", "host"],
  ["components.servers.north america", "missing", "north america", "host"],
  ["components.servers.recepci\u00f3n.protocolVersion", "empty", "recepci\u00f3n", "protocolVersion"],
  ["servers.dangling", "unusable", "dangling"],
  ["components.servers.loopA", "unusable", "loopA"],
  ["components.servers.loopB", "unusable", "loopB"],
  ["servers.selfLoop", "unusable", "selfLoop"],
  ["components.servers.sparseShared", "missing", "sparseShared", "protocol"],
  ["components.servers.sparseShared", "missing", "sparseShared", "protocolVersion"],
  ...allMissing("channels.shipments", "shipments"),
  ["servers.toRoot", "unusable", "toRoot"],
  ["servers.nonStringRef", "unusable", "nonStringRef"],
  ["servers.emptyRef", "unusable", "emptyRef"],
  ["servers.badPointer", "unusable", "badPointer"],
  ["servers.badEncoding", "unusable", "badEncoding"],
  ["servers.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.servers.nullShared", "unusable", "nullShared"],
  ["x-server-list.0", "missing", "0", "protocolVersion"],
  ["servers.fieldRefs.protocol", "empty", "fieldRefs", "protocol"],
  ["servers.fieldRefs.protocolVersion", "empty", "fieldRefs", "protocolVersion"],
]);

const CHANNELS = {
  orderPlaced: {
    address: "retail.cdc.orders.placed.v1",
    servers: [{ $ref: `#/servers/${NAME}` }],
    messages: { orderPlaced: { name: "orderPlaced", payload: { type: "object", properties: { host: { type: "string" } } } } },
  },
};
const OPERATIONS = { receiveOrderPlaced: { action: "receive", channel: { $ref: "#/channels/orderPlaced" } } };
const base = (servers, extra = {}) => ({
  asyncapi: "3.0.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  ...(servers === OMIT ? {} : { servers }),
  channels: CHANNELS,
  operations: OPERATIONS,
  components: COMPONENTS,
  ...extra,
});
const withServer = (server) => base({ [NAME]: server });

describe("AAR086 (AsyncAPI 3.x): every server must populate host, protocol and protocolVersion", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose servers populate host, protocol and protocolVersion, ignoring pathname, variables, bindings, replies, multi-format payloads, traits, unreferenced x-servers and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every missing, empty or unusable server field of servers and components.servers with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("requires host whenever the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "10.0.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("requires url instead of host when the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2.6.0", "v3.0.0", "latest", "", null, false, {}]) {
      const doc = withVersion(base({ [NAME]: minimal, urlBased: { url: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0" }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(v2Findings([[AT, "missing", NAME, "url"], ...allMissing("servers.empty", "empty", FIELDS_V2)]));
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the server and the field in every message", async () => {
    expect(findingsOf(await linter.run(withServer({ host: "", protocol: "kafka" })))).toEqual([
      [AT, "AAR086: Server 'ordersKafka' must declare 'protocolVersion'."],
      [`${AT}.host`, "AAR086: The 'host' of server 'ordersKafka' must not be empty."],
    ]);
    expect(findingsOf(await linter.run(withServer(null)))).toEqual([[AT, "AAR086: Server 'ordersKafka' must be an object declaring 'host', 'protocol' and 'protocolVersion'."]]);
  });

  describe("field values", () => {
    const FIELD_CASES = SERVER_VALUE_CASES.flatMap(([label, value, populated]) => FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`${AT}.${field}`, MSG.empty(NAME, field)]];
      expect(findingsOf(await linter.run(withServer({ ...minimal, [field]: value })))).toEqual(expected);
    });

    test.each(SERVER_VALUE_CASES)("host, protocol and protocolVersion all set to %s", async (_, value, populated) => {
      const expected = populated ? [] : findings(FIELDS.map((field) => [`${AT}.${field}`, "empty", NAME, field]));
      expect(findingsOf(await linter.run(withServer({ host: value, protocol: value, protocolVersion: value })))).toEqual(expected);
    });

    test.each(SERVER_VALUE_CASES)("url, pathname, title, summary, variables, bindings and extensions set to %s are never required", async (_, value) => {
      const server = { ...minimal, url: value, pathname: value, title: value, summary: value, variables: value, bindings: value, security: value, "x-protocolVersion": value };
      expect(findingsOf(await linter.run(withServer(server)))).toEqual([]);
    });
  });

  describe("server object", () => {
    test.each(serverObjectCasesFor(FIELDS))("%s", async (_, server, expected) => {
      expect(findingsOf(await linter.run(withServer(server)))).toEqual(findings(expected));
    });

    test("a pathname never stands in for the host", async () => {
      expect(findingsOf(await linter.run(withServer({ pathname: "/orders", protocol: "kafka", protocolVersion: "3.3.0" })))).toEqual(findings([[AT, "missing", NAME, "host"]]));
      expect(findingsOf(await linter.run(withServer({ host: "", pathname: "/orders", protocol: "kafka", protocolVersion: "3.3.0" })))).toEqual(findings([[`${AT}.host`, "empty", NAME, "host"]]));
    });

    test("checks the same objects under components.servers, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, servers: { shared: { host: "kafka.quality.es", protocolVersion: "" }, gone: null, fine: complete } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.servers.shared", "missing", "shared", "protocol"],
          ["components.servers.shared.protocolVersion", "empty", "shared", "protocolVersion"],
          ["components.servers.gone", "unusable", "gone"],
        ])
      );
    });
  });

  describe("servers and components maps", () => {
    test("a document without servers or components.servers reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "3.0.0", info: { title: "Quality Order Events", version: "4.2.0" }, channels: CHANNELS, operations: OPERATIONS }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["kafka.quality.es"], [42], [true]])("skips a servers, components or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows a servers map, a components object and a components.servers map given as local references", async () => {
      const viaServers = base({ $ref: "#/x-server-map" }, { "x-server-map": { partner: { host: "partner.example.org", protocol: "kafka" }, local: complete } });
      expect(findingsOf(await linter.run(viaServers))).toEqual(findings([["x-server-map.partner", "missing", "partner", "protocolVersion"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { host: "dr.example.org", protocolVersion: "3.3.0" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.servers.dr", "missing", "dr", "protocol"]]));
      const serversMapRef = base(OMIT, { components: { servers: { $ref: "#/x-shared" } }, "x-shared": { lab: { host: "", protocol: "kafka", protocolVersion: "3.3.0" } } });
      expect(findingsOf(await linter.run(serversMapRef))).toEqual(findings([["x-shared.lab.host", "empty", "lab", "host"]]));
    });

    test("checks a servers map shared by servers and components.servers once", async () => {
      const doc = base({ $ref: "#/components/servers" }, { components: { servers: { lab: { host: "lab.example.org", protocol: "kafka" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.servers.lab", "missing", "lab", "protocolVersion"]]));
    });

    test("ignores a servers map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./servers.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { servers: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/servers" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { servers: { $ref: "#" } } })))).toEqual([]);
    });

    test("channel server lists, inline channel servers and reply addresses are not server definitions", async () => {
      const doc = base(
        { [NAME]: complete },
        {
          channels: {
            orderPlaced: {
              address: null,
              servers: [{ $ref: `#/servers/${NAME}` }, { host: "", protocol: "" }, { $ref: "#/x-servers/rogue" }],
              messages: { orderPlaced: { payload: { type: "object" } } },
            },
          },
          operations: { replyOrder: { action: "send", channel: { $ref: "#/channels/orderPlaced" }, reply: { address: { location: "$message.header#/replyTo" }, channel: { $ref: "#/channels/orderPlaced" } } } },
          "x-servers": { rogue: {} },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });
  });

  describe("server names", () => {
    test("checks servers whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { host: "edge.example.org", protocol: "kafka" } }, { components: { servers: { "x-mirror": { protocol: "kafka", protocolVersion: "3.3.0" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["servers.x-edge", "missing", "x-edge", "protocolVersion"],
          ["components.servers.x-mirror", "missing", "x-mirror", "host"],
        ])
      );
    });

    test("reports servers whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({ "eu~1west": { host: "", protocol: "kafka", protocolVersion: "3.3.0" }, "kafka~0dr": {}, "a/b~c": { host: "ab.example.org", protocol: "kafka" } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["servers.eu~1west.host", "empty", "eu~1west", "host"],
          ...allMissing("servers.kafka~0dr", "kafka~0dr"),
          ["servers.a/b~c", "missing", "a/b~c", "protocolVersion"],
        ])
      );
    });

    test("checks servers named like Object members", async () => {
      const doc = base({ constructor: { host: "a.example.org", protocol: "kafka" }, toString: complete, valueOf: { host: "c.example.org", protocolVersion: "3.3.0" } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["servers.constructor", "missing", "constructor", "protocolVersion"],
          ["servers.valueOf", "missing", "valueOf", "protocol"],
        ])
      );
    });

    test("escapes control and invisible characters of server names so every message stays on one line", async () => {
      const doc = base({ "fleet\nkafka": { host: "kafka.quality.es" }, "tab\tbed": null, "zero\u200bwidth": { host: "x", protocol: "kafka", protocolVersion: "" } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["servers.fleet\nkafka", "missing", "fleet\nkafka", "protocol"],
          ["servers.fleet\nkafka", "missing", "fleet\nkafka", "protocolVersion"],
          ["servers.tab\tbed", "unusable", "tab\tbed"],
          ["servers.zero\u200bwidth.protocolVersion", "empty", "zero\u200bwidth", "protocolVersion"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR086: Server 'fleet\\nkafka' must declare 'protocol'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: host, protocol and protocolVersion stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withServer({ ...minimal, description: "", title: "", pathname: "" })))).toEqual([]);
    });
  });

  test("validates a shared server once at its definition, follows chained, escaped, percent-encoded and field references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects servers and components.servers: x-servers maps, channel server lists, variables, bindings, payloads, headers, examples, traits, replies and schemas are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ servers: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", servers: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
