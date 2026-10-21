/**
 * @param {*} protocol - The protocol of a root server (given: "$.servers[*]", field: "protocol", resolved document)
 * @param {object} options - Function options
 * @param {string} options.pattern - Regular expression every protocol must match, written plainly or as a /source/flags
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_PATTERN = "^(https|wss|amqps|kafka-secure|secure-mqtt)$";
const REGEXP_LITERAL = /^\/(.+)\/([a-z]*)$/;

const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const printable = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, (char) => ESCAPES[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

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

module.exports = (protocol, options, context) => {
  const path = context && Array.isArray(context.path) ? context.path : [];
  if (typeof protocol !== "string" || (path.length > 0 && path[path.length - 1] !== "protocol")) {
    return [];
  }

  const pattern = parsePattern(options && options.pattern);
  pattern.regex.lastIndex = 0;
  if (pattern.regex.test(protocol)) {
    return [];
  }

  return [{ message: `Server protocol '${printable(protocol)}' must match '${printable(pattern.source)}'.` }];
};
