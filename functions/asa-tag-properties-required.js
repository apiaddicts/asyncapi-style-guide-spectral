/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options\["fields-to-apply"] - Comma-separated list (or array) of the fields every Tag object must
 *   populate. name, description and externalDocs are matched case-insensitively and x- extensions as written; any other
 *   entry is ignored, and name and description are required when no entry is usable.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const DEFAULT_FIELDS = ["name", "description"];
const FIXED_FIELDS = ["name", "description", "externalDocs"];
const EXTENSION = /^x-[\w.-]+$/;
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isBlank = (text) => text.replace(INVISIBLE, "").trim() === "";
const keyOf = (path) => JSON.stringify(path.map(String));

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

const quote = (value) => (typeof value === "string" ? `'${value}'` : JSON.stringify(value));

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);
  const fields = parseFields(isObject(options) ? options["fields-to-apply"] : undefined);
  const visited = new Set();
  const visitedItems = new Set();
  const visitedTags = new Set();

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
    if (typeof value === "string") return !isBlank(value);
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

  const nameOf = (tag) => {
    const { node } = follow(tag.name, []);
    return typeof node === "string" && !isBlank(node) ? node : undefined;
  };

  const checkTag = (tag, path) => {
    const itemKey = keyOf(path);
    if (visitedItems.has(itemKey)) return;
    visitedItems.add(itemKey);

    const target = follow(tag, path);
    if (target.node === UNKNOWN) return;
    if (!isObject(target.node) || target.node === document) {
      const expected = `a Tag object with the mandatory fields ${listOf(fields)}`;
      if (isRef(tag)) {
        report(`The tag reference ${quote(tag.$ref)} must resolve to ${expected}.`, path);
      } else if (typeof tag === "string" && !isBlank(tag)) {
        report(`Tag '${tag}' must be ${expected}.`, path);
      } else {
        report(`The tag must be ${expected}.`, path);
      }
      return;
    }

    const tagKey = keyOf(target.path);
    if (visitedTags.has(tagKey)) return;
    visitedTags.add(tagKey);

    const name = nameOf(target.node);
    for (const field of fields) {
      if (!has(target.node, field)) {
        report(`${name === undefined ? "The tag" : `Tag '${name}'`} must declare the mandatory field '${field}'.`, target.path);
      } else if (!populated(target.node[field])) {
        report(`The mandatory field '${field}' of ${name === undefined ? "the tag" : `tag '${name}'`} must not be empty.`, [...target.path, field]);
      }
    }
  };

  const checkTags = (tags, path) => {
    const list = follow(tags, path);
    if (!Array.isArray(list.node)) return;
    list.node.forEach((tag, index) => checkTag(tag, [...list.path, index]));
  };

  const enter = (kind, node, path) => {
    const target = follow(node, path);
    if (!isObject(target.node) || target.node === document) return undefined;
    const key = `${kind}:${keyOf(target.path)}`;
    if (visited.has(key)) return undefined;
    visited.add(key);
    return target;
  };

  const eachEntry = (map, path, visit) => {
    const target = follow(map, path);
    if (!isObject(target.node) || target.node === document) return;
    for (const [key, value] of Object.entries(target.node)) visit(value, [...target.path, key]);
  };

  const eachItem = (list, path, visit) => {
    const target = follow(list, path);
    if (!Array.isArray(target.node)) return;
    target.node.forEach((item, index) => visit(item, [...target.path, index]));
  };

  const visitTrait = (kind, node, path) => {
    const trait = enter(kind, node, path);
    if (trait) checkTags(trait.node.tags, [...trait.path, "tags"]);
  };

  const visitTraits = (kind, traits, path) => {
    eachItem(traits, path, (trait, at) => {
      if (Array.isArray(trait)) visitTrait(kind, trait[0], [...at, 0]);
      else visitTrait(kind, trait, at);
    });
  };

  const visitServer = (node, path) => {
    const server = enter("server", node, path);
    if (server) checkTags(server.node.tags, [...server.path, "tags"]);
  };

  const visitMessage = (node, path) => {
    const message = enter("message", node, path);
    if (!message) return;
    if (!isV3 && Array.isArray(message.node.oneOf)) {
      message.node.oneOf.forEach((member, index) => visitMessage(member, [...message.path, "oneOf", index]));
      return;
    }
    checkTags(message.node.tags, [...message.path, "tags"]);
    visitTraits("messageTrait", message.node.traits, [...message.path, "traits"]);
  };

  const visitReply = (node, path) => {
    const reply = enter("reply", node, path);
    if (!reply) return;
    visitChannel(reply.node.channel, [...reply.path, "channel"]);
    eachItem(reply.node.messages, [...reply.path, "messages"], visitMessage);
  };

  const visitOperation = (node, path) => {
    const operation = enter("operation", node, path);
    if (!operation) return;
    const { node: op, path: at } = operation;
    checkTags(op.tags, [...at, "tags"]);
    visitTraits("operationTrait", op.traits, [...at, "traits"]);
    if (isV3) {
      visitChannel(op.channel, [...at, "channel"]);
      eachItem(op.messages, [...at, "messages"], visitMessage);
      visitReply(op.reply, [...at, "reply"]);
    } else {
      visitMessage(op.message, [...at, "message"]);
    }
  };

  const visitChannel = (node, path) => {
    const channel = enter("channel", node, path);
    if (!channel) return;
    const { node: ch, path: at } = channel;
    if (isV3) {
      checkTags(ch.tags, [...at, "tags"]);
      eachEntry(ch.messages, [...at, "messages"], visitMessage);
      eachItem(ch.servers, [...at, "servers"], visitServer);
      return;
    }
    for (const action of ["publish", "subscribe"]) {
      if (has(ch, action)) visitOperation(ch[action], [...at, action]);
    }
  };

  if (isV3) {
    const info = follow(document.info, ["info"]);
    if (isObject(info.node) && info.node !== document) checkTags(info.node.tags, [...info.path, "tags"]);
  } else {
    checkTags(document.tags, ["tags"]);
  }

  eachEntry(document.servers, ["servers"], visitServer);
  eachEntry(document.channels, ["channels"], visitChannel);
  if (isV3) eachEntry(document.operations, ["operations"], visitOperation);

  const components = follow(document.components, ["components"]);
  if (isObject(components.node) && components.node !== document) {
    const { node: section, path: at } = components;
    eachEntry(section.servers, [...at, "servers"], visitServer);
    eachEntry(section.channels, [...at, "channels"], visitChannel);
    eachEntry(section.messages, [...at, "messages"], visitMessage);
    eachEntry(section.operationTraits, [...at, "operationTraits"], (node, path) => visitTrait("operationTrait", node, path));
    eachEntry(section.messageTraits, [...at, "messageTraits"], (node, path) => visitTrait("messageTrait", node, path));
    if (isV3) {
      eachEntry(section.operations, [...at, "operations"], visitOperation);
      eachEntry(section.replies, [...at, "replies"], visitReply);
      eachEntry(section.tags, [...at, "tags"], checkTag);
    }
  }

  return errors;
};
