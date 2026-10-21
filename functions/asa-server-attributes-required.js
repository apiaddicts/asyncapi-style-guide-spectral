/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: the mandatory server fields are always url (AsyncAPI 2.x) or host (3.x),
 *   protocol and protocolVersion, checked on every server in servers and components.servers
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

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

module.exports = (document, _options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const fields = [isVersion3Plus(document.asyncapi) ? "host" : "url", "protocol", "protocolVersion"];
  const listed = `'${fields[0]}', '${fields[1]}' and '${fields[2]}'`;
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
      if (target === undefined || target.length === 0) return { node: undefined, path: currentPath };
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

  const populated = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.replace(INVISIBLE, "").trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    if (!isObject(value)) return true;
    if (!isRef(value)) return Object.keys(value).length > 0;
    const { node } = follow(value, []);
    return node === UNKNOWN || populated(node);
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
    const { node, path: at } = follow(server, path);
    if (node === UNKNOWN) return;
    const serverKey = keyOf(at);
    if (visited.has(serverKey)) return;
    visited.add(serverKey);

    const name = printable(String(at[at.length - 1]));
    if (!isObject(node)) {
      report(`Server '${name}' must be an object declaring ${listed}.`, at);
      return;
    }
    for (const field of fields) {
      if (!has(node, field)) {
        report(`Server '${name}' must declare '${field}'.`, at);
      } else if (!populated(node[field])) {
        report(`The '${field}' of server '${name}' must not be empty.`, [...at, field]);
      }
    }
  };

  const eachServer = (map, path) => {
    const target = follow(map, path);
    if (!isObject(target.node)) return;
    for (const [key, server] of Object.entries(target.node)) checkServer(server, [...target.path, key]);
  };

  eachServer(document.servers, ["servers"]);
  const components = follow(document.components, ["components"]);
  if (isObject(components.node)) {
    eachServer(components.node.servers, [...components.path, "servers"]);
  }

  return errors;
};
