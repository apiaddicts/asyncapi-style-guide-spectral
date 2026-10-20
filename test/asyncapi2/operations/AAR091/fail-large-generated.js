const DOMAINS = ["orders", "payments", "stock", "returns", "pricing", "customers", "loyalty", "shipping", "invoices", "catalog"];
const CHANNEL_COUNT = 900;
const SHARED_COUNT = 60;
const ARCHIVE_COUNT = 240;

const channels = {};
const sharedChannels = {};
const defects = [];
const message = (name) => ({ $ref: `#/components/messages/${name}` });
const complete = (domain, index) => ({
  description: `Events of ${domain} number ${index}.`,
  subscribe: { operationId: `receive${domain}${index}`, message: { oneOf: [message(domain), message(`${domain}Avro`)] } },
});

for (let i = 0; i < SHARED_COUNT; i++) {
  const name = `shared${i}`;
  const path = `components.channels.${name}`;
  if (i % 5 === 1) {
    sharedChannels[name] = { description: `Shared ${i}.` };
    defects.push([path, "missing", name]);
  } else if (i % 5 === 3) {
    sharedChannels[name] = { description: `Shared ${i}.`, publish: { message: { oneOf: [message(`retired${i}`)] } } };
    defects.push([`${path}.publish.message`, "emptyMessage", name, "publish"]);
  } else {
    sharedChannels[name] = complete("orders", i);
  }
}

for (let c = 0; c < CHANNEL_COUNT; c++) {
  const domain = DOMAINS[c % DOMAINS.length];
  const name = c % 50 === 49 ? `x-retail.cdc.${domain}.edge.${c}` : `retail.cdc.${domain}.event${c}.v1`;
  const path = `channels.${name}`;
  switch (c % 8) {
    case 0:
      channels[name] = {
        ...complete(domain, c),
        parameters: { region: { schema: { type: ["string", "null"] } } },
        bindings: { kafka: { partitions: 12, bindingVersion: "0.4.0" } },
        publish: { message: { oneOf: [null] } },
      };
      break;
    case 1:
      channels[name] = { $ref: `#/components/channels/shared${c % SHARED_COUNT}` };
      break;
    case 2:
      if (c % 3 === 2) {
        channels[name] = { description: `Events of ${domain}.`, publish: { operationId: `publish${c}`, summary: "No message." } };
        defects.push([path, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 3:
      if (c % 5 === 3) {
        channels[name] = { description: `Events of ${domain}.`, subscribe: { message: { oneOf: [] } }, publish: { message: message(`${domain}V0`) } };
        defects.push([`${path}.publish.message`, "emptyMessage", name, "publish"], [`${path}.subscribe.message`, "emptyMessage", name, "subscribe"]);
      } else {
        channels[name] = complete(domain, c);
      }
      break;
    case 4:
      if (c % 16 === 4) {
        channels[name] = null;
        defects.push([path, "unusable", name]);
      } else {
        channels[name] = { ...complete(domain, c), "x-team": domain };
      }
      break;
    case 5:
      if (c % 10 === 5) {
        channels[name] = { parameters: { id: { schema: { type: "string" } } } };
        defects.push([path, "missing", name]);
      } else {
        channels[name] = { description: `Events of ${domain}.`, subscribe: { message: { $ref: `./partners/${domain}.yaml#/messages/event` } } };
      }
      break;
    case 6:
      if (c % 12 === 6) {
        channels[name] = { $ref: `#/components/channels/retired${c}` };
        defects.push([path, "unusable", name]);
      } else {
        channels[name] = { $ref: `./partners/${domain}.yaml#/channels/events` };
      }
      break;
    default:
      if (c % 14 === 7) {
        channels[name] = { description: `Events of ${domain}.`, messages: { [domain]: message(domain) } };
        defects.push([path, "missing", name]);
      } else {
        channels[name] = complete(domain, c);
      }
  }
}

for (let i = 0; i < ARCHIVE_COUNT; i++) {
  const name = `archive${i}`;
  if (i % 11 === 4) {
    sharedChannels[name] = { description: `Archive ${i}.`, subscribe: { message: null } };
    defects.push([`components.channels.${name}.subscribe.message`, "emptyMessage", name, "subscribe"]);
  } else {
    sharedChannels[name] = complete("orders", i);
  }
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    info: { title: "Quality Retail Platform Backbone", version: "9.0.0", description: "Generated document with 900 channels and 300 components channels." },
    servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
    channels,
    components: {
      channels: sharedChannels,
      messages: Object.fromEntries(
        DOMAINS.flatMap((domain) => [
          [domain, { name: domain, payload: { type: "object", properties: { id: { type: ["string", "null"] } } } }],
          [`${domain}Avro`, { name: `${domain}Avro`, schemaFormat: "application/vnd.apache.avro;version=1.9.0", payload: { type: "record", name: "Event", fields: [{ name: "id", type: ["null", "string"] }] } }],
        ])
      ),
    },
  },
  defects,
};
