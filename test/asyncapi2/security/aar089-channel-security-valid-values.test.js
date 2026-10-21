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

const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Quality Channel Security", version: "1.0.0" }, ...extra });
const kafka = (security) => ({ url: "kafka.quality.es:9093", protocol: "kafka-secure", security });
const single = (type) =>
  base({
    servers: { prodKafka: kafka([{ broker: [] }]) },
    channels: {
      "orders.placed": {
        publish: { operationId: "publishOrderPlaced", security: [{ broker: [] }], traits: [{ security: [{ broker: [] }] }], message: { payload: { type: "object" } } },
      },
    },
    components: { securitySchemes: { broker: { type, description: "Broker authentication." } } },
  });
const SINGLE_PATHS = ["servers.prodKafka.security.0.broker", "channels.orders.placed.publish.security.0.broker", "channels.orders.placed.publish.traits.0.security.0.broker"];
const atEverySite = (message) => SINGLE_PATHS.map((path) => [path, message]).sort(byPathAndMessage);
const matrixDoc = (types) =>
  base({
    servers: { matrix: kafka(types.map((_, index) => ({ [`case${index}`]: [] }))) },
    components: { securitySchemes: Object.fromEntries(types.map((type, index) => [`case${index}`, { type }])) },
  });
const reportedCases = (results) => new Set(only(results).map((r) => Number(r.path[3])));
const holders = (security) =>
  base({
    servers: { s: kafka(security) },
    channels: { c: { subscribe: { security, traits: [{ security }], message: { payload: { type: "object" } } } } },
    components: { securitySchemes: { saslPlain: { type: "plain" } }, servers: { cs: kafka(security) }, operationTraits: { t: { security } } },
  });

const FAIL_EXAMPLE = [
  ["servers.kafkaPlain.security.0.saslPlain", notApproved("saslPlain", "plain")],
  ["servers.kafkaScram256.security.0.saslScram256", notApproved("saslScram256", "scramSha256")],
  ["servers.kafkaOrPlain.security.1.saslPlain", notApproved("saslPlain", "plain")],
  ["servers.kafkaAndKerberos.security.0.kerberos", notApproved("kerberos", "gssapi")],
  ["servers.mqttBroker.security.0.userPass", notApproved("userPass", "userPassword")],
  ["servers.amqpBroker.security.0.apiKeyUser", notApproved("apiKeyUser", "apiKey")],
  ["servers.webhooks.security.0.httpBasic", notApproved("httpBasic", "http")],
  ["servers.webhooks.security.1.httpHeaderKey", notApproved("httpHeaderKey", "httpApiKey")],
  ["servers.wsGateway.security.0.oauth", notApproved("oauth", "oauth2")],
  ["servers.wsGateway.security.1.oidc", notApproved("oidc", "openIdConnect")],
  ["servers.ibmmqQm.security.0.symmetric", notApproved("symmetric", "symmetricEncryption")],
  ["servers.ibmmqQm.security.1.asymmetric", notApproved("asymmetric", "asymmetricEncryption")],
  ["servers.certLegacy.security.0.mutualTls", notApproved("mutualTls", "mutualTLS")],
  ["servers.caseScram.security.0.caseScram", notApproved("caseScram", "ScramSha512")],
  ["servers.lowerCert.security.0.lowerCert", notApproved("lowerCert", "x509")],
  ["servers.paddedScram.security.0.paddedScram", notApproved("paddedScram", "scramSha512 ")],
  ["servers.numericType.security.0.numericType", notString("numericType")],
  ["servers.arrayType.security.0.arrayType", notString("arrayType")],
  ["servers.x-partner.security.0.saslPlain", notApproved("saslPlain", "plain")],
  ["components.servers.dr.security.0.saslPlain", notApproved("saslPlain", "plain")],
  ["channels.payments/cards/{cardId}/authorised.subscribe.security.0.saslPlain", notApproved("saslPlain", "plain")],
  ["channels.payments/cards/{cardId}/authorised.publish.traits.0.security.0.oauth", notApproved("oauth", "oauth2")],
  ["channels.orders.cdc.placed.v1.publish.security.1.userPass", notApproved("userPass", "userPassword")],
  ["channels.x-internal.audit.subscribe.security.0.saslPlain", notApproved("saslPlain", "plain")],
  ["components.channels.refunds.publish.security.0.httpBasic", notApproved("httpBasic", "http")],
  ["components.operationTraits.legacyAuth.security.0.saslPlain", notApproved("saslPlain", "plain")],
  ["components.operationTraits.unusedTrait.security.0.kerberos", notApproved("kerberos", "gssapi")],
].sort(byPathAndMessage);

const FAIL_EXAMPLE_APPROVABLE = ["plain", "scramSha256", "gssapi", "userPassword", "apiKey", "http", "httpApiKey", "oauth2", "openIdConnect", "symmetricEncryption", "asymmetricEncryption", "mutualTLS", "ScramSha512", "x509"];

const FAIL_SHARED_REF = [
  ["servers.legacyAlias.security.0.legacy", notApproved("saslPlain", "plain")],
  ["servers.twoHops.security.0.hop1", notApproved("hop3", "scramSha256")],
  ["servers.escaped.security.0.eu/plain~legacy", notApproved("eu/plain~legacy", "plain")],
  ["servers.viaEscapedAlias.security.0.escapedAlias", notApproved("eu/plain~legacy", "plain")],
  ["servers.encoded.security.0.encodedAlias", notApproved("latin america", "oauth2")],
  ["servers.unicode.security.0.unicodeAlias", notApproved("espa\u00f1a", "userPassword")],
  ["components.x-security.legacyList.0.saslPlain", notApproved("saslPlain", "plain")],
  ["components.x-requirements.plainOnly.saslPlain", notApproved("saslPlain", "plain")],
  ["components.servers.hub.security.0.legacy", notApproved("saslPlain", "plain")],
  ["components.channels.dispatch.publish.security.0.hop1", notApproved("hop3", "scramSha256")],
  ["components.operationTraits.carrierAuth.security.0.encodedAlias", notApproved("latin america", "oauth2")],
  ["components.x-traits.partnerAuth.security.0.unicodeAlias", notApproved("espa\u00f1a", "userPassword")],
].sort(byPathAndMessage);

const OK_EXAMPLE_APPLIED = [
  ["servers.eventstreams.security.0.saslScram", "saslScram", "scramSha512"],
  ["servers.eventstreams.security.1.mtls", "mtls", "X509"],
  ["servers.authorisationsDr.security.0.saslScram", "saslScram", "scramSha512"],
  ["servers.authorisationsDr.security.0.mtls", "mtls", "X509"],
  ["servers.ledgerKafka.security.0.scramAlias", "saslScram", "scramSha512"],
  ["servers.x-mirror.security.0.mtls", "mtls", "X509"],
  ["components.servers.regional.security.0.saslScram", "saslScram", "scramSha512"],
  ["channels.payments.cdc.card-authorisations.approved.v1.subscribe.security.0.saslScram", "saslScram", "scramSha512"],
  ["channels.payments.cdc.card-authorisations.approved.v1.subscribe.traits.1.security.0.mtls", "mtls", "X509"],
  ["channels.payments.cdc.card-authorisations.approved.v1.publish.security.0.saslScram", "saslScram", "scramSha512"],
  ["channels.payments.cdc.card-authorisations.approved.v1.publish.security.0.mtls", "mtls", "X509"],
  ["channels.payments.cdc.card-authorisations.approved.v1.publish.security.1.scramAlias", "saslScram", "scramSha512"],
  ["channels.x-payments.sys.audit.v1.publish.security.0.mtls", "mtls", "X509"],
  ["components.channels.ledgerPost.publish.security.0.mtls", "mtls", "X509"],
  ["components.channels.ledgerPost.publish.security.1.saslScram", "saslScram", "scramSha512"],
  ["components.operationTraits.ledgerConsumer.security.0.saslScram", "saslScram", "scramSha512"],
  ["components.operationTraits.ledgerProducer.security.0.saslScram", "saslScram", "scramSha512"],
  ["components.operationTraits.ledgerProducer.security.0.mtls", "mtls", "X509"],
];

describe("AAR089 (AsyncAPI 2.x): every security scheme applied by servers, operations and operation traits must be of an approved type", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped list", () => {
    test("passes a realistic payments document that only applies scramSha512 and X509, ignoring unapplied schemes, extensions, bindings, variables, payloads, headers, examples, message traits and external references", async () => {
      expect(findingsOf(await linter.run(okExample))).toEqual([]);
    });

    test("reports every non-approved scheme applied by servers, components.servers, channel operations, components.channels, inline traits and components.operationTraits with the exact message", async () => {
      expect(findingsOf(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(FAIL_SHARED_REF);
      expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("reads security requirements as 2.x for every asyncapi value below 3, and never as 3.x security schemes", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "", null, false, {}]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
      for (const version of ["3.0.0", "3.1.0", 3, " 3.0.0", "4.0.0"]) {
        expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
      }
    });

    test("checks operation security written in AsyncAPI 2.0 to 2.3, before the field existed", async () => {
      for (const version of ["2.0.0", "2.3.0"]) {
        expect(findingsOf(await linter.run(withVersion(single("plain"), version)))).toEqual(atEverySite(notApproved("broker", "plain")));
      }
    });

    test("reports with the error severity", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => expect(r.severity).toBe(0));
    });

    test("names the scheme, the type and the approved types in the message", async () => {
      const [result] = only(await linter.run(single("plain")));
      expect(result.message).toBe("AAR089: Security scheme 'broker' type 'plain' must be an approved mechanism: 'scramSha512', 'X509'.");
      expect(DEFAULT_TYPES).toEqual(["scramSha512", "X509"]);
    });

    test.each(TYPE_CASES.approved.map((type) => [type]))("accepts the type %p wherever it is applied", async (type) => {
      expect(findingsOf(await linter.run(single(type)))).toEqual([]);
    });

    test.each(TYPE_CASES.rejected.map((type) => [type]))("rejects the type %p wherever it is applied", async (type) => {
      expect(findingsOf(await linter.run(single(type)))).toEqual(atEverySite(notApproved("broker", type)));
    });

    test("checks a whole matrix and reports exactly the rejected types", async () => {
      const types = [...TYPE_CASES.approved, ...TYPE_CASES.rejected];
      const reported = reportedCases(await linter.run(matrixDoc(types)));
      const rejected = new Set(TYPE_CASES.rejected);
      types.forEach((type, index) => expect([type, reported.has(index)]).toEqual([type, rejected.has(type)]));
    });

    test.each(NON_STRING_TYPES.map((value) => [value]))("rejects the non-string type %p", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual(atEverySite(notString("broker")));
    });

    test.each(ABSENT_TYPES.map((value) => [value]))("does not report a %p type, left to the schema and to AAR018", async (value) => {
      expect(findingsOf(await linter.run(single(value)))).toEqual([]);
    });

    test.each(NON_OBJECT_SCHEMES.map((value) => [value]))("skips the non-object security scheme %p", async (value) => {
      const doc = single("plain");
      expect(findingsOf(await linter.run({ ...doc, components: { securitySchemes: { broker: value } } }))).toEqual([]);
    });

    test.each(NON_ARRAY_SECURITY.map((value) => [value]))("skips a security value of %p on servers, operations and traits", async (value) => {
      expect(findingsOf(await linter.run(holders(value)))).toEqual([]);
    });

    test.each(NON_OBJECT_ITEMS.map((value) => [value]))("skips the security requirement %p", async (value) => {
      expect(findingsOf(await linter.run(holders([value])))).toEqual([]);
    });

    test("leaves undefined scheme names and a missing securitySchemes map to the Spectral built-ins", async () => {
      expect(findingsOf(await linter.run(holders([{ saslPlainTypo: [] }, { SaslPlain: [] }])))).toEqual([]);
      const { components, ...withoutComponents } = holders([{ saslPlain: [] }]);
      expect(components.securitySchemes.saslPlain.type).toBe("plain");
      expect(findingsOf(await linter.run(withoutComponents))).toEqual([]);
      for (const securitySchemes of [undefined, null, [], "saslPlain", 42, { $ref: "#/components/missing" }, { $ref: "./security.yaml" }]) {
        expect(findingsOf(await linter.run({ ...withoutComponents, components: { securitySchemes, servers: { cs: kafka([{ saslPlain: [] }]) } } }))).toEqual([]);
      }
    });

    test("every alternative of the list and every scheme of a requirement must be approved", async () => {
      const doc = base({
        servers: { s: kafka([{ scram: [] }, { plain: [] }, { scram: [], cert: [] }, { cert: [], oauth: ["orders:read"] }, { plain: [], kerberos: [] }]) },
        components: { securitySchemes: { scram: { type: "scramSha512" }, cert: { type: "X509" }, plain: { type: "plain" }, oauth: { type: "oauth2", flows: {} }, kerberos: { type: "gssapi" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.s.security.1.plain", notApproved("plain", "plain")],
          ["servers.s.security.3.oauth", notApproved("oauth", "oauth2")],
          ["servers.s.security.4.plain", notApproved("plain", "plain")],
          ["servers.s.security.4.kerberos", notApproved("kerberos", "gssapi")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports a scheme at every place that applies it, and never at its definition", async () => {
      expect(findingsOf(await linter.run(holders([{ saslPlain: [] }])))).toEqual(
        [
          ["servers.s.security.0.saslPlain", notApproved("saslPlain", "plain")],
          ["channels.c.subscribe.security.0.saslPlain", notApproved("saslPlain", "plain")],
          ["channels.c.subscribe.traits.0.security.0.saslPlain", notApproved("saslPlain", "plain")],
          ["components.servers.cs.security.0.saslPlain", notApproved("saslPlain", "plain")],
          ["components.operationTraits.t.security.0.saslPlain", notApproved("saslPlain", "plain")],
        ].sort(byPathAndMessage)
      );
    });

    test("ignores the security schemes that nothing applies", async () => {
      const doc = base({ servers: { s: kafka([]) }, components: { securitySchemes: Object.fromEntries(ASYNCAPI_TYPES.map((type) => [type, { type }])) } });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("checks both operations of a channel and every trait, including the tuple form", async () => {
      const doc = base({
        channels: {
          orders: {
            publish: { security: [{ plain: [] }], traits: [{ security: [{ plain: [] }] }, [{ security: [{ plain: [] }] }, { ignored: true }], { $ref: "#/components/operationTraits/shared" }] },
            subscribe: { security: [{ plain: [] }], traits: [{ $ref: "#/components/operationTraits/shared" }] },
          },
        },
        components: { securitySchemes: { plain: { type: "plain" } }, operationTraits: { shared: { security: [{ plain: [] }] } } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        [
          "channels.orders.publish.security.0.plain",
          "channels.orders.publish.traits.0.security.0.plain",
          "channels.orders.publish.traits.1.0.security.0.plain",
          "channels.orders.subscribe.security.0.plain",
          "components.operationTraits.shared.security.0.plain",
        ].sort()
      );
    });

    test("escapes control and invisible characters so every message stays on one line and shows the hidden character", async () => {
      const types = ["plain\n", "\u0000X509", "X509\u001b", "X509\u007f", "X509\t", "X509\r\n", "X509\u200b", "\ufeffX509", "X5\u00ad09", "X509\u2028"];
      const results = only(await linter.run(matrixDoc(types)));
      expect(results.map((r) => r.message).sort()).toEqual(types.map((type, index) => notApproved(`case${index}`, type)).sort());
      expect(results.map((r) => r.message).filter((m) => /[\u0000-\u001f\u007f\u00ad\u200b\u2028\ufeff]/.test(m))).toEqual([]);
      expect(results.map((r) => r.message)).toContain("AAR089: Security scheme 'case0' type 'plain\\n' must be an approved mechanism: 'scramSha512', 'X509'.");
    });

    test("escapes control characters in scheme names too", async () => {
      const doc = base({ servers: { s: kafka([{ "sasl\nplain": [] }]) }, components: { securitySchemes: { "sasl\nplain": { type: "plain" } } } });
      expect(findingsOf(await linter.run(doc))).toEqual([["servers.s.security.0.sasl\nplain", notApproved("sasl\nplain", "plain")]]);
      expect(only(await linter.run(doc))[0].message).toContain("Security scheme 'sasl\\nplain'");
    });

    test("names the scheme that declares the type, follows chained, escaped, percent-encoded and shared references once at their definition, and ignores external, dangling, cyclic, self, root and malformed ones", async () => {
      expect(findingsOf(await linter.run(failSharedRef))).toEqual(FAIL_SHARED_REF);
    });

    test("follows a components object and a securitySchemes map given as local references, and ignores them when external, dangling or cyclic", async () => {
      const viaComponents = base({
        servers: { s: kafka([{ saslPlain: [] }]) },
        components: { $ref: "#/x-components" },
        "x-components": { securitySchemes: { saslPlain: { type: "plain" } }, servers: { dr: kafka([{ saslPlain: [] }]) } },
      });
      expect(findingsOf(await linter.run(viaComponents))).toEqual(
        [
          ["servers.s.security.0.saslPlain", notApproved("saslPlain", "plain")],
          ["x-components.servers.dr.security.0.saslPlain", notApproved("saslPlain", "plain")],
        ].sort(byPathAndMessage)
      );
      const schemesRef = base({ servers: { s: kafka([{ saslPlain: [] }]) }, components: { securitySchemes: { $ref: "#/x-schemes" } }, "x-schemes": { saslPlain: { type: "plain" } } });
      expect(findingsOf(await linter.run(schemesRef))).toEqual([["servers.s.security.0.saslPlain", notApproved("saslPlain", "plain")]]);
      for (const components of [{ $ref: "./components.yaml" }, { $ref: "#/x-missing" }, { $ref: "#/x-loop" }, { $ref: "#" }]) {
        const doc = base({ servers: { s: kafka([{ saslPlain: [] }]) }, components, "x-loop": { $ref: "#/components" } });
        expect(findingsOf(await linter.run(doc))).toEqual([]);
      }
    });

    test("treats relative file paths as external and never checks the root document as a server, channel, trait, requirement or scheme", async () => {
      const doc = base({
        type: "plain",
        security: [{ saslPlain: [] }],
        publish: { security: [{ saslPlain: [] }] },
        servers: { relativeScheme: kafka([{ relative: [] }, { rootScheme: [] }, { emptyScheme: [] }]), rootServer: { $ref: "#" }, emptyServer: { $ref: "" } },
        channels: { rootChannel: { $ref: "#" }, orders: { publish: { security: [{ $ref: "#" }], traits: [{ $ref: "#" }, { $ref: "" }] } } },
        components: {
          securitySchemes: { saslPlain: { type: "plain" }, relative: { $ref: "./components/securitySchemes/saslPlain" }, rootScheme: { $ref: "#" }, emptyScheme: { $ref: "" } },
          servers: { rootServer: { $ref: "#" } },
          channels: { rootChannel: { $ref: "#" } },
          operationTraits: { rootTrait: { $ref: "#" } },
        },
      });
      expect(findingsOf(await linter.run(doc))).toEqual([]);
    });

    test("follows servers, channels and traits maps given as local references", async () => {
      const doc = base({
        servers: { $ref: "#/x-servers" },
        channels: { $ref: "#/x-channels" },
        components: { securitySchemes: { saslPlain: { type: "plain" } }, operationTraits: { $ref: "#/x-traits" } },
        "x-servers": { s: kafka([{ saslPlain: [] }]) },
        "x-channels": { orders: { publish: { security: [{ saslPlain: [] }], traits: { $ref: "#/x-trait-list" } } } },
        "x-trait-list": [{ security: [{ saslPlain: [] }] }],
        "x-traits": { t: { security: [{ saslPlain: [] }] } },
      });
      expect(pathsOf(await linter.run(doc))).toEqual(
        ["x-servers.s.security.0.saslPlain", "x-channels.orders.publish.security.0.saslPlain", "x-trait-list.0.security.0.saslPlain", "x-traits.t.security.0.saslPlain"].sort()
      );
    });

    test("checks servers, channels and schemes whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": kafka([{ "x-plain": [] }]) },
        channels: { "x-audit": { subscribe: { security: [{ "x-plain": [] }] } } },
        components: { securitySchemes: { "x-plain": { type: "plain" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.x-edge.security.0.x-plain", notApproved("x-plain", "plain")],
          ["channels.x-audit.subscribe.security.0.x-plain", notApproved("x-plain", "plain")],
        ].sort(byPathAndMessage)
      );
    });

    test("reports channels, servers and schemes whose names contain ~0, ~1 or slashes at their own path", async () => {
      const doc = base({
        servers: { "eu~1west": kafka([{ "sasl/plain": [] }]) },
        channels: { "smartylighting/streetlights/1/0/event/{streetlightId}/lighting/measured": { publish: { security: [{ "legacy~0plain": [] }] } } },
        components: { securitySchemes: { "sasl/plain": { type: "plain" }, "legacy~0plain": { type: "plain" } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.eu~1west.security.0.sasl/plain", notApproved("sasl/plain", "plain")],
          ["channels.smartylighting/streetlights/1/0/event/{streetlightId}/lighting/measured.publish.security.0.legacy~0plain", notApproved("legacy~0plain", "plain")],
        ].sort(byPathAndMessage)
      );
    });

    test("checks schemes and servers named like Object members", async () => {
      const doc = base({
        servers: { constructor: kafka([{ toString: [] }]), valueOf: kafka([{ constructor: [] }, { valueOf: [] }]) },
        components: { securitySchemes: { toString: { type: "plain" }, constructor: { type: "X509" }, valueOf: { type: "oauth2", flows: {} } } },
      });
      expect(findingsOf(await linter.run(doc))).toEqual(
        [
          ["servers.constructor.security.0.toString", notApproved("toString", "plain")],
          ["servers.valueOf.security.1.valueOf", notApproved("valueOf", "oauth2")],
        ].sort(byPathAndMessage)
      );
    });

    test("skips null, scalar and array nodes, look-alike fields, root, channel, message, binding and parameter security, undefined names and untyped schemes", async () => {
      expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
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
      results.forEach((r) => expect(r.message).toBe(notApproved(r.path[4], PROBE_TYPES[Number(r.path[3])], types)));
    });

    test("types with surrounding spaces, commas or no characters can never be approved", async () => {
      expect(await acceptedUnder(" X509 ,,X509 ,")).toEqual(["X509"]);
      const configured = await withTypes(["scramSha512", "X509", " ", "scramSha512,X509"]);
      expect(findingsOf(await configured.run(matrixDoc(["", " X509", "X509 ", "scramSha512,X509", "scramSha512"])))).toEqual(
        [
          ["servers.matrix.security.0.case0", notApproved("case0", "", ["scramSha512", "X509"])],
          ["servers.matrix.security.1.case1", notApproved("case1", " X509", ["scramSha512", "X509"])],
          ["servers.matrix.security.2.case2", notApproved("case2", "X509 ", ["scramSha512", "X509"])],
          ["servers.matrix.security.3.case3", notApproved("case3", "scramSha512,X509", ["scramSha512", "X509"])],
        ].sort(byPathAndMessage)
      );
    });

    test("escapes control characters of the configured types in the message", async () => {
      const configured = await withTypes(["scram\u0007Sha512", "X5\u000009"]);
      expect(findingsOf(await configured.run(matrixDoc(["scramSha512"])))).toEqual([
        ["servers.matrix.security.0.case0", "AAR089: Security scheme 'case0' type 'scramSha512' must be an approved mechanism: 'scram\\u0007Sha512', 'X5\\u000009'."],
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
      expect(pathsOf(await configured.run(failExample))).toEqual(
        ["servers.paddedScram.security.0.paddedScram", "servers.numericType.security.0.numericType", "servers.arrayType.security.0.arrayType"].sort()
      );
    });

    test("every AsyncAPI type can be approved, and mutualTLS only when listed", async () => {
      const everyType = await withTypes(ASYNCAPI_TYPES.join(","));
      expect(pathsOf(await everyType.run(failExample))).toEqual(
        [
          "servers.certLegacy.security.0.mutualTls",
          "servers.caseScram.security.0.caseScram",
          "servers.lowerCert.security.0.lowerCert",
          "servers.paddedScram.security.0.paddedScram",
          "servers.numericType.security.0.numericType",
          "servers.arrayType.security.0.arrayType",
        ].sort()
      );
      const withMutualTls = await withTypes([...DEFAULT_TYPES, "mutualTLS"]);
      expect(pathsOf(await withMutualTls.run(failExample))).not.toContain("servers.certLegacy.security.0.mutualTls");
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
