/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string} options.pattern - Regular expression every protocol binding bindingVersion must match, written plainly
 *   or as a /source/flags literal like Spectral's pattern function. It is trimmed and applied unanchored, so anchors
 *   belong in the expression. A non-string, blank or invalid value falls back to the default ^\d+\.\d+\.\d+$.
 *   A missing or null bindingVersion is left to AAR037; any other non-string value is reported.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_PATTERN = "^\\d+\\.\\d+\\.\\d+$";
const REGEXP_LITERAL = /^\/(.+)\/([a-z]*)$/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

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

const entriesOf = (map) => (isObject(map) ? Object.entries(map).filter(([, value]) => isObject(value) && !isRef(value)) : []);
const itemsOf = (list) => (Array.isArray(list) ? list.map((item, index) => [index, item]) : []);

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const pattern = parsePattern(options && options.pattern);
  const isV3 = isVersion3Plus(document.asyncapi);

  const matches = (version) => {
    pattern.regex.lastIndex = 0;
    return pattern.regex.test(version);
  };

  const checkBindings = (bindings, kind, path) => {
    if (!isObject(bindings) || isRef(bindings)) return;
    for (const [key, binding] of Object.entries(bindings)) {
      if (key.startsWith("x-") || !isObject(binding) || isRef(binding)) continue;
      const version = binding.bindingVersion;
      if (version === undefined || version === null) continue;
      const at = [...context.path, ...path, key, "bindingVersion"];
      if (typeof version !== "string") {
        errors.push({ message: `${kind} binding '${key}' bindingVersion must be a string matching '${pattern.source}'.`, path: at });
      } else if (!matches(version)) {
        errors.push({ message: `${kind} binding '${key}' bindingVersion '${printable(version)}' must match '${pattern.source}'.`, path: at });
      }
    }
  };

  const checkHolder = (holder, kind, path) => {
    if (!isObject(holder) || isRef(holder)) return;
    checkBindings(holder.bindings, kind, [...path, "bindings"]);
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    checkHolder(message, "Message", path);
    for (const [index, trait] of itemsOf(message.traits)) {
      if (Array.isArray(trait)) {
        checkHolder(trait[0], "Message", [...path, "traits", index, 0]);
      } else {
        checkHolder(trait, "Message", [...path, "traits", index]);
      }
    }
  };

  const checkOperation = (operation, path) => {
    if (!isObject(operation) || isRef(operation)) return;
    checkHolder(operation, "Operation", path);
    for (const [index, trait] of itemsOf(operation.traits)) {
      checkHolder(trait, "Operation", [...path, "traits", index]);
    }
    if (!isV3) {
      checkMessage(operation.message, [...path, "message"]);
    }
  };

  const checkServers = (servers, path) => {
    for (const [key, server] of entriesOf(servers)) {
      checkHolder(server, "Server", [...path, key]);
    }
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      checkHolder(channel, "Channel", [...path, key]);
      if (isV3) {
        for (const [messageKey, message] of entriesOf(channel.messages)) {
          checkMessage(message, [...path, key, "messages", messageKey]);
        }
        continue;
      }
      for (const action of ["publish", "subscribe"]) {
        checkOperation(channel[action], [...path, key, action]);
      }
    }
  };

  const checkOperations = (operations, path) => {
    if (!isV3) return;
    for (const [key, operation] of entriesOf(operations)) {
      checkOperation(operation, [...path, key]);
    }
  };

  checkServers(document.servers, ["servers"]);
  checkChannels(document.channels, ["channels"]);
  checkOperations(document.operations, ["operations"]);

  const components = document.components;
  if (isObject(components)) {
    checkServers(components.servers, ["components", "servers"]);
    checkChannels(components.channels, ["components", "channels"]);
    checkOperations(components.operations, ["components", "operations"]);
    for (const [key, message] of entriesOf(components.messages)) {
      checkMessage(message, ["components", "messages", key]);
    }
    for (const [key, trait] of entriesOf(components.messageTraits)) {
      checkHolder(trait, "Message", ["components", "messageTraits", key]);
    }
    for (const [key, trait] of entriesOf(components.operationTraits)) {
      checkHolder(trait, "Operation", ["components", "operationTraits", key]);
    }
    for (const [section, kind] of [
      ["serverBindings", "Server"],
      ["channelBindings", "Channel"],
      ["operationBindings", "Operation"],
      ["messageBindings", "Message"],
    ]) {
      for (const [key, bindings] of entriesOf(components[section])) {
        checkBindings(bindings, kind, ["components", section, key]);
      }
    }
  }

  return errors;
};
