/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: every channel in channels and components.channels must always list at least one
 *   server of the root servers object, by name (AsyncAPI 2.2 to 2.6) or through a $ref to #/servers/<name> (3.x);
 *   documents older than AsyncAPI 2.2.0, whose channels cannot declare servers, are not checked
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const versionOf = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const match = /^\s*(\d+)(?:\.(\d+))?/.exec(String(raw));
  if (match === null) return undefined;
  return { major: Number(match[1]), minor: match[2] === undefined ? undefined : Number(match[2]) };
};

const beforeChannelServers = (version) =>
  version !== undefined && (version.major < 2 || (version.major === 2 && version.minor !== undefined && version.minor < 2));

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

  const version = versionOf(document.asyncapi);
  if (beforeChannelServers(version)) {
    return errors;
  }
  const v3 = version !== undefined && version.major >= 3;
  const visited = new Set();

  const lookup = (target) => {
    let next = document;
    for (const key of target) {
      if (next === null || typeof next !== "object" || !has(next, key)) return { found: false };
      next = next[key];
    }
    return { found: true, value: next };
  };

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
      const { found, value } = lookup(target);
      if (!found) return { node: undefined, path: currentPath };
      current = value;
      currentPath = target;
    }
    return { node: current, path: currentPath };
  };

  const rootServers = follow(document.servers, ["servers"]).node;

  const namesServer = (entry) => {
    const { node } = follow(entry, []);
    if (node === UNKNOWN) return true;
    if (typeof node !== "string") return false;
    if (rootServers === UNKNOWN) return true;
    return isObject(rootServers) && has(rootServers, node);
  };

  const isRootServer = (target) =>
    target.length === 2 && target[0] === "servers" && isObject(document.servers) && !isRef(document.servers) && has(document.servers, target[1]);

  const referencesServer = (entry) => {
    const seen = new Set();
    let current = entry;
    while (isRef(current)) {
      const ref = current.$ref;
      if (typeof ref !== "string") return false;
      if (ref !== "" && !ref.startsWith("#")) return true;
      if (seen.has(ref)) return false;
      seen.add(ref);
      const target = pointerPath(ref);
      if (target === undefined || target.length === 0) return false;
      if (isRootServer(target)) return true;
      const { found, value } = lookup(target);
      if (!found) return false;
      current = value;
    }
    return false;
  };

  const listsServer = (value) => {
    const { node } = follow(value, []);
    if (node === UNKNOWN) return true;
    if (!Array.isArray(node)) return false;
    return node.some(v3 ? referencesServer : namesServer);
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

  const checkChannel = (channel, path) => {
    const { node, path: at } = follow(channel, path);
    if (node === UNKNOWN) return;
    const channelKey = keyOf(at);
    if (visited.has(channelKey)) return;
    visited.add(channelKey);

    const name = printable(String(at[at.length - 1]));
    if (!isObject(node)) {
      report(`Channel '${name}' must be an object declaring 'servers'.`, at);
    } else if (!has(node, "servers")) {
      report(`Channel '${name}' must declare 'servers'.`, at);
    } else if (!listsServer(node.servers)) {
      report(`The 'servers' of channel '${name}' must list at least one server defined in the root 'servers' object.`, [...at, "servers"]);
    }
  };

  const eachChannel = (map, path) => {
    const target = follow(map, path);
    if (!isObject(target.node)) return;
    for (const [key, channel] of Object.entries(target.node)) checkChannel(channel, [...target.path, key]);
  };

  eachChannel(document.channels, ["channels"]);
  const components = follow(document.components, ["components"]);
  if (isObject(components.node)) {
    eachChannel(components.node.channels, [...components.path, "channels"]);
  }

  return errors;
};
