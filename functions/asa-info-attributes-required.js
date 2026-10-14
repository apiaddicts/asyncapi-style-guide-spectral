/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options\["fields-to-apply"] - Comma-separated list (or array) of the info fields every document
 *   must populate. Fixed field names are matched case-insensitively, tags and externalDocs only apply to AsyncAPI 3.x and
 *   x- extensions are matched as written; any other entry is ignored, and title, version and description are required
 *   when no entry is usable.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const DEFAULT_FIELDS = ["title", "version", "description"];
const FIXED_FIELDS = ["title", "version", "description", "termsOfService", "contact", "license", "tags", "externalDocs"];
const V3_ONLY_FIELDS = new Set(["tags", "externalDocs"]);
const EXTENSION = /^x-[\w.-]+$/;
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
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

const canonicalOf = (entry) => {
  if (EXTENSION.test(entry)) return entry;
  const lower = entry.toLowerCase();
  return FIXED_FIELDS.find((field) => field.toLowerCase() === lower);
};

const parseFields = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const fields = candidates.map((entry) => canonicalOf(entry.trim())).filter((field) => field !== undefined);
  return fields.length === 0 ? DEFAULT_FIELDS : [...new Set(fields)];
};

const listOf = (fields) => {
  const quoted = fields.map((field) => `'${field}'`);
  return quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`;
};

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);
  const fields = parseFields(isObject(options) ? options["fields-to-apply"] : undefined).filter((field) => isV3 || !V3_ONLY_FIELDS.has(field));
  if (fields.length === 0) {
    return errors;
  }

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

  const populated = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.replace(INVISIBLE, "").trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    if (!isObject(value)) return true;
    if (!isRef(value)) return Object.keys(value).length > 0;
    const { node } = follow(value, []);
    return node === UNKNOWN || (node !== document && populated(node));
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

  if (!has(document, "info")) {
    report(`The document must declare an 'info' object with the mandatory fields ${listOf(fields)}.`, []);
    return errors;
  }

  const info = follow(document.info, ["info"]);
  if (info.node === UNKNOWN) {
    return errors;
  }
  if (!isObject(info.node) || info.node === document) {
    report(`The document must declare an 'info' object with the mandatory fields ${listOf(fields)}.`, ["info"]);
    return errors;
  }

  for (const field of fields) {
    if (!has(info.node, field)) {
      report(`The 'info' object must declare the mandatory field '${field}'.`, info.path);
    } else if (!populated(info.node[field])) {
      report(`The mandatory 'info' field '${field}' must not be empty.`, [...info.path, field]);
    }
  }

  return errors;
};
