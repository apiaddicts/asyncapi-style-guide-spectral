const DOMAINS = ["vehicles", "positions", "alerts", "docks", "trips", "fares", "stops", "routes"];
const CHANNEL_COUNT = 1000;
const SERVER_COUNT = 20;
const LIBRARY_SIZE = 30;
const ZERO_WIDTH = String.fromCharCode(0x200b);
const DOCS_URL = "https://docs.transit.example.com";
const JSON_FORMATS = [undefined, "application/vnd.aai.asyncapi+json;version=3.0.0", "application/schema+json;version=draft-07", "application/vnd.oai.openapi;version=3.0.0"];

const VARIANTS = [
  [(topic) => ({ description: `Runbook for ${topic}.`, url: `${DOCS_URL}/${topic}` }), []],
  [(topic) => ({ url: `${DOCS_URL}/${topic}` }), [["", "missing", "description"]]],
  [(topic) => ({ description: `Runbook for ${topic}.` }), [["", "missing", "url"]]],
  [() => ({}), [["", "missing", "description"], ["", "missing", "url"]]],
  [(topic) => ({ description: "\t", url: `${DOCS_URL}/${topic}` }), [["description", "empty", "description"]]],
  [(topic) => ({ description: `Runbook for ${topic}.`, url: [] }), [["url", "empty", "url"]]],
  [() => ({ description: ZERO_WIDTH, url: null }), [["description", "empty", "description"], ["url", "empty", "url"]]],
  [() => ({ "x-owner": "transit-platform", title: "Runbook" }), [["", "missing", "description"], ["", "missing", "url"]]],
  [(topic) => ({ description: true, url: `${DOCS_URL}/${topic}`, "x-owner": null }), []],
];

const expected = [];
const resolveAt = (path, entries) => entries.forEach(([at, kind, detail]) => expected.push([at === "" ? path : ["description", "url"].includes(at) ? `${path}.${at}` : at, kind, detail]));

const library = {};
for (let l = 0; l < LIBRARY_SIZE; l++) {
  const name = `library-${l}`;
  const [build, entries] = VARIANTS[l % VARIANTS.length];
  library[name] = build(name);
  resolveAt(`components.externalDocs.${name}`, entries);
}

let counter = 0;
const place = (path, topic) => {
  const index = counter++;
  if (index % 11 === 4) return { $ref: `#/components/externalDocs/library-${index % LIBRARY_SIZE}` };
  if (index % 11 === 8) {
    expected.push([path, "invalid"]);
    return index % 2 === 0 ? `${DOCS_URL}/${topic}` : [];
  }
  if (index % 29 === 13) {
    expected.push([path, "reference", `#/components/externalDocs/missing-${index}`]);
    return { $ref: `#/components/externalDocs/missing-${index}` };
  }
  const [build, entries] = VARIANTS[index % VARIANTS.length];
  resolveAt(path, entries);
  return build(`${topic}-${index}`);
};

const servers = {};
for (let s = 0; s < SERVER_COUNT; s++) {
  servers[`kafka${s}`] = { host: `kafka-${s}.transit.example.com:9093`, protocol: "kafka-secure", externalDocs: place(`servers.kafka${s}.externalDocs`, "servers") };
}

const channels = {};
const operations = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `${domain}${i}`;
  const base = `channels.${key}`;
  const format = JSON_FORMATS[i % JSON_FORMATS.length];
  const body = { type: "object", properties: { id: { type: ["string", "null"], externalDocs: null } } };
  const schemaBase = format === undefined ? `${base}.messages.changed.payload` : `${base}.messages.changed.payload.schema`;
  body.properties.id.externalDocs = place(`${schemaBase}.properties.id.externalDocs`, domain);
  channels[key] = {
    address: i % 9 === 0 ? null : `transit.cdc.${domain}.event-${i}.v1`,
    title: `Changes of ${domain} ${i}`,
    externalDocs: place(`${base}.externalDocs`, domain),
    servers: [{ $ref: `#/servers/kafka${i % SERVER_COUNT}` }],
    messages: {
      changed: {
        name: `${domain}Changed${i}`,
        externalDocs: place(`${base}.messages.changed.externalDocs`, domain),
        payload: format === undefined ? body : { schemaFormat: format, schema: body },
      },
    },
  };
  operations[`receive${key}`] = {
    action: i % 2 === 0 ? "receive" : "send",
    channel: { $ref: `#/channels/${key}` },
    messages: [{ $ref: `#/channels/${key}/messages/changed` }],
    externalDocs: place(`operations.receive${key}.externalDocs`, domain),
  };
}

module.exports = {
  document: {
    asyncapi: "3.0.0",
    id: "urn:transit:event-catalogue",
    info: { title: "Transit Event Catalogue", version: "8.0.0", description: "Every change data capture stream of the transit platform." },
    servers,
    channels,
    operations,
    components: { externalDocs: library },
  },
  expected,
  places: counter,
};
