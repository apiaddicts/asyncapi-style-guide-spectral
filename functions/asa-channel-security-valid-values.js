/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options["allowed-security-types"] - Comma-separated list (or array) of the approved security
 *   scheme types. Entries are trimmed and compared as written with the type of every security scheme applied by the
 *   security of servers, operations and operation traits (components included), where it is applied: the requirement
 *   key in AsyncAPI 2.x, the security item in 3.x. An unusable value falls back to the default list.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_ALLOWED_TYPES = ["scramSha512", "X509"];
const UNKNOWN = Symbol("unknown");
const OPERATIONS_V2 = ["publish", "subscribe"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const parseAllowed = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const entries = [...new Set(candidates.map((entry) => entry.trim()).filter((entry) => entry !== ""))];
  return entries.length > 0 ? entries : DEFAULT_ALLOWED_TYPES;
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

  const v3 = isVersion3Plus(document.asyncapi);
  const allowed = parseAllowed(options && options["allowed-security-types"]);
  const approved = new Set(allowed);
  const expected = allowed.map((type) => `'${printable(type)}'`).join(", ");
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

  const components = follow(document.components, ["components"]);
  const section = isObject(components.node) ? components.node : undefined;
  const schemes = section ? follow(section.securitySchemes, [...components.path, "securitySchemes"]) : { node: undefined, path: [] };

  const checkType = (scheme, name, path) => {
    if (!has(scheme, "type") || scheme.type === null) return;
    const subject = name === undefined ? "Security scheme type" : `Security scheme '${printable(name)}' type`;
    if (typeof scheme.type !== "string") {
      report(`${subject} must be a string.`, path);
    } else if (!approved.has(scheme.type)) {
      report(`${subject} '${printable(scheme.type)}' must be an approved mechanism: ${expected}.`, path);
    }
  };

  const nameOf = (path) => {
    let parent = document;
    for (const key of path.slice(0, -1)) parent = parent !== null && typeof parent === "object" ? parent[key] : undefined;
    return Array.isArray(parent) ? undefined : String(path[path.length - 1]);
  };

  const checkRequirement = (item, path) => {
    const requirement = follow(item, path);
    if (!isObject(requirement.node) || !isObject(schemes.node)) return;
    const key = `requirement:${keyOf(requirement.path)}`;
    if (visited.has(key)) return;
    visited.add(key);
    for (const name of Object.keys(requirement.node)) {
      if (!has(schemes.node, name)) continue;
      const scheme = follow(schemes.node[name], [...schemes.path, name]);
      if (isObject(scheme.node)) checkType(scheme.node, nameOf(scheme.path), [...requirement.path, name]);
    }
  };

  const checkScheme = (item, path) => {
    const scheme = follow(item, path);
    if (!isObject(scheme.node)) return;
    if (isRef(item)) checkType(scheme.node, nameOf(scheme.path), path);
    else checkType(scheme.node, undefined, [...path, "type"]);
  };

  const checkSecurity = (security, path) => {
    const list = follow(security, path);
    if (!Array.isArray(list.node)) return;
    const key = `security:${keyOf(list.path)}`;
    if (visited.has(key)) return;
    visited.add(key);
    list.node.forEach((item, index) => (v3 ? checkScheme : checkRequirement)(item, [...list.path, index]));
  };

  const enter = (kind, node, path) => {
    const target = follow(node, path);
    if (!isObject(target.node)) return undefined;
    const key = `${kind}:${keyOf(target.path)}`;
    if (visited.has(key)) return undefined;
    visited.add(key);
    return target;
  };

  const eachEntry = (map, path, visit) => {
    const target = follow(map, path);
    if (!isObject(target.node)) return;
    for (const [key, value] of Object.entries(target.node)) visit(value, [...target.path, key]);
  };

  const visitServer = (node, path) => {
    const server = enter("server", node, path);
    if (server) checkSecurity(server.node.security, [...server.path, "security"]);
  };

  const visitTrait = (node, path) => {
    const trait = enter("operationTrait", node, path);
    if (trait) checkSecurity(trait.node.security, [...trait.path, "security"]);
  };

  const visitTraits = (traits, path) => {
    const list = follow(traits, path);
    if (!Array.isArray(list.node)) return;
    list.node.forEach((trait, index) => {
      const at = [...list.path, index];
      if (Array.isArray(trait)) visitTrait(trait[0], [...at, 0]);
      else visitTrait(trait, at);
    });
  };

  const visitOperation = (node, path) => {
    const operation = enter("operation", node, path);
    if (!operation) return;
    checkSecurity(operation.node.security, [...operation.path, "security"]);
    visitTraits(operation.node.traits, [...operation.path, "traits"]);
  };

  const visitChannel = (node, path) => {
    const channel = enter("channel", node, path);
    if (!channel) return;
    for (const action of OPERATIONS_V2) {
      if (has(channel.node, action)) visitOperation(channel.node[action], [...channel.path, action]);
    }
  };

  eachEntry(document.servers, ["servers"], visitServer);
  if (v3) eachEntry(document.operations, ["operations"], visitOperation);
  else eachEntry(document.channels, ["channels"], visitChannel);

  if (section) {
    const at = components.path;
    eachEntry(section.servers, [...at, "servers"], visitServer);
    eachEntry(section.operationTraits, [...at, "operationTraits"], visitTrait);
    if (v3) eachEntry(section.operations, [...at, "operations"], visitOperation);
    else eachEntry(section.channels, [...at, "channels"], visitChannel);
  }

  return errors;
};
