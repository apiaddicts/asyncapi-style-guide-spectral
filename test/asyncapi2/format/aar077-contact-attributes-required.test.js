const {
  linterForRule,
  CONTACT_FIELDS,
  CONTACT_COMPLETE,
  CONTACT_MINIMAL,
  CONTACT_COMPONENTS,
  CONTACT_VALUE_CASES,
  CONTACT_OBJECT_CASES,
  CONTACT_INFO_CASES,
  CONTACT_IGNORED_OPTIONS,
  CONTACT_MESSAGES: MSG,
  contactFindings,
} = require("../../helpers/utils");
const okExample = require("./AAR077/ok-example");
const failExample = require("./AAR077/fail-example");
const failSharedRef = require("./AAR077/fail-shared-ref");
const okStructuralEdges = require("./AAR077/ok-structural-edges");
const failLargeGenerated = require("./AAR077/fail-large-generated");

const RULE = "asa:AAR077";
const OMIT = Symbol("omit");

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const FAIL = contactFindings([
  ["info.contact", "missing", "name"],
  ["info.contact.email", "empty", "email"],
]);

const SHARED = contactFindings([
  ["components.x-contacts.support", "missing", "email"],
  ["components.x-contacts.support.name", "empty", "name"],
]);

const INFO = { title: "Commerce Events", version: "4.2.0", description: "Order, payment and shipment events of the commerce platform." };
const CHANNELS = {
  "commerce.cdc.orders.placed.v1": {
    description: "Orders placed in the web shop.",
    publish: {
      operationId: "publishOrderPlaced",
      message: { name: "orderPlaced", title: "", payload: { type: "object", properties: { contact: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } } } } },
    },
  },
};
const base = (info, extra = {}) => ({ asyncapi: "2.6.0", id: "urn:commerce:events", ...(info === OMIT ? {} : { info }), channels: CHANNELS, components: CONTACT_COMPONENTS, ...extra });
const withContact = (contact) => base({ ...INFO, contact });

describe("AAR077 (AsyncAPI 2.x): the info contact object must populate name and email", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("passes a realistic multi-protocol document whose contact populates name, url and email", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports a missing name at the contact object and a blank email at the field, whatever the look-alike keys and the contacts outside info hold", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual(FAIL);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("does not depend on the asyncapi version: version-like values and 3.x versions give the same findings", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null, "3.0.0", "3.1.0"]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual(FAIL);
    }
  });

  test("reports with the error severity and one finding per mandatory field", async () => {
    const results = only(await linter.run(failExample));
    expect(results).toHaveLength(FAIL.length);
    expect(new Set(results.map((r) => r.message)).size).toBe(FAIL.length);
    results.forEach((r) => expect(r.severity).toBe(0));
  });

  describe("field values", () => {
    const FIELD_CASES = CONTACT_VALUE_CASES.flatMap(([label, value, populated]) => CONTACT_FIELDS.map((field) => [field, label, value, populated]));

    test.each(FIELD_CASES)("%s set to %s", async (field, _, value, populated) => {
      const expected = populated ? [] : [[`info.contact.${field}`, MSG.empty(field)]];
      expect(findingsOf(await linter.run(withContact({ ...CONTACT_MINIMAL, [field]: value })))).toEqual(expected);
    });

    test.each(CONTACT_VALUE_CASES)("name and email both set to %s", async (_, value, populated) => {
      const expected = populated ? [] : contactFindings(CONTACT_FIELDS.map((field) => [`info.contact.${field}`, "empty", field]));
      expect(findingsOf(await linter.run(withContact({ name: value, email: value })))).toEqual(expected);
    });

    test.each(CONTACT_VALUE_CASES)("url and extensions set to %s are never required", async (_, value) => {
      expect(findingsOf(await linter.run(withContact({ ...CONTACT_MINIMAL, url: value, "x-slack": value, "x-owner": value })))).toEqual([]);
    });

    test.each([[["name"]], [["email"]], [["name", "email"]]])("reports %j missing at the contact object", async (fields) => {
      const contact = Object.fromEntries(Object.entries(CONTACT_COMPLETE).filter(([key]) => !fields.includes(key)));
      expect(findingsOf(await linter.run(withContact(contact)))).toEqual(contactFindings(fields.map((field) => ["info.contact", "missing", field])));
    });

    test("does not inspect the other info fields", async () => {
      expect(findingsOf(await linter.run(base({ title: "", version: null, description: " ", termsOfService: "", license: {}, contact: CONTACT_MINIMAL })))).toEqual([]);
    });
  });

  describe("contact object", () => {
    test.each(CONTACT_OBJECT_CASES)("%s", async (_, contact, expected) => {
      expect(findingsOf(await linter.run(withContact(contact)))).toEqual(contactFindings(expected));
    });
  });

  describe("info object", () => {
    test.each(CONTACT_INFO_CASES)("%s", async (_, info, expected) => {
      expect(findingsOf(await linter.run(base(info)))).toEqual(contactFindings(expected));
    });

    test("reports a document without info once, at the document root", async () => {
      expect(findingsOf(await linter.run(base(OMIT)))).toEqual([["", MSG.noInfo()]]);
      expect(findingsOf(await linter.run(base(OMIT, { contact: CONTACT_COMPLETE })))).toEqual([["", MSG.noInfo()]]);
    });

    test("contacts outside the info object never stand in for it", async () => {
      const doc = base(INFO, { contact: CONTACT_COMPLETE, "x-contact": CONTACT_COMPLETE, components: { ...CONTACT_COMPONENTS, contact: CONTACT_COMPLETE } });
      expect(findingsOf(await linter.run(doc))).toEqual([["info", MSG.noContact()]]);
    });

    test("does not read the info or contact objects of an external file", async () => {
      expect(findingsOf(await linter.run(base({ $ref: "./shared/info.yaml#/info" })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/components/x-info/external" }, { components: { ...CONTACT_COMPONENTS, "x-info": { external: { $ref: "../commerce/info.json" } } } })))).toEqual([]);
      expect(findingsOf(await linter.run(withContact({ $ref: "../commerce/contacts.json#/integration" })))).toEqual([]);
    });
  });

  describe("functionOptions", () => {
    test.each(CONTACT_IGNORED_OPTIONS)("injecting %s changes nothing: name and email stay the only mandatory fields", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual(FAIL);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual(SHARED);
      expect(findingsOf(await custom.run(withContact({ ...CONTACT_MINIMAL, url: "", "x-slack": "" })))).toEqual([]);
      expect(findingsOf(await custom.run(withContact({ url: "https://commerce.example.io/integration", "x-slack": "#commerce" })))).toEqual(
        contactFindings(CONTACT_FIELDS.map((field) => ["info.contact", "missing", field]))
      );
      expect(findingsOf(await custom.run(base(OMIT)))).toEqual([["", MSG.noInfo()]]);
    });
  });

  test("follows chained local references from info, from contact and from its fields, and skips external ones", async () => {
    expect(findingsOf(await linter.run(failSharedRef))).toEqual(SHARED);
  });

  test("only inspects info.contact: contact-like servers, channels, operations, messages, traits, schemas, examples, tags and extensions are ignored", async () => {
    expect(findingsOf(await linter.run(okStructuralEdges))).toEqual([]);
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ info: { contact: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", info: { contact: {} } }]))).toEqual([]);
  });

  test("handles a very large document with a huge contact object and reports exactly the generated violations", async () => {
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual(contactFindings(failLargeGenerated.expected));
    expect(findingsOf(await linter.run(failLargeGenerated.withoutContact))).toEqual(contactFindings(failLargeGenerated.expectedWithoutContact));
  });
});
