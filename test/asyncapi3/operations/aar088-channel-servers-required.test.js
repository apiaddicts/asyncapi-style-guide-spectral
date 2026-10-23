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
const NAME = NAMES[3];
const AT = atOf(3);
const { complete, minimal, bare } = shapesFor(3);
const COMPONENTS = channelComponentsFor(3);
const SERVERS = rootServersFor(3);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = findings([
  ["channels.noServers", "missing", "noServers"],
  ["channels.emptyServers.servers", "noServer", "emptyServers"],
  ["channels.nullServers.servers", "noServer", "nullServers"],
  ["channels.danglingServer.servers", "noServer", "danglingServer"],
  ["channels.caseServer.servers", "noServer", "caseServer"],
  ["channels.componentServer.servers", "noServer", "componentServer"],
  ["channels.nameServers.servers", "noServer", "nameServers"],
  ["channels.singleReference.servers", "noServer", "singleReference"],
  ["channels.inlineServer.servers", "noServer", "inlineServer"],
  ["channels.deepPointer.servers", "noServer", "deepPointer"],
  ["channels.extensionServers", "missing", "extensionServers"],
  ["channels.bindingServers", "missing", "bindingServers"],
  ["channels.messageServers", "missing", "messageServers"],
  ["channels.tripReplies", "missing", "tripReplies"],
  ["channels.nullChannel", "unusable", "nullChannel"],
  ["channels.stringChannel", "unusable", "stringChannel"],
  ["channels.listChannel", "unusable", "listChannel"],
  ["channels.x-partner", "missing", "x-partner"],
  ["components.channels.sharedHub", "missing", "sharedHub"],
  ["components.channels.legacyQueue.servers", "noServer", "legacyQueue"],
  ["components.channels.nullShared", "unusable", "nullShared"],
]);

const SHARED = findings([
  ["channels.partner", "missing", "partner"],
  ["components.channels.carrierHub", "missing", "carrierHub"],
  ["components.channels.hop2.servers", "noServer", "hop2"],
  ["components.channels.carrier/eu~dr.servers", "noServer", "carrier/eu~dr"],
  ["components.channels.north america", "missing", "north america"],
  ["components.channels.recepci\u00f3n.servers", "noServer", "recepci\u00f3n"],
  ["channels.dangling", "unusable", "dangling"],
  ["components.channels.loopA", "unusable", "loopA"],
  ["components.channels.loopB", "unusable", "loopB"],
  ["channels.selfLoop", "unusable", "selfLoop"],
  ["components.channels.sparseShared", "missing", "sparseShared"],
  ["operations.receiveShipments", "missing", "receiveShipments"],
  ["channels.toRoot", "unusable", "toRoot"],
  ["channels.nonStringRef", "unusable", "nonStringRef"],
  ["channels.emptyRef", "unusable", "emptyRef"],
  ["channels.badPointer", "unusable", "badPointer"],
  ["channels.badEncoding", "unusable", "badEncoding"],
  ["channels.throughIntermediate", "unusable", "throughIntermediate"],
  ["components.channels.nullShared", "unusable", "nullShared"],
  ["x-channel-list.0", "missing", "0"],
  ["channels.listRefs.servers", "noServer", "listRefs"],
  ["channels.danglingEntryRefs.servers", "noServer", "danglingEntryRefs"],
  ["channels.componentEntryRefs.servers", "noServer", "componentEntryRefs"],
]);

const base = (channels, extra = {}) => ({
  asyncapi: "3.0.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: SERVERS,
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });

describe("AAR088 (AsyncAPI 3.x): every channel must reference at least one server of the root servers object", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose channels reference root servers, with operations, replies, multi-format payloads, shared lists, chained and external server references", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports every channel of channels and components.channels without servers, without a root server reference or unusable, with the exact message", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("requires server references whenever the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0", "10"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("requires server names instead when the asyncapi value is 2.2 or later below 3, or cannot be read", async () => {
    for (const version of ["2.6.0", "2.2.0", 2, "latest", "v3.0.0", "", null]) {
      const doc = withVersion(base({ [NAME]: minimal, legacy: { servers: ["production"] }, empty: {} }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          [`${AT}.servers`, "noServer", NAME],
          ["channels.empty", "missing", "empty"],
        ])
      );
    }
  });

  test("does not check the document when the asyncapi value is older than 2.2", async () => {
    for (const version of ["2.0.0", "2.1.0", "1.2.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual([]);
    }
  });

  test("reports with the error severity and one finding per channel", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => `${r.path.join(".")}|${r.message}`)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  test("names the channel in every message", async () => {
    expect(findingsOf(await linter.run(withChannel(bare)))).toEqual([[AT, "AAR088: Channel 'orderPlaced' must declare 'servers'."]]);
    expect(findingsOf(await linter.run(withChannel({ ...bare, servers: [serverRef("ghost")] })))).toEqual([
      [`${AT}.servers`, "AAR088: The 'servers' of channel 'orderPlaced' must list at least one server defined in the root 'servers' object."],
    ]);
    expect(findingsOf(await linter.run(withChannel(null)))).toEqual([[AT, "AAR088: Channel 'orderPlaced' must be an object declaring 'servers'."]]);
  });

  describe("servers values", () => {
    test.each(serversValueCasesFor(3))("servers set to %s", async (_, value, associated) => {
      const expected = associated ? [] : [[`${AT}.servers`, MSG.noServer(NAME)]];
      expect(findingsOf(await linter.run(withChannel({ ...bare, servers: value })))).toEqual(expected);
    });

    test.each(serversValueCasesFor(3))("servers of a components channel set to %s", async (_, value, associated) => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: { ...bare, servers: value } } } });
      const expected = associated ? [] : [["components.channels.shared.servers", MSG.noServer("shared")]];
      expect(findingsOf(await linter.run(doc))).toEqual(expected);
    });

    test.each([
      ["an empty string", ""],
      ["null", null],
      ["an empty object", {}],
      ["an empty list", []],
      ["a list of server references", [serverRef("production")]],
      ["a number", 42],
    ])("address, description, messages, title, summary, parameters, bindings, publish, subscribe and extensions set to %s never matter", async (_, value) => {
      const channel = { servers: [serverRef("production")], address: value, description: value, messages: value, title: value, summary: value, parameters: value, bindings: value, publish: value, subscribe: value, "x-servers": value };
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });
  });

  describe("root servers object", () => {
    const doc = (servers, channels, extra = {}) => {
      const built = base(channels, servers === OMIT ? extra : { servers, ...extra });
      if (servers === OMIT) delete built.servers;
      return built;
    };
    const CHANNELS = {
      listed: { servers: [serverRef("production")] },
      chained: { servers: [{ $ref: "#/components/x-server-refs/production" }] },
      external: { servers: [{ $ref: "./shared/servers.yaml#/production" }] },
      unlisted: {},
    };
    const WITHOUT_ROOT = findings([
      ["channels.listed.servers", "noServer", "listed"],
      ["channels.chained.servers", "noServer", "chained"],
      ["channels.unlisted", "missing", "unlisted"],
    ]);

    test.each([[OMIT], [null], [[]], [{}], ["production"], [42], [{ $ref: "#/components/missing" }], [{ $ref: "#" }]])(
      "a root servers value of %p holds no server, so only external server references still count",
      async (servers) => {
        expect(findingsOf(await linter.run(doc(servers, CHANNELS)))).toEqual(WITHOUT_ROOT);
      }
    );

    test("a root servers map given as a local or external reference cannot be pointed into, as the resolver cannot follow a pointer through it", async () => {
      for (const servers of [{ $ref: "#/x-servers" }, { $ref: "./shared/servers.yaml" }]) {
        const channels = { ...CHANNELS, direct: { servers: [{ $ref: "#/x-servers/production" }] } };
        expect(findingsOf(await linter.run(doc(servers, channels, { "x-servers": { production: {} } })))).toEqual(
          findings([
            ["channels.listed.servers", "noServer", "listed"],
            ["channels.chained.servers", "noServer", "chained"],
            ["channels.direct.servers", "noServer", "direct"],
            ["channels.unlisted", "missing", "unlisted"],
          ])
        );
      }
    });

    test("a root servers map given as a reference with server siblings cannot be pointed into either, siblings included", async () => {
      const servers = { $ref: "#/x-servers", production: { host: "kafka.quality.es:9093", protocol: "kafka-secure" } };
      expect(findingsOf(await linter.run(doc(servers, CHANNELS, { "x-servers": { production: {} } })))).toEqual(WITHOUT_ROOT);
    });

    test("only entries of the root servers map count, never the servers of components or other maps", async () => {
      const servers = { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", "x-alias": "staging" } };
      const channels = {
        byRoot: { servers: [serverRef("production")] },
        byExtension: { servers: [serverRef("staging")] },
        byComponent: { servers: [{ $ref: "#/components/servers/backup" }] },
        byOtherMap: { servers: [{ $ref: "#/x-environments/production" }] },
      };
      expect(findingsOf(await linter.run(doc(servers, channels, { "x-environments": { production: servers.production } })))).toEqual(
        findings([
          ["channels.byExtension.servers", "noServer", "byExtension"],
          ["channels.byComponent.servers", "noServer", "byComponent"],
          ["channels.byOtherMap.servers", "noServer", "byOtherMap"],
        ])
      );
    });

    test("root server names that look like Object members, are empty or start with x- are matched as written", async () => {
      const servers = { constructor: {}, "": {}, "x-edge": {}, toString: {} };
      const channels = {
        a: { servers: [serverRef("constructor")] },
        b: { servers: [{ $ref: "#/servers/" }] },
        c: { servers: [serverRef("x-edge"), serverRef("toString")] },
        d: { servers: [serverRef("valueOf"), serverRef("hasOwnProperty")] },
      };
      expect(findingsOf(await linter.run(doc(servers, channels)))).toEqual(findings([["channels.d.servers", "noServer", "d"]]));
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesFor(3))("%s", async (_, channel, expected) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual(findings(expected));
    });

    test("checks the same objects under components.channels, reporting them at their own path", async () => {
      const doc = base(OMIT, { components: { ...COMPONENTS, channels: { shared: bare, gone: null, fine: complete, ghost: { ...bare, servers: [serverRef("ghost")] } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["components.channels.shared", "missing", "shared"],
          ["components.channels.gone", "unusable", "gone"],
          ["components.channels.ghost.servers", "noServer", "ghost"],
        ])
      );
    });

    test("checks a channel once at its definition, whether operations, replies or other channels point to it", async () => {
      const doc = base(
        { orders: { $ref: "#/components/channels/orders" }, ordersAgain: { $ref: "#/components/channels/orders", servers: [serverRef("production")] } },
        {
          components: { ...COMPONENTS, channels: { orders: bare } },
          operations: {
            receiveOrders: { action: "receive", channel: { $ref: "#/channels/orders" } },
            sendOrders: { action: "send", channel: { $ref: "#/components/channels/orders" }, reply: { channel: { $ref: "#/channels/ordersAgain" } } },
          },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.orders", "missing", "orders"]]));
    });

    test("never inspects channels declared only inside operations, replies or components.operations", async () => {
      const doc = base(
        { orders: complete },
        {
          operations: { sendOrders: { action: "send", channel: { $ref: "#/channels/orders" }, reply: { address: { location: "$message.header#/replyTo" }, channel: { address: null, messages: {} } } } },
          components: { ...COMPONENTS, operations: { inlineChannel: { action: "send", channel: { address: "inline" } } }, replies: { inline: { channel: { servers: [] } } } },
        }
      );
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });
  });

  describe("channels and components maps", () => {
    test("a document without channels or components.channels reports nothing", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([]);
      expect(findingsOf(await linter.run({ asyncapi: "3.0.0", info: { title: "Quality Order Events", version: "4.2.0" }, operations: {} }))).toEqual([]);
    });

    test.each([[null], [[]], [{}], ["orders.placed"], [42], [true]])("skips a channels, components or components.channels value of %p", async (value) => {
      expect(findingsOf(await linter.run(base(value, { components: { channels: value } })))).toEqual([]);
      expect(findingsOf(await linter.run(base(value, { components: value })))).toEqual([]);
    });

    test("follows a channels map, a components object and a components.channels map given as local references", async () => {
      const viaChannels = base({ $ref: "#/x-channel-map" }, { "x-channel-map": { partner: { address: "partner" }, local: complete } });
      expect(findingsOf(await linter.run(viaChannels))).toEqual(findings([["x-channel-map.partner", "missing", "partner"]]));
      const viaComponents = base(OMIT, { components: { $ref: "#/x-components" }, "x-components": { channels: { dr: { servers: [] } } } });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(findings([["x-components.channels.dr.servers", "noServer", "dr"]]));
      const channelsMapRef = base(OMIT, { components: { channels: { $ref: "#/x-shared" } }, "x-shared": { lab: { servers: [serverRef("lab")] } } });
      expect(findingsOf(await linter.run(channelsMapRef))).toEqual(findings([["x-shared.lab.servers", "noServer", "lab"]]));
    });

    test("checks a channels map shared by channels and components.channels once", async () => {
      const doc = base({ $ref: "#/components/channels" }, { components: { channels: { lab: { address: "lab" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(findings([["components.channels.lab", "missing", "lab"]]));
    });

    test("ignores a channels map or a components object given as an external, dangling, cyclic or root reference", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./channels.yaml" }, { components: { $ref: "https://specs.example.org/components.yaml" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/missing" }, { components: { channels: { $ref: "#/x-loop" } }, "x-loop": { $ref: "#/components/channels" } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#" }, { components: { channels: { $ref: "#" } } })))).toEqual([]);
    });
  });

  describe("channel names", () => {
    test("checks channels whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({ "x-edge": { address: "edge" } }, { components: { channels: { "x-mirror": { servers: [] } } } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.x-edge", "missing", "x-edge"],
          ["components.channels.x-mirror.servers", "noServer", "x-mirror"],
        ])
      );
    });

    test("reports channels whose names contain ~0, ~1, slashes or dots at their own path", async () => {
      const doc = base({ "eu~1west": { servers: [] }, "orders~0dr": {}, "a/b~c": { servers: [serverRef("ghost")] }, "orders.placed.v1": { address: "x" } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.eu~1west.servers", "noServer", "eu~1west"],
          ["channels.orders~0dr", "missing", "orders~0dr"],
          ["channels.a/b~c.servers", "noServer", "a/b~c"],
          ["channels.orders.placed.v1", "missing", "orders.placed.v1"],
        ])
      );
    });

    test("checks an empty channel key and channels named like Object members", async () => {
      const doc = base({ "": { address: "unnamed" }, constructor: { servers: [] }, toString: complete, valueOf: { servers: [serverRef("valueOf")] } });
      expect(findingsOf(await linter.run(doc))).toEqual(
        findings([
          ["channels.", "missing", ""],
          ["channels.constructor.servers", "noServer", "constructor"],
          ["channels.valueOf.servers", "noServer", "valueOf"],
        ])
      );
    });

    test("escapes control and invisible characters of channel names so every message stays on one line", async () => {
      const doc = base({ "orders\nplaced": { address: "orders" }, "tab\tbed": null, "zero\u200bwidth": { servers: [] } });
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
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: every channel must still reference a root server", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
      expect(findingsOf(await custom.run(withChannel({ ...bare, servers: [{ $ref: "#/components/servers/backup" }] })))).toEqual([[`${AT}.servers`, MSG.noServer(NAME)]]);
    });
  });

  test("validates a shared channel once at its definition, follows chained, escaped, percent-encoded, list and entry references, skips external ones and reports dangling, cyclic, self and malformed ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects channels and components.channels: operations, replies, reply addresses, messages, traits, parameters, bindings, payloads and x-channels maps are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("3.0.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ channels: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "3.0.0", channels: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large document and reports exactly the generated violations", async () => {
    expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(findings(failLargeGenerated.expected));
  });
});
