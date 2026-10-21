const { chars } = require("../utils");

const DEFAULT_TYPES = ["scramSha512", "X509"];
const OPTION = "allowed-security-types";
const ASYNCAPI_TYPES = ["userPassword", "apiKey", "X509", "symmetricEncryption", "asymmetricEncryption", "httpApiKey", "http", "oauth2", "openIdConnect", "plain", "scramSha256", "scramSha512", "gssapi"];

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const listOf = (types) => types.map((type) => `'${shown(type)}'`).join(", ");
const subject = (scheme) => (scheme === undefined ? "Security scheme type" : `Security scheme '${shown(scheme)}' type`);
const notApproved = (scheme, type, types = DEFAULT_TYPES) => `AAR089: ${subject(scheme)} '${shown(type)}' must be an approved mechanism: ${listOf(types)}.`;
const notString = (scheme) => `AAR089: ${subject(scheme)} must be a string.`;

const TYPE_CASES = {
  approved: DEFAULT_TYPES,
  rejected: [
    ...ASYNCAPI_TYPES.filter((type) => !DEFAULT_TYPES.includes(type)),
    "mutualTLS",
    "mTLS",
    "mtls",
    "MutualTLS",
    "mutualTls",
    "tls",
    "TLS",
    "ssl",
    "SSL",
    "x509",
    "X.509",
    "X-509",
    "x.509",
    "X509v3",
    "X509Certificate",
    "certificate",
    "clientCertificate",
    "SCRAM-SHA-512",
    "scram-sha-512",
    "SCRAM_SHA_512",
    "ScramSha512",
    "scramsha512",
    "SCRAMSHA512",
    "scramSHA512",
    "scramSha-512",
    "scramSha_512",
    "scramSha5120",
    "scramSha51",
    "scramSha",
    "scram",
    "SCRAM",
    "sasl",
    "SASL_SSL",
    "SASL_PLAINTEXT",
    "SASL/SCRAM-SHA-512",
    "PLAIN",
    "Plain",
    "OAUTHBEARER",
    "bearer",
    "basic",
    "jwt",
    "kerberos",
    "GSSAPI",
    "anonymous",
    "none",
    "null",
    "true",
    "0",
    "",
    " ",
    " scramSha512",
    "scramSha512 ",
    "\tX509",
    "X509\n",
    "\r\nscramSha512",
    "X509\u0000",
    "scramSha512,X509",
    "scramSha512;X509",
    "scramSha512|X509",
    "scramSha512 X509",
    "scramSha512/X509",
    "{type}",
    "${SECURITY_TYPE}",
    "<type>",
    "constructor",
    "toString",
    "valueOf",
    "__proto__",
    "hasOwnProperty",
    `X${chars(0xff15)}09`,
    `${chars(0x425)}509`,
    `scramSha${chars(0xff15, 0xff11, 0xff12)}`,
    `scram${chars(0x405)}ha512`,
    `X509${chars(0x200b)}`,
    `${chars(0xfeff)}X509`,
    `${chars(0xa0)}scramSha512`,
    `scramSha512${chars(0xad)}`,
    `X5${chars(0x2060)}09`,
    `scramSha512${chars(0x2028)}`,
  ],
};

const NON_STRING_TYPES = [512, 509, 0, 1, -1, 3.5, true, false, [], ["scramSha512"], ["scramSha512", "X509"], {}, { type: "scramSha512" }, { $ref: "#/components/x-types/scram" }];
const ABSENT_TYPES = [undefined, null];
const NON_OBJECT_SCHEMES = [null, "scramSha512", "plain", 42, true, [], [{ type: "plain" }]];
const NON_ARRAY_SECURITY = [null, "saslPlain", 42, true, {}, { saslPlain: [] }, { type: "plain" }];
const NON_OBJECT_ITEMS = [null, "saslPlain", 42, true, [], [{ saslPlain: [] }], [{ type: "plain" }]];

const PROBE_TYPES = [...ASYNCAPI_TYPES, "mutualTLS", "SCRAM-SHA-512", "scramSha512 ", ""];
const APPROVABLE_PROBES = PROBE_TYPES.slice(0, 15);

const PARAM_CASES = [
  ["the shipped list written explicitly", "scramSha512,X509", ["X509", "scramSha512"], ["scramSha512", "X509"]],
  ["SCRAM-SHA-512 only", "scramSha512", ["scramSha512"], ["scramSha512"]],
  ["client certificates only", "X509", ["X509"], ["X509"]],
  ["both SCRAM variants", "scramSha256,scramSha512", ["scramSha256", "scramSha512"], ["scramSha256", "scramSha512"]],
  ["the OpenAPI mutualTLS spelling", "mutualTLS", ["mutualTLS"], ["mutualTLS"]],
  ["mutualTLS next to the shipped list", "scramSha512,X509,mutualTLS", ["X509", "scramSha512", "mutualTLS"], ["scramSha512", "X509", "mutualTLS"]],
  ["types in another order", "X509,scramSha512", ["X509", "scramSha512"], ["X509", "scramSha512"]],
  ["padded entries", "  scramSha512 ,\tX509\n", ["X509", "scramSha512"], ["scramSha512", "X509"]],
  ["the HTTP and OAuth mechanisms of a WebSocket gateway", "http,httpApiKey,oauth2,openIdConnect", ["httpApiKey", "http", "oauth2", "openIdConnect"], ["http", "httpApiKey", "oauth2", "openIdConnect"]],
  ["every Kafka SASL mechanism", "plain,scramSha256,scramSha512,gssapi", ["plain", "scramSha256", "scramSha512", "gssapi"], ["plain", "scramSha256", "scramSha512", "gssapi"]],
  ["a spelling compared as written", "SCRAM-SHA-512", ["SCRAM-SHA-512"], ["SCRAM-SHA-512"]],
  ["several spellings of one mechanism", "scramSha512,SCRAM-SHA-512", ["scramSha512", "SCRAM-SHA-512"], ["scramSha512", "SCRAM-SHA-512"]],
  ["an array", ["scramSha512", "X509"], ["X509", "scramSha512"], ["scramSha512", "X509"]],
  ["an array with comma-separated items and noise", ["scramSha512,plain", 42, null, " X509 ", {}, 3.4], ["X509", "plain", "scramSha512"], ["scramSha512", "plain", "X509"]],
  ["empty entries", "scramSha512,, ,X509,", ["X509", "scramSha512"], ["scramSha512", "X509"]],
  ["repeated entries", "X509,X509 , X509", ["X509"], ["X509"]],
  ["a type absent from the document", "kerberos", [], ["kerberos"]],
  ["every AsyncAPI type", ASYNCAPI_TYPES.join(","), ASYNCAPI_TYPES, ASYNCAPI_TYPES],
  ["every probe type but the unapprovable ones", APPROVABLE_PROBES.join(","), APPROVABLE_PROBES, APPROVABLE_PROBES],
];

const FALLBACK_VALUES = [undefined, "", "   ", ",", " , ,, ", "\t\n", null, 0, 512, 3.5, true, false, {}, [], [""], [" , "], [null, 7], [512, 256], [{}], [["plain"]], { [OPTION]: "plain" }];

const IGNORED_OPTIONS = [
  ["allowedTypes", { allowedTypes: ["plain", "oauth2", "userPassword"] }],
  ["values", { values: ["plain"] }],
  ["pattern", { pattern: ".*" }],
  ["fields-to-apply", { "fields-to-apply": "plain" }],
  ["valid-versions", { "valid-versions": "plain" }],
  ["allowed-server-types", { "allowed-server-types": "plain" }],
  ["allowed-security-type", { "allowed-security-type": "plain" }],
  ["allowed-security-schemes", { "allowed-security-schemes": "plain" }],
  ["allowed-mechanisms", { "allowed-mechanisms": "plain" }],
  ["allowedSecurityTypes", { allowedSecurityTypes: "plain" }],
  ["ALLOWED-SECURITY-TYPES", { "ALLOWED-SECURITY-TYPES": "plain" }],
];

module.exports = {
  DEFAULT_TYPES,
  OPTION,
  ASYNCAPI_TYPES,
  shown,
  notApproved,
  notString,
  TYPE_CASES,
  NON_STRING_TYPES,
  ABSENT_TYPES,
  NON_OBJECT_SCHEMES,
  NON_ARRAY_SECURITY,
  NON_OBJECT_ITEMS,
  PROBE_TYPES,
  APPROVABLE_PROBES,
  PARAM_CASES,
  FALLBACK_VALUES,
  IGNORED_OPTIONS,
};
