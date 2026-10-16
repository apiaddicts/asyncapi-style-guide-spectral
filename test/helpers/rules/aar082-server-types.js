const { chars } = require("../utils");

const DEFAULT_TYPES = ["eventstreams", "kafka"];
const OPTION = "allowed-server-types";

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const shown = (value) => value.replace(/[\x00-\x1f\x7f]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const notApproved = (name, types = DEFAULT_TYPES) =>
  `AAR082: Server name '${shown(name)}' must be an approved server type: ${types.map((type) => `'${shown(type)}'`).join(", ")}.`;

const NAME_CASES = {
  approved: ["eventstreams", "kafka"],
  rejected: [
    "Kafka",
    "KAFKA",
    "kafkA",
    "EventStreams",
    "EVENTSTREAMS",
    "eventStreams",
    "Eventstreams",
    "event-streams",
    "event_streams",
    "event streams",
    "eventstream",
    "eventstreams2",
    "ibm-eventstreams",
    "ibmeventstreams",
    "eventstreams-eu",
    "eventstreams.prod",
    "kafka-secure",
    "kafka-ssl",
    "kafka1",
    "kafka-dev",
    "kafka-pro",
    "kafkaProd",
    "kafka.prod",
    "kafka/eu",
    "kafka~eu",
    "kafka:9092",
    "kafka_cluster",
    "kafkas",
    "kafk",
    "akafka",
    "kafka,eventstreams",
    " kafka",
    "kafka ",
    "ka fka",
    "kafka\t",
    "\tkafka",
    "kafka\n",
    "\r\nkafka",
    "kafka\u0000",
    "production",
    "staging",
    "development",
    "dev",
    "pre",
    "pro",
    "test",
    "local",
    "localhost",
    "confluent",
    "msk",
    "rabbitmq",
    "amqp",
    "mqtt",
    "mosquitto",
    "nats",
    "pulsar",
    "solace",
    "ibmmq",
    "websocket",
    "http",
    "x-kafka",
    "x-eventstreams",
    "X-kafka",
    "",
    "0",
    "42",
    "-1",
    "true",
    "null",
    "~",
    "*",
    "{env}",
    "{kafka}",
    `${chars(0xff4b)}afka`,
    `k${chars(0x430)}fka`,
    `kafka${chars(0x200b)}`,
    `${chars(0xfeff)}kafka`,
    `${chars(0xa0)}kafka`,
    `eventstr${chars(0xe9)}ams`,
    "constructor",
    "toString",
    "valueOf",
  ],
};

const PROBE_NAMES = [
  "eventstreams",
  "kafka",
  "Kafka",
  "EventStreams",
  "production",
  "staging",
  "kafka-secure",
  "event-streams",
  "mqtt",
  "rabbitmq",
  "x-kafka",
  "kafka streams",
  " kafka",
  "",
];

const PARAM_CASES = [
  ["the shipped list written explicitly", "eventstreams,kafka", ["eventstreams", "kafka"], ["eventstreams", "kafka"]],
  ["a single type", "kafka", ["kafka"], ["kafka"]],
  ["the other single type", "eventstreams", ["eventstreams"], ["eventstreams"]],
  ["the shipped types in another order", "kafka,eventstreams", ["eventstreams", "kafka"], ["kafka", "eventstreams"]],
  ["padded entries", "  kafka ,\teventstreams\n", ["eventstreams", "kafka"], ["kafka", "eventstreams"]],
  ["an upper-case entry, compared as written", "Kafka", ["Kafka"], ["Kafka"]],
  ["several casings of one type", "kafka,Kafka,KAFKA", ["kafka", "Kafka"], ["kafka", "Kafka", "KAFKA"]],
  ["environment names", "production,staging", ["production", "staging"], ["production", "staging"]],
  ["protocols and brokers", "kafka-secure,mqtt,rabbitmq", ["kafka-secure", "mqtt", "rabbitmq"], ["kafka-secure", "mqtt", "rabbitmq"]],
  ["an x- name", "x-kafka", ["x-kafka"], ["x-kafka"]],
  ["an entry with an inner space", "kafka streams", ["kafka streams"], ["kafka streams"]],
  ["an array", ["kafka", "mqtt"], ["kafka", "mqtt"], ["kafka", "mqtt"]],
  ["an array with comma-separated items and noise", ["kafka,production", 42, null, " staging ", {}], ["kafka", "production", "staging"], ["kafka", "production", "staging"]],
  ["empty entries", "kafka,, ,eventstreams,", ["eventstreams", "kafka"], ["kafka", "eventstreams"]],
  ["repeated entries", "kafka,kafka , kafka", ["kafka"], ["kafka"]],
  ["a type absent from the document", "ibm-mq-cluster", [], ["ibm-mq-cluster"]],
  ["every probe name but the unapprovable ones", "eventstreams,kafka,Kafka,EventStreams,production,staging,kafka-secure,event-streams,mqtt,rabbitmq,x-kafka,kafka streams", PROBE_NAMES.slice(0, 12), PROBE_NAMES.slice(0, 12)],
];

const FALLBACK_VALUES = [undefined, "", "   ", ",", " , ,, ", "\t\n", null, 0, 42, true, false, {}, [], [""], [" , "], [null, 7], [{}], { [OPTION]: "production" }];

const NON_OBJECT_SERVER_MAPS = [null, [], [{ url: "kafka.example.org", protocol: "kafka" }], "kafka", 42, true];

const ENTRY_VALUES = [null, "kafka.example.org:9092", 9092, true, [], {}, { $ref: "#/components/servers/doesNotExist" }, { $ref: "./servers.yaml#/servers/kafka" }];

const MAP_REF_CASES = [
  ["a local reference", "#/components/x-server-sets/regional", ["components.x-server-sets.regional.production", "components.x-server-sets.regional.Kafka"]],
  ["a chained reference", "#/components/x-server-sets/alias", ["components.x-server-sets.regional.production", "components.x-server-sets.regional.Kafka"]],
  ["an escaped pointer", "#/components/x-server-sets/eu~1west~0primary", ["components.x-server-sets.eu/west~primary.staging"]],
  ["a percent-encoded pointer", "#/components/x-server-sets/north%20america", ["components.x-server-sets.north america.mqtt"]],
  ["a reference to components.servers", "#/components/servers", ["components.servers.drKafka", "components.servers.archive"]],
  ["a reference with sibling keys", { $ref: "#/components/x-server-sets/regional", rabbitmq: { protocol: "amqp" } }, ["components.x-server-sets.regional.production", "components.x-server-sets.regional.Kafka"]],
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
  ["a pointer through another reference", "#/components/x-server-sets/alias/production", []],
  ["a non-string reference", 42, []],
];

const SERVER_SETS = {
  regional: {
    eventstreams: { $ref: "#/components/servers/drKafka" },
    kafka: { $ref: "#/components/servers/archive" },
    production: { $ref: "#/components/servers/drKafka" },
    Kafka: { $ref: "#/components/servers/archive" },
  },
  alias: { $ref: "#/components/x-server-sets/regional" },
  "eu/west~primary": { kafka: { $ref: "#/components/servers/drKafka" }, staging: { $ref: "#/components/servers/archive" } },
  "north america": { mqtt: { $ref: "#/components/servers/archive" }, eventstreams: { $ref: "#/components/servers/drKafka" } },
  loopA: { $ref: "#/components/x-server-sets/loopB" },
  loopB: { $ref: "#/components/x-server-sets/loopA" },
  list: [{ production: { $ref: "#/components/servers/drKafka" } }],
};

const mapRefDocument = (base, servers, componentServers) =>
  base({
    servers: typeof servers === "object" && servers !== null ? servers : { $ref: servers },
    components: { servers: componentServers, "x-server-sets": SERVER_SETS },
  });

module.exports = {
  DEFAULT_TYPES,
  OPTION,
  shown,
  notApproved,
  NAME_CASES,
  PROBE_NAMES,
  PARAM_CASES,
  FALLBACK_VALUES,
  NON_OBJECT_SERVER_MAPS,
  ENTRY_VALUES,
  MAP_REF_CASES,
  mapRefDocument,
};
