/**
 * @param {object} document - The whole AsyncAPI document (given: "$", resolved: false)
 * @param {object} options - Function options
 * @param {string|string[]} options\["required_binding_props"] - Comma-separated list (or array) of required binding
 *   fields.
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const DEFAULT_REQUIRED_BINDING_PROPS = [
  "server.jms.jmsConnectionFactory",
  "server.jms.properties.name",
  "server.jms.properties.value",
  "channel.amqp.exchange|queue",
  "channel.googlepubsub.schemaSettings",
  "channel.googlepubsub.schemaSettings.encoding",
  "channel.googlepubsub.schemaSettings.name",
  "channel.ibmmq.queue.objectName",
  "channel.pulsar.namespace",
  "channel.pulsar.persistence",
  "channel.sns.name",
  "channel.sns.ordering.type",
  "channel.sns.policy.statements",
  "channel.sns.policy.statements.effect",
  "channel.sns.policy.statements.principal",
  "channel.sns.policy.statements.action",
  "channel.sqs.queue",
  "channel.sqs.queue.name",
  "channel.sqs.queue.fifoQueue",
  "channel.sqs.queue.redrivePolicy.deadLetterQueue",
  "channel.sqs.queue.policy.statements",
  "channel.sqs.queue.policy.statements.effect",
  "channel.sqs.queue.policy.statements.principal",
  "channel.sqs.queue.policy.statements.action",
  "channel.sqs.deadLetterQueue.name",
  "channel.sqs.deadLetterQueue.fifoQueue",
  "channel.sqs.deadLetterQueue.redrivePolicy.deadLetterQueue",
  "channel.sqs.deadLetterQueue.policy.statements",
  "channel.sqs.deadLetterQueue.policy.statements.effect",
  "channel.sqs.deadLetterQueue.policy.statements.principal",
  "channel.sqs.deadLetterQueue.policy.statements.action",
  "operation.ros2.role",
  "operation.ros2.node",
  "operation.sns.consumers",
  "operation.sns.consumers.protocol",
  "operation.sns.consumers.endpoint",
  "operation.sns.consumers.rawMessageDelivery",
  "operation.sns.consumers.redrivePolicy.deadLetterQueue",
  "operation.sqs.queues",
  "operation.sqs.queues.name",
  "operation.sqs.queues.redrivePolicy.deadLetterQueue",
  "operation.sqs.queues.policy.statements",
  "operation.sqs.queues.policy.statements.effect",
  "operation.sqs.queues.policy.statements.principal",
  "operation.sqs.queues.policy.statements.action",
  "message.googlepubsub.schema.name",
];

const KINDS = ["server", "channel", "operation", "message"];
const KIND_LABELS = { server: "Server", channel: "Channel", operation: "Operation", message: "Message" };
const PROTOCOL = /^[a-z0-9][a-z0-9._-]*$/;
const PLAIN_NAME = /^[^\s.[\]|,]+$/;
const BRACKET_NAME = /^[^\s[\]|,]+$/;
const UNRESOLVED = Symbol("unresolved");
const MAX_REF_HOPS = 64;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRef = (value) => isObject(value) && value.$ref !== undefined;
const isPlainObject = (value) => isObject(value) && !isRef(value);
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isPresent = (value) => value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

const isVersion3Plus = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const match = /^\s*(\d+)/.exec(String(raw));
  return match !== null && Number(match[1]) >= 3;
};

const tokenize = (entry) => {
  const segments = [];
  let alternatives = [];
  let name = "";
  let bracketed = false;
  const closeName = () => {
    const trimmed = bracketed ? name : name.trim();
    if (trimmed === "" || !(bracketed ? BRACKET_NAME : PLAIN_NAME).test(trimmed)) return false;
    alternatives.push(trimmed);
    name = "";
    bracketed = false;
    return true;
  };
  const closeSegment = () => {
    if (!closeName()) return false;
    segments.push(alternatives);
    alternatives = [];
    return true;
  };
  for (let i = 0; i < entry.length; i++) {
    const char = entry[i];
    if (char === "[") {
      if ((bracketed || name.trim() !== "") && !closeSegment()) return null;
      const end = entry.indexOf("]", i + 1);
      if (end === -1) return null;
      name = entry.slice(i + 1, end).trim();
      bracketed = true;
      i = end;
    } else if (char === ".") {
      if (!closeSegment()) return null;
    } else if (char === "|") {
      if (!closeName()) return null;
    } else if (char === "]" || (bracketed && char.trim() !== "")) {
      return null;
    } else if (!bracketed) {
      name += char;
    }
  }
  return closeSegment() ? segments : null;
};

const parseEntry = (raw) => {
  const segments = tokenize(raw.trim());
  if (segments === null || segments.length < 3) return null;
  if (segments.slice(0, -1).some((alternatives) => alternatives.length !== 1)) return null;
  const kind = segments[0][0].toLowerCase();
  const protocol = segments[1][0].toLowerCase();
  if (kind !== "*" && !KINDS.includes(kind)) return null;
  if (protocol !== "*" && (!PROTOCOL.test(protocol) || protocol.startsWith("x-"))) return null;
  const fields = segments.slice(2);
  if (fields.some((alternatives) => alternatives.includes("$ref"))) return null;
  const path = fields.slice(0, -1).map((alternatives) => alternatives[0]);
  const alternatives = [...new Set(fields[fields.length - 1])];
  return { kind, protocol, path, alternatives, key: JSON.stringify([path, [...alternatives].sort()]) };
};

const parseRequirements = (raw) => {
  let candidates = [];
  if (typeof raw === "string") {
    candidates = raw.split(",");
  } else if (Array.isArray(raw)) {
    candidates = raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
  }
  let requirements = candidates.map(parseEntry).filter((entry) => entry !== null);
  if (requirements.length === 0) {
    requirements = DEFAULT_REQUIRED_BINDING_PROPS.map(parseEntry);
  }
  const index = new Map();
  for (const requirement of requirements) {
    const bucket = `${requirement.kind} ${requirement.protocol}`;
    if (!index.has(bucket)) index.set(bucket, []);
    index.get(bucket).push(requirement);
  }
  return index;
};

const requirementsFor = (index, kind, protocol) => {
  const seen = new Set();
  const result = [];
  for (const bucket of [`${kind} ${protocol}`, `${kind} *`, `* ${protocol}`, "* *"]) {
    for (const requirement of index.get(bucket) || []) {
      if (seen.has(requirement.key)) continue;
      seen.add(requirement.key);
      result.push(requirement);
    }
  }
  return result;
};

const renderName = (name) => (/^[^.[\]]+$/.test(name) ? name : `[${name}]`);

const renderPath = (steps) =>
  steps.reduce((text, step) => {
    if (typeof step === "number") return `${text}[${step}]`;
    const rendered = renderName(step);
    return text === "" || rendered.startsWith("[") ? `${text}${rendered}` : `${text}.${rendered}`;
  }, "");

const renderFields = (steps, alternatives) => {
  const names = alternatives.map((alternative) => `'${renderPath([...steps, alternative])}'`);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
};

module.exports = (document, options, context) => {
  const errors = [];
  if (!isObject(document) || !has(document, "asyncapi")) {
    return errors;
  }

  const requirements = parseRequirements(options && options.required_binding_props);
  const isV3 = isVersion3Plus(document.asyncapi);

  const resolvePointer = (ref) => {
    if (typeof ref !== "string" || !ref.startsWith("#")) return UNRESOLVED;
    const pointer = ref.slice(1);
    if (pointer === "") return document;
    if (!pointer.startsWith("/")) return UNRESOLVED;
    let node = document;
    for (const raw of pointer.slice(1).split("/")) {
      let token;
      try {
        token = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
      } catch (e) {
        return UNRESOLVED;
      }
      if (Array.isArray(node) && /^(0|[1-9]\d*)$/.test(token) && Number(token) < node.length) {
        node = node[Number(token)];
      } else if (isObject(node) && has(node, token)) {
        node = node[token];
      } else {
        return UNRESOLVED;
      }
    }
    return node;
  };

  const follow = (value) => {
    let node = value;
    const seen = new Set();
    while (isRef(node)) {
      if (seen.has(node.$ref) || seen.size >= MAX_REF_HOPS) return UNRESOLVED;
      seen.add(node.$ref);
      node = resolvePointer(node.$ref);
      if (node === UNRESOLVED) return UNRESOLVED;
    }
    return node;
  };

  const contributorOf = (bindings, inline, anchor, rank) => {
    if (bindings === undefined || bindings === null) return null;
    if (isRef(bindings)) {
      const target = follow(bindings);
      if (target === UNRESOLVED) return UNRESOLVED;
      return isObject(target) ? { bindings: target, mode: "definition", rank } : null;
    }
    if (!isObject(bindings)) return null;
    return inline ? { bindings, mode: "inline", base: anchor, rank } : { bindings, mode: "trait", anchor, rank };
  };

  const contributorsOf = (holder, path, traitsAllowed) => {
    const own = contributorOf(holder.bindings, true, [...path, "bindings"], 0);
    if (own === UNRESOLVED) return null;
    const traits = [];
    const entries = traitsAllowed === false || !Array.isArray(holder.traits) ? [] : holder.traits;
    for (let index = 0; index < entries.length; index++) {
      let trait = entries[index];
      let tracePath = [...path, "traits", index];
      if (Array.isArray(trait)) {
        if (traitsAllowed !== "tuple") continue;
        trait = trait[0];
        tracePath = [...tracePath, 0];
      }
      const inline = !isRef(trait);
      if (!inline) trait = follow(trait);
      if (trait === UNRESOLVED) return null;
      if (!isObject(trait)) continue;
      const contributor = contributorOf(trait.bindings, inline, inline ? [...tracePath, "bindings"] : tracePath, index + 1);
      if (contributor === UNRESOLVED) return null;
      if (contributor !== null) traits.push(contributor);
    }
    traits.reverse();
    const ordered = isV3 ? [own, ...traits] : [...traits, own];
    return ordered.filter((contributor) => contributor !== null);
  };

  const objectRun = (candidates) => {
    const present = candidates.filter((candidate) => candidate.value !== undefined && candidate.value !== null);
    const run = [];
    for (const candidate of present) {
      if (!isObject(candidate.value)) break;
      if (isRef(candidate.value)) return null;
      run.push(candidate);
    }
    return run;
  };

  const report = (kind, protocol, parts, steps, alternatives) => {
    const owner = parts.reduce((first, part) => (part.owner.rank < first.rank ? part.owner : first), parts[0].owner);
    if (owner.mode === "definition") return;
    const path = owner.mode === "inline" ? [...owner.base, protocol, ...steps] : owner.anchor;
    errors.push({
      message: `${KIND_LABELS[kind]} binding '${protocol}' must declare ${renderFields(steps, alternatives)}.`,
      path: [...context.path, ...path],
    });
  };

  const checkRequirement = (kind, protocol, parts, requirement, depth, steps) => {
    if (depth === requirement.path.length) {
      const winners = requirement.alternatives
        .map((name) => parts.find((part) => has(part.value, name) && part.value[name] !== null && part.value[name] !== undefined))
        .map((part, index) => (part === undefined ? null : { part, value: part.value[requirement.alternatives[index]] }));
      if (winners.some((winner) => winner !== null && isPresent(winner.value))) return;
      const blanks = winners.filter((winner) => winner !== null).map((winner) => winner.part);
      report(kind, protocol, blanks.length > 0 ? blanks : parts, steps, requirement.alternatives);
      return;
    }
    const name = requirement.path[depth];
    const children = parts.filter((part) => has(part.value, name)).map((part) => ({ owner: part.owner, value: part.value[name] }));
    const winner = children.find((child) => child.value !== undefined && child.value !== null);
    if (winner === undefined || isRef(winner.value)) return;
    if (isObject(winner.value)) {
      const run = objectRun(children);
      if (run !== null) checkRequirement(kind, protocol, run, requirement, depth + 1, [...steps, name]);
      return;
    }
    if (Array.isArray(winner.value)) {
      winner.value.forEach((item, index) => {
        if (isPlainObject(item)) {
          checkRequirement(kind, protocol, [{ owner: winner.owner, value: item }], requirement, depth + 1, [...steps, name, index]);
        }
      });
    }
  };

  const checkContributors = (kind, contributors) => {
    const protocols = new Set();
    for (const contributor of contributors) {
      for (const key of Object.keys(contributor.bindings)) {
        if (!key.startsWith("x-")) protocols.add(key);
      }
    }
    for (const protocol of protocols) {
      const candidates = contributors
        .filter((contributor) => has(contributor.bindings, protocol))
        .map((contributor) => {
          const value = contributor.bindings[protocol];
          return { owner: contributor, value: value === null ? {} : value };
        });
      if (candidates.some((candidate) => isRef(candidate.value))) continue;
      const run = objectRun(candidates);
      if (run === null || run.length === 0) continue;
      for (const requirement of requirementsFor(requirements, kind, protocol)) {
        checkRequirement(kind, protocol, run, requirement, 0, []);
      }
    }
  };

  const checkHolder = (holder, kind, path, traitsAllowed) => {
    if (!isObject(holder) || isRef(holder)) return;
    const contributors = contributorsOf(holder, path, traitsAllowed);
    if (contributors !== null) checkContributors(kind, contributors);
  };

  const checkMessage = (message, path) => {
    if (!isObject(message) || isRef(message)) return;
    if (!isV3 && Array.isArray(message.oneOf)) {
      message.oneOf.forEach((member, index) => checkMessage(member, [...path, "oneOf", index]));
      return;
    }
    checkHolder(message, "message", path, "tuple");
  };

  const checkOperation = (operation, path) => {
    if (!isObject(operation) || isRef(operation)) return;
    checkHolder(operation, "operation", path, true);
    if (!isV3) {
      checkMessage(operation.message, [...path, "message"]);
    }
  };

  const entriesOf = (map) => (isObject(map) ? Object.entries(map).filter(([, value]) => isObject(value) && !isRef(value)) : []);

  const checkServers = (servers, path) => {
    for (const [key, server] of entriesOf(servers)) {
      checkHolder(server, "server", [...path, key], false);
    }
  };

  const checkChannels = (channels, path) => {
    for (const [key, channel] of entriesOf(channels)) {
      checkHolder(channel, "channel", [...path, key], false);
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
    for (const [section, kind] of [
      ["serverBindings", "server"],
      ["channelBindings", "channel"],
      ["operationBindings", "operation"],
      ["messageBindings", "message"],
    ]) {
      for (const [key, bindings] of entriesOf(components[section])) {
        checkContributors(kind, [{ bindings, mode: "inline", base: ["components", section, key], rank: 0 }]);
      }
    }
  }

  return errors;
};
