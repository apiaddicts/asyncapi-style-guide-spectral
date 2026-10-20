/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options\["allowed-bindings"] - Comma-separated list (or array) of the protocol keys allowed
 *   inside a bindings object. Entries are trimmed and lower-cased; keys are compared as written, so 'Kafka' is never
 *   a valid key. Specification extensions (x-*) are always accepted. An unusable value falls back to the default list.
 *   An allowed specification protocol must also exist in the document's AsyncAPI version (major.minor of the root
 *   'asyncapi' value): mercure and ibmmq since 2.1, anypointmq 2.2, solace 2.3, googlepubsub 2.5, pulsar 2.6, ros2 3.1
 *   and every other one since 2.0. Keys outside the specification are never version-checked, and no key is when the
 *   version cannot be read.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_ALLOWED_BINDINGS = [
  "http",
  "ws",
  "kafka",
  "anypointmq",
  "amqp",
  "amqp1",
  "mqtt",
  "mqtt5",
  "nats",
  "jms",
  "sns",
  "solace",
  "sqs",
  "stomp",
  "redis",
  "mercure",
  "ibmmq",
  "googlepubsub",
  "pulsar",
  "ros2",
];

const BINDING_SINCE = {
  http: [2, 0],
  ws: [2, 0],
  kafka: [2, 0],
  amqp: [2, 0],
  amqp1: [2, 0],
  mqtt: [2, 0],
  mqtt5: [2, 0],
  nats: [2, 0],
  jms: [2, 0],
  sns: [2, 0],
  sqs: [2, 0],
  stomp: [2, 0],
  redis: [2, 0],
  mercure: [2, 1],
  ibmmq: [2, 1],
  anypointmq: [2, 2],
  solace: [2, 3],
  googlepubsub: [2, 5],
  pulsar: [2, 6],
  ros2: [3, 1],
};

const ENTRY = /^[a-z0-9][a-z0-9._-]*$/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const versionOf = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const match = /^\s*(\d+)(?:\.(\d+))?/.exec(String(raw));
  return match === null ? null : [Number(match[1]), match[2] === undefined ? 0 : Number(match[2])];
};

const isNewer = (since, version) => since[0] > version[0] || (since[0] === version[0] && since[1] > version[1]);

const parseAllowed = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const entries = candidates.map((entry) => entry.trim().toLowerCase()).filter((entry) => ENTRY.test(entry));
  return new Set(entries.length > 0 ? entries : DEFAULT_ALLOWED_BINDINGS);
};

const entriesOf = (map) => (isObject(map) ? Object.entries(map).filter(([, value]) => isObject(value) && !isRef(value)) : []);
const itemsOf = (list) => (Array.isArray(list) ? list.map((item, index) => [index, item]) : []);

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const allowed = parseAllowed(options && options["allowed-bindings"]);
  const version = versionOf(document.asyncapi);
  const isV3 = version !== null && version[0] >= 3;

  const checkBindings = (bindings, kind, path) => {
    if (!isObject(bindings) || isRef(bindings)) return;
    for (const key of Object.keys(bindings)) {
      if (key.startsWith("x-")) continue;
      if (!allowed.has(key)) {
        errors.push({
          message: `${kind} binding '${key}' is not an allowed protocol.`,
          path: [...context.path, ...path, key],
        });
        continue;
      }
      const since = version !== null && has(BINDING_SINCE, key) ? BINDING_SINCE[key] : null;
      if (since !== null && isNewer(since, version)) {
        errors.push({
          message: `${kind} binding '${key}' requires AsyncAPI ${since[0]}.${since[1]}.0 or later.`,
          path: [...context.path, ...path, key],
        });
      }
    }
  };

  const checkHolder = (holder, kind, path) => {
    if (!isObject(holder) || isRef(holder)) return;
    checkBindings(holder.bindings, kind, [...path, "bindings"]);
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    checkHolder(message, "Message", path);
    for (const [index, trait] of itemsOf(message.traits)) {
      if (Array.isArray(trait)) {
        checkHolder(trait[0], "Message", [...path, "traits", index, 0]);
      } else {
        checkHolder(trait, "Message", [...path, "traits", index]);
      }
    }
  };

  const checkOperation = (operation, path) => {
    if (!isObject(operation) || isRef(operation)) return;
    checkHolder(operation, "Operation", path);
    for (const [index, trait] of itemsOf(operation.traits)) {
      checkHolder(trait, "Operation", [...path, "traits", index]);
    }
    if (!isV3) {
      checkMessage(operation.message, [...path, "message"]);
    }
  };

  const checkServers = (servers, path) => {
    for (const [key, server] of entriesOf(servers)) {
      checkHolder(server, "Server", [...path, key]);
    }
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      checkHolder(channel, "Channel", [...path, key]);
      if (isV3) {
        for (const [messageKey, message] of entriesOf(channel.messages)) {
          checkMessage(message, [...path, key, "messages", messageKey]);
        }
        continue;
      }
      for (const action of ["publish", "subscribe"]) {
        checkOperation(channel[action], [...path, key, action]);
      }
    }
  };

  const checkOperations = (operations, path) => {
    if (!isV3) return;
    for (const [key, operation] of entriesOf(operations)) {
      checkOperation(operation, [...path, key]);
    }
  };

  checkServers(document.servers, ["servers"]);
  checkChannels(document.channels, ["channels"]);
  checkOperations(document.operations, ["operations"]);

  const components = document.components;
  if (isObject(components)) {
    checkServers(components.servers, ["components", "servers"]);
    checkChannels(components.channels, ["components", "channels"]);
    checkOperations(components.operations, ["components", "operations"]);
    for (const [key, message] of entriesOf(components.messages)) {
      checkMessage(message, ["components", "messages", key]);
    }
    for (const [key, trait] of entriesOf(components.messageTraits)) {
      checkHolder(trait, "Message", ["components", "messageTraits", key]);
    }
    for (const [key, trait] of entriesOf(components.operationTraits)) {
      checkHolder(trait, "Operation", ["components", "operationTraits", key]);
    }
    for (const [section, kind] of [
      ["serverBindings", "Server"],
      ["channelBindings", "Channel"],
      ["operationBindings", "Operation"],
      ["messageBindings", "Message"],
    ]) {
      for (const [key, bindings] of entriesOf(components[section])) {
        checkBindings(bindings, kind, ["components", section, key]);
      }
    }
  }

  return errors;
};
