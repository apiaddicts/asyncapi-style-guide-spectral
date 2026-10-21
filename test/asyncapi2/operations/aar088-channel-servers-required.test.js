const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  atOf,
  MSG,
  findings,
  serverRef,
  rootServersFor,
  shapesFor,
  channelComponentsFor,
  serversValueCasesFor,
  channelObjectCasesFor,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar088-channel-servers-required");
const okExample = require("./AAR088/ok-example");
const failExample = require("./AAR088/fail-example");
const failSharedRef = require("./AAR088/fail-shared-ref");
const okStructuralEdges = require("./AAR088/ok-structural-edges");
const failLargeGenerated = require("./AAR088/fail-large-generated");

const RULE = "asa:AAR088";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const AT = atOf(2);
const { complete, minimal, bare } = shapesFor(2);
const COMPONENTS = channelComponentsFor(2);
const SERVERS = rootServersFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = findings([
  ["channels.payments.cdc.noServers.v1", "missing", "payments.cdc.noServers.v1"],
  ["channels.payments.cdc.emptyServers.v1.servers", "noServer", "payments.cdc.emptyServers.v1"],
  ["channels.payments.cdc.nullServers.v1.servers", "noServer", "payments.cdc.nullServers.v1"],
  ["channels.payments.cdc.unknownServer.v1.servers", "noServer", "payments.cdc.unknownServer.v1"],
  ["channels.payments.cdc.caseServer.v1.servers", "noServer", "payments.cdc.caseServer.v1"],
  ["channels.payments.cdc.componentServer.v1.servers", "noServer", "payments.cdc.componentServer.v1"],
  ["channels.payments.cdc.stringServers.v1.servers", "noServer", "payments.cdc.stringServers.v1"],
  ["channels.payments.cdc.referenceServers.v1.servers", "noServer", "payments.cdc.referenceServers.v1"],
  ["channels.payments.cdc.nullEntries.v1.servers", "noServer", "payments.cdc.nullEntries.v1"],
  ["channels.payments.cdc.extensionServers.v1", "missing", "payments.cdc.extensionServers.v1"],
  ["channels.payments.cdc.operationServers.v1", "missing", "payments.cdc.operationServers.v1"],
  ["channels.payments.cdc.bindingServers.v1", "missing", "payments.cdc.bindingServers.v1"],
  ["channels.terminals/{terminalId}/refunds", "missing", "terminals/{terminalId}/refunds"],
  ["channels.payments.cdc.nullChannel.v1", "unusable", "payments.cdc.nullChannel.v1"],
  ["channels.payments.cdc.stringChannel.v1", "unusable", "payments.cdc.stringChannel.v1"],
  ["channels.payments.cdc.listChannel.v1", "unusable", "payments.cdc.listChannel.v1"],
  ["channels.x-payments.cdc.partner.v1", "missing", "x-payments.cdc.partner.v1"],
  ["components.channels.refundsShared", "missing", "refundsShared"],
  ["components.channels.archiveShared.servers", "noServer", "archiveShared"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.payments.partner.v1", "missing", "payments.partner.v1"],
  ["components.channels.sellerHub", "missing", "sellerHub"],
  ["components.channels.hop2.servers", "noServer", "hop2"],
  ["components.channels.seller/eu~dr.servers", "noServer", "seller/eu~dr"],
  ["components.channels.latin america", "missing", "latin america"],
  ["components.channels.espa\u00f1a.servers", "noServer", "espa\u00f1a"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.sparseShared", "missing", "sparseShared"],
  ["info", "missing", "info"],
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "missing", "0"],
  ["channels.listRefs.servers", "noServer", "listRefs"],
  ["channels.danglingNameRefs.servers", "noServer", "danglingNameRefs"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: SERVERS,
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });

describe("AAR088 (AsyncAPI 2.x): every channel must list at least one server of the root servers object", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels list root servers, through several servers, x- names, servers defined by reference, shared lists, channel references and external references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every channel of channels and components.channels without servers, without a root server or unusable, with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test.each(["2.0.0", "2.1.0"])("does not check AsyncAPI %s, whose channels cannot declare servers", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(failLargeGenerated.document, version)))).toEqual([]);
  });

  test("does not check any asyncapi value older than 2.2", async () => {
    for (const version of ["2.0", "2.1", 2.1, " 2.1.0", "2.0.0-rc2", "2.1.0-beta.1", "1.2.0", "1.0.0", "1", 1, 0, "0.9.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
    }
  });

  test("applies the 2.x server names whenever the asyncapi value is 2.2 or later below 3, has no minor version or cannot be read", async () => {
    for (const version of [2, "2", "2.2", 2.2, " 2.6.0 ", "2.7.0", "2.10.0", "latest", "v2.1.0", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("requires server references instead of names when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(base({ [NAME]: minimal, modern: { servers: [serverRef("production")] }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          [`${AT}.servers`, "noServer", NAME],
          ["channels.empty", "missing", "empty"],
        ])
      );
    }
  });

  test("reports with the error severity and one finding per channel", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the channel in every message", async () => {
    expect(findingsOf(await linter.run(withChannel(bare)))).toEqual([[AT, `AAR088: Channel '${NAME}' must declare 'servers'.`]]);
    expect(findingsOf(await linter.run(withChannel({ ...bare, servers: ["ghost"] })))).toEqual([
      [`${AT}.servers`, `AAR088: The 'servers' of channel '${NAME}' must list at least one server defined in the root 'servers' object.`],
    ]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, `AAR088: Channel '${NAME}' must be an object declaring 'servers'.`]]);
  });

  describe("servers values", () => {
    test.each(serversValueCasesFor(2))("servers set to %s", async (_, value, associated) => {
      const expected = associated ? [] : [[`${AT}.servers`, MSG.noServer(NAME)]];
      expect(findingsOf(await linter.run(withChannel({ ...bare, servers: value })))).toEqual(expected);
    });

    test.each(serversValueCasesFor(2))("servers of a components channel set to %s", async (_, value, associated) => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { ...bare, servers: value } } } });
      const expected = associated ? [] : [["components.channels.shared.servers", MSG.noServer("shared")]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a list of names", ["production"]],
      ["a number", 42],
    ])("description, address, messages, publish, subscribe, parameters, bindings and extensions set to %s never matter", async (_, value) => {
      const channel = { servers: ["production"], description: value, address: value, messages: value, publish: value, subscribe: value, parameters: value, bindings: value, "x-servers": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("root servers object", () => {
    const doc = (servers, channels) => {
      const built = base(channels, servers === OMIT ? {} : { servers });
      if (servers === OMIT) delete built.servers;
      return built;
    };
    const CHANNELS = { listed: { servers: ["production"] }, backupOnly: { servers: ["backup"] }, unlisted: {} };

    test.each([[OMIT], [null], [[]], [{}], ["production"], [42], [{ $ref: "#/components/missing" }], [{ $ref: "#/x-loop" }], [{ $ref: "#" }]])(
      "a root servers value of %p lists no server, so every channel with servers is reported",
      async (servers) => {
        expect(findingsOf(await linter.run(doc(servers, CHANNELS)))).toEqual(
          findings([
            ["channels.listed.servers", "noServer", "listed"],
            ["channels.backupOnly.servers", "noServer", "backupOnly"],
            ["channels.unlisted", "missing", "unlisted"],
          ])
        );
      }
    );

    test("a root servers map given as a local or chained reference provides the names of the map it points to", async () => {
      for (const servers of [{ $ref: "#/x-servers" }, { $ref: "#/x-servers-alias" }]) {
        const built = { ...doc(servers, { ...CHANNELS, both: { servers: ["staging", "backup"] } }), "x-servers": { backup: {} }, "x-servers-alias": { $ref: "#/x-servers" } };
        expect(findingsOf(await linter.run(built))).toEqual(
          findings([
            ["channels.listed.servers", "noServer", "listed"],
            ["channels.unlisted", "missing", "unlisted"],
          ])
        );
      }
    });

    test("a root servers map given as a reference with server siblings takes the names of its target only, as the siblings are ignored", async () => {
      const built = { ...doc({ $ref: "#/x-servers", production: { url: "kafka.quality.es:9093", protocol: "kafka-secure" } }, CHANNELS), "x-servers": { backup: {} } };
      expect(findingsOf(await linter.run(built))).toEqual(
        findings([
          ["channels.listed.servers", "noServer", "listed"],
          ["channels.unlisted", "missing", "unlisted"],
        ])
      );
    });

    test("a root servers map given as an external reference accepts any server name, but still requires a non-empty list of names", async () => {
      const channels = { ...CHANNELS, anyName: { servers: ["eu-central"] }, empty: { servers: [] }, numbers: { servers: [1, 2] }, references: { servers: [serverRef("production")] } };
      for (const servers of [{ $ref: "./shared/servers.yaml" }, { $ref: "https://specs.example.io/servers.yaml#/servers" }]) {
        expect(findingsOf(await linter.run(doc(servers, channels)))).toEqual(
          findings([
            ["channels.unlisted", "missing", "unlisted"],
            ["channels.empty.servers", "noServer", "empty"],
            ["channels.numbers.servers", "noServer", "numbers"],
            ["channels.references.servers", "noServer", "references"],
          ])
        );
      }
    });

    test("only the keys of the root servers map count, never their values or the servers of components", async () => {
      const servers = { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", "x-name": "staging" } };
      const channels = { byKey: { servers: ["production"] }, byExtension: { servers: ["staging"] }, byUrl: { servers: ["kafka.quality.es:9093"] }, byComponent: { servers: ["backup"] } };
      expect(findingsOf(await linter.run(doc(servers, channels)))).toEqual(
        findings([
          ["channels.byExtension.servers", "noServer", "byExtension"],
          ["channels.byUrl.servers", "noServer", "byUrl"],
          ["channels.byComponent.servers", "noServer", "byComponent"],
        ])
      );
    });

    test("root server names that look like Object members, are empty or start with x- are matched as written", async () => {
      const servers = { constructor: {}, "": {}, "x-edge": {}, toString: {} };
      const channels = { a: { servers: ["constructor"] }, b: { servers: [""] }, c: { servers: ["x-edge", "toString"] }, d: { servers: ["valueOf", "hasOwnProperty", "__proto__"] } };
      expect(findingsOf(await linter.run(doc(servers, channels)))).toEqual(findings([["channels.d.servers", "noServer", "d"]]));
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesFor(2))("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: bare, gone: null, fine: complete, ghost: { ...bare, servers: ["ghost"] } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared", "missing", "shared"],
          ["components.channels.gone", "unusable", "gone"],
          ["components.channels.ghost.servers", "noServer", "ghost"],
        ])
      );
    });
  });

  describe("channels and components maps", () => {
    test("a document without channels or components.channels reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "2.6.0", info: { title: "Quality Order Events", version: "4.2.0" } }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["retail.cdc.orders.placed.v1"], [42], [true]])("skips a channels, components or components.channels value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { channels: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows a channels map, a components object and a components.channels map given as local references", async () => {
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { description: "Partner." }, local: complete } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner", "missing", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { servers: [] } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.servers", "noServer", "dr"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { servers: ["lab"] } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.servers", "noServer", "lab"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { description: "Lab." } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab", "missing", "lab"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are addresses and not extensions in these maps", async () => {
      const doc = base({ "x-edge.orders": { description: "Edge." } }, { components: { channels: { "x-mirror": { servers: [] } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge.orders", "missing", "x-edge.orders"],
          ["components.channels.x-mirror.servers", "noServer", "x-mirror"],
        ])
      );
    });

    test("reports channels whose addresses contain slashes, braces, ~0 or ~1 at their own path", async () => {
      const doc = base({ "stores/{storeId}/orders": { servers: [] }, "orders~1eu": {}, "a/b~c": { servers: ["ghost"] } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.stores/{storeId}/orders.servers", "noServer", "stores/{storeId}/orders"],
          ["channels.orders~1eu", "missing", "orders~1eu"],
          ["channels.a/b~c.servers", "noServer", "a/b~c"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { description: "Unnamed." }, constructor: { servers: [] }, toString: complete, valueOf: { servers: ["valueOf"] } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", ""],
          ["channels.constructor.servers", "noServer", "constructor"],
          ["channels.valueOf.servers", "noServer", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { description: "Orders." }, "tab\tbed": null, "zero\u200bwidth": { servers: [] } });
      const results = findingsOf(await linter.run(doc));
      expect(results).toEqual(
        findings([
          ["channels.orders\nplaced", "missing", "orders\nplaced"],
          ["channels.tab\tbed", "unusable", "tab\tbed"],
          ["channels.zero\u200bwidth.servers", "noServer", "zero\u200bwidth"],
        ])
      );
      expect(results.map(([, message]) => message).filter((m) => /[\u0000-\u001f\u200b]/.test(m))).toEqual([]);
      expect(results.map(([, message]) => message)).toContain("AAR088: Channel 'orders\\nplaced' must declare 'servers'.");
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: every channel must still list a root server", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withVersion(failExample, "2.1.0")))).toEqual([]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded, list and name references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects channels and components.channels: operations, messages, traits, parameters, bindings, payloads, servers and x-channels maps are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ channels: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", channels: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
