/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string} options["naming-convention"] - kebab-case (default), camelCase, snake_case or PascalCase
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_CONVENTION = "kebab";
const EXTENSION_PREFIX = "x-";

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

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const format = (value) => (typeof value === "string" ? `'${value}'` : JSON.stringify(value));

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

const entriesOf = (map) =>
  isObject(map)
    ? Object.entries(map).filter(([key, value]) => isObject(value) && !isRef(value) && !key.startsWith(EXTENSION_PREFIX))
    : [];

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const convention = resolveConvention(options && options["naming-convention"]);
  const pattern = new RegExp(`^${CASES[convention]}$`);
  const isV3 = isVersion3Plus(document.asyncapi);

  const check = (value, path) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && pattern.test(value)) return;
    errors.push({
      message: `Tag name ${format(value)} must be ${LABELS[convention]}.`,
      path: [...context.path, ...path],
    });
  };

  const checkTag = (tag, path) => {
    if (typeof tag === "string") {
      check(tag, path);
    } else if (isObject(tag) && !isRef(tag)) {
      check(tag.name, [...path, "name"]);
    }
  };

  const checkTags = (tags, path) => {
    if (!Array.isArray(tags)) return;
    tags.forEach((tag, index) => checkTag(tag, [...path, index]));
  };

  const checkTaggable = (node, path) => {
    checkTags(node.tags, [...path, "tags"]);
    if (Array.isArray(node.traits)) {
      node.traits.forEach((trait, index) => {
        if (isObject(trait) && !isRef(trait)) checkTags(trait.tags, [...path, "traits", index, "tags"]);
      });
    }
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    checkTaggable(message, path);
  };

  const checkServers = (servers, path) => {
    for (const [key, server] of entriesOf(servers)) {
      checkTags(server.tags, [...path, key, "tags"]);
    }
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      if (isV3) {
        checkTags(channel.tags, [...path, key, "tags"]);
        for (const [messageKey, message] of entriesOf(channel.messages)) {
          checkMessage(message, [...path, key, "messages", messageKey]);
        }
        continue;
      }
      for (const action of ["publish", "subscribe"]) {
        const operation = channel[action];
        if (isObject(operation) && !isRef(operation)) {
          checkTaggable(operation, [...path, key, action]);
          checkMessage(operation.message, [...path, key, action, "message"]);
        }
      }
    }
  };

  const checkOperations = (operations, path) => {
    for (const [key, operation] of entriesOf(operations)) {
      checkTaggable(operation, [...path, key]);
    }
  };

  const checkTraitsMap = (traits, path) => {
    for (const [key, trait] of entriesOf(traits)) {
      checkTags(trait.tags, [...path, key, "tags"]);
    }
  };

  if (isV3) {
    if (isObject(document.info)) checkTags(document.info.tags, ["info", "tags"]);
  } else {
    checkTags(document.tags, ["tags"]);
  }

  checkServers(document.servers, ["servers"]);
  checkChannels(document.channels, ["channels"]);
  if (isV3) checkOperations(document.operations, ["operations"]);

  const components = document.components;
  if (isObject(components)) {
    checkServers(components.servers, ["components", "servers"]);
    checkChannels(components.channels, ["components", "channels"]);
    if (isV3) checkOperations(components.operations, ["components", "operations"]);
    for (const [key, message] of entriesOf(components.messages)) {
      checkMessage(message, ["components", "messages", key]);
    }
    checkTraitsMap(components.operationTraits, ["components", "operationTraits"]);
    checkTraitsMap(components.messageTraits, ["components", "messageTraits"]);
    if (isV3) {
      for (const [key, tag] of entriesOf(components.tags)) {
        checkTag(tag, ["components", "tags", key]);
      }
    }
  }

  return errors;
};
