/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: every channel in channels and components.channels must always declare at least one
 *   usable message, in its messages map (AsyncAPI 3.x) or in the message of publish or subscribe (2.x, following oneOf).
 *   A usable message is an object, a local reference that resolves to one, or an external reference
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const OPERATIONS_V2 = ["publish", "subscribe"];
const MAX_DEPTH = 100;

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

  const v3 = isVersion3Plus(document.asyncapi);
  const where = v3 ? "'messages'" : "'publish' or 'subscribe'";
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

  const isMessage = (value) => {
    const { node } = follow(value, []);
    return node === UNKNOWN || isObject(node);
  };

  const hasMessageV2 = (value, seen, depth) => {
    const { node } = follow(value, []);
    if (node === UNKNOWN) return true;
    if (!isObject(node)) return false;
    if (!has(node, "oneOf")) return true;
    if (seen.has(node) || depth >= MAX_DEPTH) return false;
    seen.add(node);
    const { node: items } = follow(node.oneOf, []);
    if (items === UNKNOWN) return true;
    return Array.isArray(items) && items.some((item) => hasMessageV2(item, seen, depth + 1));
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

  const checkMessagesV3 = (node, at, name) => {
    if (!has(node, "messages")) {
      report(`Channel '${name}' must declare at least one message in 'messages'.`, at);
      return;
    }
    const { node: map } = follow(node.messages, []);
    if (map === UNKNOWN || (isObject(map) && Object.values(map).some(isMessage))) return;
    report(`The 'messages' of channel '${name}' must declare at least one message.`, [...at, "messages"]);
  };

  const checkMessagesV2 = (node, at, name) => {
    const declared = [];
    for (const operation of OPERATIONS_V2) {
      if (!has(node, operation)) continue;
      const target = follow(node[operation], [...at, operation]);
      if (target.node === UNKNOWN) return;
      if (!isObject(target.node) || !has(target.node, "message")) continue;
      if (hasMessageV2(target.node.message, new Set(), 0)) return;
      declared.push([operation, [...target.path, "message"]]);
    }
    if (declared.length === 0) {
      report(`Channel '${name}' must declare at least one message in 'publish' or 'subscribe'.`, at);
    }
    for (const [operation, path] of declared) {
      report(`The '${operation}.message' of channel '${name}' must declare at least one message.`, path);
    }
  };

  const checkChannel = (channel, path) => {
    const { node, path: at } = follow(channel, path);
    if (node === UNKNOWN) return;
    const channelKey = keyOf(at);
    if (visited.has(channelKey)) return;
    visited.add(channelKey);

    const name = printable(String(at[at.length - 1]));
    if (!isObject(node)) {
      report(`Channel '${name}' must be an object declaring at least one message in ${where}.`, at);
      return;
    }
    if (v3) {
      checkMessagesV3(node, at, name);
    } else {
      checkMessagesV2(node, at, name);
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
