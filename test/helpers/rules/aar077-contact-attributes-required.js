const { INFO_COMPONENTS, infoTarget, INFO_VALUE_CASES, findingsFrom, unusableObjectCases } = require("../required-fields");

const CONTACT_FIELDS = ["name", "email"];
const contactTarget = (name) => ({ $ref: `#/components/x-contacts/${name}` });
const CONTACT_COMPLETE = { name: "Commerce Integration", url: "https://commerce.example.io/integration", email: "integration@commerce.example.io" };
const CONTACT_MINIMAL = { name: "Commerce Integration", email: "integration@commerce.example.io" };

const CONTACT_COMPONENTS = {
  ...INFO_COMPONENTS,
  "x-contacts": {
    complete: CONTACT_COMPLETE,
    minimal: CONTACT_MINIMAL,
    alias: contactTarget("complete"),
    aliasTwice: contactTarget("alias"),
    sparse: { url: "https://commerce.example.io/integration", email: " \t " },
    sparseAlias: contactTarget("sparse"),
    empty: {},
    extensionsOnly: { url: "https://commerce.example.io/integration", "x-slack": "#commerce-integration" },
    caseKeys: { Name: "Commerce Integration", EMAIL: "integration@commerce.example.io" },
    cycleA: contactTarget("cycleB"),
    cycleB: contactTarget("cycleA"),
    self: contactTarget("self"),
    list: [CONTACT_COMPLETE],
    text: "Commerce Integration",
    nothing: null,
    external: { $ref: "./shared/contacts.yaml#/integration" },
    "a/b": CONTACT_COMPLETE,
    "with space": CONTACT_MINIMAL,
  },
  "x-info": {
    ...INFO_COMPONENTS["x-info"],
    withContact: { title: "Commerce Events", version: "4.2.0", contact: contactTarget("complete") },
    withContactAlias: infoTarget("withContact"),
    withSparseContact: { title: "Commerce Events", version: "4.2.0", contact: { name: "", url: "https://commerce.example.io/integration" } },
  },
};

const CONTACT_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["an email address", "integration@commerce.example.io", true],
  ["a pointer to a field of another contact", { $ref: "#/components/x-contacts/complete/email" }, true],
  ["a pointer through a chained contact, which Spectral cannot resolve either", { $ref: "#/components/x-contacts/alias/email" }, false],
  ["a pointer to an empty field of another contact", { $ref: "#/components/x-contacts/sparse/email" }, false],
];

const bothMissing = (path) => CONTACT_FIELDS.map((field) => [path, "missing", field]);

const CONTACT_OBJECT_CASES = [
  ["an inline contact with name, url and email", CONTACT_COMPLETE, []],
  ["an inline contact with only name and email", CONTACT_MINIMAL, []],
  ["an inline contact with an empty url and empty extensions", { ...CONTACT_MINIMAL, url: "", "x-slack": null, "x-team": {} }, []],
  ["an empty contact object", {}, bothMissing("info.contact")],
  ["a contact with only a url", { url: "https://commerce.example.io/integration" }, bothMissing("info.contact")],
  ["a contact with only extensions", { "x-slack": "#commerce", "x-owner": "platform-team" }, bothMissing("info.contact")],
  ["a contact without name", { url: "https://commerce.example.io/integration", email: "integration@commerce.example.io" }, [["info.contact", "missing", "name"]]],
  ["a contact without email", { name: "Commerce Integration", url: "https://commerce.example.io/integration" }, [["info.contact", "missing", "email"]]],
  ["a contact whose keys differ in case", { Name: "Commerce Integration", NAME: "Commerce", Email: "a@commerce.example.io", EMAIL: "b@commerce.example.io" }, bothMissing("info.contact")],
  ["a contact with look-alike keys", { "contact-name": "Commerce", fullName: "Commerce Integration", mail: "a@commerce.example.io", "e-mail": "b@commerce.example.io", emailAddress: "c@commerce.example.io" }, bothMissing("info.contact")],
  ["a contact with a blank name and a null email", { name: "  ", email: null }, [["info.contact.name", "empty", "name"], ["info.contact.email", "empty", "email"]]],
  ["a reference to a complete contact", contactTarget("complete"), []],
  ["a reference to a contact with only name and email", contactTarget("minimal"), []],
  ["a chained reference", contactTarget("alias"), []],
  ["a reference chained twice", contactTarget("aliasTwice"), []],
  ["a reference with siblings, which are ignored", { ...contactTarget("complete"), name: "", email: null }, []],
  ["a reference to an empty contact with populated siblings, which are ignored", { $ref: "#/components/x-contacts/empty", ...CONTACT_MINIMAL }, bothMissing("components.x-contacts.empty")],
  ["a pointer into an array item", { $ref: "#/components/x-contacts/list/0" }, []],
  ["an escaped pointer", { $ref: "#/components/x-contacts/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-contacts/with%20space" }, []],
  ["an external reference", { $ref: "./shared/contacts.yaml#/integration" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/contact.yaml" }, []],
  ["a local alias of an external contact", contactTarget("external"), []],
  ["a reference to a sparse contact", contactTarget("sparse"), [["components.x-contacts.sparse", "missing", "name"], ["components.x-contacts.sparse.email", "empty", "email"]]],
  ["a chained reference to a sparse contact", contactTarget("sparseAlias"), [["components.x-contacts.sparse", "missing", "name"], ["components.x-contacts.sparse.email", "empty", "email"]]],
  ["a reference to an empty contact", contactTarget("empty"), bothMissing("components.x-contacts.empty")],
  ["a reference to a contact with only a url and extensions", contactTarget("extensionsOnly"), bothMissing("components.x-contacts.extensionsOnly")],
  ["a reference to a contact whose keys differ in case", contactTarget("caseKeys"), bothMissing("components.x-contacts.caseKeys")],
  ...unusableObjectCases(contactTarget, { text: "Commerce Integration", item: CONTACT_COMPLETE }, () => [["info.contact", "noContact"]]),
  ["an email instead of an object", "integration@commerce.example.io", [["info.contact", "noContact"]]],
  ["a pointer past the end of an array", { $ref: "#/components/x-contacts/list/3" }, [["info.contact", "noContact"]]],
  ["a reference to the info contact itself", { $ref: "#/info/contact" }, [["info.contact", "noContact"]]],
  ["a self reference", contactTarget("self"), [["info.contact", "noContact"]]],
];

const CONTACT_INFO_CASES = [
  ["an inline info object with a complete contact", { title: "Commerce Events", version: "4.2.0", contact: CONTACT_COMPLETE }, []],
  ["an info object with only a contact", { contact: CONTACT_MINIMAL }, []],
  ["an info object without contact", { title: "Commerce Events", version: "4.2.0", description: "Order events." }, [["info", "noContact"]]],
  ["an empty info object", {}, [["info", "noContact"]]],
  ["an info object whose contact key differs in case", { title: "Commerce Events", Contact: CONTACT_COMPLETE, CONTACT: CONTACT_MINIMAL }, [["info", "noContact"]]],
  ["an info object with contact look-alikes", { title: "Commerce Events", "x-contact": CONTACT_COMPLETE, contacts: [CONTACT_COMPLETE], owner: CONTACT_MINIMAL }, [["info", "noContact"]]],
  ["a reference to an info object with a referenced contact", infoTarget("withContact"), []],
  ["a chained reference to that info object", infoTarget("withContactAlias"), []],
  ["a reference with siblings, which are ignored", { ...infoTarget("withContact"), contact: null }, []],
  ["a reference to an info object with a sparse contact", infoTarget("withSparseContact"), [["components.x-info.withSparseContact.contact", "missing", "email"], ["components.x-info.withSparseContact.contact.name", "empty", "name"]]],
  ["a reference to an info object without contact", infoTarget("complete"), [["components.x-info.complete", "noContact"]]],
  ["a chained reference to an info object without contact", infoTarget("alias"), [["components.x-info.complete", "noContact"]]],
  ["a reference to an empty info object", infoTarget("empty"), [["components.x-info.empty", "noContact"]]],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ...unusableObjectCases(infoTarget, { text: "Commerce Events", item: { title: "Commerce Events", contact: CONTACT_COMPLETE }, pointer: "withContact" }, () => [["info", "noInfo"]]),
];

const CONTACT_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["fields-to-apply with only the url", { "fields-to-apply": "url" }],
  ["fields-to-apply with only the name", { "fields-to-apply": "name" }],
  ["fields-to-apply with every contact field and an extension", { "fields-to-apply": "name,url,email,x-slack" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a properties list like the core truthy description", { properties: ["url"] }],
  ["a fields array", { fields: ["url", "x-slack"] }],
  ["a required list", { required: ["url"] }],
  ["a field option like core truthy", { field: "url" }],
  ["a pattern", { pattern: "^x-" }],
  ["null values", { "fields-to-apply": null, properties: null }],
  ["non-string values", { "fields-to-apply": 42, properties: true, required: "url" }],
];

const CONTACT_MESSAGES = {
  missing: (field) => `AAR077: The 'contact' object must declare '${field}'.`,
  empty: (field) => `AAR077: The '${field}' of the 'contact' object must not be empty.`,
  noContact: () => "AAR077: The 'info' object must declare a 'contact' object with 'name' and 'email'.",
  noInfo: () => "AAR077: The document must declare 'info.contact' with 'name' and 'email'.",
};

const contactFindings = findingsFrom(CONTACT_MESSAGES);

module.exports = {
  CONTACT_FIELDS,
  contactTarget,
  CONTACT_COMPLETE,
  CONTACT_MINIMAL,
  CONTACT_COMPONENTS,
  CONTACT_VALUE_CASES,
  CONTACT_OBJECT_CASES,
  CONTACT_INFO_CASES,
  CONTACT_IGNORED_OPTIONS,
  CONTACT_MESSAGES,
  contactFindings,
};
