const { linterForRule } = require("../../helpers/utils");
const {
  DEFAULT_TYPES,
  OPTION,
  ASYNCAPI_TYPES,
  notApproved,
  notString,
  TYPE_CASES,
  NON_STRING_TYPES,
  ABSENT_TYPES,
  NON_OBJECT_SCHEMES,
  NON_ARRAY_SECURITY,
  NON_OBJECT_ITEMS,
  PROBE_TYPES,
  PARAM_CASES,
  FALLBACK_VALUES,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar089-channel-security-valid-values");
const okExample = require("./AAR089/ok-example");
const failExample = require("./AAR089/fail-example");
const failSharedRef = require("./AAR089/fail-shared-ref");
const okStructuralEdges = require("./AAR089/ok-structural-edges");
const failLargeGenerated = require("./AAR089/fail-large-generated");

const RULE = "asa:AAR089";

const only = (results) => results.filter((r) => r.code === RULE);
const byPathAndMessage = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPathAndMessage);
const pathsOf = (results) => only(results).map((r) => r.path.join(".")).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withTypes = (value) => linterForRule(RULE, { functionOptions: { [OPTION]: value } });

const scheme = (name) => ({ $ref: `#/components/securitySchemes/${name}` });
const base = (extra) => ({ asyncapi: "3.0.0", info: { title: "Quality Channel Security", version: "1.0.0" }, ...extra });
const kafka = (security) => ({ host: "kafka.quality.es:9093", protocol: "kafka-secure", security });
const ordersChannel = { orders: { address: "orders.placed", messages: { placed: { payload: { type: "object" } } } } };
const single = (type) =>
  base({
    servers: { prodKafka: kafka([scheme("broker")]) },
    channels: ordersChannel,
    operations: {
      publishOrderPlaced: { action: "send", channel: { $ref: "#/channels/orders" }, security: [{ type, description: "Inline scheme." }], traits: [{ security: [scheme("broker")] }] },
    },
    components: { securitySchemes: { broker: { type, description: "Broker authentication." } } },
  });
const atEverySite = (named, unnamed) =>
  [
    ["servers.prodKafka.security.0", named],
    ["operations.publishOrderPlaced.security.0.type", unnamed],
    ["operations.publishOrderPlaced.traits.0.security.0", named],
  ].sort(byPathAndMessage);
const matrixDoc = (types) => base({ servers: { matrix: kafka(types.map((type) => ({ type }))) } });
const refMatrixDoc = (types) =>
  base({
    servers: { matrix: kafka(types.map((_, index) => scheme(`case${index}`))) },
    components: { securitySchemes: Object.fromEntries(types.map((type, index) => [`case${index}`, { type }])) },
  });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[3])));
const holders = (security) =>
  base({
    servers: { s: kafka(security) },
    channels: ordersChannel,
    operations: { o: { action: "receive", channel: { $ref: "#/channels/orders" }, security, traits: [{ security }] } },
    components: {
      securitySchemes: { saslPlain: { type: "plain" } },
      servers: { cs: kafka(security) },
      operations: { co: { action: "send", channel: { $ref: "#/channels/orders" }, security } },
      operationTraits: { t: { security } },
    },
  });

const FAIL_EXAMPLE = [
  ["servers.kafkaPlain.security.0", notApproved("saslPlain", "plain")],
  ["servers.kafkaScram256.security.0", notApproved("saslScram256", "scramSha256")],
  ["servers.kafkaOrPlain.security.1", notApproved("saslPlain", "plain")],
  ["servers.kafkaKerberos.security.1", notApproved("kerberos", "gssapi")],
  ["servers.mqttBroker.security.0", notApproved("userPass", "userPassword")],
  ["servers.amqpBroker.security.0", notApproved("apiKeyUser", "apiKey")],
  ["servers.webhooks.security.0", notApproved("httpBasic", "http")],
  ["servers.webhooks.security.1", notApproved("httpHeaderKey", "httpApiKey")],
  ["servers.wsGateway.security.0", notApproved("oauth", "oauth2")],
  ["servers.wsGateway.security.1", notApproved("oidc", "openIdConnect")],
  ["servers.ibmmqQm.security.0", notApproved("symmetric", "symmetricEncryption")],
  ["servers.ibmmqQm.security.1", notApproved("asymmetric", "asymmetricEncryption")],
  ["servers.certLegacy.security.0.type", notApproved(undefined, "mutualTLS")],
  ["servers.caseScram.security.0.type", notApproved(undefined, "ScramSha512")],
  ["servers.lowerCert.security.0", notApproved("lowerCert", "x509")],
  ["servers.paddedScram.security.0.type", notApproved(undefined, "scramSha512 ")],
  ["servers.numericType.security.0", notString("numericType")],
  ["servers.numericType.security.1.type", notString(undefined)],
  ["servers.x-partner.security.0.type", notApproved(undefined, "plain")],
  ["components.servers.dr.security.0", notApproved("saslPlain", "plain")],
  ["operations.receiveCardAuthorised.security.0", notApproved("saslPlain", "plain")],
  ["operations.sendCardAuthorised.traits.0.security.0.type", notApproved(undefined, "oauth2")],
  ["operations.sendOrderPlaced.security.1", notApproved("userPass", "userPassword")],
  ["operations.sendOrderPlaced.traits.1.0.security.0", notApproved("kerberos", "gssapi")],
  ["operations.x-internal/audit.security.0.type", notApproved(undefined, "plain")],
  ["components.operations.refund.security.0.type", notApproved(undefined, "http")],
  ["components.operationTraits.legacyAuth.security.0", notApproved("saslPlain", "plain")],
  ["components.operationTraits.unusedTrait.security.0", notApproved("kerberos", "gssapi")],
].sort(byPathAndMessage);

const FAIL_EXAMPLE_APPROVABLE = ["plain", "scramSha256", "gssapi", "userPassword", "apiKey", "http", "httpApiKey", "oauth2", "openIdConnect", "symmetricEncryption", "asymmetricEncryption", "mutualTLS", "ScramSha512", "x509"];

const FAIL_SHARED_REF = [
  ["servers.legacyAlias.security.0", notApproved("saslPlain", "plain")],
  ["servers.threeHops.security.0", notApproved("hop3", "scramSha256")],
  ["servers.escaped.security.0", notApproved("eu/plain~legacy", "plain")],
  ["servers.viaEscapedAlias.security.0", notApproved("eu/plain~legacy", "plain")],
  ["servers.encoded.security.0", notApproved("latin america", "oauth2")],
  ["servers.unicode.security.0", notApproved("espa\u00f1a", "userPassword")],
  ["servers.siblings.security.1", notApproved("saslPlain", "plain")],
  ["servers.inlineInComponents.security.0", notApproved(undefined, "gssapi")],
  ["components.x-security.legacyList.0", notApproved("saslPlain", "plain")],
  ["components.servers.hub.security.0", notApproved("saslPlain", "plain")],
  ["components.operations.dispatch.security.0", notApproved("hop3", "scramSha256")],
  ["components.operations.dispatch.security.1.type", notApproved(undefined, "plain")],
  ["components.operationTraits.carrierAuth.security.0", notApproved("latin america", "oauth2")],
  ["components.x-traits.partnerAuth.security.0", notApproved("espa\u00f1a", "userPassword")],
].sort(byPathAndMessage);

const OK_EXAMPLE_APPLIED = [
  ["servers.fleetKafka.security.0", "saslScram", "scramSha512"],
  ["servers.fleetKafka.security.1", "mtls", "X509"],
  ["servers.fleetKafkaDr.security.0", "saslScram", "scramSha512"],
  ["servers.fleetKafkaDr.security.1.type", undefined, "X509"],
  ["servers.vehiclesMqtt.security.0", "mtls", "X509"],
  ["servers.x-mirror.security.0", "saslScram", "scramSha512"],
  ["components.servers.regional.security.0", "saslScram", "scramSha512"],
  ["operations.receiveVehicleTelemetry.security.0", "saslScram", "scramSha512"],
  ["operations.receiveVehicleTelemetry.traits.1.security.0", "mtls", "X509"],
  ["operations.sendDispatch.security.0", "mtls", "X509"],
  ["operations.sendDispatch.security.1.type", undefined, "scramSha512"],
  ["operations.x-audit.security.0", "mtls", "X509"],
  ["components.operations.archiveConsumer.security.0", "mtls", "X509"],
  ["components.operationTraits.telemetryConsumer.security.0", "saslScram", "scramSha512"],
  ["components.operationTraits.archiveTrait.security.0.type", undefined, "X509"],
  ["components.operationTraits.archiveTrait.security.1", "saslScram", "scramSha512"],
];

describe("AAR089 (AsyncAPI 3.x): every security scheme applied by servers, operations and operation traits must be of an approved type", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped list", () => {
    test("passes a realistic fleet document that only applies scramSha512 and X509, ignoring unapplied schemes, replies, channels, extensions, bindings, variables, multi-format payloads, correlation ids and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-approved scheme applied by servers, components.servers, operations, components.operations, inline and tuple traits and components.operationTraits with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["3.0.0", "3.1.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("reads security items as 3.x schemes for every asyncapi value of 3 or more, and never as 2.x requirement maps", async () => {
      for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
      for (const version of ["2.6.0", "2.0.0", "", null]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("names a referenced scheme after its definition, reports it at the security item, and reports an inline scheme at its type without a name", async () => {
      const results = only(await linter.run(single("plain")));
      expect(results.map((r) => r.message).sort()).toEqual(
        [
          "AAR089: Security scheme 'broker' type 'plain' must be an approved mechanism: 'scramSha512', 'X509'.",
          "AAR089: Security scheme 'broker' type 'plain' must be an approved mechanism: 'scramSha512', 'X509'.",
          "AAR089: Security scheme type 'plain' must be an approved mechanism: 'scramSha512', 'X509'.",
        ].sort()
      );
      expect(DEFAULT_TYPES).toEqual(["scramSha512", "X509"]);
    });

    test.each(TYPE_CASES.approved.map((type) => [type]))("accepts the type %p wherever it is applied", async (type) => {
      expect(findingsOf(await linter.run(single(type)))).toEqual([]);
    });

    test.each(TYPE_CASES.rejected.map((type) => [type]))("rejects the type %p wherever it is applied", async (type) => {
      expect(findingsOf(await linter.run(single(type)))).toEqual(atEverySite(notApproved("broker", type), notApproved(undefined, type)));
    });

    test("checks a whole matrix of inline and referenced schemes and reports exactly the rejected types", async () => {
      const types = [...TYPE_CASES.approved, ...TYPE_CASES.rejected];
      const rejected = new Set(TYPE_CASES.rejected);
      for (const doc of [matrixDoc(types), refMatrixDoc(types)]) {
        const reported = reportedCases(await linter.run(doc));
        types.forEach((type, index) => expect([type, reported.has(index)]).toEqual([type, rejected.has(type)]));
      }
    });

    test.each(NON_STRING_TYPES.map((value) => [value]))("rejects the non-string type %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual(atEverySite(notString("broker"), notString(undefined)));
    });

    test.each(ABSENT_TYPES.map((value) => [value]))("does not report a %p type, left to the schema and to AAR018", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([]);
    });

    test.each(NON_OBJECT_SCHEMES.map((value) => [value]))("skips a reference to the non-object security scheme %p", async (value) => {
      const doc = single("plain");
      expect(findingsOf(await linter.run({ ...doc, components: { securitySchemes: { broker: value } } }))).toEqual([["operations.publishOrderPlaced.security.0.type", notApproved(undefined, "plain")]]);
    });

    test.each(NON_ARRAY_SECURITY.map((value) => [value]))("skips a security value of %p on servers, operations and traits", async (value) => {
      expect(findingsOf(await linter.run(holders(value)))).toEqual([]);
    });

    test.each(NON_OBJECT_ITEMS.map((value) => [value]))("skips the security item %p", async (value) => {
      expect(findingsOf(await linter.run(holders([value])))).toEqual([]);
    });

    test("leaves dangling, external and broken scheme references to the Spectral resolver", async () => {
      const broken = [scheme("missing"), { $ref: "./security.yaml#/plain" }, { $ref: "#" }, { $ref: 42 }, { $ref: "#/components/securitySchemes/saslPlain/type" }];
      expect(findingsOf(await linter.run(holders(broken)))).toEqual([]);
      const { components, ...withoutComponents } = holders([scheme("saslPlain")]);
      expect(components.securitySchemes.saslPlain.type).toBe("plain");
      expect(findingsOf(await linter.run({ ...withoutComponents, components: { servers: components.servers } }))).toEqual([]);
    });

    test("every alternative of the list must be approved", async () => {
      const doc = base({
        servers: { s: kafka([scheme("scram"), scheme("plain"), { type: "X509" }, { type: "oauth2", flows: {} }, scheme("kerberos")]) },
        components: { securitySchemes: { scram: { type: "scramSha512" }, plain: { type: "plain" }, kerberos: { type: "gssapi" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.s.security.1", notApproved("plain", "plain")],
          ["servers.s.security.3.type", notApproved(undefined, "oauth2")],
          ["servers.s.security.4", notApproved("kerberos", "gssapi")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports a scheme at every place that applies it, and never at its definition", async () => {
      expect(findingsOf(await linter.run(holders([scheme("saslPlain")])))).toEqual(
        [
          ["servers.s.security.0", notApproved("saslPlain", "plain")],
          ["operations.o.security.0", notApproved("saslPlain", "plain")],
          ["operations.o.traits.0.security.0", notApproved("saslPlain", "plain")],
          ["components.servers.cs.security.0", notApproved("saslPlain", "plain")],
          ["components.operations.co.security.0", notApproved("saslPlain", "plain")],
          ["components.operationTraits.t.security.0", notApproved("saslPlain", "plain")],
        ].sort(byPathAndMessage)
      );
    });

    test("ignores the security schemes that nothing applies", async () => {
      const doc = base({ servers: { s: kafka([]) }, components: { securitySchemes: Object.fromEntries(ASYNCAPI_TYPES.map((type) => [type, { type }])) } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("checks every trait, including the 3.0 tuple form, and a shared trait once at its definition", async () => {
      const doc = base({
        channels: ordersChannel,
        operations: {
          a: {
            action: "send",
            channel: { $ref: "#/channels/orders" },
            security: [{ type: "plain" }],
            traits: [{ security: [{ type: "plain" }] }, [{ security: [{ type: "plain" }] }, { ignored: true }], { $ref: "#/components/operationTraits/shared" }],
          },
          b: { action: "receive", channel: { $ref: "#/channels/orders" }, traits: [{ $ref: "#/components/operationTraits/shared" }, [{ $ref: "#/components/operationTraits/shared" }, {}]] },
        },
        components: { operationTraits: { shared: { security: [{ type: "plain" }] } } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        ["operations.a.security.0.type", "operations.a.traits.0.security.0.type", "operations.a.traits.1.0.security.0.type", "components.operationTraits.shared.security.0.type"].sort()
      );
    });

    test("checks an operation given as a reference once at its definition", async () => {
      const doc = base({
        channels: ordersChannel,
        operations: { a: { $ref: "#/components/operations/shared" }, b: { $ref: "#/components/operations/shared" }, c: { $ref: "#/x-operations/legacy" } },
        components: { operations: { shared: { action: "send", channel: { $ref: "#/channels/orders" }, security: [{ type: "plain" }] } } },
        "x-operations": { legacy: { action: "send", channel: { $ref: "#/channels/orders" }, security: [{ type: "gssapi" }] } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["components.operations.shared.security.0.type", notApproved(undefined, "plain")],
          ["x-operations.legacy.security.0.type", notApproved(undefined, "gssapi")],
        ].sort(byPathAndMessage)
      );
    });

    test("never checks channels, replies, messages, bindings or the root, which have no security in AsyncAPI 3", async () => {
      const doc = base({
        security: [{ type: "plain" }],
        channels: { orders: { address: null, security: [{ type: "plain" }], messages: { m: { security: [{ type: "plain" }] } }, bindings: { kafka: { security: [{ type: "plain" }] } } } },
        operations: {
          o: { action: "send", channel: { $ref: "#/channels/orders" }, reply: { channel: { $ref: "#/channels/orders" }, security: [{ type: "plain" }] }, bindings: { kafka: { security: [{ type: "plain" }] } } },
        },
        components: { replies: { r: { security: [{ type: "plain" }] } }, channels: { c: { security: [{ type: "plain" }] } }, messages: { m: { security: [{ type: "plain" }] } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("escapes control and invisible characters so every message stays on one line and shows the hidden character", async () => {
      const types = ["plain\n", "\u0000X509", "X509\u001b", "X509\u007f", "X509\t", "X509\r\n", "X509\u200b", "\ufeffX509", "X5\u00ad09", "X509\u2028"];
      const results = only(await linter.run(matrixDoc(types)));
      expect(results.map((r) => r.message).sort()).toEqual(types.map((type) => notApproved(undefined, type)).sort());
      expect(results.map((r) => r.message).filter((m) => /[\u0000-\u001f\u007f\u00ad\u200b\u2028\ufeff]/.test(m))).toEqual([]);
      expect(results.map((r) => r.message)).toContain("AAR089: Security scheme type 'plain\\n' must be an approved mechanism: 'scramSha512', 'X509'.");
    });

    test("escapes control characters in scheme names too", async () => {
      const doc = base({ servers: { s: kafka([{ $ref: "#/components/securitySchemes/sasl%0Aplain" }]) }, components: { securitySchemes: { "sasl\nplain": { type: "plain" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual([["servers.s.security.0", notApproved("sasl\nplain", "plain")]]);
      expect(only(await linter.run(doc))[0].message).toContain("Security scheme 'sasl\\nplain'");
    });

    test("names the scheme that declares the type, follows chained, escaped, percent-encoded and shared references once at their definition, and ignores external, dangling, cyclic, self, root and malformed ones", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("follows a components object and servers, operations and traits maps given as local references, but never a pointer through an intermediate reference", async () => {
      const plain = { $ref: "#/x-schemes/saslPlain" };
      const doc = base({
        servers: { $ref: "#/x-servers" },
        channels: ordersChannel,
        operations: { $ref: "#/x-operations" },
        components: { $ref: "#/x-components" },
        "x-servers": { s: kafka([plain]), throughIntermediate: kafka([scheme("saslPlain"), { $ref: "#/components/securitySchemes/saslPlain" }]) },
        "x-operations": { o: { action: "send", channel: { $ref: "#/channels/orders" }, security: [plain], traits: { $ref: "#/x-trait-list" } } },
        "x-trait-list": [{ security: [{ type: "gssapi" }] }],
        "x-components": { securitySchemes: { $ref: "#/x-schemes" }, operationTraits: { t: { security: [plain] } } },
        "x-schemes": { saslPlain: { type: "plain" } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["x-servers.s.security.0", notApproved("saslPlain", "plain")],
          ["x-operations.o.security.0", notApproved("saslPlain", "plain")],
          ["x-trait-list.0.security.0.type", notApproved(undefined, "gssapi")],
          ["x-components.operationTraits.t.security.0", notApproved("saslPlain", "plain")],
        ].sort(byPathAndMessage)
      );
      for (const components of [{ $ref: "./components.yaml" }, { $ref: "#/x-missing" }, { $ref: "#/x-loop" }, { $ref: "#" }]) {
        const broken = base({ servers: { s: kafka([{ type: "X509" }]) }, components, "x-loop": { $ref: "#/components" } });
        expect(findingsOf(await linter.run(broken))).toEqual([]);
      }
    });

    test("treats relative file paths as external and never checks the root document as a server, operation, trait or scheme", async () => {
      const doc = base({
        type: "plain",
        security: [{ type: "plain" }],
        servers: {
          relative: kafka([{ $ref: "./components/securitySchemes/saslPlain" }, { $ref: "#" }, { $ref: "" }, scheme("rootScheme")]),
          rootServer: { $ref: "#" },
          emptyServer: { $ref: "" },
        },
        channels: ordersChannel,
        operations: { rootOperation: { $ref: "#" }, o: { action: "send", channel: { $ref: "#/channels/orders" }, traits: [{ $ref: "#" }, { $ref: "" }] } },
        components: {
          securitySchemes: { saslPlain: { type: "plain" }, rootScheme: { $ref: "#" } },
          servers: { rootServer: { $ref: "#" } },
          operations: { rootOperation: { $ref: "#" } },
          operationTraits: { rootTrait: { $ref: "#" } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("checks servers, operations and schemes whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": kafka([scheme("x-plain")]) },
        channels: ordersChannel,
        operations: { "x-audit": { action: "send", channel: { $ref: "#/channels/orders" }, security: [scheme("x-plain")] } },
        components: { securitySchemes: { "x-plain": { type: "plain" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.x-edge.security.0", notApproved("x-plain", "plain")],
          ["operations.x-audit.security.0", notApproved("x-plain", "plain")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports servers and operations whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({
        servers: { "eu~1west": kafka([{ type: "plain" }]) },
        channels: ordersChannel,
        operations: { "smartylighting/streetlights~0measured": { action: "receive", channel: { $ref: "#/channels/orders" }, security: [scheme("sasl~1plain"), scheme("sasl/plain")] } },
        components: { securitySchemes: { "sasl/plain": { type: "plain" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.eu~1west.security.0.type", notApproved(undefined, "plain")],
          ["operations.smartylighting/streetlights~0measured.security.0", notApproved("sasl/plain", "plain")],
        ].sort(byPathAndMessage)
      );
    });

    test("checks schemes and servers named like Object members", async () => {
      const doc = base({
        servers: { constructor: kafka([scheme("toString")]), valueOf: kafka([scheme("constructor"), scheme("valueOf")]) },
        components: { securitySchemes: { toString: { type: "plain" }, constructor: { type: "X509" }, valueOf: { type: "oauth2", flows: {} } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.constructor.security.0", notApproved("toString", "plain")],
          ["servers.valueOf.security.1", notApproved("valueOf", "oauth2")],
        ].sort(byPathAndMessage)
      );
    });

    test("skips null, scalar and array nodes, look-alike fields, 2.x-shaped requirements, root, channel, reply, message, binding and parameter security and untyped schemes", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findingsOf(await linter.run("42"))).toEqual([]);
      expect(findingsOf(await linter.run([single("plain")]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(failLargeGenerated.expected.length).toBeGreaterThan(100);
      expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured list", () => {
    const acceptedUnder = async (value) => {
      const configured = await withTypes(value);
      const reported = reportedCases(await configured.run(matrixDoc(PROBE_TYPES)));
      return PROBE_TYPES.filter((_, index) => !reported.has(index));
    };

    test("the shipped list accepts exactly scramSha512 and X509", async () => {
      expect(await acceptedUnder(undefined)).toEqual(["X509", "scramSha512"]);
      expect(await acceptedUnder("scramSha512,X509")).toEqual(["X509", "scramSha512"]);
    });

    test.each(PARAM_CASES)("%s accepts exactly the listed types and names the list in every message", async (_, value, accepted, types) => {
      expect(await acceptedUnder(value)).toEqual(accepted);
      const configured = await withTypes(value);
      const results = only(await configured.run(matrixDoc(PROBE_TYPES)));
      results.forEach((r) => expect(r.message).toBe(notApproved(undefined, PROBE_TYPES[Number(r.path[3])], types)));
      const named = only(await configured.run(refMatrixDoc(PROBE_TYPES)));
      expect(named).toHaveLength(results.length);
      named.forEach((r) => expect(r.message).toBe(notApproved(`case${r.path[3]}`, PROBE_TYPES[Number(r.path[3])], types)));
    });

    test("types with surrounding spaces, commas or no characters can never be approved", async () => {
      expect(await acceptedUnder(" X509 ,,X509 ,")).toEqual(["X509"]);
      const configured = await withTypes(["scramSha512", "X509", " ", "scramSha512,X509"]);
      expect(findingsOf(await configured.run(matrixDoc(["", " X509", "X509 ", "scramSha512,X509", "scramSha512"])))).toEqual(
        [
          ["servers.matrix.security.0.type", notApproved(undefined, "", ["scramSha512", "X509"])],
          ["servers.matrix.security.1.type", notApproved(undefined, " X509", ["scramSha512", "X509"])],
          ["servers.matrix.security.2.type", notApproved(undefined, "X509 ", ["scramSha512", "X509"])],
          ["servers.matrix.security.3.type", notApproved(undefined, "scramSha512,X509", ["scramSha512", "X509"])],
        ].sort(byPathAndMessage)
      );
    });

    test("escapes control characters of the configured types in the message", async () => {
      const configured = await withTypes(["scram\u0007Sha512", "X5\u000009"]);
      expect(findingsOf(await configured.run(matrixDoc(["scramSha512"])))).toEqual([
        ["servers.matrix.security.0.type", "AAR089: Security scheme type 'scramSha512' must be an approved mechanism: 'scram\\u0007Sha512', 'X5\\u000009'."],
      ]);
    });

    test("a compliant document fails at every application once the list no longer holds its types", async () => {
      const configured = await withTypes("plain");
      expect(findingsOf(await configured.run(okExample))).toEqual(OK_EXAMPLE_APPLIED.map(([path, name, type]) => [path, notApproved(name, type, ["plain"])]).sort(byPathAndMessage));
      const scramOnly = await withTypes("scramSha512");
      expect(pathsOf(await scramOnly.run(okExample))).toEqual(OK_EXAMPLE_APPLIED.filter(([, , type]) => type === "X509").map(([path]) => path).sort());
    });

    test("a failing document passes once the list holds every type it applies that can be approved", async () => {
      const configured = await withTypes([...DEFAULT_TYPES, ...FAIL_EXAMPLE_APPROVABLE]);
      expect(pathsOf(await configured.run(failExample))).toEqual(["servers.paddedScram.security.0.type", "servers.numericType.security.0", "servers.numericType.security.1.type"].sort());
    });

    test("every AsyncAPI type can be approved, and mutualTLS only when listed", async () => {
      const everyType = await withTypes(ASYNCAPI_TYPES.join(","));
      expect(pathsOf(await everyType.run(failExample))).toEqual(
        [
          "servers.certLegacy.security.0.type",
          "servers.caseScram.security.0.type",
          "servers.lowerCert.security.0",
          "servers.paddedScram.security.0.type",
          "servers.numericType.security.0",
          "servers.numericType.security.1.type",
        ].sort()
      );
      const withMutualTls = await withTypes([...DEFAULT_TYPES, "mutualTLS"]);
      expect(pathsOf(await withMutualTls.run(failExample))).not.toContain("servers.certLegacy.security.0.type");
    });

    test("applies the configured list to a very large document", async () => {
      const configured = await withTypes(failLargeGenerated.configuredTypes.join(","));
      expect(findingsOf(await configured.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expectedConfigured);
      expect(failLargeGenerated.expectedConfigured).not.toEqual(failLargeGenerated.expected);
    });

    test.each(FALLBACK_VALUES.map((value) => [value]))("falls back to the shipped list when the option is %p", async (value) => {
      const configured = await withTypes(value);
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });

    test.each(IGNORED_OPTIONS)("ignores an option the function does not read: %s", async (_, functionOptions) => {
      const configured = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await configured.run(okExample))).toEqual([]);
    });
  });
});
