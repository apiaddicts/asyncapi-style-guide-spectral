/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options["allowed-server-types"] - Comma-separated list (or array) of the approved server
 *   types. Entries are trimmed and compared with the server names (the keys of the root servers map) as written.
 *   An unusable value falls back to the default list.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_ALLOWED_SERVER_TYPES = ["eventstreams", "kafka"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\x00-\x1f\x7f]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const parseAllowed = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const entries = [...new Set(candidates.map((entry) => entry.trim()).filter((entry) => entry !== ""))];
  return entries.length > 0 ? entries : DEFAULT_ALLOWED_SERVER_TYPES;
};

const unescapeToken = (token) => token.replace(/~1/g, "/").replace(/~0/g, "~");

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

  const allowed = parseAllowed(options && options["allowed-server-types"]);
  const approved = new Set(allowed);
  const expected = allowed.map((type) => `'${printable(type)}'`).join(", ");

  const follow = (node, path) => {
    const seen = new Set();
    let current = node;
    let currentPath = path;
    while (isRef(current)) {
      const ref = current.$ref;
      if (typeof ref !== "string" || !ref.startsWith("#") || seen.has(ref)) return { node: undefined, path: currentPath };
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

  const servers = follow(document.servers, ["servers"]);
  if (!isObject(servers.node) || servers.node === document) {
    return errors;
  }

  for (const name of Object.keys(servers.node)) {
    if (approved.has(name)) continue;
    errors.push({
      message: `Server name '${printable(name)}' must be an approved server type: ${expected}.`,
      path: locatable([...context.path, ...servers.path, name]),
    });
  }

  return errors;
};
