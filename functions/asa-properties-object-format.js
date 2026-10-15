/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string} options["naming-convention"] - camelCase (default), snake_case, kebab-case or PascalCase
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_CONVENTION = "camel";
const MAX_DEPTH = 100;

const CASES = {
  camel: "[a-z][a-z0-9]*(?:[A-Z0-9](?:[a-z0-9]+|$))*",
  pascal: "[A-Z][a-z0-9]*(?:[A-Z0-9](?:[a-z0-9]+|$))*",
  kebab: "[a-z][a-z0-9]*(?:-[a-z0-9]+)*",
  snake: "[a-z][a-z0-9]*(?:_[a-z0-9]+)*",
};

const ALIASES = { lowercamel: "camel", uppercamel: "pascal" };

const LABELS = {
  camel: "camelCase",
  pascal: "PascalCase",
  kebab: "kebab-case",
  snake: "snake_case",
};

const SUBSCHEMA_KEYWORDS = ["additionalProperties", "unevaluatedProperties", "items", "additionalItems", "unevaluatedItems", "prefixItems", "contains", "not", "if", "then", "else", "allOf", "anyOf", "oneOf", "values"];
const SCHEMA_MAP_KEYWORDS = ["patternProperties", "definitions", "$defs", "dependentSchemas", "dependencies"];
const AVRO_RECORDS = new Set(["record", "error"]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const entriesOf = (map) => (isObject(map) ? Object.entries(map) : []);

const resolveConvention = (value) => {
  if (typeof value !== "string") return DEFAULT_CONVENTION;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]/g, "").replace(/case$/, "");
  if (has(CASES, normalized)) return normalized;
  return has(ALIASES, normalized) ? ALIASES[normalized] : DEFAULT_CONVENTION;
};

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const kindOf = (schemaFormat) => {
  if (schemaFormat === undefined || schemaFormat === null) return "schema";
  if (typeof schemaFormat !== "string") return null;
  const mediaType = schemaFormat.split(";")[0].trim().toLowerCase();
  if (/^application\/vnd\.aai\.asyncapi(\+(json|yaml))?$/.test(mediaType)) return "schema";
  if (/^application\/schema\+(json|yaml)$/.test(mediaType)) return "schema";
  if (/^application\/vnd\.oai\.openapi(\+(json|yaml))?$/.test(mediaType)) return "schema";
  if (/^application\/vnd\.apache\.avro(\+(json|yaml))?$/.test(mediaType)) return "avro";
  return null;
};

const isAvroRecord = (node) => AVRO_RECORDS.has(node.type) && Array.isArray(node.fields);

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const convention = resolveConvention(options && options["naming-convention"]);
  const pattern = new RegExp(`^${CASES[convention]}$`);
  const isV3 = isVersion3Plus(document.asyncapi);

  const locate = (ref) => {
    if (typeof ref !== "string" || !ref.startsWith("#")) return undefined;
    let fragment;
    try {
      fragment = decodeURIComponent(ref.slice(1));
    } catch (error) {
      return undefined;
    }
    if (!fragment.startsWith("/")) return undefined;
    let node = document;
    const path = [];
    for (const token of fragment.slice(1).split("/")) {
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
      if (node === null || typeof node !== "object" || !has(node, key)) return undefined;
      path.push(Array.isArray(node) ? Number(key) : key);
      node = node[key];
    }
    return { node, path };
  };

  const follow = (node, path) => {
    const seen = new Set();
    let current = { node, path };
    while (isRef(current.node)) {
      const ref = current.node.$ref;
      if (seen.has(ref)) return undefined;
      seen.add(ref);
      const target = locate(ref);
      if (target === undefined) return undefined;
      current = target;
    }
    return current;
  };

  const locatable = (path) => {
    const source = context.document;
    if (!source || typeof source.getRangeForJsonPath !== "function") return path;
    for (let length = path.length; length > 0; length--) {
      if (source.getRangeForJsonPath(path.slice(0, length), false) !== undefined) return path.slice(0, length);
    }
    return path;
  };

  const reported = new Set();
  const report = (message, path) => {
    const located = locatable([...context.path, ...path]);
    const key = `${JSON.stringify(located)}\u0000${message}`;
    if (reported.has(key)) return;
    reported.add(key);
    errors.push({ message, path: located });
  };

  const check = (label, value, at, key) => {
    if (typeof value === "string" && pattern.test(value)) return;
    const message = typeof value === "string" ? `${label} '${value}' must be ${LABELS[convention]}.` : `${label} must be a ${LABELS[convention]} string.`;
    report(message, at.frozen ? at.path : [...at.path, ...key]);
  };

  const visited = new Set();
  const child = (at, key) => (at.frozen ? at : { path: [...at.path, key], frozen: false });

  const walk = (node, at, depth, stack) => {
    if (depth > MAX_DEPTH) return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, child(at, index), depth + 1, stack));
      return;
    }
    if (!isObject(node) || stack.has(node)) return;
    if (isRef(node)) {
      if (at.frozen) return;
      const target = follow(node, at.path);
      if (target !== undefined) walk(target.node, { path: target.path, frozen: false }, depth + 1, stack);
      return;
    }
    if (!at.frozen) {
      const key = JSON.stringify(at.path);
      if (visited.has(key)) return;
      visited.add(key);
    }
    stack.add(node);
    if (isAvroRecord(node)) {
      const fieldsAt = child(at, "fields");
      node.fields.forEach((field, index) => {
        if (!isObject(field)) return;
        if (field.name !== undefined && field.name !== null) check("Avro field name", field.name, fieldsAt, [index, "name"]);
        walk(field.type, child(child(fieldsAt, index), "type"), depth + 1, stack);
      });
    }
    if (isObject(node.properties)) {
      Object.keys(node.properties).forEach((name) => {
        check("Property name", name, at, ["properties", name]);
        walk(node.properties[name], child(child(at, "properties"), name), depth + 1, stack);
      });
    }
    if (isObject(node.type) || Array.isArray(node.type)) walk(node.type, child(at, "type"), depth + 1, stack);
    SUBSCHEMA_KEYWORDS.forEach((keyword) => {
      if (has(node, keyword)) walk(node[keyword], child(at, keyword), depth + 1, stack);
    });
    SCHEMA_MAP_KEYWORDS.forEach((keyword) => {
      entriesOf(node[keyword]).forEach(([key, value]) => walk(value, child(child(at, keyword), key), depth + 1, stack));
    });
    stack.delete(node);
  };

  const walkRoot = (node, path, kind) => {
    if (kind === null) return;
    if (kind === "avro" && typeof node === "string" && /^\s*[[{]/.test(node)) {
      let parsed;
      try {
        parsed = JSON.parse(node);
      } catch (error) {
        return;
      }
      walk(parsed, { path, frozen: true }, 0, new Set());
      return;
    }
    walk(node, { path, frozen: false }, 0, new Set());
  };

  const walkMultiFormat = (node, path) => {
    if (!isV3) {
      walkRoot(node, path, "schema");
      return;
    }
    const target = follow(node, path);
    if (target === undefined) return;
    if (isObject(target.node) && has(target.node, "schemaFormat")) {
      if (has(target.node, "schema")) walkRoot(target.node.schema, [...target.path, "schema"], kindOf(target.node.schemaFormat));
      return;
    }
    walkRoot(target.node, target.path, "schema");
  };

  const traitsOf = (message, path) => {
    const list = follow(message.traits, [...path, "traits"]);
    if (list === undefined || !Array.isArray(list.node)) return [];
    return list.node
      .map((entry, index) => (Array.isArray(entry) ? follow(entry[0], [...list.path, index, 0]) : follow(entry, [...list.path, index])))
      .filter((trait) => trait !== undefined && isObject(trait.node));
  };

  const visitTrait = (trait, path) => {
    if (has(trait, "headers")) walkMultiFormat(trait.headers, [...path, "headers"]);
  };

  const pending = [];
  const seenMessages = new Set();

  const checkMessage = (message, path) => {
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => visitMessage(member, [...path, "oneOf", index]));
      return;
    }
    const traits = traitsOf(message, path);
    traits.forEach((trait) => visitTrait(trait.node, trait.path));
    if (has(message, "headers")) walkMultiFormat(message.headers, [...path, "headers"]);
    if (!has(message, "payload")) return;
    if (isV3) {
      walkMultiFormat(message.payload, [...path, "payload"]);
      return;
    }
    const schemaFormat = traits.reduce(
      (current, trait) => (has(trait.node, "schemaFormat") ? trait.node.schemaFormat : current),
      message.schemaFormat
    );
    walkRoot(message.payload, [...path, "payload"], kindOf(schemaFormat));
  };

  const visitMessage = (node, path) => {
    if (isRef(node)) {
      pending.push({ kind: "message", node, path });
      return;
    }
    if (!isObject(node)) return;
    const key = JSON.stringify(path);
    if (seenMessages.has(key)) return;
    seenMessages.add(key);
    checkMessage(node, path);
  };

  const visitParameters = (parameters, path) => {
    entriesOf(parameters).forEach(([key, parameter]) => {
      const target = follow(parameter, [...path, key]);
      if (target !== undefined && isObject(target.node) && has(target.node, "schema")) {
        walkRoot(target.node.schema, [...target.path, "schema"], "schema");
      }
    });
  };

  const visitChannel = (node, path) => {
    if (isRef(node)) {
      pending.push({ kind: "channel", node, path });
      return;
    }
    if (!isObject(node)) return;
    if (isV3) {
      entriesOf(node.messages).forEach(([key, message]) => visitMessage(message, [...path, "messages", key]));
      return;
    }
    visitParameters(node.parameters, [...path, "parameters"]);
    ["publish", "subscribe"].forEach((action) => {
      const operation = node[action];
      if (isObject(operation) && !isRef(operation) && has(operation, "message")) {
        visitMessage(operation.message, [...path, action, "message"]);
      }
    });
  };

  const visitOperation = (node, path) => {
    const target = follow(node, path);
    if (target === undefined || !isObject(target.node)) return;
    const operation = target.node;
    if (Array.isArray(operation.messages)) {
      operation.messages.forEach((message, index) => visitMessage(message, [...target.path, "messages", index]));
    }
    const reply = follow(operation.reply, [...target.path, "reply"]);
    if (reply !== undefined && isObject(reply.node) && Array.isArray(reply.node.messages)) {
      reply.node.messages.forEach((message, index) => visitMessage(message, [...reply.path, "messages", index]));
    }
  };

  entriesOf(document.channels).forEach(([key, channel]) => visitChannel(channel, ["channels", key]));
  if (isV3) entriesOf(document.operations).forEach(([key, operation]) => visitOperation(operation, ["operations", key]));

  const components = document.components;
  if (isObject(components)) {
    entriesOf(components.schemas).forEach(([key, schema]) => walkMultiFormat(schema, ["components", "schemas", key]));
    entriesOf(components.channels).forEach(([key, channel]) => visitChannel(channel, ["components", "channels", key]));
    entriesOf(components.messages).forEach(([key, message]) => visitMessage(message, ["components", "messages", key]));
    entriesOf(components.messageTraits).forEach(([key, trait]) => {
      const target = follow(trait, ["components", "messageTraits", key]);
      if (target !== undefined && isObject(target.node)) visitTrait(target.node, target.path);
    });
    if (isV3) {
      entriesOf(components.operations).forEach(([key, operation]) => visitOperation(operation, ["components", "operations", key]));
      entriesOf(components.replies).forEach(([key, reply]) => {
        const target = follow(reply, ["components", "replies", key]);
        if (target !== undefined && isObject(target.node) && Array.isArray(target.node.messages)) {
          target.node.messages.forEach((message, index) => visitMessage(message, [...target.path, "messages", index]));
        }
      });
    } else {
      visitParameters(components.parameters, ["components", "parameters"]);
    }
  }

  while (pending.length > 0) {
    const { kind, node, path } = pending.shift();
    const target = follow(node, path);
    if (target === undefined) continue;
    (kind === "message" ? visitMessage : visitChannel)(target.node, target.path);
  }

  return errors;
};
