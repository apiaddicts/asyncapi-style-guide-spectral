/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: the mandatory External Documentation object fields are always description and url
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const FIELDS = ["description", "url"];
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g;
const DOCS_OBJECT = "an object with 'description' and 'url'";
const MAX_DEPTH = 100;
const SUBSCHEMA_KEYWORDS = ["additionalProperties", "unevaluatedProperties", "items", "additionalItems", "unevaluatedItems", "prefixItems", "contains", "propertyNames", "not", "if", "then", "else", "allOf", "anyOf", "oneOf"];
const SCHEMA_MAP_KEYWORDS = ["properties", "patternProperties", "definitions", "$defs", "dependentSchemas", "dependencies"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const keyOf = (path) => JSON.stringify(path.map(String));

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const isJsonSchemaFormat = (schemaFormat) => {
  if (schemaFormat === undefined || schemaFormat === null) return true;
  if (typeof schemaFormat !== "string") return false;
  const mediaType = schemaFormat.split(";")[0].trim().toLowerCase();
  return /^application\/(vnd\.aai\.asyncapi(\+(json|yaml))?|schema\+(json|yaml)|vnd\.oai\.openapi(\+(json|yaml))?)$/.test(mediaType);
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

const quote = (value) => (typeof value === "string" ? `'${value}'` : JSON.stringify(value));

module.exports = (document, _options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);
  const visited = new Set();
  const visitedDocs = new Set();
  const visitedSchemas = new Set();
  const foreignSchemas = new Set();

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

  const checkDocs = (docs, path) => {
    const target = follow(docs, path);
    if (target.node === UNKNOWN) return;
    if (!isObject(target.node) || target.node === document) {
      if (isRef(docs)) report(`The 'externalDocs' reference ${quote(docs.$ref)} must resolve to ${DOCS_OBJECT}.`, path);
      else report(`The 'externalDocs' value must be ${DOCS_OBJECT}.`, path);
      return;
    }

    const docsKey = keyOf(target.path);
    if (visitedDocs.has(docsKey)) return;
    visitedDocs.add(docsKey);

    for (const field of FIELDS) {
      if (!has(target.node, field)) {
        report(`The 'externalDocs' object must declare '${field}'.`, target.path);
      } else if (!populated(target.node[field])) {
        report(`The '${field}' of the 'externalDocs' object must not be empty.`, [...target.path, field]);
      }
    }
  };

  const checkDocsOf = ({ node, path }) => {
    if (has(node, "externalDocs")) checkDocs(node.externalDocs, [...path, "externalDocs"]);
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

  const schemaRoots = [];
  const walkSchema = (node, path) => schemaRoots.push([node, path, 0]);

  const walkSchemas = () => {
    const pending = schemaRoots.reverse();
    while (pending.length > 0) {
      const [node, path, depth] = pending.pop();
      const target = follow(node, path);
      if (!isObject(target.node) || target.node === document) continue;
      const key = keyOf(target.path);
      if (visitedSchemas.has(key) || foreignSchemas.has(key)) continue;
      visitedSchemas.add(key);
      checkDocsOf(target);
      const level = target.path === path ? depth + 1 : 1;
      if (level > MAX_DEPTH) continue;
      const { node: schema, path: at } = target;
      for (const keyword of SUBSCHEMA_KEYWORDS) {
        if (!has(schema, keyword)) continue;
        if (Array.isArray(schema[keyword])) schema[keyword].forEach((item, index) => pending.push([item, [...at, keyword, index], level]));
        else pending.push([schema[keyword], [...at, keyword], level]);
      }
      for (const keyword of SCHEMA_MAP_KEYWORDS) {
        if (!isObject(schema[keyword])) continue;
        for (const [name, value] of Object.entries(schema[keyword])) pending.push([value, [...at, keyword, name], level]);
      }
    }
  };

  const skipSchema = (node, path) => {
    const target = follow(node, path);
    if (isObject(target.node) && target.node !== document && target.path !== path) foreignSchemas.add(keyOf(target.path));
  };

  const visitSchema = (node, path, schemaFormat) => {
    if (isJsonSchemaFormat(schemaFormat)) walkSchema(node, path);
    else skipSchema(node, path);
  };

  const visitMultiFormat = (node, path) => {
    if (!isV3) {
      walkSchema(node, path);
      return;
    }
    const target = follow(node, path);
    if (isObject(target.node) && target.node !== document && has(target.node, "schemaFormat")) {
      if (has(target.node, "schema")) visitSchema(target.node.schema, [...target.path, "schema"], target.node.schemaFormat);
      return;
    }
    walkSchema(node, path);
  };

  const visitTag = (node, path) => {
    const tag = enter("tag", node, path);
    if (tag) checkDocsOf(tag);
  };

  const visitTags = (tags, path) => eachItem(tags, path, visitTag);

  const traitsOf = (kind, traits, path) => {
    const found = [];
    eachItem(traits, path, (trait, at) => {
      const [node, nodePath] = Array.isArray(trait) ? [trait[0], [...at, 0]] : [trait, at];
      const target = follow(node, nodePath);
      if (!isObject(target.node) || target.node === document) return;
      found.push({ ...target, fresh: enter(kind, node, nodePath) !== undefined });
    });
    return found;
  };

  const visitTrait = (kind, trait) => {
    checkDocsOf(trait);
    visitTags(trait.node.tags, [...trait.path, "tags"]);
    if (kind === "messageTrait" && has(trait.node, "headers")) visitMultiFormat(trait.node.headers, [...trait.path, "headers"]);
  };

  const visitServer = (node, path) => {
    const server = enter("server", node, path);
    if (!server) return;
    if (isV3) checkDocsOf(server);
    visitTags(server.node.tags, [...server.path, "tags"]);
  };

  const visitMessage = (node, path) => {
    const message = enter("message", node, path);
    if (!message) return;
    const { node: msg, path: at } = message;
    if (!isV3 && Array.isArray(msg.oneOf)) {
      msg.oneOf.forEach((member, index) => visitMessage(member, [...at, "oneOf", index]));
      return;
    }
    checkDocsOf(message);
    visitTags(msg.tags, [...at, "tags"]);
    const traits = traitsOf("messageTrait", msg.traits, [...at, "traits"]);
    traits.filter((trait) => trait.fresh).forEach((trait) => visitTrait("messageTrait", trait));
    if (has(msg, "headers")) visitMultiFormat(msg.headers, [...at, "headers"]);
    if (!has(msg, "payload")) return;
    if (isV3) {
      visitMultiFormat(msg.payload, [...at, "payload"]);
      return;
    }
    const schemaFormat = traits.reduce((current, trait) => (has(trait.node, "schemaFormat") ? trait.node.schemaFormat : current), msg.schemaFormat);
    visitSchema(msg.payload, [...at, "payload"], schemaFormat);
  };

  const visitParameters = (parameters, path) => {
    eachEntry(parameters, path, (node, at) => {
      const parameter = enter("parameter", node, at);
      if (parameter && has(parameter.node, "schema")) walkSchema(parameter.node.schema, [...parameter.path, "schema"]);
    });
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
    checkDocsOf(operation);
    visitTags(op.tags, [...at, "tags"]);
    traitsOf("operationTrait", op.traits, [...at, "traits"])
      .filter((trait) => trait.fresh)
      .forEach((trait) => visitTrait("operationTrait", trait));
    if (isV3) {
      visitChannel(op.channel, [...at, "channel"]);
      eachItem(op.messages, [...at, "messages"], visitMessage);
      visitReply(op.reply, [...at, "reply"]);
    } else if (has(op, "message")) {
      visitMessage(op.message, [...at, "message"]);
    }
  };

  const visitChannel = (node, path) => {
    const channel = enter("channel", node, path);
    if (!channel) return;
    const { node: ch, path: at } = channel;
    if (isV3) {
      checkDocsOf(channel);
      visitTags(ch.tags, [...at, "tags"]);
      eachEntry(ch.messages, [...at, "messages"], visitMessage);
      eachItem(ch.servers, [...at, "servers"], visitServer);
      return;
    }
    visitParameters(ch.parameters, [...at, "parameters"]);
    for (const action of ["publish", "subscribe"]) {
      if (has(ch, action)) visitOperation(ch[action], [...at, action]);
    }
  };

  if (isV3) {
    const info = follow(document.info, ["info"]);
    if (isObject(info.node) && info.node !== document) {
      checkDocsOf(info);
      visitTags(info.node.tags, [...info.path, "tags"]);
    }
  } else {
    if (has(document, "externalDocs")) checkDocs(document.externalDocs, ["externalDocs"]);
    visitTags(document.tags, ["tags"]);
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
    eachEntry(section.operationTraits, [...at, "operationTraits"], (node, path) => {
      const trait = enter("operationTrait", node, path);
      if (trait) visitTrait("operationTrait", trait);
    });
    eachEntry(section.messageTraits, [...at, "messageTraits"], (node, path) => {
      const trait = enter("messageTrait", node, path);
      if (trait) visitTrait("messageTrait", trait);
    });
    if (isV3) {
      eachEntry(section.operations, [...at, "operations"], visitOperation);
      eachEntry(section.replies, [...at, "replies"], visitReply);
      eachEntry(section.tags, [...at, "tags"], visitTag);
      eachEntry(section.externalDocs, [...at, "externalDocs"], checkDocs);
    } else {
      visitParameters(section.parameters, [...at, "parameters"]);
    }
    eachEntry(section.schemas, [...at, "schemas"], visitMultiFormat);
  }

  walkSchemas();
  return errors;
};
