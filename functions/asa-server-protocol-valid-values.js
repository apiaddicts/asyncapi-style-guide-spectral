/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options["allowed-protocols"] - Comma-separated list (or array) of the allowed protocols,
 *   compared as written with the protocol of every server in servers and components.servers. Entries are trimmed,
 *   empty entries dropped and duplicates removed; a missing, blank or otherwise unusable value falls back to the
 *   default list: the protocols named by the AsyncAPI 2.6 specification plus those of the official AsyncAPI bindings.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_ALLOWED_PROTOCOLS = [
  "amqp",
  "amqp1",
  "amqps",
  "anypointmq",
  "googlepubsub",
  "http",
  "https",
  "ibmmq",
  "ibmmq-secure",
  "jms",
  "kafka",
  "kafka-secure",
  "mercure",
  "mqtt",
  "mqtt5",
  "nats",
  "pulsar",
  "redis",
  "ros2",
  "secure-mqtt",
  "sns",
  "solace",
  "sqs",
  "stomp",
  "stomps",
  "ws",
  "wss",
];
const UNKNOWN = Symbol("unknown");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const parseAllowed = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const entries = [...new Set(candidates.map((entry) => entry.trim()).filter((entry) => entry !== ""))];
  return entries.length > 0 ? entries : DEFAULT_ALLOWED_PROTOCOLS;
};

const unescapeToken = (token) => token.replace(/~1/g, "/").replace(/~0/g, "~");
const escapeToken = (token) => String(token).replace(/~/g, "~0").replace(/\//g, "~1");

const pointerPath = (ref) => {
  let fragment;
  try {
    fragment = decodeURIComponent(ref.slice(1));
  } catch (error) {
    return undefined;
  }
  if (fragment === "") return [];
  if (!fragment.startsWith("/")) return undefined;
  return fragment.slice(1).split("/").map(unescapeToken);
};

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const protocols = parseAllowed(options && options["allowed-protocols"]);
  const allowed = new Set(protocols);
  const expected = protocols.map((protocol) => `'${printable(protocol)}'`).join(", ");
  const visited = new Set();

  const follow = (node, path) => {
    const seen = new Set();
    let current = node;
    let currentPath = path;
    while (isRef(current)) {
      const ref = current.$ref;
      if (typeof ref !== "string") return { node: undefined, path: currentPath };
      if (ref !== "" && !ref.startsWith("#")) return { node: UNKNOWN, path: currentPath };
      if (seen.has(ref)) return { node: undefined, path: currentPath };
      seen.add(ref);
      const target = pointerPath(ref);
      if (target === undefined) return { node: undefined, path: currentPath };
      let next = document;
      for (const key of target) {
        if (next === null || typeof next !== "object" || !has(next, key)) return { node: undefined, path: currentPath };
        next = next[key];
      }
      current = next;
      currentPath = target;
    }
    return { node: current, path: currentPath };
  };

  const locatable = (path) => {
    const source = context.document;
    if (!source || typeof source.getRangeForJsonPath !== "function") return path;
    for (let length = path.length; length > 0; length--) {
      if (source.getRangeForJsonPath(path.slice(0, length), false) !== undefined) return path.slice(0, length);
    }
    return path;
  };

  const report = (message, path) => {
    errors.push({ message, path: locatable([...context.path, ...path]).map(escapeToken) });
  };

  const checkServer = (server, path) => {
    const target = follow(server, path);
    if (!isObject(target.node) || target.node === document) return;
    const serverKey = keyOf(target.path);
    if (visited.has(serverKey)) return;
    visited.add(serverKey);

    const { node, path: at } = target;
    if (!has(node, "protocol") || node.protocol === null) return;
    const protocol = node.protocol;
    const name = printable(String(at[at.length - 1]));
    if (typeof protocol !== "string") {
      report(`Server '${name}' protocol must be a string.`, [...at, "protocol"]);
    } else if (!allowed.has(protocol)) {
      report(`Server '${name}' protocol '${printable(protocol)}' must be an allowed protocol: ${expected}.`, [...at, "protocol"]);
    }
  };

  const eachServer = (map, path) => {
    const target = follow(map, path);
    if (!isObject(target.node) || target.node === document) return;
    for (const [key, server] of Object.entries(target.node)) checkServer(server, [...target.path, key]);
  };

  eachServer(document.servers, ["servers"]);
  const components = follow(document.components, ["components"]);
  if (isObject(components.node) && components.node !== document) {
    eachServer(components.node.servers, [...components.path, "servers"]);
  }

  return errors;
};
