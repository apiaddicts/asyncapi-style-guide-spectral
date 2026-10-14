/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: every message must always apply at least one valid trait
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const unescapeToken = (token) => token.replace(/~1/g, "/").replace(/~0/g, "~");

const pointer = (root, ref) => {
  let fragment;
  try {
    fragment = decodeURIComponent(ref.slice(1));
  } catch (error) {
    return undefined;
  }
  if (fragment === "") return root;
  if (!fragment.startsWith("/")) return undefined;
  let current = root;
  for (const token of fragment.slice(1).split("/")) {
    const key = unescapeToken(token);
    if (current === null || typeof current !== "object" || !has(current, key)) return undefined;
    current = current[key];
  }
  return current;
};

const entriesOf = (map) => (isObject(map) ? Object.entries(map) : []);

module.exports = (document, _options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);

  const follow = (node) => {
    const seen = new Set();
    let current = node;
    while (isRef(current)) {
      const ref = current.$ref;
      if (typeof ref !== "string") return undefined;
      if (!ref.startsWith("#")) return UNKNOWN;
      if (seen.has(ref)) return undefined;
      seen.add(ref);
      current = pointer(document, ref);
    }
    return current;
  };

  const applies = (entry) => {
    const node = follow(Array.isArray(entry) ? entry[0] : entry);
    return node === UNKNOWN || (isObject(node) && node !== document && Object.keys(node).length > 0);
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
    errors.push({ message, path: locatable([...context.path, ...path]) });
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    if (!has(message, "traits")) {
      report("Message must apply at least one trait.", path);
      return;
    }
    const traitsPath = [...path, "traits"];
    const list = follow(message.traits);
    if (list === UNKNOWN) return;
    if (list !== undefined && list !== null && !Array.isArray(list)) {
      report("Message 'traits' must be an array.", traitsPath);
      return;
    }
    if (!Array.isArray(list) || !list.some(applies)) report("Message 'traits' does not apply any valid trait.", traitsPath);
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      if (!isObject(channel) || isRef(channel)) continue;
      if (isV3) {
        for (const [messageKey, message] of entriesOf(channel.messages)) {
          checkMessage(message, [...path, key, "messages", messageKey]);
        }
        continue;
      }
      for (const action of ["publish", "subscribe"]) {
        const operation = channel[action];
        if (isObject(operation) && !isRef(operation)) {
          checkMessage(operation.message, [...path, key, action, "message"]);
        }
      }
    }
  };

  checkChannels(document.channels, ["channels"]);

  const components = document.components;
  if (isObject(components)) {
    checkChannels(components.channels, ["components", "channels"]);
    for (const [key, message] of entriesOf(components.messages)) {
      checkMessage(message, ["components", "messages", key]);
    }
  }

  return errors;
};
