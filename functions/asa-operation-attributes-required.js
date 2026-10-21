/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: the mandatory operation fields are always action, channel and summary (AsyncAPI 3.x,
 *   every operation in operations and components.operations) or summary (2.x, every publish and subscribe operation of
 *   the channels in channels and components.channels, where the key is the action and the channel is the enclosing one).
 *   A summary inherited from an operation trait counts: 2.x traits override the operation, in 3.x the operation wins
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g;
const OWN_FIELDS_V3 = ["action", "channel"];
const OPERATIONS_V2 = ["publish", "subscribe"];

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
  const visitedChannels = new Set();
  const visitedOperations = new Set();

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

  const traitLayers = (operation, at) => {
    const list = follow(operation.traits, [...at, "traits"]);
    if (list.node === UNKNOWN) return [list];
    if (!Array.isArray(list.node)) return [];
    return list.node.map((trait, index) => (Array.isArray(trait) ? follow(trait[0], [...list.path, index, 0]) : follow(trait, [...list.path, index])));
  };

  const summaryInForce = (operation, at) => {
    const own = { node: operation, path: at };
    const traits = traitLayers(operation, at);
    let result = null;
    let unknown = false;
    for (const layer of v3 ? [...traits, own] : [own, ...traits]) {
      if (layer.node === UNKNOWN) {
        unknown = true;
      } else if (isObject(layer.node) && has(layer.node, "summary")) {
        result = layer;
        unknown = false;
      }
    }
    return unknown ? UNKNOWN : result;
  };

  const checkSummary = (operation, at, missing, empty) => {
    const layer = summaryInForce(operation, at);
    if (layer === UNKNOWN) return;
    if (layer === null) {
      report(missing, at);
    } else if (!populated(layer.node.summary)) {
      report(empty, [...layer.path, "summary"]);
    }
  };

  const enter = (visited, node, path) => {
    const target = follow(node, path);
    if (target.node === UNKNOWN) return null;
    const key = keyOf(target.path);
    if (visited.has(key)) return null;
    visited.add(key);
    return target;
  };

  const checkOperationV3 = (operation, path) => {
    const target = enter(visitedOperations, operation, path);
    if (!target) return;
    const { node, path: at } = target;
    const name = printable(String(at[at.length - 1]));
    if (!isObject(node)) {
      report(`Operation '${name}' must be an object declaring 'action', 'channel' and 'summary'.`, at);
      return;
    }
    for (const field of OWN_FIELDS_V3) {
      if (!has(node, field)) {
        report(`Operation '${name}' must declare '${field}'.`, at);
      } else if (!populated(node[field])) {
        report(`The '${field}' of operation '${name}' must not be empty.`, [...at, field]);
      }
    }
    checkSummary(node, at, `Operation '${name}' must declare 'summary'.`, `The 'summary' of operation '${name}' must not be empty.`);
  };

  const checkOperationV2 = (operation, path, action, channel) => {
    const target = enter(visitedOperations, operation, path);
    if (!target) return;
    const { node, path: at } = target;
    const label = `${action} operation of channel '${channel}'`;
    if (!isObject(node)) {
      report(`The ${label} must be an object declaring 'summary'.`, at);
      return;
    }
    checkSummary(node, at, `The ${label} must declare 'summary'.`, `The 'summary' of the ${label} must not be empty.`);
  };

  const checkChannelV2 = (channel, path) => {
    const target = enter(visitedChannels, channel, path);
    if (!target || !isObject(target.node)) return;
    const { node, path: at } = target;
    const name = printable(String(at[at.length - 1]));
    for (const action of OPERATIONS_V2) {
      if (has(node, action)) checkOperationV2(node[action], [...at, action], action, name);
    }
  };

  const eachEntry = (map, path, check) => {
    const target = follow(map, path);
    if (!isObject(target.node)) return;
    for (const [key, value] of Object.entries(target.node)) check(value, [...target.path, key]);
  };

  const section = v3 ? "operations" : "channels";
  const check = v3 ? checkOperationV3 : checkChannelV2;
  eachEntry(document[section], [section], check);
  const components = follow(document.components, ["components"]);
  if (isObject(components.node)) {
    eachEntry(components.node[section], [...components.path, section], check);
  }

  return errors;
};
