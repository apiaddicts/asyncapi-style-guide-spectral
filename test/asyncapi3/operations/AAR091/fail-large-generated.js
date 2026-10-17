const DOMAINS = ["orders", "payments", "stock", "returns", "pricing", "customers", "loyalty", "shipping", "invoices", "catalog"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const sharedChannels = {};
const expected = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const complete = (domain, index) => ({
  address: `retail.cdc.${domain}.event${index}.v1`,
  description: `Events of ${domain} number ${index}.`,
  messages: { [domain]: message(domain), [`${domain}Avro`]: message(`${domain}Avro`) },
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { address: `shared.${i}`, description: `Shared ${i}.` };
    expected.push([path, "missing", name]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { address: `shared.${i}`, messages: { retired: message(`retired${i}`) } };
    expected.push([`${path}.messages`, "empty", name]);
  } else {
    sharedChannels[name] = complete("orders", i);
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-${domain}Edge${c}` : `${domain}Event${c}`;
  const path = `channels.${name}`;
  switch (c % 8) {
    case 0:
      channels[name] = {
        ...complete(domain, c),
        parameters: { region: { description: "Region.", enum: ["eu", "us"] } },
        bindings: { kafka: { partitions: 12, bindingVersion: "0.5.0" } },
        messages: { gone: null, [domain]: message(domain) },
      };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { address: `retail.cdc.${domain}.${c}`, description: `Events of ${domain}.` };
        expected.push([path, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { ...complete(domain, c), messages: {} };
        expected.push([`${path}.messages`, "empty", name]);
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
        channels[name] = { ...complete(domain, c), messages: { a: null, b: message(`${domain}V0`), c: [message(domain)] } };
        expected.push([`${path}.messages`, "empty", name]);
      } else {
        channels[name] = { ...complete(domain, c), messages: { [domain]: { $ref: `./partners/${domain}.yaml#/messages/event` } } };
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
        channels[name] = { address: `retail.cdc.${domain}.${c}`, description: `Events of ${domain}.`, subscribe: { message: message(domain) } };
        expected.push([path, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { ...complete("orders", i), messages: null };
    expected.push([`components.channels.${name}.messages`, "empty", name]);
  } else {
    sharedChannels[name] = complete("orders", i);
  }
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: { title: "Quality Retail Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels and 300 components channels." },
    servers: { production: { host: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    components: {
      channels: sharedChannels,
      messages: Object.fromEntries(
        DOMAINS.flatMap((domain) => [
          [domain, { name: domain, payload: { type: "object", properties: { id: { type: ["string", "null"] } } } }],
          [`${domain}Avro`, { name: `${domain}Avro`, payload: { schemaFormat: "application/vnd.apache.avro;version=1.9.0", schema: { type: "record", name: "Event", fields: [{ name: "id", type: ["null", "string"] }] } } }],
        ])
      ),
    },
  },
  expected,
};
