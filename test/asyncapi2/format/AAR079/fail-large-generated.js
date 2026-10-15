const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 800;
const LIBRARY_SIZE = 30;
const ZERO_WIDTH = String.fromCharCode(0x200b);
const DOCS_URL = "https://docs.retail.example.com";

const VARIANTS = [
  [(topic) => ({ description: `Runbook for ${topic}.`, url: `${DOCS_URL}/${topic}` }), []],
  [(topic) => ({ url: `${DOCS_URL}/${topic}` }), [["", "missing", "description"]]],
  [(topic) => ({ description: `Runbook for ${topic}.` }), [["", "missing", "url"]]],
  [() => ({}), [["", "missing", "description"], ["", "missing", "url"]]],
  [(topic) => ({ description: "   ", url: `${DOCS_URL}/${topic}` }), [["description", "empty", "description"]]],
  [(topic) => ({ description: `Runbook for ${topic}.`, url: null }), [["url", "empty", "url"]]],
  [(topic) => ({ description: `${ZERO_WIDTH} `, url: "" }), [["description", "empty", "description"], ["url", "empty", "url"]]],
  [() => ({ "x-owner": "retail-platform" }), [["", "missing", "description"], ["", "missing", "url"]]],
  [(topic) => ({ description: `Runbook for ${topic}.`, url: 404, "x-owner": "" }), []],
];

const library = {};
const libraryExpected = {};
for (let l = 0; l < LIBRARY_SIZE; l++) {
  const name = `library-${l}`;
  const [build, expected] = VARIANTS[l % VARIANTS.length];
  library[name] = build(name);
  libraryExpected[name] = expected;
}

const expected = [];
const referenced = new Set();
let counter = 0;

const resolveAt = (path, entries) => entries.forEach(([at, kind, detail]) => expected.push([at === "" ? path : ["description", "url"].includes(at) ? `${path}.${at}` : at, kind, detail]));

const place = (path, topic) => {
  const index = counter++;
  if (index % 13 === 5) {
    const name = `library-${index % LIBRARY_SIZE}`;
    referenced.add(name);
    return { $ref: `#/components/x-docs/${name}` };
  }
  if (index % 13 === 9) {
    expected.push([path, "invalid"]);
    return `${DOCS_URL}/${topic}`;
  }
  if (index % 31 === 17) {
    expected.push([path, "reference", `#/components/x-docs/missing-${index}`]);
    return { $ref: `#/components/x-docs/missing-${index}` };
  }
  if (index % 37 === 3) {
    expected.push([path, "invalid"]);
    return null;
  }
  const [build, entries] = VARIANTS[index % VARIANTS.length];
  resolveAt(path, entries);
  return build(`${topic}-${index}`);
};

const channels = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${key}`;
  channels[key] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${domain}${i}`,
      externalDocs: place(`${base}.publish.externalDocs`, domain),
      message: {
        name: `${domain}Changed${i}`,
        externalDocs: place(`${base}.publish.message.externalDocs`, domain),
        payload: {
          type: "object",
          properties: {
            id: { type: "string", externalDocs: place(`${base}.publish.message.payload.properties.id.externalDocs`, domain) },
            changes: { type: ["array", "null"], items: { type: "object", externalDocs: place(`${base}.publish.message.payload.properties.changes.items.externalDocs`, domain) } },
          },
        },
      },
    },
    subscribe: {
      operationId: `receive${domain}${i}`,
      externalDocs: place(`${base}.subscribe.externalDocs`, domain),
      message: { $ref: `#/components/messages/shared${i % 4}` },
    },
  };
}

const messages = {};
for (let s = 0; s < 4; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, externalDocs: place(`components.messages.shared${s}.externalDocs`, "shared"), payload: { type: "object" } };
}

for (const name of referenced) resolveAt(`components.x-docs.${name}`, libraryExpected[name]);

module.exports = {
  document: {
    asyncapi: "2.6.0",
    id: "urn:retail:event-catalogue",
    info: { title: "Retail Event Catalogue", version: "12.0.0", description: "Every change data capture stream of the retail platform." },
    channels,
    components: { messages, "x-docs": library },
  },
  expected,
  places: counter,
};
