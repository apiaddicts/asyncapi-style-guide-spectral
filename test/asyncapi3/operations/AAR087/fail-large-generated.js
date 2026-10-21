const DOMAINS = ["sessions", "chargers", "tariffs", "payments", "trips", "drivers", "vehicles", "stations", "invoices", "alerts"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const operations = {};
const sharedChannels = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const complete = (domain, index) => ({
  address: `mobility.cdc.${domain}.event${index}.v1`,
  description: `Events of ${domain} number ${index}.`,
  messages: { [domain]: message(domain) },
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { description: `Shared ${i}.`, messages: { sessions: message("sessions") } };
    expected.push([path, "missing", name, "address"]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { ...complete("sessions", i), messages: {} };
  } else if (i % 5 === 4) {
    sharedChannels[name] = { address: `mobility.cdc.sessions.shared${i}.v1`, description: `Shared ${i} without messages.` };
    expected.push([path, "missing", name, "messages"]);
  } else {
    sharedChannels[name] = complete("sessions", i);
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Channel${c}`;
  const path = `channels.${name}`;
  switch (c % 8) {
    case 0:
      channels[name] = {
        ...complete(domain, c),
        address: `${domain}/{id}/events`,
        parameters: { id: { description: "Identifier.", enum: ["a", "b"], default: "a" } },
        bindings: { kafka: { partitions: 12, bindingVersion: "0.5.0" } },
      };
      operations[`receive${name}`] = { action: "receive", channel: { $ref: `#/channels/${name}` }, messages: [{ $ref: `#/channels/${name}/messages/${domain}` }] };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { address: `mobility.cdc.${domain}.${c}`, description: `Events of ${domain}.` };
        expected.push([path, "missing", name, "messages"]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { ...complete(domain, c), address: null };
      } else if (c % 5 === 1) {
        channels[name] = { ...complete(domain, c), address: "" };
        expected.push([`${path}.address`, "empty", name, "address"]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = null;
        expected.push([path, "unusable", name]);
      } else {
        channels[name] = { ...complete(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { title: `Placeholder for ${domain}.` };
        ["address", "description", "messages"].forEach((field) => expected.push([path, "missing", name, field]));
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 6:
      if (c % 12 === 6) {
        channels[name] = { $ref: `#/components/channels/retired${c}` };
        expected.push([path, "unusable", name]);
      } else {
        channels[name] = { $ref: `./partners/${domain}.yaml#/channels/events` };
      }
      break;
    default:
      if (c % 14 === 7) {
        channels[name] = { ...complete(domain, c), description: "\t" };
        expected.push([`${path}.description`, "empty", name, "description"]);
      } else {
        channels[name] = complete(domain, c);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { ...complete("sessions", i), description: null };
    expected.push([`components.channels.${name}.description`, "empty", name, "description"]);
  } else {
    sharedChannels[name] = complete("sessions", i);
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Mobility Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels and 300 components channels." },
    servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    operations,
    components: {
      channels: sharedChannels,
      messages: Object.fromEntries(DOMAINS.map((domain) => [domain, { name: domain, payload: { type: "object" } }])),
    },
  },
  expected,
};
