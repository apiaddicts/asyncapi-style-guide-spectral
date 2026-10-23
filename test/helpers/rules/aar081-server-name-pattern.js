const { chars } = require("../utils");

const DEFAULT_PATTERN = "^[A-Za-z0-9_-]+$";
const NEVER = "(?!)";

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) => value.replace(/[\x00-\x1f\x7f]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const mismatch = (name, pattern = DEFAULT_PATTERN) => `AAR081: Server name '${shown(name)}' must match '${shown(pattern)}'.`;

const NAME_CASES = {
  valid: [
    "kafka",
    "eventstreams",
    "production",
    "Production",
    "PRODUCTION",
    "kafkaProd",
    "KafkaProd",
    "kafka-prod",
    "kafka_prod",
    "kafka-secure-eu-west-1",
    "kafka01",
    "01kafka",
    "a",
    "Z",
    "0",
    "42",
    "-",
    "_",
    "--",
    "-kafka",
    "kafka-",
    "_kafka_",
    "x-kafka",
    "X-Kafka",
    "x-",
    "true",
    "null",
    "constructor",
    "toString",
    "valueOf",
    "k".repeat(300),
  ],
  invalid: [
    "",
    " ",
    " kafka",
    "kafka ",
    "kafka prod",
    "kafka.prod",
    "kafka.quality.es",
    "1.5",
    ".kafka",
    "kafka.",
    "eu/west",
    "kafka~eu",
    "omie~150",
    "kafka~0dr",
    "~01",
    "eu~1west/a",
    "kafka:9092",
    "kafka,eventstreams",
    "kafka@eu",
    "kafka+ssl",
    "kafka#1",
    "kafka?",
    "kafka*",
    "kafka!",
    "kafka=1",
    "kafka'",
    'kafka"',
    "kafka\\eu",
    "kafka|eu",
    "kafka(eu)",
    "kafka[0]",
    "{env}",
    "$kafka",
    "kafka%20eu",
    "kafka\t",
    "\tkafka",
    "kafka\n",
    "\r\nkafka",
    "kafka\u0000",
    `espa${chars(0xf1)}a`,
    `kafk${chars(0xe1)}`,
    `k${chars(0x430)}fka`,
    `${chars(0xff4b)}afka`,
    `kafka${chars(0x200b)}`,
    `${chars(0xfeff)}kafka`,
    `${chars(0xa0)}kafka`,
    `kafka${chars(0x2013)}prod`,
    `kafka${chars(0xd83d, 0xde80)}`,
  ],
};

const PROBE_NAMES = ["kafka", "eventstreams", "Production", "kafka-prod", "kafka_prod", "kafkaProd", "KAFKA", "kafka01", "x-kafka", "-", "kafka.prod", "kafka prod", "", "eu/west", `espa${chars(0xf1)}a`];

const DEFAULT_ACCEPTED = PROBE_NAMES.slice(0, 10);

const PATTERN_CASES = [
  ["^[a-z][a-z0-9-]*$", ["kafka", "eventstreams", "kafka-prod", "kafka01", "x-kafka"]],
  ["^[a-z][a-zA-Z0-9]*$", ["kafka", "eventstreams", "kafkaProd", "kafka01"]],
  ["^(eventstreams|kafka)$", ["kafka", "eventstreams"]],
  ["^[a-z]+-(dev|pre|prod)$", ["kafka-prod"]],
  ["/^[a-z0-9-]+$/i", ["kafka", "eventstreams", "Production", "kafka-prod", "kafkaProd", "KAFKA", "kafka01", "x-kafka", "-"]],
  ["^[A-Za-z0-9_.-]+$", [...DEFAULT_ACCEPTED, "kafka.prod"]],
  ["/^[\\p{L}\\p{N}_-]+$/u", [...DEFAULT_ACCEPTED, `espa${chars(0xf1)}a`]],
  ["^(?!x-)[A-Za-z0-9_-]+$", DEFAULT_ACCEPTED.filter((name) => name !== "x-kafka")],
  ["kafka", ["kafka", "kafka-prod", "kafka_prod", "kafkaProd", "kafka01", "x-kafka", "kafka.prod", "kafka prod"]],
  ["/kafka/i", ["kafka", "kafka-prod", "kafka_prod", "kafkaProd", "KAFKA", "kafka01", "x-kafka", "kafka.prod", "kafka prod"]],
  ["\\s", ["kafka prod"]],
  ["^[^/]*$", PROBE_NAMES.filter((name) => name !== "eu/west")],
  [".*", PROBE_NAMES],
  ["^$", [""]],
  [NEVER, []],
];

const FALLBACK_PATTERNS = ["", "   ", "\t\n", "[", "(", "*", "^([a-z]$", "/abc/z", "/[/", null, undefined, 0, 42, true, {}, [], ["^kafka$"], { match: ".*" }];

const NON_OBJECT_SERVER_MAPS = [null, [], [{ url: "kafka.example.org", protocol: "kafka" }], "kafka.prod", 42, true];

const ENTRY_VALUES = [null, "kafka.example.org:9092", 9092, true, [], {}, { $ref: "#/components/servers/doesNotExist" }, { $ref: "./servers.yaml#/servers/kafka" }];

const SERVER_SETS = {
  regional: {
    kafka: { $ref: "#/components/servers/drKafka" },
    "kafka.prod": { $ref: "#/components/servers/drKafka" },
    "eu west": { $ref: "#/components/servers/archive" },
    kafkaProd: { $ref: "#/components/servers/archive" },
  },
  alias: { $ref: "#/components/x-server-sets/regional" },
  "eu/west~primary": { kafka: { $ref: "#/components/servers/drKafka" }, "staging.eu": { $ref: "#/components/servers/archive" } },
  "north america": { "mqtt/us": { $ref: "#/components/servers/archive" }, eventstreams: { $ref: "#/components/servers/drKafka" } },
  loopA: { $ref: "#/components/x-server-sets/loopB" },
  loopB: { $ref: "#/components/x-server-sets/loopA" },
  list: [{ "kafka.prod": { $ref: "#/components/servers/drKafka" } }],
};

const MAP_REF_CASES = [
  ["a local reference", "#/components/x-server-sets/regional", ["components.x-server-sets.regional.kafka.prod", "components.x-server-sets.regional.eu west"]],
  ["a chained reference", "#/components/x-server-sets/alias", ["components.x-server-sets.regional.kafka.prod", "components.x-server-sets.regional.eu west"]],
  ["an escaped pointer", "#/components/x-server-sets/eu~1west~0primary", ["components.x-server-sets.eu/west~primary.staging.eu"]],
  ["a percent-encoded pointer", "#/components/x-server-sets/north%20america", ["components.x-server-sets.north america.mqtt/us"]],
  ["a reference to components.servers", "#/components/servers", ["components.servers.dr.kafka", "components.servers.archive store"]],
  ["a reference with sibling keys", { $ref: "#/components/x-server-sets/regional", "rabbit mq": { protocol: "amqp" } }, ["components.x-server-sets.regional.kafka.prod", "components.x-server-sets.regional.eu west"]],
  ["an external file", "./servers.yaml#/servers", []],
  ["an external URL", "https://specs.example.org/servers.yaml#/servers", []],
  ["a relative file path shaped like a local pointer", "./components/x-server-sets/regional", []],
  ["a dangling pointer", "#/components/x-server-sets/missing", []],
  ["a cyclic reference", "#/components/x-server-sets/loopA", []],
  ["the document root", "#", []],
  ["an empty reference", "", []],
  ["a scalar", "#/info/title", []],
  ["an array", "#/components/x-server-sets/list", []],
  ["a pointer without a leading slash", "#components/x-server-sets/regional", []],
  ["a malformed percent-encoding", "#/components/x-server-sets/%E0%A4%A", []],
  ["a pointer through another reference", "#/components/x-server-sets/alias/kafka.prod", []],
  ["a non-string reference", 42, []],
];

const COMPONENT_SERVERS = { "dr.kafka": { url: "kafka-dr.quality.es:9092", protocol: "kafka" }, "archive store": { url: "archive.quality.es:9092", protocol: "kafka" } };

const mapRefDocument = (base, servers) =>
  base({
    servers: typeof servers === "object" && servers !== null ? servers : { $ref: servers },
    components: { servers: { drKafka: COMPONENT_SERVERS["dr.kafka"], archive: COMPONENT_SERVERS["archive store"], ...COMPONENT_SERVERS }, "x-server-sets": SERVER_SETS },
  });

module.exports = {
  DEFAULT_PATTERN,
  NEVER,
  shown,
  mismatch,
  NAME_CASES,
  PROBE_NAMES,
  DEFAULT_ACCEPTED,
  PATTERN_CASES,
  FALLBACK_PATTERNS,
  NON_OBJECT_SERVER_MAPS,
  ENTRY_VALUES,
  MAP_REF_CASES,
  mapRefDocument,
};
