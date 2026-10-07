/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options\["allowed-content-types"] - Comma-separated list (or array) of allowed media types.
 *   Entries are case-insensitive, their parameters are ignored and '*' matches any run of characters inside the
 *   type or the subtype (e.g. application/*+json). An unusable value falls back to the default list.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_ALLOWED_CONTENT_TYPES = [
  "application/json",
  "application/*+json",
  "application/xml",
  "application/*+xml",
  "text/xml",
  "text/plain",
  "text/csv",
  "application/octet-stream",
  "application/avro",
  "application/*+avro",
  "application/protobuf",
  "application/x-protobuf",
  "application/cbor",
  "application/yaml",
];

const RESTRICTED_NAME = "[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}";
const TOKEN = "[A-Za-z0-9!#$%&'*+.^_`|~-]+";
const QUOTED_STRING = '"(?:[^"\\\\]|\\\\.)*"';
const OWS = "[ \\t]*";
const MEDIA_TYPE = new RegExp(
  `^(${RESTRICTED_NAME})/(${RESTRICTED_NAME})(?:${OWS};${OWS}(?:${TOKEN}=(?:${TOKEN}|${QUOTED_STRING}))?)*$`
);
const ENTRY = /^[a-z0-9*][a-z0-9!#$&^_.+*-]*\/[a-z0-9*][a-z0-9!#$&^_.+*-]*$/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const format = (value) => (typeof value === "string" ? `'${value}'` : JSON.stringify(value));

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const normalizeEntry = (entry) => entry.split(";")[0].trim().toLowerCase();

const parseAllowed = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  const entries = [...new Set(candidates.map(normalizeEntry).filter((entry) => ENTRY.test(entry)))];
  return entries.length > 0 ? entries : DEFAULT_ALLOWED_CONTENT_TYPES;
};

const toMatcher = (entry) =>
  new RegExp(`^${entry.split("*").map((part) => part.replace(/[.+^$|\\]/g, "\\$&")).join("[^/]*")}$`);

const entriesOf = (map) => (isObject(map) ? Object.entries(map).filter(([, value]) => isObject(value) && !isRef(value)) : []);

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const allowed = parseAllowed(options && options["allowed-content-types"]);
  const matchers = allowed.map(toMatcher);
  const isV3 = isVersion3Plus(document.asyncapi);

  const check = (value, label, path) => {
    if (value === undefined || value === null) return;
    const match = typeof value === "string" ? MEDIA_TYPE.exec(value) : null;
    if (match === null) {
      errors.push({
        message: `${label} ${format(value)} is not a valid MIME type.`,
        path: [...context.path, ...path],
      });
      return;
    }
    const mediaType = `${match[1]}/${match[2]}`.toLowerCase();
    if (!matchers.some((matcher) => matcher.test(mediaType))) {
      errors.push({
        message: `${label} ${format(value)} is not an allowed MIME type.`,
        path: [...context.path, ...path],
      });
    }
  };

  const checkTrait = (trait, path) => {
    if (!isObject(trait) || isRef(trait)) return;
    check(trait.contentType, "Message trait contentType", [...path, "contentType"]);
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    check(message.contentType, "contentType", [...path, "contentType"]);
    if (Array.isArray(message.traits)) {
      message.traits.forEach((trait, index) => {
        if (Array.isArray(trait)) {
          checkTrait(trait[0], [...path, "traits", index, 0]);
        } else {
          checkTrait(trait, [...path, "traits", index]);
        }
      });
    }
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      if (isV3) {
        for (const [messageKey, message] of entriesOf(channel.messages)) {
          checkMessage(message, [...path, key, "messages", messageKey]);
        }
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

  if (has(document, "defaultContentType")) {
    check(document.defaultContentType, "defaultContentType", ["defaultContentType"]);
  }

  checkChannels(document.channels, ["channels"]);

  const components = document.components;
  if (isObject(components)) {
    checkChannels(components.channels, ["components", "channels"]);
    for (const [key, message] of entriesOf(components.messages)) {
      checkMessage(message, ["components", "messages", key]);
    }
    for (const [key, trait] of entriesOf(components.messageTraits)) {
      checkTrait(trait, ["components", "messageTraits", key]);
    }
  }

  return errors;
};
