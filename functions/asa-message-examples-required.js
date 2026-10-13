/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} _options - Unused: the rule has no options
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const UNKNOWN = Symbol("unknown");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const pointer = (root, ref) => {
  let fragment;
  try {
    fragment = decodeURIComponent(ref.slice(1));
  } catch (error) {
    return undefined;
  }
  if (fragment === "") return root;
  if (!fragment.startsWith("/")) return undefined;
  let current = root;
  for (const token of fragment.slice(1).split("/")) {
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current === null || typeof current !== "object" || !has(current, key)) return undefined;
    current = current[key];
  }
  return current;
};

const entriesOf = (map) => (isObject(map) ? Object.entries(map) : []);

module.exports = (document, _options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const isV3 = isVersion3Plus(document.asyncapi);

  const resolve = (node) => {
    const seen = new Set();
    let current = node;
    while (isRef(current)) {
      const ref = current.$ref;
      if (typeof ref !== "string") return undefined;
      if (!ref.startsWith("#")) return UNKNOWN;
      if (seen.has(ref)) return undefined;
      seen.add(ref);
      current = pointer(document, ref);
    }
    return current;
  };

  const layersOf = (message, path) => {
    const own = { node: message, path: [...path, "examples"], label: "Message 'examples'" };
    const traits = resolve(message.traits);
    let traitLayers = [];
    if (traits === UNKNOWN) {
      traitLayers = [{ node: UNKNOWN }];
    } else if (Array.isArray(traits)) {
      const listPath = isRef(message.traits) ? [...path, "traits"] : null;
      traitLayers = traits.map((trait, index) => ({
        node: resolve(Array.isArray(trait) ? trait[0] : trait),
        path: listPath || [...path, "traits", index],
        label: `Message 'examples' set by traits[${index}]`,
      }));
    }
    return isV3 ? [...traitLayers, own] : [own, ...traitLayers];
  };

  const inForce = (layers) => {
    let result = null;
    let unknown = false;
    for (const layer of layers) {
      if (layer.node === UNKNOWN) {
        unknown = true;
      } else if (isObject(layer.node) && has(layer.node, "examples")) {
        result = layer;
        unknown = false;
      }
    }
    return unknown ? UNKNOWN : result;
  };

  const isSample = (example, hasPayload) => {
    if (!isObject(example)) return false;
    if (has(example, "payload")) return true;
    return !hasPayload && isObject(example.headers) && Object.keys(example.headers).length > 0;
  };

  const report = (message, path) => {
    errors.push({ message, path: [...context.path, ...path] });
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    const hasPayload = has(message, "payload") && message.payload !== null;
    const sample = hasPayload ? "a sample 'payload'" : "a 'payload' or non-empty 'headers'";
    const layer = inForce(layersOf(message, path));
    if (layer === UNKNOWN) return;
    if (layer === null) {
      report(`Message must provide at least one example with ${sample} in 'examples'.`, path);
      return;
    }
    const examples = resolve(layer.node.examples);
    if (examples === UNKNOWN) return;
    if (examples === undefined || examples === null || (Array.isArray(examples) && examples.length === 0)) {
      report(`${layer.label} is empty; provide at least one example with ${sample}.`, layer.path);
      return;
    }
    if (!Array.isArray(examples)) {
      report(`${layer.label} must be an array; provide at least one example with ${sample}.`, layer.path);
      return;
    }
    const items = examples.map(resolve);
    if (items.some((item) => isSample(item, hasPayload)) || items.includes(UNKNOWN)) return;
    report(`${layer.label} has no example with ${sample}.`, layer.path);
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      if (!isObject(channel) || isRef(channel)) continue;
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

  checkChannels(document.channels, ["channels"]);

  const components = document.components;
  if (isObject(components)) {
    checkChannels(components.channels, ["components", "channels"]);
    for (const [key, message] of entriesOf(components.messages)) {
      checkMessage(message, ["components", "messages", key]);
    }
  }

  return errors;
};
