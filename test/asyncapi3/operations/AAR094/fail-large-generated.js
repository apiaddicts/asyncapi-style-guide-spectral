const DOMAINS = ["rides", "drivers", "payments", "vehicles", "zones", "tariffs", "incidents", "ratings", "promotions", "alerts"];
const OPERATION_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const operations = {};
const shared = {};
const expected = [];
const channel = (name) => ({ $ref: `#/channels/${name}` });
const message = (domain) => ({ $ref: `#/channels/${domain}/messages/${domain}` });
const operation = (domain, index, extra = {}) => ({
  action: index % 2 === 0 ? "send" : "receive",
  channel: channel(domain),
  summary: `Exchange ${domain} event number ${index}.`,
  messages: [message(domain)],
  ...extra,
});

for (const domain of DOMAINS) {
  channels[domain] = {
    address: `mobility.cdc.${domain}.v1`,
    messages: { [domain]: { name: domain, payload: { type: "object", properties: { id: { type: "string" }, note: { type: ["string", "null"] } } } } },
    bindings: { kafka: { topic: `mobility.cdc.${domain}.v1` } },
  };
}

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.operations.${name}`;
  if (i % 5 === 1) {
    shared[name] = { action: "send", channel: channel("rides") };
  } else if (i % 5 === 3) {
    shared[name] = operation("rides", i, { messages: [] });
    expected.push([`${path}.messages`, "empty", name]);
  } else if (i % 5 === 4) {
    shared[name] = operation("rides", i, { messages: [null], traits: [{ $ref: "#/components/operationTraits/withMessages" }] });
    expected.push([`${path}.messages`, "empty", name]);
  } else {
    shared[name] = operation("rides", i);
  }
}

for (let c = 0; c < OPERATION_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Operation${c}`;
  const path = `operations.${name}`;
  switch (c % 9) {
    case 0:
      operations[name] = operation(domain, c, { reply: { address: { location: "$message.header#/replyTo" }, channel: channel(domain), messages: [message(domain)] } });
      break;
    case 1:
      operations[name] = { $ref: `#/components/operations/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        operations[name] = { action: "receive", channel: channel(domain), summary: `Receive ${domain}.` };
      } else if (c % 3 === 1) {
        operations[name] = operation(domain, c, { messages: [] });
        expected.push([`${path}.messages`, "empty", name]);
      } else {
        operations[name] = operation(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        operations[name] = operation(domain, c, { messages: [{ $ref: `#/channels/${domain}/messages/retired` }] });
        expected.push([`${path}.messages`, "empty", name]);
      } else {
        operations[name] = operation(domain, c, { messages: { $ref: "#/components/x-message-lists/rides" } });
      }
      break;
    case 4:
      if (c % 16 === 4) {
        operations[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        operations[name] = { ...operation(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        operations[name] = operation(domain, c, { messages: null });
        expected.push([`${path}.messages`, "empty", name]);
      } else {
        operations[name] = operation(domain, c, { messages: [null, message(domain)] });
      }
      break;
    case 6:
      if (c % 12 === 6) {
        operations[name] = { $ref: `#/components/operations/retired${c}` };
        expected.push([path, "unusable", name]);
      } else {
        operations[name] = { $ref: `./partners/${domain}.yaml#/operations/events` };
      }
      break;
    case 7:
      if (c % 14 === 7) {
        operations[name] = { action: "receive", channel: channel(domain), traits: [{ $ref: "#/components/operationTraits/withMessages" }] };
      } else {
        operations[name] = operation(domain, c, { traits: [{ $ref: "#/components/operationTraits/described" }] });
      }
      break;
    default:
      operations[name] = { action: "send", channel: channel(domain), messages: [{ $ref: `./partners/${domain}.yaml#/messages/event` }] };
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    shared[name] = operation("rides", i, { messages: ["rides"] });
    expected.push([`components.operations.${name}.messages`, "empty", name]);
  } else {
    shared[name] = operation("rides", i);
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Mobility Platform Backbone", version: "9.0.0", description: "Generated document with 900 operations and 300 components operations." },
    servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    operations,
    components: {
      operations: shared,
      "x-message-lists": { rides: [message("rides")] },
      operationTraits: {
        withMessages: { messages: [message("rides")] },
        described: { summary: "Process mobility events." },
      },
    },
  },
  expected,
};
