/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string} options.pattern - Regular expression every server name (each key of the root servers map) must
 *   match, written plainly or as a /source/flags literal. An unusable value falls back to the default.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_PATTERN = "^[A-Za-z0-9_-]+$";
const REGEXP_LITERAL = /^\/(.+)\/([a-z]*)$/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\x00-\x1f\x7f]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

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

  const pattern = parsePattern(options && options.pattern);
  const shownPattern = printable(pattern.source);

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
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(name)) continue;
    errors.push({
      message: `Server name '${printable(name)}' must match '${shownPattern}'.`,
      path: locatable([...context.path, ...servers.path, name]).map(escapeToken),
    });
  }

  return errors;
};
