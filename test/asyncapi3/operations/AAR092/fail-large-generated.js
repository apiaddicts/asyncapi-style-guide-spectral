const DOMAINS = ["sessions", "chargers", "tariffs", "payments", "trips", "drivers", "vehicles", "stations", "invoices", "alerts"];
const OPERATION_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const operations = {};
const sharedOperations = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const channel = (domain) => ({ $ref: `#/channels/${domain}` });
const trait = (name) => ({ $ref: `#/components/operationTraits/${name}` });
const complete = (domain, index) => ({
  action: index % 2 === 0 ? "send" : "receive",
  channel: channel(domain),
  summary: `Exchange ${domain} event number ${index}.`,
});

DOMAINS.forEach((domain) => {
  channels[domain] = { address: `mobility.cdc.${domain}.v1`, description: `Events of ${domain}.`, messages: { [domain]: message(domain) } };
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.operations.${name}`;
  if (i % 5 === 1) {
    sharedOperations[name] = { action: "send", summary: `Shared ${i}.` };
    expected.push([path, "missing", name, "channel"]);
  } else if (i % 5 === 3) {
    sharedOperations[name] = { ...complete("sessions", i), summary: "" };
    expected.push([`${path}.summary`, "empty", name, "summary"]);
  } else {
    sharedOperations[name] = complete("sessions", i);
  }
}

for (let c = 0; c < OPERATION_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Operation${c}`;
  const path = `operations.${name}`;
  switch (c % 9) {
    case 0:
      operations[name] = {
        ...complete(domain, c),
        messages: [{ $ref: `#/channels/${domain}/messages/${domain}` }],
        bindings: { kafka: { clientId: { type: "string" }, bindingVersion: "0.5.0" } },
      };
      break;
    case 1:
      operations[name] = { $ref: `#/components/operations/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        operations[name] = { action: "receive", channel: channel(domain) };
        expected.push([path, "missing", name, "summary"]);
      } else {
        operations[name] = complete(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        operations[name] = { ...complete(domain, c), action: null };
        expected.push([`${path}.action`, "empty", name, "action"]);
      } else {
        operations[name] = complete(domain, c);
      }
      break;
    case 4:
      if (c % 16 === 4) {
        operations[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        operations[name] = { ...complete(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        operations[name] = { title: `Placeholder for ${domain}.` };
        ["action", "channel", "summary"].forEach((field) => expected.push([path, "missing", name, field]));
      } else {
        operations[name] = complete(domain, c);
      }
      break;
    case 6:
      if (c % 12 === 6) {
        operations[name] = { $ref: `#/components/operations/retired${c}` };
        expected.push([path, "unusable", name]);
      } else {
        operations[name] = { $ref: `./partners/${domain}.yaml#/operations/consume` };
      }
      break;
    case 7:
      if (c % 14 === 7) {
        operations[name] = { ...complete(domain, c), channel: { $ref: `#/channels/retired${c}` } };
        expected.push([`${path}.channel`, "empty", name, "channel"]);
      } else {
        operations[name] = { ...complete(domain, c), channel: { $ref: `./partners/${domain}.yaml#/channels/events` } };
      }
      break;
    default: {
      const { summary, ...withoutSummary } = complete(domain, c);
      if (c % 18 === 8) {
        operations[name] = { ...withoutSummary, traits: [trait("blank")] };
        expected.push(["components.operationTraits.blank.summary", "empty", name, "summary"]);
      } else {
        operations[name] = { ...withoutSummary, traits: [trait("kafka"), trait("described")], description: summary };
      }
    }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedOperations[name] = { ...complete("sessions", i), summary: "\t" };
    expected.push([`components.operations.${name}.summary`, "empty", name, "summary"]);
  } else {
    sharedOperations[name] = complete("sessions", i);
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
      operations: sharedOperations,
      operationTraits: {
        blank: { summary: " " },
        kafka: { bindings: { kafka: { groupId: { type: "string" }, bindingVersion: "0.5.0" } } },
        described: { summary: "Process mobility events." },
      },
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { name: domain, payload: { type: "object" } }])),
    },
  },
  expected,
};
