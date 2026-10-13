/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: the rule has no options
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");
const MAX_DEPTH = 100;
const MAX_LISTED = 10;

const JSON_TYPES = new Set(["null", "boolean", "object", "array", "number", "integer", "string"]);
const AVRO_PRIMITIVES = new Set(["null", "boolean", "int", "long", "float", "double", "bytes", "string"]);
const AVRO_NAMED = new Set(["record", "error", "enum", "fixed"]);
const INT_MIN = -(2 ** 31);
const INT_MAX = 2 ** 31 - 1;
const LONG_LIMIT = 2 ** 63;
const BYTES = /^[\x00-\xff]*$/;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const isDataRef = (value) => isObject(value) && typeof value.$ref === "string";
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const entriesOf = (map) => (isObject(map) ? Object.entries(map) : []);

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const isDate = (text) => {
  const match = /^(\d\d\d\d)-(\d\d)-(\d\d)$/.exec(text);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
};
const isTime = (text, withTimeZone) => {
  const match = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i.exec(text);
  if (match === null) return false;
  const [hour, minute, second] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const inRange = (hour <= 23 && minute <= 59 && second <= 59) || (hour === 23 && minute === 59 && second === 60);
  return inRange && (!withTimeZone || match[5] !== undefined);
};
const isDateTime = (text) => {
  const parts = text.split(/t|\s/i);
  return parts.length === 2 && isDate(parts[0]) && isTime(parts[1], true);
};

const URI =
  /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
const URI_REFERENCE =
  /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
const URL =
  /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
const IPV6 =
  /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i;

const STRING_FORMATS = {
  date: isDate,
  time: (text) => isTime(text, false),
  "date-time": isDateTime,
  duration: (text) => /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/.test(text),
  uri: (text) => /\/|:/.test(text) && URI.test(text),
  "uri-reference": (text) => URI_REFERENCE.test(text),
  "uri-template": (text) =>
    /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i.test(text),
  url: (text) => URL.test(text),
  email: (text) => /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(text),
  hostname: (text) => /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i.test(text),
  ipv4: (text) => /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(text),
  ipv6: (text) => IPV6.test(text),
  regex: (text) => {
    if (/[^\\]\\Z/.test(text)) return false;
    try {
      new RegExp(text);
      return true;
    } catch (error) {
      return false;
    }
  },
  uuid: (text) => /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(text),
  "json-pointer": (text) => /^(?:\/(?:[^~/]|~0|~1)*)*$/.test(text),
  "json-pointer-uri-fragment": (text) => /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i.test(text),
  "relative-json-pointer": (text) => /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/.test(text),
  byte: (text) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text),
};
const NUMBER_FORMATS = {
  int32: (value) => Number.isInteger(value) && value >= INT_MIN && value <= INT_MAX,
  int64: (value) => Number.isInteger(value),
};

const patterns = new Map();
const regexOf = (source) => {
  if (typeof source !== "string") return null;
  if (patterns.has(source)) return patterns.get(source);
  let compiled = null;
  for (const flags of /\\[pPu]\{/.test(source) ? ["u", ""] : ["", "u"]) {
    try {
      compiled = new RegExp(source, flags);
      break;
    } catch (error) {
      compiled = null;
    }
  }
  patterns.set(source, compiled);
  return compiled;
};

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Number.isNaN(a) && Number.isNaN(b);
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => deepEqual(value, b[index]));
  }
  if (!isObject(a) || !isObject(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => has(b, key) && deepEqual(a[key], b[key]));
};

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "number") return Number.isNaN(value) ? "NaN" : String(value === 0 ? 0 : value);
  return value === undefined ? "undefined" : JSON.stringify(value);
};

const show = (value) => {
  const text = JSON.stringify(value) || String(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
};
const listOf = (values, format = show) => {
  const shown = values.slice(0, MAX_LISTED).map(format).join(", ");
  return values.length > MAX_LISTED ? `${shown} and ${values.length - MAX_LISTED} more` : shown;
};
const display = (trail) =>
  trail.reduce((text, segment, index) => {
    if (typeof segment === "number") return `${text}[${segment}]`;
    if (/^[A-Za-z_$][\w$-]*$/.test(segment)) return index === 0 ? segment : `${text}.${segment}`;
    return `${text}[${JSON.stringify(segment)}]`;
  }, "");

const matchesType = (type, value) => {
  switch (type) {
    case "null":
      return value === null;
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isObject(value);
    case "array":
      return Array.isArray(value);
    case "number":
      return typeof value === "number";
    case "integer":
      return Number.isInteger(value);
    default:
      return typeof value === "string";
  }
};

const kindOf = (format) => {
  if (format === undefined || format === null) return "json";
  if (typeof format !== "string") return null;
  const [mediaType, ...parameters] = format.split(";").map((part) => part.trim().toLowerCase());
  if (/^application\/vnd\.aai\.asyncapi(\+(json|yaml))?$/.test(mediaType)) return "json";
  if (/^application\/schema\+(json|yaml)$/.test(mediaType)) return "json";
  if (/^application\/vnd\.apache\.avro(\+(json|yaml))?$/.test(mediaType)) return "avro";
  if (/^application\/vnd\.oai\.openapi(\+(json|yaml))?$/.test(mediaType)) {
    const version = parameters.find((parameter) => /^version\s*=/.test(parameter));
    return version === undefined || /^version\s*=\s*"?3\.0(\.|"|$)/.test(version) ? "openapi" : "json";
  }
  return null;
};

const child = (at, key) => ({ raw: at.frozen ? at.raw : [...at.raw, key], frozen: at.frozen, trail: [...at.trail, key] });
const problem = (at, text, kind = "") => ({ raw: at.raw, trail: at.trail, text, kind });
const pickBranch = (results, at) => {
  const depth = at.trail.length;
  const plausible = results.filter((errors) => !errors.some((error) => error.kind !== "" && error.trail.length === depth));
  if (plausible.length === 1) return plausible[0];
  const discriminated = plausible.filter((errors) => !errors.some((error) => error.kind === "value" && error.trail.length === depth + 1));
  return discriminated.length === 1 ? discriminated[0] : null;
};

module.exports = (document, _options, context) => {
  const results = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return results;
  }

  const isV3 = isVersion3Plus(document.asyncapi);

  const locate = (ref) => {
    let fragment;
    try {
      fragment = decodeURIComponent(ref.slice(1));
    } catch (error) {
      return undefined;
    }
    if (fragment === "") return { node: document, path: [] };
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

  const follow = (node) => {
    const seen = new Set();
    let current = { node, path: null, viaRef: false };
    while (isRef(current.node)) {
      const ref = current.node.$ref;
      if (typeof ref !== "string") return undefined;
      if (!ref.startsWith("#")) return UNKNOWN;
      if (seen.has(ref)) return undefined;
      seen.add(ref);
      const target = locate(ref);
      if (target === undefined) return undefined;
      current = { node: target.node, path: target.path, viaRef: true };
    }
    return current;
  };

  const valueOf = (node) => {
    const target = follow(node);
    return target === UNKNOWN ? UNKNOWN : target && target.node;
  };

  const resolveData = (data, at) => {
    if (!isDataRef(data)) return { data, at };
    const target = follow(data);
    if (target === UNKNOWN || target === undefined) return null;
    return { data: target.node, at: { ...at, frozen: true } };
  };

  const validateJson = (schema, value, location, nullable, active = new Set()) => {
    const resolved = resolveData(value, location);
    if (resolved === null || location.trail.length > MAX_DEPTH) return [];
    const { data, at } = resolved;
    if (schema === false) return [problem(at, "is not allowed", "type")];
    if (!isObject(schema) || active.has(schema)) return [];
    if (nullable && schema.nullable === true && data === null) return [];
    active.add(schema);
    const errors = [];
    const same = (sub) => validateJson(sub, data, at, nullable, active);
    const nested = (sub, key, item) => validateJson(sub, item, child(at, key), nullable);
    const isValid = (sub, item) => validateJson(sub, item, at, nullable, new Set()).length === 0;

    if (typeof schema.$ref === "string" && schema.$ref.startsWith("#")) {
      const target = locate(schema.$ref);
      if (target !== undefined) errors.push(...same(target.node));
    }

    const types = typeof schema.type === "string" ? [schema.type] : Array.isArray(schema.type) ? schema.type : [];
    if (types.length > 0 && types.every((type) => JSON_TYPES.has(type)) && !types.some((type) => matchesType(type, data))) {
      errors.push(problem(at, `must be ${types.join(" or ")}`, "type"));
      active.delete(schema);
      return errors;
    }
    if (Array.isArray(schema.enum) && !schema.enum.some((option) => deepEqual(option, data))) {
      errors.push(problem(at, `must be one of: ${listOf(schema.enum)}`, "value"));
    }
    if (has(schema, "const") && !deepEqual(schema.const, data)) {
      errors.push(problem(at, `must equal ${show(schema.const)}`, "value"));
    }

    if (typeof data === "number") {
      if (typeof schema.multipleOf === "number" && schema.multipleOf > 0) {
        const quotient = data / schema.multipleOf;
        if (Number.isFinite(quotient) && Math.abs(quotient - Math.round(quotient)) > 1e-9 * Math.max(1, Math.abs(quotient))) {
          errors.push(problem(at, `must be multiple of ${schema.multipleOf}`));
        }
      }
      if (typeof schema.maximum === "number") {
        if (schema.exclusiveMaximum === true ? data >= schema.maximum : data > schema.maximum) {
          errors.push(problem(at, `must be ${schema.exclusiveMaximum === true ? "<" : "<="} ${schema.maximum}`));
        }
      }
      if (typeof schema.exclusiveMaximum === "number" && data >= schema.exclusiveMaximum) {
        errors.push(problem(at, `must be < ${schema.exclusiveMaximum}`));
      }
      if (typeof schema.minimum === "number") {
        if (schema.exclusiveMinimum === true ? data <= schema.minimum : data < schema.minimum) {
          errors.push(problem(at, `must be ${schema.exclusiveMinimum === true ? ">" : ">="} ${schema.minimum}`));
        }
      }
      if (typeof schema.exclusiveMinimum === "number" && data <= schema.exclusiveMinimum) {
        errors.push(problem(at, `must be > ${schema.exclusiveMinimum}`));
      }
      if (typeof schema.format === "string" && has(NUMBER_FORMATS, schema.format) && !NUMBER_FORMATS[schema.format](data)) {
        errors.push(problem(at, `must match format "${schema.format}"`));
      }
    }

    if (typeof data === "string") {
      const length = [...data].length;
      if (typeof schema.maxLength === "number" && length > schema.maxLength) {
        errors.push(problem(at, `must not have more than ${schema.maxLength} characters`));
      }
      if (typeof schema.minLength === "number" && length < schema.minLength) {
        errors.push(problem(at, `must not have fewer than ${schema.minLength} characters`));
      }
      const regex = regexOf(schema.pattern);
      if (regex !== null && !regex.test(data)) {
        errors.push(problem(at, `must match pattern ${JSON.stringify(schema.pattern)}`));
      }
      if (typeof schema.format === "string" && has(STRING_FORMATS, schema.format) && !STRING_FORMATS[schema.format](data)) {
        errors.push(problem(at, `must match format "${schema.format}"`));
      }
    }

    if (Array.isArray(data)) {
      if (typeof schema.maxItems === "number" && data.length > schema.maxItems) {
        errors.push(problem(at, `must not have more than ${schema.maxItems} items`));
      }
      if (typeof schema.minItems === "number" && data.length < schema.minItems) {
        errors.push(problem(at, `must not have fewer than ${schema.minItems} items`));
      }
      if (schema.uniqueItems === true) {
        const seen = new Map();
        for (const [index, item] of data.entries()) {
          const key = canonical(item);
          if (seen.has(key)) {
            errors.push(problem(at, `must not have duplicate items: items ${seen.get(key)} and ${index} are identical`));
            break;
          }
          seen.set(key, index);
        }
      }
      let tuple = [];
      let rest = schema.items;
      if (Array.isArray(schema.prefixItems)) {
        tuple = schema.prefixItems;
      } else if (Array.isArray(schema.items)) {
        tuple = schema.items;
        rest = schema.additionalItems;
      }
      data.forEach((item, index) => {
        if (index < tuple.length) {
          errors.push(...nested(tuple[index], index, item));
        } else if (rest !== undefined && rest !== false && !Array.isArray(rest)) {
          errors.push(...nested(rest, index, item));
        }
      });
      if (rest === false && data.length > tuple.length) {
        errors.push(problem(at, `must not have more than ${tuple.length} items`));
      }
      if (has(schema, "contains") && (isObject(schema.contains) || typeof schema.contains === "boolean")) {
        const count = data.filter((item) => isValid(schema.contains, item)).length;
        const atLeast = typeof schema.minContains === "number" ? schema.minContains : 1;
        if (count < atLeast) {
          errors.push(problem(at, `must contain at least ${atLeast} valid item${atLeast === 1 ? "" : "s"}`));
        }
        if (typeof schema.maxContains === "number" && count > schema.maxContains) {
          errors.push(problem(at, `must contain at most ${schema.maxContains} valid item${schema.maxContains === 1 ? "" : "s"}`));
        }
      }
    }

    if (isObject(data)) {
      const keys = Object.keys(data);
      if (typeof schema.maxProperties === "number" && keys.length > schema.maxProperties) {
        errors.push(problem(at, `must not have more than ${schema.maxProperties} properties`));
      }
      if (typeof schema.minProperties === "number" && keys.length < schema.minProperties) {
        errors.push(problem(at, `must not have fewer than ${schema.minProperties} properties`));
      }
      if (Array.isArray(schema.required)) {
        schema.required
          .filter((key) => typeof key === "string" && !has(data, key))
          .forEach((key) => errors.push(problem(at, `must have required property '${key}'`)));
      }
      const properties = isObject(schema.properties) ? schema.properties : {};
      const patternRegexes = entriesOf(schema.patternProperties)
        .map(([source, sub]) => [regexOf(source), sub])
        .filter(([regex]) => regex !== null);
      keys.forEach((key) => {
        let evaluated = false;
        if (has(properties, key)) {
          evaluated = true;
          errors.push(...nested(properties[key], key, data[key]));
        }
        patternRegexes.forEach(([regex, sub]) => {
          if (regex.test(key)) {
            evaluated = true;
            errors.push(...nested(sub, key, data[key]));
          }
        });
        if (!evaluated && has(schema, "additionalProperties")) {
          if (schema.additionalProperties === false) {
            errors.push(problem(child(at, key), "is not allowed by additionalProperties"));
          } else {
            errors.push(...nested(schema.additionalProperties, key, data[key]));
          }
        }
        if (has(schema, "propertyNames")) {
          const nameErrors = validateJson(schema.propertyNames, key, child(at, key), nullable);
          if (nameErrors.length > 0) {
            errors.push(problem(child(at, key), `is not a valid property name: ${nameErrors[0].text}`));
          }
        }
      });
      const dependencies = [...entriesOf(schema.dependencies), ...entriesOf(schema.dependentRequired), ...entriesOf(schema.dependentSchemas)];
      dependencies
        .filter(([key]) => has(data, key))
        .forEach(([key, dependency]) => {
          if (Array.isArray(dependency)) {
            dependency
              .filter((required) => typeof required === "string" && !has(data, required))
              .forEach((required) => errors.push(problem(at, `must have property '${required}' when property '${key}' is present`)));
          } else {
            errors.push(...same(dependency));
          }
        });
    }

    if (Array.isArray(schema.allOf)) {
      schema.allOf.forEach((sub) => errors.push(...same(sub)));
    }
    if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
      const branches = schema.anyOf.map(same);
      if (!branches.some((branch) => branch.length === 0)) {
        errors.push(...(pickBranch(branches, at) || [problem(at, "must match a schema in anyOf")]));
      }
    }
    if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
      const branches = schema.oneOf.map(same);
      const passing = branches.map((branch, index) => (branch.length === 0 ? index : -1)).filter((index) => index >= 0);
      if (passing.length === 0) {
        errors.push(...(pickBranch(branches, at) || [problem(at, "must match exactly one schema in oneOf")]));
      } else if (passing.length > 1) {
        errors.push(problem(at, `must match exactly one schema in oneOf, but matches oneOf[${passing[0]}] and oneOf[${passing[1]}]`));
      }
    }
    if (has(schema, "not") && (isObject(schema.not) || typeof schema.not === "boolean") && same(schema.not).length === 0) {
      errors.push(problem(at, "must not match the 'not' schema"));
    }
    if (has(schema, "if") && (isObject(schema.if) || typeof schema.if === "boolean")) {
      const branch = same(schema.if).length === 0 ? "then" : "else";
      if (has(schema, branch)) errors.push(...same(schema[branch]));
    }

    active.delete(schema);
    return errors;
  };

  const qualify = (name, namespace, enclosing) => {
    if (name.includes(".")) return { fullname: name, namespace: name.slice(0, name.lastIndexOf(".")) };
    const space = typeof namespace === "string" ? namespace : enclosing;
    return { fullname: space ? `${space}.${name}` : name, namespace: space };
  };

  const avroRegistry = (root) => {
    const names = new Map();
    const shortNames = new Map();
    const seen = new Set();
    const visit = (node, space, depth) => {
      if (depth > MAX_DEPTH) return;
      const value = isRef(node) ? valueOf(node) : node;
      if (Array.isArray(value)) {
        value.forEach((member) => visit(member, space, depth + 1));
        return;
      }
      if (!isObject(value) || seen.has(value)) return;
      seen.add(value);
      let inner = space;
      if (AVRO_NAMED.has(value.type) && typeof value.name === "string" && value.name !== "") {
        const { fullname, namespace } = qualify(value.name, value.namespace, space);
        if (!names.has(fullname)) names.set(fullname, { node: value, space: namespace, fullname });
        const short = fullname.slice(fullname.lastIndexOf(".") + 1);
        shortNames.set(short, [...(shortNames.get(short) || []), fullname]);
        inner = namespace;
      }
      if (typeof value.type !== "string") visit(value.type, inner, depth + 1);
      if (Array.isArray(value.fields)) value.fields.forEach((field) => isObject(field) && visit(field.type, inner, depth + 1));
      visit(value.items, inner, depth + 1);
      visit(value.values, inner, depth + 1);
    };
    visit(root, "", 0);
    const lookup = (name, space) => {
      if (name.includes(".")) return names.get(name);
      const direct = names.get(space ? `${space}.${name}` : name) || names.get(name);
      if (direct !== undefined) return direct;
      const candidates = [...new Set(shortNames.get(name) || [])];
      return candidates.length === 1 ? names.get(candidates[0]) : undefined;
    };
    return { lookup };
  };

  const avroNamesOf = (member, space, registry) => {
    const value = isRef(member) ? valueOf(member) : member;
    if (typeof value === "string") {
      if (AVRO_PRIMITIVES.has(value)) return [value];
      const entry = registry.lookup(value, space);
      return entry ? [value, entry.fullname, entry.node.name] : [value];
    }
    if (!isObject(value)) return [];
    if (AVRO_NAMED.has(value.type) && typeof value.name === "string") {
      return [qualify(value.name, value.namespace, space).fullname, value.name];
    }
    if (typeof value.type === "string") return avroNamesOf(value.type, space, registry);
    return [];
  };

  const avroLabel = (member) => {
    if (typeof member === "string") return member;
    if (Array.isArray(member)) return "union";
    if (isRef(member)) return typeof member.$ref === "string" ? member.$ref.slice(member.$ref.lastIndexOf("/") + 1) : "$ref";
    if (isObject(member) && typeof member.name === "string") return member.name;
    if (isObject(member) && typeof member.type === "string") return member.type;
    return "unknown";
  };

  const isNullableUnion = (type) => {
    const value = isRef(type) ? valueOf(type) : type;
    return Array.isArray(value) && value.some((member) => member === "null" || (isObject(member) && member.type === "null"));
  };

  const checkAvroPrimitive = (type, logicalType, data, at) => {
    switch (type) {
      case "null":
        return data === null ? [] : [problem(at, "must be null", "type")];
      case "boolean":
        return typeof data === "boolean" ? [] : [problem(at, "must be boolean", "type")];
      case "int":
        if (!Number.isInteger(data)) return [problem(at, "must be an int", "type")];
        return data >= INT_MIN && data <= INT_MAX ? [] : [problem(at, `must be an int between ${INT_MIN} and ${INT_MAX}`)];
      case "long":
        if (!Number.isInteger(data)) return [problem(at, "must be a long", "type")];
        return data >= -LONG_LIMIT && data < LONG_LIMIT ? [] : [problem(at, "must be a long between -2^63 and 2^63-1")];
      case "float":
      case "double":
        return typeof data === "number" ? [] : [problem(at, `must be a ${type}`, "type")];
      case "bytes":
        if (typeof data !== "string") return [problem(at, "must be a string of bytes", "type")];
        return BYTES.test(data) ? [] : [problem(at, "must only contain characters \\u0000-\\u00ff")];
      default:
        if (typeof data !== "string") return [problem(at, "must be a string", "type")];
        return logicalType === "uuid" && !STRING_FORMATS.uuid(data) ? [problem(at, "must be a UUID string")] : [];
    }
  };

  const validateAvro = (type, value, location, space, registry, active = new Set()) => {
    const resolved = resolveData(value, location);
    if (resolved === null || location.trail.length > MAX_DEPTH) return [];
    const { data, at } = resolved;
    const target = isRef(type) ? valueOf(type) : type;
    if (typeof target === "string") {
      if (AVRO_PRIMITIVES.has(target)) return checkAvroPrimitive(target, undefined, data, at);
      const entry = registry.lookup(target, space);
      return entry === undefined ? [] : validateAvro(entry.node, data, at, entry.space, registry, active);
    }
    if (target === null || typeof target !== "object" || active.has(target)) return [];
    active.add(target);
    const errors = Array.isArray(target) ? validateAvroUnion(target, data, at, space, registry, active) : validateAvroType(target, data, at, space, registry, active);
    active.delete(target);
    return errors;
  };

  const validateAvroUnion = (members, data, at, space, registry, active) => {
    if (members.length === 0) return [];
    const branches = members.map((member) => validateAvro(member, data, at, space, registry, active));
    if (branches.some((branch) => branch.length === 0)) return [];
    if (isObject(data) && Object.keys(data).length === 1) {
      const [key] = Object.keys(data);
      const member = members.find((candidate) => avroNamesOf(candidate, space, registry).includes(key));
      if (member !== undefined) return validateAvro(member, data[key], child(at, key), space, registry);
    }
    return pickBranch(branches, at) || [problem(at, `must match one of the union types ${members.map(avroLabel).join(", ")}`, "type")];
  };

  const validateAvroType = (type, data, at, space, registry, active) => {
    const kind = type.type;
    if (typeof kind !== "string") {
      return isObject(kind) || Array.isArray(kind) ? validateAvro(kind, data, at, space, registry, active) : [];
    }
    const named = AVRO_NAMED.has(kind) && typeof type.name === "string" && type.name !== "" ? qualify(type.name, type.namespace, space) : null;
    const inner = named ? named.namespace : space;
    const of = (noun) => (named ? `${noun} '${type.name}'` : noun);
    const nested = (sub, key, item) => validateAvro(sub, item, child(at, key), inner, registry);
    switch (kind) {
      case "record":
      case "error": {
        if (!isObject(data)) return [problem(at, `must be an object (${of("record")})`, "type")];
        if (!Array.isArray(type.fields)) return [];
        const fields = type.fields.filter((field) => isObject(field) && typeof field.name === "string");
        const declared = new Set(fields.map((field) => field.name));
        const errors = [];
        fields.forEach((field) => {
          if (has(data, field.name)) {
            errors.push(...nested(field.type, field.name, data[field.name]));
          } else if (!has(field, "default") && !isNullableUnion(field.type)) {
            errors.push(problem(at, `must have field '${field.name}' of ${of("record")}`));
          }
        });
        Object.keys(data)
          .filter((key) => !declared.has(key))
          .forEach((key) => errors.push(problem(child(at, key), `is not a field of ${of("record")}`)));
        return errors;
      }
      case "enum": {
        const symbols = Array.isArray(type.symbols) ? type.symbols : null;
        if (typeof data === "string" && (symbols === null || symbols.includes(data))) return [];
        const text = symbols === null ? `must be a symbol of ${of("enum")}` : `must be a symbol of ${of("enum")}: ${listOf(symbols, String)}`;
        return [problem(at, text, typeof data === "string" ? "value" : "type")];
      }
      case "array":
        if (!Array.isArray(data)) return [problem(at, "must be an array", "type")];
        return has(type, "items") ? data.flatMap((item, index) => nested(type.items, index, item)) : [];
      case "map":
        if (!isObject(data)) return [problem(at, "must be an object (map)", "type")];
        return has(type, "values") ? Object.keys(data).flatMap((key) => nested(type.values, key, data[key])) : [];
      case "fixed": {
        const size = Number.isInteger(type.size) && type.size >= 0 ? type.size : null;
        const text = `must be a string of ${size === null ? "" : `exactly ${size} `}bytes for ${of("fixed")}`;
        if (typeof data !== "string") return [problem(at, text, "type")];
        return (size === null || [...data].length === size) && BYTES.test(data) ? [] : [problem(at, text)];
      }
      default:
        if (AVRO_PRIMITIVES.has(kind)) return checkAvroPrimitive(kind, type.logicalType, data, at);
        return validateAvro(kind, data, at, space, registry, active);
    }
  };

  const validatePart = (spec, value, at) => {
    if (spec.kind !== "avro") return validateJson(spec.schema, value, at, spec.kind === "openapi");
    let root = valueOf(spec.schema);
    if (typeof root === "string" && /^\s*[[{]/.test(root)) {
      try {
        root = JSON.parse(root);
      } catch (error) {
        return [];
      }
    }
    if (root === UNKNOWN || root === undefined || root === null) return [];
    return validateAvro(root, value, at, "", avroRegistry(root));
  };

  const specOf = (schema, format, multiFormat) => {
    if (schema === undefined || schema === null || schema === UNKNOWN) return null;
    let target = schema;
    let schemaFormat = format;
    if (multiFormat && (isDataRef(schema) || (isObject(schema) && !isRef(schema)))) {
      const resolved = follow(schema);
      if (resolved === UNKNOWN || resolved === undefined) return null;
      if (isObject(resolved.node) && has(resolved.node, "schemaFormat")) {
        if (!has(resolved.node, "schema")) return null;
        schemaFormat = resolved.node.schemaFormat;
        target = resolved.node.schema;
      }
    }
    const kind = kindOf(schemaFormat);
    return kind === null || target === UNKNOWN ? null : { kind, schema: target };
  };

  const mergePatch = (origin, patch, depth) => {
    if (!isObject(patch) || depth > MAX_DEPTH) return patch;
    const target = isRef(patch) ? valueOf(patch) : patch;
    if (target === UNKNOWN || !isObject(target)) return target;
    const base = isRef(origin) ? valueOf(origin) : origin;
    if (base === UNKNOWN) return UNKNOWN;
    if (!isObject(base)) return target;
    const result = { ...base };
    Object.keys(target).forEach((key) => {
      if (target[key] === null) {
        delete result[key];
      } else {
        result[key] = mergePatch(result[key], target[key], depth + 1);
      }
    });
    return result;
  };

  const traitLayers = (message, path) => {
    if (!has(message, "traits")) return [];
    const list = follow(message.traits);
    if (list === UNKNOWN) return UNKNOWN;
    if (list === undefined || !Array.isArray(list.node)) return [];
    const layers = [];
    for (const [index, entry] of list.node.entries()) {
      const tuple = Array.isArray(entry);
      const raw = list.viaRef ? [...path, "traits"] : tuple ? [...path, "traits", index, 0] : [...path, "traits", index];
      const trait = follow(tuple ? entry[0] : entry);
      if (trait === UNKNOWN) return UNKNOWN;
      if (trait !== undefined && isObject(trait.node)) {
        layers.push({ node: trait.node, index, raw, frozen: list.viaRef || trait.viaRef });
      }
    }
    return layers;
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
  const report = (message, raw) => {
    const path = locatable([...context.path, ...raw]);
    const key = `${JSON.stringify(path)}\u0000${message}`;
    if (reported.has(key)) return;
    reported.add(key);
    results.push({ message, path });
  };

  const pending = [];
  const visited = new Set();
  const once = (kind, path) => {
    const key = `${kind}\u0000${JSON.stringify(path)}`;
    if (visited.has(key)) return false;
    visited.add(key);
    return true;
  };

  const checkMessage = (message, path) => {
    if (!isObject(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => visitMessage(member, [...path, "oneOf", index]));
      return;
    }
    const layers = traitLayers(message, path);
    if (layers === UNKNOWN) return;
    const own = { node: message, at: { raw: [...path, "examples"], frozen: false }, trait: null };
    const sources = layers.map((layer) => ({
      node: layer.node,
      at: layer.frozen ? { raw: layer.raw, frozen: true } : { raw: [...layer.raw, "examples"], frozen: false },
      trait: layer.index,
    }));
    const source = (isV3 ? [...sources, own] : [own, ...sources]).filter((candidate) => has(candidate.node, "examples")).pop();
    if (source === undefined) return;
    const list = follow(source.node.examples);
    if (list === UNKNOWN || list === undefined || !Array.isArray(list.node)) return;

    let merged = message;
    if (layers.length > 0) {
      merged = {};
      const order = isV3 ? [...layers.map((layer) => layer.node), message] : [message, ...layers.map((layer) => layer.node)];
      order.forEach((layer) => Object.keys(layer).forEach((key) => (merged[key] = mergePatch(merged[key], layer[key], 0))));
    }
    const specs = {
      payload: isV3 ? specOf(merged.payload, undefined, true) : specOf(merged.payload, merged.schemaFormat, false),
      headers: specOf(merged.headers, undefined, isV3),
    };
    const listAt = list.viaRef ? { raw: source.at.raw, frozen: true } : source.at;
    const origin = source.trait === null ? "" : `traits[${source.trait}].`;

    list.node.forEach((entry, index) => {
      const entryAt = child({ ...listAt, trail: [] }, index);
      const example = follow(entry);
      if (example === UNKNOWN || example === undefined || !isObject(example.node)) return;
      const exampleAt = example.viaRef ? { raw: entryAt.raw, frozen: true } : entryAt;
      ["payload", "headers"].forEach((part) => {
        if (!has(example.node, part) || specs[part] === null) return;
        const spec = specs[part];
        const at = { raw: exampleAt.frozen ? exampleAt.raw : [...exampleAt.raw, part], frozen: exampleAt.frozen, trail: [part] };
        validatePart(spec, example.node[part], at).forEach((error) => {
          report(`${origin}examples[${index}].${display(error.trail)} ${error.text}.`, error.raw);
        });
      });
    });
  };

  const visitMessage = (node, path) => {
    if (isRef(node)) {
      pending.push({ kind: "message", node });
    } else if (once("message", path)) {
      checkMessage(node, path);
    }
  };

  const visitChannel = (node, path) => {
    if (isRef(node)) {
      pending.push({ kind: "channel", node });
      return;
    }
    if (!isObject(node) || !once("channel", path)) return;
    if (isV3) {
      entriesOf(node.messages).forEach(([key, message]) => visitMessage(message, [...path, "messages", key]));
      return;
    }
    ["publish", "subscribe"].forEach((action) => {
      const operation = node[action];
      if (isObject(operation) && !isRef(operation) && has(operation, "message")) {
        visitMessage(operation.message, [...path, action, "message"]);
      }
    });
  };

  entriesOf(document.channels).forEach(([key, channel]) => visitChannel(channel, ["channels", key]));
  const components = document.components;
  if (isObject(components)) {
    entriesOf(components.channels).forEach(([key, channel]) => visitChannel(channel, ["components", "channels", key]));
    entriesOf(components.messages).forEach(([key, message]) => visitMessage(message, ["components", "messages", key]));
  }
  while (pending.length > 0) {
    const { kind, node } = pending.shift();
    const target = follow(node);
    if (target === UNKNOWN || target === undefined) continue;
    (kind === "message" ? visitMessage : visitChannel)(target.node, target.path);
  }

  return results;
};
