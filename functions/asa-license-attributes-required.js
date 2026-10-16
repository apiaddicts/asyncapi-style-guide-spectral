/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: the mandatory license fields are always name and url
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const FIELDS = ["name", "url"];
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g;
const NO_INFO = "The document must declare 'info.license' with 'name' and 'url'.";
const NO_LICENSE = "The 'info' object must declare a 'license' object with 'name' and 'url'.";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

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

module.exports = (document, _options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
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
    report(NO_INFO, []);
    return errors;
  }

  const info = follow(document.info, ["info"]);
  if (info.node === UNKNOWN) {
    return errors;
  }
  if (!isObject(info.node) || info.node === document) {
    report(NO_INFO, ["info"]);
    return errors;
  }

  if (!has(info.node, "license")) {
    report(NO_LICENSE, info.path);
    return errors;
  }

  const licensePath = [...info.path, "license"];
  const license = follow(info.node.license, licensePath);
  if (license.node === UNKNOWN) {
    return errors;
  }
  if (!isObject(license.node) || license.node === document) {
    report(NO_LICENSE, licensePath);
    return errors;
  }

  for (const field of FIELDS) {
    if (!has(license.node, field)) {
      report(`The 'license' object must declare '${field}'.`, license.path);
    } else if (!populated(license.node[field])) {
      report(`The '${field}' of the 'license' object must not be empty.`, [...license.path, field]);
    }
  }

  return errors;
};
