/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options["valid-versions"] - Comma-separated list (or array) of the approved protocol
 *   versions. Entries are trimmed and compared with the protocolVersion of every server in servers and
 *   components.servers as written. An unusable value falls back to the default list.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_VALID_VERSIONS = ["3.3.0"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const parseValidVersions = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const entries = [...new Set(candidates.map((entry) => entry.trim()).filter((entry) => entry !== ""))];
  return entries.length > 0 ? entries : DEFAULT_VALID_VERSIONS;
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

  const validVersions = parseValidVersions(options && options["valid-versions"]);
  const approved = new Set(validVersions);
  const expected = validVersions.map((version) => `'${printable(version)}'`).join(", ");
  const visited = new Set();

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
    if (!has(node, "protocolVersion") || node.protocolVersion === null) return;
    const version = node.protocolVersion;
    const name = printable(String(at[at.length - 1]));
    if (typeof version !== "string") {
      report(`Server '${name}' protocolVersion must be a string.`, [...at, "protocolVersion"]);
    } else if (!approved.has(version)) {
      report(`Server '${name}' protocolVersion '${printable(version)}' must be an approved version: ${expected}.`, [...at, "protocolVersion"]);
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
