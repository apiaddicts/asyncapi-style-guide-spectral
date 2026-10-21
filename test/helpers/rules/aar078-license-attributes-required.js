const { INFO_COMPONENTS, infoTarget, INFO_VALUE_CASES, findingsFrom, unusableObjectCases } = require("../required-fields");

const LICENSE_FIELDS = ["name", "url"];
const licenseTarget = (name) => ({ $ref: `#/components/x-licenses/${name}` });
const LICENSE_COMPLETE = { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0", "x-spdx-id": "Apache-2.0" };
const LICENSE_MINIMAL = { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" };

const LICENSE_COMPONENTS = {
  ...INFO_COMPONENTS,
  "x-licenses": {
    complete: LICENSE_COMPLETE,
    minimal: LICENSE_MINIMAL,
    alias: licenseTarget("complete"),
    aliasTwice: licenseTarget("alias"),
    sparse: { url: " \t ", "x-spdx-id": "MIT" },
    sparseAlias: licenseTarget("sparse"),
    empty: {},
    extensionsOnly: { "x-spdx-id": "Apache-2.0", "x-legal-review": "2026-03" },
    lookAlikes: { identifier: "Apache-2.0", title: "Apache 2.0", href: "https://www.apache.org/licenses/LICENSE-2.0" },
    caseKeys: { Name: "Apache 2.0", URL: "https://www.apache.org/licenses/LICENSE-2.0" },
    cycleA: licenseTarget("cycleB"),
    cycleB: licenseTarget("cycleA"),
    self: licenseTarget("self"),
    list: [LICENSE_COMPLETE],
    text: "Apache-2.0",
    nothing: null,
    external: { $ref: "./shared/licenses.yaml#/apache" },
    "a/b": LICENSE_COMPLETE,
    "with space": LICENSE_MINIMAL,
  },
  "x-info": {
    ...INFO_COMPONENTS["x-info"],
    withLicense: { title: "Commerce Events", version: "4.2.0", license: licenseTarget("complete") },
    withLicenseAlias: infoTarget("withLicense"),
    withSparseLicense: { title: "Commerce Events", version: "4.2.0", license: { name: "", "x-spdx-id": "MIT" } },
  },
};

const LICENSE_VALUE_CASES = [
  ...INFO_VALUE_CASES,
  ["an absolute URL", "https://www.apache.org/licenses/LICENSE-2.0", true],
  ["a relative URL, whose format is not checked", "/legal/LICENSE.txt", true],
  ["an SPDX identifier", "Apache-2.0", true],
  ["a pointer to a field of another license", { $ref: "#/components/x-licenses/complete/url" }, true],
  ["a pointer through a chained license, which Spectral cannot resolve either", { $ref: "#/components/x-licenses/alias/url" }, false],
  ["a pointer to an empty field of another license", { $ref: "#/components/x-licenses/sparse/url" }, false],
];

const bothLicenseFieldsMissing = (path) => LICENSE_FIELDS.map((field) => [path, "missing", field]);

const LICENSE_OBJECT_CASES = [
  ["an inline license with name, url and an extension", LICENSE_COMPLETE, []],
  ["an inline license with only name and url", LICENSE_MINIMAL, []],
  ["an inline license with empty extensions and look-alike keys", { ...LICENSE_MINIMAL, identifier: "", "x-spdx-id": null, "x-legal": {} }, []],
  ["an empty license object", {}, bothLicenseFieldsMissing("info.license")],
  ["a license with only an SPDX identifier", { identifier: "Apache-2.0" }, bothLicenseFieldsMissing("info.license")],
  ["a license with only extensions", { "x-spdx-id": "Apache-2.0", "x-legal-review": "2026-03" }, bothLicenseFieldsMissing("info.license")],
  ["a license without name", { url: "https://www.apache.org/licenses/LICENSE-2.0", "x-spdx-id": "Apache-2.0" }, [["info.license", "missing", "name"]]],
  ["a license without url", { name: "Proprietary", "x-spdx-id": "LicenseRef-Proprietary" }, [["info.license", "missing", "url"]]],
  ["a license whose keys differ in case", { Name: "Apache 2.0", NAME: "Apache", Url: "https://www.apache.org/licenses/LICENSE-2.0", URL: "https://opensource.org/licenses/Apache-2.0" }, bothLicenseFieldsMissing("info.license")],
  [
    "a license with look-alike keys",
    { title: "Apache 2.0", licenseName: "Apache 2.0", "license-name": "Apache 2.0", identifier: "Apache-2.0", href: "https://www.apache.org/licenses/LICENSE-2.0", link: "https://opensource.org/licenses/Apache-2.0", uri: "https://spdx.org/licenses/Apache-2.0", licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0" },
    bothLicenseFieldsMissing("info.license"),
  ],
  ["a license with a blank name and a null url", { name: "  ", url: null }, [["info.license.name", "empty", "name"], ["info.license.url", "empty", "url"]]],
  ["a reference to a complete license", licenseTarget("complete"), []],
  ["a reference to a license with only name and url", licenseTarget("minimal"), []],
  ["a chained reference", licenseTarget("alias"), []],
  ["a reference chained twice", licenseTarget("aliasTwice"), []],
  ["a reference with siblings, which are ignored", { ...licenseTarget("complete"), name: "", url: null }, []],
  ["a reference to an empty license with populated siblings, which are ignored", { $ref: "#/components/x-licenses/empty", ...LICENSE_MINIMAL }, bothLicenseFieldsMissing("components.x-licenses.empty")],
  ["a pointer into an array item", { $ref: "#/components/x-licenses/list/0" }, []],
  ["an escaped pointer", { $ref: "#/components/x-licenses/a~1b" }, []],
  ["a percent-encoded pointer", { $ref: "#/components/x-licenses/with%20space" }, []],
  ["an external reference", { $ref: "./shared/licenses.yaml#/apache" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/legal/license.yaml" }, []],
  ["a local alias of an external license", licenseTarget("external"), []],
  ["a reference to a sparse license", licenseTarget("sparse"), [["components.x-licenses.sparse", "missing", "name"], ["components.x-licenses.sparse.url", "empty", "url"]]],
  ["a chained reference to a sparse license", licenseTarget("sparseAlias"), [["components.x-licenses.sparse", "missing", "name"], ["components.x-licenses.sparse.url", "empty", "url"]]],
  ["a reference to an empty license", licenseTarget("empty"), bothLicenseFieldsMissing("components.x-licenses.empty")],
  ["a reference to a license with only extensions", licenseTarget("extensionsOnly"), bothLicenseFieldsMissing("components.x-licenses.extensionsOnly")],
  ["a reference to a license with only look-alike keys", licenseTarget("lookAlikes"), bothLicenseFieldsMissing("components.x-licenses.lookAlikes")],
  ["a reference to a license whose keys differ in case", licenseTarget("caseKeys"), bothLicenseFieldsMissing("components.x-licenses.caseKeys")],
  ...unusableObjectCases(licenseTarget, { text: "Apache-2.0", item: LICENSE_COMPLETE }, () => [["info.license", "noLicense"]]),
  ["a license name instead of an object", "Apache License 2.0", [["info.license", "noLicense"]]],
  ["a URL instead of an object", "https://www.apache.org/licenses/LICENSE-2.0", [["info.license", "noLicense"]]],
  ["a list of SPDX identifiers", ["Apache-2.0", "MIT"], [["info.license", "noLicense"]]],
  ["a pointer past the end of an array", { $ref: "#/components/x-licenses/list/3" }, [["info.license", "noLicense"]]],
  ["a reference to the info license itself", { $ref: "#/info/license" }, [["info.license", "noLicense"]]],
  ["a self reference", licenseTarget("self"), [["info.license", "noLicense"]]],
];

const LICENSE_INFO_CASES = [
  ["an inline info object with a complete license", { title: "Commerce Events", version: "4.2.0", license: LICENSE_COMPLETE }, []],
  ["an info object with only a license", { license: LICENSE_MINIMAL }, []],
  ["an info object without license", { title: "Commerce Events", version: "4.2.0", description: "Order events." }, [["info", "noLicense"]]],
  ["an empty info object", {}, [["info", "noLicense"]]],
  ["an info object whose license key differs in case", { title: "Commerce Events", License: LICENSE_COMPLETE, LICENSE: LICENSE_MINIMAL }, [["info", "noLicense"]]],
  ["an info object with the British spelling licence", { title: "Commerce Events", licence: LICENSE_COMPLETE }, [["info", "noLicense"]]],
  ["an info object with license look-alikes", { title: "Commerce Events", "x-license": LICENSE_COMPLETE, licenses: [LICENSE_COMPLETE], termsOfService: "https://www.apache.org/licenses/LICENSE-2.0" }, [["info", "noLicense"]]],
  ["a reference to an info object with a referenced license", infoTarget("withLicense"), []],
  ["a chained reference to that info object", infoTarget("withLicenseAlias"), []],
  ["a reference with siblings, which are ignored", { ...infoTarget("withLicense"), license: null }, []],
  ["a reference to an info object with a sparse license", infoTarget("withSparseLicense"), [["components.x-info.withSparseLicense.license", "missing", "url"], ["components.x-info.withSparseLicense.license.name", "empty", "name"]]],
  ["a reference to an info object without license", infoTarget("complete"), [["components.x-info.complete", "noLicense"]]],
  ["a chained reference to an info object without license", infoTarget("alias"), [["components.x-info.complete", "noLicense"]]],
  ["a reference to an empty info object", infoTarget("empty"), [["components.x-info.empty", "noLicense"]]],
  ["an external reference", { $ref: "./shared/info.yaml#/info" }, []],
  ["an external whole-file reference", { $ref: "https://specs.example.io/commerce/info.yaml" }, []],
  ...unusableObjectCases(infoTarget, { text: "Commerce Events", item: { title: "Commerce Events", license: LICENSE_COMPLETE }, pointer: "withLicense" }, () => [["info", "noInfo"]]),
];

const LICENSE_IGNORED_OPTIONS = [
  ["an empty object", {}],
  ["fields-to-apply with only the name", { "fields-to-apply": "name" }],
  ["fields-to-apply with only the url", { "fields-to-apply": "url" }],
  ["fields-to-apply with an identifier and an extension", { "fields-to-apply": "name,url,identifier,x-spdx-id" }],
  ["an empty fields-to-apply", { "fields-to-apply": "" }],
  ["a properties list like the core truthy description", { properties: ["name"] }],
  ["a fields array", { fields: ["identifier", "x-spdx-id"] }],
  ["a required list", { required: ["identifier"] }],
  ["a field option like core truthy", { field: "name" }],
  ["a pattern", { pattern: "^x-" }],
  ["null values", { "fields-to-apply": null, properties: null }],
  ["non-string values", { "fields-to-apply": 42, properties: true, required: "identifier" }],
];

const LICENSE_MESSAGES = {
  missing: (field) => `AAR078: The 'license' object must declare '${field}'.`,
  empty: (field) => `AAR078: The '${field}' of the 'license' object must not be empty.`,
  noLicense: () => "AAR078: The 'info' object must declare a 'license' object with 'name' and 'url'.",
  noInfo: () => "AAR078: The document must declare 'info.license' with 'name' and 'url'.",
};

const licenseFindings = findingsFrom(LICENSE_MESSAGES);

module.exports = {
  LICENSE_FIELDS,
  licenseTarget,
  LICENSE_COMPLETE,
  LICENSE_MINIMAL,
  LICENSE_COMPONENTS,
  LICENSE_VALUE_CASES,
  LICENSE_OBJECT_CASES,
  LICENSE_INFO_CASES,
  LICENSE_IGNORED_OPTIONS,
  LICENSE_MESSAGES,
  licenseFindings,
};
