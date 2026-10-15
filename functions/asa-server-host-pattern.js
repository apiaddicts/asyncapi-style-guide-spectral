/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string} options.pattern - Regular expression every server host must match, written plainly or as a
 *   /source/flags literal.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_PATTERN = "^([a-zA-Z0-9-]+\\.)?quality\\.es$";
const REGEXP_LITERAL = /^\/(.+)\/([a-z]*)$/;
const PLACEHOLDER = /\{([^{}]*)\}/g;
const MAX_SUBSTITUTIONS = 1000;
const UNKNOWN = Symbol("unknown");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const compile = (source) => {
  const literal = REGEXP_LITERAL.exec(source);
  try {
    return literal === null ? new RegExp(source) : new RegExp(literal[1], literal[2]);
  } catch (error) {
    return null;
  }
};

const parsePattern = (raw) => {
  const source = typeof raw === "string" ? raw.trim() : "";
  const regex = source === "" ? null : compile(source);
  return regex === null ? { source: DEFAULT_PATTERN, regex: new RegExp(DEFAULT_PATTERN) } : { source, regex };
};

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\u0000-\u001f\u007f]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

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

const hostsOf = (address) => {
  const scheme = /^[^/?#]*:\/\//.exec(address);
  let start = scheme !== null ? scheme[0].length : address.startsWith("//") ? 2 : 0;
  const authority = address.slice(start).split(/[/?#]/)[0];
  return authority.split(",").map((entry) => {
    const userInfo = entry.lastIndexOf("@") + 1;
    let host = entry.slice(userInfo);
    if (host.startsWith("[")) {
      const end = host.indexOf("]");
      host = end === -1 ? host : host.slice(0, end + 1);
    } else {
      const port = host.indexOf(":");
      host = port === -1 ? host : host.slice(0, port);
    }
    const found = { host, start: start + userInfo };
    start += entry.length + 1;
    return found;
  });
};

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const pattern = parsePattern(options && options.pattern);
  const field = isVersion3Plus(document.asyncapi) ? "host" : "url";
  const visited = new Set();

  const matches = (host) => {
    pattern.regex.lastIndex = 0;
    return pattern.regex.test(host);
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

  const valuesOf = (variable) => {
    const { node } = follow(variable, []);
    if (node === UNKNOWN) return UNKNOWN;
    if (!isObject(node) || node === document) return [];
    const values = [];
    const add = (value) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") values.push(String(value));
    };
    if (Array.isArray(node.enum)) node.enum.forEach(add);
    if (has(node, "default")) add(node.default);
    return [...new Set(values)];
  };

  const addressesOf = (template, variables) => {
    const declared = follow(variables, []).node;
    const names = [...new Set(Array.from(template.matchAll(PLACEHOLDER), (match) => match[1]))];
    const external = new Set();
    const choices = [];
    for (const name of names) {
      const values = isObject(declared) && declared !== document && has(declared, name) ? valuesOf(declared[name]) : [];
      if (values === UNKNOWN) external.add(name);
      else if (values.length > 0) choices.push([name, values]);
    }
    const addresses = [];
    const assigned = new Map();
    const render = () => {
      let address = "";
      let last = 0;
      const unknown = [];
      for (const match of template.matchAll(PLACEHOLDER)) {
        address += template.slice(last, match.index);
        if (external.has(match[1])) unknown.push([address.length, address.length + match[0].length]);
        address += assigned.has(match[1]) ? assigned.get(match[1]) : match[0];
        last = match.index + match[0].length;
      }
      return { address: address + template.slice(last), unknown };
    };
    const expand = (index) => {
      if (index === choices.length) {
        addresses.push(render());
        return;
      }
      const [name, values] = choices[index];
      for (const value of values) {
        if (addresses.length >= MAX_SUBSTITUTIONS) return;
        assigned.set(name, value);
        expand(index + 1);
      }
    };
    expand(0);
    return addresses;
  };

  const checkServer = (server, path) => {
    const target = follow(server, path);
    if (!isObject(target.node) || target.node === document) return;
    const serverKey = keyOf(target.path);
    if (visited.has(serverKey)) return;
    visited.add(serverKey);

    const { node, path: at } = target;
    if (!has(node, field) || node[field] === null) return;
    const value = node[field];
    const name = printable(String(at[at.length - 1]));
    if (typeof value !== "string") {
      report(`Server '${name}' ${field} must be a string.`, [...at, field]);
      return;
    }

    const seen = new Set();
    for (const { address, unknown } of addressesOf(value, node.variables)) {
      for (const { host, start } of hostsOf(address)) {
        const end = start + host.length;
        if (seen.has(host) || unknown.some(([from, to]) => from < end && to > start)) continue;
        seen.add(host);
        if (!matches(host)) {
          report(`Server '${name}' host '${printable(host)}' must match '${pattern.source}'.`, [...at, field]);
        }
      }
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
