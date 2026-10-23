const { linterForRule } = require("../../helpers/utils");
const {
  FIELDS_V2: FIELDS,
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
const v3Findings = findingsFor(["host", "protocol", "protocolVersion"]);
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
  ["servers.noUrl", "missing", "noUrl", "url"],
  ["servers.hostInsteadOfUrl", "missing", "hostInsteadOfUrl", "url"],
  ["servers.onlyUrl", "missing", "onlyUrl", "protocol"],
  ["servers.onlyUrl", "missing", "onlyUrl", "protocolVersion"],
  ...allMissing("servers.emptyServer", "emptyServer"),
  ["servers.emptyUrl.url", "empty", "emptyUrl", "url"],
  ["servers.blankProtocol.protocol", "empty", "blankProtocol", "protocol"],
  ["servers.nullVersion.protocolVersion", "empty", "nullVersion", "protocolVersion"],
  ["servers.zeroWidthVersion.protocolVersion", "empty", "zeroWidthVersion", "protocolVersion"],
  ["servers.tabbedUrl.url", "empty", "tabbedUrl", "url"],
  ["servers.emptyListVersion.protocolVersion", "empty", "emptyListVersion", "protocolVersion"],
  ["servers.emptyMapProtocol.protocol", "empty", "emptyMapProtocol", "protocol"],
  ...allMissing("servers.lookAlikes", "lookAlikes"),
  ...allMissing("servers.upperCase", "upperCase"),
  ...allMissing("servers.extensionsOnly", "extensionsOnly"),
  ["servers.versionInBindings", "missing", "versionInBindings", "protocolVersion"],
  ["servers.versionAsVariable", "missing", "versionAsVariable", "protocolVersion"],
  ["servers.nullServer", "unusable", "nullServer"],
  ["servers.stringServer", "unusable", "stringServer"],
  ["servers.listServer", "unusable", "listServer"],
  ["servers.x-partner", "missing", "x-partner", "protocolVersion"],
  ["servers.acquirerWebhooks", "missing", "acquirerWebhooks", "protocolVersion"],
  ["servers.issuerAmqp", "missing", "issuerAmqp", "protocol"],
  ["components.servers.settlementHub", "missing", "settlementHub", "protocolVersion"],
  ["components.servers.chargebackMq.url", "empty", "chargebackMq", "url"],
  ["components.servers.chargebackMq.protocolVersion", "empty", "chargebackMq", "protocolVersion"],
  ["components.servers.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["servers.partner", "missing", "partner", "protocolVersion"],
  ["components.servers.sellerHub", "missing", "sellerHub", "protocolVersion"],
  ["components.servers.hop2", "missing", "hop2", "protocol"],
  ["components.servers.seller/eu~dr.url", "empty", "seller/eu~dr", "url"],
  ["components.servers.latin america", "missing", "latin america", "url"],
  ["components.servers.espa\u00f1a.protocolVersion", "empty", "espa\u00f1a", "protocolVersion"],
  ["servers.dangling", "unusable", "dangling"],
  ["components.servers.loopA", "unusable", "loopA"],
  ["components.servers.loopB", "unusable", "loopB"],
  ["servers.selfLoop", "unusable", "selfLoop"],
  ["components.servers.sparseShared", "missing", "sparseShared", "protocol"],
  ["components.servers.sparseShared", "missing", "sparseShared", "protocolVersion"],
  ...allMissing("info", "info"),
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
  "retail.cdc.orders.placed.v1": {
    servers: [NAME],
    subscribe: { operationId: "receiveOrderPlaced", message: { name: "orderPlaced", payload: { type: "object", properties: { url: { type: "string" } } } } },
  },
};
const base = (servers, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  ...(servers === OMIT ? {} : { servers }),
  channels: CHANNELS,
  components: COMPONENTS,
  ...extra,
});
const withServer = (server) => base({ [NAME]: server });

describe("AAR086 (AsyncAPI 2.x): every server must populate url, protocol and protocolVersion", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose servers populate url, protocol and protocolVersion, ignoring variables, bindings, payloads, headers, traits, unreferenced x-servers and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every missing, empty or unusable server field of servers and components.servers with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("requires url whenever the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", "v3.0.0", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("requires host instead of url when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(base({ [NAME]: minimal, hosted: { host: "kafka.quality.es:9092", protocol: "kafka", protocolVersion: "3.3.0" }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(v3Findings([[AT, "missing", NAME, "host"], ...allMissing("servers.empty", "empty", ["host", "protocol", "protocolVersion"])]));
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the server and the field in every message", async () => {
    expect(findingsOf(await linter.run(withServer({ url: "", protocol: "kafka" })))).toEqual([
      [AT, "AAR086: Server 'ordersKafka' must declare 'protocolVersion'."],
      [`${AT}.url`, "AAR086: The 'url' of server 'ordersKafka' must not be empty."],
    ]);
    expect(findingsOf(await linter.run(withServer(null)))).toEqual([[AT, "AAR086: Server 'ordersKafka' must be an object declaring 'url', 'protocol' and 'protocolVersion'."]]);
  });

  describe("field values", () => {
    const FIELD_CASES = SERVER_VALUE_CASES.flatMap(([label, value, populated]) => FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`${AT}.${field}`, MSG.empty(NAME, field)]];
      expect(findingsOf(await linter.run(withServer({ ...minimal, [field]: value })))).toEqual(expected);
    });

    test.each(SERVER_VALUE_CASES)("url, protocol and protocolVersion all set to %s", async (_, value, populated) => {
      const expected = populated ? [] : findings(FIELDS.map((field) => [`${AT}.${field}`, "empty", NAME, field]));
      expect(findingsOf(await linter.run(withServer({ url: value, protocol: value, protocolVersion: value })))).toEqual(expected);
    });

    test.each(SERVER_VALUE_CASES)("host, description, variables, bindings and extensions set to %s are never required", async (_, value) => {
      const server = { ...minimal, host: value, description: value, variables: value, bindings: value, security: value, tags: value, "x-protocolVersion": value };
      expect(findingsOf(await linter.run(withServer(server)))).toEqual([]);
    });
  });

  describe("server object", () => {
    test.each(serverObjectCasesFor(FIELDS))("%s", async (_, server, expected) => {
      expect(findingsOf(await linter.run(withServer(server)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.servers, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, servers: { shared: { url: "kafka.quality.es", protocolVersion: "" }, gone: null, fine: complete } } });
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
      expect(findingsOf(await linter.run({ asyncapi: "2.6.0", info: { title: "Quality Order Events", version: "4.2.0" }, channels: CHANNELS }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["kafka.quality.es"], [42], [true]])("skips a servers, components or components.servers value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { servers: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows a servers map, a components object and a components.servers map given as local references", async () => {
      const viaServers = base({ $ref: "#/x-server-map" }, { "x-server-map": { partner: { url: "partner.example.org", protocol: "kafka" }, local: complete } });
      expect(findingsOf(await linter.run(viaServers))).toEqual(findings([["x-server-map.partner", "missing", "partner", "protocolVersion"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { servers: { dr: { url: "dr.example.org", protocolVersion: "3.3.0" } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.servers.dr", "missing", "dr", "protocol"]]));
      const serversMapRef = base(OMIT, { components: { servers: { $ref: "#/x-shared" } }, "x-shared": { lab: { url: "", protocol: "kafka", protocolVersion: "3.3.0" } } });
      expect(findingsOf(await linter.run(serversMapRef))).toEqual(findings([["x-shared.lab.url", "empty", "lab", "url"]]));
    });

    test("checks a servers map shared by servers and components.servers once", async () => {
      const doc = base({ $ref: "#/components/servers" }, { components: { servers: { lab: { url: "lab.example.org", protocol: "kafka" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.servers.lab", "missing", "lab", "protocolVersion"]]));
    });

    test("ignores a servers map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./servers.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { servers: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/servers" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { servers: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("server names", () => {
    test("checks servers whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { url: "edge.example.org", protocol: "kafka" } }, { components: { servers: { "x-mirror": { protocol: "kafka", protocolVersion: "3.3.0" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["servers.x-edge", "missing", "x-edge", "protocolVersion"],
          ["components.servers.x-mirror", "missing", "x-mirror", "url"],
        ])
      );
    });

    test("reports servers whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({ "eu~1west": { url: "", protocol: "kafka", protocolVersion: "3.3.0" }, "kafka~0dr": {}, "a/b~c": { url: "ab.example.org", protocol: "kafka" } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["servers.eu~1west.url", "empty", "eu~1west", "url"],
          ...allMissing("servers.kafka~0dr", "kafka~0dr"),
          ["servers.a/b~c", "missing", "a/b~c", "protocolVersion"],
        ])
      );
    });

    test("checks servers named like Object members", async () => {
      const doc = base({ constructor: { url: "a.example.org", protocol: "kafka" }, toString: complete, valueOf: { url: "c.example.org", protocolVersion: "3.3.0" } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["servers.constructor", "missing", "constructor", "protocolVersion"],
          ["servers.valueOf", "missing", "valueOf", "protocol"],
        ])
      );
    });

    test("escapes control and invisible characters of server names so every message stays on one line", async () => {
      const doc = base({ "orders\nkafka": { url: "kafka.quality.es" }, "tab\tbed": null, "zero\u200bwidth": { url: "x", protocol: "kafka", protocolVersion: "" } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["servers.orders\nkafka", "missing", "orders\nkafka", "protocol"],
          ["servers.orders\nkafka", "missing", "orders\nkafka", "protocolVersion"],
          ["servers.tab\tbed", "unusable", "tab\tbed"],
          ["servers.zero\u200bwidth.protocolVersion", "empty", "zero\u200bwidth", "protocolVersion"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR086: Server 'orders\\nkafka' must declare 'protocol'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: url, protocol and protocolVersion stay the only mandatory fields", async (_, functionOptions) => {
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

  test("only inspects servers and components.servers: x-servers maps, channel server lists, variables, bindings, payloads, headers, examples, traits and schemas are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ servers: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", servers: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
