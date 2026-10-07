/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string} options["naming-convention"] - camelCase (default), snake_case, kebab-case or PascalCase
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_CONVENTION = "camel";
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

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const convention = resolveConvention(options && options["naming-convention"]);
  const pattern = new RegExp(`^${CASES[convention]}$`);
  const isV3 = isVersion3Plus(document.asyncapi);

  const check = (value, label, path) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && pattern.test(value)) return;
    errors.push({
      message: `${label} ${format(value)} must be ${LABELS[convention]}.`,
      path: [...context.path, ...path],
    });
  };

  const checkFields = (node, owner, path) => {
    if (!isObject(node) || isRef(node)) return;
    if (!isV3) {
      check(node.messageId, owner === "Message" ? "messageId" : `${owner} messageId`, [...path, "messageId"]);
    }
    check(node.name, `${owner} name`, [...path, "name"]);
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    checkFields(message, "Message", path);
    if (Array.isArray(message.traits)) {
      message.traits.forEach((trait, index) => checkFields(trait, "Message trait", [...path, "traits", index]));
    }
  };

  const checkMessagesMap = (messages, path) => {
    if (!isObject(messages)) return;
    for (const [key, message] of Object.entries(messages)) {
      if (!isObject(message) || key.startsWith(EXTENSION_PREFIX)) continue;
      check(key, "Message key", [...path, key]);
      checkMessage(message, [...path, key]);
    }
  };

  const checkChannels = (channels, path) => {
    if (!isObject(channels)) return;
    for (const [key, channel] of Object.entries(channels)) {
      if (!isObject(channel) || isRef(channel) || key.startsWith(EXTENSION_PREFIX)) continue;
      if (isV3) {
        checkMessagesMap(channel.messages, [...path, key, "messages"]);
        continue;
      }
      for (const action of ["publish", "subscribe"]) {
        const operation = channel[action];
        if (isObject(operation) && !isRef(operation)) {
          checkMessage(operation.message, [...path, key, action, "message"]);
        }
      }
    }
  };

  checkChannels(document.channels, ["channels"]);

  const components = document.components;
  if (isObject(components)) {
    checkChannels(components.channels, ["components", "channels"]);
    if (isV3) {
      checkMessagesMap(components.messages, ["components", "messages"]);
    } else if (isObject(components.messages)) {
      for (const [key, message] of Object.entries(components.messages)) {
        checkMessage(message, ["components", "messages", key]);
      }
    }
    if (isObject(components.messageTraits)) {
      for (const [key, trait] of Object.entries(components.messageTraits)) {
        checkFields(trait, "Message trait", ["components", "messageTraits", key]);
      }
    }
  }

  return errors;
};
