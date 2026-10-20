/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options["required-traits"] - Comma-separated list (or array) of the trait names, keys of
 *   components.messageTraits, that every message must apply. Entries are trimmed and compared as written; empty and
 *   repeated entries are dropped. A traits entry (or the first item of a [trait, meta] tuple) applies a required trait
 *   when it is a valid trait reached through a $ref chain with a hop at #/components/messageTraits/<name> (local hops
 *   are followed one by one), or through an external $ref whose fragment is /components/messageTraits/<name>; inline
 *   traits never apply a required trait. Each missing required trait is reported once per message. An empty or
 *   unusable value requires no trait: every message must then apply at least one valid trait.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const TRAITS_POINTER = ["components", "messageTraits"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const parseRequired = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  return [...new Set(candidates.map((entry) => entry.trim()).filter((entry) => entry !== ""))];
};

const unescapeToken = (token) => token.replace(/~1/g, "/").replace(/~0/g, "~");

const pointerTokens = (fragment) => {
  let decoded;
  try {
    decoded = decodeURIComponent(fragment.slice(1));
  } catch (error) {
    return undefined;
  }
  if (decoded === "") return [];
  if (!decoded.startsWith("/")) return undefined;
  return decoded.slice(1).split("/").map(unescapeToken);
};

const pointer = (root, ref) => {
  const tokens = pointerTokens(ref);
  if (tokens === undefined) return undefined;
  let current = root;
  for (const key of tokens) {
    if (current === null || typeof current !== "object" || !has(current, key)) return undefined;
    current = current[key];
  }
  return current;
};

const traitNameOf = (ref) => {
  const hash = ref.indexOf("#");
  if (hash === -1) return undefined;
  const tokens = pointerTokens(ref.slice(hash));
  if (tokens === undefined || tokens.length !== TRAITS_POINTER.length + 1) return undefined;
  return TRAITS_POINTER.every((token, index) => tokens[index] === token) ? tokens[TRAITS_POINTER.length] : undefined;
};

const entriesOf = (map) => (isObject(map) ? Object.entries(map) : []);

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);
  const required = parseRequired(isObject(options) ? options["required-traits"] : undefined);

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

  const traitNames = (entry) => {
    const names = new Set();
    const seen = new Set();
    let current = Array.isArray(entry) ? entry[0] : entry;
    while (isRef(current) && typeof current.$ref === "string" && !seen.has(current.$ref)) {
      const ref = current.$ref;
      seen.add(ref);
      const name = traitNameOf(ref);
      if (name !== undefined) names.add(name);
      if (!ref.startsWith("#")) break;
      current = pointer(document, ref);
    }
    return names;
  };

  const appliedNames = (list) => {
    const names = new Set();
    for (const entry of list) {
      if (applies(entry)) traitNames(entry).forEach((name) => names.add(name));
    }
    return names;
  };

  const reportMissing = (applied, path) => {
    for (const name of required) {
      if (!applied.has(name)) report(`Message must apply the trait '${name}'.`, path);
    }
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
      if (required.length > 0) reportMissing(new Set(), path);
      else report("Message must apply at least one trait.", path);
      return;
    }
    const traitsPath = [...path, "traits"];
    const list = follow(message.traits);
    if (list === UNKNOWN) return;
    if (list !== undefined && list !== null && !Array.isArray(list)) {
      report("Message 'traits' must be an array.", traitsPath);
      return;
    }
    if (required.length > 0) {
      reportMissing(Array.isArray(list) ? appliedNames(list) : new Set(), traitsPath);
      return;
    }
    if (!Array.isArray(list) || !list.some(applies)) report("Message 'traits' must include at least one valid trait.", traitsPath);
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
