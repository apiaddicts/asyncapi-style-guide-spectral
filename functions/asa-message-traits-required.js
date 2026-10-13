/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options\["required-traits"] - Comma-separated list (or array) of the message traits every
 *   message must apply. A trait is named after the last segment of the $ref that applies it, or of any local $ref it
 *   chains.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const FILE_EXTENSION = /\.(ya?ml|json)$/i;

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

const nameOf = (ref) => {
  const hash = ref.indexOf("#");
  if (hash !== -1) {
    let fragment = ref.slice(hash + 1);
    try {
      fragment = decodeURIComponent(fragment);
    } catch (error) {
      fragment = ref.slice(hash + 1);
    }
    const name = unescapeToken(fragment.slice(fragment.lastIndexOf("/") + 1));
    if (name !== "") return name;
  }
  const file = (hash === -1 ? ref : ref.slice(0, hash)).split("?")[0];
  return file.slice(Math.max(file.lastIndexOf("/"), file.lastIndexOf("\\")) + 1).replace(FILE_EXTENSION, "");
};

const parseRequired = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const names = candidates
    .map((entry) => entry.trim())
    .map((entry) => (entry.includes("#") ? nameOf(entry) : entry))
    .filter((name) => name !== "");
  return [...new Set(names)];
};

const missingText = (names) => `Message is missing the required trait${names.length === 1 ? "" : "s"} ${names.map((name) => `'${name}'`).join(", ")}.`;

const entriesOf = (map) => (isObject(map) ? Object.entries(map) : []);

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);
  const required = parseRequired(isObject(options) ? options["required-traits"] : undefined);

  const follow = (node) => {
    const names = [];
    const seen = new Set();
    let current = node;
    while (isRef(current)) {
      const ref = current.$ref;
      if (typeof ref !== "string") return { node: undefined, names };
      const name = nameOf(ref);
      if (name !== "") names.push(name);
      if (!ref.startsWith("#")) return { node: UNKNOWN, names };
      if (seen.has(ref)) return { node: undefined, names };
      seen.add(ref);
      current = pointer(document, ref);
    }
    return { node: current, names };
  };

  const traitOf = (entry) => {
    const { node, names } = follow(Array.isArray(entry) ? entry[0] : entry);
    if (node === UNKNOWN || (isObject(node) && node !== document && Object.keys(node).length > 0)) return { applied: true, names };
    return { applied: false, names: [] };
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
      report(required.length === 0 ? "Message must apply at least one trait." : missingText(required), path);
      return;
    }
    const traitsPath = [...path, "traits"];
    const list = follow(message.traits).node;
    if (list === UNKNOWN) return;
    if (list !== undefined && list !== null && !Array.isArray(list)) {
      report("Message 'traits' must be an array.", traitsPath);
      return;
    }
    const traits = Array.isArray(list) ? list.map(traitOf) : [];
    if (required.length === 0) {
      if (!traits.some((trait) => trait.applied)) report("Message 'traits' does not apply any valid trait.", traitsPath);
      return;
    }
    const applied = new Set(traits.flatMap((trait) => trait.names));
    const missing = required.filter((name) => !applied.has(name));
    if (missing.length > 0) report(missingText(missing), traitsPath);
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
